import type { RegionId } from "./IovTopologyScene";
import { IOV_PROTOCOL_VOCABULARY } from "./iovProtocolVocabulary";

export type WellbeingContextNode =
  | "~~Physiology"
  | "~~Emotion"
  | "~~Feeling"
  | "~~Thought"
  | "~~Habit"
  | "~~Performance";

interface TimeSliceNode {
  "~~~StartTime": string;
  "~~~EndTime": string;
  "~~~Duration": number;
}

interface ActivityNode {
  "~~~ActivityLabel": string;
  "~~~TaskType": string;
  "~~~Intent": string;
}

interface ProofNode {
  "~~~ProofOfActivity": string;
  "~~~EvidenceLink": string;
  "~~~ArtifactType": string;
}

interface AttributionNode {
  "~~~Community": string;
  "~~~Project": string;
  "~~~ContributorRole": string;
}

interface IntegrityNode {
  "~~~ProofQuality": number;
  "~~~AnomalyFlag": boolean;
  "~~~FraudRiskSignal": number;
}

interface WellbeingContextNodeData {
  "~~~PrimaryNode": WellbeingContextNode;
  "~~~SignalLabel": string;
  "~~~SignalScore": number;
  "~~~ImpactDirection": "increase" | "decrease" | "neutral";
}

interface PerformanceNode {
  "~~~LearningOutput": number;
  "~~~EarningOutput": number;
  "~~~OrgBuildingOutput": number;
  "~~~SkillApplication": string;
  "~~~CommunityContext": string;
}

interface SaocommonsActivationNode {
  "~~~Enabled": boolean;
  "~~~Trigger": "~~Performance" | "non-performance";
  "~~~Domains": Array<"~~Learning" | "~~Earning" | "~~OrgBuilding">;
}

interface SaocommonsValidationNode {
  "~~~EvidenceReview": string;
  "~~~ReviewerSet": string;
  "~~~ValidationDecision": string;
}

interface ValueLogEngineHints {
  wellbeing_delta: number;
  aura_delta: number;
}

export interface IovValueLogEntry {
  id: string;
  timestamp: string;
  "~ValueCaptureProtocol": {
    "~~TimeSlice": TimeSliceNode;
    "~~Activity": ActivityNode;
    "~~Proof": ProofNode;
    "~~Attribution": AttributionNode;
    "~~Integrity": IntegrityNode;
  };
  "~WellbeingProtocol": {
    "~~Context": WellbeingContextNodeData;
    "~~Performance"?: PerformanceNode;
  };
  "~SAOcommons": {
    "~~Activation": SaocommonsActivationNode;
    "~~Validation"?: SaocommonsValidationNode;
  };
  "_engine"?: ValueLogEngineHints;
}

export type IovTimeLogEntry = IovValueLogEntry;

export interface IovValuelogDataset {
  version: string;
  units: string;
  notes: {
    sources: string[];
    last_updated: string | null;
  };
  profiles: Record<string, IovValueLogEntry[]>;
  overrides: Record<string, IovValueLogEntry[]>;
}

export type IovTimelogDataset = IovValuelogDataset;

export const DEFAULT_IOV_VALUELOGS: IovValuelogDataset = {
  version: "0.2.0",
  units: "value_logs",
  notes: {
    sources: [],
    last_updated: null,
  },
  profiles: {},
  overrides: {},
};

export const DEFAULT_IOV_TIMELOGS = DEFAULT_IOV_VALUELOGS;

export const loadIovValuelogs = async (): Promise<IovValuelogDataset> => {
  try {
    let response = await fetch("/data/iov_valuelogs.json", { cache: "no-store" });
    if (!response.ok) {
      response = await fetch("/data/iov_timelogs.json", { cache: "no-store" });
    }
    if (!response.ok) return DEFAULT_IOV_VALUELOGS;
    const raw = (await response.json()) as Partial<IovValuelogDataset>;
    return {
      version: raw.version ?? DEFAULT_IOV_VALUELOGS.version,
      units: raw.units ?? DEFAULT_IOV_VALUELOGS.units,
      notes: {
        sources: Array.isArray(raw.notes?.sources) ? raw.notes.sources : [],
        last_updated: raw.notes?.last_updated ?? null,
      },
      profiles: raw.profiles ?? {},
      overrides: raw.overrides ?? {},
    };
  } catch {
    return DEFAULT_IOV_VALUELOGS;
  }
};

export const loadIovTimelogs = loadIovValuelogs;

export const resolvePersonValuelogs = (
  dataset: IovValuelogDataset,
  personId: string | null,
  regionId: RegionId
) => {
  if (!personId) return generateFallbackValuelogs(regionId);
  const direct = dataset.overrides[personId];
  if (direct?.length) return direct;

  const profileKey = personId.split("-")[0] ?? "";
  const profileLogs = dataset.profiles[profileKey];
  if (profileLogs?.length) {
    return profileLogs.map((log, index) => ({
      ...log,
      id: `${personId}-${index + 1}`,
    }));
  }

  return generateFallbackValuelogs(regionId);
};

export const resolvePersonTimelogs = resolvePersonValuelogs;

const generateFallbackValuelogs = (regionId: RegionId): IovValueLogEntry[] => {
  const roleByRegion: Record<RegionId, string> = {
    market: "Trader",
    state: "Civil Servant",
    community: "Caregiver",
    crony_bridge: "Advisor",
  };
  const role = roleByRegion[regionId];
  const baseDate = new Date("2026-02-01T06:00:00Z");
  const logs: IovValueLogEntry[] = [];

  for (let i = 0; i < 5; i += 1) {
    const start = new Date(baseDate.getTime() + i * 86400000);
    const isPerformance = i % 2 === 1;
    const durationHours = isPerformance ? 2.5 : 8;
    const end = new Date(start.getTime() + durationHours * 3600000);
    const linkId = `fallback-${regionId}-${i + 1}`;

    logs.push({
      id: `${linkId}`,
      timestamp: start.toISOString(),
      "~ValueCaptureProtocol": {
        "~~TimeSlice": {
          "~~~StartTime": start.toISOString(),
          "~~~EndTime": end.toISOString(),
          "~~~Duration": durationHours,
        },
        "~~Activity": {
          "~~~ActivityLabel": isPerformance
            ? `${role} protocol delivery`
            : `${role} recovery sleep`,
          "~~~TaskType": isPerformance ? "delivery" : "sleep",
          "~~~Intent": isPerformance ? "value-creation" : "recovery",
        },
        "~~Proof": {
          "~~~ProofOfActivity": isPerformance
            ? "Submitted output artifact"
            : "Sleep score from wearable",
          "~~~EvidenceLink": `proof://${linkId}`,
          "~~~ArtifactType": isPerformance ? "output" : "sleep-metric",
        },
        "~~Attribution": {
          "~~~Community": "IOV Commons",
          "~~~Project": "System Components and Value",
          "~~~ContributorRole": role,
        },
        "~~Integrity": {
          "~~~ProofQuality": 0.72 + i * 0.03,
          "~~~AnomalyFlag": false,
          "~~~FraudRiskSignal": 0.08,
        },
      },
      "~WellbeingProtocol": {
        "~~Context": {
          "~~~PrimaryNode": isPerformance ? "~~Performance" : "~~Physiology",
          "~~~SignalLabel": isPerformance ? "Work quality" : "Sleep score",
          "~~~SignalScore": isPerformance ? 0.66 + i * 0.03 : 0.58 + i * 0.04,
          "~~~ImpactDirection": isPerformance ? "increase" : i === 0 ? "decrease" : "increase",
        },
        ...(isPerformance
          ? {
              "~~Performance": {
                "~~~LearningOutput": 0.58 + i * 0.03,
                "~~~EarningOutput": 0.46 + i * 0.04,
                "~~~OrgBuildingOutput": 0.52 + i * 0.05,
                "~~~SkillApplication": "Systems modeling",
                "~~~CommunityContext": "Collaborative delivery",
              },
            }
          : {}),
      },
      "~SAOcommons": {
        "~~Activation": {
          "~~~Enabled": isPerformance,
          "~~~Trigger": isPerformance ? "~~Performance" : "non-performance",
          "~~~Domains": isPerformance ? ["~~Learning", "~~Earning"] : [],
        },
        ...(isPerformance
          ? {
              "~~Validation": {
                "~~~EvidenceReview": "peer-reviewed",
                "~~~ReviewerSet": "3-members",
                "~~~ValidationDecision": "approved",
              },
            }
          : {}),
      },
      _engine: {
        wellbeing_delta: isPerformance ? 0.013 + i * 0.003 : i === 0 ? -0.02 : 0.008,
        aura_delta: isPerformance ? 0.022 + i * 0.004 : i === 0 ? -0.03 : 0.012,
      },
    });
  }

  return logs;
};

export const formatValueLogForCaption = (log: IovValueLogEntry | null) => {
  if (!log) return "No active value log";
  const activity = log["~ValueCaptureProtocol"]["~~Activity"]["~~~ActivityLabel"];
  const node = log["~WellbeingProtocol"]["~~Context"]["~~~PrimaryNode"].replace("~~", "");
  const score = log["~WellbeingProtocol"]["~~Context"]["~~~SignalScore"];
  const enabled = log["~SAOcommons"]["~~Activation"]["~~~Enabled"];

  return `${activity} | WB:${node}(${score.toFixed(2)}) | SAO:${enabled ? "on" : "off"}`;
};

export const formatLogForCaption = formatValueLogForCaption;

export const protocolPathsForLegend = () => [
  IOV_PROTOCOL_VOCABULARY.valueCapture.l1,
  IOV_PROTOCOL_VOCABULARY.wellbeing.l1,
  IOV_PROTOCOL_VOCABULARY.saocommons.l1,
];
