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
Status: `IN_PROGRESS`

Tasks:
- Enable cache-friendly fetch behavior for static value/timelog JSON payloads.
- Add in-memory promise/result memoization to avoid repeat fetch parsing.

Acceptance:
- Same data shape and fallback behavior.
- Tests/build pass.

---

### Phase 3: Time Slice + Impact Demo Quality (Targeted)
Status: `PENDING`

Tasks:
- Streamline Time Slice control surface to reduce duplicated UI/control paths.
- Add lightweight storytelling cues in Time Slice/Impact transitions.
- Remove avoidable per-frame allocations in Impact scene hot path.

Acceptance:
- Flow remains deterministic and demo-friendly on desktop/mobile.
- Tests/build pass.

---

## Validation Log
- Phase 1:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).

## Commit Log
- Phase 1: pending local commit.
