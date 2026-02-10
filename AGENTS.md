# Project: Internet of Value Topology (React + Three.js)

## Product Goal
- Build a presentable, interactive systems-visualization of Market / State / Community value topology.
- Show structure, concentration, and interlock dynamics through animation, not static charts.

## Design Philosophy (Canonical)
- Log-scaled growth keeps extreme economic differences readable.
- Physics-inspired motion encodes accumulation and structural behavior.
- Brick identity is preserved through state changes (no recolor identity drift).
- Bridge animation reveals elite/top-layer interlock dynamics.
- Goal: make structure visible, not just display numbers.

## Current Priority (Presentation First)
- Improve visual readability and distinctness of regions.
- Ensure Market / State / Community / Bridge are clearly differentiable in color and silhouette.
- Keep interactions smooth and understandable for demos.
- Do not over-complicate feature scope until presentation quality is stable.

## Tech Stack
- React 18 + TypeScript + Vite
- Three.js for rendering
- Vitest for tests

## Core Files
- `src/components/IovTopologyCanvas.tsx`: Three renderer setup, loop, events, UI wiring
- `src/game/iov/IovTopologyScene.ts`: scene generation, build phases, interactions, stress behavior
- `src/game/iov/iovNarrativeConfig.ts`: identity colors, phase ordering, scale config
- `src/game/iov/iov.topology.json`: region metadata, palettes, toggles
- `src/game/iov/iovValues.ts`: values schema + loader (`public/data/iov_values.json`)
- `src/ui/IovTopologyPanel.tsx`: controls, values panel, formation actions
- `src/index.css`: global UI styling
- `docs/IOV_DESIGN.md`: architecture/coordinate/motion notes

## Interaction Flow (Target)
1. Empty world baseline
2. Build Market
3. Build State
4. Build Community
5. Reveal Crony Bridge

## Visual Rules
- Region base colors:
  - Market: deep blue
  - State: burnt brown
  - Community: muted green
  - Bridge: graphite
- Top-layer/capture cues can use gold accents.
- State transitions should be indicated by glow/outline/pulse before any recolor logic.

## Data & Scale Rules
- Values source: `public/data/iov_values.json`
- Scale mapping in scene: log-based layer mapping (`log10(value + 1)` with clamps)
- Null values should render as `TBD` in UI.

## Engineering Rules
- Make minimal, surgical changes.
- Keep CSS global in `src/index.css` (no CSS modules).
- Favor data-driven mechanics and toggle behavior.
- Preserve deterministic behavior where possible (avoid unnecessary per-frame allocations).

## Skills Usage
- `skills/gameplay-mechanics/SKILL.md`: mechanics/stress toggles and action->effect clarity
- `skills/game-design-theory/SKILL.md`: phase flow, challenge/comprehension tuning
- `skills/optimization-performance/SKILL.md`: FPS/draw-call/perf guardrails
- `skills/audio-systems/SKILL.md`: optional SFX/music pipeline
- `skills/asset-optimization/SKILL.md`: textures/assets pipeline tuning

## Handoff Notes For Other Agents
- This repo is no longer a sliding puzzle implementation focus; prioritize IoV topology work.
- If asked for quick wins, choose presentation/readability improvements first.
- Keep design philosophy text and visual identity consistent with this file and `docs/IOV_DESIGN.md`.
