import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RegionId } from "./IovTopologyScene";
import { PersonStateEngine } from "./PersonStateEngine";
import {
  formatValueLogForCaption,
  type IovTimeLogEntry,
  type WellbeingContextNode,
} from "./iovTimelogs";
import {
  WELLBEING_IDENTITY_LAYERS,
  type WellbeingIdentityLayer,
} from "./wellbeingIdentityProtocol";

export type PersonDetailMode = "identity" | "valuelog";

export interface PersonIdentitySummary {
  personId: string;
  regionId: RegionId;
  personViewMode: PersonDetailMode;
  layerLabels: string[];
  identityBuildMode: boolean;
  identityBuildLayerIndex: number;
  identityBuildLayerLabel: string | null;
  identityBuildLayerCount: number;
  identityBuildComplete: boolean;
  hoveredFacet: string | null;
  selectedFacet: string | null;
  hoveredLayer: string | null;
  selectedLayer: string | null;
  wellbeingScore: number;
  auraStrength: number;
  delta24h: number;
  delta7d: number;
  processedLogs: number;
  totalLogs: number;
  timelinePlaying: boolean;
  timelineSpeed: number;
  currentLog: IovTimeLogEntry | null;
  currentLogCaption: string;
  directImpactLayers: string[];
  derivedImpactLayers: string[];
  wellbeingContextNode: WellbeingContextNode | null;
  saocommonsEnabled: boolean;
  saocommonsDomains: string[];
}

interface PersonIdentityCallbacks {
  onHoverFacetChange?: (facet: string | null) => void;
  onSelectFacetChange?: (facet: string | null) => void;
}

interface FacetNode {
  facet: string;
  layer: WellbeingIdentityLayer;
  layerIndex: number;
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  baseY: number;
  speed: number;
  dropOffsetSeconds: number;
}

interface LayerRingNode {
  key: string;
  label: string;
  mesh: THREE.Mesh;
}

interface PhotonPulse {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  speed: number;
  baseY: number;
  phase: number;
  layerIndex: number;
  targetLayerIndex: number;
  hopDirection: 1 | -1;
  holdRemaining: number;
  jumpProgress: number;
  jumpDuration: number;
  jumpStartRadius: number;
  jumpTargetRadius: number;
}

export class PersonIdentityScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180);
  readonly controls: OrbitControls;

  private readonly root = new THREE.Group();
  private readonly ringsGroup = new THREE.Group();
  private readonly nodesGroup = new THREE.Group();
  private readonly labelsGroup = new THREE.Group();
  private readonly auraGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private hasPointer = false;
  private isMobileViewport = false;

  private readonly facetNodes: FacetNode[] = [];
  private readonly layerRings: LayerRingNode[] = [];
  private readonly photonPulses: PhotonPulse[] = [];
  private readonly stateEngine = new PersonStateEngine();
  private personViewMode: PersonDetailMode = "identity";
  private identityBuildMode = false;
  private buildLayerIndex = -1;
  private buildLayerStartSeconds = 0;
  private readonly facetDropDurationSeconds = 0.78;
  private readonly facetDropFromYOffset = 2.2;
  private readonly facetDropStaggerSeconds = 0.09;
  private selectedPersonId = "Person";
  private sourceRegion: RegionId = "community";
  private hoveredFacet: string | null = null;
  private selectedFacet: string | null = null;
  private latestCaption = "No active log";
  private readonly orbitPlaneY = 1.48;
  private lastProcessedLogCount = 0;
  private pulseEnergy = 0.1;
  private wavefrontRadius = 0; // Tracks the expanding ripple from center
  private directImpactLayers: string[] = [];
  private derivedImpactLayers: string[] = ["IdentityState"];
  private wellbeingContextNode: WellbeingContextNode | null = null;
  private saocommonsEnabled = false;
  private saocommonsDomains: string[] = [];

  private readonly hoveredMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 14, 10),
    new THREE.MeshBasicMaterial({
      color: "#fff4bd",
      transparent: true,
      opacity: 0.55,
    })
  );

  private readonly selectedMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.04, 12, 22),
    new THREE.MeshBasicMaterial({
      color: "#87c6ff",
      transparent: true,
      opacity: 0.95,
    })
  );

  constructor(
    private readonly domElement: HTMLElement,
    private readonly callbacks: PersonIdentityCallbacks = {}
  ) {
    this.scene.add(this.root);
    this.root.add(this.ringsGroup, this.nodesGroup, this.labelsGroup, this.auraGroup);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.45;

    this.setupSceneLook();
    this.buildIdentityCore();
    this.buildLayerRings();
    this.buildFacetNodes();
    this.buildPhotonPulses();
    this.applyModeVisualState();

    this.hoveredMarker.visible = false;
    this.selectedMarker.visible = false;
    this.root.add(this.hoveredMarker, this.selectedMarker);

    this.camera.position.set(0, 5.5, 10.2);
    this.controls.target.set(0, 1.8, 0);
    this.controls.update();
  }

  setPersonContext(personId: string, regionId: RegionId) {
    this.selectedPersonId = personId;
    this.sourceRegion = regionId;
    // Enter person view in staged-build mode so identity is revealed progressively.
    this.identityBuildMode = true;
    this.buildLayerIndex = 0;
    this.buildLayerStartSeconds = performance.now() * 0.001;
    this.selectedFacet = null;
    this.selectedMarker.visible = false;
    this.hoveredFacet = null;
    this.hoveredMarker.visible = false;
    this.callbacks.onHoverFacetChange?.(null);
    this.applyModeVisualState();
  }

  setTimelineLogs(logs: IovTimeLogEntry[]) {
    const currentCount = this.stateEngine.getLogCount();
    if (logs.length > 0 && logs.length === currentCount + 1) {
      const newLog = logs[logs.length - 1];
      if (newLog) {
        this.stateEngine.appendLog(newLog);
        // Force immediate update to catch the processed count change so we don't double-trigger
        const snapshot = this.stateEngine.getSnapshot();
        this.lastProcessedLogCount = snapshot.processedLogs;
        
        this.onLogAdvanced(newLog);
        this.pulseEnergy = 1.6;
        return;
      }
    }

    this.stateEngine.setLogs(logs);
    this.stateEngine.play();
    const snapshot = this.stateEngine.getSnapshot();
    this.latestCaption = formatValueLogForCaption(snapshot.currentLog);
    this.lastProcessedLogCount = snapshot.processedLogs;
    this.pulseEnergy = 0.14;
    this.syncLogContext(snapshot.currentLog);
  }

  appendLog(log: IovTimeLogEntry) {
    this.stateEngine.appendLog(log);
    // Force immediate visual impact
    this.pulseEnergy = 1.6; // High energy for immediate expansion
    this.syncLogContext(log);
  }

  setDetailMode(mode: PersonDetailMode) {
    if (this.personViewMode === mode) return;
    this.personViewMode = mode;
    this.applyModeVisualState();
  }

  startIdentityBuild() {
    this.identityBuildMode = true;
    this.buildLayerIndex = 0;
    this.buildLayerStartSeconds = performance.now() * 0.001;
    this.hoveredMarker.visible = false;
    this.hoveredFacet = null;
    this.callbacks.onHoverFacetChange?.(null);
    this.applyModeVisualState();
  }

  nextIdentityLayer() {
    if (!this.identityBuildMode) {
      this.startIdentityBuild();
      return;
    }
    if (this.buildLayerIndex >= WELLBEING_IDENTITY_LAYERS.length - 1) return;
    this.buildLayerIndex += 1;
    this.buildLayerStartSeconds = performance.now() * 0.001;
    this.applyModeVisualState();
  }

  replayIdentityLayer() {
    if (!this.identityBuildMode || this.buildLayerIndex < 0) return;
    this.buildLayerStartSeconds = performance.now() * 0.001;
    this.applyModeVisualState();
  }

  setTimelinePlaying(next: boolean) {
    this.stateEngine.setPlaying(next);
  }

  stepTimelineForward() {
    this.stateEngine.stepForward();
  }

  setTimelineSpeed(multiplier: number) {
    this.stateEngine.setSpeed(multiplier);
  }

  getSummary(): PersonIdentitySummary {
    const snapshot = this.stateEngine.getSnapshot();
    const hoveredLayer =
      this.hoveredFacet === null
        ? null
        : this.facetNodes.find((node) => node.facet === this.hoveredFacet)?.layer.label ?? null;
    const selectedLayer =
      this.selectedFacet === null
        ? null
        : this.facetNodes.find((node) => node.facet === this.selectedFacet)?.layer.label ?? null;

    return {
      personId: this.selectedPersonId,
      regionId: this.sourceRegion,
      personViewMode: this.personViewMode,
      layerLabels: WELLBEING_IDENTITY_LAYERS.map((layer) =>
        layer.label.replace("~~", "")
      ),
      identityBuildMode: this.identityBuildMode,
      identityBuildLayerIndex: this.buildLayerIndex,
      identityBuildLayerLabel:
        this.buildLayerIndex >= 0
          ? WELLBEING_IDENTITY_LAYERS[this.buildLayerIndex]?.label.replace("~~", "") ?? null
          : null,
      identityBuildLayerCount: WELLBEING_IDENTITY_LAYERS.length,
      identityBuildComplete:
        this.identityBuildMode &&
        this.buildLayerIndex >= WELLBEING_IDENTITY_LAYERS.length - 1,
      hoveredFacet: this.hoveredFacet,
      selectedFacet: this.selectedFacet,
      hoveredLayer,
      selectedLayer,
      wellbeingScore: snapshot.wellbeingScore,
      auraStrength: snapshot.auraStrength,
      delta24h: snapshot.delta24h,
      delta7d: snapshot.delta7d,
      processedLogs: snapshot.processedLogs,
      totalLogs: snapshot.totalLogs,
      timelinePlaying: snapshot.isPlaying,
      timelineSpeed: snapshot.speed,
      currentLog: snapshot.currentLog,
      currentLogCaption: this.latestCaption,
      directImpactLayers: [...this.directImpactLayers],
      derivedImpactLayers: [...this.derivedImpactLayers],
      wellbeingContextNode: this.wellbeingContextNode,
      saocommonsEnabled: this.saocommonsEnabled,
      saocommonsDomains: [...this.saocommonsDomains],
    };
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setViewportProfile(isMobile: boolean) {
    if (this.isMobileViewport === isMobile) return;
    this.isMobileViewport = isMobile;

    if (isMobile) {
      this.camera.fov = 50;
      this.camera.position.set(0, 6.5, 11.8);
      this.controls.target.set(0, 1.95, 0);
      this.controls.minDistance = 5;
      this.controls.maxDistance = 16;
    } else {
      this.camera.fov = 44;
      this.camera.position.set(0, 5.5, 10.2);
      this.controls.target.set(0, 1.8, 0);
      this.controls.minDistance = 4;
      this.controls.maxDistance = 14;
    }

    this.camera.updateProjectionMatrix();
    this.applyModeVisualState();
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
    this.hoveredMarker.visible = false;
    this.hoveredFacet = null;
    this.callbacks.onHoverFacetChange?.(null);
  }

  selectFromPointer() {
    if (!this.hasPointer) return;
    const hit = this.pickFacet();
    if (!hit) return;

    const node = this.facetNodes[hit];
    if (!node) return;
    this.selectedFacet = node.facet;
    this.selectedMarker.visible = true;
    this.selectedMarker.position.copy(node.mesh.position);
    this.selectedMarker.lookAt(this.camera.position);
    this.callbacks.onSelectFacetChange?.(node.facet);
  }

  update(deltaSeconds: number) {
    this.controls.update();
    this.stateEngine.update(deltaSeconds);
    const snapshot = this.stateEngine.getSnapshot();
    if (snapshot.processedLogs !== this.lastProcessedLogCount) {
      this.lastProcessedLogCount = snapshot.processedLogs;
      this.onLogAdvanced(snapshot.currentLog);
    }
    this.updatePhotonPulses(deltaSeconds, snapshot);
    this.updateOrbits(deltaSeconds, snapshot);
    if (this.hasPointer) this.updateHover();
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls.dispose();
    this.disposeGroup(this.ringsGroup);
    this.disposeGroup(this.nodesGroup);
    this.disposeGroup(this.labelsGroup);
    this.disposeGroup(this.auraGroup);
    this.hoveredMarker.geometry.dispose();
    (this.hoveredMarker.material as THREE.Material).dispose();
    this.selectedMarker.geometry.dispose();
    (this.selectedMarker.material as THREE.Material).dispose();
  }

  private setupSceneLook() {
    this.scene.background = new THREE.Color("#101722");
    this.scene.fog = new THREE.Fog("#101722", 14, 40);

    this.scene.add(new THREE.AmbientLight("#7b96bc", 0.9));

    const key = new THREE.DirectionalLight("#dde9ff", 1.12);
    key.position.set(8, 10, 5);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight("#77a8ff", 0.74);
    rim.position.set(-10, 7, -8);
    this.scene.add(rim);

    const glow = new THREE.PointLight("#f4d372", 0.55, 12);
    glow.position.set(0, 2.3, 0);
    this.scene.add(glow);
  }

  private buildIdentityCore() {
    const coreGroup = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({
        color: "#303a4b",
        roughness: 0.68,
        metalness: 0.08,
      })
    );
    torso.position.y = 1.25;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshStandardMaterial({
        color: "#d9c7b6",
        roughness: 0.6,
        metalness: 0.02,
      })
    );
    head.position.y = 2.45;

    const footBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.2, 18),
      new THREE.MeshStandardMaterial({
        color: "#c9d8ea",
        roughness: 0.92,
        metalness: 0.01,
      })
    );
    footBase.position.y = 0.1;

    coreGroup.add(torso, head, footBase);
    this.root.add(coreGroup);
  }

  private buildLayerRings() {
    this.ringsGroup.clear();
    this.labelsGroup.clear();
    this.layerRings.length = 0;
    const labelOffsetSpan = (WELLBEING_IDENTITY_LAYERS.length - 1) * 0.16;

    WELLBEING_IDENTITY_LAYERS.forEach((layer, idx) => {
      const radius = 1.55 + idx * 0.62;
      const y = this.orbitPlaneY;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.024, 14, 150),
        new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.8,
        })
      );
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      this.ringsGroup.add(ring);
      this.layerRings.push({
        key: layer.key,
        label: layer.label.replace("~~", ""),
        mesh: ring,
      });

      const label = this.createTextSprite(layer.label.replace("~~", ""));
      label.position.set(
        radius + 0.42,
        y + (labelOffsetSpan * 0.5 - idx * 0.16),
        0
      );
      this.labelsGroup.add(label);
    });
  }

  private buildFacetNodes() {
    this.facetNodes.length = 0;
    this.nodesGroup.clear();

    WELLBEING_IDENTITY_LAYERS.forEach((layer, layerIndex) => {
      const radius = 1.55 + layerIndex * 0.62;
      const y = this.orbitPlaneY;
      const count = layer.facets.length;

      layer.facets.forEach((facet, facetIndex) => {
        const angle = (facetIndex / Math.max(1, count)) * Math.PI * 2;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 14, 10),
          new THREE.MeshStandardMaterial({
            color: layer.color,
            roughness: 0.44,
            metalness: 0.15,
            emissive: layer.color,
            emissiveIntensity: 0.08,
          })
        );

        mesh.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        );
        mesh.userData.facet = facet;
        mesh.userData.layer = layer.label;
        this.nodesGroup.add(mesh);

        this.facetNodes.push({
          facet,
          layer,
          layerIndex,
          mesh,
          angle,
          radius,
          baseY: y,
          speed: 0.04 + layerIndex * 0.01 + (facetIndex % 4) * 0.006,
          dropOffsetSeconds: facetIndex * this.facetDropStaggerSeconds,
        });
      });
    });
  }

  private buildPhotonPulses() {
    this.auraGroup.clear();
    this.photonPulses.length = 0;

    // Start near center (inside first layer)
    const pulseDefs = [
      { layerIndex: -1, baseY: this.orbitPlaneY - 0.02, color: "#f5dc67", speed: 0.86, phase: 0.3 },
    ];

    pulseDefs.forEach((def) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16), // Larger central photon
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.8, // Brighter
          transparent: true,
          opacity: 0.9,
          roughness: 0.2,
          metalness: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      // Start dead center
      mesh.position.set(0, def.baseY, 0);
      this.auraGroup.add(mesh);
      
      this.photonPulses.push({
        mesh,
        angle: 0,
        radius: 0.1, // Start very close to center
        speed: def.speed,
        baseY: def.baseY,
        phase: def.phase,
        layerIndex: -1,
        targetLayerIndex: 0,
        hopDirection: 1,
        holdRemaining: 0.2,
        jumpProgress: 0,
        jumpDuration: 0.6,
        jumpStartRadius: 0.1,
        jumpTargetRadius: this.getLayerRadius(0),
      });
    });
  }

  private updatePhotonPulses(
    deltaSeconds: number,
    snapshot: ReturnType<PersonStateEngine["getSnapshot"]>
  ) {
    const time = performance.now() * 0.001;
    const strength = snapshot.auraStrength;
    this.latestCaption = formatValueLogForCaption(snapshot.currentLog);
    this.pulseEnergy = Math.max(0.03, this.pulseEnergy - deltaSeconds * 0.08);

    // Expansion Logic: If high energy (commit), expand the wavefront
    if (this.pulseEnergy > 0.6) {
        // Expand rapidly from center
        this.wavefrontRadius += deltaSeconds * 6.0;
    } else if (this.pulseEnergy < 0.1) {
        // Reset wavefront when calm so it's ready for next pulse
        // But keep it "full" (essentially infinite) so stable state is visible
        this.wavefrontRadius = 100;
        
        // However, if we just committed, we want to reset to 0 to start the animation
        // This reset is handled in onLogAdvanced below
    }

    const maxVisibleLayerIndex =
      this.identityBuildMode && this.personViewMode === "identity"
        ? Math.max(0, this.buildLayerIndex)
        : WELLBEING_IDENTITY_LAYERS.length - 1;

    this.photonPulses.forEach((pulse, index) => {
      pulse.mesh.visible = maxVisibleLayerIndex >= 0;
      if (!pulse.mesh.visible) return;

      // The Photon strictly follows the wavefront edge during expansion
      // Otherwise, it orbits gently at a stable radius (Identity State usually)
      
      const isRippleMode = this.pulseEnergy > 0.4;
      
      if (isRippleMode) {
          // Ride the wave!
          pulse.radius = Math.max(0.1, this.wavefrontRadius);
          pulse.angle += deltaSeconds * 5.0; // Spin fast while traveling
          
          // Visuals for the "traveling packet" - Bright White like the dropped photon
          pulse.mesh.scale.setScalar(2.0); 
          (pulse.mesh.material as THREE.MeshStandardMaterial).color.set("#ffffff");
          (pulse.mesh.material as THREE.MeshStandardMaterial).emissive.set("#ffffff");
          (pulse.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0;
          (pulse.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;
      } else {
          // Orbit calmly around Identity State (usually index 6, radius ~5.3)
          // or just the last visible layer
          const stableIndex = Math.min(6, maxVisibleLayerIndex);
          const stableRadius = this.getLayerRadius(stableIndex);
          
          // Lerp to stable orbit
          pulse.radius += (stableRadius - pulse.radius) * deltaSeconds * 2.0;
          pulse.angle += deltaSeconds * 0.5; // Slow orbit
          
          pulse.mesh.scale.setScalar(1.0 + strength * 0.5);
          (pulse.mesh.material as THREE.MeshStandardMaterial).color.set("#f5dc67"); // Back to Identity Yellow
          (pulse.mesh.material as THREE.MeshStandardMaterial).emissive.set("#f5dc67");
          (pulse.mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;
          (pulse.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      }

      pulse.mesh.position.set(
        Math.cos(pulse.angle) * pulse.radius,
        pulse.baseY,
        Math.sin(pulse.angle) * pulse.radius
      );
    });
  }

  // private scheduleNextPhotonHop... (removed as simpler logic is now used)

  private updateOrbits(
    deltaSeconds: number,
    snapshot: ReturnType<PersonStateEngine["getSnapshot"]>
  ) {
    const nowSeconds = performance.now() * 0.001;
    const buildLayerProgress = this.getBuildLayerProgress(nowSeconds);
    const buildModeActive = this.identityBuildMode && this.personViewMode === "identity";
    const toLayerKey = (label: string) =>
      label
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/\s+/g, "_")
        .toLowerCase();
    const directKeys = new Set(this.directImpactLayers.map(toLayerKey));
    const derivedKeys = new Set(this.derivedImpactLayers.map(toLayerKey));
    const activityImpact = this.extractActivityImpact(snapshot.currentLog);

    this.layerRings.forEach((ringNode) => {
      const material = ringNode.mesh.material as THREE.MeshBasicMaterial;
      const ringLayerIndex = WELLBEING_IDENTITY_LAYERS.findIndex(
        (layer) => layer.key === ringNode.key
      );
      
      const layerRadius = 1.55 + ringLayerIndex * 0.62;
      
      // WAVEFRONT LOGIC:
      // If wavefront hasn't reached this layer, hide it.
      if (this.wavefrontRadius < layerRadius) {
          ringNode.mesh.visible = false;
          // Hide label too
          const label = this.labelsGroup.children[ringLayerIndex];
          if (label) label.visible = false;
          return;
      }
      
      // Determine if layer is "just hit" by the wavefront (within 0.5 units)
      const waveImpact = Math.max(0, 1.0 - (this.wavefrontRadius - layerRadius) * 2.0);
      
      if (buildModeActive && ringLayerIndex > this.buildLayerIndex) {
        ringNode.mesh.visible = false;
        return;
      }
      
      ringNode.mesh.visible = true;
      const isDirect = directKeys.has(ringNode.key);
      const isDerived = derivedKeys.has(ringNode.key);
      
      // Label Visibility Logic (De-clutter)
      // Show label if: 
      // 1. Layer is JUST hit by wave (flash)
      // 2. Layer is hovered or directly impacted
      // 3. We are in steady state (wavefront effectively infinite) AND (first layer or derived/impacted)
      // This reduces the wall of text.
      const label = this.labelsGroup.children[ringLayerIndex];
      if (label) {
          const isSteadyState = this.pulseEnergy < 0.1;
          const showLabel = (waveImpact > 0.1) || isDirect || (isSteadyState && (isDerived || ringLayerIndex === 0));
          label.visible = showLabel;
          // Fade label based on impact
           ((label as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.min(1, 0.4 + waveImpact + (isDirect ? 0.4 : 0));
      }

      let baseline = this.personViewMode === "valuelog" ? 0.42 : 0.65;
      if (buildModeActive) {
        const isCurrentLayer = ringLayerIndex === this.buildLayerIndex;
        baseline = isCurrentLayer ? 0.14 + buildLayerProgress * 0.58 : 0.56;
      }
      
      const boost = isDirect
        ? 0.16 + activityImpact * 0.32 + this.pulseEnergy * 0.22
        : isDerived
          ? 0.1 + activityImpact * 0.18 + this.pulseEnergy * 0.15
          : 0;

      // Flash on wave impact
      material.opacity = Math.min(1, baseline + boost + waveImpact * 0.5);
      
      // Pulse scale
      ringNode.mesh.scale.setScalar(
        1 + (isDirect ? 0.02 : isDerived ? 0.01 : 0) + this.pulseEnergy * (isDirect ? 0.06 : 0.03) + waveImpact * 0.08
      );
    });

    this.facetNodes.forEach((node) => {
      node.angle += deltaSeconds * node.speed;
      const x = Math.cos(node.angle) * node.radius;
      const z = Math.sin(node.angle) * node.radius;
      const material = node.mesh.material as THREE.MeshStandardMaterial; // Facet
      
      // Wavefront check for facets too
      if (this.wavefrontRadius < node.radius) {
          node.mesh.visible = false;
          return;
      }
      
      const waveImpact = Math.max(0, 1.0 - (this.wavefrontRadius - node.radius) * 1.5);

      const isDirect = directKeys.has(node.layer.key);
      const isDerived = derivedKeys.has(node.layer.key);
      const hiddenByBuild =
        buildModeActive &&
        (this.buildLayerIndex < 0 || node.layerIndex > this.buildLayerIndex);
      if (hiddenByBuild) {
        node.mesh.visible = false;
        return;
      }

      node.mesh.visible = true;
      let y = node.baseY;
      let dropBlend = 1;

      if (buildModeActive && node.layerIndex === this.buildLayerIndex) {
        const elapsed = nowSeconds - this.buildLayerStartSeconds - node.dropOffsetSeconds;
        if (elapsed <= 0) {
          node.mesh.visible = false;
          return;
        }
        const progress = Math.min(1, elapsed / this.facetDropDurationSeconds);
        const eased = this.easeOutCubic(progress);
        y = node.baseY + (1 - eased) * this.facetDropFromYOffset;
        dropBlend = eased;
      }

      node.mesh.position.set(x, y, z);
      
      // Flash emissive on wave hit
      const impactGlow = waveImpact * 2.0; 

      material.emissiveIntensity = (isDirect
        ? (0.13 + activityImpact * 0.22)
        : isDerived
          ? (0.1 + activityImpact * 0.12)
          : 0.05) * dropBlend + this.pulseEnergy * 0.15 + impactGlow;
          
      material.opacity = Math.max(0.06, dropBlend);
      material.transparent = dropBlend < 0.999 || waveImpact > 0.01;
    });

    if (this.selectedFacet) {
      const selected = this.facetNodes.find((node) => node.facet === this.selectedFacet);
      if (selected?.mesh.visible) {
        this.selectedMarker.position.copy(selected.mesh.position);
        this.selectedMarker.lookAt(this.camera.position);
        this.selectedMarker.visible = true;
      } else {
        this.selectedMarker.visible = false;
      }
    }
  }

  private onLogAdvanced(log: IovTimeLogEntry | null) {
    this.syncLogContext(log);
    const impact = Math.abs(this.extractActivityImpact(log));
    // Log events inject new outward energy into the orbit field.
    this.pulseEnergy = Math.min(1.35, 0.2 + impact * 0.95);
    
    // Reset wavefront to 0 to start the sequential expansion animation
    this.wavefrontRadius = 0;
  }

  private extractActivityImpact(log: IovTimeLogEntry | null) {
    if (!log) return 0.4;
    const context = log["~WellbeingProtocol"]["~~Context"];
    const base = Math.min(1, Math.max(0.1, context["~~~SignalScore"]));
    if (context["~~~ImpactDirection"] === "decrease") return -base;
    if (context["~~~ImpactDirection"] === "neutral") return 0.1;
    return base;
  }

  private syncLogContext(log: IovTimeLogEntry | null) {
    if (!log) {
      this.wellbeingContextNode = null;
      this.saocommonsEnabled = false;
      this.saocommonsDomains = [];
      this.directImpactLayers = [];
      this.derivedImpactLayers = ["IdentityState"];
      return;
    }

    const context = log["~WellbeingProtocol"]["~~Context"];
    const activation = log["~SAOcommons"]["~~Activation"];
    this.wellbeingContextNode = context["~~~PrimaryNode"];
    this.saocommonsEnabled = activation["~~~Enabled"];
    this.saocommonsDomains = activation["~~~Domains"].map((domain) => domain.replace("~~", ""));

    if (context["~~~PrimaryNode"] === "~~Performance") {
      this.directImpactLayers = ["Story", "Skills"];
      this.derivedImpactLayers = ["IdentityState"];
    } else {
      this.directImpactLayers = [];
      this.derivedImpactLayers = ["IdentityState"];
    }
  }

  private updateHover() {
    const hitIndex = this.pickFacet();
    if (hitIndex === null) {
      this.hoveredMarker.visible = false;
      if (this.hoveredFacet !== null) {
        this.hoveredFacet = null;
        this.callbacks.onHoverFacetChange?.(null);
      }
      return;
    }

    const node = this.facetNodes[hitIndex];
    if (!node) return;

    this.hoveredMarker.visible = true;
    this.hoveredMarker.position.copy(node.mesh.position);
    if (this.hoveredFacet !== node.facet) {
      this.hoveredFacet = node.facet;
      this.callbacks.onHoverFacetChange?.(node.facet);
    }
  }

  private applyModeVisualState() {
    const isDailyLogs = this.personViewMode === "valuelog";
    const buildModeActive = this.identityBuildMode && !isDailyLogs;

    // Mobile keeps labels available in Identity mode through panel rail;
    // in-scene labels are shown only when there is enough viewport room.
    this.labelsGroup.visible = !isDailyLogs && !this.isMobileViewport;
    if (this.labelsGroup.visible) {
      this.labelsGroup.children.forEach((child, idx) => {
        child.visible = !buildModeActive || idx <= this.buildLayerIndex;
      });
    }

    this.ringsGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const ringLayerIndex = this.ringsGroup.children.indexOf(child);
      mesh.visible = !buildModeActive || ringLayerIndex <= this.buildLayerIndex;
      mat.opacity = isDailyLogs ? 0.56 : 0.82;
    });

    this.facetNodes.forEach((node) => {
      const mat = node.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 1;
      mat.transparent = false;
      mat.emissiveIntensity = isDailyLogs ? 0.045 : 0.09;
    });

    this.photonPulses.forEach((pulse) => {
      pulse.mesh.visible = !isDailyLogs;
      const mat = pulse.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = isDailyLogs ? 0.2 : 0.68;
    });
  }

  private getBuildLayerProgress(nowSeconds: number) {
    if (!this.identityBuildMode || this.buildLayerIndex < 0) return 1;
    const facetCount =
      WELLBEING_IDENTITY_LAYERS[this.buildLayerIndex]?.facets.length ?? 1;
    const maxStagger = Math.max(0, (facetCount - 1) * this.facetDropStaggerSeconds);
    const totalDuration = this.facetDropDurationSeconds + maxStagger;
    const elapsed = Math.max(0, nowSeconds - this.buildLayerStartSeconds);
    return Math.min(1, elapsed / Math.max(0.01, totalDuration));
  }

  private easeOutCubic(value: number) {
    const t = Math.min(1, Math.max(0, value));
    return 1 - (1 - t) ** 3;
  }

  private easeInOutSine(value: number) {
    const t = Math.min(1, Math.max(0, value));
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  private getLayerRadius(layerIndex: number) {
    return 1.55 + layerIndex * 0.62;
  }

  private pickFacet() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.nodesGroup.children, false);
    const first = hits.find((hit) => hit.object.visible);
    if (!first) return null;
    const idx = this.facetNodes.findIndex((node) => node.mesh === first.object);
    return idx >= 0 ? idx : null;
  }

  private createTextSprite(text: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(10,24,44,0.88)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(227,213,132,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      ctx.fillStyle = "#f0f6ff";
      ctx.font = "600 24px Avenir Next";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    sprite.scale.set(2.2, 0.55, 1);
    return sprite;
  }

  private disposeGroup(group: THREE.Group) {
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry?.dispose?.();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material?.dispose?.();
        }
      }
    });
    group.clear();
  }
}
