import * as THREE from "three";
import { WELLBEING_IDENTITY_LAYERS } from "./wellbeingIdentityProtocol";
import type { ValueLogDraft } from "./ValueLogModel";

interface ImpactRingMeta {
  baseRadius: number;
  baseColor: THREE.Color;
  isIdentityState: boolean;
}

export class PersonImpactScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

  private readonly root = new THREE.Group();
  private readonly photon: THREE.Mesh;
  private readonly photonLight: THREE.PointLight;
  private readonly impactFlash: THREE.Mesh;
  private readonly rings: THREE.Mesh[] = [];
  private readonly auraBands: THREE.Mesh[] = [];
  private readonly coreMaterials: THREE.MeshStandardMaterial[] = [];

  private isAnimating = false;
  private time = 0;
  private readonly dropDuration = 0.52;
  private readonly rippleSpeed = 5.8;
  private readonly completionDelay = 2.65;
  private impactStrength = 1;
  private onComplete?: () => void;
  private draft: ValueLogDraft | null = null;
  private readonly photonStart = new THREE.Vector3(0, 7.6, 1.2);
  private readonly headTarget = new THREE.Vector3(0, 2.45, 0);
  private readonly neutralEmissive = new THREE.Color(0x000000);
  private readonly unitScale = new THREE.Vector3(1, 1, 1);
  private readonly impactColor = new THREE.Color("#ffd700");
  private readonly workingColor = new THREE.Color("#ffd700");

  constructor() {
    this.scene.add(this.root);

    this.setupSceneLook();
    this.buildIdentityCore();
    this.buildIdentityRings();
    this.buildAuraBands();

    this.photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 20),
      new THREE.MeshBasicMaterial({ color: "#ffd700" })
    );
    this.photonLight = new THREE.PointLight("#ffd770", 2.1, 10);
    this.photon.add(this.photonLight);
    this.root.add(this.photon);
    this.photon.visible = false;

    this.impactFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 14),
      new THREE.MeshBasicMaterial({
        color: "#fff3cf",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.impactFlash.position.copy(this.headTarget);
    this.impactFlash.visible = false;
    this.root.add(this.impactFlash);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    const aspect = width / Math.max(1, height);
    if (aspect < 0.86) {
      this.camera.fov = 54;
      this.camera.position.set(0, 6.2, 12.6);
    } else {
      this.camera.fov = 50;
      this.camera.position.set(0, 5.8, 10.8);
    }
    this.camera.lookAt(0, 1.8, 0);
    this.camera.updateProjectionMatrix();
  }

  playImpact(draft: ValueLogDraft, onComplete: () => void) {
    this.draft = draft;
    this.onComplete = onComplete;
    this.isAnimating = true;
    this.time = 0;

    this.impactColor.set("#ffd700");
    if (draft.impactDirection === "decrease") {
      this.impactColor.set("#ff6f7f");
    } else if (draft.impactDirection === "neutral") {
      this.impactColor.set("#9ab7d9");
    } else if (draft.learningTag) {
      this.impactColor.set("#4cc9f0");
    } else if (draft.earningTag) {
      this.impactColor.set("#f72585");
    } else if (draft.orgBuildingTag) {
      this.impactColor.set("#4361ee");
    }

    const baseStrength = 0.55 + draft.signalScore;
    this.impactStrength =
      draft.impactDirection === "neutral"
        ? Math.max(0.35, Math.min(0.9, baseStrength * 0.7))
        : Math.max(0.45, Math.min(1.35, baseStrength));

    (this.photon.material as THREE.MeshBasicMaterial).color.copy(this.impactColor);
    this.photonLight.color.copy(this.impactColor);
    this.photonLight.intensity = 2.1;

    this.photon.visible = true;
    this.photon.position.copy(this.photonStart);
    this.photon.scale.setScalar(1);

    this.impactFlash.visible = false;
    this.impactFlash.scale.setScalar(1);
    (this.impactFlash.material as THREE.MeshBasicMaterial).opacity = 0;

    this.rings.forEach((ring) => {
      const mat = ring.material as THREE.MeshStandardMaterial;
      const meta = ring.userData as ImpactRingMeta;
      mat.color.copy(meta.baseColor);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      mat.opacity = 0.24;
      ring.scale.set(1, 1, 1);
    });

    this.auraBands.forEach((band) => {
      const mat = band.material as THREE.MeshBasicMaterial;
      mat.opacity = 0;
      band.visible = false;
      band.scale.setScalar(1);
    });

    this.coreMaterials.forEach((material) => {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0.1;
    });
  }

  update(deltaSeconds: number) {
    if (!this.isAnimating) return;

    this.time += deltaSeconds;

    if (this.time < this.dropDuration) {
      const t = this.time / this.dropDuration;
      const ease = 1 - Math.pow(1 - t, 3);
      this.photon.position.lerpVectors(this.photonStart, this.headTarget, ease);

      const stretch = 1 + 0.32 * (1 - ease);
      this.photon.scale.set(1 / stretch, stretch, 1 / stretch);
      this.photonLight.intensity = THREE.MathUtils.lerp(2.1, 4.1, ease);
      this.impactFlash.visible = false;
      return;
    }

    this.photon.visible = false;
    const rippleTime = this.time - this.dropDuration;
    const wavefrontRadius = rippleTime * this.rippleSpeed;
    const identityStateRadius =
      (this.rings.find((ring) => (ring.userData as ImpactRingMeta).isIdentityState)?.userData as
        | ImpactRingMeta
        | undefined)?.baseRadius ?? 3.9;
    const auraProgress = THREE.MathUtils.clamp(
      (wavefrontRadius - identityStateRadius + 0.35) / 2.0,
      0,
      1
    );

    if (rippleTime < 0.34) {
      const flashProgress = rippleTime / 0.34;
      this.impactFlash.visible = true;
      this.impactFlash.scale.setScalar(1 + flashProgress * 4.5);
      (this.impactFlash.material as THREE.MeshBasicMaterial).opacity =
        (1 - flashProgress) * 0.82 * this.impactStrength;
    } else {
      this.impactFlash.visible = false;
    }

    this.rings.forEach((ring) => {
      const meta = ring.userData as ImpactRingMeta;
      const dist = meta.baseRadius;
      const hit = Math.max(0, 1 - Math.abs(wavefrontRadius - dist) / 0.85) * this.impactStrength;
      const mat = ring.material as THREE.MeshStandardMaterial;

      if (hit > 0.01) {
        mat.emissive.copy(meta.baseColor);
        mat.emissiveIntensity = (meta.isIdentityState ? 1.6 : 1.0) + hit * 1.45;
        mat.opacity = Math.min(0.97, 0.24 + hit * 0.72);
        const pulse = 1 + hit * (meta.isIdentityState ? 0.2 : 0.12);
        ring.scale.setScalar(pulse);
      } else {
        mat.emissive.lerp(this.neutralEmissive, deltaSeconds * 2.8);
        const targetEmissive =
          meta.isIdentityState && auraProgress > 0.01 ? 1.15 + auraProgress * 1.25 : 0;
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.emissiveIntensity,
          targetEmissive,
          deltaSeconds * 2.4
        );
        const targetOpacity =
          meta.isIdentityState && auraProgress > 0.01
            ? 0.72 + auraProgress * 0.2 + 0.04 * Math.sin(this.time * 4.1)
            : 0.24;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, deltaSeconds * 2.6);
        ring.scale.lerp(this.unitScale, deltaSeconds * 3.2);
      }
    });

    this.auraBands.forEach((band, index) => {
      const mat = band.material as THREE.MeshBasicMaterial;
      if (auraProgress > 0.02) {
        band.visible = true;
        const pulse = 1 + Math.sin(this.time * (1.8 + index * 0.45)) * 0.03;
        const baseScale = 1 + auraProgress * (0.26 + index * 0.08);
        band.scale.setScalar(baseScale * pulse);
        mat.opacity = Math.min(0.55, 0.08 + auraProgress * (0.19 + index * 0.08));
      } else {
        band.visible = false;
        mat.opacity = 0;
      }
    });

    const coreGlow = THREE.MathUtils.clamp(auraProgress * 1.2 + (this.impactStrength - 0.55) * 0.2, 0, 1);
    this.workingColor.copy(this.impactColor).multiplyScalar(0.2 + coreGlow * 0.45);
    this.coreMaterials.forEach((material) => {
      material.emissive.copy(this.workingColor);
      material.emissiveIntensity = 0.22 + coreGlow * 0.55;
    });

    if (this.time > this.dropDuration + this.completionDelay) {
      this.isAnimating = false;
      this.impactFlash.visible = false;
      this.onComplete?.();
    }
  }

  dispose() {
    this.disposeGroup(this.root);
  }

  private setupSceneLook() {
    this.scene.background = new THREE.Color("#101722");
    this.scene.fog = new THREE.Fog("#101722", 13, 42);

    this.scene.add(new THREE.AmbientLight("#7b96bc", 0.86));

    const key = new THREE.DirectionalLight("#dde9ff", 1.08);
    key.position.set(8, 10, 5);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight("#77a8ff", 0.68);
    rim.position.set(-10, 7, -8);
    this.scene.add(rim);

    const glow = new THREE.PointLight("#f4d372", 0.62, 12);
    glow.position.set(0, 2.5, 0);
    this.scene.add(glow);

    this.camera.position.set(0, 5.8, 10.8);
    this.camera.lookAt(0, 1.8, 0);
  }

  private buildIdentityCore() {
    const coreGroup = new THREE.Group();

    const torsoMaterial = new THREE.MeshStandardMaterial({
      color: "#303a4b",
      roughness: 0.68,
      metalness: 0.08,
      emissive: "#000000",
      emissiveIntensity: 0.1,
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.1, 4, 8), torsoMaterial);
    torso.position.y = 1.25;

    const headMaterial = new THREE.MeshStandardMaterial({
      color: "#d9c7b6",
      roughness: 0.6,
      metalness: 0.02,
      emissive: "#000000",
      emissiveIntensity: 0.1,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), headMaterial);
    head.position.y = 2.45;

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: "#c9d8ea",
      roughness: 0.92,
      metalness: 0.01,
      emissive: "#000000",
      emissiveIntensity: 0.08,
    });
    const footBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.2, 18),
      baseMaterial
    );
    footBase.position.y = 0.1;

    coreGroup.add(torso, head, footBase);
    this.root.add(coreGroup);
    this.coreMaterials.push(torsoMaterial, headMaterial, baseMaterial);
  }

  private buildIdentityRings() {
    WELLBEING_IDENTITY_LAYERS.forEach((layer, idx) => {
      const radius = 1.55 + idx * 0.62;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.045, 16, 130),
        new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: "#000000",
          roughness: 0.38,
          metalness: 0.2,
          transparent: true,
          opacity: 0.24,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.48;
      ring.userData = {
        baseRadius: radius,
        baseColor: new THREE.Color(layer.color),
        isIdentityState: layer.key === "identity_state",
      } satisfies ImpactRingMeta;
      this.rings.push(ring);
      this.root.add(ring);
    });
  }

  private buildAuraBands() {
    const defs = [
      { radius: 5.8, color: "#87d1ff", opacity: 0.22 },
      { radius: 6.5, color: "#9be0ff", opacity: 0.18 },
      { radius: 7.2, color: "#b6e8ff", opacity: 0.14 },
    ];
    defs.forEach((entry) => {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(entry.radius, 0.08, 16, 160),
        new THREE.MeshBasicMaterial({
          color: entry.color,
          transparent: true,
          opacity: entry.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 1.48;
      band.visible = false;
      this.auraBands.push(band);
      this.root.add(band);
    });
  }

  private disposeGroup(group: THREE.Object3D) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material.dispose();
        }
      }
    });
    group.clear();
  }
}
