import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { IovValueLogEntry, WellbeingContextNode } from "./iovTimelogs";

export type SaocommonsDomain = "~~Learning" | "~~Earning" | "~~OrgBuilding";

export type WizardStep =
  | "select_time"
  | "select_wellbeing"
  | "select_intensity"
  | "select_performance"
  | "show_outcome";

export const WIZARD_STEP_ORDER: WizardStep[] = [
  "select_time",
  "select_wellbeing",
  "select_intensity",
  "select_performance",
  "show_outcome",
];

export interface ValueCaptureActivityTemplate {
  id: string;
  label: string;
  activityLabel: string;
  taskType: string;
  intent: string;
}

export interface ValueCaptureProofTemplate {
  id: string;
  label: string;
  proofOfActivity: string;
  artifactType: string;
  evidenceLink: string;
}

export const VALUE_CAPTURE_ACTIVITY_TEMPLATES: ReadonlyArray<ValueCaptureActivityTemplate> = [
  {
    id: "deep-work",
    label: "Deep Work Sprint",
    activityLabel: "Focused deep-work sprint",
    taskType: "focused-execution",
    intent: "ship-meaningful-progress",
  },
  {
    id: "learning-block",
    label: "Learning Block",
    activityLabel: "Skill learning and synthesis block",
    taskType: "learning",
    intent: "build-capability",
  },
  {
    id: "team-sync",
    label: "Team Alignment",
    activityLabel: "Team alignment and decision sync",
    taskType: "coordination",
    intent: "reduce-friction",
  },
  {
    id: "recovery",
    label: "Recovery Reset",
    activityLabel: "Recovery reset and energy restoration",
    taskType: "recovery",
    intent: "restore-wellbeing",
  },
];

export const VALUE_CAPTURE_PROOF_TEMPLATES: ReadonlyArray<ValueCaptureProofTemplate> = [
  {
    id: "commit-proof",
    label: "Commit + Artifact",
    proofOfActivity: "Code commit with artifact snapshot",
    artifactType: "commit-log",
    evidenceLink: "proof://repo/commit",
  },
  {
    id: "note-proof",
    label: "Meeting Notes",
    proofOfActivity: "Meeting notes with decisions and actions",
    artifactType: "meeting-notes",
    evidenceLink: "proof://docs/notes",
  },
  {
    id: "metric-proof",
    label: "Metric Screenshot",
    proofOfActivity: "Metric screenshot tied to action",
    artifactType: "metric-capture",
    evidenceLink: "proof://metrics/snapshot",
  },
  {
    id: "journal-proof",
    label: "Reflection Journal",
    proofOfActivity: "Short reflection log of activity outcome",
    artifactType: "reflection-log",
    evidenceLink: "proof://journal/entry",
  },
];

export const WELLBEING_INTENSITY_PROMPTS: Record<WellbeingContextNode, string> = {
  "~~Physiology":
    "How strongly did this timeslice improve or drain your body baseline (sleep, nutrition, movement)?",
  "~~Emotion":
    "How intense was the emotional shift caused by this action?",
  "~~Feeling":
    "How strongly did your felt state move after this action?",
  "~~Thought":
    "How much cognitive clarity or overload did this action create?",
  "~~Habit":
    "Was this part of a healthy habit streak, and how strongly did it reinforce the habit?",
  "~~Performance":
    "How strongly did this action advance real performance outcomes?",
};

export const SAOCOMMONS_DOMAIN_PROMPTS: Record<SaocommonsDomain, string> = {
  "~~Learning": "Learning intensity: how much capability growth happened?",
  "~~Earning": "Earning intensity: how much value capture moved forward?",
  "~~OrgBuilding": "Org building intensity: how much durable system capacity improved?",
};

interface StageVisual {
  id: "value_capture" | "wellbeing" | "saocommons" | "outcome";
  mesh: THREE.Mesh;
  label: THREE.Sprite;
}

interface ContextNodeVisual {
  key: WellbeingContextNode;
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  angle: number;
}

interface DomainNodeVisual {
  domain: SaocommonsDomain;
  mesh: THREE.Mesh;
  label: THREE.Sprite;
}

interface TimeScaleTickVisual {
  minute: number;
  tier: "major" | "minor";
  mesh: THREE.Mesh;
  label: THREE.Sprite | null;
}

export interface ValueLogDraft {
  startTime: string;
  endTime: string;
  activityLabel: string;
  activityTemplateId: string;
  taskType: string;
  intent: string;
  proofOfActivity: string;
  proofTemplateId: string;
  evidenceLink: string;
  artifactType: string;
  community: string;
  project: string;
  contributorRole: string;
  proofQuality: number;
  anomalyFlag: boolean;
  fraudRiskSignal: number;
  wellbeingNode: WellbeingContextNode;
  signalLabel: string;
  signalScore: number;
  contextIntensity: number;
  impactDirection: "increase" | "decrease" | "neutral";
  skillApplication: string;
  communityContext: string;
  learningTag: boolean;
  earningTag: boolean;
  orgBuildingTag: boolean;
  learningIntensity: number;
  earningIntensity: number;
  orgBuildingIntensity: number;
}

export interface ValueLogOutcome {
  wellbeingDelta: number;
  auraDelta: number;
  identityStateDelta: number;
  saocommonsEnabled: boolean;
  saocommonsDomains: SaocommonsDomain[];
}

export interface ValueLogSummary {
  step: WizardStep;
  stepIndex: number;
  stepLabel: string;
  draft: ValueLogDraft;
  outcome: ValueLogOutcome;
  committedCount: number;
  canCommit: boolean;
  sceneActionHint: string;
  timeCapturePhase?: "start" | "end";
}

export interface ValueLogSelection {
  kind: "clock" | "context" | "domain" | null;
  key: string | null;
}

export const createInitialValueLogDraft = (): ValueLogDraft => {
  const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
  const activityTemplate = VALUE_CAPTURE_ACTIVITY_TEMPLATES[0];
  const proofTemplate = VALUE_CAPTURE_PROOF_TEMPLATES[0];
  return {
    startTime: toLocalInputValue(now),
    endTime: toLocalInputValue(now),
    activityLabel: activityTemplate?.activityLabel ?? "Focused deep-work sprint",
    activityTemplateId: activityTemplate?.id ?? "deep-work",
    taskType: activityTemplate?.taskType ?? "focused-execution",
    intent: activityTemplate?.intent ?? "ship-meaningful-progress",
    proofOfActivity: proofTemplate?.proofOfActivity ?? "Code commit with artifact snapshot",
    proofTemplateId: proofTemplate?.id ?? "commit-proof",
    evidenceLink: proofTemplate?.evidenceLink ?? "proof://repo/commit",
    artifactType: proofTemplate?.artifactType ?? "commit-log",
    community: "GrowthFlow Engineering",
    project: "IOV Visualization",
    contributorRole: "Contributor",
    proofQuality: 0.82,
    anomalyFlag: false,
    fraudRiskSignal: 0.04,
    wellbeingNode: "~~Performance",
    signalLabel: "Performance execution quality",
    signalScore: 0.68,
    contextIntensity: 0.68,
    impactDirection: "increase",
    skillApplication: "Business Growth",
    communityContext: "GrowthFlow Engineering",
    learningTag: false,
    earningTag: false,
    orgBuildingTag: false,
    learningIntensity: 0.64,
    earningIntensity: 0.62,
    orgBuildingIntensity: 0.58,
  };
};

export const computeValueLogOutcome = (draft: ValueLogDraft): ValueLogOutcome => {
  const contextIntensity = clamp(0, 1, draft.contextIntensity);
  const saocommonsEnabled = draft.wellbeingNode === "~~Performance";
  const domains: SaocommonsDomain[] = [];
  const selectedDomainIntensities: number[] = [];
  if (saocommonsEnabled) {
    if (draft.learningTag) {
      domains.push("~~Learning");
      selectedDomainIntensities.push(clamp(0, 1, draft.learningIntensity));
    }
    if (draft.earningTag) {
      domains.push("~~Earning");
      selectedDomainIntensities.push(clamp(0, 1, draft.earningIntensity));
    }
    if (draft.orgBuildingTag) {
      domains.push("~~OrgBuilding");
      selectedDomainIntensities.push(clamp(0, 1, draft.orgBuildingIntensity));
    }
  }

  const domainAverage =
    selectedDomainIntensities.length > 0
      ? selectedDomainIntensities.reduce((sum, value) => sum + value, 0) /
        selectedDomainIntensities.length
      : contextIntensity;
  const effectiveSignal = saocommonsEnabled
    ? clamp(0, 1, contextIntensity * 0.45 + domainAverage * 0.55)
    : contextIntensity;

  let base = (effectiveSignal - 0.5) * 0.08;
  if (draft.impactDirection === "increase") {
    base = Math.abs(base) + 0.004;
  } else if (draft.impactDirection === "decrease") {
    base = -Math.abs(base) - 0.01;
  } else {
    base *= 0.2;
  }

  const domainBonus = saocommonsEnabled
    ? selectedDomainIntensities.reduce((sum, value) => sum + (value - 0.5) * 0.01, 0)
    : 0;
  const wellbeingDelta = clamp(-0.08, 0.09, base + domainBonus);
  const auraDelta = clamp(-0.11, 0.13, wellbeingDelta * 1.65);
  const identityStateDelta = clamp(-0.1, 0.11, wellbeingDelta * 1.24);

  return {
    wellbeingDelta,
    auraDelta,
    identityStateDelta,
    saocommonsEnabled,
    saocommonsDomains: domains,
  };
};

const TIME_STREAM_CONFIG = {
  halfWidth: 5.2,
  baseY: 0.2,
  laneY: 0.36,
  rangeY: 0.39,
  minSpanMinutes: 5,
  snapMinutes: 5,
  defaultLiveWindowMinutes: 90,
} as const;

export class ValueLogScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(39, 1, 0.1, 120);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly clockGroup = new THREE.Group();
  private readonly timeInstrumentBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(TIME_STREAM_CONFIG.halfWidth * 2 + 0.96, 1.28),
    new THREE.MeshBasicMaterial({
      color: "#0c1a33",
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeStreamBase = new THREE.Mesh(
    new THREE.BoxGeometry(TIME_STREAM_CONFIG.halfWidth * 2 + 0.42, 0.12, 0.88),
    new THREE.MeshStandardMaterial({
      color: "#10233f",
      emissive: "#09162a",
      emissiveIntensity: 0.12,
      roughness: 0.72,
      metalness: 0.08,
    })
  );
  private readonly timeStreamLane = new THREE.Mesh(
    new THREE.BoxGeometry(TIME_STREAM_CONFIG.halfWidth * 2, 0.1, 0.4),
    new THREE.MeshStandardMaterial({
      color: "#254a78",
      emissive: "#244d80",
      emissiveIntensity: 0.3,
      roughness: 0.42,
      metalness: 0.14,
    })
  );
  private readonly timeRangeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.08, 0.34),
    new THREE.MeshStandardMaterial({
      color: "#86ccff",
      emissive: "#4a95cc",
      emissiveIntensity: 0.42,
      roughness: 0.32,
      metalness: 0.12,
      transparent: true,
      opacity: 0.92,
    })
  );
  private readonly timeRangeWrapMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.14, 0.46),
    new THREE.MeshStandardMaterial({
      color: "#9fdcff",
      emissive: "#6dc6ff",
      emissiveIntensity: 0.2,
      roughness: 0.4,
      metalness: 0.06,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
  );
  private readonly timeStartMarkerGlyph = createTimelineMarkerSprite("#b9deff", "start");
  private readonly timeEndMarkerGlyph = createTimelineMarkerSprite("#f0cfaf", "end");
  private readonly timeStartHandle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.032, 0.32),
    new THREE.MeshBasicMaterial({
      color: "#b9deff",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeEndHandle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.032, 0.32),
    new THREE.MeshBasicMaterial({
      color: "#f0cfaf",
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeStartJaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.024, 0.2),
    new THREE.MeshStandardMaterial({
      color: "#9ecfff",
      emissive: "#5e96d6",
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0,
    })
  );
  private readonly timeEndJaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.024, 0.2),
    new THREE.MeshStandardMaterial({
      color: "#eac7a9",
      emissive: "#c08a5b",
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0,
    })
  );
  private readonly timeNowMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.012, 0.34),
    new THREE.MeshBasicMaterial({
      color: "#ffd47e",
      transparent: true,
      opacity: 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeNowFootprint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.16),
    new THREE.MeshBasicMaterial({
      color: "#ffd580",
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeStartHitZone = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.7, 0.72),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  private readonly timeEndHitZone = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.7, 0.72),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  private readonly timeBladeCue = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.56),
    new THREE.MeshBasicMaterial({
      color: "#f4f8ff",
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  private readonly timeFutureMaskMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.1, 0.58),
    new THREE.MeshStandardMaterial({
      color: "#07101d",
      emissive: "#0a1627",
      emissiveIntensity: 0.12,
      roughness: 0.6,
      metalness: 0.06,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    })
  );
  private readonly timeBeforeStartMaskMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.1, 0.58),
    new THREE.MeshStandardMaterial({
      color: "#060c17",
      emissive: "#09121f",
      emissiveIntensity: 0.08,
      roughness: 0.62,
      metalness: 0.04,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  private readonly streamFlowNodes: THREE.Mesh[] = [];
  private readonly streamFlowSeeds: number[] = [];
  private readonly timeScaleTicks: TimeScaleTickVisual[] = [];
  private readonly timeSnapGuideTicks: THREE.Mesh[] = [];
  private token: THREE.Object3D;
  private tokenTrail: THREE.Mesh[] = [];

  private readonly auraBands = [
    this.createAuraBand(5.5, 6.2, "#92c9ff"),
    this.createAuraBand(6.5, 7.3, "#75b1ff"),
    this.createAuraBand(7.8, 8.8, "#7fd7c3"),
  ];

  /* ... rest of the fields ... */
  private readonly stageCards: StageVisual[] = [];
  private readonly contextNodes: ContextNodeVisual[] = [];
  private readonly domainNodes: DomainNodeVisual[] = [];
  private readonly deltaLabels: THREE.Sprite[] = [];
  private nowReadoutLabel: THREE.Sprite | null = null;
  private streamOriginLabel: THREE.Sprite | null = null;
  private rangeSummaryLabel: THREE.Sprite | null = null;
  private lastNowClockKey = "";
  private lastNowDayKey = "";
  private lastRangeSummaryKey = "";
  // ...remaining fields...

  private readonly deltaBars = {
    wellbeing: new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 1, 0.34),
      new THREE.MeshStandardMaterial({ color: "#75d68e", roughness: 0.5, metalness: 0.1 })
    ),
    aura: new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 1, 0.34),
      new THREE.MeshStandardMaterial({ color: "#77b3ff", roughness: 0.5, metalness: 0.1 })
    ),
    identity: new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 1, 0.34),
      new THREE.MeshStandardMaterial({ color: "#bd9bff", roughness: 0.5, metalness: 0.1 })
    ),
  };

  private readonly stageByStep: Record<WizardStep, StageVisual["id"]> = {
    select_time: "value_capture",
    select_wellbeing: "wellbeing",
    select_intensity: "wellbeing",
    select_performance: "saocommons",
    show_outcome: "outcome",
  };

  private draft: ValueLogDraft = createInitialValueLogDraft();
  private step: WizardStep = "select_time";
  private committedCount = 0;
  private outcome: ValueLogOutcome = computeValueLogOutcome(this.draft);
  private elapsedSeconds = 0;
  private timeRangeMidX = 0;
  private isMobileViewport = false;
  private readonly cameraLookAt = new THREE.Vector3(0, 0.65, 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private hasPointer = false;
  private activeClockHand: "start" | "end" | "range" | null = null;
  private dragAnchorMinutes = 0;
  private dragStartMinutes = 0;
  private dragEndMinutes = 0;
  private liveTimerActive = false;
  private liveTimerLastTickMs = 0;
  private timeCapturePhase: "start" | "end" = "start";
  private startHandleAdjusted = false;
  private hoveredContext: WellbeingContextNode | null = null;
  private hoveredDomain: DomainNodeVisual["domain"] | null = null;
  private hoveredTimeTarget: "start" | "end" | "range" | null = null;
  private readonly clockInteractionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4);
  private readonly clockInteractionPoint = new THREE.Vector3();
  private readonly clockInteractionLocal = new THREE.Vector3();
  private rippleMesh: THREE.Mesh | null = null;
  private rippleTime = 0;
  private isRippling = false;
  private isCommitting = false; // New flag to control the drop animation

  private readonly stringsGroup = new THREE.Group();
  private readonly stringsMaterial = new THREE.LineBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.15,
  });
  private readonly clockCenter = new THREE.Vector3(0, 4, 0);
  private readonly tokenTargetPos = new THREE.Vector3();
  private readonly cameraPresetPosition = new THREE.Vector3();
  private readonly cameraPresetLookAt = new THREE.Vector3();

  constructor(domElement: HTMLElement) {
    // ---- Photon Token Creation ----
    this.token = new THREE.Object3D();
    
    // Core photon (small, bright)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: "#f6c15b" })
    );
    this.token.add(core);

    // Glow halo (sprite)
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 226, 171, 1)");
      grad.addColorStop(0.3, "rgba(245, 177, 77, 0.7)");
      grad.addColorStop(1, "rgba(102, 58, 8, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glowSprite.scale.set(0.6, 0.6, 1);
    this.token.add(glowSprite);

    // Point Light attached to photon
    const light = new THREE.PointLight("#f6c15b", 1.2, 5);
    this.token.add(light);

    // Create tail segments
    for(let i = 0; i < 12; i++) {
        const seg = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 - (i * 0.0035), 8, 8),
            new THREE.MeshBasicMaterial({ 
                color: "#f5d184",
                transparent: true, 
                opacity: 0.4 - (i * 0.03),
                blending: THREE.AdditiveBlending
            })
        );
        this.tokenTrail.push(seg);
        this.root.add(seg); // Add to root so they stay in world space
    }

    this.scene.add(this.root);
    this.root.add(this.clockGroup);
    this.root.add(this.stringsGroup);

    // Ripple Mesh
    this.rippleMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.4, 64),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      })
    );
    this.rippleMesh.position.y = -5.0; // Bottom of chandelier
    this.rippleMesh.rotation.x = -Math.PI / 2;
    this.root.add(this.rippleMesh);

    this.clockGroup.position.set(0, 4, 0);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = 0.32;
    this.controls.maxPolarAngle = 1.42;

    this.setupLook();
    this.buildLayout();
    this.controls.target.set(0, 0.65, 0);
    this.controls.update();
    this.applyDraft();
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    this.isMobileViewport = isMobile;
    if (isMobile) {
      this.camera.fov = 46;
      this.controls.minDistance = 7;
      this.controls.maxDistance = 18;
    } else {
      this.camera.fov = 39;
      this.controls.minDistance = 6;
      this.controls.maxDistance = 16;
    }
    this.applyStepCameraPreset();
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setDraft(next: ValueLogDraft) {
    this.draft = this.normalizeDraftTimeRange(next);
    this.applyDraft();
  }

  patchDraft(patch: Partial<ValueLogDraft>) {
    const previousWellbeingNode = this.draft.wellbeingNode;
    this.draft = { ...this.draft, ...patch };
    if (patch.wellbeingNode && patch.wellbeingNode !== previousWellbeingNode) {
      this.draft.signalLabel = DEFAULT_SIGNAL_LABEL_BY_NODE[patch.wellbeingNode];
      this.draft.impactDirection = "increase";
    }
    if (this.draft.wellbeingNode !== "~~Performance") {
      this.draft.learningTag = false;
      this.draft.earningTag = false;
      this.draft.orgBuildingTag = false;
    }
    if (this.step === "select_performance" && this.draft.wellbeingNode !== "~~Performance") {
      this.step = "select_intensity";
    }
    this.step = this.ensureStepValid(this.step);
    this.applyDraft();
  }

  setStep(step: WizardStep) {
    this.step = this.ensureStepValid(step);
    if (this.step !== "select_time" && this.liveTimerActive) {
      this.liveTimerActive = false;
      this.liveTimerLastTickMs = 0;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  nextStep() {
    this.step = this.getNextStep(this.step);
    if (this.step !== "select_time" && this.liveTimerActive) {
      this.liveTimerActive = false;
      this.liveTimerLastTickMs = 0;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  prevStep() {
    this.step = this.getPreviousStep(this.step);
    if (this.step !== "select_time" && this.liveTimerActive) {
      this.liveTimerActive = false;
      this.liveTimerLastTickMs = 0;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  resetTimeCaptureFlow(seedDraft?: ValueLogDraft) {
    const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
    const nowValue = toLocalInputValue(now);
    const baseDraft = seedDraft ?? this.draft;
    this.timeCapturePhase = "start";
    this.startHandleAdjusted = false;
    this.activeClockHand = null;
    this.hoveredTimeTarget = null;
    this.liveTimerActive = false;
    this.liveTimerLastTickMs = 0;
    this.step = "select_time";
    this.draft = this.normalizeDraftTimeRange({
      ...baseDraft,
      startTime: nowValue,
      endTime: nowValue,
    });
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  commit(personId: string, roleHint?: string): IovValueLogEntry | null {
    if (!isValueLogCommitReady(this.draft)) {
      return null;
    }
    const entry = this.buildEntry(personId, roleHint || "");
    this.committedCount += 1;
    return entry;
  }

  beginPointerInteraction() {
    if (!this.hasPointer || this.step !== "select_time") return;
    let nextHand = this.raycastClockHand();
    if (nextHand === "range") {
      nextHand = this.timeCapturePhase;
    }
    if (nextHand === "end" && this.timeCapturePhase === "start" && !this.startHandleAdjusted) {
      return;
    }
    if (nextHand === "start") {
      this.timeCapturePhase = "start";
    } else if (nextHand === "end") {
      this.timeCapturePhase = "end";
    }
    this.activeClockHand = nextHand;
    if (this.activeClockHand) {
      if (this.liveTimerActive) {
        this.liveTimerActive = false;
        this.liveTimerLastTickMs = 0;
      }
      const startMinutes = minutesFromLocalInput(this.draft.startTime);
      const endMinutes = minutesFromLocalInput(this.draft.endTime);
      this.dragStartMinutes = startMinutes;
      this.dragEndMinutes = endMinutes;
      this.dragAnchorMinutes = snapMinutes(
        streamXToMinutes(this.clockInteractionLocal.x, TIME_STREAM_CONFIG.halfWidth),
        TIME_STREAM_CONFIG.snapMinutes
      );
      this.updateClockHandFromPointer();
    }
  }

  endPointerInteraction() {
    if (this.step === "select_time" && this.activeClockHand === "start") {
      this.startHandleAdjusted = true;
      this.timeCapturePhase = "end";
    }
    this.activeClockHand = null;
    this.updateTimeStreamPulse();
  }

  advanceTimeCapturePhase() {
    if (this.step !== "select_time") return;
    if (this.timeCapturePhase === "start") {
      this.startHandleAdjusted = true;
      this.timeCapturePhase = "end";
    }
    this.updateTimeStreamPulse();
  }

  playCommitDrop(durationMs = 320) {
    this.isCommitting = true;
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }

  setPointerFromCanvas(x: number, y: number, width: number, height: number) {
    this.pointerNdc.x = (x / width) * 2 - 1;
    this.pointerNdc.y = -(y / height) * 2 + 1;
    this.hasPointer = true;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    this.raycaster.ray.intersectPlane(this.clockInteractionPlane, this.clockInteractionPoint);
    this.clockInteractionLocal.copy(this.clockInteractionPoint).sub(this.clockGroup.position);
    if (this.activeClockHand) {
      this.updateClockHandFromPointer();
    }
    this.updatePointerHover();
  }

  clearPointer() {
    this.hasPointer = false;
    this.activeClockHand = null;
    this.hoveredContext = null;
    this.hoveredDomain = null;
    this.hoveredTimeTarget = null;
    this.updateContextNodes();
    this.updateDomainNodes();
    this.updateTimeStreamPulse();
  }

  selectFromPointer(isDouble = false): ValueLogSelection {
    if (!this.hasPointer) return { kind: null, key: null };
    const hit = this.raycastInteractive();
    if (!hit) return { kind: null, key: null };

    if (hit.type === "clock") {
      if (isDouble) {
        this.toggleLiveTimer();
      }
      if (!isDouble && this.step !== "select_time") {
        this.setStep("select_time");
      }
      return { kind: "clock", key: "clock" };
    }
    if (hit.type === "clock_hand") {
      if (isDouble) {
        this.toggleLiveTimer();
      } else if (hit.hand === "start") {
        this.timeCapturePhase = "start";
        this.updateTimeStreamPulse();
      } else if (hit.hand === "end" && this.startHandleAdjusted) {
        this.timeCapturePhase = "end";
        this.updateTimeStreamPulse();
      }
      return { kind: "clock", key: "clock" };
    }

    if (hit.type === "context") {
      this.patchDraft({ wellbeingNode: hit.key });
      return { kind: "context", key: hit.key };
    }

    if (hit.type === "domain") {
      if (this.draft.wellbeingNode !== "~~Performance") {
        return { kind: "domain", key: hit.domain };
      }
      if (this.step !== "select_performance" && this.step !== "show_outcome") {
        this.setStep("select_performance");
      }
      if (this.step === "select_performance" || this.step === "show_outcome") {
        if (hit.domain === "~~Learning") {
          this.patchDraft({ learningTag: !this.draft.learningTag });
        } else if (hit.domain === "~~Earning") {
          this.patchDraft({ earningTag: !this.draft.earningTag });
        } else {
          this.patchDraft({ orgBuildingTag: !this.draft.orgBuildingTag });
        }
      }
      return { kind: "domain", key: hit.domain };
    }
    return { kind: null, key: null };
  }

  update(deltaSeconds: number) {
    this.elapsedSeconds += deltaSeconds;
    this.updateLiveTimer();

    // Token trickles down the chandelier based on the current step
    const targetPos = this.tokenTargetPos;
    
    if (this.step === "select_time") {
      targetPos.set(
        this.timeRangeMidX,
        4.64 + Math.sin(this.elapsedSeconds * 1.15) * 0.05,
        Math.sin(this.elapsedSeconds * 0.82) * 0.22
      );
    } else if (this.step === "select_wellbeing") {
      if (this.hoveredContext) {
        const node = this.contextNodes.find((n) => n.key === this.hoveredContext);
        if (node) {
          targetPos.copy(node.mesh.position);
          targetPos.y += 0.6 + Math.sin(this.elapsedSeconds * 4) * 0.05;
        }
      } else if (this.draft.wellbeingNode) {
        const node = this.contextNodes.find((n) => n.key === this.draft.wellbeingNode);
        if (node) {
          targetPos.copy(node.mesh.position);
          targetPos.y += 0.6 + Math.sin(this.elapsedSeconds * 4) * 0.05;
        }
      } else {
        targetPos.set(0, 0.5 + Math.sin(this.elapsedSeconds * 2) * 0.1, 0);
      }
    } else if (this.step === "select_intensity") {
      const node = this.contextNodes.find((n) => n.key === this.draft.wellbeingNode);
      if (node) {
        targetPos.copy(node.mesh.position);
        targetPos.y += 1.0 + Math.sin(this.elapsedSeconds * 3.5) * 0.05;
      } else {
        targetPos.set(0, 0.8 + Math.sin(this.elapsedSeconds * 2) * 0.1, 0);
      }
    } else if (this.step === "select_performance") {
      if (this.hoveredDomain) {
        const node = this.domainNodes.find((n) => n.domain === this.hoveredDomain);
        if (node) {
          targetPos.copy(node.mesh.position);
          targetPos.y += 0.6 + Math.sin(this.elapsedSeconds * 5) * 0.05;
        }
      } else {
        const perfNode = this.contextNodes.find((n) => n.key === "~~Performance");
        if (perfNode) {
          targetPos.copy(perfNode.mesh.position);
          targetPos.y -= 1.2 + Math.sin(this.elapsedSeconds * 3) * 0.05; // Hang between Performance and SAOcommons
        }
      }
    } else if (this.step === "show_outcome") {
      if (this.isCommitting) {
        // Keep commit motion near center so handoff to impact scene feels continuous.
        targetPos.set(0, -0.25, 0);
        this.token.position.lerp(targetPos, 12.0 * deltaSeconds);
      } else {
        const yPos = 0.55 + Math.sin(this.elapsedSeconds * 2.0) * 0.1;
        targetPos.set(0, yPos, 0);
        this.token.position.lerp(targetPos, 4.5 * deltaSeconds);
      }

      this.isRippling = false;
      if (this.rippleMesh) this.rippleMesh.visible = false;
    } else {
      this.isRippling = false; // Reset if step changes
      
      if (this.step !== "show_outcome") {
          this.isCommitting = false; // Reset drop flag when we truly leave the outcome step
      }
      
      if (this.rippleMesh) {
          this.rippleMesh.visible = false;
      }
    }

    // Smoothly interpolate token position (only if not in special commit mode which handles its own lerp)
    if (this.step !== "show_outcome") {
        this.token.position.lerp(targetPos, 7.0 * deltaSeconds);
    }

    // Ripple Animation
    if (this.isRippling && this.rippleMesh) {
        this.rippleTime += deltaSeconds * 1.5;
        this.rippleMesh.visible = true;
        
        // Loop the ripple
        const loopTime = this.rippleTime % 2.0;
        const scale = 1 + loopTime * 6.0;
        this.rippleMesh.scale.set(scale, scale, 1);
        
        const opacity = Math.max(0, 0.8 - loopTime * 0.4);
        (this.rippleMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    } else if (this.rippleMesh) {
        this.rippleMesh.visible = false;
        this.rippleTime = 0;
    }

    // Update trail
    // Shift positions down
    for (let i = this.tokenTrail.length - 1; i > 0; i--) {
      const current = this.tokenTrail[i];
      const prev = this.tokenTrail[i - 1];
      if (current && prev) {
        current.position.copy(prev.position);
      }
    }
    // Set first trail segment to current position
    if (this.tokenTrail.length > 0 && this.tokenTrail[0]) {
      this.tokenTrail[0].position.copy(this.token.position);
    }

    // Aura expands around the full clock field, not just the center body.
    const auraPulse = 1 + Math.sin(this.elapsedSeconds * 1.8) * 0.03;
    const auraDirection = this.outcome.auraDelta >= 0 ? 1 : -1;
    const auraBase = 1 + this.outcome.auraDelta * 1.7;
    this.auraBands.forEach((band, index) => {
      const mat = band.material as THREE.MeshBasicMaterial;
      const spread = 0.04 * index;
      const scale = clamp(0.72, 1.45, auraBase + spread + auraDirection * 0.02 * auraPulse);
      band.scale.setScalar(scale);
      mat.opacity =
        0.07 +
        Math.min(0.34, Math.abs(this.outcome.auraDelta) * 1.55) +
        0.03 * Math.sin(this.elapsedSeconds * (1.4 + index * 0.5));
    });

    const highlightedStage = this.stageByStep[this.step];
    this.stageCards.forEach((stage) => {
      const material = stage.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = stage.id === highlightedStage ? 0.24 : 0.05;
    });
    if (this.hasPointer) {
      this.updatePointerHover();
    }
    if (this.step === "select_time") {
      this.updateNowMarkerAndFlow();
      this.updateTimeStreamPulse();
    }
    this.controls.update();
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  getSummary(): ValueLogSummary {
    const stepIndex = WIZARD_STEP_ORDER.indexOf(this.step);
    const stepLabels: Record<WizardStep, string> = {
      select_time: "Select Time Slice",
      select_wellbeing: "Add Wellbeing Context",
      select_intensity: "Set Context Intensity",
      select_performance: "Performance Domains",
      show_outcome: "Review & Commit",
    };

    const canCommit = isValueLogCommitReady(this.draft);
    return {
      step: this.step,
      stepIndex: stepIndex < 0 ? 0 : stepIndex,
      stepLabel:
        this.step === "select_time"
          ? this.timeCapturePhase === "start"
            ? "Mark When It Began"
            : "Mark When It Ended"
          : stepLabels[this.step],
      draft: this.draft,
      outcome: this.outcome,
      committedCount: this.committedCount,
      canCommit,
      sceneActionHint: getSceneActionHint(this.step, this.draft, canCommit, this.timeCapturePhase),
      timeCapturePhase: this.step === "select_time" ? this.timeCapturePhase : undefined,
    };
  }

  dispose() {
    this.controls.dispose();
    this.disposeStringsGroup();
    this.stringsMaterial.dispose();
    this.disposeGroup(this.root);
  }

  private setupLook() {
    this.scene.background = new THREE.Color("#070f1d");
    this.scene.fog = new THREE.Fog("#070f1d", 18, 48);

    this.scene.add(new THREE.AmbientLight("#8aa5cb", 0.62));

    const key = new THREE.DirectionalLight("#d6e7ff", 1.2);
    key.position.set(6, 10, 7);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#4f86c7", 0.66);
    fill.position.set(-8, 5, -6);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight("#8ed6ff", 0.46);
    rim.position.set(0, 8, -9);
    this.scene.add(rim);

    this.camera.position.set(0.1, 6.4, 12.6);
    this.camera.lookAt(0, 0.65, 0);
  }

  private buildLayout() {
    this.timeInstrumentBackdrop.position.set(0, TIME_STREAM_CONFIG.laneY + 0.18, -0.42);
    this.timeStreamBase.position.y = TIME_STREAM_CONFIG.baseY;
    this.timeStreamLane.position.y = TIME_STREAM_CONFIG.laneY;
    this.timeRangeMesh.position.y = TIME_STREAM_CONFIG.rangeY;
    this.timeRangeWrapMesh.position.y = TIME_STREAM_CONFIG.rangeY;
    this.timeStartHandle.position.y = TIME_STREAM_CONFIG.laneY + 0.12;
    this.timeEndHandle.position.y = TIME_STREAM_CONFIG.laneY + 0.12;
    this.timeStartHandle.rotation.set(0, 0, 0);
    this.timeEndHandle.rotation.set(0, 0, 0);
    this.timeStartJaw.position.y = TIME_STREAM_CONFIG.laneY + 0.043;
    this.timeEndJaw.position.y = TIME_STREAM_CONFIG.laneY + 0.043;
    this.timeStartJaw.rotation.set(0, 0, 0);
    this.timeEndJaw.rotation.set(0, 0, 0);
    this.timeStartMarkerGlyph.scale.set(0.18, 0.3, 1);
    this.timeEndMarkerGlyph.scale.set(0.18, 0.3, 1);
    this.timeStartMarkerGlyph.center.set(0.5, 0.08);
    this.timeEndMarkerGlyph.center.set(0.5, 0.08);
    this.timeNowMarker.position.y = TIME_STREAM_CONFIG.laneY + 0.11;
    this.timeNowFootprint.position.y = TIME_STREAM_CONFIG.laneY + 0.005;
    this.timeNowFootprint.rotation.x = -Math.PI / 2;
    this.timeStartHitZone.position.y = TIME_STREAM_CONFIG.laneY + 0.12;
    this.timeEndHitZone.position.y = TIME_STREAM_CONFIG.laneY + 0.12;
    this.timeBladeCue.position.y = TIME_STREAM_CONFIG.laneY + 0.155;
    this.timeBladeCue.rotation.z = -0.22;
    this.timeFutureMaskMesh.position.y = TIME_STREAM_CONFIG.rangeY + 0.003;
    this.timeBeforeStartMaskMesh.position.y = TIME_STREAM_CONFIG.rangeY + 0.002;
    const hatchTexture = getHatchTexture();
    const futureMaskMaterial = this.timeFutureMaskMesh.material as THREE.MeshStandardMaterial;
    const beforeMaskMaterial = this.timeBeforeStartMaskMesh.material as THREE.MeshStandardMaterial;
    futureMaskMaterial.map = hatchTexture;
    beforeMaskMaterial.map = hatchTexture;
    futureMaskMaterial.needsUpdate = true;
    beforeMaskMaterial.needsUpdate = true;

    // Time-slice contract: one day ribbon, one seam for NOW, two thin blade markers.
    this.timeStartHandle.scale.set(1, 1, 1);
    this.timeEndHandle.scale.set(1, 1, 1);
    this.timeStartJaw.scale.set(1, 1, 1);
    this.timeEndJaw.scale.set(1, 1, 1);

    this.clockGroup.add(
      this.timeInstrumentBackdrop,
      this.timeStreamBase,
      this.timeStreamLane,
      this.timeRangeMesh,
      this.timeRangeWrapMesh,
      this.timeStartMarkerGlyph,
      this.timeEndMarkerGlyph,
      this.timeStartHandle,
      this.timeEndHandle,
      this.timeStartJaw,
      this.timeEndJaw,
      this.timeNowMarker,
      this.timeNowFootprint,
      this.timeStartHitZone,
      this.timeEndHitZone,
      this.timeBladeCue,
      this.timeFutureMaskMesh,
      this.timeBeforeStartMaskMesh
    );

    for (let minute = 0; minute <= 1440; minute += 30) {
      const isMajor = minute % 180 === 0 || minute === 1440;
      const x =
        minute === 1440
          ? TIME_STREAM_CONFIG.halfWidth
          : minutesToStreamX(minute, TIME_STREAM_CONFIG.halfWidth);
      const tick = new THREE.Mesh(
        new THREE.PlaneGeometry(isMajor ? 0.016 : 0.008, isMajor ? 0.13 : 0.07),
        new THREE.MeshBasicMaterial({
          color: isMajor ? "#9abce7" : "#6c8daf",
          transparent: true,
          opacity: isMajor ? 0.78 : 0.42,
          depthWrite: false,
        })
      );
      tick.position.set(x, TIME_STREAM_CONFIG.laneY + (isMajor ? 0.12 : 0.09), 0.18);
      this.clockGroup.add(tick);

      let label: THREE.Sprite | null = null;
      if (isMajor) {
        const hourLabel = minute === 1440 ? "24" : String(Math.floor(minute / 60)).padStart(2, "0");
        label = this.createMinimalTextSprite(hourLabel, 11);
        label.scale.set(0.44, 0.17, 1);
        label.position.set(x, TIME_STREAM_CONFIG.laneY + 0.24, 0.01);
        this.clockGroup.add(label);
      }

      this.timeScaleTicks.push({
        minute,
        tier: isMajor ? "major" : "minor",
        mesh: tick,
        label,
      });
    }

    for (let index = 0; index < 13; index += 1) {
      const snapTick = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.075, 0.12),
        new THREE.MeshBasicMaterial({
          color: "#d8ecff",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      snapTick.position.y = TIME_STREAM_CONFIG.laneY + 0.11;
      this.timeSnapGuideTicks.push(snapTick);
      this.clockGroup.add(snapTick);
    }

    for (let index = 0; index < 18; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 8),
        new THREE.MeshBasicMaterial({
          color: "#8fd0ff",
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.streamFlowSeeds.push(Math.random() * 1440);
      this.streamFlowNodes.push(particle);
      this.clockGroup.add(particle);
    }

    this.root.add(this.token); // Add token to root for global positioning

    this.auraBands.forEach((band) => {
      band.rotation.x = -Math.PI / 2;
      band.position.y = -5.0; // Move aura to the bottom (Identity layer)
      this.root.add(band);
    });

    this.addContextNodes();
    this.addDomainNodes();
    this.addStageCards();

    this.deltaBars.wellbeing.position.set(-1.1, -5.0, 0);
    this.deltaBars.aura.position.set(0, -5.0, 0);
    this.deltaBars.identity.position.set(1.1, -5.0, 0);
    this.root.add(this.deltaBars.wellbeing, this.deltaBars.aura, this.deltaBars.identity);

    const deltaLabels = [
      { text: "Wellbeing", x: -1.1 },
      { text: "Aura", x: 0 },
      { text: "IdentityState", x: 1.1 },
    ];
    deltaLabels.forEach((entry) => {
      const label = this.createTextSprite(entry.text, { width: 200, height: 70, fontSize: 18 });
      label.position.set(entry.x, -4.0, 0);
      this.deltaLabels.push(label);
      this.root.add(label);
    });
  }

  private addContextNodes() {
    // Draw the Infinity Loop (Lemniscate)
    const curvePoints = [];
    const scale = 4.5;
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * Math.PI * 2;
      const x = (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      const y = (scale * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      curvePoints.push(new THREE.Vector3(x, y, 0));
    }
    const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMaterial = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4 });
    const infinityLoop = new THREE.Line(curveGeometry, curveMaterial);
    this.root.add(infinityLoop);

    const defs: Array<{ key: WellbeingContextNode; label: string; color: string; t: number }> = [
      { key: "~~Physiology", label: "Physiology", color: "#79c5ff", t: Math.PI * 0.15 },
      { key: "~~Emotion", label: "Emotion", color: "#ff8d9a", t: Math.PI * 0.0 },
      { key: "~~Feeling", label: "Feeling", color: "#a7c7ff", t: Math.PI * 0.85 },
      { key: "~~Thought", label: "Thought", color: "#a5ffcc", t: Math.PI * 1.15 },
      { key: "~~Habit", label: "Habit", color: "#fff2b0", t: Math.PI * 1.0 },
      { key: "~~Performance", label: "Performance", color: "#d2b1ff", t: Math.PI * 1.85 },
    ];

    defs.forEach((def) => {
      const x = (scale * Math.cos(def.t)) / (1 + Math.sin(def.t) * Math.sin(def.t));
      const y = (scale * Math.sin(def.t) * Math.cos(def.t)) / (1 + Math.sin(def.t) * Math.sin(def.t));
      const z = 0; // Keep them flat on the Z axis for the infinity loop
      
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 28, 28),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.2,
          roughness: 0.3,
          metalness: 0.08,
        })
      );
      mesh.position.set(x, y, z);
      this.root.add(mesh);

      const label = this.createTextSprite(def.label, { width: 152, height: 44, fontSize: 14 });
      label.position.set(x, y + 0.74, z);
      this.root.add(label);

      this.contextNodes.push({ key: def.key, mesh, label, angle: def.t });
    });
  }

  private addDomainNodes() {
    const defs: Array<{ domain: DomainNodeVisual["domain"]; label: string; offset: number }> = [
      { domain: "~~Learning", label: "Learning", offset: -0.3 },
      { domain: "~~Earning", label: "Earning", offset: 0 },
      { domain: "~~OrgBuilding", label: "OrgBuilding", offset: 0.3 },
    ];

    defs.forEach((def) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16),
        new THREE.MeshStandardMaterial({
          color: "#f8e680",
          emissive: "#b18a2a",
          emissiveIntensity: 0.22,
          roughness: 0.25,
          metalness: 0.12,
        })
      );
      this.root.add(mesh);

      const label = this.createTextSprite(def.label, { width: 170, height: 50, fontSize: 16 });
      this.root.add(label);

      this.domainNodes.push({ domain: def.domain, mesh, label });
    });
  }

  private addStageCards() {
    const defs = [
      {
        id: "value_capture" as const,
        label: "ValueCapture",
        color: "#f3bf73",
        position: new THREE.Vector3(-5.8, 0.52, 4.2),
      },
      {
        id: "wellbeing" as const,
        label: "Wellbeing",
        color: "#7fd09b",
        position: new THREE.Vector3(0, 0.52, 5.4),
      },
      {
        id: "saocommons" as const,
        label: "SAOcommons",
        color: "#b995ff",
        position: new THREE.Vector3(5.8, 0.52, 4.2),
      },
      {
        id: "outcome" as const,
        label: "Outcome",
        color: "#7fb3ff",
        position: new THREE.Vector3(0, 0.52, -5.6),
      },
    ];

    defs.forEach((def) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.22, 1.8),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.05,
          roughness: 0.58,
          metalness: 0.08,
          transparent: true,
          opacity: 0.9,
        })
      );
      mesh.position.copy(def.position);
      this.root.add(mesh);

      const label = this.createTextSprite(def.label, { width: 260, height: 68, fontSize: 22 });
      label.position.set(def.position.x, 1.2, def.position.z);
      this.root.add(label);

      this.stageCards.push({ id: def.id, mesh, label });
    });
  }

  private applyDraft() {
    const derivedSignalScore = deriveSignalScore(this.draft);
    if (Math.abs(this.draft.signalScore - derivedSignalScore) > 0.0001) {
      this.draft = { ...this.draft, signalScore: derivedSignalScore };
    }
    this.step = this.ensureStepValid(this.step);
    this.outcome = computeValueLogOutcome(this.draft);

    const startMinutes = minutesFromLocalInput(this.draft.startTime);
    const endMinutes = minutesFromLocalInput(this.draft.endTime);
    const minuteSpan = Math.max(TIME_STREAM_CONFIG.minSpanMinutes, endMinutes - startMinutes);
    const midMinutes = startMinutes + minuteSpan * 0.5;
    this.timeRangeMidX = minutesToStreamX(midMinutes, TIME_STREAM_CONFIG.halfWidth);

    this.updateTimeStreamRange(startMinutes, endMinutes);
    this.updateNowMarkerAndFlow();
    this.updateTimeStreamPulse();
    this.updateContextNodes();
    this.updateDomainNodes();
    this.updateStrings();

    this.applyDeltaBar(this.deltaBars.wellbeing, this.outcome.wellbeingDelta);
    this.applyDeltaBar(this.deltaBars.aura, this.outcome.auraDelta);
    this.applyDeltaBar(this.deltaBars.identity, this.outcome.identityStateDelta);

    const auraColor = this.outcome.auraDelta >= 0 ? "#87d1ff" : "#ff9cac";
    this.auraBands.forEach((band) => {
      const material = band.material as THREE.MeshBasicMaterial;
      material.color.set(auraColor);
    });

    this.applyStepVisibility();
    if (this.step === "select_time" && this.activeClockHand === null) {
      this.applyStepCameraPreset();
    }
  }

  private updateTimeStreamRange(startMinutes: number, endMinutes: number) {
    const startX = minutesToStreamX(startMinutes, TIME_STREAM_CONFIG.halfWidth);
    const endX = minutesToStreamX(endMinutes, TIME_STREAM_CONFIG.halfWidth);

    this.timeStartHandle.position.x = startX;
    this.timeEndHandle.position.x = endX;
    const startGlyphX =
      this.timeCapturePhase === "start" && !this.startHandleAdjusted ? startX - 0.04 : startX;
    this.timeStartMarkerGlyph.position.set(startGlyphX, TIME_STREAM_CONFIG.laneY + 0.12, 0.22);
    this.timeEndMarkerGlyph.position.set(endX, TIME_STREAM_CONFIG.laneY + 0.12, 0.22);
    this.timeStartJaw.position.x = startX;
    this.timeEndJaw.position.x = endX;
    this.timeStartHitZone.position.x = startX;
    this.timeEndHitZone.position.x = endX;
    const centerX = (startX + endX) * 0.5;
    const width = Math.max(0.05, Math.abs(endX - startX));
    this.timeRangeMesh.visible = true;
    this.timeRangeMesh.scale.set(width, 1, 1);
    this.timeRangeMesh.position.x = centerX;
    this.timeRangeWrapMesh.visible = true;
    this.timeRangeWrapMesh.scale.set(width + 0.06, 1, 1);
    this.timeRangeWrapMesh.position.x = centerX;
  }

  private updateTimeStreamPulse() {
    const t = this.elapsedSeconds;
    const handlePulse = 1 + Math.sin(t * 3.2) * 0.05;
    const activePulse = 1 + Math.sin(t * 4.5) * 0.08;
    const activeMinute =
      this.timeCapturePhase === "start"
        ? minutesFromLocalInput(this.draft.startTime)
        : minutesFromLocalInput(this.draft.endTime);

    const rangeMaterial = this.timeRangeMesh.material as THREE.MeshStandardMaterial;
    const wrapMaterial = this.timeRangeWrapMesh.material as THREE.MeshStandardMaterial;
    const laneMaterial = this.timeStreamLane.material as THREE.MeshStandardMaterial;
    const futureMaskMaterial = this.timeFutureMaskMesh.material as THREE.MeshStandardMaterial;
    const beforeMaskMaterial = this.timeBeforeStartMaskMesh.material as THREE.MeshStandardMaterial;
    const startMaterial = this.timeStartHandle.material as THREE.MeshBasicMaterial;
    const endMaterial = this.timeEndHandle.material as THREE.MeshBasicMaterial;
    const startJawMaterial = this.timeStartJaw.material as THREE.MeshStandardMaterial;
    const endJawMaterial = this.timeEndJaw.material as THREE.MeshStandardMaterial;
    const startGlyphMaterial = this.timeStartMarkerGlyph.material as THREE.SpriteMaterial;
    const endGlyphMaterial = this.timeEndMarkerGlyph.material as THREE.SpriteMaterial;
    const nowMaterial = this.timeNowMarker.material as THREE.MeshBasicMaterial;
    const nowFootprintMaterial = this.timeNowFootprint.material as THREE.MeshBasicMaterial;
    const bladeCueMaterial = this.timeBladeCue.material as THREE.MeshBasicMaterial;

    laneMaterial.emissiveIntensity = 0.22 + Math.sin(t * 1.8) * 0.05;
    const rangeHot = this.hoveredTimeTarget === "range" || this.activeClockHand === "range";
    rangeMaterial.emissiveIntensity = (rangeHot ? 0.48 : 0.36) + Math.sin(t * 2.6) * 0.06;
    wrapMaterial.emissiveIntensity = (rangeHot ? 0.3 : 0.18) + Math.sin(t * 2.4) * 0.05;
    this.timeRangeMesh.position.y = TIME_STREAM_CONFIG.rangeY + Math.sin(t * 2.4) * 0.006;
    this.timeRangeWrapMesh.position.y = this.timeRangeMesh.position.y;
    const startSelected = this.timeCapturePhase === "start";
    const endSelected = this.timeCapturePhase === "end";

    this.timeStartHandle.scale.set(
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected
        ? 1.1
        : 1.0,
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected
        ? 1.04 * activePulse
        : 1.01 * handlePulse,
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected
        ? 1
        : 1.0
    );
    this.timeEndHandle.scale.set(
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected
        ? 1.1
        : 1.0,
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected
        ? 1.04 * activePulse
        : 1.01 * handlePulse,
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected
        ? 1
        : 1.0
    );
    this.timeStartJaw.scale.set(
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected
        ? 1.2
        : 1,
      1,
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected ? 1.08 : 1
    );
    this.timeEndJaw.scale.set(
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected
        ? 1.2
        : 1,
      1,
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected ? 1.08 : 1
    );
    startMaterial.opacity = 0;
    endMaterial.opacity = 0;
    startJawMaterial.opacity = 0;
    endJawMaterial.opacity = 0;
    startJawMaterial.emissiveIntensity = 0;
    endJawMaterial.emissiveIntensity = 0;
    startGlyphMaterial.opacity = startSelected ? 0.9 : this.startHandleAdjusted ? 0.8 : 0.62;
    endGlyphMaterial.opacity = endSelected ? 0.9 : 0.68;
    this.timeStartMarkerGlyph.scale.set(
      (this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected ? 0.22 : 0.18) *
        handlePulse,
      this.hoveredTimeTarget === "start" || this.activeClockHand === "start" || startSelected ? 0.36 : 0.3,
      1
    );
    this.timeEndMarkerGlyph.scale.set(
      (this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected ? 0.22 : 0.18) *
        handlePulse,
      this.hoveredTimeTarget === "end" || this.activeClockHand === "end" || endSelected ? 0.36 : 0.3,
      1
    );
    futureMaskMaterial.opacity = 0.5 + Math.sin(t * 1.1) * 0.03;
    beforeMaskMaterial.opacity = 0.4 + Math.sin(t * 0.8 + 0.6) * 0.02;
    nowMaterial.opacity = 0.68 + Math.sin(t * 4.4) * 0.06;
    this.timeNowMarker.scale.set(1, 1 + Math.sin(t * 2.8) * 0.03, 1);
    nowFootprintMaterial.opacity = 0.1 + Math.sin(t * 2.9) * 0.03;

    this.timeScaleTicks.forEach((tick) => {
      const material = tick.mesh.material as THREE.MeshBasicMaterial;
      const deltaMinutes = Math.abs(tick.minute - activeMinute);
      const nearActive = deltaMinutes <= 30;
      material.opacity =
        tick.tier === "major"
          ? nearActive
            ? 0.96
            : 0.72
          : nearActive
            ? 0.58
            : 0.26;
      tick.mesh.scale.y =
        tick.tier === "major"
          ? nearActive
            ? 1.12
            : 1
          : nearActive
            ? 1.08
            : 1;
      if (tick.label) {
        const labelMaterial = tick.label.material as THREE.SpriteMaterial;
        labelMaterial.opacity = nearActive ? 0.98 : this.isMobileViewport ? 0.7 : 0.84;
      }
    });

    const cueTarget =
      this.activeClockHand === "start" || this.hoveredTimeTarget === "start"
        ? "start"
        : this.activeClockHand === "end" || this.hoveredTimeTarget === "end"
          ? "end"
          : null;
    if (cueTarget) {
      const cueX = cueTarget === "start" ? this.timeStartHandle.position.x : this.timeEndHandle.position.x;
      const cueColor = cueTarget === "start" ? "#d7ecff" : "#ffe2c7";
      bladeCueMaterial.color.set(cueColor);
      bladeCueMaterial.opacity =
        this.activeClockHand === cueTarget ? 0.62 : 0.32 + Math.sin(t * 3.8) * 0.06;
      this.timeBladeCue.position.x = cueX + (cueTarget === "start" ? 0.06 : -0.06);
      this.timeBladeCue.visible = true;
    } else {
      this.timeBladeCue.visible = false;
    }

    const snapCenterX =
      this.timeCapturePhase === "start" ? this.timeStartHandle.position.x : this.timeEndHandle.position.x;
    this.timeSnapGuideTicks.forEach((tick, index) => {
      const offset = index - Math.floor(this.timeSnapGuideTicks.length / 2);
      const minute = activeMinute + offset * TIME_STREAM_CONFIG.snapMinutes;
      const x = minutesToStreamX(clamp(0, 1439, minute), TIME_STREAM_CONFIG.halfWidth);
      tick.position.x = x;
      const material = tick.material as THREE.MeshBasicMaterial;
      const distance = Math.abs(offset);
      const inBounds = x >= -TIME_STREAM_CONFIG.halfWidth && x <= TIME_STREAM_CONFIG.halfWidth;
      tick.visible =
        this.step === "select_time" &&
        inBounds &&
        (this.activeClockHand !== null || this.hoveredTimeTarget === "start" || this.hoveredTimeTarget === "end");
      material.opacity = distance === 0 ? 0.96 : Math.max(0, 0.62 - distance * 0.08);
      tick.scale.y = distance <= 1 ? 1.32 : 1.08;
      tick.position.z = distance === 0 ? 0.02 : 0;
    });
  }

  private updateLiveTimer() {
    if (!this.liveTimerActive) return;
    const nowMs = Date.now();
    if (this.liveTimerLastTickMs > 0 && nowMs - this.liveTimerLastTickMs < 1000) return;
    this.liveTimerLastTickMs = nowMs;
    const now = snapDateToMinutes(new Date(nowMs), TIME_STREAM_CONFIG.snapMinutes);
    this.applyClockRange(minutesFromLocalInput(this.draft.startTime), minutesFromDate(now));
  }

  private updateNowMarkerAndFlow() {
    const actualNow = new Date();
    const now = snapDateToMinutes(actualNow, TIME_STREAM_CONFIG.snapMinutes);
    const nowMinute = minutesFromDate(actualNow) + actualNow.getSeconds() / 60;
    const nowX = minutesToStreamX(nowMinute, TIME_STREAM_CONFIG.halfWidth);
    const nowMarkerBaseY = TIME_STREAM_CONFIG.laneY + 0.12;
    this.timeNowMarker.position.x = nowX;
    this.timeNowMarker.position.y = nowMarkerBaseY;
    this.timeNowFootprint.position.x = nowX;
    this.timeNowFootprint.position.y = TIME_STREAM_CONFIG.laneY + 0.015;
    this.timeNowFootprint.scale.setScalar(1 + Math.sin(this.elapsedSeconds * 3.4) * 0.05);

    const futureWidth = Math.max(0.02, TIME_STREAM_CONFIG.halfWidth - nowX);
    this.timeFutureMaskMesh.scale.set(futureWidth, 1, 1);
    this.timeFutureMaskMesh.position.x = nowX + futureWidth * 0.5;
    this.timeFutureMaskMesh.visible = this.step === "select_time" && nowMinute < 1439;

    const startMinutes = minutesFromLocalInput(this.draft.startTime);
    const startX = minutesToStreamX(startMinutes, TIME_STREAM_CONFIG.halfWidth);
    const beforeWidth = Math.max(0.02, startX + TIME_STREAM_CONFIG.halfWidth);
    const showBeforeMask =
      this.step === "select_time" &&
      this.timeCapturePhase === "end" &&
      this.startHandleAdjusted &&
      beforeWidth > 0.04;
    this.timeBeforeStartMaskMesh.visible = showBeforeMask;
    if (showBeforeMask) {
      this.timeBeforeStartMaskMesh.scale.set(beforeWidth, 1, 1);
      this.timeBeforeStartMaskMesh.position.x = -TIME_STREAM_CONFIG.halfWidth + beforeWidth * 0.5;
    }

    this.streamFlowNodes.forEach((node, index) => {
      const seed = this.streamFlowSeeds[index] ?? 0;
      const minutes = (seed + this.elapsedSeconds * (22 + (index % 5) * 4)) % 1440;
      node.visible = minutes <= nowMinute;
      node.position.x = minutesToStreamX(minutes, TIME_STREAM_CONFIG.halfWidth);
      node.position.y =
        TIME_STREAM_CONFIG.laneY +
        Math.sin(this.elapsedSeconds * 2.6 + index * 0.35) * 0.02 +
        (index % 2 === 0 ? 0.03 : -0.03);
      node.position.z = (index % 3 === 0 ? 0.12 : index % 3 === 1 ? -0.12 : 0);
    });

    const dayKey = formatLocalDate(actualNow);
    if (dayKey !== this.lastNowDayKey) {
      this.lastNowDayKey = dayKey;
      this.streamOriginLabel = this.replaceReadoutLabel(
        this.streamOriginLabel,
        `Today · ${dayKey}`,
        { width: 250, height: 46, fontSize: 14, minimal: true },
        this.clockGroup
      );
    }
    if (this.streamOriginLabel) {
      this.streamOriginLabel.position.set(
        -TIME_STREAM_CONFIG.halfWidth + 0.78,
        TIME_STREAM_CONFIG.laneY + 0.26,
        0
      );
      this.streamOriginLabel.scale.set(this.isMobileViewport ? 1.18 : 1.32, 0.18, 1);
    }

    const nowClockKey = formatRibbonClock(actualNow, true);
    if (nowClockKey !== this.lastNowClockKey) {
      this.lastNowClockKey = nowClockKey;
      const nowText = `Now ${nowClockKey}`;
      this.nowReadoutLabel = this.replaceReadoutLabel(
        this.nowReadoutLabel,
        nowText,
        {
          width: this.isMobileViewport ? 176 : 164,
          height: 30,
          fontSize: 10,
          minimal: false,
        },
        this.clockGroup
      );
    }
    if (this.nowReadoutLabel) {
      this.nowReadoutLabel.position.set(
        clamp(-TIME_STREAM_CONFIG.halfWidth + 0.95, TIME_STREAM_CONFIG.halfWidth - 0.95, nowX + 0.14),
        TIME_STREAM_CONFIG.laneY - 0.09,
        0
      );
      this.nowReadoutLabel.scale.set(this.isMobileViewport ? 0.82 : 0.88, 0.11, 1);
    }

    const startDate = parseLocalInputDate(this.draft.startTime) ?? now;
    const endDate = parseLocalInputDate(this.draft.endTime) ?? now;
    const durationMinutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    const rangeSummary =
      this.timeCapturePhase === "start"
        ? ""
        : `${formatRibbonClock(startDate)} -> ${formatRibbonClock(endDate)}  ·  ${formatDurationLabel(
            Math.max(TIME_STREAM_CONFIG.minSpanMinutes, durationMinutes)
          )}`;
    if (rangeSummary !== this.lastRangeSummaryKey) {
      this.lastRangeSummaryKey = rangeSummary;
      if (rangeSummary.length > 0) {
        this.rangeSummaryLabel = this.replaceReadoutLabel(
          this.rangeSummaryLabel,
          rangeSummary,
          {
            width: this.isMobileViewport ? 292 : 312,
            height: 34,
            fontSize: this.isMobileViewport ? 12 : 13,
            minimal: false,
          },
          this.clockGroup
        );
      } else if (this.rangeSummaryLabel) {
        this.clockGroup.remove(this.rangeSummaryLabel);
        const material = this.rangeSummaryLabel.material as THREE.SpriteMaterial;
        material.map?.dispose();
        material.dispose();
        this.rangeSummaryLabel = null;
      }
    }
    if (this.rangeSummaryLabel) {
      this.rangeSummaryLabel.position.set(
        clamp(
          -TIME_STREAM_CONFIG.halfWidth + 1.5,
          TIME_STREAM_CONFIG.halfWidth - 1.5,
          this.timeRangeMidX
        ),
        TIME_STREAM_CONFIG.laneY + 0.19,
        0
      );
      this.rangeSummaryLabel.scale.set(this.isMobileViewport ? 0.96 : 1.02, 0.21, 1);
    }
  }

  private replaceReadoutLabel(
    current: THREE.Sprite | null,
    text: string,
    options: { width: number; height: number; fontSize: number; minimal?: boolean },
    parent: THREE.Group
  ) {
    if (current) {
      parent.remove(current);
      const material = current.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
    }
    const next = options.minimal
      ? this.createMinimalTextSprite(text, options.fontSize)
      : this.createTextSprite(text, options);
    parent.add(next);
    return next;
  }

  private updateContextNodes() {
    this.contextNodes.forEach((node) => {
      const material = node.mesh.material as THREE.MeshStandardMaterial;
      const isActive = node.key === this.draft.wellbeingNode;
      const isHovered = node.key === this.hoveredContext;
      material.emissiveIntensity = isActive ? 0.55 : isHovered ? 0.35 : 0.16;
      node.mesh.scale.setScalar(isActive ? 1.25 : isHovered ? 1.14 : 1);
      (node.label.material as THREE.SpriteMaterial).opacity = isActive || isHovered ? 0.98 : 0.66;
    });
  }

  private updateDomainNodes() {
    const performanceNode = this.contextNodes.find((node) => node.key === "~~Performance");
    if (!performanceNode) return;

    const px = performanceNode.mesh.position.x;
    const py = performanceNode.mesh.position.y - 2.5; // Drop down
    const pz = performanceNode.mesh.position.z;

    const enabled = this.draft.wellbeingNode === "~~Performance";
    const activeDomains = new Set(this.outcome.saocommonsDomains);

    // Triangle arrangement (ஃ)
    const positions = [
      new THREE.Vector3(px, py + 0.6, pz), // Top
      new THREE.Vector3(px - 0.6, py - 0.4, pz), // Bottom Left
      new THREE.Vector3(px + 0.6, py - 0.4, pz), // Bottom Right
    ];

    this.domainNodes.forEach((entry, index) => {
      const pos = positions[index];
      if (!pos) return;
      entry.mesh.position.copy(pos);
      entry.label.position.set(pos.x, pos.y - 0.7, pos.z);

      const isActive = enabled && activeDomains.has(entry.domain);
      const isHovered = entry.domain === this.hoveredDomain;
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isActive ? 0.56 : isHovered ? 0.38 : 0.16;
      entry.mesh.scale.setScalar(isActive ? 1.24 : isHovered ? 1.12 : 1);
      (entry.label.material as THREE.SpriteMaterial).opacity = isActive || isHovered ? 0.96 : 0.62;
    });
  }

  private updateStrings() {
    this.disposeStringsGroup();

    // Connect Clock to Wellbeing Nodes
    this.contextNodes.forEach((node) => {
      const points = [this.clockCenter, node.mesh.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, this.stringsMaterial);
      this.stringsGroup.add(line);
    });

    // Connect Performance Node to SAOcommons Cylinders
    const performanceNode = this.contextNodes.find((node) => node.key === "~~Performance");
    if (performanceNode && this.draft.wellbeingNode === "~~Performance") {
      this.domainNodes.forEach((domain) => {
        const points = [performanceNode.mesh.position, domain.mesh.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, this.stringsMaterial);
        this.stringsGroup.add(line);
      });
    }
  }

  // Reveal layers progressively as we move down the chandelier
  private applyStepVisibility() {
    // Hide all stage cards for minimal design
    this.stageCards.forEach((stage) => {
      stage.mesh.visible = false;
      stage.label.visible = false;
    });

    const stepIndex = WIZARD_STEP_ORDER.indexOf(this.step);

    // Time stream layer (top layer only during select-time ritual)
    const showClock = this.step === "select_time";
    this.timeInstrumentBackdrop.visible = showClock;
    this.timeStreamBase.visible = showClock;
    this.timeStreamLane.visible = showClock;
    this.timeNowMarker.visible = showClock;
    this.timeNowFootprint.visible = showClock;
    this.streamFlowNodes.forEach((node) => {
      node.visible = showClock;
    });
    this.timeScaleTicks.forEach((tick) => {
      tick.mesh.visible = showClock;
      if (tick.label) {
        tick.label.visible =
          showClock && (!this.isMobileViewport || tick.minute % 360 === 0 || tick.minute === 1440);
      }
    });
    this.timeSnapGuideTicks.forEach((tick) => {
      tick.visible = showClock && this.step === "select_time";
    });
    if (showClock) {
      this.updateTimeStreamRange(
        minutesFromLocalInput(this.draft.startTime),
        minutesFromLocalInput(this.draft.endTime)
      );
    } else {
      this.timeRangeMesh.visible = false;
      this.timeRangeWrapMesh.visible = false;
    }
    this.timeFutureMaskMesh.visible = showClock;
    this.timeBeforeStartMaskMesh.visible = showClock;
    const showStartHandle =
      showClock && (this.timeCapturePhase === "start" || this.startHandleAdjusted);
    const showEndHandle = showClock && this.timeCapturePhase === "end";
    this.timeStartHandle.visible = false;
    this.timeEndHandle.visible = false;
    this.timeStartJaw.visible = false;
    this.timeEndJaw.visible = false;
    this.timeStartMarkerGlyph.visible = showStartHandle;
    this.timeEndMarkerGlyph.visible = showEndHandle;
    this.timeStartHitZone.visible = showClock && this.timeCapturePhase === "start";
    this.timeEndHitZone.visible = showClock && this.timeCapturePhase === "end";
    this.timeBladeCue.visible = false;
    if (this.nowReadoutLabel) this.nowReadoutLabel.visible = showClock;
    if (this.streamOriginLabel) this.streamOriginLabel.visible = showClock;
    if (this.rangeSummaryLabel) {
      this.rangeSummaryLabel.visible = showClock && this.timeCapturePhase === "end";
    }

    // Wellbeing nodes - visible from step 1 onwards
    const showWellbeing = stepIndex >= 1;
    this.contextNodes.forEach((node) => {
      node.mesh.visible = showWellbeing;
      node.label.visible = showWellbeing;
    });

    // Performance domains - visible from step 2 onwards (if Performance was chosen)
    const showPerformance = stepIndex >= 3 && this.draft.wellbeingNode === "~~Performance";
    this.domainNodes.forEach((entry) => {
      entry.mesh.visible = showPerformance;
      entry.label.visible = showPerformance;
    });

    // Strings - visible if the layer they connect to is visible
    this.stringsGroup.visible = showWellbeing;

    // Outcome elements - only visible during outcome review
    const showOutcome = false;
    this.auraBands.forEach((band) => {
      band.visible = showOutcome;
    });
    Object.values(this.deltaBars).forEach((bar) => {
      bar.visible = showOutcome;
    });
    this.deltaLabels.forEach((label) => {
      label.visible = showOutcome;
    });

    // Photon token appears after the timeslice details are captured.
    const showPhoton = this.step !== "select_time";
    this.token.visible = showPhoton;
    this.tokenTrail.forEach((trail) => {
      trail.visible = showPhoton;
    });
  }

  private applyStepCameraPreset() {
    const target = this.getCameraPresetForStep();
    const desiredFov =
      this.step === "select_time"
        ? this.isMobileViewport
          ? 36
          : 31
        : this.isMobileViewport
          ? 46
          : 39;
    if (this.camera.fov !== desiredFov) {
      this.camera.fov = desiredFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.copy(target.position);
    this.cameraLookAt.copy(target.lookAt);
    this.controls.target.copy(target.lookAt);
    this.controls.update();
  }

  private getCameraPresetForStep() {
    const position = this.cameraPresetPosition;
    const lookAt = this.cameraPresetLookAt;
    lookAt.set(0, 0, 0);

    if (this.step === "select_time") {
      const nowX = this.getNowFocusX();
      const focusX =
        this.timeCapturePhase === "start"
          ? nowX
          : clamp(-TIME_STREAM_CONFIG.halfWidth + 1.8, TIME_STREAM_CONFIG.halfWidth - 1.8, this.timeRangeMidX);
      if (this.isMobileViewport) {
        position.set(focusX, 4.02, 5.46);
        lookAt.set(focusX, 3.96, 0.02);
      } else {
        position.set(focusX, 4.06, 5.78);
        lookAt.set(focusX, 3.98, 0.02);
      }
    } else if (this.step === "select_wellbeing") {
      if (this.isMobileViewport) {
        position.set(0, 0.85, 18.8);
      } else {
        position.set(0, 0.6, 16.6);
      }
      lookAt.set(0, -0.2, 0);
    } else if (this.step === "select_intensity") {
      if (this.isMobileViewport) {
        position.set(0, 0.9, 18.4);
      } else {
        position.set(0, 0.65, 16.2);
      }
      lookAt.set(0, -0.2, 0);
    } else if (this.step === "select_performance") {
      if (this.isMobileViewport) {
        position.set(0, -0.15, 18.6);
      } else {
        position.set(0, -0.35, 16.6);
      }
      lookAt.set(0, -1.9, 0);
    } else {
      // show_outcome: pull back to see the whole chandelier
      if (this.isMobileViewport) {
        position.set(0, 2.3, 19.2);
      } else {
        position.set(0, 1.8, 17.2);
      }
      lookAt.set(0, 0.6, 0);
    }

    return { position, lookAt };
  }

  private getNowFocusX() {
    const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    const nowX = minutesToStreamX(nowMinute, TIME_STREAM_CONFIG.halfWidth);
    return clamp(-TIME_STREAM_CONFIG.halfWidth + 1.4, TIME_STREAM_CONFIG.halfWidth - 1.4, nowX);
  }

  getDraft() {
    return this.draft;
  }

  getTokenWorldPosition(target: THREE.Vector3) {
    return this.root.localToWorld(target.copy(this.token.position));
  }

  getWellbeingCenterWorldPosition(target: THREE.Vector3) {
    return this.root.localToWorld(target.set(0, -0.2, 0));
  }

  getTimeCaptureUiAnchorWorldPosition(target: THREE.Vector3) {
    let anchorX =
      this.timeCapturePhase === "start"
        ? this.timeStartHandle.position.x
        : this.timeEndHandle.position.x;
    if (this.activeClockHand === "start" || this.hoveredTimeTarget === "start") {
      anchorX = this.timeStartHandle.position.x;
    } else if (this.activeClockHand === "end" || this.hoveredTimeTarget === "end") {
      anchorX = this.timeEndHandle.position.x;
    } else if (this.activeClockHand === "range") {
      anchorX =
        this.timeCapturePhase === "start"
          ? this.timeStartHandle.position.x
          : this.timeEndHandle.position.x;
    }
    return this.root.localToWorld(
      target.set(anchorX, this.clockGroup.position.y + TIME_STREAM_CONFIG.rangeY + 0.28, 0)
    );
  }

  // --- Restored Original Methods ---

  private updatePointerHover() {
    const hit = this.raycastInteractive();
    this.hoveredContext = hit?.type === "context" ? hit.key : null;
    this.hoveredDomain = hit?.type === "domain" ? hit.domain : null;
    if (hit?.type === "clock_hand") {
      this.hoveredTimeTarget = hit.hand;
    } else if (hit?.type === "clock") {
      this.hoveredTimeTarget = "range";
    } else {
      this.hoveredTimeTarget = null;
    }
    this.updateContextNodes();
    this.updateDomainNodes();
    this.updateTimeStreamPulse();
    document.body.style.cursor = hit ? "pointer" : "default";
  }

  private raycastInteractive():
    | { type: "clock" }
    | { type: "clock_hand"; hand: "start" | "end" }
    | { type: "context"; key: WellbeingContextNode }
    | { type: "domain"; domain: DomainNodeVisual["domain"] }
    | null {
    
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const targets: THREE.Object3D[] = [];
    // Prioritize context interaction based on step
    if (this.step === "select_time") {
        const allowStartHandle = this.timeCapturePhase === "start";
        const allowEndHandle = this.timeCapturePhase === "end";
        if (allowStartHandle) {
          targets.push(this.timeStartHitZone);
        }
        if (allowEndHandle) {
          targets.push(this.timeEndHitZone);
        }
        targets.push(
          this.timeRangeMesh,
          this.timeRangeWrapMesh,
          this.timeNowMarker,
          this.timeStreamLane,
          this.timeStreamBase
        );
        if (this.timeCapturePhase === "end") {
          targets.push(this.timeBeforeStartMaskMesh);
        }
        targets.push(this.timeFutureMaskMesh);
    }
    
    // Always check context nodes if visible (allow navigation)
    this.contextNodes.forEach((node) => {
        if (node.mesh.visible) targets.push(node.mesh);
    });

    // Check domain nodes if visible
    this.domainNodes.forEach((node) => {
        if (node.mesh.visible) targets.push(node.mesh);
    });

    if (targets.length === 0) return null;

    const intersections = this.raycaster.intersectObjects(targets, false);
    const object = intersections[0]?.object;
    if (!object) return null;

    if (object === this.timeStartHitZone) {
      return { type: "clock_hand", hand: "start" };
    }
    if (object === this.timeEndHitZone) {
      return { type: "clock_hand", hand: "end" };
    }
    if (
      object === this.timeRangeMesh ||
      object === this.timeRangeWrapMesh ||
      object === this.timeNowMarker ||
      object === this.timeFutureMaskMesh ||
      object === this.timeBeforeStartMaskMesh ||
      object === this.timeStreamLane ||
      object === this.timeStreamBase
    ) {
      return { type: "clock" };
    }

    for (const node of this.contextNodes) {
      if (node.mesh === object) {
        return { type: "context", key: node.key };
      }
    }

    for (const node of this.domainNodes) {
      if (node.mesh === object) {
        return { type: "domain", domain: node.domain };
      }
    }

    return null;
  }

  private raycastClockHand(): "start" | "end" | "range" | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const targets: THREE.Object3D[] = [];
    if (this.timeCapturePhase === "start") {
      targets.push(this.timeStartHitZone);
    }
    if (this.timeCapturePhase === "end") {
      targets.push(this.timeEndHitZone);
    }
    targets.push(this.timeRangeMesh, this.timeRangeWrapMesh);
    const hits = this.raycaster.intersectObjects(
      targets,
      false
    );
    const first = hits[0]?.object ?? null;
    if (!first) return null;
    if (first === this.timeStartHitZone) return "start";
    if (first === this.timeEndHitZone) return "end";
    if (first === this.timeRangeMesh || first === this.timeRangeWrapMesh) return "range";
    return null;
  }

  private updateClockHandFromPointer() {
    if (!this.activeClockHand) return;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.clockInteractionPlane,
      this.clockInteractionPoint
    );
    if (!hit) return;

    this.clockInteractionLocal.copy(this.clockInteractionPoint).sub(this.clockGroup.position);
    const snappedMinutes = snapMinutes(
      streamXToMinutes(this.clockInteractionLocal.x, TIME_STREAM_CONFIG.halfWidth),
      TIME_STREAM_CONFIG.snapMinutes
    );
    const currentStart = minutesFromLocalInput(this.draft.startTime);
    const currentEnd = minutesFromLocalInput(this.draft.endTime);
    const nowMinutes = minutesFromDate(snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes));
    const minSpan = TIME_STREAM_CONFIG.minSpanMinutes;

    if (this.activeClockHand === "start") {
      const nextStart = clamp(0, Math.max(0, nowMinutes - minSpan), snappedMinutes);
      const nextEnd = nowMinutes;
      this.applyClockRange(nextStart, nextEnd);
      return;
    }

    if (this.activeClockHand === "end") {
      const nextStart = currentStart;
      const minEnd = Math.min(nowMinutes, nextStart + minSpan);
      const nextEnd = clamp(minEnd, nowMinutes, snappedMinutes);
      this.applyClockRange(nextStart, nextEnd);
      return;
    }

    this.applyClockRange(currentStart, currentEnd);
  }

  private applyClockRange(startMinutes: number, endMinutes: number) {
    const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
    const dayStart = startOfDay(now);
    const nowMinutes = minutesFromDate(now);
    const minSpan = TIME_STREAM_CONFIG.minSpanMinutes;
    const nextStartMinutes = clamp(0, Math.max(0, nowMinutes - minSpan), startMinutes);
    const nextEndMinutes = clamp(nextStartMinutes + minSpan, nowMinutes, endMinutes);
    const nextStart = minutesToDate(dayStart, nextStartMinutes);
    const nextEnd = minutesToDate(dayStart, nextEndMinutes);

    this.draft = {
      ...this.draft,
      startTime: toLocalInputValue(nextStart),
      endTime: toLocalInputValue(nextEnd),
    };
    this.applyDraft();
  }

  private getNextStep(step: WizardStep): WizardStep {
    if (step === "select_time") return "select_wellbeing";
    if (step === "select_wellbeing") {
      return this.draft.wellbeingNode === "~~Performance"
        ? "select_performance"
        : "select_intensity";
    }
    if (step === "select_intensity") {
      return "show_outcome";
    }
    if (step === "select_performance") return "show_outcome";
    return "show_outcome";
  }

  private getPreviousStep(step: WizardStep): WizardStep {
    if (step === "show_outcome") {
      return this.draft.wellbeingNode === "~~Performance"
        ? "select_performance"
        : "select_intensity";
    }
    if (step === "select_performance") return "select_wellbeing";
    if (step === "select_intensity") return "select_wellbeing";
    if (step === "select_wellbeing") return "select_time";
    return "select_time";
  }

  private ensureStepValid(step: WizardStep): WizardStep {
    if (step === "select_performance" && this.draft.wellbeingNode !== "~~Performance") {
      return "select_intensity";
    }
    if (step === "select_intensity" && this.draft.wellbeingNode === "~~Performance") {
      return "select_performance";
    }
    return step;
  }

  private toggleLiveTimer() {
    if (this.liveTimerActive) {
      this.liveTimerActive = false;
      this.liveTimerLastTickMs = 0;
      const startMinutes = snapMinutes(
        minutesFromLocalInput(this.draft.startTime),
        TIME_STREAM_CONFIG.snapMinutes
      );
      const endMinutes = snapMinutes(
        minutesFromLocalInput(this.draft.endTime),
        TIME_STREAM_CONFIG.snapMinutes
      );
      this.applyClockRange(startMinutes, endMinutes);
      this.timeCapturePhase = "end";
      this.startHandleAdjusted = true;
      return;
    }

    const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
    const start = new Date(now.getTime() - TIME_STREAM_CONFIG.defaultLiveWindowMinutes * 60 * 1000);
    const dayStart = startOfDay(now);
    const normalizedStart = start < dayStart ? dayStart : start;
    this.draft = {
      ...this.draft,
      startTime: toLocalInputValue(normalizedStart),
      endTime: toLocalInputValue(now),
    };
    this.liveTimerActive = true;
    this.liveTimerLastTickMs = now.getTime();
    this.timeCapturePhase = "end";
    this.startHandleAdjusted = true;
    this.applyDraft();
  }

  private normalizeDraftTimeRange(draft: ValueLogDraft): ValueLogDraft {
    const now = snapDateToMinutes(new Date(), TIME_STREAM_CONFIG.snapMinutes);
    const dayStart = startOfDay(now);
    const nowMinutes = minutesFromDate(now);
    const minSpan = TIME_STREAM_CONFIG.minSpanMinutes;
    const parsedStart = parseLocalInputDate(draft.startTime);
    const parsedEnd = parseLocalInputDate(draft.endTime);
    const defaultStart = nowMinutes;
    const startMinutesRaw = parsedStart ? minutesFromDate(parsedStart) : defaultStart;
    const endMinutesRaw = parsedEnd ? minutesFromDate(parsedEnd) : nowMinutes;
    const inStartPhase = this.timeCapturePhase === "start" && !this.startHandleAdjusted;
    const isFreshOpenBaseline =
      inStartPhase && Math.abs(startMinutesRaw - endMinutesRaw) <= TIME_STREAM_CONFIG.snapMinutes;
    const startMinutes = isFreshOpenBaseline
      ? nowMinutes
      : inStartPhase
        ? clamp(0, nowMinutes, startMinutesRaw)
        : clamp(0, Math.max(0, nowMinutes - minSpan), startMinutesRaw);
    const endMinutes = isFreshOpenBaseline
      ? nowMinutes
      : inStartPhase
        ? nowMinutes
        : clamp(startMinutes + minSpan, nowMinutes, endMinutesRaw);

    this.startHandleAdjusted = startMinutes < nowMinutes;
    if (this.startHandleAdjusted && this.timeCapturePhase === "start") {
      this.timeCapturePhase = "end";
    } else if (!this.startHandleAdjusted) {
      this.timeCapturePhase = "start";
    }

    return {
      ...draft,
      startTime: toLocalInputValue(minutesToDate(dayStart, startMinutes)),
      endTime: toLocalInputValue(minutesToDate(dayStart, endMinutes)),
    };
  }

  private applyDeltaBar(mesh: THREE.Mesh, delta: number) {
    const height = 0.26 + Math.abs(delta) * 14;
    mesh.scale.y = height;
    mesh.position.y = 0.16 + height * 0.5;
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.color.set(delta >= 0 ? "#88e09d" : "#ff8d9a");
    material.emissive.set(delta >= 0 ? "#2f8f50" : "#8f2e40");
    material.emissiveIntensity = 0.28;
  }

  private buildEntry(personId: string, roleHint: string): IovValueLogEntry {
    const outcome = this.outcome;
    const startIso = toIsoOrNow(this.draft.startTime);
    const endIso = toIsoOrNow(this.draft.endTime);
    const durationHours =
      Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime()) / 3600000;
    const enabled = outcome.saocommonsEnabled;

    return {
      id: `${personId}-${Date.now()}`,
      timestamp: startIso,
      "~ValueCaptureProtocol": {
        "~~TimeSlice": {
          "~~~StartTime": startIso,
          "~~~EndTime": endIso,
          "~~~Duration": Number(durationHours.toFixed(2)),
        },
        "~~Activity": {
          "~~~ActivityLabel": this.draft.activityLabel,
          "~~~TaskType": this.draft.taskType,
          "~~~Intent": this.draft.intent,
        },
        "~~Proof": {
          "~~~ProofOfActivity": this.draft.proofOfActivity,
          "~~~EvidenceLink": this.draft.evidenceLink,
          "~~~ArtifactType": this.draft.artifactType,
        },
        "~~Attribution": {
          "~~~Community": this.draft.community,
          "~~~Project": this.draft.project,
          "~~~ContributorRole": roleHint || this.draft.contributorRole,
        },
        "~~Integrity": {
          "~~~ProofQuality": this.draft.proofQuality,
          "~~~AnomalyFlag": this.draft.anomalyFlag,
          "~~~FraudRiskSignal": this.draft.fraudRiskSignal,
        },
      },
      "~WellbeingProtocol": {
        "~~Context": {
          "~~~PrimaryNode": this.draft.wellbeingNode,
          "~~~SignalLabel": this.draft.signalLabel,
          "~~~SignalScore": this.draft.signalScore,
          "~~~ImpactDirection": this.draft.impactDirection,
        },
        ...(this.draft.wellbeingNode === "~~Performance"
          ? {
              "~~Performance": {
                "~~~LearningOutput": this.draft.learningTag ? Number(this.draft.learningIntensity.toFixed(2)) : 0,
                "~~~EarningOutput": this.draft.earningTag ? Number(this.draft.earningIntensity.toFixed(2)) : 0,
                "~~~OrgBuildingOutput": this.draft.orgBuildingTag ? Number(this.draft.orgBuildingIntensity.toFixed(2)) : 0,
                "~~~SkillApplication": this.draft.skillApplication,
                "~~~CommunityContext": this.draft.communityContext,
              },
            }
          : {}),
      },
      "~SAOcommons": {
        "~~Activation": {
          "~~~Enabled": enabled,
          "~~~Trigger": enabled ? "~~Performance" : "non-performance",
          "~~~Domains": outcome.saocommonsDomains,
        },
        ...(enabled
          ? {
              "~~Validation": {
                "~~~EvidenceReview": "manual-review",
                "~~~ReviewerSet": this.draft.community,
                "~~~ValidationDecision": "approved",
              },
            }
          : {}),
      },
      _engine: {
        wellbeing_delta: outcome.wellbeingDelta,
        aura_delta: outcome.auraDelta,
      },
    };
  }

  private createAuraBand(inner: number, outer: number, color: string) {
    return new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 120),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
  }

  private createTextSprite(
    text: string,
    options?: { width?: number; height?: number; fontSize?: number }
  ) {
    const width = options?.width ?? 320;
    const height = options?.height ?? 84;
    const fontSize = options?.fontSize ?? 24;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(8,17,32,0.86)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(172,204,246,0.64)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      ctx.fillStyle = "#ecf4ff";
      ctx.font = `700 ${fontSize}px Avenir Next`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
      })
    );
    sprite.scale.set(width / 120, height / 120, 1);
    return sprite;
  }

  private createMinimalTextSprite(text: string, fontSize = 15) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 360;
    canvas.height = 54;

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(220,238,255,0.94)";
      ctx.font = `700 ${fontSize}px Avenir Next`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    );
    sprite.scale.set(2.8, 0.42, 1);
    return sprite;
  }

  private disposeGroup(group: THREE.Group) {
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry?.dispose?.();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => {
            if ((entry as THREE.SpriteMaterial).map) {
              ((entry as THREE.SpriteMaterial).map as THREE.Texture).dispose();
            }
            entry.dispose();
          });
        } else if (material) {
          const spriteMaterial = material as THREE.SpriteMaterial;
          if (spriteMaterial.map) {
            spriteMaterial.map.dispose();
          }
          material.dispose();
        }
      }
    });
    group.clear();
  }

  private disposeStringsGroup() {
    this.stringsGroup.children.forEach((child) => {
      const line = child as THREE.Line;
      line.geometry?.dispose?.();
    });
    this.stringsGroup.clear();
  }
}

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toIsoOrNow = (value: string) => {
  const date = value.length > 0 ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const minutesFromLocalInput = (value: string) => {
  const date = value.length > 0 ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return date.getHours() * 60 + date.getMinutes();
};

const minutesFromDate = (date: Date) => date.getHours() * 60 + date.getMinutes();

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const minutesToDate = (dayStart: Date, minutes: number) => {
  const copy = new Date(dayStart);
  const safeMinutes = clamp(0, 1439, Math.round(minutes));
  copy.setHours(Math.floor(safeMinutes / 60), safeMinutes % 60, 0, 0);
  return copy;
};

const minutesToStreamX = (minutes: number, halfWidth: number) => {
  const normalized = (((minutes % 1440) + 1440) % 1440) / 1440;
  return -halfWidth + normalized * halfWidth * 2;
};

const streamXToMinutes = (x: number, halfWidth: number) => {
  const clamped = clamp(-halfWidth, halfWidth, x);
  const normalized = (clamped + halfWidth) / (halfWidth * 2);
  return Math.round(normalized * 1440) % 1440;
};

const snapMinutes = (minutes: number, step: number) => {
  if (step <= 1) return minutes;
  const snapped = Math.round(minutes / step) * step;
  return ((snapped % 1440) + 1440) % 1440;
};

const snapDateToMinutes = (date: Date, step: number) => {
  if (step <= 1) return date;
  const minutes = minutesFromDate(date);
  const snappedMinutes = snapMinutes(minutes, step);
  const dayStart = startOfDay(date);
  return minutesToDate(dayStart, snappedMinutes);
};

let hatchTextureCache: THREE.CanvasTexture | null = null;
const getHatchTexture = () => {
  if (hatchTextureCache) return hatchTextureCache;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(184,206,233,0.18)";
    ctx.lineWidth = 2;
    for (let i = -64; i <= 64; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 64);
      ctx.lineTo(i + 64, 0);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 1);
  hatchTextureCache = texture;
  return texture;
};

const createTimelineMarkerSprite = (color: string, direction: "start" | "end") => {
  const canvas = document.createElement("canvas");
  canvas.width = 88;
  canvas.height = 168;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const centerX = direction === "start" ? 30 : 58;
    const tabLength = 22;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillRect(centerX - 4, 18, 8, 92);
    if (direction === "start") {
      ctx.fillRect(centerX - 4, 102, tabLength, 8);
    } else {
      ctx.fillRect(centerX - tabLength + 4, 102, tabLength, 8);
    }
    ctx.globalAlpha = 0.24;
    ctx.fillRect(centerX - 6, 18, 12, 92);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Sprite(material);
};

const parseLocalInputDate = (value: string) => {
  const parsed = value.length > 0 ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocalClock = (date: Date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const formatRibbonClock = (date: Date, includeSeconds = false) => {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  if (!includeSeconds) return `${hours}:${minutes}`;
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const formatLocalDate = (date: Date) =>
  date.toLocaleDateString([], { month: "short", day: "numeric" });

const formatDurationLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const DEFAULT_SIGNAL_LABEL_BY_NODE: Record<WellbeingContextNode, string> = {
  "~~Physiology": "Body baseline quality",
  "~~Emotion": "Emotional stability shift",
  "~~Feeling": "Felt-state coherence",
  "~~Thought": "Cognitive clarity quality",
  "~~Habit": "Habit streak quality",
  "~~Performance": "Performance execution quality",
};

const deriveSignalScore = (draft: ValueLogDraft) => {
  const base = clamp(0, 1, draft.contextIntensity);
  if (draft.wellbeingNode !== "~~Performance") {
    return base;
  }

  const selected: number[] = [];
  if (draft.learningTag) selected.push(clamp(0, 1, draft.learningIntensity));
  if (draft.earningTag) selected.push(clamp(0, 1, draft.earningIntensity));
  if (draft.orgBuildingTag) selected.push(clamp(0, 1, draft.orgBuildingIntensity));
  const domainAverage =
    selected.length > 0
      ? selected.reduce((sum, value) => sum + value, 0) / selected.length
      : base;
  return clamp(0, 1, base * 0.45 + domainAverage * 0.55);
};

const isValidTimeRange = (startTime: string, endTime: string) => {
  const start = parseLocalInputDate(startTime);
  const end = parseLocalInputDate(endTime);
  if (!start || !end) return false;
  const spanMs = end.getTime() - start.getTime();
  return spanMs >= TIME_STREAM_CONFIG.minSpanMinutes * 60 * 1000;
};

export const isValueLogCommitReady = (draft: ValueLogDraft) => {
  const hasValueCapture =
    isValidTimeRange(draft.startTime, draft.endTime) &&
    draft.activityLabel.trim().length > 0 &&
    draft.proofOfActivity.trim().length > 0;
  if (!hasValueCapture) return false;

  if (draft.wellbeingNode !== "~~Performance") {
    return draft.contextIntensity >= 0;
  }

  return draft.learningTag || draft.earningTag || draft.orgBuildingTag;
};

const getSceneActionHint = (
  step: WizardStep,
  draft: ValueLogDraft,
  canCommit: boolean,
  timeCapturePhase: "start" | "end"
) => {
  if (canCommit) {
    return "Ready to capture value.";
  }
  if (step === "select_time") {
    return timeCapturePhase === "start"
      ? "Step 1/2: drag the blue Begin cut left from Now."
      : "Step 2/2: place the copper End cut between Begin and Now.";
  }
  if (step === "select_wellbeing") {
    return "Select one wellbeing context node.";
  }
  if (step === "select_intensity") {
    return `Set intensity for ${draft.wellbeingNode.replace("~~", "")}.`;
  }
  if (step === "select_performance") {
    return "Select SAOcommons domains and set domain intensity.";
  }
  return "Capture value to trigger the photon drop.";
};
