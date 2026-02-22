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
  type PersonDetailMode,
  type PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
import {
  IovSemanticZoomController,
  getSemanticBreadcrumb,
  type SemanticZoomLevel,
} from "@/game/iov/IovSemanticZoomController";
import {
  DEFAULT_IOV_VALUES,
  loadIovValues,
} from "@/game/iov/iovValues";
import {
  DEFAULT_IOV_TIMELOGS,
  loadIovTimelogs,
  resolvePersonTimelogs,
} from "@/game/iov/iovTimelogs";

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
  const zoomControllerRef = useRef(new IovSemanticZoomController());
  const semanticLevelRef = useRef<SemanticZoomLevel>("topology");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>("community");
  const [selectedBrickInfo, setSelectedBrickInfo] = useState<SelectedBrickInfo | null>(null);
  const [interactionMode, setInteractionMode] = useState<BrickInteractionMode>("inspect");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [blockSummary, setBlockSummary] = useState<BlockPeopleSummary | null>(null);
  const [personSummary, setPersonSummary] = useState<PersonIdentitySummary | null>(null);
  const [personViewMode, setPersonViewMode] = useState<PersonDetailMode>("identity");
  const [hoveredFacet, setHoveredFacet] = useState<string | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<RegionId | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [transferredCount, setTransferredCount] = useState(0);
  const [semanticLevel, setSemanticLevel] = useState<SemanticZoomLevel>("topology");
  const [values, setValues] = useState(DEFAULT_IOV_VALUES);
  const [timelogData, setTimelogData] = useState(DEFAULT_IOV_TIMELOGS);
  const [presentationMode, setPresentationMode] = useState(false);
  const [phaseHeadline, setPhaseHeadline] = useState(
    "Empty ground - press Market to begin."
  );
  const [toggles, setToggles] = useState<Record<ToggleId, boolean>>(() =>
    buildInitialToggles(topologyData)
  );

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
      scene.resize(clientWidth, clientHeight);
      blockScene.resize(clientWidth, clientHeight);
      personScene.resize(clientWidth, clientHeight);
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
      } else {
        personScene.update(delta);
        personScene.render(renderer);
        personSummaryAccumulator += delta;
        if (personSummaryAccumulator >= 0.2) {
          personSummaryAccumulator = 0;
          setPersonSummary(personScene.getSummary());
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
      } else if (semanticLevelRef.current === "block") {
        blockScene.setPointerFromCanvas(x, y, rect.width, rect.height);
        personScene.clearPointer();
        scene.clearPointer();
      } else {
        personScene.setPointerFromCanvas(x, y, rect.width, rect.height);
        blockScene.clearPointer();
        scene.clearPointer();
      }
    };

    const onPointerLeave = () => {
      scene.clearPointer();
      blockScene.clearPointer();
      personScene.clearPointer();
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
        } else {
          personScene.selectFromPointer();
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
      composer?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      blockSceneRef.current = null;
      personSceneRef.current = null;
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
    loadIovTimelogs().then((loaded) => {
      if (!mounted) return;
      setTimelogData(loaded);
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
        ? "Inspect mode: click a brick to select and open."
        : "Reclaim mode: click upper Market/State/Bridge bricks to move into Community."
    );
  };

  const applySemanticTransition = (level: SemanticZoomLevel) => {
    semanticLevelRef.current = level;
    setSemanticLevel(level);
    if (level === "topology") {
      setPhaseHeadline("Returned to topology layer.");
    } else if (level === "block") {
      setPhaseHeadline(
        selectedBrickLabel
          ? `Inspecting ${selectedBrickLabel}: institutions are made of people.`
          : "Inspecting selected brick."
      );
    } else {
      setPhaseHeadline("Inspecting one person identity layer.");
    }
  };

  const handleOpenBrick = () => {
    if (!selectedBrickInfo) return;
    blockSceneRef.current?.setSourceBrick(selectedBrickInfo);
    setBlockSummary(blockSceneRef.current?.getSummary() ?? null);
    const next = zoomControllerRef.current.dispatch({ type: "OPEN_BLOCK" });
    applySemanticTransition(next.level);
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
    personSceneRef.current?.setTimelineLogs(
      resolvePersonTimelogs(timelogData, selectedPersonId, sourceRegion)
    );
    personSceneRef.current?.setDetailMode(personViewMode);
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
    const next = zoomControllerRef.current.dispatch({
      type: "OPEN_PERSON",
      personId: selectedPersonId,
    });
    applySemanticTransition(next.level);
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
    if (semanticLevel !== "person") return;
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
  }, [hoveredFacet, semanticLevel]);

  useEffect(() => {
    personSceneRef.current?.setDetailMode(personViewMode);
    if (semanticLevel === "person") {
      setPersonSummary(personSceneRef.current?.getSummary() ?? null);
    }
  }, [personViewMode, semanticLevel]);

  const handleToggleTimelinePlayback = () => {
    const playing = personSummary?.timelinePlaying ?? true;
    personSceneRef.current?.setTimelinePlaying(!playing);
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
  };

  const handleStepTimeline = () => {
    personSceneRef.current?.stepTimelineForward();
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
  };

  const handleTimelineSpeedChange = (nextSpeed: number) => {
    personSceneRef.current?.setTimelineSpeed(nextSpeed);
    setPersonSummary(personSceneRef.current?.getSummary() ?? null);
  };

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
              if (item.level === semanticLevel) return;
              const next = zoomControllerRef.current.dispatch({
                type: "SET_LEVEL",
                level: item.level,
              });
              applySemanticTransition(next.level);
            }}
          >
            {item.label}
          </button>
        ))}
        {semanticLevel !== "topology" && (
          <button type="button" className="iov-breadcrumb-back" onClick={handleBackSemantic}>
            Back
          </button>
        )}
      </div>
      <IovTopologyPanel
        data={topologyData}
        selectedRegionId={selectedRegionId}
        toggles={toggles}
        isMobile={isMobile}
        semanticLevel={semanticLevel}
        selectedBrickLabel={selectedBrickLabel}
        canOpenBrick={canOpenBrick}
        blockSummary={blockSummary}
        personSummary={personSummary}
        interactionMode={interactionMode}
        personViewMode={personViewMode}
        phaseHeadline={phaseHeadline}
        presentationMode={presentationMode}
        meaningText={
          sceneRef.current?.getMeaningForRegion(selectedRegionId) ?? ""
        }
        onToggle={handleToggle}
        onBuild={handleBuild}
        onOpenBrick={handleOpenBrick}
        onBackSemantic={handleBackSemantic}
        onInteractionModeChange={handleInteractionModeChange}
        onTogglePresentationMode={() => setPresentationMode((prev) => !prev)}
        onPersonViewModeChange={setPersonViewMode}
        onToggleTimelinePlayback={handleToggleTimelinePlayback}
        onStepTimeline={handleStepTimeline}
        onTimelineSpeedChange={handleTimelineSpeedChange}
        transferredCount={transferredCount}
        values={values}
      />

      {semanticLevel !== "topology" && (
        <div className="iov-semantic-overlay">
          <div className="iov-semantic-card">
            {semanticLevel === "block" && blockSummary ? (
              <>
                <div className="iov-semantic-title">Brick Interior</div>
                <div className="iov-semantic-body">
                  {blockSummary.brickLabel} contains {blockSummary.peopleCount} people proxies.
                  Select one person token to continue into identity view.
                </div>
                <div className="iov-semantic-actions">
                  <button type="button" onClick={handleOpenPersonStub} disabled={!selectedPersonId}>
                    Open Person
                  </button>
                  <button type="button" onClick={handleBackSemantic}>
                    Back to Topology
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="iov-semantic-title">Person Identity</div>
                <div className="iov-semantic-body">
                  {personSummary
                    ? `${personSummary.personId}: ${
                        personViewMode === "identity"
                          ? "stable identity layers are visible; switch to Daily Logs to inspect protocol entries driving aura change."
                          : `current log drives Story/Skills first, then IdentityState; wellbeing (${personSummary.wellbeingScore.toFixed(
                              3
                            )}), aura field (${personSummary.auraStrength.toFixed(3)}).`
                      }`
                    : "Orbiting identity layers are active."}
                </div>
                <div className="iov-semantic-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setPersonViewMode((prev) =>
                        prev === "identity" ? "daily_logs" : "identity"
                      )
                    }
                  >
                    {personViewMode === "identity"
                      ? "View Daily Logs"
                      : "View Identity Layers"}
                  </button>
                  <button type="button" onClick={handleBackSemantic}>
                    Back to Brick
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {hoveredRegion && (
        semanticLevel === "topology" ? (
          <div
            className="iov-tooltip"
            style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
          >
            <div className="iov-tooltip-title">{hoveredRegion.label}</div>
            <div className="iov-tooltip-body">{toOneLine(hoveredRegion.notes)}</div>
          </div>
        ) : null
      )}
      {semanticLevel === "block" && hoveredPersonId && (
        <div
          className="iov-tooltip"
          style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
        >
          <div className="iov-tooltip-title">{hoveredPersonId}</div>
          <div className="iov-tooltip-body">
            Person token inside {blockSummary?.brickLabel ?? "selected brick"}.
          </div>
        </div>
      )}
      {semanticLevel === "person" && hoveredFacet && (
        <div
          className="iov-tooltip"
          style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
        >
          <div className="iov-tooltip-title">{hoveredFacet.replace("~~~", "")}</div>
          <div className="iov-tooltip-body">
            Wellbeing identity facet from protocol vocabulary.
          </div>
        </div>
      )}

      <div className="iov-concept">{topologyData.concept}</div>
      <div className="iov-selection-indicator">Selected: {selectedRegion?.label}</div>
    </div>
  );
};

const toOneLine = (notes: string) => {
  const firstSentence = notes.split(".")[0] ?? "";
  return firstSentence.trim().length > 0 ? `${firstSentence.trim()}.` : notes;
};

const getRegionLabel = (regionId: RegionId) => {
  const map: Record<RegionId, string> = {
    market: "Market",
    state: "State",
    community: "Community",
    crony_bridge: "Bridge",
  };
  return map[regionId];
};

export default IovTopologyCanvas;

const getPhaseHeadline = (regionId: RegionId) => {
  if (regionId === "market") return "Building Market - value stacks and settles.";
  if (regionId === "state") return "Building State - capacity assembles with weight.";
  if (regionId === "community") return "Building Community - base tiles spread outward.";
  return "Revealing Crony Bridge - top-layer interlock becomes visible.";
};
