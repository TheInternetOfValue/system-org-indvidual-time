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
import type { OrgImpactResult, SystemImpactResult } from "./iovImpactEscalation";

export type RegionId = "market" | "state" | "community" | "crony_bridge";
export type ToggleId = "derivativesMist" | "communityErosion";
export type BrickInteractionMode = "inspect" | "reclaim";

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

export interface SelectedBrickInfo {
  regionId: RegionId;
  instanceId: number;
  canTransfer: boolean;
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
  flagPole?: THREE.Mesh;
  flag?: THREE.Mesh;
}

interface IovSceneCallbacks {
  onHoverChange?: (regionId: RegionId | null) => void;
  onSelectChange?: (regionId: RegionId) => void;
  onTransferCountChange?: (count: number) => void;
  onBrickSelectionChange?: (selection: SelectedBrickInfo | null) => void;
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
  startScale: number;
  endScale: number;
  maxOpacity: number;
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
    marketHeightScale: 1.2, // Reduced from 1.6 for better balance
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

interface FallingBrick {
  instanceId: number; // -1 if using direct mesh reference
  regionId: RegionId;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  targetMesh?: THREE.Mesh; 
}

interface SystemImpactPlayback {
  orgImpact: OrgImpactResult;
  communityPillarHeightBefore: number;
  bridgeStressBefore: number;
  bridgeStressThreshold: number;
  empowerSurge?: boolean;
  donorBricks?: SystemImpactDonorBrick[];
  replay?: boolean;
}

interface SystemImpactDonorBrick {
  regionId: "market" | "state";
  sourceIndex: number;
  position: THREE.Vector3;
  color: THREE.Color;
}

interface SystemImpactReplayState {
  context: SystemImpactPlayback;
  donorBricks: SystemImpactDonorBrick[];
}

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
  private selectedBrickInfo: SelectedBrickInfo | null = null;
  private brickInteractionMode: BrickInteractionMode = "inspect";

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
  private readonly bridgeBricks = new THREE.Group();
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
  private isMobileViewport = false;
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

  private isBridgeCollapsed = false;
  private fallingBricks: FallingBrick[] = [];
  private readonly systemImpactPhoton = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 14),
    new THREE.MeshBasicMaterial({
      color: "#ffe07f",
      transparent: true,
      opacity: 0.95,
    })
  );
  private readonly systemImpactPhotonLight = new THREE.PointLight("#ffd166", 0, 6.5);
  private systemImpactActive = false;
  private systemImpactCollapseTriggered = false;
  private systemImpactElapsed = 0;
  private systemImpactCommunityScale = 1;
  private systemImpactCommunityScaleStart = 1;
  private systemImpactCommunityScaleEnd = 1;
  private systemImpactBridgeStressStart = 0;
  private systemImpactBridgeStressEnd = 0;
  private systemImpactBridgeStressThreshold = 1;
  private systemImpactStressThresholdCrossed = false;
  private readonly systemImpactBridgeTarget = new THREE.Vector3();
  private systemImpactBridgeContactY = 0;
  private systemImpactContactReached = false;
  private systemImpactHitPulse = 0;
  private systemImpactCollapseLeadInActive = false;
  private systemImpactCollapseLeadInElapsed = 0;
  private systemImpactOnComplete: ((result: SystemImpactResult) => void) | null = null;
  private systemImpactResult: SystemImpactResult | null = null;
  private lastSystemImpactReplayState: SystemImpactReplayState | null = null;
  private readonly systemImpactBuildGroup = new THREE.Group();
  private readonly systemImpactBuildBricks: Array<{
    mesh: THREE.Mesh;
    startPosition: THREE.Vector3;
    targetPosition: THREE.Vector3;
    revealAt: number;
    flightDuration: number;
    arcHeight: number;
    donorColor: THREE.Color;
    settledColor: THREE.Color;
  }> = [];
  private systemImpactBuiltBrickCount = 0;
  private brickFocusCueActive = false;
  private brickFocusCueElapsed = 0;
  private brickFocusCueDuration = 0;
  private brickFocusCueResolver: (() => void) | null = null;
  private brickFocusCueBaseOpacity = 0.95;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly data: IovTopologyData,
    private readonly callbacks: IovSceneCallbacks = {}
  ) {
    this.scene.add(this.root);
    this.root.add(this.baseplateGroup, this.structureGroup, this.fxGroup);
    this.structureGroup.add(this.systemImpactBuildGroup);

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
    this.systemImpactPhoton.visible = false;
    this.systemImpactPhotonLight.visible = false;
    this.systemImpactPhoton.add(this.systemImpactPhotonLight);
    this.systemImpactPhotonLight.position.set(0, 0.5, 0);
    this.fxGroup.add(this.systemImpactPhoton);

    this.applyOverviewCameraPose(this.isMobileViewport);

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

  getSelectedBrickInfo() {
    return this.selectedBrickInfo;
  }

  getBrickAnchor(regionId: RegionId, instanceId: number) {
    const runtime = this.regions.get(regionId);
    if (!runtime) return null;
    if (instanceId < 0 || instanceId >= runtime.currentBricks.length) return null;

    const matrix = new THREE.Matrix4();
    runtime.mesh.getMatrixAt(instanceId, matrix);
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);
    return position;
  }

  playBrickFocusCue(regionId: RegionId, instanceId: number, durationMs = 180) {
    const runtime = this.regions.get(regionId);
    if (!runtime || instanceId < 0 || instanceId >= runtime.currentBricks.length) {
      return Promise.resolve();
    }

    this.setSelectionMarker(runtime.mesh, instanceId);

    const material = this.selectedOutline.material as THREE.LineBasicMaterial;
    this.brickFocusCueBaseOpacity = material.opacity;
    this.brickFocusCueActive = true;
    this.brickFocusCueElapsed = 0;
    this.brickFocusCueDuration = Math.max(0.08, durationMs / 1000);

    return new Promise<void>((resolve) => {
      this.brickFocusCueResolver = resolve;
    });
  }

  setBrickInteractionMode(mode: BrickInteractionMode) {
    this.brickInteractionMode = mode;
  }

  activateBrick(regionId: RegionId, instanceId: number) {
    const runtime = this.regions.get(regionId);
    if (!runtime || !runtime.mesh.instanceColor) return;

    // Change color to Radiant Gold
    const color = new THREE.Color("#ffcd3c");
    runtime.mesh.setColorAt(instanceId, color);
    runtime.mesh.instanceColor.needsUpdate = true;
    const brick = runtime.currentBricks[instanceId];
    if (brick) {
      brick.color.copy(color);
    }
  }

  playSystemImpact(
    context: SystemImpactPlayback,
    onComplete: (result: SystemImpactResult) => void
  ) {
    let growthDelta = Math.max(0.18, Math.min(0.95, context.orgImpact.communityPowerDelta * 2.35));
    let stressDelta = Math.max(
      0.08,
      Math.min(0.48, context.orgImpact.communityPowerDelta * 1.25 + growthDelta * 0.12)
    );

    if (context.empowerSurge) {
      const requiredDelta = context.bridgeStressThreshold - context.bridgeStressBefore + 0.06;
      stressDelta = Math.max(stressDelta, requiredDelta);
      growthDelta = Math.max(growthDelta, 0.72);
    }

    const communityPillarHeightAfter = Number(
      (context.communityPillarHeightBefore + growthDelta).toFixed(3)
    );
    const bridgeStressAfter = Number(
      Math.min(1.45, context.bridgeStressBefore + stressDelta).toFixed(3)
    );
    const baseScaleEnd = this.mapCommunityHeightToScale(communityPillarHeightAfter);
    const bridgeTarget = this.resolveBridgeImpactTarget();
    this.systemImpactBridgeTarget.copy(bridgeTarget.point);
    this.systemImpactBridgeContactY = bridgeTarget.contactY;
    this.systemImpactStressThresholdCrossed = bridgeStressAfter >= context.bridgeStressThreshold;

    const baseTopSurfaceY = this.getCommunityTopSurfaceY(baseScaleEnd);
    const currentTopY = this.getSystemImpactBuildTopY(baseTopSurfaceY);
    const baseBrickCount = Math.max(6, Math.round(growthDelta * 16));
    let buildBrickCount = baseBrickCount;
    if (context.empowerSurge || this.systemImpactStressThresholdCrossed) {
      const contactGap = this.systemImpactBridgeContactY - currentTopY;
      if (contactGap > 0) {
        const requiredBricks = Math.ceil(contactGap / STEP_Y) + 3;
        buildBrickCount = Math.max(buildBrickCount, requiredBricks);
      }
    }
    const donorBricks =
      context.donorBricks?.map((donor) => ({
        regionId: donor.regionId,
        sourceIndex: donor.sourceIndex,
        position: donor.position.clone(),
        color: donor.color.clone(),
      })) ?? this.resolveSystemImpactDonorBricks(buildBrickCount);
    if (!context.replay) {
      this.consumeSystemImpactDonorBricks(donorBricks);
    }

    this.systemImpactResult = {
      communityPillarHeightBefore: Number(context.communityPillarHeightBefore.toFixed(3)),
      communityPillarHeightAfter,
      bridgeStressBefore: Number(context.bridgeStressBefore.toFixed(3)),
      bridgeStressAfter,
      bridgeCollapsed: false,
    };

    this.systemImpactOnComplete = onComplete;
    this.systemImpactActive = true;
    this.systemImpactCollapseTriggered = false;
    this.systemImpactElapsed = 0;
    this.systemImpactContactReached = false;
    this.systemImpactHitPulse = 0;
    this.systemImpactCollapseLeadInActive = false;
    this.systemImpactCollapseLeadInElapsed = 0;
    this.systemImpactCommunityScaleStart = this.systemImpactCommunityScale;
    this.systemImpactCommunityScaleEnd = baseScaleEnd;
    this.systemImpactBridgeStressStart = context.bridgeStressBefore;
    this.systemImpactBridgeStressEnd = bridgeStressAfter;
    this.systemImpactBridgeStressThreshold = Math.max(0.25, context.bridgeStressThreshold);
    this.lastSystemImpactReplayState = {
      context: {
        orgImpact: { ...context.orgImpact },
        communityPillarHeightBefore: context.communityPillarHeightBefore,
        bridgeStressBefore: context.bridgeStressBefore,
        bridgeStressThreshold: context.bridgeStressThreshold,
        empowerSurge: context.empowerSurge,
      },
      donorBricks: donorBricks.map((donor) => ({
        regionId: donor.regionId,
        sourceIndex: donor.sourceIndex,
        position: donor.position.clone(),
        color: donor.color.clone(),
      })),
    };
    this.queueSystemImpactBuildStack(buildBrickCount, baseTopSurfaceY, donorBricks);
    this.resetBridgeFailureForeshadow();
    this.systemImpactPhoton.visible = false;
    this.systemImpactPhotonLight.visible = false;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    if (this.isMobileViewport === isMobile) return;
    this.isMobileViewport = isMobile;
    this.applyOverviewCameraPose(this.isMobileViewport);
  }

  frameSystemOverview() {
    this.applyOverviewCameraPose(this.isMobileViewport);
  }

  hasReplayableSystemImpact() {
    return this.lastSystemImpactReplayState !== null;
  }

  replayLastSystemImpact(onComplete: (result: SystemImpactResult) => void) {
    const replay = this.lastSystemImpactReplayState;
    if (!replay) return false;
    this.restoreBridgeForReplay();
    this.clearSystemImpactBuildStack();
    this.systemImpactCommunityScale = this.mapCommunityHeightToScale(
      replay.context.communityPillarHeightBefore
    );
    this.setRegionReveal("community", this.regionReveal.community);
    this.playSystemImpact(
      {
        ...replay.context,
        donorBricks: replay.donorBricks.map((donor) => ({
          regionId: donor.regionId,
          sourceIndex: donor.sourceIndex,
          position: donor.position.clone(),
          color: donor.color.clone(),
        })),
        replay: true,
      },
      onComplete
    );
    return true;
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
    if (instanceId < 0) return;

    if (this.brickInteractionMode === "reclaim" && this.startTransferAnimation(regionId, instanceId)) {
      this.clearSelectedBrick();
      this.selectRegion("community");
      return;
    }

    this.setSelectionMarker(mesh, instanceId);
    this.setSelectedBrick(regionId, instanceId);
    this.selectRegion(regionId);
  }

  selectRegion(regionId: RegionId) {
    this.applySelection(regionId);
    this.callbacks.onSelectChange?.(regionId);
  }

  triggerFormation(regionId: RegionId) {
    this.clearSelectedBrick();
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

  clearSelectedBrick() {
    this.selectedBrickInfo = null;
    this.selectedOutline.visible = false;
    this.callbacks.onBrickSelectionChange?.(null);
  }

  private getInstanceTransform(mesh: THREE.InstancedMesh, instanceId: number) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(instanceId, matrix);
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);
    return { position, rotation, scale };
  }

  private setSelectionMarker(mesh: THREE.InstancedMesh, instanceId: number) {
    const { position, rotation } = this.getInstanceTransform(mesh, instanceId);
    this.selectedOutline.visible = true;
    this.selectedOutline.position.copy(position);
    this.selectedOutline.quaternion.copy(rotation);
    this.selectedOutline.scale.set(1.02, 1.02, 1.02);
  }

  private setSelectedBrick(regionId: RegionId, instanceId: number) { 
    const runtime = this.regions.get(regionId);
    if (!runtime) return;
    const isTop = runtime.currentBricks[instanceId]?.isTopLayer ?? false;
    
    this.selectedBrickInfo = {
      regionId,
      instanceId,
      canTransfer: (regionId === 'market' || regionId === 'state') && isTop
    }; 
    this.callbacks.onBrickSelectionChange?.(this.selectedBrickInfo);
  }

  private updateLandingPulses(delta: number) {
    for (let i = this.landingPulses.length - 1; i >= 0; i--) {
      const pulse = this.landingPulses[i];
      if (!pulse) continue;
      pulse.elapsed += delta;
      
      if (pulse.elapsed >= pulse.duration) {
        this.fxGroup.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
        this.landingPulses.splice(i, 1);
        continue;
      }
      
      const t = pulse.elapsed / pulse.duration;
      const scale = lerp(pulse.startScale, pulse.endScale, easeOutCubic(t));
      const opacity = Math.max(0, pulse.maxOpacity * (1 - t));
      
      pulse.mesh.scale.set(scale, scale, scale);
      const mat = pulse.mesh.material as THREE.LineBasicMaterial;
      if (mat) mat.opacity = opacity;
    }
  }

  private updateSlotMarkers() {
    if (!this.selectedBrickInfo?.canTransfer) {
      if (this.slotMarkers.visible) {
        // keep markers visible for context but static
      }
      return; 
    }
    const time = this.elapsed * 2.0;
    this.slotMarkers.children.forEach((child, i) => {
      const offset = i * 0.2;
      const slot = this.communitySlots[i];
      if (slot) {
        child.position.y = slot.y + Math.sin(time + offset) * 0.05;
      }
      
      const mat = (child as THREE.LineSegments).material;
      if (mat && !Array.isArray(mat)) {
        mat.opacity = 0.3 + Math.sin(time + offset) * 0.15;
      }
    });
  }

  private getNearestOpenSlotIndex(pos: THREE.Vector3): number | null {
    let bestIdx = -1;
    let minDst = 1.2; 
    this.communitySlots.forEach((slot, i) => {
      const dst = pos.distanceTo(slot);
      if (dst < minDst) {
        minDst = dst;
        bestIdx = i;
      }
    });
    return bestIdx >= 0 ? bestIdx : null;
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
    this.updateBrickFocusCue(deltaSeconds);
    this.updateSystemImpact(deltaSeconds);
    this.updateFallingBricks(deltaSeconds);
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

    this.structureGroup.remove(this.cronyMarkers, this.bridgeSupports, this.bridgeBricks, this.marketSplitGuide);
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
      this.slotHoverMarker,
      this.systemImpactPhoton
    );
    this.clearSystemImpactBuildStack();
    this.structureGroup.remove(this.systemImpactBuildGroup);
    this.systemImpactPhoton.geometry.dispose();
    (this.systemImpactPhoton.material as THREE.Material).dispose();
  }

  private rebuildTopologyFromValues() {
    this.systemImpactActive = false;
    this.systemImpactCollapseTriggered = false;
    this.systemImpactElapsed = 0;
    this.systemImpactCommunityScale = 1;
    this.systemImpactPhoton.visible = false;
    this.systemImpactPhotonLight.visible = false;
    this.systemImpactOnComplete = null;
    this.systemImpactResult = null;
    this.clearSystemImpactBuildStack();
    this.clearSelectedBrick();
    this.disposeRegionObjects();
    this.regions.clear();
    this.bridgeSupports.clear();
    this.bridgeBricks.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.dispose();
    });
    this.bridgeBricks.clear();
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

  shatterBridge() {
    if (this.isBridgeCollapsed) return;
    this.isBridgeCollapsed = true;
    this.resetBridgeFailureForeshadow();

    // Support both instanced and mesh group approaches
    const regionId: RegionId = "crony_bridge";
    const runtime = this.regions.get(regionId);
    
    // Check if we are using the new textured mesh group
    if (this.bridgeBricks.children.length > 0) {
      const random = createSeededRandom(12345);
      
      this.bridgeBricks.children.forEach((child, i) => {
         const mesh = child as THREE.Mesh;
         const offsetX = (random() - 0.5) * 0.5;
         const offsetZ = (random() - 0.5) * 0.5;
         const burstY = 0.55 + random() * 0.75;
         
         this.fallingBricks.push({
             instanceId: -1,
             regionId: "crony_bridge",
             position: mesh.position.clone(),
             velocity: new THREE.Vector3(offsetX, burstY, offsetZ),
             rotation: new THREE.Vector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z),
             rotationSpeed: new THREE.Vector3(
                (random() - 0.5) * 2,
                (random() - 0.5) * 2,
                (random() - 0.5) * 2
             ),
             targetMesh: mesh
         });
      });
      
    } else if (runtime && runtime.currentBricks.length > 0) {
      // Fallback for previous instanced logic 
      const count = runtime.currentBricks.length;
      const dummy = new THREE.Object3D();
      const random = Math.random;

      for (let i = 0; i < count; i++) {
          runtime.mesh.getMatrixAt(i, dummy.matrix);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          
          const offsetX = (random() - 0.5) * 0.5;
          const offsetZ = (random() - 0.5) * 0.5;
          const burstY = 0.55 + random() * 0.75;

          this.fallingBricks.push({
              instanceId: i,
              regionId: regionId,
              position: dummy.position.clone(),
              velocity: new THREE.Vector3(offsetX, burstY, offsetZ),
              rotation: new THREE.Vector3(
                  dummy.rotation.x, 
                  dummy.rotation.y, 
                  dummy.rotation.z
              ),
              rotationSpeed: new THREE.Vector3(
                  (random() - 0.5) * 2,
                  (random() - 0.5) * 2,
                  (random() - 0.5) * 2
              )
          });
      }
    }

    // Hide the static bridge support markers
    this.bridgeSupports.visible = false;
    this.cronyMarkers.visible = false;
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

  private updateBrickFocusCue(deltaSeconds: number) {
    if (!this.brickFocusCueActive) return;

    this.brickFocusCueElapsed += deltaSeconds;
    const t = Math.min(1, this.brickFocusCueElapsed / this.brickFocusCueDuration);
    const pulse = 1 + Math.sin(t * Math.PI) * 0.2;
    this.selectedOutline.scale.setScalar(1.02 * pulse);

    const material = this.selectedOutline.material as THREE.LineBasicMaterial;
    material.opacity = this.brickFocusCueBaseOpacity + Math.sin(t * Math.PI) * 0.12;

    if (t >= 1) {
      this.selectedOutline.scale.set(1.02, 1.02, 1.02);
      material.opacity = this.brickFocusCueBaseOpacity;
      this.brickFocusCueActive = false;
      const done = this.brickFocusCueResolver;
      this.brickFocusCueResolver = null;
      done?.();
    }
  }

  private updateSystemImpact(deltaSeconds: number) {
    if (!this.systemImpactActive || !this.systemImpactResult) return;

    this.systemImpactElapsed += deltaSeconds;

    const growDuration = 1.25;
    const stressDuration = 2.3;
    const hitHoldDuration = 0.32;
    const wobbleDuration = 0.95;
    const crackDuration = 0.9;
    const collapseLeadInDuration = hitHoldDuration + wobbleDuration + crackDuration;
    const postCollapseDuration = 1.1;
    const settleDuration = this.systemImpactStressThresholdCrossed ? 0.95 : 0.82;
    const buildCompletionTime = this.systemImpactBuildBricks.reduce(
      (maxTime, brick) => Math.max(maxTime, brick.revealAt + brick.flightDuration),
      growDuration
    );
    const totalDuration =
      buildCompletionTime +
      settleDuration +
      (this.systemImpactStressThresholdCrossed
        ? collapseLeadInDuration + postCollapseDuration
        : 0);

    const growT = Math.min(1, this.systemImpactElapsed / growDuration);
    this.systemImpactCommunityScale = lerp(
      this.systemImpactCommunityScaleStart,
      this.systemImpactCommunityScaleEnd,
      easeOutCubic(growT)
    );
    this.setRegionReveal("community", this.regionReveal.community);
    this.systemImpactBuildBricks.forEach((brick) => {
      if (this.systemImpactElapsed < brick.revealAt) return;
      brick.mesh.visible = true;
      const t = Math.min(1, (this.systemImpactElapsed - brick.revealAt) / brick.flightDuration);
      const eased = easeInOutCubic(t);
      brick.mesh.position.lerpVectors(brick.startPosition, brick.targetPosition, eased);
      brick.mesh.position.y += Math.sin(eased * Math.PI) * brick.arcHeight;
      brick.mesh.rotation.y = eased * Math.PI * 2.1;
      const material = brick.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(brick.donorColor).lerp(brick.settledColor, eased);
    });

    const stressT = Math.min(1, this.systemImpactElapsed / stressDuration);
    const bridgeStressNow = lerp(
      this.systemImpactBridgeStressStart,
      this.systemImpactBridgeStressEnd,
      stressT
    );
    this.applyBridgeStressVisual(bridgeStressNow);
    if (!this.systemImpactContactReached && this.systemImpactStressThresholdCrossed) {
      const warmup = Math.max(0, (stressT - 0.38) / 0.62);
      this.applyBridgePreImpactShake(warmup);
    }

    const topBuildY = this.getSystemImpactBuildTopY(
      this.getCommunityTopSurfaceY(this.systemImpactCommunityScale)
    );
    const contactReached = topBuildY >= this.systemImpactBridgeContactY + HALF_H * 0.12;
    if (contactReached && !this.systemImpactContactReached) {
      this.systemImpactContactReached = true;
      this.systemImpactHitPulse = 1.18;
      this.systemImpactCollapseLeadInActive = true;
      this.systemImpactCollapseLeadInElapsed = 0;
      this.spawnLandingPulse(
        new THREE.Vector3(
          this.systemImpactBridgeTarget.x,
          this.systemImpactBridgeContactY + HALF_H * 0.3,
          this.systemImpactBridgeTarget.z
        ),
        {
          color: "#ffe4a6",
          duration: 0.95,
          startScale: 1.2,
          endScale: 2.45,
          maxOpacity: 0.96,
        }
      );
      this.spawnLandingPulse(
        new THREE.Vector3(COMMUNITY_X, topBuildY, TOPOLOGY_Z),
        {
          color: "#ffd089",
          duration: 0.72,
          startScale: 1.05,
          endScale: 1.95,
          maxOpacity: 0.88,
        }
      );
    }

    if (this.systemImpactHitPulse > 0) {
      this.systemImpactHitPulse = Math.max(0, this.systemImpactHitPulse - deltaSeconds * 1.9);
      const progress = 1 - this.systemImpactHitPulse;
      const bounce = Math.sin(progress * Math.PI * 3) * this.systemImpactHitPulse;
      this.systemImpactBuildGroup.position.y = bounce * 0.14;
    } else {
      this.systemImpactBuildGroup.position.y = 0;
    }

    if (
      this.systemImpactStressThresholdCrossed &&
      this.systemImpactContactReached &&
      !this.systemImpactCollapseTriggered
    ) {
      if (this.systemImpactCollapseLeadInActive) {
        this.systemImpactCollapseLeadInElapsed += deltaSeconds;
        if (this.systemImpactCollapseLeadInElapsed <= hitHoldDuration) {
          const bangT = this.systemImpactCollapseLeadInElapsed / hitHoldDuration;
          this.applyBridgeImpactBang(bangT);
        } else {
          const postHitElapsed = this.systemImpactCollapseLeadInElapsed - hitHoldDuration;
          const wobbleT = Math.min(1, postHitElapsed / wobbleDuration);
          const crackT =
            postHitElapsed <= wobbleDuration
              ? 0
              : Math.min(1, (postHitElapsed - wobbleDuration) / crackDuration);
          this.applyBridgeFailureForeshadow(wobbleT, crackT);
        }

        if (this.systemImpactCollapseLeadInElapsed >= collapseLeadInDuration) {
          this.systemImpactCollapseLeadInActive = false;
          this.resetBridgeFailureForeshadow();
          this.systemImpactCollapseTriggered = true;
          this.systemImpactResult.bridgeCollapsed = true;
          this.shatterBridge();
        }
      }
    } else if (!this.systemImpactContactReached) {
      this.resetBridgeFailureForeshadow();
    }

    if (this.systemImpactElapsed >= totalDuration) {
      this.systemImpactActive = false;
      this.systemImpactBuildGroup.position.y = 0;
      this.systemImpactPhoton.visible = false;
      this.systemImpactPhotonLight.visible = false;
      this.resetBridgeFailureForeshadow();
      const done = this.systemImpactOnComplete;
      const result = this.systemImpactResult;
      this.systemImpactOnComplete = null;
      if (done && result) {
        done(result);
      }
    }
  }

  private applyBridgeStressVisual(stressValue: number) {
    const normalized = Math.max(
      0,
      Math.min(1.25, stressValue / Math.max(0.1, this.systemImpactBridgeStressThreshold))
    );
    const color = new THREE.Color(
      lerp(0.36, 0.86, normalized),
      lerp(0.4, 0.28, normalized),
      lerp(0.45, 0.2, normalized)
    );
    this.bridgeBricks.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color);
    });

    this.bridgeSupports.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color.clone().multiplyScalar(0.9));
    });
  }

  private applyBridgePreImpactShake(intensity: number) {
    const clamped = THREE.MathUtils.clamp(intensity, 0, 1);
    if (clamped <= 0.001) {
      this.bridgeBricks.rotation.z = 0;
      this.bridgeSupports.rotation.z = 0;
      this.bridgeBricks.position.y = 0;
      this.bridgeSupports.position.y = 0;
      return;
    }
    this.bridgeBricks.rotation.z = Math.sin(this.elapsed * 4.4) * 0.014 * clamped;
    this.bridgeSupports.rotation.z = Math.sin(this.elapsed * 4.4 + 0.6) * 0.01 * clamped;
    this.bridgeBricks.position.y = Math.sin(this.elapsed * 5.4) * 0.02 * clamped;
    this.bridgeSupports.position.y = Math.sin(this.elapsed * 5.4 + 0.7) * 0.012 * clamped;
  }

  private applyBridgeImpactBang(progress: number) {
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    const impulse = Math.sin(t * Math.PI);
    const decay = 1 - t;
    this.bridgeBricks.rotation.z = Math.sin(t * Math.PI * 6) * 0.045 * decay;
    this.bridgeSupports.rotation.z = Math.sin(t * Math.PI * 6 + 0.6) * 0.026 * decay;
    this.bridgeBricks.position.y = impulse * 0.18;
    this.bridgeSupports.position.y = impulse * 0.09;

    const bangColor = new THREE.Color("#ffd9a4");
    this.bridgeBricks.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      if ((i + 1) % 3 === 0 || (i + 1) % 5 === 0) {
        material.color.lerp(bangColor, 0.22 * decay);
      }
    });
  }

  private applyBridgeFailureForeshadow(wobbleT: number, crackT: number) {
    const wobble =
      Math.sin(this.elapsed * 25) * 0.06 * wobbleT +
      Math.sin(this.elapsed * 11 + 0.7) * 0.024 * wobbleT;
    const verticalShake = Math.sin(this.elapsed * 34) * 0.05 * wobbleT;
    this.bridgeBricks.rotation.z = wobble;
    this.bridgeSupports.rotation.z = wobble * 0.68;
    this.bridgeBricks.position.y = verticalShake;
    this.bridgeSupports.position.y = verticalShake * 0.45;

    if (crackT <= 0) return;

    const crackDark = new THREE.Color("#2a1e16");
    const crackHot = new THREE.Color("#ff9e7a");
    this.bridgeBricks.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 46 + i * 0.67);
      if (i % 4 === 0) {
        material.color.lerp(crackDark, crackT * (0.55 + 0.35 * pulse));
      } else if (i % 7 === 0) {
        material.color.lerp(crackHot, crackT * (0.2 + 0.2 * pulse));
      }
    });
  }

  private resetBridgeFailureForeshadow() {
    this.bridgeBricks.rotation.set(0, 0, 0);
    this.bridgeSupports.rotation.set(0, 0, 0);
    this.bridgeBricks.position.y = 0;
    this.bridgeSupports.position.y = 0;
  }

  private mapCommunityHeightToScale(heightScore: number) {
    return Math.max(1, Math.min(2.2, 0.88 + heightScore * 0.17));
  }

  private getCommunityTopSurfaceY(scale: number) {
    const community = this.regions.get("community");
    if (!community) return STRUCTURE_LAYER0_Y + BRICK_H;
    const revealScale = Math.max(0.001, this.regionReveal.community);
    const yScale = revealScale * scale;
    return (community.topCapCenter.y + HALF_H) * yScale;
  }

  private resolveBridgeImpactTarget() {
    if (this.bridgeBricks.children.length > 0) {
      const bounds = new THREE.Box3().setFromObject(this.bridgeBricks);
      if (
        Number.isFinite(bounds.min.x) &&
        Number.isFinite(bounds.min.y) &&
        Number.isFinite(bounds.min.z)
      ) {
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        const contactY = bounds.min.y - 0.02;
        const point = new THREE.Vector3(center.x, bounds.min.y + 0.25, center.z);
        return { point, contactY };
      }
    }

    const fallbackContactY = Math.min(this.bridgeStartY, this.bridgeEndY) - HALF_H;
    return {
      point: new THREE.Vector3((MARKET_X + STATE_X) * 0.5, fallbackContactY + 0.25, TOPOLOGY_Z),
      contactY: fallbackContactY,
    };
  }

  private resolveSystemImpactDonorBricks(brickCount: number) {
    const marketRuntime = this.regions.get("market");
    const stateRuntime = this.regions.get("state");
    if (!marketRuntime && !stateRuntime) return [];

    const marketCandidates = marketRuntime
      ? this.getSystemImpactDonorCandidateIndexes(marketRuntime)
      : [];
    const stateCandidates = stateRuntime
      ? this.getSystemImpactDonorCandidateIndexes(stateRuntime)
      : [];
    const donors: SystemImpactDonorBrick[] = [];
    const random = createSeededRandom(
      hashString(`system-impact-${this.systemImpactBuiltBrickCount}-${brickCount}`)
    );

    const pickFrom = (
      runtime: RegionRuntime | undefined,
      regionId: "market" | "state",
      candidateIndexes: number[]
    ) => {
      if (!runtime || candidateIndexes.length === 0) return null;
      const choice = Math.floor(random() * candidateIndexes.length);
      const sourceIndex = candidateIndexes.splice(choice, 1)[0];
      if (sourceIndex === undefined) return null;
      const source = runtime.currentBricks[sourceIndex];
      if (!source) return null;
      return {
        regionId,
        sourceIndex,
        position: source.position.clone(),
        color: source.color.clone(),
      } satisfies SystemImpactDonorBrick;
    };

    for (let i = 0; i < brickCount; i += 1) {
      const preferMarket = i % 2 === 0;
      const primary = preferMarket
        ? pickFrom(marketRuntime, "market", marketCandidates)
        : pickFrom(stateRuntime, "state", stateCandidates);
      const fallback = preferMarket
        ? pickFrom(stateRuntime, "state", stateCandidates)
        : pickFrom(marketRuntime, "market", marketCandidates);
      const donor = primary ?? fallback;
      if (!donor) break;
      donors.push(donor);
    }

    return donors;
  }

  private getSystemImpactDonorCandidateIndexes(runtime: RegionRuntime) {
    const upperCutoff = runtime.topY - STEP_Y * 4;
    const shellX = STEP_XZ * 1.05;
    const shellZ = STEP_XZ * 0.75;
    const cameraFacingZ = runtime.center.z + STEP_XZ * 0.45;
    const radiant = new THREE.Color("#ffcd3c");
    const visiblePreferred: number[] = [];
    const preferred: number[] = [];
    const fallback: number[] = [];

    runtime.currentBricks.forEach((brick, index) => {
      const colorDelta = Math.hypot(
        brick.color.r - radiant.r,
        brick.color.g - radiant.g,
        brick.color.b - radiant.b
      );
      if (colorDelta < 0.04) return;
      const isUpper = brick.position.y >= upperCutoff;
      const isShell =
        Math.abs(brick.position.x - runtime.center.x) >= shellX ||
        Math.abs(brick.position.z - runtime.center.z) >= shellZ;
      const isCameraFacing = brick.position.z >= cameraFacingZ;
      if (isUpper && isShell && isCameraFacing) {
        visiblePreferred.push(index);
      } else if (isUpper && isShell) {
        preferred.push(index);
      } else {
        fallback.push(index);
      }
    });

    if (visiblePreferred.length > 0) return visiblePreferred;
    if (preferred.length > 0) return preferred;
    return fallback;
  }

  private consumeSystemImpactDonorBricks(donors: SystemImpactDonorBrick[]) {
    const powBudget = Math.min(16, donors.length);
    for (let i = 0; i < powBudget; i += 1) {
      const donor = donors[i];
      if (!donor) continue;
      this.spawnLandingPulse(donor.position.clone(), {
        color: "#ffd89e",
        duration: 0.72,
        startScale: 0.95,
        endScale: 1.92,
        maxOpacity: 0.9,
      });
    }

    const byRegion = new Map<"market" | "state", Set<number>>([
      ["market", new Set<number>()],
      ["state", new Set<number>()],
    ]);

    donors.forEach((donor) => {
      byRegion.get(donor.regionId)?.add(donor.sourceIndex);
    });

    byRegion.forEach((indexes, regionId) => {
      if (indexes.size === 0) return;
      const runtime = this.regions.get(regionId);
      if (!runtime) return;
      const nextBricks = runtime.currentBricks.filter((_brick, index) => !indexes.has(index));
      this.rebuildRegionWithBricks(runtime, nextBricks);
    });
  }

  private queueSystemImpactBuildStack(
    brickCount: number,
    baseTopSurfaceY: number,
    donors: SystemImpactDonorBrick[]
  ) {
    const community = this.regions.get("community");
    if (!community) return;

    const settledColor = new THREE.Color("#d9b114");
    const anchorX = COMMUNITY_X;
    const anchorZ = TOPOLOGY_Z;
    const laneOffsets: Array<[number, number]> = [
      [0, 0],
      [STEP_XZ * 0.26, 0],
      [-STEP_XZ * 0.26, 0],
      [0, STEP_XZ * 0.2],
      [0, -STEP_XZ * 0.2],
    ];

    for (let i = 0; i < brickCount; i += 1) {
      const logicalIndex = this.systemImpactBuiltBrickCount + i;
      const lane = laneOffsets[logicalIndex % laneOffsets.length] ?? [0, 0];
      const targetY = baseTopSurfaceY + HALF_H + logicalIndex * STEP_Y;
      const targetPosition = new THREE.Vector3(anchorX + lane[0], targetY, anchorZ + lane[1]);
      const donor = donors[i];
      const donorPosition = donor?.position ?? targetPosition.clone();
      const startPosition = donorPosition.clone().add(new THREE.Vector3(0, HALF_H, 0));
      const donorColor = donor?.color ?? settledColor;
      const travelDistance = startPosition.distanceTo(targetPosition);

      const mesh = new THREE.Mesh(
        this.brickGeometry,
        new THREE.MeshBasicMaterial({
          color: donorColor.clone(),
        })
      );
      const edge = new THREE.LineSegments(
        this.edgeGeometry,
        new THREE.LineBasicMaterial({
          color: "#665228",
          transparent: true,
          opacity: 0.66,
        })
      );
      edge.renderOrder = 14;
      mesh.add(edge);
      mesh.position.copy(startPosition);
      mesh.visible = false;
      this.systemImpactBuildGroup.add(mesh);
      this.systemImpactBuildBricks.push({
        mesh,
        startPosition,
        targetPosition,
        revealAt: i * 0.1,
        flightDuration: THREE.MathUtils.clamp(0.8 + travelDistance * 0.026, 0.8, 1.6),
        arcHeight: THREE.MathUtils.clamp(0.65 + travelDistance * 0.085, 0.65, 2.1),
        donorColor,
        settledColor,
      });
    }

    this.systemImpactBuiltBrickCount += brickCount;
  }

  private getSystemImpactBuildTopY(fallbackY: number) {
    let maxY = fallbackY;
    this.systemImpactBuildBricks.forEach((brick) => {
      if (!brick.mesh.visible) return;
      maxY = Math.max(maxY, brick.mesh.position.y + HALF_H);
    });
    return maxY;
  }

  private clearSystemImpactBuildStack() {
    this.systemImpactBuildBricks.forEach((brick) => {
      this.systemImpactBuildGroup.remove(brick.mesh);
      brick.mesh.children.forEach((child) => {
        const line = child as THREE.LineSegments;
        const material = line.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else if (material) {
          material.dispose();
        }
      });
      (brick.mesh.material as THREE.Material).dispose();
    });
    this.systemImpactBuildBricks.length = 0;
    this.systemImpactBuiltBrickCount = 0;
    this.systemImpactStressThresholdCrossed = false;
    this.systemImpactContactReached = false;
    this.systemImpactHitPulse = 0;
    this.systemImpactCollapseLeadInActive = false;
    this.systemImpactCollapseLeadInElapsed = 0;
    this.systemImpactBuildGroup.position.y = 0;
    this.systemImpactBridgeContactY = 0;
    this.systemImpactBridgeTarget.set(0, 0, 0);
    this.resetBridgeFailureForeshadow();
    if (this.brickFocusCueActive) {
      this.brickFocusCueActive = false;
      const done = this.brickFocusCueResolver;
      this.brickFocusCueResolver = null;
      done?.();
    }
  }

  private updateFallingBricks(delta: number) {
    if (this.fallingBricks.length === 0) return;

    try {
      const regionId = "crony_bridge";
      const runtime = this.regions.get(regionId);
      const groundY = IOV_TOPOLOGY_CONFIG.layout.groundY;
      
      const dummy = new THREE.Object3D();

      this.fallingBricks.forEach(brick => {
          // Gravity
          brick.velocity.y -= 9.8 * delta * 1.15;
          
          // Position integration
          brick.position.addScaledVector(brick.velocity, delta);
          
          // Floor collision
          if (brick.position.y < groundY + BRICK_H/2) {
              brick.position.y = groundY + BRICK_H/2;
              brick.velocity.y *= -0.22;
              brick.velocity.x *= 0.85;
              brick.velocity.z *= 0.85;
              brick.rotationSpeed.multiplyScalar(0.58);
          }

          // Rotation
          brick.rotation.x += brick.rotationSpeed.x * delta;
          brick.rotation.y += brick.rotationSpeed.y * delta;
          brick.rotation.z += brick.rotationSpeed.z * delta;

          // Apply to mesh or instance
          if (brick.targetMesh) {
             brick.targetMesh.position.copy(brick.position);
             brick.targetMesh.rotation.set(brick.rotation.x, brick.rotation.y, brick.rotation.z);
          } else if (runtime && brick.instanceId >= 0) {
             dummy.position.copy(brick.position);
             dummy.rotation.set(brick.rotation.x, brick.rotation.y, brick.rotation.z);
             dummy.updateMatrix();
             runtime.mesh.setMatrixAt(brick.instanceId, dummy.matrix);
          }
      });

      if (runtime && runtime.mesh) {
          runtime.mesh.instanceMatrix.needsUpdate = true;
      }
    } catch (err) {
      console.warn('Bridge physics error:', err);
      this.fallingBricks = []; // disable on error
    }
  }

  private setRegionReveal(regionId: RegionId, reveal: number) {
    const runtime = this.regions.get(regionId);
    if (!runtime) return;

    const visible = reveal > 0.01;
    runtime.mesh.visible = visible;
    runtime.edgeGroup.visible = visible;
    if (runtime.studs) runtime.studs.visible = visible;
    if (runtime.flagPole) runtime.flagPole.visible = visible;
    if (runtime.flag) runtime.flag.visible = visible;

    const yScale = Math.max(0.001, reveal);
    const regionYScale =
      regionId === "community" ? yScale * this.systemImpactCommunityScale : yScale;
    runtime.mesh.scale.y = regionYScale;
    runtime.edgeGroup.scale.y = regionYScale;
    if (runtime.studs) runtime.studs.scale.y = regionYScale;
    if (runtime.flagPole) runtime.flagPole.scale.y = regionYScale;
    if (runtime.flag) runtime.flag.scale.y = regionYScale;

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
    this.bridgeBricks.visible = visible;
    const yScale = Math.max(0.001, reveal);
    this.bridgeSupports.scale.y = yScale;
    this.bridgeBricks.scale.y = yScale;
  }

  private applyOverviewCameraPose(isMobile: boolean) {
    if (isMobile) {
      // On phones, keep the model higher in frame so the bottom sheet does not hide it.
      this.camera.fov = 50;
      this.camera.position.set(0, 17, 40);
      this.controls.target.set(0, 8, 0);
      this.controls.minDistance = 16;
      this.controls.maxDistance = 52;
      this.controls.maxPolarAngle = 1.36;
    } else {
      this.camera.fov = 42;
      this.camera.position.set(0, 15, 35);
      this.controls.target.set(0, 6, 0);
      this.controls.minDistance = 12;
      this.controls.maxDistance = 48;
      this.controls.maxPolarAngle = 1.32;
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private restoreBridgeForReplay() {
    this.fallingBricks = [];
    this.isBridgeCollapsed = false;
    this.resetBridgeFailureForeshadow();
    const visible = this.regionReveal.crony_bridge > 0.01;
    this.bridgeSupports.visible = visible;
    this.bridgeBricks.visible = visible;
    this.cronyMarkers.visible = visible;
    this.bridgeBricks.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const restPosition = mesh.userData.restPosition as THREE.Vector3 | undefined;
      const restRotation = mesh.userData.restRotation as THREE.Euler | undefined;
      const baseColor = mesh.userData.baseColor as THREE.Color | undefined;
      if (restPosition) {
        mesh.position.copy(restPosition);
      }
      if (restRotation) {
        mesh.rotation.copy(restRotation);
      } else {
        mesh.rotation.set(0, 0, 0);
      }
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (baseColor && material) {
        material.color.copy(baseColor);
      }
    });
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

      // Add flag poles to top bricks
      this.addFlagPole(config, runtime);

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

  private addFlagPole(config: IovRegionConfig, runtime: RegionRuntime) {
    // Skip bridge - it doesn't have brick structure like towers/bases
    if ((config.id as string) === 'crony_bridge') {
      return;
    }
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const poleMaterial = new THREE.MeshBasicMaterial({ color: '#4a5568' });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);

    // Position pole extending from top of pillar
    pole.position.set(
      runtime.center.x,
      runtime.topY + 0.75, // Half the pole height above the top
      runtime.center.z
    );

    // Create flag (small plane with text texture)
    const flagGeometry = new THREE.PlaneGeometry(1.2, 0.6);

    // Create canvas for flag text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 64;

    // Clear with white background
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add black border
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Draw text
    context.fillStyle = 'black';
    context.font = 'bold 16px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    let flagText = config.label.toUpperCase();
    if (config.id === 'crony_bridge') {
      flagText = 'CRONY BRIDGE';
    }

    context.fillText(flagText, canvas.width / 2, canvas.height / 2);

    const flagTexture = new THREE.CanvasTexture(canvas);
    const flagMaterial = new THREE.MeshBasicMaterial({
      map: flagTexture,
      transparent: false,
      side: THREE.DoubleSide
    });

    const flag = new THREE.Mesh(flagGeometry, flagMaterial);

    // Position flag at top of pole, slightly offset
    flag.position.set(
      runtime.center.x + 0.7, // Offset to the side
      runtime.topY + 1.4, // At top of pole
      runtime.center.z
    );

    // Rotate flag to face camera-ish
    flag.rotation.y = Math.PI * 0.1; // Slight angle

    // Add to scene
    this.structureGroup.add(pole);
    this.structureGroup.add(flag);

    // Store references for reveal control
    runtime.flagPole = pole;
    runtime.flag = flag;
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
      ensureMinLightness(color, getTargetMinLightness(config.id, segment));
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
      const cashMarketColor = new THREE.Color("#1f7a34");
      const derivativesMarketColor = new THREE.Color("#6edc8a");
      // Adjust derivative share to make cash portion more visually prominent
      // Cash (140T) should appear comparable to State (117T) in height
      const derivativeShare =
        config.id === "market" && totals.market && totals.marketDerivatives
          ? Math.min(0.6, THREE.MathUtils.clamp(totals.marketDerivatives / totals.market, 0.08, 0.9))
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
          6, // Allow community to be taller for better visibility
          this.mapValueToLayers(totals.community, IOV_TOPOLOGY_CONFIG.community.height, 0.8) // Increased from 0.35 to 0.8
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
          // Create individual mesh for bridge brick with text
          const position = new THREE.Vector3(
            center.x + (x - (config.shape.length - 1) * 0.5) * STEP_XZ,
            layerBaseY + y * STEP_Y,
            center.z + (z - 0.5) * STEP_XZ * 0.64
          );

          // Create text texture for this brick
          const brickIndex = y * config.shape.length * 2 + x * 2 + z;
          // Only put text on bricks facing the camera (z=1, positive Z direction - closer to camera)
          const isCameraFacing = z === 1;
          const cameraFacingBrickIndex = x; // 0-13 for camera-facing bricks
          const textTexture = this.createBridgeBrickText(cameraFacingBrickIndex, isCameraFacing);

          const brickMaterial = new THREE.MeshBasicMaterial({
            color: getIdentityColor(config.id),
            map: textTexture
          });
          ensureMinLightness(brickMaterial.color, getTargetMinLightness(config.id));

          const brickMesh = new THREE.Mesh(this.brickGeometry, brickMaterial);
          brickMesh.position.copy(position);
          brickMesh.castShadow = true;
          brickMesh.receiveShadow = false;
          brickMesh.userData.regionId = config.id;
          brickMesh.userData.restPosition = position.clone();
          brickMesh.userData.restRotation = brickMesh.rotation.clone();
          brickMesh.userData.baseColor = brickMaterial.color.clone();

          // Add to bridge group instead of using instanced mesh
          this.bridgeBricks.add(brickMesh);
        }
      }
    }

    return bricks;
  }

  private createRegionMesh(config: IovRegionConfig, bricks: BrickInstance[]) {
    const identityColor = getIdentityColor(config.id);
    const accentColor = new THREE.Color(identityColor ?? config.palette[0] ?? "#9fb0d3");

    const material = new THREE.MeshBasicMaterial();

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
      color: "#2a3b4d",
      transparent: true,
      opacity: config.id === "crony_bridge" ? 0.4 : 0.32,
    });
    const topCapMaterial = new THREE.LineBasicMaterial({
      color: "#4a5568",
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

    // Add bridge identification text to supports
    this.addBridgeTextLabels();

    this.structureGroup.add(this.bridgeSupports);
    this.structureGroup.add(this.bridgeBricks);
  }

  private addBridgeTextLabels() {
    const market = this.regions.get("market");
    const state = this.regions.get("state");
    if (!market || !state) return;

    // Create canvas for bridge text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    // Clear with transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text in dark graphite color to match bridge theme
    context.fillStyle = '#2a3b4d'; // Dark graphite matching bridge edges
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw "CRONY" on left support (market side)
    context.fillText('CRONY', canvas.width / 2, canvas.height / 2);

    const leftTexture = new THREE.CanvasTexture(canvas);
    const leftMaterial = new THREE.MeshBasicMaterial({
      map: leftTexture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.8
    });

    const leftTextPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      leftMaterial
    );

    // Position on left support (market side) - "carved" into the top face
    leftTextPlane.position.set(
      market.center.x + 1.2,
      this.bridgeStartY + 0.1, // Just above the support top
      TOPOLOGY_Z + 0.16 // Slightly in front of the support face
    );
    leftTextPlane.rotation.x = -Math.PI / 2; // Lay flat on top
    leftTextPlane.rotation.z = Math.PI / 2; // Rotate to read correctly

    // Create separate canvas for "BRIDGE" on right support
    const rightCanvas = document.createElement('canvas');
    const rightContext = rightCanvas.getContext('2d')!;
    rightCanvas.width = 256;
    rightCanvas.height = 128;

    rightContext.clearRect(0, 0, rightCanvas.width, rightCanvas.height);
    rightContext.fillStyle = '#2a3b4d';
    rightContext.font = 'bold 24px Arial';
    rightContext.textAlign = 'center';
    rightContext.textBaseline = 'middle';

    rightContext.fillText('BRIDGE', rightCanvas.width / 2, rightCanvas.height / 2);

    const rightTexture = new THREE.CanvasTexture(rightCanvas);
    const rightMaterial = new THREE.MeshBasicMaterial({
      map: rightTexture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.8
    });

    const rightTextPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      rightMaterial
    );

    // Position on right support (state side)
    rightTextPlane.position.set(
      state.center.x - 1.2,
      this.bridgeEndY + 0.1,
      TOPOLOGY_Z + 0.16
    );
    rightTextPlane.rotation.x = -Math.PI / 2;
    rightTextPlane.rotation.z = Math.PI / 2;

    // Add text planes to bridge supports group
    this.bridgeSupports.add(leftTextPlane);
    this.bridgeSupports.add(rightTextPlane);
  }

  private createBridgeBrickText(brickIndex: number, isCameraFacing: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 64;

    // Clear with transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Only put text on camera-facing bricks
    if (isCameraFacing) {
      // Define the text to spell out (CRONY BRIDGE = 12 characters including space)
      const bridgeText = "CRONY BRIDGE";

      // Only show letters for the first 12 camera-facing bricks, leave the rest blank
      if (brickIndex < bridgeText.length) {
        const letter = bridgeText.charAt(brickIndex);

        // Draw the letter in bold red
        context.fillStyle = '#dc2626'; // Bright red color
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        context.fillText(letter, canvas.width / 2, canvas.height / 2);
      }
    }
    // Non-camera-facing bricks and remaining bricks stay blank (transparent)

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;

    return texture;
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
    if (this.selectedBrickInfo?.regionId === runtime.config.id) {
      this.clearSelectedBrick();
    }
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

  private seedErosionMask() {
    this.erodedCommunityIndexes.clear();
    const count = this.regions.get('community')?.baseBricks.length ?? 0;
    for(let i=0; i<count; i++) {
        if (Math.random() < this.erosionRatio) {
              this.erodedCommunityIndexes.add(i);
        }
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
    this.activeTransfer = null;
  }

  private spawnLandingPulse(
    position: THREE.Vector3,
    options?: {
      color?: string;
      duration?: number;
      startScale?: number;
      endScale?: number;
      maxOpacity?: number;
    }
  ) {
    const pulse = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(BRICK_W + 0.2, BRICK_H + 0.2, BRICK_D + 0.2)),
      new THREE.LineBasicMaterial({
        color: options?.color ?? "#ffffff",
        transparent: true,
        opacity: options?.maxOpacity ?? 0.8,
      })
    );
    pulse.position.copy(position);
    this.fxGroup.add(pulse);
    this.landingPulses.push({
      mesh: pulse,
      elapsed: 0,
      duration: options?.duration ?? 0.6,
      startScale: options?.startScale ?? 1,
      endScale: options?.endScale ?? 1.5,
      maxOpacity: options?.maxOpacity ?? 0.8,
    });
  }

  // Community placement uses absolute world coordinates on shared baseplate.
  // This avoids floating/misaligned reclaimed bricks caused by mixed local offsets.
  private getNextCommunityPlacement() {
    const spaceIndex = this.transferredBricks.length;
    
    // Safety check if slots are empty
    if (this.communitySlots.length === 0) {
      return new THREE.Vector3();
    }
    
    if (spaceIndex < this.communitySlots.length) {
      const slot = this.communitySlots[spaceIndex];
      if (slot) return slot.clone();
    }
    
    // Fallback: stack on last slot if full
    const lastSlot = this.communitySlots[this.communitySlots.length - 1];
    if (lastSlot) {
      const last = lastSlot.clone();
      last.y += (spaceIndex - this.communitySlots.length + 1) * 0.1;
      return last;
    }
    
    return new THREE.Vector3();
  }

  private getInteractiveMeshes() {
    return Array.from(this.regions.values())
      .map((r) => r.mesh)
      .filter((m) => m.visible);
  }

  // End of helper methods
  build(regionId: RegionId) {
    const isRevealing = this.regionRevealTarget[regionId] > 0.5;
    this.regionRevealTarget[regionId] = isRevealing ? 0 : 1;
  }
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const getIdentityColor = (regionId: RegionId) => {
  if (regionId === "crony_bridge") return IOV_IDENTITY_COLORS.bridge;
  return IOV_IDENTITY_COLORS[regionId];
};

const getTargetMinLightness = (
  regionId: RegionId,
  segment?: "cash" | "derivatives"
) => {
  if (regionId === "market") {
    return segment === "derivatives" ? 0.675 : 0.585; // Reduced 10% for less pastel intensity
  }
  if (regionId === "state") return 0.63; // Reduced 10%
  if (regionId === "community") return 0.675; // Reduced 10%
  return 0.55; // Bridge: reduced 15% for darker "sitting above" appearance
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
