# IOV Performance Refactor Taskboard

## Objective
Make the game lighter (runtime, memory, and bundle/load) while preserving all existing scenes and interactions.

## Constraints
- Preserve all scene transitions and interactions exactly.
- Make minimal, surgical refactors.
- Keep deterministic behavior and avoid unnecessary per-frame allocations.

## Phases
- [x] Phase 0: Baseline metrics + taskboard setup
- [x] Phase 1: Runtime instrumentation (frame, draw calls, memory)
- [x] Phase 2: Render-loop and UI anchor optimization in canvas orchestrator
- [x] Phase 3: Scene hot-path optimization (allocation and timing churn)
- [x] Phase 4: Quality profile and adaptive renderer controls
- [x] Phase 5: Bundle/load optimization and deferred heavy imports
- [x] Phase 6: Verification (tests/build) + final metrics report

## Baseline Metrics
- Build duration: `3.25s` wall clock (`npm run build`)
- Initial bundle size: `932K dist` total; largest chunk `IovTopologyCanvas` `652.44 kB` (`166.49 kB gzip`)
- Test status: `8/8 passing` (`3/3` test files)
- Runtime metrics (dev overlay): _pending_

## Post-Refactor Metrics
- Build duration: `2.97s` wall clock (`~8.6%` faster)
- Bundle layout:
  - App orchestration chunk (`IovTopologyCanvas`) down from `652.44 kB` to `136.64 kB` (`~79%` reduction)
  - Vendor split introduced (`vendor-three`, `vendor-react`, `vendor`) for better caching and parse isolation
- Dist size: `940K` (slightly higher total due to additional split/runtime chunks, but significantly improved primary app chunk)
- Test status: `8/8 passing` (`3/3` test files)
- Runtime metrics: live dev overlay now available (scene, fps, avg/p95 frame ms, draw calls, triangles, renderer memory, heap if supported)

## Change Log
- Initialized taskboard.
- Captured baseline build/test/bundle metrics before refactor work.
- Phase 1 complete: Added `IovPerformanceMonitor` with dev overlay for fps/frame-time/draw-calls/renderer memory and optional JS heap.
- Phase 2 complete: Throttled overlay-anchor updates to 30Hz with semantic-level/stage change forcing to reduce per-frame DOM churn.
- Phase 3 complete: Reduced hot-path allocation churn in topology/block/value scenes (anchor/vector caching and consolidated timing usage).
- Phase 4 complete: Added adaptive DPR quality loop with mobile/desktop frame budgets and bounded quality ramps.
- Phase 5 complete: Deferred post-processing imports behind runtime gate and split vendor chunks via Vite manual chunk config.
- Phase 6 complete: Verified with `npm run build` and `npm run test -- --run`; all checks passing.

## Follow-up UX Iteration (Time Slice Clarity)
- [x] Move `time_capture` range feedback dock from top-center to contextual anchor near the active drag handle.
- [x] Replace spherical start/end handles with knife-style slice markers.
- [x] Remove duplicate top range text during `time_capture` to reduce cognitive load.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Single-Day Guided Time Slice)
- [x] Enforce one day-window behavior (remove wrap-across-midnight range rendering).
- [x] Convert `time_capture` into guided two-phase flow: `Start` (backward from now) -> `End` (between start and now).
- [x] Keep future section visually locked (dim mask after current-time marker) to prevent forward-time confusion.
- [x] Update dock copy and action labels to explicitly guide `Step 1/2` and `Step 2/2`.
- [x] Align test fixtures with same-day non-wrap validity rules.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Visual Clarity Pass)
- [x] Replace current-time sphere with a vertical beacon marker and subtle footprint glow.
- [x] Pin date label to stream origin (left side) and separate moving `Now` readout from date context.
- [x] Add major 24h scale ticks (`00`, `06`, `12`, `18`, `24`) on the stream.
- [x] Add dual invalid-zone masks: future segment + pre-start segment in end-selection phase.
- [x] Add in-stream range summary chip (`duration + start-end`) near selected slice.
- [x] Reduce panel cognitive load during `time_capture` by collapsing nonessential form controls.
- [x] Keep photon token hidden during `select_time`; reveal in later layers.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Scene-by-Scene Narrative Consistency Pass)
- [x] Add explicit `From -> Now -> Next` story-link line in panel for every semantic level.
- [x] Align scene chip titles in System/Org/Person/Time Slice with forward narrative transitions.
- [x] Make panel primary action stage-driven (single active step), including Time Slice stage CTA labels.
- [x] Update panel to stay contextual during `activity_capture` and `proof_capture` (no stale controls).
- [x] Reduce topology panel action clutter to one primary next action at a time.
- [x] Add reusable project QA checklist: `docs/IOV_SCENE_VET_RULES.md`.

## Follow-up UX Iteration (Time Slice Mobile Clarity Pass)
- [x] Enforce one active slice blade per phase (`Lock Start` then `Lock End`) to keep one action visible.
- [x] Keep the `time_capture` dock fixed at the mobile bottom safe area (no floating card over the stream).
- [x] Reset Time Slice entry flow to `Step 1 / Lock Start` on open (no stale `Lock End` re-entry from prior draft).
- [x] Reframe `time_capture` copy to explicit drag constraints (`Start <- Now`, then `End between Start and Now`).
- [x] Remove misleading early duration feedback by hiding range-summary label during start lock and on mobile.
- [x] Tighten mobile time camera framing around the active focus (`Now` on step 1, selected range on step 2).
- [x] Reposition mobile `Now` readout/marker to a bottom-anchored reference cue (clear timeline origin).
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant A: Lighthouse + Lock Gates Pass)
- [x] Replace cone slicers with flat gate-blade handles for clearer boundary semantics.
- [x] Keep `NOW` as a bottom-origin reference beam/well (non-draggable) distinct from editable gates.
- [x] Keep `Start 00:00 · <date>` always visible as left-day origin anchor.
- [x] Reframe Time Slice step copy around `Start gate` and `End gate` interactions.
- [x] Remove side-panel duplicate CTA during `time_capture` (scene remains single-source action).
- [x] Tighten select-time camera framing on desktop/mobile so the stream occupies the center interaction band.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant B: Caliper Slice Pass)
- [x] Replace bulky gate blocks with slim caliper slicers (thin vertical rails + compact jaws).
- [x] Convert `NOW` marker to a thin light slice with additive pulse (non-solid visual cue).
- [x] Keep interaction hit-zones aligned with caliper handles/jaws for reliable drag behavior.
- [x] Move `Now` readout below the stream to reduce top-overlay clutter and improve scan order.
- [x] Tune select-time camera framing to center the stream band on both desktop and mobile.
- [x] Align all `time_capture` copy to caliper language (`Start caliper`, `End caliper`, `Lock Start/End Slice`).
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant C: Blade Caliper + Mobile Clarity Pass)
- [x] Shift caliper handles to opposing blade silhouettes (top-down and bottom-up) to better communicate "slice."
- [x] Make `NOW` a single vertical seam cue and de-emphasize extra marker clutter.
- [x] Keep only active blade pair visible per phase (`Start` pair in step 1, `End` pair in step 2).
- [x] Center select-time camera on active focus (`NOW` in step 1, selected range midpoint in step 2) for desktop and mobile.
- [x] Suppress mobile side-panel peek/expand controls during `time_capture` to enforce one primary action path.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant D: Day Ribbon + Slice Blades Pass)
- [x] Reframe `time_capture` around a `day ribbon` contract instead of explicit caliper language.
- [x] Recast `NOW` as a single seam-plus-glow marker embedded in the ribbon, with the readout placed below it.
- [x] Replace `Start 00:00` wording with `Today · <date>` so day origin and chosen start no longer conflict.
- [x] Keep the locked Start blade visible during end selection while limiting interaction to the active End blade.
- [x] Attach the slice summary chip directly above the selected band so duration/start-end feedback lives in-scene.
- [x] Tighten time-capture camera framing and dock anchor placement so the active interaction stays central on desktop and mobile.
- [x] Align canvas/panel copy to `Mark When It Began` / `Mark When It Ended` and `Lock Start` / `Lock End`.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant E: Incision Cue Reset)
- [x] Remove visible standing caliper/pole interaction dependency and replace it with embedded incision markers on the day ribbon.
- [x] Introduce invisible drag hit-zones so interaction remains reliable without chunky visible hardware.
- [x] Shorten Start/End visual markers into seam-like cuts and keep the locked Start incision visible during end placement.
- [x] Replace the lingering lower gold rod effect by confining the `NOW` seam to the ribbon interaction band.
- [x] Add a transient angled blade sweep that appears only while a slice boundary is actively hovered/dragged.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant F: Ribbon Scale + Live Now Readout)
- [x] Replace the sparse ribbon scale with a richer day ruler: major 3-hour marks plus lighter 30-minute ticks.
- [x] Add local 5-minute snap guides around the active boundary during hover/drag so precision lives in the scene.
- [x] Convert `NOW` into a live digital seam cue with a small ticking `HH:MM:SS` readout instead of relying on a detached large label.
- [x] Reformat the in-scene slice summary into a compact digital chip (`start -> end · duration`) attached above the selected band.
- [x] Keep the transient angled slice cue as the only visible "tool" during interaction and leave resting state hardware-free.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant G: Precision Timeline Pivot)
- [x] Replace the lingering 3D post read with screen-facing trim-marker glyphs for Begin/End so boundaries read as timeline cuts instead of poles.
- [x] Add a dedicated timeline backdrop and flatten the ribbon stack so `time_capture` reads like a foreground instrument, not a prop on a stage.
- [x] Tighten the select-time camera and FOV so the active interval dominates the viewport on desktop and mobile.
- [x] Pull the floating time-capture dock closer to the active selection instead of leaving it detached above the scene.
- [x] Collapse the left panel into a compact time-capture cue card so the ribbon remains the primary object during interval selection.
- [x] Align timeline copy from `Start/End blade` language to `Begin/End cut` semantics.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).

## Follow-up UX Iteration (Variant H: Precision Timeline Finishing Pass)
- [x] Shorten Begin/End cut glyphs and reduce bloom so they read as precise trim markers rather than glowing brackets.
- [x] Make the gold `NOW` seam thinner and attach a smaller explicit `Now HH:MM:SS` label just below the ribbon.
- [x] Strengthen the local 5-minute snap ruler around the active boundary relative to the global hour scale.
- [x] Pull the floating `Lock Start/Lock End` dock closer to the active selection for stronger context binding.
- [x] Reduce the left Time Slice panel to a minimal cue card during `time_capture`.
- [x] Re-verify with build/test (`npm run build`, `npm run test -- --run`).
