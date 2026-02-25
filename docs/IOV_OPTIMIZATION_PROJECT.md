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

## Commit Log
- Phase 1: `perf: phase 1 runtime stability and ValueLog string cleanup`
- Phase 2: `perf: phase 2 cache static data loaders`
- Phase 3: `perf: phase 3 time-slice storytelling and impact polish`
- Phase 4: `perf: phase 4 mobile interaction polish`
