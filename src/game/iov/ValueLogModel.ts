import type { WellbeingContextNode } from "./iovTimelogs";

export type SaocommonsDomain = "~~Learning" | "~~Earning" | "~~OrgBuilding";

export type WizardStep =
  | "select_time"
  | "select_wellbeing"
  | "select_intensity"
  | "select_performance"
  | "show_outcome";

export const WIZARD_STEP_ORDER: WizardStep[] = [
  "select_time",
  "select_wellbeing",
  "select_intensity",
  "select_performance",
  "show_outcome",
];

export interface ValueCaptureActivityTemplate {
  id: string;
  label: string;
  activityLabel: string;
  taskType: string;
  intent: string;
}

export interface ValueCaptureProofTemplate {
  id: string;
  label: string;
  proofOfActivity: string;
  artifactType: string;
  evidenceLink: string;
}

export const VALUE_CAPTURE_ACTIVITY_TEMPLATES: ReadonlyArray<ValueCaptureActivityTemplate> = [
  {
    id: "deep-work",
    label: "Deep Work Sprint",
    activityLabel: "Focused deep-work sprint",
    taskType: "focused-execution",
    intent: "ship-meaningful-progress",
  },
  {
    id: "learning-block",
    label: "Learning Block",
    activityLabel: "Skill learning and synthesis block",
    taskType: "learning",
    intent: "build-capability",
  },
  {
    id: "team-sync",
    label: "Team Alignment",
    activityLabel: "Team alignment and decision sync",
    taskType: "coordination",
    intent: "reduce-friction",
  },
  {
    id: "recovery",
    label: "Recovery Reset",
    activityLabel: "Recovery reset and energy restoration",
    taskType: "recovery",
    intent: "restore-wellbeing",
  },
];

export const VALUE_CAPTURE_PROOF_TEMPLATES: ReadonlyArray<ValueCaptureProofTemplate> = [
  {
    id: "commit-proof",
    label: "Commit + Artifact",
    proofOfActivity: "Code commit with artifact snapshot",
    artifactType: "commit-log",
    evidenceLink: "proof://repo/commit",
  },
  {
    id: "note-proof",
    label: "Meeting Notes",
    proofOfActivity: "Meeting notes with decisions and actions",
    artifactType: "meeting-notes",
    evidenceLink: "proof://docs/notes",
  },
  {
    id: "metric-proof",
    label: "Metric Screenshot",
    proofOfActivity: "Metric screenshot tied to action",
    artifactType: "metric-capture",
    evidenceLink: "proof://metrics/snapshot",
  },
  {
    id: "journal-proof",
    label: "Reflection Journal",
    proofOfActivity: "Short reflection log of activity outcome",
    artifactType: "reflection-log",
    evidenceLink: "proof://journal/entry",
  },
];

export const WELLBEING_INTENSITY_PROMPTS: Record<WellbeingContextNode, string> = {
  "~~Physiology":
    "How strongly did this timeslice improve or drain your body baseline (sleep, nutrition, movement)?",
  "~~Emotion":
    "How intense was the emotional shift caused by this action?",
  "~~Feeling":
    "How strongly did your felt state move after this action?",
  "~~Thought":
    "How much cognitive clarity or overload did this action create?",
  "~~Habit":
    "Was this part of a healthy habit streak, and how strongly did it reinforce the habit?",
  "~~Performance":
    "How strongly did this action advance real performance outcomes?",
};

export const SAOCOMMONS_DOMAIN_PROMPTS: Record<SaocommonsDomain, string> = {
  "~~Learning": "Learning intensity: how much capability growth happened?",
  "~~Earning": "Earning intensity: how much value capture moved forward?",
  "~~OrgBuilding": "Org building intensity: how much durable system capacity improved?",
};

export interface ValueLogDraft {
  startTime: string;
  endTime: string;
  activityLabel: string;
  activityTemplateId: string;
  taskType: string;
  intent: string;
  proofOfActivity: string;
  proofTemplateId: string;
  evidenceLink: string;
  artifactType: string;
  community: string;
  project: string;
  contributorRole: string;
  proofQuality: number;
  anomalyFlag: boolean;
  fraudRiskSignal: number;
  wellbeingNode: WellbeingContextNode;
  signalLabel: string;
  signalScore: number;
  contextIntensity: number;
  impactDirection: "increase" | "decrease" | "neutral";
  skillApplication: string;
  communityContext: string;
  learningTag: boolean;
  earningTag: boolean;
  orgBuildingTag: boolean;
  learningIntensity: number;
  earningIntensity: number;
  orgBuildingIntensity: number;
}

export interface ValueLogOutcome {
  wellbeingDelta: number;
  auraDelta: number;
  identityStateDelta: number;
  saocommonsEnabled: boolean;
  saocommonsDomains: SaocommonsDomain[];
}

export interface ValueLogSummary {
  step: WizardStep;
  stepIndex: number;
  stepLabel: string;
  draft: ValueLogDraft;
  outcome: ValueLogOutcome;
  committedCount: number;
  canCommit: boolean;
  sceneActionHint: string;
  timeCapturePhase?: "start" | "end";
}

export const createInitialValueLogDraft = (): ValueLogDraft => {
  const now = new Date();
  const end = new Date(now.getTime());
  const activityTemplate = VALUE_CAPTURE_ACTIVITY_TEMPLATES[0];
  const proofTemplate = VALUE_CAPTURE_PROOF_TEMPLATES[0];
  return {
    startTime: toLocalInputValue(now),
    endTime: toLocalInputValue(end),
    activityLabel: activityTemplate?.activityLabel ?? "Focused deep-work sprint",
    activityTemplateId: activityTemplate?.id ?? "deep-work",
    taskType: activityTemplate?.taskType ?? "focused-execution",
    intent: activityTemplate?.intent ?? "ship-meaningful-progress",
    proofOfActivity: proofTemplate?.proofOfActivity ?? "Code commit with artifact snapshot",
    proofTemplateId: proofTemplate?.id ?? "commit-proof",
    evidenceLink: proofTemplate?.evidenceLink ?? "proof://repo/commit",
    artifactType: proofTemplate?.artifactType ?? "commit-log",
    community: "GrowthFlow Engineering",
    project: "IOV Visualization",
    contributorRole: "Contributor",
    proofQuality: 0.82,
    anomalyFlag: false,
    fraudRiskSignal: 0.04,
    wellbeingNode: "~~Performance",
    signalLabel: "Performance execution quality",
    signalScore: 0.68,
    contextIntensity: 0.68,
    impactDirection: "increase",
    skillApplication: "Business Growth",
    communityContext: "GrowthFlow Engineering",
    learningTag: false,
    earningTag: false,
    orgBuildingTag: false,
    learningIntensity: 0.64,
    earningIntensity: 0.62,
    orgBuildingIntensity: 0.58,
  };
};

export const computeValueLogOutcome = (draft: ValueLogDraft): ValueLogOutcome => {
  const contextIntensity = clamp(0, 1, draft.contextIntensity);
  const saocommonsEnabled = draft.wellbeingNode === "~~Performance";
  const domains: SaocommonsDomain[] = [];
  const selectedDomainIntensities: number[] = [];
  if (saocommonsEnabled) {
    if (draft.learningTag) {
      domains.push("~~Learning");
      selectedDomainIntensities.push(clamp(0, 1, draft.learningIntensity));
    }
    if (draft.earningTag) {
      domains.push("~~Earning");
      selectedDomainIntensities.push(clamp(0, 1, draft.earningIntensity));
    }
    if (draft.orgBuildingTag) {
      domains.push("~~OrgBuilding");
      selectedDomainIntensities.push(clamp(0, 1, draft.orgBuildingIntensity));
    }
  }

  const domainAverage =
    selectedDomainIntensities.length > 0
      ? selectedDomainIntensities.reduce((sum, value) => sum + value, 0) /
        selectedDomainIntensities.length
      : contextIntensity;
  const effectiveSignal = saocommonsEnabled
    ? clamp(0, 1, contextIntensity * 0.45 + domainAverage * 0.55)
    : contextIntensity;

  let base = (effectiveSignal - 0.5) * 0.08;
  if (draft.impactDirection === "increase") {
    base = Math.abs(base) + 0.004;
  } else if (draft.impactDirection === "decrease") {
    base = -Math.abs(base) - 0.01;
  } else {
    base *= 0.2;
  }

  const domainBonus = saocommonsEnabled
    ? selectedDomainIntensities.reduce((sum, value) => sum + (value - 0.5) * 0.01, 0)
    : 0;
  const wellbeingDelta = clamp(-0.08, 0.09, base + domainBonus);
  const auraDelta = clamp(-0.11, 0.13, wellbeingDelta * 1.65);
  const identityStateDelta = clamp(-0.1, 0.11, wellbeingDelta * 1.24);

  return {
    wellbeingDelta,
    auraDelta,
    identityStateDelta,
    saocommonsEnabled,
    saocommonsDomains: domains,
  };
};

export const isValueLogCommitReady = (draft: ValueLogDraft) => {
  const hasValueCapture =
    isValidTimeRange(draft.startTime, draft.endTime) &&
    draft.activityLabel.trim().length > 0 &&
    draft.proofOfActivity.trim().length > 0;
  if (!hasValueCapture) return false;

  if (draft.wellbeingNode !== "~~Performance") {
    return draft.contextIntensity >= 0;
  }

  return draft.learningTag || draft.earningTag || draft.orgBuildingTag;
};

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const minutesFromLocalInput = (value: string) => {
  const date = value.length > 0 ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return date.getHours() * 60 + date.getMinutes();
};

const isValidTimeRange = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return end.getTime() - start.getTime() >= 5 * 60 * 1000;
};
