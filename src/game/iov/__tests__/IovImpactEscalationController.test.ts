import { describe, expect, it } from "vitest";
import { IOV_FEATURE_FLAGS } from "../iovNarrativeConfig";
import { IovImpactEscalationController } from "../iovImpactEscalation";

describe("IOV feature flags", () => {
  it("keeps impact escalation disabled by default", () => {
    expect(IOV_FEATURE_FLAGS.enableImpactEscalation).toBe(false);
  });
});

describe("IovImpactEscalationController", () => {
  it("is no-op while disabled", () => {
    const controller = new IovImpactEscalationController(false);
    controller.dispatch({
      type: "RECORD_PERSON_IMPACT",
      result: {
        personId: "Person-1",
        sourceRegionId: "market",
        sourceBrickId: 3,
        auraDelta: 0.04,
        timestamp: 1,
      },
    });

    const state = controller.getState();
    expect(state.phase).toBe("idle");
    expect(state.lastPersonImpact).toBeNull();
  });

  it("progresses through person -> org -> system phases when enabled", () => {
    const controller = new IovImpactEscalationController(true);

    controller.dispatch({
      type: "RECORD_PERSON_IMPACT",
      result: {
        personId: "Person-2",
        sourceRegionId: "state",
        sourceBrickId: 5,
        auraDelta: 0.07,
        timestamp: 2,
      },
    });
    expect(controller.getState().phase).toBe("person_impact_done");

    controller.dispatch({ type: "MARK_ORG_IMPACT_PENDING" });
    controller.dispatch({ type: "START_ORG_IMPACT" });
    controller.dispatch({
      type: "COMPLETE_ORG_IMPACT",
      result: {
        regionId: "state",
        brickId: 5,
        activatedPeopleCount: 12,
        populationCount: 12,
        contagionComplete: true,
        orgRadiance: 1,
        communityPowerDelta: 0.25,
      },
    });
    expect(controller.getState().phase).toBe("org_impact_done");

    controller.dispatch({ type: "START_SYSTEM_IMPACT" });
    controller.dispatch({
      type: "COMPLETE_SYSTEM_IMPACT",
      result: {
        communityPillarHeightBefore: 4.2,
        communityPillarHeightAfter: 4.8,
        bridgeStressBefore: 0.64,
        bridgeStressAfter: 0.91,
        bridgeCollapsed: true,
      },
    });

    const finalState = controller.getState();
    expect(finalState.phase).toBe("system_impact_done");
    expect(finalState.lastSystemImpact?.bridgeCollapsed).toBe(true);
  });
});
