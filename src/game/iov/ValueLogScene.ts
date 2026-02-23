import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { IovValueLogEntry, WellbeingContextNode } from "./iovTimelogs";

export type ValueLogStep =
  | "time_slice"
  | "value_capture"
  | "wellbeing_context"
  | "performance_tags"
  | "compute"
  | "commit";

export const VALUE_LOG_STEP_ORDER: ValueLogStep[] = [
  "time_slice",
  "value_capture",
  "wellbeing_context",
  "performance_tags",
  "compute",
  "commit",
];

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
  domain: "~~Learning" | "~~Earning" | "~~OrgBuilding";
  mesh: THREE.Mesh;
  label: THREE.Sprite;
}

export interface ValueLogDraft {
  startTime: string;
  endTime: string;
  activityLabel: string;
  taskType: string;
  intent: string;
  proofOfActivity: string;
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
  impactDirection: "increase" | "decrease" | "neutral";
  skillApplication: string;
  communityContext: string;
  learningTag: boolean;
  earningTag: boolean;
  orgBuildingTag: boolean;
}

export interface ValueLogOutcome {
  wellbeingDelta: number;
  auraDelta: number;
  identityStateDelta: number;
  saocommonsEnabled: boolean;
  saocommonsDomains: Array<"~~Learning" | "~~Earning" | "~~OrgBuilding">;
}

export interface ValueLogSummary {
  step: ValueLogStep;
  stepIndex: number;
  stepLabel: string;
  draft: ValueLogDraft;
  outcome: ValueLogOutcome;
  committedCount: number;
}

export const createInitialValueLogDraft = (): ValueLogDraft => {
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 60000);
  return {
    startTime: toLocalInputValue(now),
    endTime: toLocalInputValue(end),
    activityLabel: "Visualizing Internet of Value stack",
    taskType: "protocol-visualization",
    intent: "clarity-and-shared-understanding",
    proofOfActivity: "Output link + commit",
    evidenceLink: "proof://local/log",
    artifactType: "scene-output",
    community: "GrowthFlow Engineering",
    project: "IOV Visualization",
    contributorRole: "Contributor",
    proofQuality: 0.82,
    anomalyFlag: false,
    fraudRiskSignal: 0.04,
    wellbeingNode: "~~Performance",
    signalLabel: "Business growth skill execution",
    signalScore: 0.72,
    impactDirection: "increase",
    skillApplication: "Business Growth",
    communityContext: "GrowthFlow Engineering",
    learningTag: true,
    earningTag: true,
    orgBuildingTag: false,
  };
};

export const computeValueLogOutcome = (draft: ValueLogDraft): ValueLogOutcome => {
  let base = (draft.signalScore - 0.5) * 0.06;
  if (draft.impactDirection === "increase") {
    base = Math.abs(base) + 0.004;
  } else if (draft.impactDirection === "decrease") {
    base = -Math.abs(base) - 0.01;
  } else {
    base *= 0.2;
  }

  const saocommonsEnabled = draft.wellbeingNode === "~~Performance";
  const domains: Array<"~~Learning" | "~~Earning" | "~~OrgBuilding"> = [];
  if (saocommonsEnabled) {
    if (draft.learningTag) domains.push("~~Learning");
    if (draft.earningTag) domains.push("~~Earning");
    if (draft.orgBuildingTag) domains.push("~~OrgBuilding");
  }

  const domainBonus = saocommonsEnabled ? domains.length * 0.004 : 0;
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

export class ValueLogScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(39, 1, 0.1, 120);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly clockGroup = new THREE.Group();
  private clockDial: THREE.Mesh | null = null;
  private readonly sliceArc = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 96, 1, 0, Math.PI / 4),
    new THREE.MeshBasicMaterial({
      color: "#9fd0ff",
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  private readonly startHand = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.08, 0.1),
    new THREE.MeshStandardMaterial({
      color: "#93c7ff",
      emissive: "#2f5f94",
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.1,
    })
  );
  private readonly endHand = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.08, 0.1),
    new THREE.MeshStandardMaterial({
      color: "#ffd192",
      emissive: "#7f5625",
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.08,
    })
  );
  private readonly token = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 14),
    new THREE.MeshStandardMaterial({
      color: "#f6eb9a",
      emissive: "#f1c766",
      emissiveIntensity: 0.34,
      roughness: 0.32,
      metalness: 0.08,
    })
  );

  private readonly auraBands = [
    this.createAuraBand(5.5, 6.2, "#92c9ff"),
    this.createAuraBand(6.5, 7.3, "#75b1ff"),
    this.createAuraBand(7.8, 8.8, "#7fd7c3"),
  ];

  private readonly stageCards: StageVisual[] = [];
  private readonly contextNodes: ContextNodeVisual[] = [];
  private readonly domainNodes: DomainNodeVisual[] = [];
  private readonly deltaLabels: THREE.Sprite[] = [];
  private clockLabel: THREE.Sprite | null = null;

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

  private readonly stageByStep: Record<ValueLogStep, StageVisual["id"]> = {
    time_slice: "value_capture",
    value_capture: "value_capture",
    wellbeing_context: "wellbeing",
    performance_tags: "saocommons",
    compute: "outcome",
    commit: "outcome",
  };

  private draft: ValueLogDraft = createInitialValueLogDraft();
  private step: ValueLogStep = "time_slice";
  private committedCount = 0;
  private outcome: ValueLogOutcome = computeValueLogOutcome(this.draft);
  private elapsedSeconds = 0;
  private startAngle = -Math.PI / 2;
  private sliceLength = Math.PI / 4;
  private isMobileViewport = false;
  private readonly cameraLookAt = new THREE.Vector3(0, 0.65, 0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private hasPointer = false;
  private hoveredContext: WellbeingContextNode | null = null;
  private hoveredDomain: DomainNodeVisual["domain"] | null = null;

  constructor(private readonly domElement: HTMLElement) {
    this.scene.add(this.root);
    this.root.add(this.clockGroup);

    this.controls = new OrbitControls(this.camera, this.domElement);
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
    this.draft = next;
    this.applyDraft();
  }

  patchDraft(patch: Partial<ValueLogDraft>) {
    this.draft = { ...this.draft, ...patch };
    if (this.draft.wellbeingNode !== "~~Performance") {
      this.draft.learningTag = false;
      this.draft.earningTag = false;
      this.draft.orgBuildingTag = false;
    }
    this.applyDraft();
  }

  setStep(step: ValueLogStep) {
    this.step = step;
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  nextStep() {
    const currentIndex = VALUE_LOG_STEP_ORDER.indexOf(this.step);
    if (currentIndex < 0 || currentIndex >= VALUE_LOG_STEP_ORDER.length - 1) return;

    const next = VALUE_LOG_STEP_ORDER[currentIndex + 1] ?? this.step;
    if (next === "performance_tags" && this.draft.wellbeingNode !== "~~Performance") {
      this.step = "compute";
    } else {
      this.step = next;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  prevStep() {
    const currentIndex = VALUE_LOG_STEP_ORDER.indexOf(this.step);
    if (currentIndex <= 0) return;

    if (this.step === "compute" && this.draft.wellbeingNode !== "~~Performance") {
      this.step = "wellbeing_context";
    } else {
      this.step = VALUE_LOG_STEP_ORDER[currentIndex - 1] ?? this.step;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  commit(personId: string, roleHint?: string): IovValueLogEntry {
    const entry = this.buildEntry(personId, roleHint);
    this.committedCount += 1;
    this.step = "time_slice";
    this.applyStepCameraPreset();
    this.applyDraft();
    return entry;
  }

  setPointerFromCanvas(x: number, y: number, width: number, height: number) {
    this.pointerNdc.x = (x / width) * 2 - 1;
    this.pointerNdc.y = -(y / height) * 2 + 1;
    this.hasPointer = true;
    this.updatePointerHover();
  }

  clearPointer() {
    this.hasPointer = false;
    this.hoveredContext = null;
    this.hoveredDomain = null;
    this.updateContextNodes();
    this.updateDomainNodes();
  }

  selectFromPointer() {
    if (!this.hasPointer) return;
    const hit = this.raycastInteractive();
    if (!hit) return;

    if (hit.type === "clock") {
      if (this.step === "time_slice") {
        this.setStep("value_capture");
      } else if (this.step === "value_capture") {
        this.setStep("wellbeing_context");
      }
      return;
    }

    if (hit.type === "context" && this.step === "wellbeing_context") {
      this.patchDraft({ wellbeingNode: hit.key });
      if (hit.key === "~~Performance") {
        this.setStep("performance_tags");
      } else {
        this.setStep("compute");
      }
      return;
    }

    if (
      hit.type === "domain" &&
      this.step === "performance_tags" &&
      this.draft.wellbeingNode === "~~Performance"
    ) {
      if (hit.domain === "~~Learning") {
        this.patchDraft({ learningTag: !this.draft.learningTag });
      } else if (hit.domain === "~~Earning") {
        this.patchDraft({ earningTag: !this.draft.earningTag });
      } else {
        this.patchDraft({ orgBuildingTag: !this.draft.orgBuildingTag });
      }
    }
  }

  update(deltaSeconds: number) {
    this.elapsedSeconds += deltaSeconds;

    // Token moves along the active time slice arc to make the scene feel alive.
    const orbitRadius = 2.58;
    const phase = (Math.sin(this.elapsedSeconds * 0.9) + 1) * 0.5;
    const tokenAngle = this.startAngle + this.sliceLength * phase;
    this.token.position.set(
      Math.cos(tokenAngle) * orbitRadius,
      0.58 + Math.sin(this.elapsedSeconds * 1.4) * 0.06,
      Math.sin(tokenAngle) * orbitRadius
    );

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
    this.controls.update();
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  getSummary(): ValueLogSummary {
    const stepIndex = VALUE_LOG_STEP_ORDER.indexOf(this.step);
    return {
      step: this.step,
      stepIndex: stepIndex < 0 ? 0 : stepIndex,
      stepLabel: STEP_LABELS[this.step],
      draft: this.draft,
      outcome: this.outcome,
      committedCount: this.committedCount,
    };
  }

  dispose() {
    this.controls.dispose();
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
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshStandardMaterial({
        color: "#0e1c32",
        roughness: 0.94,
        metalness: 0.03,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.root.add(floor);

    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(4.35, 4.55, 0.34, 72),
      new THREE.MeshStandardMaterial({
        color: "#132a49",
        roughness: 0.72,
        metalness: 0.08,
      })
    );
    dial.position.y = 0.18;
    this.clockDial = dial;
    this.clockGroup.add(dial);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.62, 0.07, 10, 96),
      new THREE.MeshBasicMaterial({
        color: "#9bc8ff",
        transparent: true,
        opacity: 0.8,
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.38;
    this.clockGroup.add(rim);

    this.sliceArc.rotation.x = -Math.PI / 2;
    this.sliceArc.position.y = 0.39;
    this.clockGroup.add(this.sliceArc);

    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2 - Math.PI / 2;
      const tickLength = index % 6 === 0 ? 0.45 : 0.26;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, tickLength),
        new THREE.MeshBasicMaterial({ color: "#9fc3e8", transparent: true, opacity: 0.6 })
      );
      tick.position.set(Math.cos(angle) * 3.56, 0.42, Math.sin(angle) * 3.56);
      tick.rotation.y = -angle;
      this.clockGroup.add(tick);
    }

    this.startHand.position.y = 0.45;
    this.endHand.position.y = 0.5;
    this.clockGroup.add(this.startHand, this.endHand, this.token);

    const pivot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: "#d7e7ff", roughness: 0.24, metalness: 0.2 })
    );
    pivot.position.y = 0.49;
    this.clockGroup.add(pivot);

    this.clockLabel = this.createTextSprite("Time Slice Clock", {
      width: 360,
      height: 92,
      fontSize: 28,
    });
    this.clockLabel.position.set(0, 2.0, -4.9);
    this.root.add(this.clockLabel);

    this.auraBands.forEach((band) => {
      band.rotation.x = -Math.PI / 2;
      band.position.y = 0.12;
      this.root.add(band);
    });

    this.addContextNodes();
    this.addDomainNodes();
    this.addStageCards();

    this.deltaBars.wellbeing.position.set(-1.1, 0.62, 5.55);
    this.deltaBars.aura.position.set(0, 0.62, 5.55);
    this.deltaBars.identity.position.set(1.1, 0.62, 5.55);
    this.root.add(this.deltaBars.wellbeing, this.deltaBars.aura, this.deltaBars.identity);

    const deltaLabels = [
      { text: "Wellbeing", x: -1.1 },
      { text: "Aura", x: 0 },
      { text: "IdentityState", x: 1.1 },
    ];
    deltaLabels.forEach((entry) => {
      const label = this.createTextSprite(entry.text, { width: 200, height: 70, fontSize: 18 });
      label.position.set(entry.x, 1.7, 5.55);
      this.deltaLabels.push(label);
      this.root.add(label);
    });
  }

  private addContextNodes() {
    const defs: Array<{ key: WellbeingContextNode; label: string; color: string; deg: number }> = [
      { key: "~~Physiology", label: "Physiology", color: "#79c5ff", deg: -160 },
      { key: "~~Emotion", label: "Emotion", color: "#ff8d9a", deg: -110 },
      { key: "~~Feeling", label: "Feeling", color: "#a7c7ff", deg: -65 },
      { key: "~~Thought", label: "Thought", color: "#a5ffcc", deg: -20 },
      { key: "~~Habit", label: "Habit", color: "#fff2b0", deg: 24 },
      { key: "~~Performance", label: "Performance", color: "#d2b1ff", deg: 70 },
    ];

    defs.forEach((def) => {
      const angle = THREE.MathUtils.degToRad(def.deg);
      const radius = 4.95;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 16, 14),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.2,
          roughness: 0.3,
          metalness: 0.08,
        })
      );
      mesh.position.set(Math.cos(angle) * radius, 0.58, Math.sin(angle) * radius);
      this.root.add(mesh);

      const label = this.createTextSprite(def.label, { width: 180, height: 52, fontSize: 16 });
      label.position.set(Math.cos(angle) * (radius + 0.92), 1.22, Math.sin(angle) * (radius + 0.92));
      this.root.add(label);

      this.contextNodes.push({ key: def.key, mesh, label, angle });
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
        new THREE.SphereGeometry(0.16, 14, 12),
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
    this.outcome = computeValueLogOutcome(this.draft);

    const startMinutes = minutesFromLocalInput(this.draft.startTime);
    const endMinutes = minutesFromLocalInput(this.draft.endTime);
    this.startAngle = minutesToClockAngle(startMinutes);
    const minuteSpan = normalizeMinuteSpan(endMinutes - startMinutes);
    this.sliceLength = (minuteSpan / 1440) * Math.PI * 2;

    this.updateSliceArc();
    this.updateHands();
    this.updateContextNodes();
    this.updateDomainNodes();

    this.applyDeltaBar(this.deltaBars.wellbeing, this.outcome.wellbeingDelta);
    this.applyDeltaBar(this.deltaBars.aura, this.outcome.auraDelta);
    this.applyDeltaBar(this.deltaBars.identity, this.outcome.identityStateDelta);

    const auraColor = this.outcome.auraDelta >= 0 ? "#87d1ff" : "#ff9cac";
    this.auraBands.forEach((band) => {
      const material = band.material as THREE.MeshBasicMaterial;
      material.color.set(auraColor);
    });

    this.applyStepVisibility();
  }

  private updateSliceArc() {
    const previousGeometry = this.sliceArc.geometry;
    this.sliceArc.geometry = new THREE.RingGeometry(
      2.2,
      3.0,
      96,
      1,
      this.startAngle,
      Math.max(this.sliceLength, 0.03)
    );
    previousGeometry.dispose();
  }

  private updateHands() {
    this.setHand(this.startHand, this.startAngle, 2.72);
    this.setHand(this.endHand, this.startAngle + this.sliceLength, 3.1);
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

    const baseAngle = performanceNode.angle;
    const enabled = this.draft.wellbeingNode === "~~Performance";
    const activeDomains = new Set(this.outcome.saocommonsDomains);

    this.domainNodes.forEach((entry, index) => {
      const offset = (index - 1) * 0.34;
      const angle = baseAngle + offset;
      const radius = 6.12;
      entry.mesh.position.set(Math.cos(angle) * radius, 0.52, Math.sin(angle) * radius);
      entry.label.position.set(Math.cos(angle) * (radius + 0.62), 1.1, Math.sin(angle) * (radius + 0.62));

      const isActive = enabled && activeDomains.has(entry.domain);
      const isHovered = entry.domain === this.hoveredDomain;
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isActive ? 0.56 : isHovered ? 0.38 : 0.16;
      entry.mesh.scale.setScalar(isActive ? 1.24 : isHovered ? 1.12 : 1);
      (entry.label.material as THREE.SpriteMaterial).opacity = isActive || isHovered ? 0.96 : 0.62;
    });
  }

  // Show only the layer relevant to the current step to avoid cognitive overload.
  private applyStepVisibility() {
    const stageVisible = new Set<StageVisual["id"]>();
    if (this.step === "value_capture") {
      stageVisible.add("value_capture");
    } else if (this.step === "wellbeing_context") {
      stageVisible.add("value_capture");
      stageVisible.add("wellbeing");
    } else if (this.step === "performance_tags") {
      stageVisible.add("wellbeing");
      if (this.draft.wellbeingNode === "~~Performance") {
        stageVisible.add("saocommons");
      }
    } else if (this.step === "compute" || this.step === "commit") {
      stageVisible.add("outcome");
    }

    this.stageCards.forEach((stage) => {
      const visible = stageVisible.has(stage.id);
      stage.mesh.visible = visible;
      stage.label.visible = false;
    });

    const showContext = this.step === "wellbeing_context" || this.step === "performance_tags";
    this.contextNodes.forEach((node) => {
      node.mesh.visible = showContext;
      node.label.visible = showContext && node.key === this.draft.wellbeingNode;
    });

    const showDomains =
      this.step === "performance_tags" && this.draft.wellbeingNode === "~~Performance";
    this.domainNodes.forEach((entry) => {
      entry.mesh.visible = showDomains;
      entry.label.visible = showDomains;
    });

    const showOutcome = this.step === "compute" || this.step === "commit";
    this.auraBands.forEach((band) => {
      band.visible = showOutcome;
    });
    Object.values(this.deltaBars).forEach((bar) => {
      bar.visible = showOutcome;
    });
    this.deltaLabels.forEach((label) => {
      label.visible = showOutcome;
    });

    if (this.clockLabel) {
      this.clockLabel.visible = true;
    }
  }

  private applyStepCameraPreset() {
    const target = this.getCameraPresetForStep();
    this.camera.position.copy(target.position);
    this.cameraLookAt.copy(target.lookAt);
    this.controls.target.copy(target.lookAt);
    this.controls.update();
  }

  private getCameraPresetForStep() {
    const position = new THREE.Vector3();
    const lookAt = new THREE.Vector3(0, 0.55, 0);

    if (this.step === "time_slice" || this.step === "value_capture") {
      if (this.isMobileViewport) {
        position.set(0, 7.3, 11.8);
      } else {
        position.set(0, 5.9, 10.4);
      }
      lookAt.set(0, 0.45, 0);
    } else if (this.step === "wellbeing_context") {
      if (this.isMobileViewport) {
        position.set(-0.2, 6.8, 10.7);
      } else {
        position.set(-0.3, 5.5, 9.4);
      }
      lookAt.set(0.1, 0.7, 0.2);
    } else if (this.step === "performance_tags") {
      if (this.isMobileViewport) {
        position.set(2.8, 6.6, 10.6);
      } else {
        position.set(2.4, 5.3, 9.3);
      }
      lookAt.set(2.0, 0.8, 4.8);
    } else {
      if (this.isMobileViewport) {
        position.set(0, 6.9, 10.9);
      } else {
        position.set(0, 5.4, 9.4);
      }
      lookAt.set(0, 0.8, 5.0);
    }

    return { position, lookAt };
  }

  private updatePointerHover() {
    const hit = this.raycastInteractive();
    this.hoveredContext = hit?.type === "context" ? hit.key : null;
    this.hoveredDomain = hit?.type === "domain" ? hit.domain : null;
    this.updateContextNodes();
    this.updateDomainNodes();
  }

  private raycastInteractive():
    | { type: "clock" }
    | { type: "context"; key: WellbeingContextNode }
    | { type: "domain"; domain: DomainNodeVisual["domain"] }
    | null {
    const targets: THREE.Object3D[] = [];
    if (this.step === "time_slice" || this.step === "value_capture") {
      if (this.clockDial) targets.push(this.clockDial);
    }
    if (this.step === "wellbeing_context") {
      this.contextNodes.forEach((node) => targets.push(node.mesh));
    }
    if (this.step === "performance_tags" && this.draft.wellbeingNode === "~~Performance") {
      this.domainNodes.forEach((node) => targets.push(node.mesh));
    }

    if (targets.length === 0) return null;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersections = this.raycaster.intersectObjects(targets, false);
    const object = intersections[0]?.object;
    if (!object) return null;

    if (this.clockDial && object === this.clockDial) {
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

  private setHand(mesh: THREE.Mesh, angle: number, length: number) {
    mesh.scale.set(length, 1, 1);
    mesh.position.set(Math.cos(angle) * length * 0.5, mesh.position.y, Math.sin(angle) * length * 0.5);
    mesh.rotation.y = -angle;
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

  private buildEntry(personId: string, roleHint?: string): IovValueLogEntry {
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
          "~~~ContributorRole": roleHint ?? this.draft.contributorRole,
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
                "~~~LearningOutput": this.draft.learningTag ? 0.72 : 0.45,
                "~~~EarningOutput": this.draft.earningTag ? 0.69 : 0.43,
                "~~~OrgBuildingOutput": this.draft.orgBuildingTag ? 0.68 : 0.41,
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
}

const STEP_LABELS: Record<ValueLogStep, string> = {
  time_slice: "1. Time Slice",
  value_capture: "2. Value Capture",
  wellbeing_context: "3. Wellbeing Context",
  performance_tags: "4. Performance -> L/E/O",
  compute: "5. Compute Deltas",
  commit: "6. Commit Time Slice",
};

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

const normalizeMinuteSpan = (deltaMinutes: number) => {
  if (deltaMinutes <= 0) {
    return deltaMinutes + 1440;
  }
  return deltaMinutes;
};

const minutesToClockAngle = (minutes: number) => {
  return (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
};
