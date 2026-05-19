import type { RegionId, IovTopologyData, ToggleId } from "@/game/iov/IovTopologyScene";
import type { SaocommonsDomain, ValueLogDraft, WizardStep } from "@/game/iov/ValueLogModel";

export const buildInitialToggles = (data: IovTopologyData) =>
  data.toggles.reduce(
    (acc, toggle) => {
      acc[toggle.id] = toggle.default;
      return acc;
    },
    {} as Record<ToggleId, boolean>
  );

export interface PendingEmpowerState {
  communityPowerDelta: number;
  activationCount: number;
}

export const TOPOLOGY_REGION_ACTIONS: ReadonlyArray<{
  regionId: RegionId;
  label: string;
  cue: string;
}> = [
  { regionId: "community", label: "Community", cue: "Build pillar" },
  { regionId: "state", label: "State", cue: "Build pillar" },
  { regionId: "market", label: "Market", cue: "Build pillar" },
  { regionId: "crony_bridge", label: "Bridge", cue: "Lay bridge" },
];

export const TOPOLOGY_BUILD_SEQUENCE: ReadonlyArray<RegionId> = [
  "community",
  "state",
  "market",
  "crony_bridge",
];

export const DOUBLE_TAP_WINDOW_MS = 340;
export const OVERLAY_ANCHOR_UPDATE_INTERVAL_SECONDS = 1 / 30;
export const QUALITY_EVAL_INTERVAL_SECONDS = 2.4;

const DPR_PROFILE = {
  desktop: {
    min: 1,
    max: 1.6,
    initial: 1.25,
    step: 0.125,
    frameBudgetMs: 16.6,
  },
  mobile: {
    min: 0.9,
    max: 1.1,
    initial: 0.95,
    step: 0.1,
    frameBudgetMs: 33.3,
  },
} as const;

export const getDprProfile = (isMobile: boolean) =>
  isMobile ? DPR_PROFILE.mobile : DPR_PROFILE.desktop;

export const getRendererProfile = (isMobile: boolean) => ({
  antialias: !isMobile,
  shadowsEnabled: !isMobile,
  preloadIdleTimeoutMs: isMobile ? 2800 : 1600,
  preloadFallbackDelayMs: isMobile ? 1500 : 700,
  perfSampleCapacity: isMobile ? 90 : 180,
  perfPublishIntervalMs: isMobile ? 900 : 500,
});

export type ValueLogActionStage =
  | "time_capture"
  | "activity_capture"
  | "proof_capture"
  | "wellbeing_select"
  | "intensity_select"
  | "performance_domains"
  | "performance_intensity"
  | "ready_capture";

export const getSelectedPerformanceDomains = (draft: ValueLogDraft): SaocommonsDomain[] => {
  const domains: SaocommonsDomain[] = [];
  if (draft.learningTag) domains.push("~~Learning");
  if (draft.earningTag) domains.push("~~Earning");
  if (draft.orgBuildingTag) domains.push("~~OrgBuilding");
  return domains;
};

export const getDomainIntensityValue = (draft: ValueLogDraft, domain: SaocommonsDomain) => {
  if (domain === "~~Learning") return draft.learningIntensity;
  if (domain === "~~Earning") return draft.earningIntensity;
  return draft.orgBuildingIntensity;
};

export const toDomainIntensityPatch = (
  domain: SaocommonsDomain,
  value: number
): Partial<ValueLogDraft> => {
  if (domain === "~~Learning") return { learningIntensity: value };
  if (domain === "~~Earning") return { earningIntensity: value };
  return { orgBuildingIntensity: value };
};

export const toDomainTagPatch = (
  domain: SaocommonsDomain,
  value: boolean
): Partial<ValueLogDraft> => {
  if (domain === "~~Learning") return { learningTag: value };
  if (domain === "~~Earning") return { earningTag: value };
  return { orgBuildingTag: value };
};

export const isTimeRangeValid = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const span = end.getTime() - start.getTime();
  return span >= 5 * 60 * 1000;
};

export const mapActionStageToWizardStep = (
  stage: ValueLogActionStage,
  wellbeingNode: ValueLogDraft["wellbeingNode"]
): WizardStep => {
  if (stage === "time_capture" || stage === "activity_capture" || stage === "proof_capture") {
    return "select_time";
  }
  if (stage === "wellbeing_select") return "select_wellbeing";
  if (stage === "intensity_select") return "select_intensity";
  if (stage === "performance_domains" || stage === "performance_intensity") {
    return wellbeingNode === "~~Performance" ? "select_performance" : "select_intensity";
  }
  return "show_outcome";
};
