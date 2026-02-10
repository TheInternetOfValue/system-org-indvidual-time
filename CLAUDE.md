# IoV Topology Quick Context

- Product: interactive Market/State/Community/Crony-Bridge visualization.
- Primary goal: presentation-quality readability and clear systems storytelling.
- Current phase focus: visual polish (pillar distinctness, contrast, clarity), not feature sprawl.
- Canonical project guidance: `AGENTS.md`.

## Non-negotiables
- Preserve brick identity through animation.
- Use log-scaled value mapping for economic proportions.
- Keep interaction flow staged: Market -> State -> Community -> Bridge.

## Key Files
- Scene + logic: `src/game/iov/IovTopologyScene.ts`
- Narrative + identity colors: `src/game/iov/iovNarrativeConfig.ts`
- Region metadata/toggles: `src/game/iov/iov.topology.json`
- UI controls/panel: `src/ui/IovTopologyPanel.tsx`
