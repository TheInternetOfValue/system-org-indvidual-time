# IOV Optimization Project

## Objective
Improve perceived quality and load performance for guided demos on desktop and mobile, with strict no-regression discipline.

## Constraints
- Keep existing narrative loop intact: System -> Org -> Person -> Time Slice -> Impact -> Org -> System.
- Keep changes minimal and surgical.
- Validate after each phase (`npm test -- --run`, `npm run build`).
- Commit locally after each phase.

## Phases

### Phase 1: Runtime Safety + Frame Stability
Status: `COMPLETED`

Tasks:
- Remove unused high-frequency React state updates in pointer handling.
- Fix `ValueLogScene` dynamic line lifecycle to prevent geometry/material leaks.
- Keep behavior identical for interaction flow.

Acceptance:
- No functional UI flow changes.
- Tests/build pass.

Delivered:
- Removed unused high-frequency pointer move React state updates in `IovTopologyCanvas`.
- Removed unused region hover state writes/read paths.
- Fixed `ValueLogScene` dynamic string lifecycle by disposing prior line geometries and reusing a single line material.
- Added explicit string-group cleanup in `ValueLogScene.dispose()`.

---

### Phase 2: Load-Time and Data Fetch Efficiency
Status: `COMPLETED`

Tasks:
- Enable cache-friendly fetch behavior for static value/timelog JSON payloads.
- Add in-memory promise/result memoization to avoid repeat fetch parsing.

Acceptance:
- Same data shape and fallback behavior.
- Tests/build pass.

Delivered:
- Switched static JSON fetches from `no-store` to `force-cache` in:
  - `src/game/iov/iovValues.ts`
  - `src/game/iov/iovTimelogs.ts`
- Added in-memory memoization (`pending promise` + `resolved snapshot`) for both loaders to avoid repeated fetch/parse work within a session.
- Preserved existing fallback behavior and schema normalization.

---

### Phase 3: Time Slice + Impact Demo Quality (Targeted)
Status: `COMPLETED`

Tasks:
- Streamline Time Slice control surface to reduce duplicated UI/control paths.
- Add lightweight storytelling cues in Time Slice/Impact transitions.
- Remove avoidable per-frame allocations in Impact scene hot path.

Acceptance:
- Flow remains deterministic and demo-friendly on desktop/mobile.
- Tests/build pass.

Delivered:
- Time Slice storytelling refinements:
  - Added explicit per-step narrative messaging in center composer card.
  - Added active node/signal context and outcome deltas in center composer.
  - Reduced duplicated desktop control surface in side panel (center composer is now primary control path).
- Impact scene refinements:
  - Added impact-intensity scaling from `signalScore` and direction-sensitive photon color.
  - Removed avoidable per-frame allocations in `PersonImpactScene` hot path (reused `Color`/`Vector3` instances).
- Visual consistency:
  - Aligned region identity palette to project visual rules (market/state/community/bridge).
  - Synced panel legend and block-interior people palette with the same direction.
- Loading architecture:
  - Lazy-loaded `IovTopologyCanvas` from `App` with a lightweight loading fallback.
  - Build now emits a smaller entry chunk plus deferred scene chunk for better initial load behavior.

---

### Phase 4: Mobile Interaction Polish
Status: `COMPLETED`

Tasks:
- Increase mobile touch-target reliability for quick actions.
- Improve mobile panel/overlay spacing and safe-area behavior.
- Make Time Slice mobile controls harder to mis-trigger.

Acceptance:
- No flow changes, only interaction polish.
- Tests/build pass.

Delivered:
- Mobile control reliability:
  - Added step-aware disable states for mobile Time Slice `Prev/Next/Commit` buttons.
  - Clarified mobile back control label (`Back to Person`).
- Touch ergonomics:
  - Increased mobile quick-action button target sizes to `44px` min-height.
  - Shifted compact action grids from 4-column to 2-column layout for better thumb targeting.
  - Added tap-behavior hints (`touch-action: manipulation`, reduced tap highlight).
- Mobile layout resilience:
  - Improved bottom safe-area handling and panel scroll containment.
  - Made breadcrumb row horizontally scrollable on mobile to prevent cramped multi-line wraps.
  - Constrained scene-card size/overflow on mobile so controls remain reachable above panel.

---

### Phase 5: Contextual Panel + Mobile On-Demand Visibility
Status: `COMPLETED`

Tasks:
- Remove topology legend/value burden from non-topology scenes.
- Make panel copy explicitly contextual per semantic scene.
- Keep panel hidden by default on mobile unless requested.

Acceptance:
- Topology content remains available in topology.
- Non-topology scenes show only relevant contextual guidance.
- Mobile defaults to scene-first with opt-in panel expansion.
- Tests/build pass.

Delivered:
- Contextual panel behavior:
  - Topology-heavy blocks (legend, value stacks, transfer guidance, toggle bank, build formation) now render only in topology.
  - Non-topology scenes now show scene-specific context copy instead of Market/State/Community definitions.
  - Panel title now follows scene semantics outside topology.
- Mobile on-demand panel:
  - Added collapsed “Show context” peek state as the default mobile mode.
  - Full panel appears only when user explicitly opens it.
- Space reduction:
  - Narrower panel width profile for non-topology scenes, preserving space for 3D scene focus.

---

### Phase 6: Scene-First Topology Actions + Progressive Context Reveal
Status: `COMPLETED`

Tasks:
- Put primary topology interactions directly in the scene (not only in the left panel).
- Reduce left-panel density before first interaction, then reveal context progressively.
- Keep mobile panel strictly on-demand while preserving all controls in a secondary path.

Acceptance:
- User can discover and trigger Market/Community/State/Bridge directly from the scene.
- Topology panel stays minimal until the first meaningful interaction.
- Existing narrative loop and controls remain intact.
- Tests/build pass.

Delivered:
- In-scene topology action anchors:
  - Added floating, camera-anchored region action buttons (`Market`, `Community`, `State`, `Bridge`) in `IovTopologyCanvas`.
  - Buttons are projected from world anchors and update per-frame to remain aligned with scene regions on desktop/mobile.
- Progressive topology context:
  - Added `topologyActivated` state and wired it to first meaningful interactions (build, mode change, selection/toggle/open flow).
  - Topology panel now starts in a compact scene-first state and only reveals legend/value/control density after activation.
- Contextual value storytelling:
  - Topology value section now focuses on the currently selected region, instead of dumping all region totals at once.
  - Added bridge-specific coupled-scale readout for bridge context.
- Control preservation with less clutter:
  - Kept advanced toggles/build controls accessible under an `Advanced controls` disclosure section.
  - Kept mobile panel default collapsed/on-demand while preserving semantic quick actions once activated.

---

### Phase 7: Guided Build Sequence + Deferred Bridge Action
Status: `COMPLETED`

Tasks:
- Enforce a guided build order in topology storytelling.
- Keep bridge action hidden until prerequisite pillars are built.
- Reposition bridge scene affordance so it appears near the elevated bridge zone.

Acceptance:
- Build flow is guided as `Community -> State -> Market -> Bridge`.
- Bridge action is not visible before the first three structures are built.
- Clicking bridge lays it, then the bridge label/action disappears.
- Tests/build pass.

Delivered:
- Sequenced topology interaction:
  - Added explicit guided build sequence state in `IovTopologyCanvas`.
  - Scene build actions now reveal one-at-a-time in narrative order.
  - Out-of-order attempts are blocked with clear guidance copy.
- Bridge gating behavior:
  - Bridge scene action is now deferred until Community/State/Market are built.
  - After the bridge action is triggered, it disappears from scene controls.
- Bridge anchor placement:
  - Updated `getRegionAnchor("crony_bridge")` to use an elevated bridge-support area anchor, preventing overlap with Community.
- UX consistency updates:
  - Updated shortcut ordering and panel hint copy to match guided sequence.
  - Build controls in panel are now disabled when out-of-sequence.

---

### Phase 8: Community Identity Revert (Yellow) + Design Rule Sync
Status: `COMPLETED`

Tasks:
- Restore Community base identity color to yellow in system visuals.
- Align supporting UI accents and legend swatches with the restored identity.
- Update design-rule documentation to reflect yellow as canonical Community base color.

Acceptance:
- Topology Community region renders as yellow identity color again.
- Legend and Community-related UI accents no longer suggest green identity.
- Design rule docs are consistent with implementation.
- Tests/build pass.

Delivered:
- Restored canonical Community identity token to yellow in `IOV_IDENTITY_COLORS`.
- Updated topology panel legend Community swatch to yellow.
- Updated Community scene-action accent border color from green to yellow.
- Updated Block interior Community people tint to a yellow-family hue for consistency.
- Updated design rule docs (`AGENTS.md`, `docs/IOV_DESIGN.md`) and color rendering note text (`docs/IOV_COLOR_RENDERING.md`).

---

### Phase 9: Scene-First Interaction Refactor (Double-Click Open + Non-Blocking UI)
Status: `COMPLETED`

Tasks:
- Remove reclaim-mode controls from system-scene interaction flow.
- Make organization/person entry gesture-native via double-click.
- Replace center-blocking interaction cards with lightweight non-blocking chips/docks.

Acceptance:
- Topology: single click selects, double-click opens organization.
- Block: single click selects person, double-click opens person scene.
- Scene controls no longer obscure the core 3D subject in topology/block/person scenes.
- Tests/build pass.

Delivered:
- Topology and block gesture flow:
  - Added double-tap/double-click detection in `IovTopologyCanvas` pointer handling.
  - Topology selection now opens organization on double-click for the same selected brick.
  - Block selection now opens person on double-click for the same selected person.
- Removed reclaim-mode from active UI flow:
  - Removed inspect/reclaim controls from topology panel and in-scene topology card path.
  - Kept scene internals stable by leaving scene interaction mode in inspect.
- Non-blocking interaction overlays:
  - Replaced large center cards in topology/block/person with compact top chips and bottom action docks.
  - Preserved key actions (open org/person, identity build controls, open time slice, back navigation) without central occlusion.
- UX copy alignment:
  - Updated panel hints for click/double-click interaction contract.
  - Renamed topology metric labels from reclaim wording to neutral community uplift wording.

---

## Validation Log
- Phase 1:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 2:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 3:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated, now split entry + lazy topology chunk).
- Phase 4:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 5:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 6:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 7:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 8:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 9:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).

## Commit Log
- Phase 1: `perf: phase 1 runtime stability and ValueLog string cleanup`
- Phase 2: `perf: phase 2 cache static data loaders`
- Phase 3: `perf: phase 3 time-slice storytelling and impact polish`
- Phase 4: `perf: phase 4 mobile interaction polish`
- Phase 5: `perf: phase 5 contextual panel and mobile scene-first mode`
- Phase 6: `perf: phase 6 scene-first topology actions and progressive context`
- Phase 7: `perf: phase 7 guided topology build order and bridge gating`
- Phase 8: `fix: restore community yellow identity and sync design rules`
- Phase 9: `feat: scene-first double-click navigation and non-blocking overlays`
