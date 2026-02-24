import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import IovTopologyPanel from "@/ui/IovTopologyPanel";
import topologyRaw from "@/game/iov/iov.topology.json";
import {
  type BrickInteractionMode,
  IovTopologyScene,
  IOV_TOPOLOGY_CONFIG,
  type IovTopologyData,
  type RegionId,
  type SelectedBrickInfo,
  type ToggleId,
} from "@/game/iov/IovTopologyScene";
import {
  BlockInteriorScene,
  type BlockPeopleSummary,
} from "@/game/iov/BlockInteriorScene";
import {
  PersonIdentityScene,
  type PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
import { PersonImpactScene } from "@/game/iov/PersonImpactScene";
import { OrgImpactScene } from "@/game/iov/OrgImpactScene";
import {
  ValueLogScene,
  WIZARD_STEP_ORDER,
  createInitialValueLogDraft,
  type ValueLogDraft,
  type ValueLogSummary,
  type WizardStep,
} from "@/game/iov/ValueLogScene";
import {
  IovSemanticZoomController,
  getSemanticBreadcrumb,
  type SemanticZoomLevel,
} from "@/game/iov/IovSemanticZoomController";
import {
  DEFAULT_IOV_VALUES,
  loadIovValues,
} from "@/game/iov/iovValues";
import { IOV_FEATURE_FLAGS } from "@/game/iov/iovNarrativeConfig";
import {
  DEFAULT_IOV_VALUELOGS,
  type IovValueLogEntry,
  type IovTimeLogEntry,
  loadIovValuelogs,
  resolvePersonValuelogs,
} from "@/game/iov/iovTimelogs";
import {
  IovImpactEscalationController,
  type PersonImpactResult,
} from "@/game/iov/iovImpactEscalation";

const topologyData = topologyRaw as IovTopologyData;

const buildInitialToggles = (data: IovTopologyData) =>
  data.toggles.reduce(
    (acc, toggle) => {
      acc[toggle.id] = toggle.default;
      return acc;
    },
    {} as Record<ToggleId, boolean>
  );

const IovTopologyCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<IovTopologyScene | null>(null);
  const blockSceneRef = useRef<BlockInteriorScene | null>(null);
  const personSceneRef = useRef<PersonIdentityScene | null>(null);
  const impactSceneRef = useRef<PersonImpactScene | null>(null);
  const orgImpactSceneRef = useRef<OrgImpactScene | null>(null);
  const valueLogSceneRef = useRef<ValueLogScene | null>(null);
  const zoomControllerRef = useRef(new IovSemanticZoomController());
  const impactEscalationRef = useRef(
    new IovImpactEscalationController(IOV_FEATURE_FLAGS.enableImpactEscalation)
  );
  const semanticLevelRef = useRef<SemanticZoomLevel>("topology");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>("community");
  const [selectedBrickInfo, setSelectedBrickInfo] = useState<SelectedBrickInfo | null>(null);
  const [interactionMode, setInteractionMode] = useState<BrickInteractionMode>("inspect");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [blockSummary, setBlockSummary] = useState<BlockPeopleSummary | null>(null);
  const [personSummary, setPersonSummary] = useState<PersonIdentitySummary | null>(null);
  const [valueLogDraft, setValueLogDraft] = useState<ValueLogDraft>(() =>
    createInitialValueLogDraft()
  );
  const [valueLogStep, setValueLogStep] = useState<WizardStep>("select_time");
  const [valueLogSummary, setValueLogSummary] = useState<ValueLogSummary | null>(null);
  const [activePersonLogs, setActivePersonLogs] = useState<IovValueLogEntry[]>([]);
  const [hoveredFacet, setHoveredFacet] = useState<string | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<RegionId | null>(null);
  const [transferredCount, setTransferredCount] = useState(0);
  const [semanticLevel, setSemanticLevel] = useState<SemanticZoomLevel>("topology");
  const [values, setValues] = useState(DEFAULT_IOV_VALUES);
  const [valueLogData, setValueLogData] = useState(DEFAULT_IOV_VALUELOGS);
  const [presentationMode, setPresentationMode] = useState(false);
  const [phaseHeadline, setPhaseHeadline] = useState(
    "Empty ground - press Market to begin."
  );
  const [toggles, setToggles] = useState<Record<ToggleId, boolean>>(() =>
    buildInitialToggles(topologyData)
  );
  const [lastImpactedPersonId, setLastImpactedPersonId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const hoveredRegion = useMemo(
    () => topologyData.regions.find((region) => region.id === hoveredRegionId),
    [hoveredRegionId]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new IovTopologyScene(renderer.domElement, topologyData, {
      onHoverChange: (regionId) => setHoveredRegionId(regionId),
      onSelectChange: (regionId) => setSelectedRegionId(regionId),
      onTransferCountChange: (count) => setTransferredCount(count),
      onBrickSelectionChange: (selection) => setSelectedBrickInfo(selection),
    });
    sceneRef.current = scene;
    scene.setValues(values);
    scene.setBrickInteractionMode(interactionMode);
    const blockScene = new BlockInteriorScene(renderer.domElement, {
      onHoverPersonChange: (personId) => setHoveredPersonId(personId),
      onSelectPersonChange: (personId) => setSelectedPersonId(personId),
    });
    blockSceneRef.current = blockScene;
    const personScene = new PersonIdentityScene(renderer.domElement, {
      onHoverFacetChange: (facet) => setHoveredFacet(facet),
      onSelectFacetChange: () => {
        setPersonSummary(personSceneRef.current?.getSummary() ?? null);
      },
    });
    personSceneRef.current = personScene;
    
    // Impact Scene - Visualization only, no interaction
    const impactScene = new PersonImpactScene();
    impactSceneRef.current = impactScene;
    const orgImpactScene = new OrgImpactScene(renderer.domElement);
    orgImpactSceneRef.current = orgImpactScene;

    const valueLogScene = new ValueLogScene(renderer.domElement);
    valueLogSceneRef.current = valueLogScene;

    let composer: EffectComposer | null = null;
    let ssaoPass: SSAOPass | null = null;
    let fxaaPass: ShaderPass | null = null;
    if (IOV_TOPOLOGY_CONFIG.render.enablePostprocessing) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene.scene, scene.camera));

      ssaoPass = new SSAOPass(scene.scene, scene.camera, 1, 1);
      ssaoPass.kernelRadius = 7;
      ssaoPass.minDistance = 0.001;
      ssaoPass.maxDistance = 0.03;
      composer.addPass(ssaoPass);

      fxaaPass = new ShaderPass(FXAAShader);
      composer.addPass(fxaaPass);
    }

    for (const [toggleId, enabled] of Object.entries(toggles)) {
      scene.setToggle(toggleId as ToggleId, enabled);
    }

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      const nextIsMobile = clientWidth <= 900;
      setIsMobile(nextIsMobile);
      renderer.setSize(clientWidth, clientHeight);
      scene.setViewportProfile(nextIsMobile);
      blockScene.setViewportProfile(nextIsMobile);
      personScene.setViewportProfile(nextIsMobile);
      impactScene.resize(clientWidth, clientHeight);
      orgImpactScene.setViewportProfile(nextIsMobile);
      orgImpactScene.resize(clientWidth, clientHeight);
      valueLogScene.setViewportProfile(nextIsMobile);
      scene.resize(clientWidth, clientHeight);
      blockScene.resize(clientWidth, clientHeight);
      personScene.resize(clientWidth, clientHeight);
      valueLogScene.resize(clientWidth, clientHeight);
      composer?.setSize(clientWidth, clientHeight);
      if (ssaoPass) {
        ssaoPass.setSize(clientWidth, clientHeight);
      }
      if (fxaaPass) {
        const pixelRatio = renderer.getPixelRatio();
        const resolutionUniform = fxaaPass.material.uniforms["resolution"];
        if (resolutionUniform?.value?.set) {
          resolutionUniform.value.set(
            1 / (clientWidth * pixelRatio),
            1 / (clientHeight * pixelRatio)
          );
        }
      }
    };
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    let personSummaryAccumulator = 0;
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      if (semanticLevelRef.current === "topology") {
        scene.update(delta);
        if (composer) {
          composer.render();
        } else {
          scene.render(renderer);
        }
      } else if (semanticLevelRef.current === "block") {
        blockScene.update(delta);
        blockScene.render(renderer);
      } else if (semanticLevelRef.current === "person") {
        personScene.update(delta);
        personScene.render(renderer);
        personSummaryAccumulator += delta;
        if (personSummaryAccumulator >= 0.2) {
          personSummaryAccumulator = 0;
          setPersonSummary(personScene.getSummary());
        }
      } else if (semanticLevelRef.current === "impact") {
        impactSceneRef.current?.update(delta);
        renderer.render(impactSceneRef.current!.scene, impactSceneRef.current!.camera);
      } else if (semanticLevelRef.current === "orgimpact") {
        orgImpactScene.update(delta);
        orgImpactScene.render(renderer);
      } else {
        valueLogScene.update(delta);
        valueLogScene.render(renderer);
        personSummaryAccumulator += delta;
        if (personSummaryAccumulator >= 0.2) {
          personSummaryAccumulator = 0;
          setValueLogSummary(valueLogScene.getSummary());
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("resize", resize);

    let dragStartX = 0;
    let dragStartY = 0;
    let dragDistance = 0;

    const onPointerDown = (event: PointerEvent) => {
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragDistance = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      dragDistance = Math.max(
        dragDistance,
        Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
      );

      setTooltipPosition({ x: event.clientX, y: event.clientY });
      if (semanticLevelRef.current === "topology") {
        scene.setPointerFromCanvas(x, y, rect.width, rect.height);
        blockScene.clearPointer();
        personScene.clearPointer();
        valueLogScene.clearPointer();
      } else if (semanticLevelRef.current === "block") {
        blockScene.setPointerFromCanvas(x, y, rect.width, rect.height);
        personScene.clearPointer();
        scene.clearPointer();
        valueLogScene.clearPointer();
      } else if (semanticLevelRef.current === "person") {
        personScene.setPointerFromCanvas(x, y, rect.width, rect.height);
        blockScene.clearPointer();
        scene.clearPointer();
        valueLogScene.clearPointer();
      } else if (semanticLevelRef.current === "valuelog") {
        valueLogScene.setPointerFromCanvas(x, y, rect.width, rect.height);
        scene.clearPointer();
        blockScene.clearPointer();
        personScene.clearPointer();
      } else {
        scene.clearPointer();
        blockScene.clearPointer();
        personScene.clearPointer();
        valueLogScene.clearPointer();
      }
    };

    const onPointerLeave = () => {
      scene.clearPointer();
      blockScene.clearPointer();
      personScene.clearPointer();
      valueLogScene.clearPointer();
      setHoveredRegionId(null);
      setHoveredPersonId(null);
      setHoveredFacet(null);
    };

    const onPointerUp = () => {
      if (dragDistance <= 4) {
        if (semanticLevelRef.current === "topology") {
          // Click selection maps the hovered brick instance back to region id.
          scene.selectFromPointer();
        } else if (semanticLevelRef.current === "block") {
          blockScene.selectFromPointer();
        } else if (semanticLevelRef.current === "person") {
          personScene.selectFromPointer();
        } else if (semanticLevelRef.current === "valuelog") {
          valueLogScene.selectFromPointer();
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!sceneRef.current) return;

      if (event.key === "Escape" && semanticLevelRef.current !== "topology") {
        const next = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
        applySemanticTransition(next.level);
        return;
      }

      const keyMap: Partial<Record<string, RegionId>> = {
        "1": "market",
        "2": "state",
        "3": "community",
        "4": "crony_bridge",
      };

      const regionId = keyMap[event.key];
      if (!regionId) return;
      if (semanticLevelRef.current !== "topology") return;

      sceneRef.current.triggerFormation(regionId);
      setPhaseHeadline(getPhaseHeadline(regionId));
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);

      scene.dispose();
      blockScene.dispose();
      personScene.dispose();
      orgImpactScene.dispose();
      valueLogScene.dispose();
      composer?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      blockSceneRef.current = null;
      personSceneRef.current = null;
      orgImpactSceneRef.current = null;
      valueLogSceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadIovValues().then((loaded) => {
      if (!mounted) return;
      setValues(loaded);
      sceneRef.current?.setValues(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadIovValuelogs().then((loaded) => {
      if (!mounted) return;
      setValueLogData(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedRegion = topologyData.regions.find(
    (region) => region.id === selectedRegionId
  );
  const selectedBrickLabel =
    selectedBrickInfo === null
      ? null
      : `${getRegionLabel(selectedBrickInfo.regionId)} #${selectedBrickInfo.instanceId + 1}`;
  const canOpenBrick = semanticLevel === "topology" && selectedBrickInfo !== null;
  const breadcrumb = getSemanticBreadcrumb(zoomControllerRef.current.getState());

  const handleToggle = (toggleId: ToggleId) => {
    setToggles((prev) => {
      const next = { ...prev, [toggleId]: !prev[toggleId] };
      sceneRef.current?.setToggle(toggleId, next[toggleId]);
      return next;
    });
  };

  const handleBuild = (regionId: RegionId) => {
    sceneRef.current?.triggerFormation(regionId);
    setPhaseHeadline(getPhaseHeadline(regionId));
  };

  const handleInteractionModeChange = (mode: BrickInteractionMode) => {
    setInteractionMode(mode);
    sceneRef.current?.setBrickInteractionMode(mode);
    setPhaseHeadline(
      mode === "inspect"
        ? "Inspect mode: click an organization unit to select and open."
        : "Reclaim mode: click upper Market/State/Bridge units to move into Community."
    );
  };

  const applySemanticTransition = (level: SemanticZoomLevel, contextData?: any) => {
    const prevLevel = semanticLevelRef.current;
    semanticLevelRef.current = level;
    setSemanticLevel(level);
    if (level === "topology") {
      setPhaseHeadline("Returned to system layer.");
    } else if (level === "block") {
      setPhaseHeadline(
        selectedBrickLabel
          ? `Inspecting ${selectedBrickLabel}: organizations are made of people.`
          : "Inspecting selected organization."
      );
    } else if (level === "person") {
      setPhaseHeadline("Inspecting one person's wellbeing identity.");
      
      personSceneRef.current?.setDetailMode("identity");
      // Impact handled by separate scene now
      
    } else if (level === "impact") {
      setPhaseHeadline("Value committed: Impact visualization.");
      // Logic handled via handleValueLogCommit transaction flow
    } else if (level === "orgimpact") {
      setPhaseHeadline("Organization impact: aura contagion across the team.");
    } else if (level === "valuelog") {
      setPhaseHeadline(
        "Time Slice mode: click the clock, context nodes, and L/E/O nodes directly. Next is optional."
      );
      personSceneRef.current?.setDetailMode("valuelog");
      valueLogSceneRef.current?.setDraft(valueLogDraft);
      valueLogSceneRef.current?.setStep(valueLogStep);
      setValueLogSummary(valueLogSceneRef.current?.getSummary() ?? null);
    } else {
      setPhaseHeadline("Transitioning...");
    }
  };

  const getPhaseHeadline = (regionId?: RegionId) => {
    switch (regionId) {
      case "market": return "This is the Market. It accumulates wealth.";
      case "state": return "This is the State. It captures and redistributes.";
      case "community": return "This is the Community. It holds the foundation.";
      case "crony_bridge": return "The Bridge connects the top layers.";
      default: return "Select a region to explore.";
    }
  };

  const onOpenBrick = () => {
    if (!selectedBrickInfo) return;
    const next = zoomControllerRef.current.dispatch({ type: "OPEN_BLOCK" });
    applySemanticTransition(next.level);
    if (blockSceneRef.current) {
        blockSceneRef.current.setSourceBrick(selectedBrickInfo);
    }
  };

  const onValueLogNext = () => {
      valueLogSceneRef.current?.nextStep();
      setValueLogStep(valueLogSceneRef.current?.getSummary().step ?? "select_time");
  };

  const onValueLogPrev = () => {
      valueLogSceneRef.current?.prevStep();
      setValueLogStep(valueLogSceneRef.current?.getSummary().step ?? "select_time");
  };

  const handleOpenBrick = () => {
    if (!selectedBrickInfo) return;
    
    // Dispatch zoom event
    const next = zoomControllerRef.current.dispatch({ type: "OPEN_BLOCK" });
    applySemanticTransition(next.level);
    
    // Set the block scene context
    if (blockSceneRef.current) {
        blockSceneRef.current.setSourceBrick(selectedBrickInfo);
    }
  };

  const handleBackSemantic = () => {
    const next = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
    applySemanticTransition(next.level);
    if (next.level === "topology") {
      setSelectedPersonId(null);
      setHoveredPersonId(null);
      setHoveredFacet(null);
      setPersonSummary(null);
    }
  };

  const handleOpenPersonStub = () => {
    if (!selectedPersonId) return;
    const sourceRegion = blockSummary?.regionId ?? selectedBrickInfo?.regionId ?? "community";
    personSceneRef.current?.setPersonContext(selectedPersonId, sourceRegion);
    const logs = resolvePersonValuelogs(valueLogData, selectedPersonId, sourceRegion);
    setActivePersonLogs(logs);
    personSceneRef.current?.setTimelineLogs(logs);
    personSceneRef.current?.setDetailMode("identity");
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
    const next = zoomControllerRef.current.dispatch({
      type: "OPEN_PERSON",
      personId: selectedPersonId,
    });
    applySemanticTransition(next.level);
  };

  const handleOpenValueLog = () => {
    const next = zoomControllerRef.current.dispatch({ type: "OPEN_VALUELOG" });
    valueLogSceneRef.current?.setDraft(valueLogDraft);
    valueLogSceneRef.current?.setStep(valueLogStep);
    setValueLogSummary(valueLogSceneRef.current?.getSummary() ?? null);
    applySemanticTransition(next.level);
  };

  const handleStartIdentityBuild = () => {
    personSceneRef.current?.startIdentityBuild();
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
    setPhaseHeadline("Identity build started: GivenIdentity facets are dropping in.");
  };

  const handleNextIdentityLayer = () => {
    personSceneRef.current?.nextIdentityLayer();
    const summary = personSceneRef.current?.getSummary() ?? null;
    setPersonSummary(summary);
    if (summary?.identityBuildLayerLabel) {
      setPhaseHeadline(
        `Identity build: ${summary.identityBuildLayerLabel} (${summary.identityBuildLayerIndex + 1}/${summary.identityBuildLayerCount}).`
      );
    }
  };

  const handleReplayIdentityLayer = () => {
    personSceneRef.current?.replayIdentityLayer();
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
    setPhaseHeadline("Replaying current identity layer drop.");
  };

  useEffect(() => {
    const controller = zoomControllerRef.current;
    if (!selectedBrickInfo) {
      const next = controller.dispatch({ type: "CLEAR_BRICK_SELECTION" });
      if (next.level !== semanticLevel) {
        applySemanticTransition(next.level);
      }
      return;
    }

    controller.dispatch({
      type: "SELECT_BRICK",
      regionId: selectedBrickInfo.regionId,
      brickId: selectedBrickInfo.instanceId,
    });
  }, [selectedBrickInfo, semanticLevel]);

  useEffect(() => {
    setBlockSummary(blockSceneRef.current?.getSummary() ?? null);
  }, [selectedPersonId, hoveredPersonId, semanticLevel]);

  useEffect(() => {
    if (semanticLevel !== "person" && semanticLevel !== "valuelog") return;
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
  }, [hoveredFacet, semanticLevel]);

  useEffect(() => {
    valueLogSceneRef.current?.setDraft(valueLogDraft);
    setValueLogSummary(valueLogSceneRef.current?.getSummary() ?? null);
  }, [valueLogDraft]);

  useEffect(() => {
    valueLogSceneRef.current?.setStep(valueLogStep);
    setValueLogSummary(valueLogSceneRef.current?.getSummary() ?? null);
  }, [valueLogStep]);

  const handleValueLogDraftChange = (patch: Partial<ValueLogDraft>) => {
    setValueLogDraft((prev) => ({ ...prev, ...patch }));
    if (valueLogStep === "select_wellbeing" && patch.wellbeingNode) {
      setValueLogStep(
        patch.wellbeingNode === "~~Performance" ? "select_performance" : "show_outcome"
      );
    }
  };

  const handleValueLogNext = () => {
    valueLogSceneRef.current?.nextStep();
    setValueLogStep(valueLogSceneRef.current?.getSummary().step ?? "select_time");
  };

  const handleValueLogPrev = () => {
    valueLogSceneRef.current?.prevStep();
    setValueLogStep(valueLogSceneRef.current?.getSummary().step ?? "select_time");
  };

  const startOrgImpactSequence = (personImpactResult: PersonImpactResult) => {
    const orgImpactScene = orgImpactSceneRef.current;
    if (!orgImpactScene || !selectedBrickInfo) {
      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
      return;
    }

    const openOrgImpact = zoomControllerRef.current.dispatch({ type: "OPEN_ORG_IMPACT" });
    applySemanticTransition(openOrgImpact.level);
    impactEscalationRef.current.dispatch({ type: "START_ORG_IMPACT" });

    orgImpactScene.setImpactContext({
      regionId: selectedBrickInfo.regionId,
      brickId: selectedBrickInfo.instanceId,
      personId: personImpactResult.personId,
      peopleCount: blockSummary?.peopleCount ?? 14,
    });

    orgImpactScene.playImpact(personImpactResult, (orgImpactResult) => {
      impactEscalationRef.current.dispatch({
        type: "COMPLETE_ORG_IMPACT",
        result: orgImpactResult,
      });
      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
    });
  };

  const handleValueLogCommit = () => {
    if (!selectedPersonId) return;
    const entry = valueLogSceneRef.current?.commit(selectedPersonId);
    // Grab the draft before resetting or moving on
    const finalDraft = valueLogSceneRef.current?.getDraft();
    if (!entry || !finalDraft) return;

    const finalizeAfterPersonImpact = () => {
      const nextLogs = [...activePersonLogs, entry];
      setActivePersonLogs(nextLogs);
      personSceneRef.current?.setTimelineLogs(nextLogs);
      setPersonSummary(personSceneRef.current?.getSummary() ?? null);
      setValueLogSummary(valueLogSceneRef.current?.getSummary() ?? null);
      setValueLogStep("select_time");
      setLastImpactedPersonId(selectedPersonId);

      if (IOV_FEATURE_FLAGS.enableImpactEscalation && selectedBrickInfo) {
        const auraDelta = valueLogSceneRef.current?.getSummary().outcome.auraDelta ?? 0;
        const personImpactResult: PersonImpactResult = {
          personId: selectedPersonId,
          sourceRegionId: selectedBrickInfo.regionId,
          sourceBrickId: selectedBrickInfo.instanceId,
          auraDelta,
          timestamp: Date.now(),
        };
        impactEscalationRef.current.dispatch({
          type: "RECORD_PERSON_IMPACT",
          result: personImpactResult,
        });
        impactEscalationRef.current.dispatch({ type: "MARK_ORG_IMPACT_PENDING" });
        startOrgImpactSequence(personImpactResult);
        return;
      }

      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
    };

    const next = zoomControllerRef.current.dispatch({ type: "OPEN_IMPACT" });
    applySemanticTransition(next.level);
    setPhaseHeadline("Committing time slice: Impact visualization...");

    if (impactSceneRef.current) {
      impactSceneRef.current.playImpact(finalDraft, finalizeAfterPersonImpact);
    } else {
      finalizeAfterPersonImpact();
    }
  };

  // Propagate activation state when entering block view
  useEffect(() => {
    if ( semanticLevelRef.current === "block" && lastImpactedPersonId && blockSceneRef.current) {
        // @ts-ignore - method added dynamically
        if (typeof blockSceneRef.current.activatePerson === 'function') {
            // @ts-ignore
            blockSceneRef.current.activatePerson(lastImpactedPersonId);
        }
    }
  }, [semanticLevelRef.current, lastImpactedPersonId]);

  // Propagate activation to topology when zooming out
  useEffect(() => {
    if (semanticLevel === "topology" && lastImpactedPersonId && selectedBrickInfo && sceneRef.current) {
        sceneRef.current.activateBrick(selectedBrickInfo.regionId, selectedBrickInfo.instanceId);
        // Optional: trigger "community reclaim" logic here if needed
        // sceneRef.current.reclaimBrick(...)
        
        // Clear the impact flag so we don't re-activate on next visit unless there is a new impact
        setLastImpactedPersonId(null);
    }
  }, [semanticLevel, lastImpactedPersonId, selectedBrickInfo]);

  function getRegionLabel(regionId: RegionId) {
    const region = topologyData.regions.find(r => r.id === regionId);
    return region?.label ?? regionId;
}

function getRegionMeaning(regionId: RegionId) {
    // Basic meanings, could be moved to config
    const meanings: Record<RegionId, string> = {
        market: "Market height combines cash markets and derivatives in one pillar. Dark green shows cash layers and light green shows derivatives leverage.",
        state: "State height reflects fiscal and institutional capacity. Transfers from upper state layers represent redirected public capture back to common foundations.",
        community: "Community is intentionally wide and load-bearing: households, co-ops, and trust networks distribute value horizontally.",
        crony_bridge: "The bridge exists only near the top, not at the public foundation. Highlighted connectors show the elite-level coupling point where capture flows through."
    };
    return meanings[regionId];
}

  // Check for bridge collapse condition
  useEffect(() => {
    // If community has gained enough bricks (e.g., > 3), trigger collapse animation
    if (transferredCount > 3 && sceneRef.current) {
        // @ts-ignore - method newly added
        if (typeof sceneRef.current.shatterBridge === 'function') {
            // @ts-ignore
            sceneRef.current.shatterBridge();
            setPhaseHeadline("CRITICAL MASS: The Crony Bridge collapses under community pressure!");
        }
    }
  }, [transferredCount]);

  return (
    <div
      className={`iov-stage ${presentationMode ? "is-presentation" : ""} iov-level-${semanticLevel}`}
      ref={containerRef}
    >
      <div className="iov-atmosphere" />
      <div className="iov-breadcrumb">
        {breadcrumb.map((item) => (
          <button
            key={item.level}
            type="button"
            className={item.active ? "is-active" : ""}
            onClick={() => {
              if (item.active) return;
              zoomControllerRef.current.dispatch({ type: "SET_LEVEL", level: item.level });
              applySemanticTransition(item.level);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {semanticLevel === "block" && blockSummary && blockSummary.selectedPersonId && (
        <div className="iov-scene-card iov-scene-card-center" style={{ width: '420px' }}>
          <div className="iov-scene-card-header">
            <h3>{blockSummary.brickLabel || "Organization Interior"}</h3>
            <div className="iov-scene-card-sub">Organization Interior</div>
          </div>
          <div className="iov-scene-card-content">
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.5 }}>
              {blockSummary.brickLabel} contains {blockSummary.peopleCount} people proxies.
              Selected <strong>{blockSummary.selectedPersonId}</strong>. Continue to view their wellbeing identity.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button className="iov-btn-primary" onClick={handleOpenPersonStub}>
                Open Person
              </button>
              <button
                className="iov-btn-secondary"
                style={{ marginTop: 0 }}
                onClick={() => {
                  const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
                  applySemanticTransition(back.level);
                }}
              >
                Back to System
              </button>
            </div>
          </div>
        </div>
      )}

      {semanticLevel === "person" && personSummary && (
        <div className="iov-scene-card iov-scene-card-center">
          <div className="iov-scene-card-header">
            <h3>{personSummary.personId}</h3>
            <div className="iov-scene-card-sub">Identity Stack</div>
          </div>
          <div className="iov-scene-card-content">
            {!personSummary.identityBuildMode ? (
              <button className="iov-btn-primary" onClick={handleStartIdentityBuild}>
                Reveal Identity Layers
              </button>
            ) : (
              <>
                <div className="iov-scene-card-stat">
                  Layer: {personSummary.identityBuildLayerLabel ?? "Initializing..."}
                </div>
                {!personSummary.identityBuildComplete && (
                  <button className="iov-btn-primary" onClick={handleNextIdentityLayer}>
                    Next Layer ({personSummary.identityBuildLayerIndex + 1}/
                    {personSummary.identityBuildLayerCount})
                  </button>
                )}
                <button
                  className="iov-btn-secondary"
                  onClick={handleReplayIdentityLayer}
                  disabled={personSummary.identityBuildLayerIndex < 0}
                >
                  Replay Animation
                </button>
              </>
            )}
            <div className="iov-scene-card-divider" />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className="iov-btn-action" onClick={handleOpenValueLog}>
                Open Time Slice
                </button>
                <button 
                className="iov-btn-secondary"
                style={{ marginTop: 0 }}
                onClick={() => {
                    const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
                    applySemanticTransition(back.level);
                }}
                >
                Back to Org
                </button>
            </div>
          </div>
        </div>
      )}

      <IovTopologyPanel
        data={topologyData}
        selectedRegionId={selectedRegionId}
        toggles={toggles}
        phaseHeadline={phaseHeadline}
        presentationMode={presentationMode}
        values={values}
        meaningText={getRegionMeaning(selectedRegionId)}
        transferredCount={transferredCount}
        isMobile={isMobile}
        semanticLevel={semanticLevel}
        selectedBrickLabel={
          selectedBrickInfo
            ? `${getRegionLabel(selectedBrickInfo.regionId)} #${selectedBrickInfo.instanceId + 1}`
            : null
        }
        canOpenBrick={!!selectedBrickInfo}
        blockSummary={blockSummary}
        personSummary={personSummary}
        valueLogDraft={valueLogDraft}
        valueLogSummary={valueLogSummary}
        valueLogStep={valueLogStep}
        interactionMode={interactionMode}
        onToggle={handleToggle}
        onBuild={(id) => sceneRef.current?.build(id)}
        onOpenBrick={onOpenBrick}
        onOpenPerson={handleOpenPersonStub}
        onBackSemantic={() => {
          const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
          applySemanticTransition(back.level);
        }}
        onInteractionModeChange={(mode) => {
          setInteractionMode(mode);
          sceneRef.current?.setBrickInteractionMode(mode);
        }}
        onTogglePresentationMode={() => setPresentationMode((p) => !p)}
        onValueLogDraftChange={(patch) =>
          setValueLogDraft((prev) => ({ ...prev, ...patch }))
        }
        onValueLogNext={onValueLogNext}
        onValueLogPrev={onValueLogPrev}
        onValueLogCommit={() => valueLogSceneRef.current?.commit(selectedPersonId ?? "unknown")}
        onOpenValueLog={handleOpenValueLog}
      />
    </div>
  );
};

export default IovTopologyCanvas;
