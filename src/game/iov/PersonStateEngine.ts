import type { IovTimeLogEntry } from "./iovTimelogs";

export interface PersonStateSnapshot {
  processedLogs: number;
  totalLogs: number;
  wellbeingScore: number;
  auraStrength: number;
  delta24h: number;
  delta7d: number;
  currentLog: IovTimeLogEntry | null;
  isPlaying: boolean;
  speed: number;
}

export class PersonStateEngine {
  private static readonly BASE_INTERVAL_SECONDS = 2.2;

  private logs: IovTimeLogEntry[] = [];
  private processed = -1;
  private elapsed = 0;
  private intervalSeconds = PersonStateEngine.BASE_INTERVAL_SECONDS;
  private speed = 1;
  private playing = true;
  private wellbeingScore = 0.52;
  private auraStrength = 0.45;
  private history: number[] = [];

  setLogs(logs: IovTimeLogEntry[]) {
    this.logs = logs;
    this.reset();
  }

  reset() {
    this.processed = -1;
    this.elapsed = 0;
    this.speed = 1;
    this.intervalSeconds = PersonStateEngine.BASE_INTERVAL_SECONDS;
    this.wellbeingScore = 0.52;
    this.auraStrength = 0.45;
    this.history.length = 0;
  }

  play() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  setPlaying(next: boolean) {
    this.playing = next;
  }

  isPlaying() {
    return this.playing;
  }

  stepForward() {
    this.step();
  }

  setSpeed(multiplier: number) {
    this.speed = Math.min(4, Math.max(0.25, multiplier));
    this.intervalSeconds = PersonStateEngine.BASE_INTERVAL_SECONDS / this.speed;
  }

  getSpeed() {
    return this.speed;
  }

  update(deltaSeconds: number) {
    if (!this.playing || this.logs.length === 0) return;
    this.elapsed += deltaSeconds;
    while (this.elapsed >= this.intervalSeconds) {
      this.elapsed -= this.intervalSeconds;
      this.step();
    }
  }

  step() {
    if (this.logs.length === 0) return;
    this.processed = (this.processed + 1) % this.logs.length;
    const log = this.logs[this.processed];
    if (!log) return;

    const hint = log._engine;
    const perf = log["~WellbeingProtocol"]["~~Performance"];
    const computedDelta =
      ((perf["~~~LearningOutput"] + perf["~~~EarningOutput"] + perf["~~~OrgBuildingOutput"]) / 3) *
        0.015 +
      (log["~SAOcommons"]["~~Validation"]["~~~ValidationDecision"] === "approved" ? 0.006 : -0.004);
    const delta = hint?.wellbeing_delta ?? computedDelta;
    const auraDelta = hint?.aura_delta ?? Math.max(-0.02, delta * 1.8);

    this.wellbeingScore = clamp01(this.wellbeingScore + delta);
    this.auraStrength = clamp01(0.32 + this.wellbeingScore * 0.66 + auraDelta * 0.3);

    this.history.push(delta);
    if (this.history.length > 14) {
      this.history.splice(0, this.history.length - 14);
    }
  }

  getSnapshot(): PersonStateSnapshot {
    const currentLog = this.logs[this.processed] ?? null;
    const delta24h = this.history[this.history.length - 1] ?? 0;
    const delta7d = average(this.history.slice(-7));
    return {
      processedLogs: Math.max(this.processed + 1, 0),
      totalLogs: this.logs.length,
      wellbeingScore: this.wellbeingScore,
      auraStrength: this.auraStrength,
      delta24h,
      delta7d,
      currentLog,
      isPlaying: this.playing,
      speed: this.speed,
    };
  }
}

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
