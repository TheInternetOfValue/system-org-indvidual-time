import { describe, expect, it } from "vitest";
import {
  formatValueLogForCaption,
  getProtocolLinkId,
  getWellbecomingProtocol,
  type IovValueLogEntry,
} from "../iovTimelogs";

const createLog = (wellbecomingKey: "~WellbecomingProtocol" | "~WellbeingProtocol") =>
  ({
    id: "demo-link-1",
    timestamp: "2026-02-22T10:00:00Z",
    "~ValueCaptureProtocol": {
      "~~~~ProtocolLinkId": "demo-link-1",
      "~~TimeSlice": {
        "~~~StartTime": "2026-02-22T10:00:00Z",
        "~~~EndTime": "2026-02-22T11:00:00Z",
        "~~~Duration": 1,
      },
      "~~Activity": {
        "~~~ActivityLabel": "Protocol alignment pass",
        "~~~TaskType": "protocol-maintenance",
        "~~~Intent": "publish-ready-contract",
      },
      "~~Proof": {
        "~~~ProofOfActivity": "Build and test output",
        "~~~EvidenceLink": "proof://repo/build",
        "~~~ArtifactType": "test-log",
      },
      "~~Attribution": {
        "~~~Community": "IOV Commons",
        "~~~Project": "IOV Visualization",
        "~~~ContributorRole": "Contributor",
      },
      "~~Integrity": {
        "~~~ProofQuality": 0.9,
        "~~~AnomalyFlag": false,
        "~~~FraudRiskSignal": 0.02,
      },
    },
    [wellbecomingKey]: {
      "~~~~ProtocolLinkId": "demo-link-1",
      "~~Context": {
        "~~~PrimaryNode": "~~Performance",
        "~~~SignalLabel": "Execution quality",
        "~~~SignalScore": 0.8,
        "~~~ImpactDirection": "increase",
      },
      "~~Performance": {
        "~~~LearningOutput": 0.7,
        "~~~EarningOutput": 0.6,
        "~~~OrgBuildingOutput": 0.5,
        "~~~SkillApplication": "Systems modeling",
        "~~~CommunityContext": "IOV Commons",
      },
    },
    "~SAOcommons": {
      "~~~~ProtocolLinkId": "demo-link-1",
      "~~Activation": {
        "~~~Enabled": true,
        "~~~Trigger": "~~Performance",
        "~~~Domains": ["~~Learning"],
      },
    },
  }) as unknown as IovValueLogEntry;

describe("IoV protocol contract helpers", () => {
  it("reads the canonical Wellbecoming protocol key", () => {
    const log = createLog("~WellbecomingProtocol");
    expect(getWellbecomingProtocol(log)["~~Context"]["~~~PrimaryNode"]).toBe("~~Performance");
    expect(getProtocolLinkId(log)).toBe("demo-link-1");
  });

  it("keeps legacy WellbeingProtocol data readable", () => {
    const log = createLog("~WellbeingProtocol");
    expect(formatValueLogForCaption(log)).toContain("WB:Performance");
  });
});
