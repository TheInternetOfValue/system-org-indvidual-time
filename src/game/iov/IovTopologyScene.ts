import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  DEFAULT_IOV_VALUES,
  type IovValues,
  toPositive,
} from "./iovValues";
import {
  IOV_IDENTITY_COLORS,
  IOV_SCALE_CONFIG,
} from "./iovNarrativeConfig";

export type RegionId = "market" | "state" | "community" | "crony_bridge";
export type ToggleId = "derivativesMist" | "communityErosion";

export interface Position3 {
  x: number;
  y: number;
  z: number;
}

interface TowerShape {
  type: "tower";
  height: number;
  baseWidth: number;
  taper: number;
}

interface BaseShape {
  type: "base";
  width: number;
  depth: number;
  height: number;
}

interface BridgeShape {
  type: "bridge";
  length: number;
  thickness: number;
}

type RegionShape = TowerShape | BaseShape | BridgeShape;

export interface IovRegionConfig {
  id: RegionId;
  label: string;
  position: Position3;
  palette: string[];
  shape: RegionShape;
  notes: string;
}

export interface IovToggleConfig {
  id: ToggleId;
  label: string;
  default: boolean;
}

export interface IovTopologyData {
  concept: string;
  regions: IovRegionConfig[];
  toggles: IovToggleConfig[];
}

interface BrickInstance {
  position: THREE.Vector3;
  color: THREE.Color;
  isTopLayer: boolean;
  isTopCap: boolean;
  segment?: "cash" | "derivatives";
}

interface RegionRuntime {
  config: IovRegionConfig;
  mesh: THREE.InstancedMesh;
  material: THREE.MeshBasicMaterial;
  edgeGroup: THREE.Group;
  studs: THREE.InstancedMesh | null;
  baseBricks: BrickInstance[];
  currentBricks: BrickInstance[];
  center: THREE.Vector3;
  topY: number;
  topCapCenter: THREE.Vector3;
  accentColor: THREE.Color;
}

interface IovSceneCallbacks {
  onHoverChange?: (regionId: RegionId | null) => void;
  onSelectChange?: (regionId: RegionId) => void;
  onTransferCountChange?: (count: number) => void;
}

interface ActiveTransfer {
  regionId: RegionId;
  instanceId: number;
  start: THREE.Vector3;
  pop: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
  elapsed: number;
  mesh: THREE.Mesh;
  trail: THREE.Line;
}

interface LandingPulse {
  mesh: THREE.LineSegments;
  elapsed: number;
  duration: number;
}

export const IOV_TOPOLOGY_CONFIG = {
  brick: {
    width: 0.9,
    height: 0.4,
    depth: 0.9,
    gapRatio: 0.02,
  },
  layout: {
    groundY: 0,
    marketX: -8,
    communityX: 0,
    stateX: 8,
    z: 0,
  },
  pillars: {
    marketHeightScale: 1.6,
    stateHeightScale: 1,
    minHeightLayers: 3,
    logScaleMultiplier: 6,
    maxHeightLayers: 24,
  },
  community: {
    width: 18,
    depth: 3,
    height: 1,
    coreWidth: 4,
    coreDepth: 2,
    coreHeight: 2,
    slotCols: 6,
    slotRows: 4,
  },
  bridge: {
    thickness: 1,
    sagAmplitude: 0.35,
    topAnchorPercent: 0.99,
  },
  render: {
    enableSlotGuides: false,
    enablePostprocessing: false,
    enableDerivativesMist: false,
  },
  animation: {
    enableStagedBuild: true,
  },
} as const;

const BRICK_W = IOV_TOPOLOGY_CONFIG.brick.width;
const BRICK_H = IOV_TOPOLOGY_CONFIG.brick.height;
const BRICK_D = IOV_TOPOLOGY_CONFIG.brick.depth;
const HALF_H = BRICK_H / 2;
const GAP_RATIO = IOV_TOPOLOGY_CONFIG.brick.gapRatio;
const STEP_XZ = BRICK_W * (1 + GAP_RATIO);
const STEP_Y = BRICK_H * (1 + GAP_RATIO);

const GROUND_Y = IOV_TOPOLOGY_CONFIG.layout.groundY;
const MARKET_X = IOV_TOPOLOGY_CONFIG.layout.marketX;
const COMMUNITY_X = IOV_TOPOLOGY_CONFIG.layout.communityX;
const STATE_X = IOV_TOPOLOGY_CONFIG.layout.stateX;
const TOPOLOGY_Z = IOV_TOPOLOGY_CONFIG.layout.z;
const BASEPLATE_TOP_Y = GROUND_Y + BRICK_H;
const STRUCTURE_LAYER0_Y = BASEPLATE_TOP_Y + HALF_H + 0.001;

const DEFAULT_MEANING_BY_REGION: Record<RegionId, string> = {
  market:
    "Market height combines cash markets and derivatives in one pillar. Dark green shows cash layers and light green shows derivatives leverage.",
  state:
    "State height reflects fiscal and institutional capacity. Transfers from upper state layers represent redirected public capture back to common foundations.",
  community:
    "Community is intentionally wide and load-bearing: households, co-ops, and trust networks distribute value horizontally. It now accumulates reclaimed bricks.",
  crony_bridge:
    "The bridge exists only near the top, not at the public foundation. Highlighted connectors show the elite-level coupling point where capture flows through.",
};
const REGION_IDS: RegionId[] = ["market", "state", "community", "crony_bridge"];

export class IovTopologyScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly baseplateGroup = new THREE.Group();
  private readonly structureGroup = new THREE.Group();
  private readonly fxGroup = new THREE.Group();

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private hasPointer = false;

  private readonly regions = new Map<RegionId, RegionRuntime>();
  private hoveredRegionId: RegionId | null = null;
  private selectedRegionId: RegionId = "community";

  private readonly brickGeometry = new THREE.BoxGeometry(BRICK_W, BRICK_H, BRICK_D);
  private readonly edgeGeometry = new THREE.EdgesGeometry(this.brickGeometry);
  private readonly studGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 12);

  private readonly hoverOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BRICK_W + 0.12, BRICK_H + 0.12, BRICK_D + 0.12)),
    new THREE.LineBasicMaterial({
      color: "#f2a900",
      transparent: true,
      opacity: 0.95,
    })
  );
  private readonly hoverFill = new THREE.Mesh(
    new THREE.BoxGeometry(BRICK_W + 0.05, BRICK_H + 0.05, BRICK_D + 0.05),
    new THREE.MeshLambertMaterial({
      color: "#fff7d8",
      emissive: "#fff0b8",
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
  );
  private readonly selectedOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BRICK_W + 0.16, BRICK_H + 0.16, BRICK_D + 0.16)),
    new THREE.LineBasicMaterial({
      color: "#84d4ff",
      transparent: true,
      opacity: 0.95,
    })
  );
  private readonly slotMarkers = new THREE.Group();
  private readonly slotHoverMarker = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(BRICK_W + 0.08, BRICK_H + 0.04, BRICK_D + 0.08)
    ),
    new THREE.LineBasicMaterial({
      color: "#77c48b",
      transparent: true,
      opacity: 0.72,
    })
  );

  private derivativesMist: THREE.Points | null = null;
  private derivativesMistOn = true;

  private communityErosionOn = false;
  private erosionRatio = 0;
  private readonly erodedCommunityIndexes = new Set<number>();
  private readonly transferredBricks: BrickInstance[] = [];
  private communityBaseTopY = HALF_H;

  private readonly cronyMarkers = new THREE.Group();
  private readonly bridgeSupports = new THREE.Group();
  private readonly marketSplitGuide = new THREE.Group();
  private bridgeTopY = 10;
  private bridgeStartY = 10;
  private bridgeEndY = 10;
  private marketDerivativeStartY: number | null = null;

  private activeTransfer: ActiveTransfer | null = null;
  private readonly landingPulses: LandingPulse[] = [];
  private readonly communitySlots: THREE.Vector3[] = [];
  private slotHoverIndex: number | null = null;
  private values: IovValues = DEFAULT_IOV_VALUES;

  private elapsed = 0;
  private readonly regionReveal: Record<RegionId, number> = {
    market: 0,
    state: 0,
    community: 0,
    crony_bridge: 0,
  };
  private readonly regionRevealTarget: Record<RegionId, number> = {
    market: 0,
    state: 0,
    community: 0,
    crony_bridge: 0,
  };

  constructor(
    private readonly domElement: HTMLElement,
    private readonly data: IovTopologyData,
    private readonly callbacks: IovSceneCallbacks = {}
  ) {
    this.scene.add(this.root);
    this.root.add(this.baseplateGroup, this.structureGroup, this.fxGroup);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 48;
    this.controls.minPolarAngle = 0.4;
    this.controls.maxPolarAngle = 1.32;
    this.controls.minAzimuthAngle = -1.28;
    this.controls.maxAzimuthAngle = 1.28;

    this.setupSceneLook();
    this.buildSharedBaseplate();
    this.buildRegions();
    this.buildCommunitySlots();
    this.buildBridgeSupports();
    this.buildMarketSplitGuide();
    this.buildCronyMarkers();
    this.buildDerivativesMist();
    this.resetBuildPhases();

    this.hoverOutline.visible = false;
    this.hoverOutline.renderOrder = 50;
    this.hoverFill.visible = false;
    this.hoverFill.renderOrder = 49;
    this.selectedOutline.visible = false;
    this.selectedOutline.renderOrder = 51;
    this.slotHoverMarker.visible = false;
    this.slotHoverMarker.renderOrder = 48;
    this.fxGroup.add(this.hoverFill, this.hoverOutline, this.selectedOutline, this.slotHoverMarker);

    this.camera.position.set(0, 15, 35);
    this.controls.target.set(0, 6, 0);
    this.controls.update();

    this.applySelection(this.selectedRegionId);
    this.callbacks.onSelectChange?.(this.selectedRegionId);
  }

  setValues(nextValues: IovValues) {
    this.values = nextValues;
    this.rebuildTopologyFromValues();
  }

  getMeaningForRegion(regionId: RegionId) {
    return DEFAULT_MEANING_BY_REGION[regionId];
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setPointerFromCanvas(x: number, y: number, width: number, height: number) {
    this.pointerNdc.x = (x / width) * 2 - 1;
    this.pointerNdc.y = -(y / height) * 2 + 1;
    this.hasPointer = true;
    this.updateHoverRegion();
  }

  clearPointer() {
    this.hasPointer = false;
    this.hoverOutline.visible = false;
    this.hoverFill.visible = false;
    this.slotHoverMarker.visible = false;
    this.slotHoverIndex = null;
    if (this.hoveredRegionId) {
      this.hoveredRegionId = null;
      this.callbacks.onHoverChange?.(null);
    }
  }

  selectFromPointer() {
    if (!this.hasPointer || this.activeTransfer) return;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersections = this.raycaster.intersectObjects(this.getInteractiveMeshes(), false);
    const first = intersections[0];
    if (!first) return;

    const mesh = first.object as THREE.InstancedMesh;
    const regionId = mesh.userData.regionId as RegionId;
    const instanceId = first.instanceId ?? -1;
    this.setSelectionMarker(mesh, instanceId);

    if (this.startTransferAnimation(regionId, instanceId)) {
      this.selectRegion("community");
      return;
    }

    this.selectRegion(regionId);
  }

  selectRegion(regionId: RegionId) {
    this.applySelection(regionId);
    this.callbacks.onSelectChange?.(regionId);
  }

  triggerFormation(regionId: RegionId) {
    this.regionRevealTarget[regionId] = 1;
    if (regionId === "crony_bridge") {
      // Bridge semantics depend on top caps, so ensure towers/community are present first.
      this.regionRevealTarget.market = 1;
      this.regionRevealTarget.state = 1;
      this.regionRevealTarget.community = 1;
    }
    this.selectRegion(regionId);
  }

  setToggle(toggleId: ToggleId, enabled: boolean) {
    if (toggleId === "derivativesMist") {
      this.derivativesMistOn = enabled;
      if (this.derivativesMist) this.derivativesMist.visible = enabled;
      return;
    }

    if (toggleId === "communityErosion") {
      this.communityErosionOn = enabled;
      if (enabled) {
        this.erosionRatio = 0.2 + Math.random() * 0.2;
        this.seedErosionMask();
      } else {
        this.erodedCommunityIndexes.clear();
      }
      this.rebuildCommunityRegion();
    }
  }

  update(deltaSeconds: number) {
    this.elapsed += deltaSeconds;

    this.controls.update();

    if (this.hasPointer) this.updateHoverRegion();

    this.updateSelectionGlow();
    this.updateMist(deltaSeconds);
    this.updateInstabilityAnimation();
    this.updateCronyMarkers();
    this.updateTransferAnimation(deltaSeconds);
    this.updateLandingPulses(deltaSeconds);
    this.updateSlotMarkers();
    this.updateBuildPhases(deltaSeconds);
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.brickGeometry.dispose();
    this.edgeGeometry.dispose();
    this.studGeometry.dispose();

    this.regions.forEach((runtime) => {
      runtime.mesh.geometry.dispose();
      runtime.material.dispose();
      runtime.studs?.geometry.dispose();
      (runtime.studs?.material as THREE.Material | undefined)?.dispose();
      this.disposeEdgeGroup(runtime.edgeGroup);
      this.structureGroup.remove(runtime.mesh, runtime.edgeGroup);
      if (runtime.studs) this.structureGroup.remove(runtime.studs);
    });
    this.regions.clear();

    this.structureGroup.remove(this.cronyMarkers, this.bridgeSupports, this.marketSplitGuide);
    this.fxGroup.remove(this.slotMarkers);
    this.slotMarkers.children.forEach((child) => {
      const line = child as THREE.LineSegments;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.slotMarkers.clear();

    if (this.derivativesMist) {
      this.fxGroup.remove(this.derivativesMist);
      this.derivativesMist.geometry.dispose();
      (this.derivativesMist.material as THREE.PointsMaterial).dispose();
      this.derivativesMist = null;
    }

    if (this.activeTransfer) {
      this.fxGroup.remove(this.activeTransfer.mesh);
      this.activeTransfer.mesh.geometry.dispose();
      (this.activeTransfer.mesh.material as THREE.Material).dispose();
      this.activeTransfer = null;
    }

    this.landingPulses.forEach((pulse) => {
      this.fxGroup.remove(pulse.mesh);
      pulse.mesh.geometry.dispose();
      (pulse.mesh.material as THREE.Material).dispose();
    });
    this.landingPulses.length = 0;

    this.fxGroup.remove(
      this.hoverFill,
      this.hoverOutline,
      this.selectedOutline,
      this.slotHoverMarker
    );
  }

  private rebuildTopologyFromValues() {
    this.disposeRegionObjects();
    this.regions.clear();
    this.bridgeSupports.clear();
    this.marketSplitGuide.clear();
    this.cronyMarkers.clear();
    this.communitySlots.length = 0;
    this.transferredBricks.length = 0;
    this.slotHoverMarker.visible = false;

    if (this.derivativesMist) {
      this.fxGroup.remove(this.derivativesMist);
      this.derivativesMist.geometry.dispose();
      (this.derivativesMist.material as THREE.PointsMaterial).dispose();
      this.derivativesMist = null;
    }

    this.buildRegions();
    this.buildCommunitySlots();
    this.buildBridgeSupports();
    this.buildMarketSplitGuide();
    this.buildCronyMarkers();
    this.buildDerivativesMist();
    this.resetBuildPhases();
    this.applySelection(this.selectedRegionId);
    this.callbacks.onTransferCountChange?.(0);
  }

  private disposeRegionObjects() {
    this.regions.forEach((runtime) => {
      runtime.mesh.geometry.dispose();
      runtime.material.dispose();
      runtime.studs?.geometry.dispose();
      (runtime.studs?.material as THREE.Material | undefined)?.dispose();
      this.disposeEdgeGroup(runtime.edgeGroup);
      this.structureGroup.remove(runtime.mesh, runtime.edgeGroup);
      if (runtime.studs) this.structureGroup.remove(runtime.studs);
    });
  }

  private resetBuildPhases() {
    if (!IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild) {
      REGION_IDS.forEach((regionId) => {
        this.regionReveal[regionId] = 1;
        this.regionRevealTarget[regionId] = 1;
        this.setRegionReveal(regionId, 1);
      });
      this.setBridgeDecorReveal(1);
      return;
    }

    REGION_IDS.forEach((regionId) => {
      this.regionReveal[regionId] = 0;
      this.regionRevealTarget[regionId] = 0;
      this.setRegionReveal(regionId, 0);
    });
    this.setBridgeDecorReveal(0);
  }

  private updateBuildPhases(deltaSeconds: number) {
    if (!IOV_TOPOLOGY_CONFIG.animation.enableStagedBuild) return;
    const revealSpeed = 1 - Math.exp(-6 * deltaSeconds);
    REGION_IDS.forEach((regionId) => {
      const current = this.regionReveal[regionId];
      const target = this.regionRevealTarget[regionId];
      const next = THREE.MathUtils.lerp(current, target, revealSpeed);
      this.regionReveal[regionId] = Math.abs(next - target) < 0.002 ? target : next;
      this.setRegionReveal(regionId, this.regionReveal[regionId]);
    });
    this.setBridgeDecorReveal(this.regionReveal.crony_bridge);
  }

  private setRegionReveal(regionId: RegionId, reveal: number) {
    const runtime = this.regions.get(regionId);
    if (!runtime) return;

    const visible = reveal > 0.01;
    runtime.mesh.visible = visible;
    runtime.edgeGroup.visible = visible;
    if (runtime.studs) runtime.studs.visible = visible;

    const yScale = Math.max(0.001, reveal);
    runtime.mesh.scale.y = yScale;
    runtime.edgeGroup.scale.y = yScale;
    if (runtime.studs) runtime.studs.scale.y = yScale;

    if (regionId === "market") {
      if (this.derivativesMist) {
        this.derivativesMist.visible = visible && this.derivativesMistOn;
      }
      this.marketSplitGuide.visible = visible && reveal > 0.98;
    }

    if (regionId === "community") {
      this.slotMarkers.visible = visible;
      if (!visible) {
        this.slotHoverMarker.visible = false;
        this.slotHoverIndex = null;
      }
    }
  }

  private setBridgeDecorReveal(reveal: number) {
    const visible = reveal > 0.01;
    this.bridgeSupports.visible = visible;
    this.cronyMarkers.visible = visible;
    const yScale = Math.max(0.001, reveal);
    this.bridgeSupports.scale.y = yScale;
    this.cronyMarkers.scale.y = yScale;
  }

  private setupSceneLook() {
    this.scene.background = new THREE.Color("#f7f9fd");
    this.scene.fog = new THREE.Fog("#eef3fb", 58, 108);

    const ambient = new THREE.AmbientLight("#f2f6ff", 1.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight("#ffffff", "#d7e2f2", 0.92);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight("#ffffff", 1.25);
    key.position.set(-10, 22, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 100;
    key.shadow.camera.left = -35;
    key.shadow.camera.right = 35;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -24;
    key.shadow.bias = 0.00035;
    key.shadow.normalBias = 0.04;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#b9d7ff", 0.44);
    fill.position.set(20, 10, -8);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight("#c9dcf3", 0.3);
    rim.position.set(0, 14, -18);
    this.scene.add(rim);

    // Front fill keeps region palettes readable from default camera angle.
    const front = new THREE.DirectionalLight("#ffffff", 1.15);
    front.position.set(0, 10, 24);
    this.scene.add(front);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 130),
      new THREE.MeshStandardMaterial({
        color: "#dbe6f3",
        roughness: 0.96,
        metalness: 0.01,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private buildSharedBaseplate() {
    const plateW = 30;
    const plateD = 12;
    const count = plateW * plateD;

    const mat = new THREE.MeshStandardMaterial({
      color: "#b9cadf",
      roughness: 0.84,
      metalness: 0.04,
    });
    const plate = new THREE.InstancedMesh(this.brickGeometry, mat, count);
    plate.castShadow = true;
    plate.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    let i = 0;
    for (let x = 0; x < plateW; x += 1) {
      for (let z = 0; z < plateD; z += 1) {
        matrix.makeTranslation(
          (x - (plateW - 1) * 0.5) * STEP_XZ,
          GROUND_Y + HALF_H,
          (z - (plateD - 1) * 0.5) * STEP_XZ
        );
        plate.setMatrixAt(i, matrix);
        i += 1;
      }
    }
    plate.instanceMatrix.needsUpdate = true;

    this.baseplateGroup.add(plate);
  }

  private buildRegions() {
    for (const config of this.data.regions) {
      const bricks = this.generateRegionBricks(config);
      const runtime = this.createRuntime(config, bricks);
      this.regions.set(config.id, runtime);

      this.structureGroup.add(runtime.mesh, runtime.edgeGroup);
      if (runtime.studs) this.structureGroup.add(runtime.studs);

      if (config.id === "community") {
        this.communityBaseTopY = runtime.topY;
      }
    }
  }

  private buildCommunitySlots() {
    const community = this.regions.get("community");
    if (!community) return;

    this.communitySlots.length = 0;
    this.slotMarkers.children.forEach((child) => {
      const line = child as THREE.LineSegments;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.slotMarkers.clear();

    const cols = IOV_TOPOLOGY_CONFIG.community.slotCols;
    const rows = IOV_TOPOLOGY_CONFIG.community.slotRows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const slot = new THREE.Vector3(
          COMMUNITY_X - 2.4 + col * STEP_XZ,
          this.communityBaseTopY + STEP_Y,
          TOPOLOGY_Z - 1.1 + row * STEP_XZ
        );
        this.communitySlots.push(slot);

        if (!IOV_TOPOLOGY_CONFIG.render.enableSlotGuides) continue;

        const marker = new THREE.LineSegments(
          new THREE.EdgesGeometry(
            new THREE.BoxGeometry(BRICK_W + 0.04, BRICK_H + 0.02, BRICK_D + 0.04)
          ),
          new THREE.LineBasicMaterial({
            color: "#8fbc8f",
            transparent: true,
            opacity: 0.2,
          })
        );
        marker.position.copy(slot);
        marker.renderOrder = 28;
        this.slotMarkers.add(marker);
      }
    }

    this.fxGroup.add(this.slotMarkers);
  }

  private createRuntime(config: IovRegionConfig, bricks: BrickInstance[]): RegionRuntime {
    const { mesh, material, accentColor } = this.createRegionMesh(config, bricks);
    const edgeGroup = this.createRegionEdges(config, bricks);
    const studs = this.createRegionStuds(config, bricks);
    const { center, topY } = this.computeBrickBounds(bricks, config);

    return {
      config,
      mesh,
      material,
      edgeGroup,
      studs,
      baseBricks: bricks.map((brick) => ({
        position: brick.position.clone(),
        color: brick.color.clone(),
        isTopLayer: brick.isTopLayer,
        isTopCap: brick.isTopCap,
      })),
      currentBricks: bricks.map((brick) => ({
        position: brick.position.clone(),
        color: brick.color.clone(),
        isTopLayer: brick.isTopLayer,
        isTopCap: brick.isTopCap,
      })),
      center,
      topY,
      topCapCenter: this.computeTopCapCenter(bricks, center),
      accentColor,
    };
  }

  // Shared world coordinate system and anchors:
  // Market, Community, and State all use absolute world coordinates on one baseplate,
  // where GROUND_Y + HALF_H is the first brick layer center. Bridge anchors are derived
  // from Market/State top layers so the bridge originates from elite top zones.
  private getRegionCenter(config: IovRegionConfig) {
    if (config.id === "market") return new THREE.Vector3(MARKET_X, 0, TOPOLOGY_Z);
    if (config.id === "state") return new THREE.Vector3(STATE_X, 0, TOPOLOGY_Z);
    if (config.id === "community") return new THREE.Vector3(COMMUNITY_X, 0, TOPOLOGY_Z);
    return new THREE.Vector3(0, 0, TOPOLOGY_Z);
  }

  private resolveTotals() {
    const marketCashFallback =
      (toPositive(this.values.market.cash_equities) ?? 0) +
      (toPositive(this.values.market.bonds) ?? 0);
    const marketCash =
      toPositive(this.values.market.total) ??
      (marketCashFallback > 0 ? marketCashFallback : null);
    const marketDerivatives = toPositive(this.values.market.derivatives_notional);
    const marketComposite =
      marketCash !== null && marketDerivatives !== null
        ? marketCash + marketDerivatives
        : marketCash;
    const communityFallback =
      (toPositive(this.values.community.nonprofit_sector_estimate) ?? 0) +
      (toPositive(this.values.community.coops_mutuals_estimate) ?? 0) +
      (toPositive(this.values.community.household_unpaid_estimate) ?? 0);

    return {
      market: marketComposite,
      marketCash,
      marketDerivatives,
      state:
        toPositive(this.values.state.total) ??
        toPositive(this.values.state.global_gdp) ??
        null,
      community:
        toPositive(this.values.community.total) ??
        (communityFallback > 0 ? communityFallback : null),
    };
  }

  private mapValueToLayers(value: number | null, fallback: number, extraScale = 1) {
    if (value === null) return fallback;
    const raw =
      IOV_TOPOLOGY_CONFIG.pillars.logScaleMultiplier *
      Math.log10(value + 1) *
      extraScale *
      IOV_SCALE_CONFIG.brickHeight;
    return Math.min(
      IOV_TOPOLOGY_CONFIG.pillars.maxHeightLayers,
      Math.max(IOV_TOPOLOGY_CONFIG.pillars.minHeightLayers, Math.round(raw))
    );
  }

  private generateRegionBricks(config: IovRegionConfig) {
    const identityColor = new THREE.Color(getIdentityColor(config.id));
    const random = createSeededRandom(hashString(config.id));
    const center = this.getRegionCenter(config);
    const totals = this.resolveTotals();

    const bricks: BrickInstance[] = [];
    const addBrick = (
      position: THREE.Vector3,
      isTopLayer: boolean,
      isTopCap: boolean,
      forcedColor?: THREE.Color,
      segment?: "cash" | "derivatives"
    ) => {
      const color = (forcedColor ?? identityColor).clone();
      ensureMinLightness(color, 0.58);
      // Keep exact region color identity; no per-brick hue/lightness drift.
      bricks.push({ position, color, isTopLayer, isTopCap, segment });
    };

    if (config.shape.type === "tower") {
      const total = config.id === "market" ? totals.market : totals.state;
      const scaledLayers = this.mapValueToLayers(
        total,
        config.shape.height,
        config.id === "market"
          ? IOV_TOPOLOGY_CONFIG.pillars.marketHeightScale
          : IOV_TOPOLOGY_CONFIG.pillars.stateHeightScale
      );
      const stateRegion = this.data.regions.find((region) => region.id === "state");
      const stateBaseHeight =
        stateRegion?.shape.type === "tower" ? stateRegion.shape.height : 12;
      const stateScaledLayers = this.mapValueToLayers(
        totals.state,
        stateBaseHeight,
        IOV_TOPOLOGY_CONFIG.pillars.stateHeightScale
      );
      const marketMinVsState = config.id === "market" ? Math.ceil(stateScaledLayers * 1.8) : 0;
      const layerCount = Math.max(config.shape.height, scaledLayers, marketMinVsState);
      const topWidth = Math.max(2, Math.round(config.shape.baseWidth * config.shape.taper));
      const capLayers = Math.max(1, Math.floor(layerCount * 0.01));
      const cashMarketColor = new THREE.Color("#2f5d9b");
      const derivativesMarketColor = new THREE.Color("#78a7e3");
      const derivativeShare =
        config.id === "market" && totals.market && totals.marketDerivatives
          ? THREE.MathUtils.clamp(totals.marketDerivatives / totals.market, 0.08, 0.9)
          : 0;
      const derivativeLayerStart = Math.floor(layerCount * (1 - derivativeShare));
      if (config.id === "market") {
        this.marketDerivativeStartY = STRUCTURE_LAYER0_Y + derivativeLayerStart * STEP_Y;
      }

      for (let layer = 0; layer < layerCount; layer += 1) {
        const t = layerCount <= 1 ? 1 : layer / (layerCount - 1);
        const width = Math.max(topWidth, Math.round(lerp(config.shape.baseWidth, topWidth, t)));
        const isTopLayer = layer === layerCount - 1;
        const isTopCapLayer = layer >= layerCount - capLayers;
        const layerOffset = layer % 2 === 0 ? 0 : STEP_XZ * 0.13;
        const forcedColor =
          config.id === "market"
            ? layer >= derivativeLayerStart
              ? derivativesMarketColor
              : cashMarketColor
            : undefined;

        for (let x = 0; x < width; x += 1) {
          for (let z = 0; z < width; z += 1) {
            addBrick(
              new THREE.Vector3(
                center.x + (x - (width - 1) * 0.5) * STEP_XZ + layerOffset,
                STRUCTURE_LAYER0_Y + layer * STEP_Y,
                center.z + (z - (width - 1) * 0.5) * STEP_XZ - layerOffset
              ),
              isTopLayer,
              isTopCapLayer,
              forcedColor,
              config.id === "market" && layer >= derivativeLayerStart ? "derivatives" : "cash"
            );
          }
        }
      }

      return bricks;
    }

    if (config.shape.type === "base") {
      // Community is a low connector base running between Market and State.
      const width = IOV_TOPOLOGY_CONFIG.community.width;
      const depth = IOV_TOPOLOGY_CONFIG.community.depth;
      const height = Math.max(
        IOV_TOPOLOGY_CONFIG.community.height,
        Math.min(
          3,
          this.mapValueToLayers(totals.community, IOV_TOPOLOGY_CONFIG.community.height, 0.35)
        )
      );

      for (let y = 0; y < height; y += 1) {
        const isTopLayer = y === height - 1;
        for (let x = 0; x < width; x += 1) {
          for (let z = 0; z < depth; z += 1) {
            if (isTopLayer && random() < 0.05) continue;

            addBrick(
              new THREE.Vector3(
                center.x + (x - (width - 1) * 0.5) * STEP_XZ,
                STRUCTURE_LAYER0_Y + y * STEP_Y,
                center.z + (z - (depth - 1) * 0.5) * STEP_XZ
              ),
              isTopLayer,
              false
            );
          }
        }
      }

      // Add a small center mound inside the connector base.
      const coreWidth = IOV_TOPOLOGY_CONFIG.community.coreWidth;
      const coreDepth = IOV_TOPOLOGY_CONFIG.community.coreDepth;
      const coreHeight = IOV_TOPOLOGY_CONFIG.community.coreHeight;
      for (let y = 0; y < coreHeight; y += 1) {
        const isTopLayer = y === coreHeight - 1;
        for (let x = 0; x < coreWidth; x += 1) {
          for (let z = 0; z < coreDepth; z += 1) {
            addBrick(
              new THREE.Vector3(
                center.x + (x - (coreWidth - 1) * 0.5) * STEP_XZ,
                STRUCTURE_LAYER0_Y + height * STEP_Y + y * STEP_Y,
                center.z + (z - (coreDepth - 1) * 0.5) * STEP_XZ
              ),
              isTopLayer,
              false
            );
          }
        }
      }

      return bricks;
    }

    const marketTop = this.regions.get("market")?.topCapCenter.y ?? this.regions.get("market")?.topY ?? STRUCTURE_LAYER0_Y + 16 * STEP_Y;
    const stateTop = this.regions.get("state")?.topCapCenter.y ?? this.regions.get("state")?.topY ?? STRUCTURE_LAYER0_Y + 8 * STEP_Y;
    const topBandOffset = STEP_Y * (1 - IOV_TOPOLOGY_CONFIG.bridge.topAnchorPercent);
    const startY = marketTop - topBandOffset;
    const endY = stateTop - topBandOffset;
    this.bridgeStartY = startY;
    this.bridgeEndY = endY;
    this.bridgeTopY = Math.max(startY, endY);

    for (let y = 0; y < IOV_TOPOLOGY_CONFIG.bridge.thickness; y += 1) {
      for (let x = 0; x < config.shape.length; x += 1) {
        const t = config.shape.length <= 1 ? 1 : x / (config.shape.length - 1);
        const arch = Math.sin(t * Math.PI) * STEP_Y * IOV_TOPOLOGY_CONFIG.bridge.sagAmplitude;
        const layerBaseY = lerp(startY, endY, t) + arch;
        for (let z = 0; z < 2; z += 1) {
          addBrick(
            new THREE.Vector3(
              center.x + (x - (config.shape.length - 1) * 0.5) * STEP_XZ,
              layerBaseY + y * STEP_Y,
              center.z + (z - 0.5) * STEP_XZ * 0.64
            ),
            true,
            true
          );
        }
      }
    }

    return bricks;
  }

  private createRegionMesh(config: IovRegionConfig, bricks: BrickInstance[]) {
    const identityColor = getIdentityColor(config.id);
    const accentColor = new THREE.Color(identityColor ?? config.palette[0] ?? "#9fb0d3");

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      color: "#ffffff",
    });

    const mesh = new THREE.InstancedMesh(this.brickGeometry, material, bricks.length);
    mesh.userData.regionId = config.id;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    // Avoid heavy self-shadow crush across dense stacked instances.
    mesh.receiveShadow = false;

    const matrix = new THREE.Matrix4();
    bricks.forEach((brick, i) => {
      matrix.makeTranslation(brick.position.x, brick.position.y, brick.position.z);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, brick.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    return { mesh, material, accentColor };
  }

  // Per-region subtle wireframe overlay for edge readability.
  private createRegionEdges(config: IovRegionConfig, bricks: BrickInstance[]) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
      color: "#f5f8ff",
      transparent: true,
      opacity: config.id === "crony_bridge" ? 0.3 : 0.24,
    });
    const topCapMaterial = new THREE.LineBasicMaterial({
      color: "#ffd66b",
      transparent: true,
      opacity: 0.65,
    });

    bricks.forEach((brick) => {
      const lines = new THREE.LineSegments(
        this.edgeGeometry,
        brick.isTopCap ? topCapMaterial : material
      );
      lines.position.copy(brick.position);
      lines.renderOrder = 14;
      group.add(lines);
    });

    group.userData.sharedMaterials = [material, topCapMaterial];
    return group;
  }

  private disposeEdgeGroup(group: THREE.Group) {
    const shared = group.userData.sharedMaterials as THREE.Material[] | undefined;
    shared?.forEach((mat) => mat.dispose());
    group.clear();
  }

  private computeTopCapCenter(bricks: BrickInstance[], fallback: THREE.Vector3) {
    const topCapBricks = bricks.filter((brick) => brick.isTopCap);
    if (!topCapBricks.length) return fallback.clone();
    const center = new THREE.Vector3();
    topCapBricks.forEach((brick) => center.add(brick.position));
    center.multiplyScalar(1 / topCapBricks.length);
    return center;
  }

  // Stud placement: tower top layers and sampled community top layer (20%).
  private createRegionStuds(config: IovRegionConfig, bricks: BrickInstance[]) {
    let studTargets: BrickInstance[] = [];

    if (config.shape.type === "tower") {
      studTargets = bricks.filter((brick) => brick.isTopLayer);
    } else if (config.id === "community") {
      const random = createSeededRandom(hashString("studs-community"));
      studTargets = bricks.filter((brick) => brick.isTopLayer && random() < 0.2);
    }

    if (!studTargets.length) return null;

    const studMaterial = new THREE.MeshBasicMaterial({
      color: config.palette[0] ?? "#9db4d8",
    });

    const studs = new THREE.InstancedMesh(this.studGeometry, studMaterial, studTargets.length);
    studs.castShadow = true;
    studs.receiveShadow = false;

    const matrix = new THREE.Matrix4();
    studTargets.forEach((brick, i) => {
      matrix.makeTranslation(brick.position.x, brick.position.y + HALF_H + 0.04, brick.position.z);
      studs.setMatrixAt(i, matrix);
    });

    studs.instanceMatrix.needsUpdate = true;
    return studs;
  }

  private buildBridgeSupports() {
    const market = this.regions.get("market");
    const state = this.regions.get("state");
    if (!market || !state) return;

    const supportMat = new THREE.MeshStandardMaterial({
      color: "#a8b6c6",
      roughness: 0.5,
      metalness: 0.1,
    });
    const supportGeo = new THREE.BoxGeometry(0.3, 1, 0.3);

    const addSupport = (x: number, z: number, targetY: number) => {
      const h = Math.max(1, targetY - STRUCTURE_LAYER0_Y);
      const mesh = new THREE.Mesh(supportGeo, supportMat.clone());
      mesh.scale.y = h;
      mesh.position.set(x, STRUCTURE_LAYER0_Y + h * 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.bridgeSupports.add(mesh);
    };

    addSupport(market.center.x + 1.2, TOPOLOGY_Z, this.bridgeStartY);
    addSupport(state.center.x - 1.2, TOPOLOGY_Z, this.bridgeEndY);

    this.structureGroup.add(this.bridgeSupports);
  }

  private buildMarketSplitGuide() {
    this.marketSplitGuide.clear();
    const market = this.regions.get("market");
    if (!market || this.marketDerivativeStartY === null) return;

    const marketShape = market.config.shape.type === "tower" ? market.config.shape : null;
    const span = (marketShape?.baseWidth ?? 6) * STEP_XZ * 0.9;
    const splitY = this.marketDerivativeStartY - STEP_Y * 0.5;

    const band = new THREE.Mesh(
      new THREE.BoxGeometry(span, STEP_Y * 0.22, span),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
      })
    );
    band.position.set(market.center.x, splitY, market.center.z);
    band.renderOrder = 20;
    band.userData.role = "market-split-band";
    this.marketSplitGuide.add(band);
    this.structureGroup.add(this.marketSplitGuide);
  }

  private buildCronyMarkers() {
    const market = this.regions.get("market");
    const state = this.regions.get("state");
    if (!market || !state) return;

    const markerMat = new THREE.MeshLambertMaterial({
      color: "#cb6a45",
      emissive: "#cf734d",
      emissiveIntensity: 0.36,
    });

    const ringGeo = new THREE.TorusGeometry(0.42, 0.08, 12, 24);

    const left = new THREE.Mesh(ringGeo, markerMat);
    left.position.set(market.center.x + 1.2, this.bridgeStartY, TOPOLOGY_Z);
    left.rotation.x = Math.PI / 2;

    const right = new THREE.Mesh(ringGeo, markerMat.clone());
    right.position.set(state.center.x - 1.2, this.bridgeEndY, TOPOLOGY_Z);
    right.rotation.x = Math.PI / 2;

    this.cronyMarkers.clear();
    this.cronyMarkers.add(left, right);
    this.structureGroup.add(this.cronyMarkers);
  }

  private buildDerivativesMist() {
    if (!IOV_TOPOLOGY_CONFIG.render.enableDerivativesMist) return;
    const derivatives = toPositive(this.values.market.derivatives_notional);
    if (!derivatives || derivatives <= 0) return;

    const market = this.regions.get("market");
    if (!market) return;

    const count = Math.min(240, 70 + Math.round(Math.log10(derivatives + 1) * 80));
    const positions = new Float32Array(count * 3);
    const random = createSeededRandom(9911);
    const baseY = market.topY + 1.1;

    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 0.45 + random() * 1.5;
      const height = (random() - 0.5) * 0.7;
      positions[i * 3] = market.center.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = baseY + height;
      positions[i * 3 + 2] = market.center.z + Math.sin(angle) * radius;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: "#87a8d6",
      size: 0.17,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.derivativesMist = new THREE.Points(geo, mat);
    this.derivativesMist.visible = this.derivativesMistOn;
    this.fxGroup.add(this.derivativesMist);
  }

  private computeBrickBounds(bricks: BrickInstance[], config: IovRegionConfig) {
    if (!bricks.length) {
      const c = this.getRegionCenter(config);
      return {
        center: new THREE.Vector3(c.x, STRUCTURE_LAYER0_Y, c.z),
        topY: STRUCTURE_LAYER0_Y,
      };
    }

    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    bricks.forEach((brick) => {
      min.min(brick.position);
      max.max(brick.position);
    });

    return {
      center: min.clone().add(max).multiplyScalar(0.5),
      topY: max.y,
    };
  }

  private rebuildCommunityRegion() {
    const runtime = this.regions.get("community");
    if (!runtime) return;

    const filteredBase = this.communityErosionOn
      ? runtime.baseBricks.filter((_brick, idx) => !this.erodedCommunityIndexes.has(idx))
      : runtime.baseBricks;

    const nextBricks = [
      ...filteredBase.map((brick) => ({
        position: brick.position.clone(),
        color: brick.color.clone(),
        isTopLayer: brick.isTopLayer,
        isTopCap: false,
      })),
      ...this.transferredBricks.map((brick) => ({
        position: brick.position.clone(),
        color: brick.color.clone(),
        isTopLayer: true,
        isTopCap: false,
      })),
    ];

    this.rebuildRegionWithBricks(runtime, nextBricks);
    this.buildCommunitySlots();
  }

  private rebuildRegionWithBricks(runtime: RegionRuntime, bricks: BrickInstance[]) {
    this.structureGroup.remove(runtime.mesh, runtime.edgeGroup);
    if (runtime.studs) this.structureGroup.remove(runtime.studs);

    runtime.mesh.geometry.dispose();
    runtime.material.dispose();
    this.disposeEdgeGroup(runtime.edgeGroup);
    if (runtime.studs) {
      runtime.studs.geometry.dispose();
      (runtime.studs.material as THREE.Material).dispose();
    }

    const rebuilt = this.createRuntime(runtime.config, bricks);

    runtime.mesh = rebuilt.mesh;
    runtime.material = rebuilt.material;
    runtime.edgeGroup = rebuilt.edgeGroup;
    runtime.studs = rebuilt.studs;
    runtime.currentBricks = bricks;
    runtime.center = rebuilt.center;
    runtime.topY = rebuilt.topY;
    runtime.topCapCenter = rebuilt.topCapCenter;
    runtime.accentColor = rebuilt.accentColor;

    this.structureGroup.add(runtime.mesh, runtime.edgeGroup);
    if (runtime.studs) this.structureGroup.add(runtime.studs);

    this.applySelection(this.selectedRegionId);
  }

  private updateHoverRegion() {
    if (!this.hasPointer) return;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersections = this.raycaster.intersectObjects(this.getInteractiveMeshes(), false);
    const first = intersections[0];

    const nextHover = first
      ? ((first.object as THREE.InstancedMesh).userData.regionId as RegionId)
      : null;

    if (nextHover !== this.hoveredRegionId) {
      this.hoveredRegionId = nextHover;
      this.callbacks.onHoverChange?.(nextHover);
    }

    const instanceId = first?.instanceId ?? -1;
    if (!first || instanceId < 0) {
      this.hoverOutline.visible = false;
      this.hoverFill.visible = false;
      this.slotHoverMarker.visible = false;
      this.slotHoverIndex = null;
      return;
    }

    const mesh = first.object as THREE.InstancedMesh;
    const { position, rotation } = this.getInstanceTransform(mesh, instanceId);

    this.hoverOutline.visible = true;
    this.hoverFill.visible = true;
    this.hoverOutline.position.copy(position);
    this.hoverOutline.quaternion.copy(rotation);
    this.hoverOutline.scale.set(1.02, 1.02, 1.02);
    this.hoverFill.position.copy(position);
    this.hoverFill.quaternion.copy(rotation);
    this.hoverFill.scale.set(1, 1, 1);

    if (nextHover === "community") {
      const slotIndex = this.getNearestOpenSlotIndex(position);
      this.slotHoverIndex = slotIndex;
      if (slotIndex !== null) {
        const slot = this.communitySlots[slotIndex];
        if (slot) {
          this.slotHoverMarker.visible = true;
          this.slotHoverMarker.position.copy(slot);
          this.slotHoverMarker.scale.set(1.02, 1.02, 1.02);
        }
      } else {
        this.slotHoverMarker.visible = false;
      }
    } else {
      this.slotHoverMarker.visible = false;
      this.slotHoverIndex = null;
    }
  }

  private applySelection(regionId: RegionId) {
    this.selectedRegionId = regionId;
  }

  private updateSelectionGlow() {
    // Selection emphasis is handled by outlines to keep base brick colors stable.
  }

  private updateMist(deltaSeconds: number) {
    if (!IOV_TOPOLOGY_CONFIG.render.enableDerivativesMist || !this.derivativesMist) return;

    if (this.derivativesMistOn) {
      this.derivativesMist.visible = true;
      this.derivativesMist.rotation.y += deltaSeconds * 0.01;
      this.derivativesMist.position.y = Math.sin(this.elapsed * 0.24) * 0.04;
    } else {
      this.derivativesMist.visible = false;
    }
  }

  private updateInstabilityAnimation() {
    const market = this.regions.get("market");
    const state = this.regions.get("state");
    if (!market || !state) return;

    if (!this.communityErosionOn) {
      market.mesh.rotation.z = THREE.MathUtils.lerp(market.mesh.rotation.z, 0, 0.08);
      state.mesh.rotation.z = THREE.MathUtils.lerp(state.mesh.rotation.z, 0, 0.08);
      market.edgeGroup.rotation.z = market.mesh.rotation.z;
      state.edgeGroup.rotation.z = state.mesh.rotation.z;
      if (market.studs) market.studs.rotation.z = market.mesh.rotation.z;
      if (state.studs) state.studs.rotation.z = state.mesh.rotation.z;
      return;
    }

    const a = Math.sin(this.elapsed * 1.4) * 0.018;
    const b = Math.sin(this.elapsed * 1.8 + 1.1) * 0.016;

    market.mesh.rotation.z = a;
    market.edgeGroup.rotation.z = a;
    if (market.studs) market.studs.rotation.z = a;

    state.mesh.rotation.z = b;
    state.edgeGroup.rotation.z = b;
    if (state.studs) state.studs.rotation.z = b;
  }

  private updateCronyMarkers() {
    this.cronyMarkers.children.forEach((child, idx) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshLambertMaterial;
      material.emissiveIntensity = 0.28 + Math.sin(this.elapsed * 1.6 + idx * 0.8) * 0.11;
    });
  }

  private getInteractiveMeshes() {
    return Array.from(this.regions.values()).map((runtime) => runtime.mesh);
  }

  private seedErosionMask() {
    this.erodedCommunityIndexes.clear();
    const community = this.regions.get("community");
    if (!community) return;

    const baseCount = community.baseBricks.length;
    const target = Math.floor(baseCount * this.erosionRatio);
    const random = createSeededRandom(Math.floor(this.elapsed * 1000) + 51);

    while (this.erodedCommunityIndexes.size < target) {
      this.erodedCommunityIndexes.add(Math.floor(random() * baseCount));
    }
  }

  private canTransferBrick(regionId: RegionId, instanceId: number) {
    if (instanceId < 0 || regionId === "community") return false;
    const runtime = this.regions.get(regionId);
    const brick = runtime?.currentBricks[instanceId];
    if (!runtime || !brick) return false;

    const topThreshold = runtime.topY - STEP_Y * 1.25;
    return brick.position.y >= topThreshold;
  }

  private startTransferAnimation(regionId: RegionId, instanceId: number) {
    if (!this.canTransferBrick(regionId, instanceId)) return false;

    const donor = this.regions.get(regionId);
    const brick = donor?.currentBricks[instanceId];
    if (!donor || !brick) return false;

    const start = brick.position.clone();
    const pop = start.clone().add(new THREE.Vector3(0, 0.85, 0.1));
    const end = this.getNextCommunityPlacement();

    // Keep original brick color/material while flying; no palette remapping.
    const moving = new THREE.Mesh(
      this.brickGeometry.clone(),
      new THREE.MeshLambertMaterial({
        color: brick.color,
        emissive: "#101010",
        emissiveIntensity: 0.08,
      })
    );
    moving.position.copy(start);
    moving.castShadow = true;
    this.fxGroup.add(moving);

    const trailCurve = new THREE.QuadraticBezierCurve3(
      start.clone(),
      start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 2.1, 0)),
      end.clone()
    );
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailCurve.getPoints(24));
    const trail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({
        color: "#84c89a",
        transparent: true,
        opacity: 0.35,
      })
    );
    this.fxGroup.add(trail);

    this.activeTransfer = {
      regionId,
      instanceId,
      start,
      pop,
      end,
      color: brick.color.clone(),
      elapsed: 0,
      mesh: moving,
      trail,
    };

    return true;
  }

  private updateTransferAnimation(deltaSeconds: number) {
    if (!this.activeTransfer) return;

    const anim = this.activeTransfer;
    anim.elapsed += deltaSeconds;

    const popDuration = 0.18;
    const flyDuration = 0.58;
    const total = popDuration + flyDuration;

    if (anim.elapsed < popDuration) {
      const t = easeOutCubic(anim.elapsed / popDuration);
      anim.mesh.position.lerpVectors(anim.start, anim.pop, t);
      anim.mesh.rotation.y = t * Math.PI * 0.35;
      anim.mesh.scale.setScalar(1 + t * 0.08);
      return;
    }

    const flyT = Math.min((anim.elapsed - popDuration) / flyDuration, 1);
    const t = easeInOutCubic(flyT);
    anim.mesh.position.lerpVectors(anim.pop, anim.end, t);
    anim.mesh.position.y += Math.sin(t * Math.PI) * 1.15;
    if (flyT > 0.86) {
      // Tiny landing bounce before snap.
      const bt = (flyT - 0.86) / 0.14;
      anim.mesh.position.y += Math.sin(bt * Math.PI * 2) * 0.08 * (1 - bt);
    }
    anim.mesh.rotation.y = Math.PI * 0.35 + t * Math.PI * 1.8;
    anim.mesh.scale.setScalar(1.08 - t * 0.08);

    if (anim.elapsed >= total) {
      const donor = this.regions.get(anim.regionId);
      if (!donor) {
        this.finishTransferAnimation();
        return;
      }

      donor.currentBricks = donor.currentBricks.filter((_item, idx) => idx !== anim.instanceId);
      this.rebuildRegionWithBricks(donor, donor.currentBricks);

      this.transferredBricks.push({
        position: anim.end.clone(),
        color: anim.color.clone(),
        isTopLayer: true,
        isTopCap: false,
      });
      this.rebuildCommunityRegion();
      this.callbacks.onTransferCountChange?.(this.transferredBricks.length);

      this.spawnLandingPulse(anim.end);
      this.playLockClick();
      this.finishTransferAnimation();
    }
  }

  private playLockClick() {
    // Stub hook for optional landing click SFX.
  }

  private finishTransferAnimation() {
    if (!this.activeTransfer) return;
    this.fxGroup.remove(this.activeTransfer.mesh, this.activeTransfer.trail);
    this.activeTransfer.mesh.geometry.dispose();
    (this.activeTransfer.mesh.material as THREE.Material).dispose();
    this.activeTransfer.trail.geometry.dispose();
    (this.activeTransfer.trail.material as THREE.Material).dispose();
    this.activeTransfer = null;
  }

  private spawnLandingPulse(position: THREE.Vector3) {
    const pulse = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(BRICK_W + 0.2, BRICK_H + 0.2, BRICK_D + 0.2)),
      new THREE.LineBasicMaterial({
        color: "#49c76c",
        transparent: true,
        opacity: 0.9,
      })
    );
    pulse.position.copy(position);
    pulse.renderOrder = 60;
    this.fxGroup.add(pulse);

    this.landingPulses.push({
      mesh: pulse,
      elapsed: 0,
      duration: 1,
    });
  }

  private updateLandingPulses(deltaSeconds: number) {
    for (let i = this.landingPulses.length - 1; i >= 0; i -= 1) {
      const pulse = this.landingPulses[i];
      if (!pulse) continue;
      pulse.elapsed += deltaSeconds;

      const t = Math.min(pulse.elapsed / pulse.duration, 1);
      pulse.mesh.scale.setScalar(1 + t * 0.35);
      const mat = pulse.mesh.material as THREE.LineBasicMaterial;
      mat.opacity = 0.9 * (1 - t);

      if (t >= 1) {
        this.fxGroup.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        mat.dispose();
        this.landingPulses.splice(i, 1);
      }
    }
  }

  private updateSlotMarkers() {
    if (!IOV_TOPOLOGY_CONFIG.render.enableSlotGuides) return;

    this.slotMarkers.children.forEach((child, index) => {
      const line = child as THREE.LineSegments;
      const mat = line.material as THREE.LineBasicMaterial;
      const isFilled = index < this.transferredBricks.length;
      mat.opacity = isFilled ? 0.05 : 0.2;
    });
  }

  private setSelectionMarker(mesh: THREE.InstancedMesh, instanceId: number) {
    if (instanceId < 0) return;
    const { position, rotation } = this.getInstanceTransform(mesh, instanceId);
    this.selectedOutline.visible = true;
    this.selectedOutline.position.copy(position);
    this.selectedOutline.quaternion.copy(rotation);
    this.selectedOutline.scale.set(1.04, 1.04, 1.04);
  }

  private getInstanceTransform(mesh: THREE.InstancedMesh, instanceId: number) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(instanceId, matrix);

    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);
    return { position, rotation };
  }

  private getNearestOpenSlotIndex(fromPosition: THREE.Vector3) {
    const openCount = Math.max(this.communitySlots.length - this.transferredBricks.length, 0);
    if (openCount <= 0) return null;

    let bestIndex: number | null = null;
    let bestDistance = Infinity;

    for (let i = this.transferredBricks.length; i < this.communitySlots.length; i += 1) {
      const slot = this.communitySlots[i];
      if (!slot) continue;
      const distance = slot.distanceToSquared(fromPosition);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  // Community placement uses absolute world coordinates on shared baseplate.
  // This avoids floating/misaligned reclaimed bricks caused by mixed local offsets.
  private getNextCommunityPlacement() {
    const index = Math.min(this.transferredBricks.length, this.communitySlots.length - 1);
    const slot = this.communitySlots[index];
    if (slot) {
      return slot.clone();
    }

    return new THREE.Vector3(COMMUNITY_X, this.communityBaseTopY + STEP_Y, TOPOLOGY_Z);
  }
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const getIdentityColor = (regionId: RegionId) => {
  if (regionId === "crony_bridge") return IOV_IDENTITY_COLORS.bridge;
  return IOV_IDENTITY_COLORS[regionId];
};

const ensureMinLightness = (color: THREE.Color, minLightness: number) => {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.max(hsl.l, minLightness));
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const createSeededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
