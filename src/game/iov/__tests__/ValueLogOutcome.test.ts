import { describe, expect, it } from "vitest";
import {
  computeValueLogOutcome,
  createInitialValueLogDraft,
} from "../ValueLogScene";

describe("computeValueLogOutcome", () => {
  it("enables SAOcommons only for Performance context", () => {
    const performanceDraft = createInitialValueLogDraft();
    const performanceOutcome = computeValueLogOutcome(performanceDraft);
    expect(performanceOutcome.saocommonsEnabled).toBe(true);
    expect(performanceOutcome.saocommonsDomains).toEqual([
      "~~Learning",
      "~~Earning",
    ]);

    const nonPerformanceDraft = {
      ...performanceDraft,
      wellbeingNode: "~~Emotion" as const,
      learningTag: true,
      earningTag: true,
      orgBuildingTag: true,
    };
    const nonPerformanceOutcome = computeValueLogOutcome(nonPerformanceDraft);
    expect(nonPerformanceOutcome.saocommonsEnabled).toBe(false);
    expect(nonPerformanceOutcome.saocommonsDomains).toEqual([]);
  });

  it("produces negative deltas for decreasing impact direction", () => {
    const draft = {
      ...createInitialValueLogDraft(),
      wellbeingNode: "~~Emotion" as const,
      impactDirection: "decrease" as const,
      signalScore: 0.9,
      learningTag: false,
      earningTag: false,
      orgBuildingTag: false,
    };

    const outcome = computeValueLogOutcome(draft);
    expect(outcome.wellbeingDelta).toBeLessThan(0);
    expect(outcome.auraDelta).toBeLessThan(0);
    expect(outcome.identityStateDelta).toBeLessThan(0);
  });
});
