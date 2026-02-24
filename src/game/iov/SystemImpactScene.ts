import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { OrgImpactResult, SystemImpactResult } from "./iovImpactEscalation";

interface DebrisPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationVelocity: THREE.Vector3;
}

export interface SystemImpactContext {
  orgImpact: OrgImpactResult;
  communityPillarHeightBefore: number;
  bridgeStressBefore: number;
  bridgeStressThreshold: number;
}

const clamp = (min: number, max: number, value: number) =>
  Math.max(min, Math.min(max, value));

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class SystemImpactScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly communityBase: THREE.Mesh;
  private readonly communityPillar: THREE.Mesh;
  private readonly bridgeMesh: THREE.Mesh;
  private readonly bridgeLight = new THREE.PointLight("#ffd06e", 0, 10);
  private readonly photon: THREE.Mesh;
  private readonly debris: DebrisPiece[] = [];

  private readonly tmpPhotonStart = new THREE.Vector3();
  private readonly tmpPhotonEnd = new THREE.Vector3();
  private readonly tmpPhotonPos = new THREE.Vector3();
  private readonly tmpDebrisQuaternion = new THREE.Quaternion();

  private running = false;
  private elapsedSeconds = 0;
  private collapseTriggered = false;
  private completed = false;
  private isMobileViewport = false;
  private result: SystemImpactResult | null = null;

  private context: SystemImpactContext = {
    orgImpact: {
      regionId: "community",
      brickId: 0,
      activatedPeopleCount: 1,
      populationCount: 1,
      contagionComplete: true,
      orgRadiance: 1,
      communityPowerDelta: 0.2,
    },
    communityPillarHeightBefore: 3.6,
    bridgeStressBefore: 0.35,
    bridgeStressThreshold: 1,
  };
  private onComplete: ((result: SystemImpactResult) => void) | null = null;

  constructor(private readonly domElement: HTMLElement) {
    this.scene.add(this.root);
    this.scene.background = new THREE.Color("#0d1627");
    this.scene.fog = new THREE.Fog("#0d1627", 14, 40);

    this.scene.add(new THREE.AmbientLight("#8ba9cf", 0.9));

    const key = new THREE.DirectionalLight("#fbffff", 1.1);
    key.position.set(7, 9, 6);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight("#74a9ef", 0.6);
    fill.position.set(-8, 5, -7);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshStandardMaterial({
        color: "#1c2a40",
        roughness: 0.9,
        metalness: 0.04,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.root.add(floor);

    this.communityBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.65, 0.5, 24),
      new THREE.MeshStandardMaterial({
        color: "#2b4f42",
        emissive: "#11271f",
        emissiveIntensity: 0.25,
        roughness: 0.66,
        metalness: 0.08,
      })
    );
    this.communityBase.position.set(-2.8, 0.25, 0);
    this.root.add(this.communityBase);

    this.communityPillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1, 1.7),
      new THREE.MeshStandardMaterial({
        color: "#5a9f7d",
        emissive: "#2d6a50",
        emissiveIntensity: 0.2,
        roughness: 0.38,
        metalness: 0.14,
      })
    );
    this.communityPillar.position.set(-2.8, 0.5, 0);
    this.root.add(this.communityPillar);

    this.bridgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.34, 1.2),
      new THREE.MeshStandardMaterial({
        color: "#596472",
        emissive: "#1e2430",
        emissiveIntensity: 0.24,
        roughness: 0.5,
        metalness: 0.28,
      })
    );
    this.bridgeMesh.position.set(2.7, 3.1, 0);
    this.root.add(this.bridgeMesh);

    this.bridgeLight.position.set(this.bridgeMesh.position.x, this.bridgeMesh.position.y + 0.4, 0);
    this.root.add(this.bridgeLight);

    this.photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 16),
      new THREE.MeshBasicMaterial({
        color: "#ffe27a",
      })
    );
    this.photon.visible = false;
    this.root.add(this.photon);

    this.buildBridgeDebris();

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.38;

    this.camera.position.set(0.6, 5.3, 11.4);
    this.controls.target.set(0.2, 2, 0);
    this.controls.update();
  }

  setImpactContext(context: SystemImpactContext) {
    this.context = {
      ...context,
      communityPillarHeightBefore: Math.max(0.8, context.communityPillarHeightBefore),
      bridgeStressBefore: Math.max(0, context.bridgeStressBefore),
      bridgeStressThreshold: Math.max(0.25, context.bridgeStressThreshold),
    };
    this.result = this.computeResult(this.context);
    this.resetVisuals();
  }

  playImpact(
    context: SystemImpactContext,
    onComplete: (result: SystemImpactResult) => void
  ) {
    this.setImpactContext(context);
    this.onComplete = onComplete;
    this.running = true;
    this.completed = false;
    this.elapsedSeconds = 0;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    if (this.isMobileViewport === isMobile) return;
    this.isMobileViewport = isMobile;

    if (isMobile) {
      this.camera.fov = 54;
      this.camera.position.set(0.8, 5.8, 12.8);
      this.controls.target.set(0.2, 2.2, 0);
      this.controls.minDistance = 6.6;
      this.controls.maxDistance = 18;
    } else {
      this.camera.fov = 48;
      this.camera.position.set(0.6, 5.3, 11.4);
      this.controls.target.set(0.2, 2, 0);
      this.controls.minDistance = 6;
      this.controls.maxDistance = 16;
    }

    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  update(deltaSeconds: number) {
    this.controls.update();
    if (!this.running || !this.result) return;

    this.elapsedSeconds += deltaSeconds;

    const growDuration = 1.4;
    const photonDelay = 0.28;
    const flightDuration = 1.1;
    const settleDuration = this.result.bridgeCollapsed ? 1.3 : 0.8;
    const totalDuration = growDuration + photonDelay + flightDuration + settleDuration;

    const beforeScale = this.normalizePillarHeight(this.context.communityPillarHeightBefore);
    const afterScale = this.normalizePillarHeight(this.result.communityPillarHeightAfter);
    const growProgress = clamp(0, 1, this.elapsedSeconds / growDuration);
    const growEased = easeOutCubic(growProgress);
    const currentScale = lerp(beforeScale, afterScale, growEased);

    this.communityPillar.scale.y = currentScale;
    this.communityPillar.position.y = 0.5 * currentScale;
    const pillarMaterial = this.communityPillar.material as THREE.MeshStandardMaterial;
    pillarMaterial.emissiveIntensity = 0.2 + growEased * 0.7;

    const stressWindow = growDuration + flightDuration;
    const stressProgress = clamp(0, 1, this.elapsedSeconds / stressWindow);
    const stressNow = lerp(this.context.bridgeStressBefore, this.result.bridgeStressAfter, stressProgress);
    this.applyBridgeStressVisual(stressNow);

    const photonStart = growDuration + photonDelay;
    if (this.elapsedSeconds >= photonStart) {
      const flightProgress = clamp(0, 1, (this.elapsedSeconds - photonStart) / flightDuration);
      this.photon.visible = true;

      this.tmpPhotonStart.set(
        this.communityPillar.position.x + 0.4,
        this.communityPillar.position.y + 0.9,
        0
      );
      this.tmpPhotonEnd.set(
        this.bridgeMesh.position.x - 0.2,
        this.bridgeMesh.position.y + 0.18,
        0
      );
      this.tmpPhotonPos.lerpVectors(this.tmpPhotonStart, this.tmpPhotonEnd, easeOutCubic(flightProgress));
      this.tmpPhotonPos.y += Math.sin(flightProgress * Math.PI) * 0.5;
      this.photon.position.copy(this.tmpPhotonPos);

      const photonPulse = 1 + Math.sin(this.elapsedSeconds * 18) * 0.22;
      this.photon.scale.setScalar(photonPulse);

      if (
        this.result.bridgeCollapsed &&
        !this.collapseTriggered &&
        flightProgress >= 0.84
      ) {
        this.triggerBridgeCollapse();
      }
    } else {
      this.photon.visible = false;
    }

    if (this.collapseTriggered) {
      this.updateDebris(deltaSeconds);
    }

    if (this.elapsedSeconds >= totalDuration && !this.completed) {
      this.running = false;
      this.completed = true;
      if (this.result && this.onComplete) {
        this.onComplete(this.result);
      }
    }
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.communityBase.geometry.dispose();
    (this.communityBase.material as THREE.Material).dispose();
    this.communityPillar.geometry.dispose();
    (this.communityPillar.material as THREE.Material).dispose();
    this.bridgeMesh.geometry.dispose();
    (this.bridgeMesh.material as THREE.Material).dispose();
    this.photon.geometry.dispose();
    (this.photon.material as THREE.Material).dispose();
    this.debris.forEach((piece) => {
      piece.mesh.geometry.dispose();
      (piece.mesh.material as THREE.Material).dispose();
      this.root.remove(piece.mesh);
    });
    this.debris.length = 0;
  }

  private computeResult(context: SystemImpactContext): SystemImpactResult {
    const growthDelta = clamp(0.18, 0.95, context.orgImpact.communityPowerDelta * 2.7);
    const communityPillarHeightAfter = Number(
      (context.communityPillarHeightBefore + growthDelta).toFixed(3)
    );

    const stressDelta = clamp(
      0.08,
      0.48,
      context.orgImpact.communityPowerDelta * 1.35 + growthDelta * 0.12
    );
    const bridgeStressAfter = Number(
      Math.min(1.45, context.bridgeStressBefore + stressDelta).toFixed(3)
    );
    const bridgeCollapsed = bridgeStressAfter >= context.bridgeStressThreshold;

    return {
      communityPillarHeightBefore: Number(context.communityPillarHeightBefore.toFixed(3)),
      communityPillarHeightAfter,
      bridgeStressBefore: Number(context.bridgeStressBefore.toFixed(3)),
      bridgeStressAfter,
      bridgeCollapsed,
    };
  }

  private normalizePillarHeight(value: number) {
    return clamp(0.8, 2.8, 0.72 + value * 0.28);
  }

  private applyBridgeStressVisual(stressValue: number) {
    const normalizedStress = clamp(
      0,
      1.2,
      stressValue / Math.max(0.1, this.context.bridgeStressThreshold)
    );
    const bridgeMaterial = this.bridgeMesh.material as THREE.MeshStandardMaterial;
    const stressColor = new THREE.Color().setRGB(
      lerp(0.35, 0.88, normalizedStress),
      lerp(0.4, 0.2, normalizedStress),
      lerp(0.45, 0.16, normalizedStress)
    );
    bridgeMaterial.color.copy(stressColor);
    bridgeMaterial.emissiveIntensity = 0.2 + normalizedStress * 0.7;
    this.bridgeLight.intensity = 0.2 + normalizedStress * 1.5;
    this.bridgeLight.distance = 8 + normalizedStress * 5;
  }

  private triggerBridgeCollapse() {
    this.collapseTriggered = true;
    this.bridgeMesh.visible = false;
    this.bridgeLight.intensity = 0.25;

    this.debris.forEach((piece) => {
      piece.mesh.visible = true;
      piece.mesh.position.y = this.bridgeMesh.position.y;
    });
  }

  private updateDebris(deltaSeconds: number) {
    const gravity = 9.8;
    const floorY = 0.2;
    this.debris.forEach((piece) => {
      piece.velocity.y -= gravity * deltaSeconds;
      piece.mesh.position.addScaledVector(piece.velocity, deltaSeconds);

      if (piece.mesh.position.y < floorY) {
        piece.mesh.position.y = floorY;
        piece.velocity.y *= -0.32;
        piece.velocity.x *= 0.9;
        piece.velocity.z *= 0.9;
        piece.rotationVelocity.multiplyScalar(0.88);
      }

      this.tmpDebrisQuaternion.setFromEuler(
        new THREE.Euler(
          piece.rotationVelocity.x * this.elapsedSeconds,
          piece.rotationVelocity.y * this.elapsedSeconds,
          piece.rotationVelocity.z * this.elapsedSeconds
        )
      );
      piece.mesh.quaternion.copy(this.tmpDebrisQuaternion);
    });
  }

  private buildBridgeDebris() {
    const piecePositions = [-2.1, -1.2, -0.3, 0.6, 1.5, 2.4];
    piecePositions.forEach((offsetX, index) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.2, 1.18),
        new THREE.MeshStandardMaterial({
          color: "#5c6775",
          roughness: 0.46,
          metalness: 0.24,
        })
      );
      mesh.position.set(this.bridgeMesh.position.x + offsetX, this.bridgeMesh.position.y, 0);
      mesh.visible = false;
      this.root.add(mesh);

      this.debris.push({
        mesh,
        velocity: new THREE.Vector3(-0.8 + index * 0.24, 1.3 + (index % 2) * 0.5, (index % 3 - 1) * 0.18),
        rotationVelocity: new THREE.Vector3(
          0.6 + index * 0.08,
          -0.3 + index * 0.1,
          0.4 + (index % 2) * 0.35
        ),
      });
    });
  }

  private resetVisuals() {
    this.running = false;
    this.completed = false;
    this.elapsedSeconds = 0;
    this.collapseTriggered = false;

    this.photon.visible = false;
    this.bridgeMesh.visible = true;
    this.debris.forEach((piece, index) => {
      piece.mesh.visible = false;
      piece.mesh.position.set(this.bridgeMesh.position.x - 2.1 + index * 0.9, this.bridgeMesh.position.y, 0);
      piece.mesh.rotation.set(0, 0, 0);
      piece.velocity.set(-0.8 + index * 0.24, 1.3 + (index % 2) * 0.5, (index % 3 - 1) * 0.18);
      piece.rotationVelocity.set(0.6 + index * 0.08, -0.3 + index * 0.1, 0.4 + (index % 2) * 0.35);
    });

    const pillarScale = this.normalizePillarHeight(this.context.communityPillarHeightBefore);
    this.communityPillar.scale.y = pillarScale;
    this.communityPillar.position.y = 0.5 * pillarScale;
    const pillarMaterial = this.communityPillar.material as THREE.MeshStandardMaterial;
    pillarMaterial.emissiveIntensity = 0.24;
    this.applyBridgeStressVisual(this.context.bridgeStressBefore);
  }
}
