# IoV Topology Design Notes

## Scene Stack
- `IovTopologyScene` (`System`): macro topology, reclaim mechanics, bridge instability.
- `BlockInteriorScene` (`Organization`): people composition and person-level selection.
- `PersonIdentityScene` (`Person`): wellbeing identity layers and aura/wellbeing evolution.
- `ValueLogScene` (`Time Slice`): value action composition and outcome calculation.
- `PersonImpactScene` (`Impact`): transition FX between commit and updated person state.

Current semantic zoom chain:
- `topology -> block -> person -> valuelog -> impact -> orgimpact -> block -> topology -> systemimpact -> topology`.

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
- Time Slice interaction is centered on in-scene composer controls for desktop capture flow; panel controls are secondary/mobile-first.
- Wellbeing context helper dock (including Performance domain/intensity) anchors near the infinity center to keep interaction focal and consistent.
- Post-impact propagation:
  - impacted person activation ring in `BlockInteriorScene`.
  - org-level contagion in `BlockInteriorScene` is user-paced in org impact mode (double-click to advance each aura spread step).
  - source organization brick activation in `IovTopologyScene`.
  - system impact runs from explicit `Empower Community Pillar` action.

## System Impact Cinematic Contract (Checkpoint)
- Community uplift is built from donor bricks taken from Market/State towers.
- Donor source holes remain visible (no fake duplicate spawn).
- Community pillar build timing is intentionally staged (slower transfers, readable stack-up).
- Bridge failure timing is gated in sequence:
  - donor bricks fly from Market/State into Community pillar growth,
  - visible contact bang at bridge impact,
  - post-contact stress/shake without immediate collapse,
  - second user action (`Break Crony Bridge`) triggers collapse.
- Bridge collapse is still gated by both:
  - stress threshold crossing,
  - visible geometric contact with bridge underside.
- Community flag alignment is synchronized to the live community pillar top during/after system impact build.
- Replay of latest system impact is available from topology controls for capture/demo workflows.

## Color Rendering
- Detailed rendering diagnosis and target semantics are in `docs/IOV_COLOR_RENDERING.md`.
- Active region identity palette:
  - Market: deep blue (`#1f4c8f`)
  - State: burnt brown (`#8c4e2f`)
  - Community: yellow (`#d9b114`)
  - Bridge: graphite (`#4a4f57`)

## Mobile Interaction
- Quick-action controls are optimized for thumb use (`44px` targets and compact 2-column action grids).
- Breadcrumb navigation stays single-row and horizontally scrollable on small screens.
- Overlay cards are height-constrained with contained scrolling to keep key controls reachable above the bottom panel.
- Mobile panel defaults to an on-demand "Show context" state so the scene stays primary unless the viewer explicitly opens context.

## Contextual Panel Rules
- Topology-only panel sections: region definitions, legend, values, transfer guidance, toggle bank, build formation.
- Non-topology panel sections: concise scene-specific guidance and local controls for the active semantic level.
- Panel title follows active scene semantics outside topology to avoid repeating Market/State/Community copy in all scenes.
