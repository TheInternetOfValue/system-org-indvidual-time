import { describe, expect, it } from "vitest";
import { IovSemanticZoomController } from "../IovSemanticZoomController";

describe("IovSemanticZoomController org impact routing", () => {
  it("transitions impact -> orgimpact -> block", () => {
    const controller = new IovSemanticZoomController();
    controller.dispatch({ type: "SELECT_BRICK", regionId: "market", brickId: 2 });
    controller.dispatch({ type: "OPEN_BLOCK" });
    controller.dispatch({ type: "OPEN_PERSON", personId: "Person-7" });
    controller.dispatch({ type: "OPEN_VALUELOG" });
    controller.dispatch({ type: "OPEN_IMPACT" });

    const inImpact = controller.getState();
    expect(inImpact.level).toBe("impact");

    controller.dispatch({ type: "OPEN_ORG_IMPACT" });
    const inOrgImpact = controller.getState();
    expect(inOrgImpact.level).toBe("orgimpact");

    controller.dispatch({ type: "NAV_BACK" });
    const backToBlock = controller.getState();
    expect(backToBlock.level).toBe("block");
    expect(backToBlock.selectedPersonId).toBeNull();
  });

  it("transitions orgimpact -> systemimpact -> topology", () => {
    const controller = new IovSemanticZoomController();
    controller.dispatch({ type: "SELECT_BRICK", regionId: "community", brickId: 1 });
    controller.dispatch({ type: "OPEN_BLOCK" });
    controller.dispatch({ type: "OPEN_PERSON", personId: "Person-3" });
    controller.dispatch({ type: "OPEN_VALUELOG" });
    controller.dispatch({ type: "OPEN_IMPACT" });
    controller.dispatch({ type: "OPEN_ORG_IMPACT" });
    controller.dispatch({ type: "OPEN_SYSTEM_IMPACT" });

    const inSystemImpact = controller.getState();
    expect(inSystemImpact.level).toBe("systemimpact");

    controller.dispatch({ type: "NAV_BACK" });
    const backToSystem = controller.getState();
    expect(backToSystem.level).toBe("topology");
    expect(backToSystem.selectedPersonId).toBeNull();
  });
});
