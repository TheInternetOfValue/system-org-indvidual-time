import type { RegionId } from "./IovTopologyScene";

export type SemanticZoomLevel =
  | "topology"
  | "block"
  | "person"
  | "valuelog"
  | "impact"
  | "orgimpact";

export interface SemanticZoomState {
  level: SemanticZoomLevel;
  selectedRegionId: RegionId | null;
  selectedBrickId: number | null;
  selectedPersonId: string | null;
  transition: {
    from: SemanticZoomLevel;
    to: SemanticZoomLevel;
    startedAt: number;
  } | null;
}

export type SemanticZoomEvent =
  | { type: "SELECT_BRICK"; regionId: RegionId; brickId: number }
  | { type: "CLEAR_BRICK_SELECTION" }
  | { type: "OPEN_BLOCK" }
  | { type: "OPEN_PERSON"; personId: string }
  | { type: "OPEN_VALUELOG" }
  | { type: "OPEN_IMPACT" }
  | { type: "OPEN_ORG_IMPACT" }
  | { type: "NAV_BACK" }
  | { type: "SET_LEVEL"; level: SemanticZoomLevel };

const now = () => Date.now();

export class IovSemanticZoomController {
  private state: SemanticZoomState = {
    level: "topology",
    selectedRegionId: null,
    selectedBrickId: null,
    selectedPersonId: null,
    transition: null,
  };

  getState() {
    return this.state;
  }

  dispatch(event: SemanticZoomEvent) {
    const prev = this.state;

    switch (event.type) {
      case "SELECT_BRICK":
        this.state = {
          ...prev,
          selectedRegionId: event.regionId,
          selectedBrickId: event.brickId,
        };
        return this.state;

      case "CLEAR_BRICK_SELECTION":
        this.state = {
          ...prev,
          selectedRegionId: null,
          selectedBrickId: null,
        };
        return this.state;

      case "OPEN_BLOCK":
        if (prev.level !== "topology" || prev.selectedBrickId === null) return prev;
        this.state = {
          ...prev,
          level: "block",
          transition: {
            from: "topology",
            to: "block",
            startedAt: now(),
          },
        };
        return this.state;

      case "OPEN_PERSON":
        if (prev.level !== "block") return prev;
        this.state = {
          ...prev,
          level: "person",
          selectedPersonId: event.personId,
          transition: {
            from: "block",
            to: "person",
            startedAt: now(),
          },
        };
        return this.state;

      case "OPEN_VALUELOG":
        if (prev.level !== "person") return prev;
        this.state = {
          ...prev,
          level: "valuelog",
          transition: {
            from: "person",
            to: "valuelog",
            startedAt: now(),
          },
        };
        return this.state;
      
      case "OPEN_IMPACT":
        if (prev.level !== "valuelog") return prev;
        this.state = {
          ...prev,
          level: "impact",
          transition: {
            from: "valuelog",
            to: "impact",
            startedAt: now(),
          },
        };
        return this.state;

      case "OPEN_ORG_IMPACT":
        if (prev.level !== "impact") return prev;
        this.state = {
          ...prev,
          level: "orgimpact",
          transition: {
            from: "impact",
            to: "orgimpact",
            startedAt: now(),
          },
        };
        return this.state;

      case "NAV_BACK":
        if (prev.level === "orgimpact") {
          this.state = {
            ...prev,
            level: "block",
            selectedPersonId: null,
            transition: {
              from: "orgimpact",
              to: "block",
              startedAt: now(),
            },
          };
          return this.state;
        }
        if (prev.level === "impact") {
          // If in impact, back goes to person (skipping valuelog creation)
          this.state = {
            ...prev,
            level: "person",
            transition: {
                from: "impact",
                to: "person",
                startedAt: now(),
            }
          };
          return this.state;
        }
        if (prev.level === "valuelog") {
          this.state = {
            ...prev,
            level: "person",
            transition: {
              from: "valuelog",
              to: "person",
              startedAt: now(),
            },
          };
          return this.state;
        }
        if (prev.level === "person") {
          this.state = {
            ...prev,
            level: "block",
            selectedPersonId: null,
            transition: {
              from: "person",
              to: "block",
              startedAt: now(),
            },
          };
          return this.state;
        }
        if (prev.level === "block") {
          this.state = {
            ...prev,
            level: "topology",
            transition: {
              from: "block",
              to: "topology",
              startedAt: now(),
            },
          };
          return this.state;
        }
        return prev;

      case "SET_LEVEL":
        if (prev.level === event.level) return prev;
        this.state = {
          ...prev,
          level: event.level,
          transition: {
            from: prev.level,
            to: event.level,
            startedAt: now(),
          },
        };
        return this.state;

      default:
        return prev;
    }
  }
}

export const getSemanticBreadcrumb = (state: SemanticZoomState) => {
  const items: Array<{ level: SemanticZoomLevel; label: string; active: boolean }> = [
    { level: "topology", label: "System", active: state.level === "topology" },
  ];

  if (
    state.level === "block" ||
    state.level === "person" ||
    state.level === "valuelog" ||
    state.level === "impact"
  ) {
    const label =
      state.selectedBrickId !== null
        ? `Organization #${state.selectedBrickId + 1}`
        : "Organization";
    items.push({ level: "block", label, active: state.level === "block" });
  }

  if (state.level === "person" || state.level === "valuelog" || state.level === "impact") {
    items.push({
      level: "person",
      label: "Person",
      active: state.level === "person",
    });
  }

  if (state.level === "valuelog" || state.level === "impact") {
    items.push({
      level: "valuelog",
      label: "Time Slice",
      active: state.level === "valuelog",
    });
  }

  if (state.level === "impact") {
    items.push({
      level: "impact",
      label: "Impact",
      active: true,
    });
  }

  if (state.level === "orgimpact") {
    const label =
      state.selectedBrickId !== null
        ? `Organization #${state.selectedBrickId + 1}`
        : "Organization";
    items.push({ level: "block", label, active: false });
    items.push({
      level: "orgimpact",
      label: "Org Impact",
      active: true,
    });
  }

  return items;
};
