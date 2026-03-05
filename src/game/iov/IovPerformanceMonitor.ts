import type * as THREE from "three";
import type { SemanticZoomLevel } from "./IovSemanticZoomController";

export interface IovPerformanceSnapshot {
  timestampMs: number;
  semanticLevel: SemanticZoomLevel;
  fps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  jsHeapMb: number | null;
}

interface IovPerformanceMonitorOptions {
  sampleCapacity?: number;
  publishIntervalMs?: number;
  onSnapshot?: (snapshot: IovPerformanceSnapshot) => void;
}

const DEFAULT_SAMPLE_CAPACITY = 180;
const DEFAULT_PUBLISH_INTERVAL_MS = 500;

export class IovPerformanceMonitor {
  private readonly sampleCapacity: number;
  private readonly frameSamples: Float32Array;
  private readonly publishIntervalMs: number;
  private readonly onSnapshot?: (snapshot: IovPerformanceSnapshot) => void;
  private readonly sortBuffer: number[] = [];
  private overlayNode: HTMLPreElement | null = null;
  private latestSnapshot: IovPerformanceSnapshot | null = null;
  private sampleCount = 0;
  private sampleCursor = 0;
  private lastPublishMs = 0;

  constructor(options: IovPerformanceMonitorOptions = {}) {
    this.sampleCapacity = Math.max(20, options.sampleCapacity ?? DEFAULT_SAMPLE_CAPACITY);
    this.frameSamples = new Float32Array(this.sampleCapacity);
    this.publishIntervalMs = Math.max(150, options.publishIntervalMs ?? DEFAULT_PUBLISH_INTERVAL_MS);
    this.onSnapshot = options.onSnapshot;
  }

  attachOverlay(host: HTMLElement) {
    if (this.overlayNode || !host) return;
    const node = document.createElement("pre");
    node.className = "iov-perf-overlay";
    node.setAttribute("aria-live", "polite");
    node.textContent = "Perf: collecting...";
    host.appendChild(node);
    this.overlayNode = node;
  }

  detachOverlay() {
    if (!this.overlayNode) return;
    const node = this.overlayNode;
    this.overlayNode = null;
    if (node.parentNode) node.parentNode.removeChild(node);
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }

  recordFrame(
    deltaSeconds: number,
    renderer: THREE.WebGLRenderer,
    semanticLevel: SemanticZoomLevel
  ) {
    const frameMs = Math.max(0, deltaSeconds * 1000);
    this.frameSamples[this.sampleCursor] = frameMs;
    this.sampleCursor = (this.sampleCursor + 1) % this.sampleCapacity;
    this.sampleCount = Math.min(this.sampleCount + 1, this.sampleCapacity);

    const now = performance.now();
    if (this.lastPublishMs === 0) {
      this.lastPublishMs = now;
      return;
    }
    if (now - this.lastPublishMs < this.publishIntervalMs) return;
    this.lastPublishMs = now;
    if (this.sampleCount === 0) return;

    let sum = 0;
    let maxFrameMs = 0;
    this.sortBuffer.length = this.sampleCount;
    for (let index = 0; index < this.sampleCount; index += 1) {
      const value = this.frameSamples[index] ?? 0;
      this.sortBuffer[index] = value;
      sum += value;
      if (value > maxFrameMs) maxFrameMs = value;
    }
    this.sortBuffer.sort((a, b) => a - b);

    const avgFrameMs = sum / this.sampleCount;
    const p95Index = Math.min(
      this.sampleCount - 1,
      Math.max(0, Math.floor((this.sampleCount - 1) * 0.95))
    );
    const p95FrameMs = this.sortBuffer[p95Index] ?? maxFrameMs;
    const fps = avgFrameMs > 0 ? 1000 / avgFrameMs : 0;
    const rendererInfo = renderer.info;
    const programs = (
      rendererInfo as unknown as {
        programs?: unknown[];
      }
    ).programs?.length ?? 0;

    const memory = (
      performance as Performance & {
        memory?: {
          usedJSHeapSize?: number;
        };
      }
    ).memory;
    const jsHeapMb = memory?.usedJSHeapSize
      ? Number((memory.usedJSHeapSize / (1024 * 1024)).toFixed(1))
      : null;

    const snapshot: IovPerformanceSnapshot = {
      timestampMs: now,
      semanticLevel,
      fps: Number(fps.toFixed(1)),
      avgFrameMs: Number(avgFrameMs.toFixed(2)),
      p95FrameMs: Number(p95FrameMs.toFixed(2)),
      maxFrameMs: Number(maxFrameMs.toFixed(2)),
      drawCalls: rendererInfo.render.calls,
      triangles: rendererInfo.render.triangles,
      geometries: rendererInfo.memory.geometries,
      textures: rendererInfo.memory.textures,
      programs,
      jsHeapMb,
    };

    this.latestSnapshot = snapshot;
    this.onSnapshot?.(snapshot);
    if (this.overlayNode) {
      this.overlayNode.textContent = this.toOverlayText(snapshot);
    }
  }

  private toOverlayText(snapshot: IovPerformanceSnapshot) {
    const heapText = snapshot.jsHeapMb === null ? "n/a" : `${snapshot.jsHeapMb.toFixed(1)}MB`;
    return [
      `Scene: ${snapshot.semanticLevel}`,
      `FPS: ${snapshot.fps.toFixed(1)}  avg: ${snapshot.avgFrameMs.toFixed(2)}ms  p95: ${snapshot.p95FrameMs.toFixed(2)}ms`,
      `Draw: ${snapshot.drawCalls}  Triangles: ${snapshot.triangles}`,
      `Geo: ${snapshot.geometries}  Tex: ${snapshot.textures}  Prog: ${snapshot.programs}`,
      `Heap: ${heapText}`,
    ].join("\n");
  }
}
