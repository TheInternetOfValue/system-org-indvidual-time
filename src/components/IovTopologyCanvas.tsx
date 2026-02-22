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
  IovTopologyScene,
  IOV_TOPOLOGY_CONFIG,
  type IovTopologyData,
  type RegionId,
  type ToggleId,
} from "@/game/iov/IovTopologyScene";
import {
  DEFAULT_IOV_VALUES,
  loadIovValues,
} from "@/game/iov/iovValues";

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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>("community");
  const [hoveredRegionId, setHoveredRegionId] = useState<RegionId | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [transferredCount, setTransferredCount] = useState(0);
  const [values, setValues] = useState(DEFAULT_IOV_VALUES);
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
    });
    sceneRef.current = scene;
    scene.setValues(values);

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
      scene.resize(clientWidth, clientHeight);
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
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      scene.update(delta);
      if (composer) {
        composer.render();
      } else {
        scene.render(renderer);
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
      scene.setPointerFromCanvas(x, y, rect.width, rect.height);
    };

    const onPointerLeave = () => {
      scene.clearPointer();
      setHoveredRegionId(null);
    };

    const onPointerUp = () => {
      if (dragDistance <= 4) {
        // Click selection maps the hovered brick instance back to region id.
        scene.selectFromPointer();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!sceneRef.current) return;

      const keyMap: Partial<Record<string, RegionId>> = {
        "1": "market",
        "2": "state",
        "3": "community",
        "4": "crony_bridge",
      };

      const regionId = keyMap[event.key];
      if (!regionId) return;

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
      composer?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
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

  const selectedRegion = topologyData.regions.find(
    (region) => region.id === selectedRegionId
  );

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

  return (
    <div
      className={`iov-stage ${presentationMode ? "is-presentation" : ""}`}
      ref={containerRef}
    >
      <div className="iov-atmosphere" />
      <IovTopologyPanel
        data={topologyData}
        selectedRegionId={selectedRegionId}
        toggles={toggles}
        isMobile={isMobile}
        phaseHeadline={phaseHeadline}
        presentationMode={presentationMode}
        meaningText={
          sceneRef.current?.getMeaningForRegion(selectedRegionId) ?? ""
        }
        onToggle={handleToggle}
        onBuild={handleBuild}
        onTogglePresentationMode={() => setPresentationMode((prev) => !prev)}
        transferredCount={transferredCount}
        values={values}
      />

      {hoveredRegion && (
        <div
          className="iov-tooltip"
          style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
        >
          <div className="iov-tooltip-title">{hoveredRegion.label}</div>
          <div className="iov-tooltip-body">{toOneLine(hoveredRegion.notes)}</div>
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

export default IovTopologyCanvas;

const getPhaseHeadline = (regionId: RegionId) => {
  if (regionId === "market") return "Building Market - value stacks and settles.";
  if (regionId === "state") return "Building State - capacity assembles with weight.";
  if (regionId === "community") return "Building Community - base tiles spread outward.";
  return "Revealing Crony Bridge - top-layer interlock becomes visible.";
};
