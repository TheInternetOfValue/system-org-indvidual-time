import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { IovValueLogEntry, WellbeingContextNode } from "./iovTimelogs";

export type WizardStep =
  | "select_time"
  | "select_wellbeing"
  | "select_performance"
  | "show_outcome";

export const WIZARD_STEP_ORDER: WizardStep[] = [
  "select_time",
  "select_wellbeing",
  "select_performance",
  "show_outcome",
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
  step: WizardStep;
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
  private clockLabel: THREE.Sprite | null = null;
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
    select_performance: "saocommons",
    show_outcome: "outcome",
  };

  private draft: ValueLogDraft = createInitialValueLogDraft();
  private step: WizardStep = "select_time";
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

  private readonly stringsGroup = new THREE.Group();

  constructor(private readonly domElement: HTMLElement) {
    // ---- Photon Token Creation ----
    this.token = new THREE.Object3D();
    
    // Core photon (small, bright)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: "#ffffff" })
    );
    this.token.add(core);

    // Glow halo (sprite)
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(200, 235, 255, 1)");
      grad.addColorStop(0.3, "rgba(80, 160, 255, 0.6)");
      grad.addColorStop(1, "rgba(0, 50, 150, 0)");
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
    const light = new THREE.PointLight("#6eb6ff", 1.2, 5);
    this.token.add(light);

    // Create tail segments
    for(let i = 0; i < 12; i++) {
        const seg = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 - (i * 0.0035), 8, 8),
            new THREE.MeshBasicMaterial({ 
                color: "#92c9ff", 
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

    this.clockGroup.position.set(0, 4, 0);

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

  setStep(step: WizardStep) {
    this.step = step;
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  nextStep() {
    const currentIndex = WIZARD_STEP_ORDER.indexOf(this.step);
    if (currentIndex < 0 || currentIndex >= WIZARD_STEP_ORDER.length - 1) return;

    const next = WIZARD_STEP_ORDER[currentIndex + 1] ?? this.step;
    if (next === "select_performance" && this.draft.wellbeingNode !== "~~Performance") {
      this.step = "show_outcome";
    } else {
      this.step = next;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  prevStep() {
    const currentIndex = WIZARD_STEP_ORDER.indexOf(this.step);
    if (currentIndex <= 0) return;

    if (this.step === "show_outcome" && this.draft.wellbeingNode !== "~~Performance") {
      this.step = "select_wellbeing";
    } else {
      this.step = WIZARD_STEP_ORDER[currentIndex - 1] ?? this.step;
    }
    this.applyStepCameraPreset();
    this.applyDraft();
  }

  commit(personId: string, roleHint?: string): IovValueLogEntry {
    const entry = this.buildEntry(personId, roleHint);
    this.committedCount += 1;
    this.step = "select_time";
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
      if (this.step === "select_time") {
        this.setStep("select_wellbeing");
      }
      return;
    }

    if (hit.type === "context" && this.step === "select_wellbeing") {
      // Toggle selection
      if (this.draft.wellbeingNode === hit.key) {
        this.patchDraft({ wellbeingNode: undefined });
      } else {
        this.patchDraft({ wellbeingNode: hit.key });
        if (hit.key === "~~Performance") {
          this.setStep("select_performance");
        } else {
          this.setStep("show_outcome");
        }
      }
      return;
    }

    if (
      hit.type === "domain" &&
      this.step === "select_performance" &&
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

    // Token trickles down the chandelier based on the current step
    const targetPos = new THREE.Vector3();
    
    if (this.step === "select_time") {
      const orbitRadius = 2.58;
      const phase = (Math.sin(this.elapsedSeconds * 0.9) + 1) * 0.5;
      const tokenAngle = this.startAngle + this.sliceLength * phase;
      targetPos.set(
        Math.cos(tokenAngle) * orbitRadius,
        4.58 + Math.sin(this.elapsedSeconds * 1.4) * 0.06, // Clock is at Y=4
        Math.sin(tokenAngle) * orbitRadius
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
      // Drop into the Identity/Aura pool at the bottom
      targetPos.set(0, -5.0 + Math.sin(this.elapsedSeconds * 2.5) * 0.08, 0);
    }

    // Smoothly interpolate token position (faster lerp for photon)
    this.token.position.lerp(targetPos, 7.0 * deltaSeconds);

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
      select_performance: "Performance Domains",
      show_outcome: "Review & Commit",
    };

    return {
      step: this.step,
      stepIndex: stepIndex < 0 ? 0 : stepIndex,
      stepLabel: stepLabels[this.step],
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
    // Remove the floor plane so it doesn't block the view of the lower layers
    // const floor = new THREE.Mesh(
    //   new THREE.PlaneGeometry(28, 20),
    //   new THREE.MeshStandardMaterial({
    //     color: "#0e1c32",
    //     roughness: 0.94,
    //     metalness: 0.03,
    //   })
    // );
    // floor.rotation.x = -Math.PI / 2;
    // floor.position.y = 0;
    // this.root.add(floor);

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
    this.clockGroup.add(this.startHand, this.endHand);
    this.root.add(this.token); // Add token to root for global positioning

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
    this.clockGroup.add(this.clockLabel);

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
        new THREE.SphereGeometry(0.45, 32, 32), // Made spheres slightly larger
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

      const label = this.createTextSprite(def.label, { width: 180, height: 52, fontSize: 16 });
      label.position.set(x, y + 1.0, z); // Moved label slightly higher
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
    this.stringsGroup.clear();

    const material = new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.15,
    });

    // Connect Clock to Wellbeing Nodes
    const clockCenter = new THREE.Vector3(0, 4, 0);
    this.contextNodes.forEach((node) => {
      const points = [clockCenter, node.mesh.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.stringsGroup.add(line);
    });

    // Connect Performance Node to SAOcommons Cylinders
    const performanceNode = this.contextNodes.find((node) => node.key === "~~Performance");
    if (performanceNode && this.draft.wellbeingNode === "~~Performance") {
      this.domainNodes.forEach((domain) => {
        const points = [performanceNode.mesh.position, domain.mesh.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
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

    // Clock elements - always visible (top of chandelier)
    const showClock = true;
    if (this.clockDial) this.clockDial.visible = showClock;
    this.sliceArc.visible = showClock;
    this.startHand.visible = showClock;
    this.endHand.visible = showClock;
    if (this.clockLabel) {
      this.clockLabel.visible = showClock;
    }

    // Wellbeing nodes - visible from step 1 onwards
    const showWellbeing = stepIndex >= 1;
    this.contextNodes.forEach((node) => {
      node.mesh.visible = showWellbeing;
      node.label.visible = showWellbeing;
    });

    // Performance domains - visible from step 2 onwards (if Performance was chosen)
    const showPerformance = stepIndex >= 2 && this.draft.wellbeingNode === "~~Performance";
    this.domainNodes.forEach((entry) => {
      entry.mesh.visible = showPerformance;
      entry.label.visible = showPerformance;
    });

    // Strings - visible if the layer they connect to is visible
    this.stringsGroup.visible = showWellbeing;

    // Outcome elements - only visible during outcome review
    const showOutcome = this.step === "show_outcome";
    this.auraBands.forEach((band) => {
      band.visible = showOutcome;
    });
    Object.values(this.deltaBars).forEach((bar) => {
      bar.visible = showOutcome;
    });
    this.deltaLabels.forEach((label) => {
      label.visible = showOutcome;
    });

    // Activity token (yellow sphere) - always visible as it trickles down
    this.token.visible = true;
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
    const lookAt = new THREE.Vector3(0, 0, 0);

    if (this.step === "select_time") {
      if (this.isMobileViewport) {
        position.set(0, 6.5, 12.0);
      } else {
        position.set(0, 6.0, 10.0);
      }
      lookAt.set(0, 4.0, 0);
    } else if (this.step === "select_wellbeing") {
      if (this.isMobileViewport) {
        position.set(0, 0.0, 18.0);
      } else {
        position.set(0, 0.0, 16.0);
      }
      lookAt.set(0, 0.0, 0);
    } else if (this.step === "select_performance") {
      const performanceNode = this.contextNodes.find((node) => node.key === "~~Performance");
      const px = performanceNode ? performanceNode.mesh.position.x : 0;
      const py = performanceNode ? performanceNode.mesh.position.y - 2.5 : -3;
      const pz = performanceNode ? performanceNode.mesh.position.z : 0;

      if (this.isMobileViewport) {
        position.set(px, py + 2.0, pz + 10.0);
      } else {
        position.set(px, py + 1.5, pz + 8.0);
      }
      lookAt.set(px, py, pz);
    } else {
      // show_outcome: pull back to see the whole chandelier
      if (this.isMobileViewport) {
        position.set(0, 3.0, 18.0);
      } else {
        position.set(0, 2.0, 16.0);
      }
      lookAt.set(0, 1.0, 0);
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
    if (this.step === "select_time") {
      if (this.clockDial) targets.push(this.clockDial);
    }
    if (this.step === "select_wellbeing") {
      this.contextNodes.forEach((node) => targets.push(node.mesh));
    }
    if (this.step === "select_performance" && this.draft.wellbeingNode === "~~Performance") {
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
