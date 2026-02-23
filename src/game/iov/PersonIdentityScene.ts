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
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  y: number;
  speed: number;
}

interface LayerRingNode {
  key: string;
  label: string;
  mesh: THREE.Mesh;
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
  private readonly fieldBands: THREE.Mesh[] = [];
  private readonly pulseWaves: THREE.Mesh[] = [];
  private readonly stateEngine = new PersonStateEngine();
  private personViewMode: PersonDetailMode = "identity";
  private selectedPersonId = "Person";
  private sourceRegion: RegionId = "community";
  private hoveredFacet: string | null = null;
  private selectedFacet: string | null = null;
  private latestCaption = "No active log";
  private readonly orbitPlaneY = 1.48;
  private lastProcessedLogCount = 0;
  private pulseEnergy = 0.1;
  private pulseDirection: 1 | -1 = 1;
  private pulsePhase = 0;
  private directImpactLayers: string[] = [];
  private derivedImpactLayers: string[] = ["IdentityState"];
  private wellbeingContextNode: WellbeingContextNode | null = null;
  private saocommonsEnabled = false;
  private saocommonsDomains: string[] = [];
  private readonly timelineRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.36, 0.032, 10, 140),
    new THREE.MeshBasicMaterial({
      color: "#f3c94b",
      transparent: true,
      opacity: 0.82,
    })
  );
  private readonly timelineDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 10),
    new THREE.MeshBasicMaterial({
      color: "#ffd957",
      transparent: true,
      opacity: 0.96,
    })
  );

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
    this.buildAura();
    this.buildTimeline();
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
  }

  setTimelineLogs(logs: IovTimeLogEntry[]) {
    this.stateEngine.setLogs(logs);
    this.stateEngine.play();
    const snapshot = this.stateEngine.getSnapshot();
    this.latestCaption = formatValueLogForCaption(snapshot.currentLog);
    this.lastProcessedLogCount = snapshot.processedLogs;
    this.pulseEnergy = 0.14;
    this.pulsePhase = 0;
    this.syncLogContext(snapshot.currentLog);
  }

  setDetailMode(mode: PersonDetailMode) {
    if (this.personViewMode === mode) return;
    this.personViewMode = mode;
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
    this.updateAura(deltaSeconds, snapshot);
    this.updateOrbits(deltaSeconds, snapshot);
    this.updateTimeline(deltaSeconds, snapshot);
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
    this.timelineRing.geometry.dispose();
    (this.timelineRing.material as THREE.Material).dispose();
    this.timelineDot.geometry.dispose();
    (this.timelineDot.material as THREE.Material).dispose();
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
          mesh,
          angle,
          radius,
          y,
          speed: 0.04 + layerIndex * 0.01 + (facetIndex % 4) * 0.006,
        });
      });
    });
  }

  private buildAura() {
    this.auraGroup.clear();
    this.fieldBands.length = 0;
    this.pulseWaves.length = 0;

    const bandDefs = [
      { inner: 1.2, outer: 3.3, color: "#7cc4ff", opacity: 0.09 },
      { inner: 3.3, outer: 5.2, color: "#8fd7ff", opacity: 0.07 },
      { inner: 5.2, outer: 6.8, color: "#9ec8ff", opacity: 0.05 },
    ];

    bandDefs.forEach((band, index) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(band.inner, band.outer, 96),
        new THREE.MeshBasicMaterial({
          color: band.color,
          transparent: true,
          opacity: band.opacity,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = this.orbitPlaneY;
      mesh.userData.baseOpacity = band.opacity;
      mesh.userData.spin = 0.02 + index * 0.012;
      this.auraGroup.add(mesh);
      this.fieldBands.push(mesh);
    });

    for (let i = 0; i < 4; i += 1) {
      const wave = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.04, 12, 120),
        new THREE.MeshBasicMaterial({
          color: "#ffe67d",
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      wave.rotation.x = Math.PI / 2;
      wave.position.y = this.orbitPlaneY;
      wave.userData.offset = i * 0.23;
      this.auraGroup.add(wave);
      this.pulseWaves.push(wave);
    }
  }

  private buildTimeline() {
    this.timelineRing.position.y = this.orbitPlaneY - 0.46;
    this.timelineRing.rotation.x = Math.PI / 2;
    this.timelineDot.position.set(1.36, this.orbitPlaneY - 0.46, 0);
    this.root.add(this.timelineRing, this.timelineDot);
  }

  private updateAura(
    deltaSeconds: number,
    snapshot: ReturnType<PersonStateEngine["getSnapshot"]>
  ) {
    const time = performance.now() * 0.001;
    const strength = snapshot.auraStrength;
    this.latestCaption = formatValueLogForCaption(snapshot.currentLog);
    this.pulseEnergy = Math.max(0.03, this.pulseEnergy - deltaSeconds * 0.08);
    this.pulsePhase += deltaSeconds * (0.42 + strength * 0.6);
    const directionalBoost = this.pulseDirection === 1 ? this.pulseEnergy : -this.pulseEnergy * 0.55;

    this.fieldBands.forEach((band, index) => {
      const mat = band.material as THREE.MeshBasicMaterial;
      const baseOpacity = (band.userData.baseOpacity as number | undefined) ?? 0.05;
      const breathing = Math.sin(time * (0.6 + index * 0.2) + index) * 0.014;
      mat.opacity = Math.max(
        0.012,
        baseOpacity + strength * 0.12 + directionalBoost * 0.28 + breathing
      );
      band.rotation.z += deltaSeconds * ((band.userData.spin as number | undefined) ?? 0.02);
    });

    this.pulseWaves.forEach((wave) => {
      const offset = (wave.userData.offset as number | undefined) ?? 0;
      const progress = (this.pulsePhase + offset) % 1;
      const scale =
        this.pulseDirection === 1
          ? 0.95 + progress * 5.6
          : 1.45 - progress * 0.6;
      wave.scale.setScalar(scale);
      const mat = wave.material as THREE.MeshBasicMaterial;
      const envelope = Math.max(0, 1 - progress);
      mat.opacity =
        this.pulseDirection === 1
          ? envelope * (0.08 + this.pulseEnergy * 0.85)
          : envelope * (0.04 + this.pulseEnergy * 0.32);
    });
  }

  private updateOrbits(
    deltaSeconds: number,
    snapshot: ReturnType<PersonStateEngine["getSnapshot"]>
  ) {
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
      const isDirect = directKeys.has(ringNode.key);
      const isDerived = derivedKeys.has(ringNode.key);
      const baseline = this.personViewMode === "valuelog" ? 0.42 : 0.65;
      const boost = isDirect
        ? 0.16 + activityImpact * 0.32 + this.pulseEnergy * 0.22
        : isDerived
          ? 0.1 + activityImpact * 0.18 + this.pulseEnergy * 0.15
          : 0;
      material.opacity = baseline + boost;
      ringNode.mesh.scale.setScalar(
        1 + (isDirect ? 0.02 : isDerived ? 0.01 : 0) + this.pulseEnergy * (isDirect ? 0.06 : 0.03)
      );
    });

    this.facetNodes.forEach((node) => {
      node.angle += deltaSeconds * node.speed;
      node.mesh.position.set(
        Math.cos(node.angle) * node.radius,
        node.y,
        Math.sin(node.angle) * node.radius
      );

      const material = node.mesh.material as THREE.MeshStandardMaterial;
      const isDirect = directKeys.has(node.layer.key);
      const isDerived = derivedKeys.has(node.layer.key);
      material.emissiveIntensity = isDirect
        ? 0.13 + activityImpact * 0.22
        : isDerived
          ? 0.1 + activityImpact * 0.12
          : 0.05;
    });

    if (this.selectedFacet) {
      const selected = this.facetNodes.find((node) => node.facet === this.selectedFacet);
      if (selected) {
        this.selectedMarker.position.copy(selected.mesh.position);
        this.selectedMarker.lookAt(this.camera.position);
      }
    }
  }

  private updateTimeline(
    deltaSeconds: number,
    snapshot: ReturnType<PersonStateEngine["getSnapshot"]>
  ) {
    const ratio =
      snapshot.totalLogs > 0 ? snapshot.processedLogs / snapshot.totalLogs : 0;
    const angle = ratio * Math.PI * 2 + performance.now() * 0.00015 * snapshot.speed;
    const radius = 1.36;
    this.timelineDot.position.set(
      Math.cos(angle) * radius,
      this.timelineRing.position.y + Math.sin(performance.now() * 0.0024) * 0.03,
      Math.sin(angle) * radius
    );

    const ringMat = this.timelineRing.material as THREE.MeshBasicMaterial;
    const modeBoost = this.personViewMode === "valuelog" ? 0.24 : 0;
    ringMat.opacity = 0.35 + snapshot.auraStrength * 0.35 + modeBoost;
    this.timelineRing.rotation.z += deltaSeconds * 0.06;
  }

  private onLogAdvanced(log: IovTimeLogEntry | null) {
    this.syncLogContext(log);
    const impact = Math.abs(this.extractActivityImpact(log));
    // Log events inject new outward energy into the orbit field.
    this.pulseEnergy = Math.min(1.35, 0.2 + impact * 0.95);
    this.pulseDirection = this.extractActivityImpact(log) >= 0 ? 1 : -1;
    this.pulsePhase = 0;
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

    // Mobile keeps labels available in Identity mode through panel rail;
    // in-scene labels are shown only when there is enough viewport room.
    this.labelsGroup.visible = !isDailyLogs && !this.isMobileViewport;

    this.ringsGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = isDailyLogs ? 0.56 : 0.82;
    });

    this.facetNodes.forEach((node) => {
      const mat = node.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 1;
      mat.transparent = false;
      mat.emissiveIntensity = isDailyLogs ? 0.045 : 0.09;
    });

    const timelineMat = this.timelineRing.material as THREE.MeshBasicMaterial;
    timelineMat.opacity = isDailyLogs ? 0.82 : 0.54;
    const dotMat = this.timelineDot.material as THREE.MeshBasicMaterial;
    dotMat.opacity = isDailyLogs ? 0.98 : 0.86;
  }

  private pickFacet() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.nodesGroup.children, false);
    const first = hits[0];
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
