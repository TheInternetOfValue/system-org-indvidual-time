# IoV Topology Design Notes

## Scene Stack
- `IovTopologyScene` (`System`): macro topology, reclaim mechanics, bridge instability.
- `BlockInteriorScene` (`Organization`): people composition and person-level selection.
- `PersonIdentityScene` (`Person`): wellbeing identity layers and aura/wellbeing evolution.
- `ValueLogScene` (`Time Slice`): value action composition and outcome calculation.
- `PersonImpactScene` (`Impact`): transition FX between commit and updated person state.

Current semantic zoom chain:
- `topology -> block -> person -> valuelog -> impact`.

## Coordinate System
- All structures use one shared world coordinate space and one shared baseplate.
- Ground reference is `GROUND_Y`; first brick centers sit at `GROUND_Y + BRICK_H / 2`.
- Market, Community, and State anchors are fixed on the same plane (`TOPOLOGY_Z`) with x anchors from `IOV_TOPOLOGY_CONFIG.layout`.
- Community slot targets are computed in world space from the same baseplate reference to avoid floating offsets during reclaim animation.

## Scale Mapping
- Value-to-height uses logarithmic scaling in `mapValueToLayers`:
  - `layers = log10(value + 1) * logScaleMultiplier * extraScale`
  - clamped by a minimum layer count.
- Values come from `public/data/iov_values.json` through `src/game/iov/iovValues.ts`.
- Null values render as `TBD` in the panel and use topology defaults.

## Top-Cap and Bridge Anchors
- Market and State mark top-cap bricks (`isTopCap`) as top ~1% layers.
- Bridge endpoints derive from top-cap centers, so the bridge stays top-to-top.
- Bridge supports and crony markers share the same world origin and reveal with the bridge phase.

## Motion Semantics
- Staged build phases are defined in `src/game/iov/iovNarrativeConfig.ts`:
  - `empty` -> `build_market` -> `build_state` -> `build_community` -> `reveal_bridge`.
- Reclaim animation preserves original brick color in flight.
- State change feedback uses pulse/outline effects instead of recoloring brick identity.
- Value commit flow uses explicit transition FX:
  - `ValueLogScene.commit(...)` -> `PersonImpactScene.playImpact(...)` -> return to `PersonIdentityScene`.
- Post-impact propagation:
  - impacted person activation ring in `BlockInteriorScene`.
  - source organization brick activation in `IovTopologyScene`.
  - bridge collapse trigger available once reclaim pressure crosses threshold.

## Color Rendering
- Detailed rendering diagnosis and target semantics are in `docs/IOV_COLOR_RENDERING.md`.
