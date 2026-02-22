import type { RegionId } from "./IovTopologyScene";
import { IOV_PROTOCOL_VOCABULARY } from "./iovProtocolVocabulary";

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

interface PerformanceNode {
  "~~~LearningOutput": number;
  "~~~EarningOutput": number;
  "~~~OrgBuildingOutput": number;
  "~~~SkillApplication": string;
  "~~~CommunityContext": string;
}

interface SaocommonsValidationNode {
  "~~~EvidenceReview": string;
  "~~~ReviewerSet": string;
  "~~~ValidationDecision": string;
}

interface TimeLogEngineHints {
  wellbeing_delta: number;
  aura_delta: number;
}

export interface IovTimeLogEntry {
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
    "~~Performance": PerformanceNode;
  };
  "~SAOcommons": {
    "~~Validation": SaocommonsValidationNode;
  };
  "_engine"?: TimeLogEngineHints;
}

export interface IovTimelogDataset {
  version: string;
  units: string;
  notes: {
    sources: string[];
    last_updated: string | null;
  };
  profiles: Record<string, IovTimeLogEntry[]>;
  overrides: Record<string, IovTimeLogEntry[]>;
}

export const DEFAULT_IOV_TIMELOGS: IovTimelogDataset = {
  version: "0.1.0",
  units: "daily_logs",
  notes: {
    sources: [],
    last_updated: null,
  },
  profiles: {},
  overrides: {},
};

export const loadIovTimelogs = async (): Promise<IovTimelogDataset> => {
  try {
    const response = await fetch("/data/iov_timelogs.json", { cache: "no-store" });
    if (!response.ok) return DEFAULT_IOV_TIMELOGS;
    const raw = (await response.json()) as Partial<IovTimelogDataset>;
    return {
      version: raw.version ?? DEFAULT_IOV_TIMELOGS.version,
      units: raw.units ?? DEFAULT_IOV_TIMELOGS.units,
      notes: {
        sources: Array.isArray(raw.notes?.sources) ? raw.notes.sources : [],
        last_updated: raw.notes?.last_updated ?? null,
      },
      profiles: raw.profiles ?? {},
      overrides: raw.overrides ?? {},
    };
  } catch {
    return DEFAULT_IOV_TIMELOGS;
  }
};

export const resolvePersonTimelogs = (
  dataset: IovTimelogDataset,
  personId: string | null,
  regionId: RegionId
) => {
  if (!personId) return generateFallbackTimelogs(regionId);
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

  return generateFallbackTimelogs(regionId);
};

const generateFallbackTimelogs = (regionId: RegionId): IovTimeLogEntry[] => {
  const roleByRegion: Record<RegionId, string> = {
    market: "Trader",
    state: "Civil Servant",
    community: "Caregiver",
    crony_bridge: "Advisor",
  };
  const role = roleByRegion[regionId];
  const baseDate = new Date("2026-02-01T08:00:00Z");
  const logs: IovTimeLogEntry[] = [];

  for (let i = 0; i < 5; i += 1) {
    const start = new Date(baseDate.getTime() + i * 86400000);
    const end = new Date(start.getTime() + 2 * 3600000);
    const linkId = `fallback-${regionId}-${i + 1}`;
    logs.push({
      id: `${linkId}`,
      timestamp: start.toISOString(),
      "~ValueCaptureProtocol": {
        "~~TimeSlice": {
          "~~~StartTime": start.toISOString(),
          "~~~EndTime": end.toISOString(),
          "~~~Duration": 2,
        },
        "~~Activity": {
          "~~~ActivityLabel": `${role} contribution`,
          "~~~TaskType": "daily-log",
          "~~~Intent": "value-creation",
        },
        "~~Proof": {
          "~~~ProofOfActivity": "Submitted validated work log",
          "~~~EvidenceLink": `proof://${linkId}`,
          "~~~ArtifactType": "worklog",
        },
        "~~Attribution": {
          "~~~Community": "IOV Commons",
          "~~~Project": "System Components and Value",
          "~~~ContributorRole": role,
        },
        "~~Integrity": {
          "~~~ProofQuality": 0.72 + i * 0.04,
          "~~~AnomalyFlag": false,
          "~~~FraudRiskSignal": 0.08,
        },
      },
      "~WellbeingProtocol": {
        "~~Performance": {
          "~~~LearningOutput": 0.58 + i * 0.03,
          "~~~EarningOutput": 0.46 + i * 0.04,
          "~~~OrgBuildingOutput": 0.52 + i * 0.05,
          "~~~SkillApplication": "Protocol modeling",
          "~~~CommunityContext": "Collaborative delivery",
        },
      },
      "~SAOcommons": {
        "~~Validation": {
          "~~~EvidenceReview": "peer-reviewed",
          "~~~ReviewerSet": "3-members",
          "~~~ValidationDecision": "approved",
        },
      },
      _engine: {
        wellbeing_delta: 0.012 + i * 0.003,
        aura_delta: 0.02 + i * 0.004,
      },
    });
  }

  return logs;
};

export const formatLogForCaption = (log: IovTimeLogEntry | null) => {
  if (!log) return "No active log";
  const activity = log["~ValueCaptureProtocol"]["~~Activity"]["~~~ActivityLabel"];
  const learning = log["~WellbeingProtocol"]["~~Performance"]["~~~LearningOutput"];
  const earning = log["~WellbeingProtocol"]["~~Performance"]["~~~EarningOutput"];
  const org = log["~WellbeingProtocol"]["~~Performance"]["~~~OrgBuildingOutput"];

  return `${activity} | L:${learning.toFixed(2)} E:${earning.toFixed(2)} O:${org.toFixed(2)}`;
};

export const protocolPathsForLegend = () => [
  IOV_PROTOCOL_VOCABULARY.valueCapture.l1,
  IOV_PROTOCOL_VOCABULARY.wellbeing.l1,
  IOV_PROTOCOL_VOCABULARY.saocommons.l1,
];
