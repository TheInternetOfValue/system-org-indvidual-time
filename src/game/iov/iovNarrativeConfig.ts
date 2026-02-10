export const IOV_SCALE_CONFIG = {
  scale: "log10",
  unit: "USD_trillions",
  brickHeight: 1,
  layers: {
    community: 1,
    state: 2,
    market: 2,
    derivatives: 3,
  },
} as const;

export const IOV_BRICK_STATE_CONFIG = {
  states: ["active", "reclaimed", "in_flight", "colluding"] as const,
  visualRules: {
    identityColor: "immutable",
    stateChange: "outline_and_glow_only",
  },
} as const;

export type IovBuildPhase =
  | "empty"
  | "build_market"
  | "build_state"
  | "build_community"
  | "reveal_bridge";

export const IOV_ANIMATION_PHASES: IovBuildPhase[] = [
  "empty",
  "build_market",
  "build_state",
  "build_community",
  "reveal_bridge",
];

export const IOV_PHASE_DURATIONS: Record<IovBuildPhase, number> = {
  empty: 0.7,
  build_market: 1.2,
  build_state: 1.0,
  build_community: 1.0,
  reveal_bridge: 1.1,
};

export const IOV_IDENTITY_COLORS = {
  market: "#2f5d9b",
  state: "#8f5b35",
  community: "#5f8f67",
  bridge: "#5f6670",
} as const;
