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

  update(deltaSeconds: number) {
    this.controls.update();
    if (this.hasPointer) this.updateHover();

    // Small idle sway keeps interior scene alive without expensive animation.
    this.peopleGroup.position.y = Math.sin(performance.now() * 0.0012) * 0.02;

    if (this.activationMesh && this.activationMesh.visible) {
      // Pulse the activation aura
      const time = performance.now() * 0.001;
      this.activationMesh.rotation.z = time;
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      this.activationMesh.scale.set(pulse, pulse, 1);
      this.activationLight.intensity = 2 + Math.sin(time * 5) * 0.5;
    }
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
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
