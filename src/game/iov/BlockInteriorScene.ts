import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RegionId, SelectedBrickInfo } from "./IovTopologyScene";

export interface BlockPeopleSummary {
  regionId: RegionId;
  brickLabel: string;
  peopleCount: number;
  profileMix: Record<string, number>;
  selectedPersonId: string | null;
  hoveredPersonId: string | null;
}

interface BlockInteriorCallbacks {
  onHoverPersonChange?: (personId: string | null) => void;
  onSelectPersonChange?: (personId: string | null) => void;
}

interface PersonToken {
  id: string;
  position: THREE.Vector3;
  profile: string;
  color: THREE.Color;
  heightScale: number;
  shoulderWidth: number;
  stance: number;
}

interface OrgAuraToken {
  mesh: THREE.Mesh;
  phase: number;
}

interface OrgContagionSummary {
  activatedPeopleCount: number;
  populationCount: number;
}

const PROFILE_BY_REGION: Record<RegionId, string[]> = {
  market: ["Trader", "Engineer", "Analyst", "Worker"],
  state: ["Civil Servant", "Nurse", "Teacher", "Operator"],
  community: ["Caregiver", "Co-op Member", "Volunteer", "Neighbor"],
  crony_bridge: ["Lobbyist", "Regulator", "Executive", "Advisor"],
};

const PEOPLE_COUNT_BY_REGION: Record<RegionId, number> = {
  market: 18,
  state: 14,
  community: 22,
  crony_bridge: 10,
};

export class BlockInteriorScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  readonly controls: OrbitControls;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private hasPointer = false;
  private isMobileViewport = false;

  private readonly root = new THREE.Group();
  private readonly peopleGroup = new THREE.Group();
  private readonly torsoGeometry = new THREE.BoxGeometry(0.24, 0.32, 0.14);
  private readonly pelvisGeometry = new THREE.BoxGeometry(0.2, 0.12, 0.12);
  private readonly armGeometry = new THREE.BoxGeometry(0.06, 0.24, 0.06);
  private readonly legGeometry = new THREE.BoxGeometry(0.08, 0.26, 0.08);
  private readonly headGeometry = new THREE.SphereGeometry(0.16, 14, 10);
  private torsoMesh: THREE.InstancedMesh | null = null;
  private pelvisMesh: THREE.InstancedMesh | null = null;
  private leftArmMesh: THREE.InstancedMesh | null = null;
  private rightArmMesh: THREE.InstancedMesh | null = null;
  private leftLegMesh: THREE.InstancedMesh | null = null;
  private rightLegMesh: THREE.InstancedMesh | null = null;
  private headMesh: THREE.InstancedMesh | null = null;
  private readonly personTokens: PersonToken[] = [];
  private readonly profileMix: Record<string, number> = {};

  private readonly hoverMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.3, 24),
    new THREE.MeshBasicMaterial({
      color: "#ffd466",
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    })
  );
  private readonly selectedMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.4, 24),
    new THREE.MeshBasicMaterial({
      color: "#74b8ff",
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    })
  );

  private sourceRegion: RegionId = "community";
  private selectedBrickLabel = "Brick";
  private hoveredPersonId: string | null = null;
  private selectedPersonId: string | null = null;
  private activatedPersonId: string | null = null;
  private activationMesh: THREE.Mesh | null = null;
  private readonly activationLight = new THREE.PointLight("#ffcd3c", 2, 4);
  private readonly orgActivationLight = new THREE.PointLight("#ffd26a", 0, 8);
  private readonly orgAuraGeometry = new THREE.TorusGeometry(0.24, 0.02, 8, 24);
  private readonly orgAuraMaterial = new THREE.MeshBasicMaterial({
    color: "#ffe291",
    transparent: true,
    opacity: 0.72,
  });
  private readonly orgAuraTokens: OrgAuraToken[] = [];
  private readonly orgActivatedIndices = new Set<number>();
  private orgActivated = false;
  private contagionRunning = false;
  private contagionOrder: number[] = [];
  private contagionCursor = 0;
  private contagionFromIndex: number | null = null;
  private contagionToIndex: number | null = null;
  private contagionStepT = 0;
  private contagionHoldSeconds = 0;
  private contagionOnComplete: ((summary: OrgContagionSummary) => void) | null = null;
  private readonly contagionPulseGeometry = new THREE.SphereGeometry(0.1, 16, 12);
  private readonly contagionPulseMaterial = new THREE.MeshBasicMaterial({
    color: "#ffd870",
  });
  private readonly contagionPulse = new THREE.Mesh(
    this.contagionPulseGeometry,
    this.contagionPulseMaterial
  );
  private readonly contagionPulseLight = new THREE.PointLight("#ffd15a", 0, 3.8);
  private personFocusCueActive = false;
  private personFocusCueElapsed = 0;
  private personFocusCueDuration = 0;
  private personFocusCueResolver: (() => void) | null = null;
  private personFocusCueBaseOpacity = 0.92;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly callbacks: BlockInteriorCallbacks = {}
  ) {
    this.scene.add(this.root);
    this.root.add(this.peopleGroup);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.4;
    this.controls.maxDistance = 10;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.46;

    this.setupSceneLook();
    this.rebuildPeople("community", "Community Brick");

    this.hoverMarker.rotation.x = -Math.PI / 2;
    this.hoverMarker.visible = false;
    this.selectedMarker.rotation.x = -Math.PI / 2;
    this.selectedMarker.visible = false;
    this.root.add(this.hoverMarker, this.selectedMarker);
    this.orgActivationLight.position.set(0, 1.1, 0);
    this.orgActivationLight.visible = false;
    this.root.add(this.orgActivationLight);
    this.contagionPulse.visible = false;
    this.contagionPulseLight.visible = false;
    this.contagionPulse.add(this.contagionPulseLight);
    this.contagionPulseLight.position.set(0, 0.32, 0);
    this.root.add(this.contagionPulse);

    this.camera.position.set(0, 2.5, 6.8);
    this.controls.target.set(0, 0.95, 0);
    this.controls.update();
  }

  setSourceBrick(selection: SelectedBrickInfo | null) {
    if (!selection) return;
    const label = `${toRegionLabel(selection.regionId)} #${selection.instanceId + 1}`;
    this.rebuildPeople(selection.regionId, label);
  }

  getSummary(): BlockPeopleSummary {
    return {
      regionId: this.sourceRegion,
      brickLabel: this.selectedBrickLabel,
      peopleCount: this.personTokens.length,
      profileMix: { ...this.profileMix },
      selectedPersonId: this.selectedPersonId,
      hoveredPersonId: this.hoveredPersonId,
    };
  }

  getPersonAnchor(personId: string | null) {
    const targetId = personId ?? this.selectedPersonId;
    if (!targetId) return null;
    const token = this.personTokens.find((person) => person.id === targetId);
    if (!token) return null;
    return new THREE.Vector3(token.position.x, 0.78 * token.heightScale, token.position.z);
  }

  playPersonFocusCue(personId: string, durationMs = 160) {
    const token = this.personTokens.find((person) => person.id === personId);
    if (!token) return Promise.resolve();

    this.selectedMarker.visible = true;
    this.selectedMarker.position.set(token.position.x, 0.05, token.position.z);
    this.selectedMarker.scale.set(1, 1, 1);
    const material = this.selectedMarker.material as THREE.MeshBasicMaterial;
    this.personFocusCueBaseOpacity = material.opacity;
    this.personFocusCueActive = true;
    this.personFocusCueElapsed = 0;
    this.personFocusCueDuration = Math.max(0.08, durationMs / 1000);

    return new Promise<void>((resolve) => {
      this.personFocusCueResolver = resolve;
    });
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    if (this.isMobileViewport === isMobile) return;
    this.isMobileViewport = isMobile;

    if (isMobile) {
      this.camera.fov = 52;
      this.camera.position.set(0, 2.7, 7.8);
      this.controls.target.set(0, 1.05, 0);
      this.controls.minDistance = 4.2;
      this.controls.maxDistance = 11;
    } else {
      this.camera.fov = 48;
      this.camera.position.set(0, 2.5, 6.8);
      this.controls.target.set(0, 0.95, 0);
      this.controls.minDistance = 3.4;
      this.controls.maxDistance = 10;
    }

    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setPointerFromCanvas(x: number, y: number, width: number, height: number) {
    this.pointerNdc.x = (x / width) * 2 - 1;
    this.pointerNdc.y = -(y / height) * 2 + 1;
    this.hasPointer = true;
    this.updateHover();
  }

  clearPointer() {
    this.hasPointer = false;
    this.hoverMarker.visible = false;
    this.hoveredPersonId = null;
    this.callbacks.onHoverPersonChange?.(null);
  }

  selectFromPointer() {
    if (!this.hasPointer) return;

    const hit = this.raycastPeople();
    if (!hit) return;

    const token = this.personTokens[hit.instanceId];
    if (!token) return;
    this.selectedPersonId = token.id;
    this.selectedMarker.visible = true;
    this.selectedMarker.position.set(token.position.x, 0.05, token.position.z);
    this.callbacks.onSelectPersonChange?.(token.id);
  }

  activatePerson(personId: string) {
    this.resetOrgActivationState();

    if (this.activatedPersonId === personId) return;
    this.activatedPersonId = personId;

    if (!this.activationMesh) {
      // Create a glowing ring/aura for the activated person
      const geo = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: "#ffda57",
        transparent: true,
        opacity: 0.8,
      });
      this.activationMesh = new THREE.Mesh(geo, mat);
      this.activationMesh.rotation.x = Math.PI / 2;
      this.root.add(this.activationMesh);
      this.activationMesh.add(this.activationLight);
      this.activationLight.position.set(0, 1.5, 0);
    }

    const person = this.personTokens.find((p) => p.id === personId);
    if (person && this.activationMesh) {
      this.activationMesh.visible = true;
      this.activationMesh.position.set(person.position.x, 0.1, person.position.z);
      this.activationLight.visible = true;
    } else if (this.activationMesh) {
      this.activationMesh.visible = false;
      this.activationLight.visible = false;
    }
  }

  activateOrganization(seedPersonId?: string) {
    this.resetOrgActivationState();
    if (seedPersonId) {
      this.activatePerson(seedPersonId);
    }
    this.orgActivated = true;
    this.ensureOrgAuraTokens();
    this.orgActivatedIndices.clear();
    this.personTokens.forEach((_, index) => {
      this.orgActivatedIndices.add(index);
    });
    this.orgAuraTokens.forEach(({ mesh }) => {
      mesh.visible = true;
    });
    this.applyBodyPalette(true);
    this.orgActivationLight.visible = true;
    this.orgActivationLight.intensity = 2.6;
  }

  playOrgContagion(
    seedPersonId: string,
    onComplete?: (summary: OrgContagionSummary) => void
  ) {
    this.resetOrgActivationState();
    this.ensureOrgAuraTokens();
    this.contagionOnComplete = onComplete ?? null;

    if (this.personTokens.length === 0) {
      this.contagionOnComplete?.({
        activatedPeopleCount: 0,
        populationCount: 0,
      });
      return;
    }

    const seedIndex = this.resolvePersonIndex(seedPersonId);
    this.activateOrgPerson(seedIndex);
    this.positionActivationForIndex(seedIndex);

    this.contagionOrder = this.buildContagionOrder(seedIndex);
    this.contagionCursor = 1;
    this.contagionFromIndex = seedIndex;
    this.contagionToIndex =
      this.contagionCursor < this.contagionOrder.length
        ? (this.contagionOrder[this.contagionCursor] ?? null)
        : null;
    this.contagionStepT = 0;
    this.contagionHoldSeconds = 0;
    this.contagionRunning = true;

    this.orgActivationLight.visible = true;
    this.orgActivationLight.intensity = 1.4;
    this.contagionPulse.visible = this.contagionToIndex !== null;
    this.contagionPulseLight.visible = this.contagionToIndex !== null;
    if (this.contagionFromIndex !== null) {
      const from = this.personTokens[this.contagionFromIndex];
      if (from) {
        this.contagionPulse.position.set(from.position.x, 0.32, from.position.z);
      }
    }
  }

  update(deltaSeconds: number) {
    this.controls.update();
    if (this.hasPointer) this.updateHover();

    // Small idle sway keeps interior scene alive without expensive animation.
    this.peopleGroup.position.y = Math.sin(performance.now() * 0.0012) * 0.02;

    if (this.contagionRunning) {
      this.updateOrgContagion(deltaSeconds);
    }

    if (this.activationMesh && this.activationMesh.visible) {
      // Pulse the activation aura
      const time = performance.now() * 0.001;
      this.activationMesh.rotation.z = time;
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      this.activationMesh.scale.set(pulse, pulse, 1);
      this.activationLight.intensity = 2 + Math.sin(time * 5) * 0.5;
    }

    if (this.orgActivated || this.contagionRunning) {
      const time = performance.now() * 0.001;
      this.orgAuraTokens.forEach(({ mesh, phase }) => {
        if (!mesh.visible) return;
        const pulse = 1 + Math.sin(time * 2.6 + phase) * 0.16;
        mesh.scale.set(pulse, pulse, 1);
      });
      if (this.orgActivated) {
        this.orgActivationLight.intensity = 2.4 + Math.sin(time * 3.1) * 0.35;
      }
    }

    if (this.contagionPulse.visible) {
      const time = performance.now() * 0.001;
      const pulse = 1 + Math.sin(time * 10) * 0.16;
      this.contagionPulse.scale.setScalar(pulse);
      this.contagionPulseLight.intensity = 1.6 + Math.sin(time * 12) * 0.3;
    }

    this.updatePersonFocusCue(deltaSeconds);
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    if (this.personFocusCueActive) {
      this.personFocusCueActive = false;
      const done = this.personFocusCueResolver;
      this.personFocusCueResolver = null;
      done?.();
    }
    if (this.activationMesh) {
      this.root.remove(this.activationMesh);
      this.activationMesh.geometry.dispose();
      (this.activationMesh.material as THREE.Material).dispose();
      this.activationMesh = null;
    }
    this.clearOrgAuraTokens();
    this.orgAuraGeometry.dispose();
    this.orgAuraMaterial.dispose();
    this.contagionPulseGeometry.dispose();
    this.contagionPulseMaterial.dispose();
    this.torsoGeometry.dispose();
    this.pelvisGeometry.dispose();
    this.armGeometry.dispose();
    this.legGeometry.dispose();
    this.headGeometry.dispose();
    this.disposePeopleMeshes();
    this.hoverMarker.geometry.dispose();
    (this.hoverMarker.material as THREE.Material).dispose();
    this.selectedMarker.geometry.dispose();
    (this.selectedMarker.material as THREE.Material).dispose();
  }

  private setupSceneLook() {
    this.scene.background = new THREE.Color("#eef3fb");
    this.scene.fog = new THREE.Fog("#e8eef8", 10, 24);

    this.scene.add(new THREE.AmbientLight("#f5f8ff", 1.2));

    const key = new THREE.DirectionalLight("#ffffff", 0.95);
    key.position.set(4, 8, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#bfd4ef", 0.5);
    fill.position.set(-5, 5, -4);
    this.scene.add(fill);

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.4, 5.4),
      new THREE.MeshStandardMaterial({
        color: "#d8e3f2",
        roughness: 0.96,
        metalness: 0.01,
        transparent: true,
        opacity: 0.35,
        side: THREE.BackSide,
      })
    );
    room.position.y = 1.5;
    this.root.add(room);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 5.4),
      new THREE.MeshStandardMaterial({
        color: "#d2deef",
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.root.add(floor);
  }

  private rebuildPeople(regionId: RegionId, label: string) {
    this.disposePeopleMeshes();
    this.personTokens.length = 0;
    this.selectedPersonId = null;
    this.hoveredPersonId = null;
    this.resetOrgActivationState();
    this.clearOrgAuraTokens();
    this.selectedMarker.visible = false;
    this.hoverMarker.visible = false;
    this.selectedBrickLabel = label;
    this.sourceRegion = regionId;

    Object.keys(this.profileMix).forEach((key) => {
      delete this.profileMix[key];
    });

    const profiles = PROFILE_BY_REGION[regionId];
    const total = PEOPLE_COUNT_BY_REGION[regionId];

    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    const xSpan = 4.8;
    const zSpan = 3.2;
    const xStep = cols <= 1 ? 0 : xSpan / (cols - 1);
    const zStep = rows <= 1 ? 0 : zSpan / (rows - 1);

    const baseColor = getRegionPeopleColor(regionId);
    for (let i = 0; i < total; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = -xSpan * 0.5 + col * xStep;
      const z = -zSpan * 0.5 + row * zStep;
      const profile = profiles[i % profiles.length] ?? profiles[0] ?? "Participant";
      this.profileMix[profile] = (this.profileMix[profile] ?? 0) + 1;
      this.personTokens.push({
        id: `${profile}-${i + 1}`,
        position: new THREE.Vector3(x, 0, z),
        profile,
        color: varyColor(baseColor, i),
        heightScale: 0.92 + (i % 5) * 0.045,
        shoulderWidth: 0.95 + ((i + 2) % 4) * 0.05,
        stance: (i % 3 - 1) * 0.02,
      });
    }

    const bodyMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.68,
      metalness: 0.04,
    });
    const headMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.02,
      color: "#f4e8da",
    });

    this.torsoMesh = new THREE.InstancedMesh(this.torsoGeometry, bodyMaterial, this.personTokens.length);
    this.pelvisMesh = new THREE.InstancedMesh(
      this.pelvisGeometry,
      new THREE.MeshStandardMaterial({
        roughness: 0.72,
        metalness: 0.03,
      }),
      this.personTokens.length
    );
    this.leftArmMesh = new THREE.InstancedMesh(
      this.armGeometry,
      new THREE.MeshStandardMaterial({
        roughness: 0.7,
        metalness: 0.03,
      }),
      this.personTokens.length
    );
    this.rightArmMesh = new THREE.InstancedMesh(
      this.armGeometry,
      new THREE.MeshStandardMaterial({
        roughness: 0.7,
        metalness: 0.03,
      }),
      this.personTokens.length
    );
    this.leftLegMesh = new THREE.InstancedMesh(
      this.legGeometry,
      new THREE.MeshStandardMaterial({
        roughness: 0.76,
        metalness: 0.02,
      }),
      this.personTokens.length
    );
    this.rightLegMesh = new THREE.InstancedMesh(
      this.legGeometry,
      new THREE.MeshStandardMaterial({
        roughness: 0.76,
        metalness: 0.02,
      }),
      this.personTokens.length
    );
    this.headMesh = new THREE.InstancedMesh(this.headGeometry, headMaterial, this.personTokens.length);
    this.torsoMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pelvisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leftArmMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rightArmMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leftLegMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rightLegMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    this.personTokens.forEach((person, index) => {
      // Torso
      scale.set(person.shoulderWidth, person.heightScale, 1);
      matrix.compose(
        new THREE.Vector3(person.position.x, 0.58 * person.heightScale, person.position.z),
        quaternion,
        scale
      );
      this.torsoMesh?.setMatrixAt(index, matrix);
      this.torsoMesh?.setColorAt(index, person.color);

      // Pelvis
      scale.set(1, person.heightScale, 1);
      matrix.compose(
        new THREE.Vector3(person.position.x, 0.38 * person.heightScale, person.position.z),
        quaternion,
        scale
      );
      this.pelvisMesh?.setMatrixAt(index, matrix);
      this.pelvisMesh?.setColorAt(index, person.color.clone().multiplyScalar(0.93));

      // Arms
      scale.set(1, person.heightScale, 1);
      matrix.compose(
        new THREE.Vector3(
          person.position.x - 0.17 * person.shoulderWidth,
          0.58 * person.heightScale,
          person.position.z
        ),
        quaternion,
        scale
      );
      this.leftArmMesh?.setMatrixAt(index, matrix);
      this.leftArmMesh?.setColorAt(index, person.color.clone().multiplyScalar(0.88));

      matrix.compose(
        new THREE.Vector3(
          person.position.x + 0.17 * person.shoulderWidth,
          0.58 * person.heightScale,
          person.position.z
        ),
        quaternion,
        scale
      );
      this.rightArmMesh?.setMatrixAt(index, matrix);
      this.rightArmMesh?.setColorAt(index, person.color.clone().multiplyScalar(0.88));

      // Legs
      matrix.compose(
        new THREE.Vector3(
          person.position.x - 0.06 + person.stance,
          0.17 * person.heightScale,
          person.position.z
        ),
        quaternion,
        scale
      );
      this.leftLegMesh?.setMatrixAt(index, matrix);
      this.leftLegMesh?.setColorAt(index, person.color.clone().multiplyScalar(0.74));

      matrix.compose(
        new THREE.Vector3(
          person.position.x + 0.06 - person.stance,
          0.17 * person.heightScale,
          person.position.z
        ),
        quaternion,
        scale
      );
      this.rightLegMesh?.setMatrixAt(index, matrix);
      this.rightLegMesh?.setColorAt(index, person.color.clone().multiplyScalar(0.74));

      // Head
      matrix.makeTranslation(person.position.x, 0.86 * person.heightScale, person.position.z);
      this.headMesh?.setMatrixAt(index, matrix);
    });
    this.torsoMesh.instanceMatrix.needsUpdate = true;
    this.pelvisMesh.instanceMatrix.needsUpdate = true;
    this.leftArmMesh.instanceMatrix.needsUpdate = true;
    this.rightArmMesh.instanceMatrix.needsUpdate = true;
    this.leftLegMesh.instanceMatrix.needsUpdate = true;
    this.rightLegMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
    if (this.torsoMesh.instanceColor) this.torsoMesh.instanceColor.needsUpdate = true;
    if (this.pelvisMesh.instanceColor) this.pelvisMesh.instanceColor.needsUpdate = true;
    if (this.leftArmMesh.instanceColor) this.leftArmMesh.instanceColor.needsUpdate = true;
    if (this.rightArmMesh.instanceColor) this.rightArmMesh.instanceColor.needsUpdate = true;
    if (this.leftLegMesh.instanceColor) this.leftLegMesh.instanceColor.needsUpdate = true;
    if (this.rightLegMesh.instanceColor) this.rightLegMesh.instanceColor.needsUpdate = true;

    this.peopleGroup.add(
      this.leftLegMesh,
      this.rightLegMesh,
      this.pelvisMesh,
      this.torsoMesh,
      this.leftArmMesh,
      this.rightArmMesh,
      this.headMesh
    );
  }

  private ensureOrgAuraTokens() {
    if (this.orgAuraTokens.length === this.personTokens.length) return;
    this.clearOrgAuraTokens();
    this.personTokens.forEach((person, index) => {
      const ring = new THREE.Mesh(this.orgAuraGeometry, this.orgAuraMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(person.position.x, 0.08, person.position.z);
      ring.visible = false;
      this.root.add(ring);
      this.orgAuraTokens.push({
        mesh: ring,
        phase: index * 0.37,
      });
    });
  }

  private clearOrgAuraTokens() {
    this.orgAuraTokens.forEach(({ mesh }) => {
      this.root.remove(mesh);
    });
    this.orgAuraTokens.length = 0;
  }

  private updateOrgContagion(deltaSeconds: number) {
    const stepDuration = 0.26;
    const completionHold = 0.85;

    if (this.contagionToIndex === null || this.contagionFromIndex === null) {
      this.contagionPulse.visible = false;
      this.contagionPulseLight.visible = false;
      this.contagionHoldSeconds += deltaSeconds;
      if (this.contagionHoldSeconds >= completionHold) {
        this.contagionRunning = false;
        this.orgActivated = true;
        this.applyBodyPalette(true);
        this.orgActivationLight.visible = true;
        this.orgActivationLight.intensity = 2.6;
        const summary: OrgContagionSummary = {
          activatedPeopleCount: this.orgActivatedIndices.size,
          populationCount: this.personTokens.length,
        };
        this.contagionOnComplete?.(summary);
        this.contagionOnComplete = null;
      }
      return;
    }

    const from = this.personTokens[this.contagionFromIndex];
    const to = this.personTokens[this.contagionToIndex];
    if (!from || !to) {
      this.contagionToIndex = null;
      return;
    }

    this.contagionStepT = Math.min(1, this.contagionStepT + deltaSeconds / stepDuration);
    this.contagionPulse.visible = true;
    this.contagionPulseLight.visible = true;
    this.contagionPulse.position.lerpVectors(from.position, to.position, this.contagionStepT);
    this.contagionPulse.position.y += Math.sin(this.contagionStepT * Math.PI) * 0.25 + 0.18;

    if (this.contagionStepT >= 0.999) {
      this.activateOrgPerson(this.contagionToIndex);
      this.contagionFromIndex = this.contagionToIndex;
      this.contagionCursor += 1;
      this.contagionToIndex =
        this.contagionCursor < this.contagionOrder.length
          ? (this.contagionOrder[this.contagionCursor] ?? null)
          : null;
      this.contagionStepT = 0;
    }
  }

  private updatePersonFocusCue(deltaSeconds: number) {
    if (!this.personFocusCueActive) return;

    this.personFocusCueElapsed += deltaSeconds;
    const t = Math.min(1, this.personFocusCueElapsed / this.personFocusCueDuration);
    const pulse = 1 + Math.sin(t * Math.PI) * 0.24;
    this.selectedMarker.scale.set(pulse, pulse, 1);
    const material = this.selectedMarker.material as THREE.MeshBasicMaterial;
    material.opacity = this.personFocusCueBaseOpacity + Math.sin(t * Math.PI) * 0.08;

    if (t >= 1) {
      this.selectedMarker.scale.set(1, 1, 1);
      material.opacity = this.personFocusCueBaseOpacity;
      this.personFocusCueActive = false;
      const done = this.personFocusCueResolver;
      this.personFocusCueResolver = null;
      done?.();
    }
  }

  private resolvePersonIndex(personId: string) {
    const idx = this.personTokens.findIndex((person) => person.id === personId);
    return idx >= 0 ? idx : 0;
  }

  private buildContagionOrder(seedIndex: number) {
    const seed = this.personTokens[seedIndex];
    if (!seed) return [];
    const scored = this.personTokens.map((person, index) => ({
      index,
      distance: person.position.distanceTo(seed.position),
    }));
    scored.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.index - b.index;
    });
    return scored.map((item) => item.index);
  }

  private activateOrgPerson(index: number) {
    if (this.orgActivatedIndices.has(index)) return;
    this.orgActivatedIndices.add(index);

    const ring = this.orgAuraTokens[index];
    if (ring) {
      ring.mesh.visible = true;
      ring.mesh.scale.setScalar(1);
    }

    this.setPersonPaletteAt(index, 0.66);
  }

  private setPersonPaletteAt(index: number, blend: number) {
    const person = this.personTokens[index];
    if (!person) return;
    const highlight = new THREE.Color("#ffd56f");
    const tint = (base: THREE.Color, amount: number) => base.clone().lerp(highlight, amount);
    this.setInstanceColorAt(this.torsoMesh, index, tint(person.color, blend));
    this.setInstanceColorAt(this.pelvisMesh, index, tint(person.color.clone().multiplyScalar(0.93), blend * 0.92));
    this.setInstanceColorAt(this.leftArmMesh, index, tint(person.color.clone().multiplyScalar(0.88), blend * 0.88));
    this.setInstanceColorAt(this.rightArmMesh, index, tint(person.color.clone().multiplyScalar(0.88), blend * 0.88));
    this.setInstanceColorAt(this.leftLegMesh, index, tint(person.color.clone().multiplyScalar(0.74), blend * 0.8));
    this.setInstanceColorAt(this.rightLegMesh, index, tint(person.color.clone().multiplyScalar(0.74), blend * 0.8));
  }

  private setInstanceColorAt(
    mesh: THREE.InstancedMesh | null,
    index: number,
    color: THREE.Color
  ) {
    if (!mesh) return;
    mesh.setColorAt(index, color);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  private positionActivationForIndex(index: number) {
    if (!this.activationMesh) {
      const geo = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: "#ffda57",
        transparent: true,
        opacity: 0.8,
      });
      this.activationMesh = new THREE.Mesh(geo, mat);
      this.activationMesh.rotation.x = Math.PI / 2;
      this.root.add(this.activationMesh);
      this.activationMesh.add(this.activationLight);
      this.activationLight.position.set(0, 1.5, 0);
    }

    const person = this.personTokens[index];
    if (!person || !this.activationMesh) return;
    this.activationMesh.visible = true;
    this.activationMesh.position.set(person.position.x, 0.1, person.position.z);
    this.activationLight.visible = true;
  }

  private resetOrgActivationState() {
    this.activatedPersonId = null;
    this.orgActivated = false;
    this.contagionRunning = false;
    this.contagionOrder = [];
    this.contagionCursor = 0;
    this.contagionFromIndex = null;
    this.contagionToIndex = null;
    this.contagionStepT = 0;
    this.contagionHoldSeconds = 0;
    this.contagionOnComplete = null;
    this.orgActivatedIndices.clear();
    this.contagionPulse.visible = false;
    this.contagionPulseLight.visible = false;
    this.orgActivationLight.visible = false;
    this.orgActivationLight.intensity = 0;
    this.orgAuraTokens.forEach(({ mesh }) => {
      mesh.visible = false;
      mesh.scale.setScalar(1);
    });
    if (this.activationMesh) {
      this.activationMesh.visible = false;
    }
    this.activationLight.visible = false;
    this.applyBodyPalette(false);
  }

  private applyBodyPalette(orgActivated: boolean) {
    const highlight = new THREE.Color("#ffd56f");
    const applyColors = (
      mesh: THREE.InstancedMesh | null,
      colorFor: (person: PersonToken) => THREE.Color
    ) => {
      if (!mesh) return;
      this.personTokens.forEach((person, index) => {
        mesh.setColorAt(index, colorFor(person));
      });
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    };

    applyColors(this.torsoMesh, (person) => {
      const base = person.color.clone();
      return orgActivated ? base.lerp(highlight, 0.7) : base;
    });
    applyColors(this.pelvisMesh, (person) => {
      const base = person.color.clone().multiplyScalar(0.93);
      return orgActivated ? base.lerp(highlight, 0.64) : base;
    });
    applyColors(this.leftArmMesh, (person) => {
      const base = person.color.clone().multiplyScalar(0.88);
      return orgActivated ? base.lerp(highlight, 0.6) : base;
    });
    applyColors(this.rightArmMesh, (person) => {
      const base = person.color.clone().multiplyScalar(0.88);
      return orgActivated ? base.lerp(highlight, 0.6) : base;
    });
    applyColors(this.leftLegMesh, (person) => {
      const base = person.color.clone().multiplyScalar(0.74);
      return orgActivated ? base.lerp(highlight, 0.52) : base;
    });
    applyColors(this.rightLegMesh, (person) => {
      const base = person.color.clone().multiplyScalar(0.74);
      return orgActivated ? base.lerp(highlight, 0.52) : base;
    });
  }

  private disposePeopleMeshes() {
    this.disposeInstancedMesh("torsoMesh");
    this.disposeInstancedMesh("pelvisMesh");
    this.disposeInstancedMesh("leftArmMesh");
    this.disposeInstancedMesh("rightArmMesh");
    this.disposeInstancedMesh("leftLegMesh");
    this.disposeInstancedMesh("rightLegMesh");
    if (this.headMesh) {
      (this.headMesh.material as THREE.Material).dispose();
      this.peopleGroup.remove(this.headMesh);
      this.headMesh = null;
    }
  }

  private updateHover() {
    const hit = this.raycastPeople();
    if (!hit) {
      this.hoverMarker.visible = false;
      if (this.hoveredPersonId !== null) {
        this.hoveredPersonId = null;
        this.callbacks.onHoverPersonChange?.(null);
      }
      return;
    }

    const person = this.personTokens[hit.instanceId];
    if (!person) return;

    this.hoverMarker.visible = true;
    this.hoverMarker.position.set(person.position.x, 0.03, person.position.z);
    if (this.hoveredPersonId !== person.id) {
      this.hoveredPersonId = person.id;
      this.callbacks.onHoverPersonChange?.(person.id);
    }
  }

  private raycastPeople() {
    if (!this.headMesh) return null;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const pickables = [
      this.torsoMesh,
      this.pelvisMesh,
      this.leftArmMesh,
      this.rightArmMesh,
      this.leftLegMesh,
      this.rightLegMesh,
      this.headMesh,
    ].filter(Boolean) as THREE.Object3D[];
    const hits = this.raycaster.intersectObjects(pickables, false);
    const first = hits[0];
    if (!first) return null;
    const instanceId = first.instanceId ?? -1;
    if (instanceId < 0) return null;
    return { instanceId };
  }

  private disposeInstancedMesh(
    key:
      | "torsoMesh"
      | "pelvisMesh"
      | "leftArmMesh"
      | "rightArmMesh"
      | "leftLegMesh"
      | "rightLegMesh"
  ) {
    const mesh = this[key];
    if (!mesh) return;
    (mesh.material as THREE.Material).dispose();
    this.peopleGroup.remove(mesh);
    this[key] = null;
  }
}

const getRegionPeopleColor = (regionId: RegionId) => {
  if (regionId === "market") return new THREE.Color("#2e9f4d");
  if (regionId === "state") return new THREE.Color("#cc5649");
  if (regionId === "community") return new THREE.Color("#d8bb3b");
  return new THREE.Color("#7b8593");
};

const toRegionLabel = (regionId: RegionId) => {
  const map: Record<RegionId, string> = {
    market: "Market",
    state: "State",
    community: "Community",
    crony_bridge: "Bridge",
  };
  return map[regionId];
};

const varyColor = (base: THREE.Color, seed: number) => {
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const l = Math.min(0.85, Math.max(0.24, hsl.l + (((seed % 7) - 3) * 0.012)));
  return new THREE.Color().setHSL(hsl.h, hsl.s, l);
};
