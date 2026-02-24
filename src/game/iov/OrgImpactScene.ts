import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RegionId } from "./IovTopologyScene";
import type { OrgImpactResult, PersonImpactResult } from "./iovImpactEscalation";

interface OrgImpactContext {
  regionId: RegionId;
  brickId: number;
  personId: string;
  peopleCount: number;
}

interface PersonNode {
  id: string;
  basePosition: THREE.Vector3;
  mesh: THREE.Mesh;
  active: boolean;
  phase: number;
}

const clamp = (min: number, max: number, value: number) =>
  Math.max(min, Math.min(max, value));

export class OrgImpactScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly peopleGroup = new THREE.Group();
  private readonly ringGroup = new THREE.Group();
  private readonly brickMesh: THREE.Mesh;
  private readonly brickGlow = new THREE.PointLight("#ffd97d", 0, 8);
  private readonly personGeometry = new THREE.SphereGeometry(0.14, 12, 10);
  private readonly ringGeometry = new THREE.TorusGeometry(0.24, 0.03, 10, 24);
  private readonly people: PersonNode[] = [];
  private readonly auras: THREE.Mesh[] = [];
  private spreadOrder: number[] = [];
  private spreadCursor = 0;
  private spreadTimerSeconds = 0;
  private completionHoldSeconds = 0;
  private activeCount = 0;
  private elapsedSeconds = 0;
  private running = false;
  private isMobileViewport = false;

  private context: OrgImpactContext = {
    regionId: "community",
    brickId: 0,
    personId: "Person-1",
    peopleCount: 14,
  };
  private personImpact: PersonImpactResult | null = null;
  private onComplete: ((result: OrgImpactResult) => void) | null = null;

  constructor(private readonly domElement: HTMLElement) {
    this.scene.add(this.root);
    this.root.add(this.peopleGroup, this.ringGroup);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4.6;
    this.controls.maxDistance = 12;
    this.controls.minPolarAngle = 0.4;
    this.controls.maxPolarAngle = 1.4;

    this.scene.background = new THREE.Color("#0f1828");
    this.scene.fog = new THREE.Fog("#0f1828", 10, 34);
    this.scene.add(new THREE.AmbientLight("#8ea6c8", 0.8));

    const key = new THREE.DirectionalLight("#f7fbff", 1.1);
    key.position.set(7, 8, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#75a6e3", 0.55);
    fill.position.set(-8, 5, -7);
    this.scene.add(fill);

    this.brickMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 1.4, 4.8),
      new THREE.MeshStandardMaterial({
        color: "#4a637f",
        emissive: "#1f2f46",
        emissiveIntensity: 0.15,
        roughness: 0.72,
        metalness: 0.08,
      })
    );
    this.brickMesh.position.y = -0.25;
    this.root.add(this.brickMesh);

    this.brickGlow.position.set(0, 1.1, 0);
    this.root.add(this.brickGlow);

    this.camera.position.set(0, 4.8, 10);
    this.controls.target.set(0, 0.65, 0);
    this.controls.update();

    this.rebuildPeople(this.context.peopleCount);
  }

  setImpactContext(context: OrgImpactContext) {
    this.context = {
      ...context,
      peopleCount: Math.max(6, Math.min(28, context.peopleCount)),
    };
    this.rebuildPeople(this.context.peopleCount);
  }

  playImpact(
    personImpact: PersonImpactResult,
    onComplete: (result: OrgImpactResult) => void
  ) {
    this.personImpact = personImpact;
    this.onComplete = onComplete;
    this.running = true;
    this.elapsedSeconds = 0;
    this.spreadTimerSeconds = 0;
    this.completionHoldSeconds = 0;
    this.activeCount = 0;
    this.spreadCursor = 0;

    this.people.forEach((person, index) => {
      person.active = false;
      const material = person.mesh.material as THREE.MeshStandardMaterial;
      material.color.set("#7f93af");
      material.emissive.set("#2a3548");
      material.emissiveIntensity = 0.08;
      const aura = this.auras[index];
      if (aura) aura.visible = false;
    });

    const seedIndex = this.resolveSeedIndex(personImpact.personId, this.people.length);
    this.spreadOrder = this.buildSpreadOrder(seedIndex);
    if (this.spreadOrder.length > 0) {
      const first = this.spreadOrder[0];
      if (typeof first === "number") {
        this.activatePerson(first);
        this.spreadCursor = 1;
      }
    }

    this.updateBrickGlow();
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    if (this.isMobileViewport === isMobile) return;
    this.isMobileViewport = isMobile;

    if (isMobile) {
      this.camera.fov = 52;
      this.camera.position.set(0, 5.4, 11.4);
      this.controls.target.set(0, 0.75, 0);
      this.controls.minDistance = 5.2;
      this.controls.maxDistance = 13.4;
    } else {
      this.camera.fov = 46;
      this.camera.position.set(0, 4.8, 10);
      this.controls.target.set(0, 0.65, 0);
      this.controls.minDistance = 4.6;
      this.controls.maxDistance = 12;
    }

    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  update(deltaSeconds: number) {
    this.elapsedSeconds += deltaSeconds;
    this.controls.update();

    if (this.running) {
      this.spreadTimerSeconds += deltaSeconds;
      const spreadInterval = 0.3;
      if (this.spreadTimerSeconds >= spreadInterval && this.spreadCursor < this.spreadOrder.length) {
        this.spreadTimerSeconds = 0;
        const spreadBatchSize = Math.max(1, Math.floor(this.people.length / 8));
        for (let i = 0; i < spreadBatchSize && this.spreadCursor < this.spreadOrder.length; i += 1) {
          const idx = this.spreadOrder[this.spreadCursor];
          this.spreadCursor += 1;
          if (typeof idx === "number") this.activatePerson(idx);
        }
        this.updateBrickGlow();
      }
    }

    const waveT = this.elapsedSeconds * 2.2;
    this.people.forEach((person, index) => {
      const mesh = person.mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const moveAmp = person.active ? 0.14 : 0.03;
      const yAmp = person.active ? 0.08 : 0.02;
      const x = person.basePosition.x + Math.cos(waveT + person.phase) * moveAmp;
      const z = person.basePosition.z + Math.sin(waveT * 0.87 + person.phase) * moveAmp;
      const y = person.basePosition.y + Math.sin(waveT * 1.31 + person.phase) * yAmp;
      mesh.position.set(x, y, z);

      const aura = this.auras[index];
      if (aura) {
        aura.position.set(x, y - 0.14, z);
        if (person.active) {
          const pulse = 1 + Math.sin(waveT * 2.1 + person.phase) * 0.22;
          aura.scale.setScalar(pulse);
        }
      }

      const targetEmissive = person.active ? 0.68 : 0.08;
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetEmissive,
        clamp(0, 1, deltaSeconds * 5)
      );
    });

    if (this.running && this.activeCount >= this.people.length) {
      this.completionHoldSeconds += deltaSeconds;
      if (this.completionHoldSeconds >= 1) {
        this.running = false;
        this.completeImpact();
      }
    }
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.disposePeople();
    this.personGeometry.dispose();
    this.ringGeometry.dispose();
    this.brickMesh.geometry.dispose();
    (this.brickMesh.material as THREE.Material).dispose();
  }

  private activatePerson(index: number) {
    const person = this.people[index];
    if (!person || person.active) return;
    person.active = true;
    this.activeCount += 1;
    const material = person.mesh.material as THREE.MeshStandardMaterial;
    material.color.set("#ffd371");
    material.emissive.set("#ffbb45");
    material.emissiveIntensity = 0.7;
    const aura = this.auras[index];
    if (aura) aura.visible = true;
  }

  private completeImpact() {
    if (!this.onComplete) return;
    const populationCount = Math.max(1, this.people.length);
    const orgRadiance = this.activeCount / populationCount;
    const auraBoost = Math.max(0, this.personImpact?.auraDelta ?? 0);
    const communityPowerDelta = Number(
      clamp(0.05, 0.45, orgRadiance * 0.2 + auraBoost * 0.9).toFixed(3)
    );

    this.onComplete({
      regionId: this.context.regionId,
      brickId: this.context.brickId,
      activatedPeopleCount: this.activeCount,
      populationCount,
      contagionComplete: orgRadiance >= 0.999,
      orgRadiance: Number(orgRadiance.toFixed(3)),
      communityPowerDelta,
    });
  }

  private updateBrickGlow() {
    const ratio = this.people.length > 0 ? this.activeCount / this.people.length : 0;
    const material = this.brickMesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.18 + ratio * 0.82;
    material.color.set(ratio > 0.96 ? "#d6a743" : "#4a637f");
    this.brickGlow.intensity = 0.2 + ratio * 2.1;
    this.brickGlow.distance = 8 + ratio * 5;
  }

  private rebuildPeople(peopleCount: number) {
    this.disposePeople();
    this.people.length = 0;
    this.auras.length = 0;

    const cols = Math.max(3, Math.ceil(Math.sqrt(peopleCount)));
    const rows = Math.max(2, Math.ceil(peopleCount / cols));
    const xOffset = ((cols - 1) * 0.6) / 2;
    const zOffset = ((rows - 1) * 0.6) / 2;

    for (let i = 0; i < peopleCount; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * 0.6 - xOffset;
      const z = row * 0.6 - zOffset;
      const y = 0.56;
      const material = new THREE.MeshStandardMaterial({
        color: "#7f93af",
        roughness: 0.42,
        metalness: 0.14,
        emissive: "#2a3548",
        emissiveIntensity: 0.08,
      });
      const mesh = new THREE.Mesh(this.personGeometry, material);
      mesh.position.set(x, y, z);
      this.peopleGroup.add(mesh);

      const aura = new THREE.Mesh(
        this.ringGeometry,
        new THREE.MeshBasicMaterial({
          color: "#ffd36e",
          transparent: true,
          opacity: 0.72,
        })
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.set(x, y - 0.14, z);
      aura.visible = false;
      this.ringGroup.add(aura);

      this.people.push({
        id: `${this.context.regionId}-${this.context.brickId}-P${i + 1}`,
        basePosition: new THREE.Vector3(x, y, z),
        mesh,
        active: false,
        phase: i * 0.47,
      });
      this.auras.push(aura);
    }

    this.activeCount = 0;
    this.updateBrickGlow();
  }

  private disposePeople() {
    this.peopleGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.Material).dispose();
    });
    this.peopleGroup.clear();

    this.ringGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      (mesh.material as THREE.Material).dispose();
    });
    this.ringGroup.clear();
  }

  private resolveSeedIndex(personId: string, count: number) {
    if (count <= 0) return 0;
    let hash = 0;
    for (let i = 0; i < personId.length; i += 1) {
      hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
    }
    return hash % count;
  }

  private buildSpreadOrder(seedIndex: number) {
    const seed = this.people[seedIndex];
    if (!seed) return [];
    const scored = this.people.map((person, index) => ({
      index,
      distance: person.basePosition.distanceTo(seed.basePosition),
      phase: person.phase,
    }));

    scored.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.phase - b.phase;
    });

    return scored.map((item) => item.index);
  }
}
