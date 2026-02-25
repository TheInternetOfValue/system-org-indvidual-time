import * as THREE from "three";
import { WELLBEING_IDENTITY_LAYERS } from "./wellbeingIdentityProtocol";
import type { ValueLogDraft } from "./ValueLogModel";

export class PersonImpactScene {
  readonly scene = new THREE.Scene();
  // Using a slightly wider FOV for dramatic impact effect
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  
  private readonly root = new THREE.Group();
  private readonly photon: THREE.Mesh;
  private readonly photonLight: THREE.PointLight;
  private readonly rings: THREE.Mesh[] = [];
  
  private isAnimating = false;
  private time = 0;
  private readonly impactDuration = 0.6; // Seconds for drop
  private readonly rippleSpeed = 6.0;    // Units per second
  private impactStrength = 1;
  private onComplete?: () => void;
  private draft: ValueLogDraft | null = null;
  private readonly startY = 12.0;
  private readonly neutralEmissive = new THREE.Color(0x000000);
  private readonly unitScale = new THREE.Vector3(1, 1, 1);

  constructor() {
    this.scene.add(this.root);
    
    // Atmospheric Lighting
    const ambient = new THREE.AmbientLight("#112233", 0.4);
    const dirLight = new THREE.DirectionalLight("#ffffff", 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(ambient, dirLight);

    // Camera Position - Angled down to see the surface clearly
    this.camera.position.set(0, 10, 16);
    this.camera.lookAt(0, 0, 0);

    // 1. The Photon (The Drop)
    this.photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#ffffff" })
    );
    this.photonLight = new THREE.PointLight("#ffffff", 2, 8);
    this.photon.add(this.photonLight);
    this.root.add(this.photon);
    this.photon.visible = false;

    // 2. Identity Surface Rings
    // Recreated from PersonIdentityScene to allow independent animation.
    // Order: Inner (Physiology) -> Outer (Context/Performance)
    WELLBEING_IDENTITY_LAYERS.forEach((layer, idx) => {
      const radius = 1.55 + idx * 0.62;
      
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.05, 16, 120),
        new THREE.MeshStandardMaterial({
          color: layer.color, 
          emissive: "#000000",
          metalness: 0.6,
          roughness: 0.4,
          transparent: true,
          opacity: 0.2
        })
      );
      ring.rotation.x = -Math.PI / 2; // Lie flat
      
      // Store metadata for visual logic
      ring.userData = { 
        baseRadius: radius, 
        baseColor: new THREE.Color(layer.color).multiplyScalar(0.8) 
      };
      
      this.rings.push(ring);
      this.root.add(ring);
    });
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Starts the Drop -> Impact -> Ripple sequence.
   */
  playImpact(draft: ValueLogDraft, onComplete: () => void) {
    this.draft = draft;
    this.onComplete = onComplete;
    this.isAnimating = true;
    this.time = 0;
    
    // Determine Color based on Value Domain
    const color = new THREE.Color("#ffd700"); // Default Gold
    if (draft.impactDirection === "decrease") {
      color.set("#ff6f7f");
    } else if (draft.impactDirection === "neutral") {
      color.set("#9ab7d9");
    } else if (draft.learningTag) {
      color.set("#4cc9f0");
    } else if (draft.earningTag) {
      color.set("#f72585");
    } else if (draft.orgBuildingTag) {
      color.set("#4361ee");
    }

    const baseStrength = 0.55 + draft.signalScore;
    this.impactStrength =
      draft.impactDirection === "neutral"
        ? Math.max(0.35, Math.min(0.85, baseStrength * 0.65))
        : Math.max(0.45, Math.min(1.35, baseStrength));

    (this.photon.material as THREE.MeshBasicMaterial).color.copy(color);
    this.photonLight.color.copy(color);

    // Reset Scene State
    this.photon.visible = true;
    this.photon.position.set(0, this.startY, 0);
    this.photon.scale.setScalar(1);

    this.rings.forEach(ring => {
        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
        mat.opacity = 0.2;
        ring.scale.set(1, 1, 1);
    });
  }

  update(delta: number) {
    if (!this.isAnimating) return;
    
    this.time += delta;

    // --- Phase 1: The Drop (Gravity) ---
    if (this.time < this.impactDuration) {
        const t = this.time / this.impactDuration;
        const ease = t * t; // Quadratic ease-in
        this.photon.position.y = THREE.MathUtils.lerp(this.startY, 0, ease);
        
        // Slight stretch effect for speed
        const stretch = 1.0 + (ease * 0.5);
        this.photon.scale.set(1/stretch, stretch, 1/stretch);
    } 
    // --- Phase 2: Impact & Ripple Expansion ---
    else {
        this.photon.visible = false;
        
        // Ripple wavefront radius
        const rippleTime = this.time - this.impactDuration;
        const wavefrontRadius = rippleTime * this.rippleSpeed; 
        
        this.rings.forEach(ring => {
            const dist = ring.userData.baseRadius;
            const diff = wavefrontRadius - dist;
            
            // "Hit" window: when wavefront passes through the ring radius
            // Logic: Inner rings are hit first (smaller radius)
            if (diff > -0.5 && diff < 1.5) {
                // Peak intensity at diff = 0
                const intensity = Math.max(0, 1.0 - Math.abs(diff - 0.5)) * this.impactStrength;
                
                const mat = ring.material as THREE.MeshStandardMaterial;
                const baseColor = ring.userData.baseColor as THREE.Color;
                
                // Visual Flash
                mat.emissive.copy(baseColor);
                mat.emissiveIntensity = 2.0 * intensity;
                mat.opacity = 0.2 + (0.8 * intensity);
                
                // Physical "Bounce" (Scale Z because of rotation)
                // The rings pulse upward as the wave passes
                ring.scale.set(1, 1, 1 + (0.8 * intensity));
                
            } else {
                // Decay back to rest
                const mat = ring.material as THREE.MeshStandardMaterial;
                mat.emissive.lerp(this.neutralEmissive, delta * 3);
                mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0, delta * 3);
                mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.2, delta * 2);
                ring.scale.lerp(this.unitScale, delta * 4);
            }
        });

        // End Sequence (approx 3.0s total)
        if (this.time > this.impactDuration + 3.0) {
            this.isAnimating = false;
            if (this.onComplete) this.onComplete();
        }
    }
  }
}
