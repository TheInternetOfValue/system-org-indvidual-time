import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import IovTopologyPanel from "@/ui/IovTopologyPanel";
import topologyRaw from "@/game/iov/iov.topology.json";
import {
  IovTopologyScene,
  IOV_TOPOLOGY_CONFIG,
  type IovTopologyData,
  type RegionId,
  type SelectedBrickInfo,
  type ToggleId,
} from "@/game/iov/IovTopologyScene";
import type {
  BlockInteriorScene as BlockInteriorSceneRuntime,
  BlockPeopleSummary,
} from "@/game/iov/BlockInteriorScene";
import type {
  PersonIdentityScene as PersonIdentitySceneRuntime,
  PersonIdentitySummary,
} from "@/game/iov/PersonIdentityScene";
import type { PersonImpactScene as PersonImpactSceneRuntime } from "@/game/iov/PersonImpactScene";
import type { ValueLogScene as ValueLogSceneRuntime } from "@/game/iov/ValueLogScene";
import {
  createInitialValueLogDraft,
  type ValueLogDraft,
  type ValueLogSummary,
  type WizardStep,
} from "@/game/iov/ValueLogModel";
import {
  IovSemanticZoomController,
  getSemanticBreadcrumb,
  type SemanticZoomLevel,
} from "@/game/iov/IovSemanticZoomController";
import { IovCameraDirector } from "@/game/iov/IovCameraDirector";
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
  type OrgImpactResult,
  type PersonImpactResult,
} from "@/game/iov/iovImpactEscalation";
import {
  loadBlockInteriorSceneModule,
  loadPersonIdentitySceneModule,
  loadPersonImpactSceneModule,
  loadValueLogSceneModule,
  preloadDeferredIovSceneModules,
} from "@/game/iov/sceneModules";

const topologyData = topologyRaw as IovTopologyData;

const buildInitialToggles = (data: IovTopologyData) =>
  data.toggles.reduce(
    (acc, toggle) => {
      acc[toggle.id] = toggle.default;
      return acc;
    },
    {} as Record<ToggleId, boolean>
  );

interface PendingEmpowerState {
  communityPowerDelta: number;
  activationCount: number;
}

const TOPOLOGY_REGION_ACTIONS: ReadonlyArray<{
  regionId: RegionId;
  label: string;
  cue: string;
}> = [
  { regionId: "community", label: "Community", cue: "Build pillar" },
  { regionId: "state", label: "State", cue: "Build pillar" },
  { regionId: "market", label: "Market", cue: "Build pillar" },
  { regionId: "crony_bridge", label: "Bridge", cue: "Lay bridge" },
];

const TOPOLOGY_BUILD_SEQUENCE: ReadonlyArray<RegionId> = [
  "community",
  "state",
  "market",
  "crony_bridge",
];
const DOUBLE_TAP_WINDOW_MS = 340;

const IovTopologyCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const valueLogCommitDockRef = useRef<HTMLDivElement | null>(null);
  const topologyRegionActionRefs = useRef<Record<RegionId, HTMLButtonElement | null>>({
    market: null,
    state: null,
    community: null,
    crony_bridge: null,
  });
  const sceneRef = useRef<IovTopologyScene | null>(null);
  const blockSceneRef = useRef<BlockInteriorSceneRuntime | null>(null);
  const personSceneRef = useRef<PersonIdentitySceneRuntime | null>(null);
  const impactSceneRef = useRef<PersonImpactSceneRuntime | null>(null);
  const valueLogSceneRef = useRef<ValueLogSceneRuntime | null>(null);
  const ensureSecondaryScenesRef = useRef<(() => Promise<void>) | null>(null);
  const cameraDirectorRef = useRef(new IovCameraDirector());
  const transitionBusyRef = useRef(false);
  const zoomControllerRef = useRef(new IovSemanticZoomController());
  const impactEscalationRef = useRef(
    new IovImpactEscalationController(IOV_FEATURE_FLAGS.enableImpactEscalation)
  );
  const orgActivatedBrickKeysRef = useRef<Set<string>>(new Set());
  const systemImpactModelRef = useRef({
    communityPillarHeight: 3.6,
    bridgeStress: 0.42,
    bridgeStressThreshold: 1,
  });
  const semanticLevelRef = useRef<SemanticZoomLevel>("topology");
  const selectedBrickInfoRef = useRef<SelectedBrickInfo | null>(null);
  const selectedPersonIdRef = useRef<string | null>(null);
  const topologyBuildStepRef = useRef(0);
  const lastSceneTapRef = useRef<{
    level: "topology" | "block" | "person" | "valuelog";
    key: string;
    at: number;
  } | null>(null);
  const isMobileRef = useRef(window.innerWidth <= 900);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>("community");
  const [selectedBrickInfo, setSelectedBrickInfo] = useState<SelectedBrickInfo | null>(null);
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
  const [transferredCount, setTransferredCount] = useState(0);
  const [semanticLevel, setSemanticLevel] = useState<SemanticZoomLevel>("topology");
  const [values, setValues] = useState(DEFAULT_IOV_VALUES);
  const [valueLogData, setValueLogData] = useState(DEFAULT_IOV_VALUELOGS);
  const [presentationMode, setPresentationMode] = useState(false);
  const [phaseHeadline, setPhaseHeadline] = useState(
    "Empty ground - press Community to begin."
  );
  const [toggles, setToggles] = useState<Record<ToggleId, boolean>>(() =>
    buildInitialToggles(topologyData)
  );
  const [lastImpactedPersonId, setLastImpactedPersonId] = useState<string | null>(null);
  const [lastImpactedBrick, setLastImpactedBrick] = useState<SelectedBrickInfo | null>(null);
  const [pendingEmpower, setPendingEmpower] = useState<PendingEmpowerState | null>(null);
  const [bridgeCollapsed, setBridgeCollapsed] = useState(false);
  const [canReplaySystemImpact, setCanReplaySystemImpact] = useState(false);
  const [topologyActivated, setTopologyActivated] = useState(false);
  const [topologyBuildStep, setTopologyBuildStep] = useState(0);

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
      onSelectChange: (regionId) => setSelectedRegionId(regionId),
      onTransferCountChange: (count) => setTransferredCount(count),
      onBrickSelectionChange: (selection) => setSelectedBrickInfo(selection),
    });
    sceneRef.current = scene;
    setCanReplaySystemImpact(scene.hasReplayableSystemImpact());
    scene.setValues(values);
    scene.setBrickInteractionMode("inspect");
    let blockScene: BlockInteriorSceneRuntime | null = null;
    let personScene: PersonIdentitySceneRuntime | null = null;
    let impactScene: PersonImpactSceneRuntime | null = null;
    let valueLogScene: ValueLogSceneRuntime | null = null;
    let secondaryScenesInitPromise: Promise<void> | null = null;

    const ensureSecondaryScenes = async () => {
      if (blockScene && personScene && impactScene && valueLogScene) return;
      if (secondaryScenesInitPromise) {
        await secondaryScenesInitPromise;
        return;
      }

      secondaryScenesInitPromise = (async () => {
        const [blockModule, personModule, impactModule, valueLogModule] = await Promise.all([
          loadBlockInteriorSceneModule(),
          loadPersonIdentitySceneModule(),
          loadPersonImpactSceneModule(),
          loadValueLogSceneModule(),
        ]);

        if (!blockScene) {
          blockScene = new blockModule.BlockInteriorScene(renderer.domElement, {
            onHoverPersonChange: (personId) => setHoveredPersonId(personId),
            onSelectPersonChange: (personId) => setSelectedPersonId(personId),
          });
          blockSceneRef.current = blockScene;
        }

        if (!personScene) {
          personScene = new personModule.PersonIdentityScene(renderer.domElement, {
            onHoverFacetChange: (facet) => setHoveredFacet(facet),
            onSelectFacetChange: () => {
              setPersonSummary(personSceneRef.current?.getSummary() ?? null);
            },
          });
          personSceneRef.current = personScene;
        }

        if (!impactScene) {
          impactScene = new impactModule.PersonImpactScene();
          impactSceneRef.current = impactScene;
        }

        if (!valueLogScene) {
          valueLogScene = new valueLogModule.ValueLogScene(renderer.domElement);
          valueLogSceneRef.current = valueLogScene;
        }

        const { clientWidth, clientHeight } = container;
        const nextIsMobile = clientWidth <= 900;
        blockScene.setViewportProfile(nextIsMobile);
        personScene.setViewportProfile(nextIsMobile);
        impactScene.resize(clientWidth, clientHeight);
        valueLogScene.setViewportProfile(nextIsMobile);
        blockScene.resize(clientWidth, clientHeight);
        personScene.resize(clientWidth, clientHeight);
        valueLogScene.resize(clientWidth, clientHeight);

        setBlockSummary(blockScene.getSummary());
        setPersonSummary(personScene.getSummary());
        setValueLogSummary(valueLogScene.getSummary());
      })();

      try {
        await secondaryScenesInitPromise;
      } finally {
        secondaryScenesInitPromise = null;
      }
    };
    ensureSecondaryScenesRef.current = ensureSecondaryScenes;

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
      isMobileRef.current = nextIsMobile;
      renderer.setSize(clientWidth, clientHeight);
      scene.setViewportProfile(nextIsMobile);
      scene.resize(clientWidth, clientHeight);
      blockScene?.setViewportProfile(nextIsMobile);
      personScene?.setViewportProfile(nextIsMobile);
      impactScene?.resize(clientWidth, clientHeight);
      valueLogScene?.setViewportProfile(nextIsMobile);
      blockScene?.resize(clientWidth, clientHeight);
      personScene?.resize(clientWidth, clientHeight);
      valueLogScene?.resize(clientWidth, clientHeight);
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

    type IdleWindow = Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = window as IdleWindow;
    const preloadModules = () => {
      void preloadDeferredIovSceneModules();
    };
    const idleHandle =
      idleWindow.requestIdleCallback?.(() => preloadModules(), { timeout: 1600 }) ?? null;
    const timeoutHandle =
      idleHandle === null ? window.setTimeout(() => preloadModules(), 700) : null;

    const clock = new THREE.Clock();
    const projectedAnchor = new THREE.Vector3();
    const valueLogTokenAnchor = new THREE.Vector3();
    let frame = 0;
    let personSummaryAccumulator = 0;
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      cameraDirectorRef.current.update(delta);
      updateTopologyRegionActionAnchors();
      updateValueLogCommitDockAnchor();
      if (
        semanticLevelRef.current === "topology" ||
        semanticLevelRef.current === "systemimpact"
      ) {
        scene.update(delta);
        if (composer) {
          composer.render();
        } else {
          scene.render(renderer);
        }
      } else if (
        semanticLevelRef.current === "block" ||
        semanticLevelRef.current === "orgimpact"
      ) {
        if (blockScene) {
          blockScene.update(delta);
          blockScene.render(renderer);
        } else {
          scene.update(delta);
          scene.render(renderer);
        }
      } else if (semanticLevelRef.current === "person") {
        if (personScene) {
          personScene.update(delta);
          personScene.render(renderer);
          personSummaryAccumulator += delta;
          if (personSummaryAccumulator >= 0.2) {
            personSummaryAccumulator = 0;
            setPersonSummary(personScene.getSummary());
          }
        } else {
          scene.update(delta);
          scene.render(renderer);
        }
      } else if (semanticLevelRef.current === "impact") {
        if (impactScene) {
          impactScene.update(delta);
          renderer.render(impactScene.scene, impactScene.camera);
        } else {
          scene.update(delta);
          scene.render(renderer);
        }
      } else {
        if (valueLogScene) {
          valueLogScene.update(delta);
          valueLogScene.render(renderer);
          personSummaryAccumulator += delta;
          if (personSummaryAccumulator >= 0.2) {
            personSummaryAccumulator = 0;
            const summary = valueLogScene.getSummary();
            setValueLogSummary(summary);
            setValueLogStep(summary.step);
            setValueLogDraft(summary.draft);
          }
        } else {
          scene.update(delta);
          scene.render(renderer);
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
      if (semanticLevelRef.current === "valuelog" && valueLogScene) {
        const rect = renderer.domElement.getBoundingClientRect();
        valueLogScene.setPointerFromCanvas(
          event.clientX - rect.left,
          event.clientY - rect.top,
          rect.width,
          rect.height
        );
        valueLogScene.beginPointerInteraction();
      }
    };

    function updateTopologyRegionActionAnchors() {
      const host = containerRef.current;
      const sceneRuntime = sceneRef.current;
      if (!host || !sceneRuntime) return;

      const isTopologyLevel = semanticLevelRef.current === "topology";
      const { clientWidth, clientHeight } = host;
      const safeTop = isMobileRef.current ? 58 : 72;
      const safeBottom = clientHeight - (isMobileRef.current ? 86 : 24);

      for (const action of TOPOLOGY_REGION_ACTIONS) {
        const button = topologyRegionActionRefs.current[action.regionId];
        if (!button) continue;

        if (!isTopologyLevel) {
          button.style.opacity = "0";
          button.style.pointerEvents = "none";
          continue;
        }

        const anchor = sceneRuntime.getRegionAnchor(action.regionId);
        if (!anchor) {
          button.style.opacity = "0";
          button.style.pointerEvents = "none";
          continue;
        }

        projectedAnchor.copy(anchor).project(sceneRuntime.camera);
        if (projectedAnchor.z < -1 || projectedAnchor.z > 1) {
          button.style.opacity = "0";
          button.style.pointerEvents = "none";
          continue;
        }

        const buttonWidth = Math.max(108, button.offsetWidth || 108);
        const buttonHeight = Math.max(48, button.offsetHeight || 48);
        const safeLeft = isMobileRef.current ? buttonWidth * 0.5 + 12 : buttonWidth * 0.5 + 16;
        const safeRight = clientWidth - buttonWidth * 0.5 - 16;

        let x = (projectedAnchor.x * 0.5 + 0.5) * clientWidth;
        let y = (-projectedAnchor.y * 0.5 + 0.5) * clientHeight;

        y -= action.regionId === "crony_bridge" ? buttonHeight * 0.8 : buttonHeight * 0.62;

        x = THREE.MathUtils.clamp(x, safeLeft, safeRight);
        y = THREE.MathUtils.clamp(y, safeTop, safeBottom);

        button.style.left = `${x}px`;
        button.style.top = `${y}px`;
        button.style.opacity = "1";
        button.style.pointerEvents = "auto";
      }
    }

    function updateValueLogCommitDockAnchor() {
      const host = containerRef.current;
      const dock = valueLogCommitDockRef.current;
      if (!host || !dock || !valueLogScene) return;

      if (semanticLevelRef.current !== "valuelog") {
        dock.style.opacity = "";
        dock.style.pointerEvents = "";
        dock.style.left = "";
        dock.style.top = "";
        dock.style.transform = "";
        return;
      }

      valueLogScene.getTokenWorldPosition(valueLogTokenAnchor);
      projectedAnchor.copy(valueLogTokenAnchor).project(valueLogScene.camera);
      if (projectedAnchor.z < -1 || projectedAnchor.z > 1) {
        dock.style.opacity = "0";
        dock.style.pointerEvents = "none";
        return;
      }

      const { clientWidth, clientHeight } = host;
      const buttonWidth = Math.max(220, dock.offsetWidth || 220);
      const buttonHeight = Math.max(52, dock.offsetHeight || 52);
      const safeLeft = buttonWidth * 0.5 + 10;
      const safeRight = clientWidth - buttonWidth * 0.5 - 10;
      const safeTop = isMobileRef.current ? 84 : 96;
      const safeBottom = clientHeight - (isMobileRef.current ? 110 : 44);

      const x = THREE.MathUtils.clamp(
        (projectedAnchor.x * 0.5 + 0.5) * clientWidth,
        safeLeft,
        safeRight
      );
      const y = THREE.MathUtils.clamp(
        (-projectedAnchor.y * 0.5 + 0.5) * clientHeight + (isMobileRef.current ? 76 : 64),
        safeTop,
        safeBottom
      );

      dock.style.opacity = "1";
      dock.style.pointerEvents = "auto";
      dock.style.left = `${x}px`;
      dock.style.top = `${y}px`;
      dock.style.transform = "translate(-50%, -50%)";
    }

    const onPointerMove = (event: PointerEvent) => {
      if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      dragDistance = Math.max(
        dragDistance,
        Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
      );

      if (semanticLevelRef.current === "topology") {
        scene.setPointerFromCanvas(x, y, rect.width, rect.height);
        blockScene?.clearPointer();
        personScene?.clearPointer();
        valueLogScene?.clearPointer();
      } else if (semanticLevelRef.current === "block") {
        blockScene?.setPointerFromCanvas(x, y, rect.width, rect.height);
        personScene?.clearPointer();
        scene.clearPointer();
        valueLogScene?.clearPointer();
      } else if (semanticLevelRef.current === "person") {
        personScene?.setPointerFromCanvas(x, y, rect.width, rect.height);
        blockScene?.clearPointer();
        scene.clearPointer();
        valueLogScene?.clearPointer();
      } else if (semanticLevelRef.current === "valuelog") {
        valueLogScene?.setPointerFromCanvas(x, y, rect.width, rect.height);
        scene.clearPointer();
        blockScene?.clearPointer();
        personScene?.clearPointer();
      } else {
        scene.clearPointer();
        blockScene?.clearPointer();
        personScene?.clearPointer();
        valueLogScene?.clearPointer();
      }
    };

    const onPointerLeave = () => {
      scene.clearPointer();
      blockScene?.clearPointer();
      personScene?.clearPointer();
      valueLogScene?.clearPointer();
      setHoveredPersonId(null);
      setHoveredFacet(null);
    };

  const onPointerUp = () => {
      if (semanticLevelRef.current === "valuelog" && valueLogScene) {
        valueLogScene.endPointerInteraction();
      }
      if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
      if (dragDistance <= 4) {
        if (semanticLevelRef.current === "topology") {
          scene.selectFromPointer();
          const selected = scene.getSelectedBrickInfo();
          if (!selected) return;
          const key = `${selected.regionId}:${selected.instanceId}`;
          const now = window.performance.now();
          const lastTap = lastSceneTapRef.current;
          const isDoubleTap =
            lastTap !== null &&
            lastTap.level === "topology" &&
            lastTap.key === key &&
            now - lastTap.at <= DOUBLE_TAP_WINDOW_MS;
          lastSceneTapRef.current = { level: "topology", key, at: now };
          if (isDoubleTap) {
            onOpenBrick(selected);
          }
        } else if (semanticLevelRef.current === "block") {
          if (!blockScene) return;
          blockScene.selectFromPointer();
          const selected = blockScene.getSummary().selectedPersonId;
          if (!selected) return;
          const now = window.performance.now();
          const lastTap = lastSceneTapRef.current;
          const isDoubleTap =
            lastTap !== null &&
            lastTap.level === "block" &&
            lastTap.key === selected &&
            now - lastTap.at <= DOUBLE_TAP_WINDOW_MS;
          lastSceneTapRef.current = { level: "block", key: selected, at: now };
          if (isDoubleTap) {
            handleOpenPersonStub(selected);
          }
        } else if (semanticLevelRef.current === "person") {
          if (!personScene) return;
          const summaryBefore = personScene.getSummary();
          const selectionKind = personScene.selectFromPointer();
          const summary = personScene.getSummary();
          const focusKey =
            selectionKind === "core"
              ? "__person_core__"
              : summary.selectedFacet ?? summary.selectedLayer ?? "__person__";
          const now = window.performance.now();
          const lastTap = lastSceneTapRef.current;
          const isDoubleTap =
            lastTap !== null &&
            lastTap.level === "person" &&
            lastTap.key === focusKey &&
            now - lastTap.at <= DOUBLE_TAP_WINDOW_MS;
          lastSceneTapRef.current = { level: "person", key: focusKey, at: now };

          const reselectedFocus =
            selectionKind !== null &&
            summaryBefore.selectedFacet === summary.selectedFacet &&
            summaryBefore.selectedLayer === summary.selectedLayer;

          if (selectionKind === "core" && isDoubleTap && summary.identityBuildComplete) {
            handleOpenValueLog();
            return;
          }

          if (
            (selectionKind === null || isDoubleTap || reselectedFocus) &&
            summary.identityBuildMode &&
            !summary.identityBuildComplete
          ) {
            handleNextIdentityLayer();
          }
        } else if (semanticLevelRef.current === "valuelog") {
          if (!valueLogScene) return;
          const selection = valueLogScene.selectFromPointer(false);
          const key = selection.key ?? "__empty__";
          const now = window.performance.now();
          const lastTap = lastSceneTapRef.current;
          const isDoubleTap =
            lastTap !== null &&
            lastTap.level === "valuelog" &&
            lastTap.key === key &&
            now - lastTap.at <= DOUBLE_TAP_WINDOW_MS;
          lastSceneTapRef.current = { level: "valuelog", key, at: now };
          if (isDoubleTap) {
            valueLogScene.selectFromPointer(true);
          }
          const summary = valueLogScene.getSummary();
          setValueLogSummary(summary);
          setValueLogStep(summary.step);
          setValueLogDraft(summary.draft);
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!sceneRef.current) return;
      if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;

      if (event.key === "Escape" && semanticLevelRef.current !== "topology") {
        const next = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
        applySemanticTransition(next.level);
        return;
      }

      const keyMap: Partial<Record<string, RegionId>> = {
        "1": "community",
        "2": "state",
        "3": "market",
        "4": "crony_bridge",
      };

      const regionId = keyMap[event.key];
      if (!regionId) return;
      if (semanticLevelRef.current !== "topology") return;

      handleBuild(regionId);
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
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);

      scene.dispose();
      blockScene?.dispose();
      personScene?.dispose();
      valueLogScene?.dispose();
      transitionBusyRef.current = false;
      cameraDirectorRef.current.cancelShot();
      ensureSecondaryScenesRef.current = null;
      composer?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      blockSceneRef.current = null;
      personSceneRef.current = null;
      valueLogSceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedBrickInfoRef.current = selectedBrickInfo;
  }, [selectedBrickInfo]);

  useEffect(() => {
    selectedPersonIdRef.current = selectedPersonId;
  }, [selectedPersonId]);

  useEffect(() => {
    topologyBuildStepRef.current = topologyBuildStep;
  }, [topologyBuildStep]);

  useEffect(() => {
    lastSceneTapRef.current = null;
  }, [semanticLevel]);

  useEffect(() => {
    if (semanticLevel !== "topology") return;
    if (selectedBrickInfo) {
      setTopologyActivated(true);
    }
  }, [semanticLevel, selectedBrickInfo]);

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
  const canEmpowerCommunity =
    semanticLevel === "topology" && pendingEmpower !== null && !bridgeCollapsed;
  const canReplayImpact = semanticLevel === "topology" && canReplaySystemImpact;
  const empowerLabel = pendingEmpower
    ? `Empower Community Pillar (${pendingEmpower.activationCount})`
    : "Empower Community Pillar";
  const canValueLogCommit = valueLogSummary?.canCommit ?? false;
  const breadcrumb = getSemanticBreadcrumb(zoomControllerRef.current.getState());
  const nextTopologyBuildRegion =
    IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild &&
    topologyBuildStep < TOPOLOGY_BUILD_SEQUENCE.length
      ? (TOPOLOGY_BUILD_SEQUENCE[topologyBuildStep] ?? null)
      : null;
  const visibleTopologyActions =
    IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild && nextTopologyBuildRegion
      ? TOPOLOGY_REGION_ACTIONS.filter((action) => action.regionId === nextTopologyBuildRegion)
      : IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild
        ? []
        : TOPOLOGY_REGION_ACTIONS;

  const getNextBuildRegion = (step = topologyBuildStepRef.current) =>
    IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild && step < TOPOLOGY_BUILD_SEQUENCE.length
      ? (TOPOLOGY_BUILD_SEQUENCE[step] ?? null)
      : null;

  const getBuildOrderHint = (nextRegion: RegionId) =>
    `Build order: Community -> State -> Market -> Bridge. Next: ${getRegionLabel(nextRegion)}.`;

  const handleToggle = (toggleId: ToggleId) => {
    setToggles((prev) => {
      const next = { ...prev, [toggleId]: !prev[toggleId] };
      sceneRef.current?.setToggle(toggleId, next[toggleId]);
      setTopologyActivated(true);
      return next;
    });
  };

  const handleBuild = (regionId: RegionId) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const expectedRegion = getNextBuildRegion();
    if (expectedRegion && regionId !== expectedRegion) {
      setPhaseHeadline(getBuildOrderHint(expectedRegion));
      return;
    }

    scene.triggerFormation(regionId);
    setTopologyActivated(true);

    if (!expectedRegion) {
      setPhaseHeadline(getPhaseHeadline(regionId));
      return;
    }

    const nextStep = Math.min(TOPOLOGY_BUILD_SEQUENCE.length, topologyBuildStepRef.current + 1);
    topologyBuildStepRef.current = nextStep;
    setTopologyBuildStep(nextStep);
    const upcoming = getNextBuildRegion(nextStep);
    if (upcoming) {
      setPhaseHeadline(`${getPhaseHeadline(regionId)} Next: ${getRegionLabel(upcoming)}.`);
      return;
    }

    setPhaseHeadline(
      "Bridge laid. Select an organization unit to continue the story from system to organization."
    );
  };

  const applySemanticTransition = (level: SemanticZoomLevel, contextData?: any) => {
    const prevLevel = semanticLevelRef.current;
    semanticLevelRef.current = level;
    setSemanticLevel(level);
    if (level === "topology") {
      const nextRegion = getNextBuildRegion();
      setPhaseHeadline(nextRegion ? getBuildOrderHint(nextRegion) : "Returned to system layer.");
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
    } else if (level === "systemimpact") {
      setPhaseHeadline("System impact: Community grows and applies pressure into the bridge.");
    } else if (level === "valuelog") {
      setPhaseHeadline(
        "Time Slice mode: define time, choose wellbeing context, then commit the causal signal."
      );
      personSceneRef.current?.setDetailMode("valuelog");
      const valueLogScene = valueLogSceneRef.current;
      if (!valueLogScene) {
        void (ensureSecondaryScenesRef.current?.() ?? Promise.resolve()).then(() => {
          const loadedScene = valueLogSceneRef.current;
          if (!loadedScene) return;
          loadedScene.setDraft(valueLogDraft);
          loadedScene.setStep(valueLogStep);
          setValueLogSummary(loadedScene.getSummary());
        });
        return;
      }
      valueLogScene.setDraft(valueLogDraft);
      valueLogScene.setStep(valueLogStep);
      setValueLogSummary(valueLogScene.getSummary());
    } else {
      setPhaseHeadline("Transitioning...");
    }
  };

  const getPhaseHeadline = (regionId?: RegionId) => {
    switch (regionId) {
      case "market":
        return "Market pillar built. Financial scale now sits on top of the foundation.";
      case "state":
        return "State pillar built. Governance capacity now rises from the foundation.";
      case "community":
        return "Community foundation built. Now stack institutions on top of people.";
      case "crony_bridge":
        return "Crony Bridge laid across top layers.";
      default:
        return "Build sequence: Community -> State -> Market -> Bridge.";
    }
  };

  const getBrickActivationKey = (regionId: RegionId, instanceId: number) =>
    `${regionId}:${instanceId}`;

  const applyBlockActivationState = (selection: SelectedBrickInfo | null) => {
    const blockScene = blockSceneRef.current;
    if (!blockScene || !selection) return;

    const key = getBrickActivationKey(selection.regionId, selection.instanceId);
    if (orgActivatedBrickKeysRef.current.has(key)) {
      blockScene.activateOrganization(lastImpactedPersonId ?? undefined);
      return;
    }

    const sameBrickAsLastImpact =
      lastImpactedBrick &&
      lastImpactedBrick.regionId === selection.regionId &&
      lastImpactedBrick.instanceId === selection.instanceId;

    if (sameBrickAsLastImpact && lastImpactedPersonId) {
      blockScene.activatePerson(lastImpactedPersonId);
    }
  };

  const waitMs = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const onOpenBrick = async (selectionOverride?: SelectedBrickInfo) => {
    const targetSelection =
      selectionOverride ??
      selectedBrickInfoRef.current ??
      sceneRef.current?.getSelectedBrickInfo() ??
      null;
    if (!targetSelection) return;
    if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
    const mobile = isMobileRef.current;
    setTopologyActivated(true);
    transitionBusyRef.current = true;

    const scene = sceneRef.current;
    const ensureSecondaryScenes = ensureSecondaryScenesRef.current;
    const secondaryScenesReadyPromise = ensureSecondaryScenes?.() ?? Promise.resolve();
    try {
      if (scene) {
        const anchor = scene.getBrickAnchor(
          targetSelection.regionId,
          targetSelection.instanceId
        );
        if (anchor) {
          await scene.playBrickFocusCue(
            targetSelection.regionId,
            targetSelection.instanceId,
            mobile ? 210 : 180
          );
          cameraDirectorRef.current.captureLevelPose("topology", {
            camera: scene.camera,
            controls: scene.controls,
          });
          const target = anchor.clone();
          target.y += mobile ? 1.05 : 0.95;
          const position = target
            .clone()
            .add(new THREE.Vector3(0, mobile ? 7.2 : 6.5, mobile ? 12.8 : 11.5));
          await cameraDirectorRef.current.playShot({
            id: "SYSTEM_TO_ORGANIZATION",
            rig: {
              camera: scene.camera,
              controls: scene.controls,
            },
            endPose: {
              position,
              target,
              fov: mobile ? 46 : 38,
            },
            durationMs: mobile ? 1200 : 1100,
            fovOvershoot: mobile ? 0.9 : 1.1,
          });
          await waitMs(mobile ? 150 : 120);
        }
      }

      await secondaryScenesReadyPromise;
      const blockScene = blockSceneRef.current;
      const next = zoomControllerRef.current.dispatch({ type: "OPEN_BLOCK" });
      applySemanticTransition(next.level);
      if (blockScene) {
        blockScene.setSourceBrick(targetSelection);
        applyBlockActivationState(targetSelection);
        cameraDirectorRef.current.captureLevelPose("block", {
          camera: blockScene.camera,
          controls: blockScene.controls,
        });
      }
    } finally {
      transitionBusyRef.current = false;
    }
  };

  const handleBackSemantic = () => {
    if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
    const next = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
    applySemanticTransition(next.level);
    if (next.level === "topology") {
      setSelectedPersonId(null);
      setHoveredPersonId(null);
      setHoveredFacet(null);
      setPersonSummary(null);
    }
  };

  const handleOpenPersonStub = async (personIdOverride?: string) => {
    const targetPersonId = personIdOverride ?? selectedPersonIdRef.current ?? selectedPersonId;
    if (!targetPersonId) return;
    if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
    await (ensureSecondaryScenesRef.current?.() ?? Promise.resolve());
    const mobile = isMobileRef.current;
    transitionBusyRef.current = true;
    const blockScene = blockSceneRef.current;
    const personScene = personSceneRef.current;
    if (!personScene) {
      transitionBusyRef.current = false;
      return;
    }
    try {
      if (blockScene) {
        const anchor = blockScene.getPersonAnchor(targetPersonId);
        if (anchor) {
          await blockScene.playPersonFocusCue(targetPersonId, mobile ? 190 : 160);
          cameraDirectorRef.current.captureLevelPose("block", {
            camera: blockScene.camera,
            controls: blockScene.controls,
          });
          const target = anchor.clone();
          target.y += mobile ? 0.26 : 0.2;
          const position = target
            .clone()
            .add(new THREE.Vector3(0, mobile ? 3.0 : 2.6, mobile ? 5.6 : 4.8));
          await cameraDirectorRef.current.playShot({
            id: "ORGANIZATION_TO_PERSON",
            rig: {
              camera: blockScene.camera,
              controls: blockScene.controls,
            },
            endPose: {
              position,
              target,
              fov: mobile ? 40 : 33,
            },
            durationMs: mobile ? 980 : 900,
            fovOvershoot: mobile ? 0.7 : 0.9,
          });
          await waitMs(mobile ? 130 : 110);
        }
      }
      const sourceRegion = blockSummary?.regionId ?? selectedBrickInfo?.regionId ?? "community";
      personScene.setPersonContext(targetPersonId, sourceRegion);
      const logs = resolvePersonValuelogs(valueLogData, targetPersonId, sourceRegion);
      setActivePersonLogs(logs);
      personScene.setTimelineLogs(logs);
      personScene.setDetailMode("identity");
      setPersonSummary(personScene.getSummary());
      const next = zoomControllerRef.current.dispatch({
        type: "OPEN_PERSON",
        personId: targetPersonId,
      });
      applySemanticTransition(next.level);
      cameraDirectorRef.current.captureLevelPose("person", {
        camera: personScene.camera,
        controls: personScene.controls,
      });
    } finally {
      transitionBusyRef.current = false;
    }
  };

  const handleOpenValueLog = async () => {
    await (ensureSecondaryScenesRef.current?.() ?? Promise.resolve());
    const valueLogScene = valueLogSceneRef.current;
    if (!valueLogScene) return;
    const summary = personSceneRef.current?.getSummary() ?? personSummary;
    if (summary && !summary.identityBuildComplete) {
      setPhaseHeadline("Complete identity layers before opening Time Slice.");
      return;
    }
    const next = zoomControllerRef.current.dispatch({ type: "OPEN_VALUELOG" });
    valueLogScene.setDraft(valueLogDraft);
    valueLogScene.setStep(valueLogStep);
    setValueLogSummary(valueLogScene.getSummary());
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
    if (patch.wellbeingNode) {
      setValueLogStep(
        patch.wellbeingNode === "~~Performance" ? "select_performance" : "select_intensity"
      );
    }
  };

  const startSystemImpactSequence = (
    orgImpactResult: OrgImpactResult,
    options?: { empowerSurge?: boolean }
  ) => {
    const scene = sceneRef.current;
    if (!scene) {
      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
      return;
    }

    const openSystemImpact = zoomControllerRef.current.dispatch({ type: "OPEN_SYSTEM_IMPACT" });
    applySemanticTransition(openSystemImpact.level);
    impactEscalationRef.current.dispatch({ type: "START_SYSTEM_IMPACT" });

    const before = systemImpactModelRef.current;
    scene.playSystemImpact(
      {
        orgImpact: orgImpactResult,
        communityPillarHeightBefore: before.communityPillarHeight,
        bridgeStressBefore: before.bridgeStress,
        bridgeStressThreshold: before.bridgeStressThreshold,
        empowerSurge: options?.empowerSurge ?? false,
      },
      (systemImpactResult) => {
        impactEscalationRef.current.dispatch({
          type: "COMPLETE_SYSTEM_IMPACT",
          result: systemImpactResult,
        });
        systemImpactModelRef.current.communityPillarHeight =
          systemImpactResult.communityPillarHeightAfter;
        systemImpactModelRef.current.bridgeStress = systemImpactResult.bridgeStressAfter;
        setBridgeCollapsed(systemImpactResult.bridgeCollapsed);
        setCanReplaySystemImpact(scene.hasReplayableSystemImpact());

        const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
        applySemanticTransition(back.level);
        scene.clearSelectedBrick();
        scene.frameSystemOverview();
        setPhaseHeadline(
          systemImpactResult.bridgeCollapsed
            ? "Community pillar impact collapsed the crony bridge."
            : "Community pillar surged, bridge stress increased."
        );
      }
    );
  };

  const handleEmpowerCommunity = () => {
    if (!pendingEmpower || bridgeCollapsed) return;

    const pendingResult: OrgImpactResult = {
      regionId: "community",
      brickId: 0,
      activatedPeopleCount: pendingEmpower.activationCount,
      populationCount: pendingEmpower.activationCount,
      contagionComplete: true,
      orgRadiance: 1,
      communityPowerDelta: Number(
        Math.max(0.05, Math.min(1.2, pendingEmpower.communityPowerDelta)).toFixed(3)
      ),
    };

    setPendingEmpower(null);
    setPhaseHeadline("Empowering community pillar...");
    startSystemImpactSequence(pendingResult, { empowerSurge: true });
  };

  const handleReplaySystemImpact = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
    transitionBusyRef.current = true;
    scene.clearSelectedBrick();
    scene.frameSystemOverview();
    setPhaseHeadline("Replaying system impact cinematic.");

    const started = scene.replayLastSystemImpact((systemImpactResult) => {
      systemImpactModelRef.current.communityPillarHeight =
        systemImpactResult.communityPillarHeightAfter;
      systemImpactModelRef.current.bridgeStress = systemImpactResult.bridgeStressAfter;
      setBridgeCollapsed(systemImpactResult.bridgeCollapsed);
      setCanReplaySystemImpact(scene.hasReplayableSystemImpact());
      scene.clearSelectedBrick();
      scene.frameSystemOverview();
      setPhaseHeadline(
        systemImpactResult.bridgeCollapsed
          ? "Community pillar impact collapsed the crony bridge."
          : "Community pillar surged, bridge stress increased."
      );
      transitionBusyRef.current = false;
    });

    if (!started) {
      setPhaseHeadline("No system impact sequence available to replay yet.");
      transitionBusyRef.current = false;
    }
  };

  const startOrgImpactSequence = (personImpactResult: PersonImpactResult) => {
    const blockScene = blockSceneRef.current;
    if (!blockScene || !selectedBrickInfo) {
      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
      return;
    }

    blockScene.frameOrganizationOverview();
    blockScene.setSourceBrick(selectedBrickInfo);
    const openOrgImpact = zoomControllerRef.current.dispatch({ type: "OPEN_ORG_IMPACT" });
    applySemanticTransition(openOrgImpact.level);
    impactEscalationRef.current.dispatch({ type: "START_ORG_IMPACT" });

    blockScene.playOrgContagion(personImpactResult.personId, (summary) => {
      const populationCount = Math.max(1, summary.populationCount);
      const orgRadiance = summary.activatedPeopleCount / populationCount;
      const auraBoost = Math.max(0, personImpactResult.auraDelta);
      const communityPowerDelta = Number(
        Math.max(0.05, Math.min(0.45, orgRadiance * 0.2 + auraBoost * 0.9)).toFixed(3)
      );
      const orgImpactResult: OrgImpactResult = {
        regionId: selectedBrickInfo.regionId,
        brickId: selectedBrickInfo.instanceId,
        activatedPeopleCount: summary.activatedPeopleCount,
        populationCount,
        contagionComplete: orgRadiance >= 0.999,
        orgRadiance: Number(orgRadiance.toFixed(3)),
        communityPowerDelta,
      };

      impactEscalationRef.current.dispatch({
        type: "COMPLETE_ORG_IMPACT",
        result: orgImpactResult,
      });

      if (orgImpactResult.contagionComplete) {
        const key = getBrickActivationKey(orgImpactResult.regionId, orgImpactResult.brickId);
        orgActivatedBrickKeysRef.current.add(key);
        blockSceneRef.current?.activateOrganization(personImpactResult.personId);
      }

      if (IOV_FEATURE_FLAGS.enableImpactEscalation) {
        setPendingEmpower((prev) => {
          const nextDelta =
            (prev?.communityPowerDelta ?? 0) + orgImpactResult.communityPowerDelta;
          return {
            communityPowerDelta: Number(Math.min(1.2, nextDelta).toFixed(3)),
            activationCount: (prev?.activationCount ?? 0) + 1,
          };
        });
        const backToBlock = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
        applySemanticTransition(backToBlock.level);
        const backToSystem = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
        applySemanticTransition(backToSystem.level);
        sceneRef.current?.clearSelectedBrick();
        sceneRef.current?.frameSystemOverview();
        setPhaseHeadline(
          "Organization activated. Press Empower Community Pillar to trigger system impact."
        );
        return;
      }

      const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
      applySemanticTransition(back.level);
    });
  };

  const handleValueLogCommit = async () => {
    if (!selectedPersonId) return;
    if (transitionBusyRef.current) return;
    const valueLogScene = valueLogSceneRef.current;
    if (!valueLogScene) return;
    const entry = valueLogScene.commit(selectedPersonId);
    // Grab the draft before resetting or moving on
    const finalDraft = valueLogScene.getDraft();
    if (!entry || !finalDraft) return;
    transitionBusyRef.current = true;
    try {
      await valueLogScene.playCommitDrop(320);
    } finally {
      transitionBusyRef.current = false;
    }

    const finalizeAfterPersonImpact = () => {
      const nextLogs = [...activePersonLogs, entry];
      setActivePersonLogs(nextLogs);
      personSceneRef.current?.setTimelineLogs(nextLogs);
      setPersonSummary(personSceneRef.current?.getSummary() ?? null);
      setValueLogSummary(valueLogScene.getSummary());
      setValueLogStep("select_time");
      setLastImpactedPersonId(selectedPersonId);
      setLastImpactedBrick(
        selectedBrickInfo
          ? { ...selectedBrickInfo }
          : null
      );

      if (IOV_FEATURE_FLAGS.enableImpactEscalation && selectedBrickInfo) {
        const auraDelta = valueLogScene.getSummary().outcome.auraDelta;
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
    const nodeLabel = finalDraft.wellbeingNode.replace("~~", "");
    setPhaseHeadline(
      `Photon drop: ${finalDraft.signalLabel} (${finalDraft.signalScore.toFixed(
        2
      )}) lands in ${nodeLabel}.`
    );

    if (impactSceneRef.current) {
      impactSceneRef.current.playImpact(finalDraft, finalizeAfterPersonImpact);
    } else {
      finalizeAfterPersonImpact();
    }
  };

  // Keep block activation visuals consistent when returning from person/org impact flows.
  useEffect(() => {
    if (semanticLevel !== "block" || !selectedBrickInfo) return;
    applyBlockActivationState(selectedBrickInfo);
  }, [semanticLevel, selectedBrickInfo, lastImpactedPersonId, lastImpactedBrick]);

  // Promote last impacted brick to radiant state when zooming back to topology.
  useEffect(() => {
    if (
      semanticLevel !== "topology" ||
      !lastImpactedPersonId ||
      !lastImpactedBrick ||
      !sceneRef.current
    ) {
      return;
    }

    sceneRef.current.activateBrick(lastImpactedBrick.regionId, lastImpactedBrick.instanceId);
    setLastImpactedPersonId(null);
    setLastImpactedBrick(null);
  }, [semanticLevel, lastImpactedPersonId, lastImpactedBrick]);

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
    if (IOV_FEATURE_FLAGS.enableImpactEscalation) return;

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
              if (cameraDirectorRef.current.isPlaying || transitionBusyRef.current) return;
              if (item.active) return;
              zoomControllerRef.current.dispatch({ type: "SET_LEVEL", level: item.level });
              applySemanticTransition(item.level);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {semanticLevel === "topology" && (
        <div className="iov-topology-scene-actions" aria-label="Topology scene actions">
          {visibleTopologyActions.map((action) => (
            <button
              key={action.regionId}
              type="button"
              className={`iov-topology-scene-action is-${action.regionId} ${
                selectedRegionId === action.regionId ? "is-selected" : ""
              }`}
              ref={(node) => {
                topologyRegionActionRefs.current[action.regionId] = node;
              }}
              onClick={() => handleBuild(action.regionId)}
            >
              <span className="iov-topology-scene-action-label">{action.label}</span>
              <span className="iov-topology-scene-action-cue">{action.cue}</span>
            </button>
          ))}
        </div>
      )}

      {semanticLevel === "topology" && selectedBrickInfo && (
        <>
          <div className="iov-scene-chip">
            <strong>{selectedBrickLabel ?? "Organization selected"}</strong>
            <span>Double-click to open organization.</span>
          </div>
          <div className="iov-scene-dock">
            <button
              className={`${presentationMode ? "iov-btn-action" : "iov-btn-secondary"} iov-btn-inline`}
              onClick={() => onOpenBrick()}
            >
              Open Organization
            </button>
            {!presentationMode && canReplayImpact && (
              <button className="iov-btn-secondary iov-btn-inline" onClick={handleReplaySystemImpact}>
                Replay Impact
              </button>
            )}
          </div>
        </>
      )}

      {semanticLevel === "block" && blockSummary && blockSummary.selectedPersonId && (
        <>
          <div className="iov-scene-chip iov-scene-chip-top">
            <strong>{blockSummary.selectedPersonId}</strong>
            <span> selected. Double-click to open person.</span>
          </div>
          <div className="iov-scene-dock">
            <button
              className={`${presentationMode ? "iov-btn-action" : "iov-btn-secondary"} iov-btn-inline`}
              onClick={() => handleOpenPersonStub()}
            >
              Open Person
            </button>
            {!presentationMode && (
              <button
                className="iov-btn-secondary iov-btn-inline"
                onClick={() => {
                  const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
                  applySemanticTransition(back.level);
                }}
              >
                Back to System
              </button>
            )}
          </div>
        </>
      )}

      {semanticLevel === "person" && personSummary && (
        <>
          <div className="iov-scene-chip iov-scene-chip-top">
            <strong>{personSummary.personId}</strong>
            <span>
              {personSummary.identityBuildMode
                ? ` Layer: ${personSummary.identityBuildLayerLabel ?? "Initializing"}`
                : " Identity stack ready. Reveal layers to begin."}
              {presentationMode
                ? " Follow the highlighted action to progress."
                : " Tap orbit/facet to focus meaning. Tap empty space, re-tap the same target, or double-click to reveal the next layer. Double-click the person to open Time Slice."}
            </span>
          </div>
          {!presentationMode && personSummary.selectedContextTitle && personSummary.selectedContextBody && (
            <div className="iov-scene-chip iov-scene-chip-context">
              <strong>{personSummary.selectedContextTitle}</strong>
              <span>{personSummary.selectedContextBody}</span>
            </div>
          )}
          <div className="iov-scene-dock iov-scene-dock-person">
            {presentationMode ? (
              !personSummary.identityBuildMode ? (
                <button className="iov-btn-primary iov-btn-inline" onClick={handleStartIdentityBuild}>
                  Reveal Layers
                </button>
              ) : !personSummary.identityBuildComplete ? (
                <button className="iov-btn-primary iov-btn-inline" onClick={handleNextIdentityLayer}>
                  Next Layer ({personSummary.identityBuildLayerIndex + 1}/
                  {personSummary.identityBuildLayerCount})
                </button>
              ) : (
                <button className="iov-btn-action iov-btn-inline" onClick={handleOpenValueLog}>
                  Open Time Slice
                </button>
              )
            ) : (
              <>
                {!personSummary.identityBuildMode ? (
                  <button className="iov-btn-primary iov-btn-inline" onClick={handleStartIdentityBuild}>
                    Reveal Layers
                  </button>
                ) : (
                  <>
                    {!personSummary.identityBuildComplete && (
                      <button className="iov-btn-primary iov-btn-inline" onClick={handleNextIdentityLayer}>
                        Next Layer ({personSummary.identityBuildLayerIndex + 1}/
                        {personSummary.identityBuildLayerCount})
                      </button>
                    )}
                    <button
                      className="iov-btn-secondary iov-btn-inline"
                      onClick={handleReplayIdentityLayer}
                      disabled={personSummary.identityBuildLayerIndex < 0}
                    >
                      Replay
                    </button>
                  </>
                )}
                <button
                  className="iov-btn-action iov-btn-inline"
                  onClick={handleOpenValueLog}
                  disabled={!personSummary.identityBuildComplete}
                >
                  {personSummary.identityBuildComplete
                    ? "Open Time Slice"
                    : "Complete Layers to Open Time Slice"}
                </button>
                <button
                  className="iov-btn-secondary iov-btn-inline"
                  onClick={() => {
                    const back = zoomControllerRef.current.dispatch({ type: "NAV_BACK" });
                    applySemanticTransition(back.level);
                  }}
                >
                  Back to Org
                </button>
              </>
            )}
          </div>
        </>
      )}

      {semanticLevel === "valuelog" && valueLogSummary && (
        <>
          <div className="iov-scene-chip iov-scene-chip-top">
            <strong>Time Slice</strong>
            <span>{valueLogSummary.sceneActionHint}</span>
          </div>
          {canValueLogCommit && (
            <div ref={valueLogCommitDockRef} className="iov-scene-dock iov-scene-dock-commit-floating">
              <button className="iov-btn-action iov-btn-inline" onClick={handleValueLogCommit}>
                Commit Time Slice
              </button>
            </div>
          )}
        </>
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
        topologyActivated={topologyActivated}
        nextTopologyBuildRegion={nextTopologyBuildRegion}
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
        onToggle={handleToggle}
        onBuild={handleBuild}
        onOpenBrick={onOpenBrick}
        onOpenPerson={handleOpenPersonStub}
        onBackSemantic={handleBackSemantic}
        onTogglePresentationMode={() => setPresentationMode((p) => !p)}
        onValueLogDraftChange={handleValueLogDraftChange}
        onValueLogCommit={handleValueLogCommit}
        onOpenValueLog={handleOpenValueLog}
        canEmpowerCommunity={canEmpowerCommunity}
        empowerLabel={empowerLabel}
        onEmpowerCommunity={handleEmpowerCommunity}
        canReplaySystemImpact={canReplayImpact}
        onReplaySystemImpact={handleReplaySystemImpact}
      />
    </div>
  );
};

export default IovTopologyCanvas;
