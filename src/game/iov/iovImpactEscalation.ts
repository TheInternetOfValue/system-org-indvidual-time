import type { RegionId } from "./IovTopologyScene";

export interface PersonImpactResult {
  personId: string;
  sourceRegionId: RegionId;
  sourceBrickId: number;
  auraDelta: number;
  timestamp: number;
}

export interface OrgImpactResult {
  regionId: RegionId;
  brickId: number;
  activatedPeopleCount: number;
  populationCount: number;
  contagionComplete: boolean;
  orgRadiance: number;
  communityPowerDelta: number;
}

export interface SystemImpactResult {
  communityPillarHeightBefore: number;
  communityPillarHeightAfter: number;
  bridgeStressBefore: number;
  bridgeStressAfter: number;
  bridgeCollapsed: boolean;
}

export type ImpactEscalationPhase =
  | "idle"
  | "person_impact_done"
  | "org_impact_pending"
  | "org_impact_running"
  | "org_impact_done"
  | "system_impact_running"
  | "system_impact_done";

export interface IovImpactEscalationState {
  enabled: boolean;
  phase: ImpactEscalationPhase;
  lastPersonImpact: PersonImpactResult | null;
  lastOrgImpact: OrgImpactResult | null;
  lastSystemImpact: SystemImpactResult | null;
  updatedAt: number | null;
}

export type IovImpactEscalationEvent =
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "RESET" }
  | { type: "RECORD_PERSON_IMPACT"; result: PersonImpactResult }
  | { type: "MARK_ORG_IMPACT_PENDING" }
  | { type: "START_ORG_IMPACT" }
  | { type: "COMPLETE_ORG_IMPACT"; result: OrgImpactResult }
  | { type: "START_SYSTEM_IMPACT" }
  | { type: "COMPLETE_SYSTEM_IMPACT"; result: SystemImpactResult };

const now = () => Date.now();

export class IovImpactEscalationController {
  private state: IovImpactEscalationState;

  constructor(enabled = false) {
    this.state = {
      enabled,
      phase: "idle",
      lastPersonImpact: null,
      lastOrgImpact: null,
      lastSystemImpact: null,
      updatedAt: null,
    };
  }

  getState() {
    return this.state;
  }

  dispatch(event: IovImpactEscalationEvent) {
    const prev = this.state;

    if (!prev.enabled && event.type !== "SET_ENABLED" && event.type !== "RESET") {
      return prev;
    }

    switch (event.type) {
      case "SET_ENABLED":
        this.state = {
          ...prev,
          enabled: event.enabled,
          phase: event.enabled ? prev.phase : "idle",
          updatedAt: now(),
        };
        return this.state;

      case "RESET":
        this.state = {
          ...prev,
          phase: "idle",
          lastPersonImpact: null,
          lastOrgImpact: null,
          lastSystemImpact: null,
          updatedAt: now(),
        };
        return this.state;

      case "RECORD_PERSON_IMPACT":
        this.state = {
          ...prev,
          phase: "person_impact_done",
          lastPersonImpact: event.result,
          updatedAt: now(),
        };
        return this.state;

      case "MARK_ORG_IMPACT_PENDING":
        if (prev.phase !== "person_impact_done" || !prev.lastPersonImpact) return prev;
        this.state = {
          ...prev,
          phase: "org_impact_pending",
          updatedAt: now(),
        };
        return this.state;

      case "START_ORG_IMPACT":
        if (prev.phase !== "org_impact_pending") return prev;
        this.state = {
          ...prev,
          phase: "org_impact_running",
          updatedAt: now(),
        };
        return this.state;

      case "COMPLETE_ORG_IMPACT":
        if (prev.phase !== "org_impact_running") return prev;
        this.state = {
          ...prev,
          phase: "org_impact_done",
          lastOrgImpact: event.result,
          updatedAt: now(),
        };
        return this.state;

      case "START_SYSTEM_IMPACT":
        if (prev.phase !== "org_impact_done") return prev;
        this.state = {
          ...prev,
          phase: "system_impact_running",
          updatedAt: now(),
        };
        return this.state;

      case "COMPLETE_SYSTEM_IMPACT":
        if (prev.phase !== "system_impact_running") return prev;
        this.state = {
          ...prev,
          phase: "system_impact_done",
          lastSystemImpact: event.result,
          updatedAt: now(),
        };
        return this.state;

      default:
        return prev;
    }
  }
}
