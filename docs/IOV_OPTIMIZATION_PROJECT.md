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

### Phase 10: Person Identity Focus Mode + Contextual Meaning Reveal
Status: `COMPLETED`

Tasks:
- Remove distracting person-level photon swirl visuals while preserving deterministic layer/facet behavior.
- Make orbit rings and facet balls directly clickable with focus fade.
- Reveal contextual meaning when a layer/facet is selected.
- Keep identity-layer progression scene-first (tap/click/double-click) without blocking overlays.

Acceptance:
- Clicking a ring or facet focuses that identity context and fades non-focused content.
- Selected context meaning is visible in-scene and in panel copy.
- Layer reveal remains deterministic and progressive in person scene.
- Tests/build pass.

Delivered:
- Person scene interaction model:
  - Added explicit person selection kind (`facet`/`layer`) and robust ring picking in `PersonIdentityScene`.
  - Improved person click routing in `IovTopologyCanvas` to support: empty-space reveal, double-click reveal, and re-tap same target reveal.
- Focus-mode rendering:
  - Added focused-layer/facet dimming so non-selected rings/facets fade while selected context remains prominent.
  - Increased ring hit thickness and reduced facet orbital speed for more reliable clicking.
- Contextual storytelling:
  - Added semantic context payload (`selectedContextTitle`, `selectedContextBody`) to person summary.
  - Surfaced selected context meaning in scene chips and person panel section.
  - Replaced outdated panel copy about center-card controls with scene-first interaction guidance.
- Visual cleanup:
  - Disabled person photon swirl meshes so identity exploration remains calm and readable.

---

### Phase 11: Time Slice Scene-First Capture Flow + Person Double-Click Entry
Status: `COMPLETED`

Tasks:
- Enable double-click person-core shortcut to open Time Slice directly from person scene.
- Make Time Slice clock hands directly movable for StartTime/EndTime capture.
- Expand Value Capture input with Activity/Proof templates and editable entries.
- Add contextual intensity step for selected wellbeing node; keep Performance-specific SAOcommons domain intensity flow.
- Ensure commit shows a quick honey/value drop before immediate impact transition.

Acceptance:
- Person scene supports double-click on core avatar to open Time Slice (without breaking layer reveal).
- Time selection can be set by dragging clock hands.
- Value Capture includes StartTime/EndTime + Activity + Proof with template-assisted defaults.
- Non-Performance contexts ask contextual intensity; Performance path exposes SAOcommons with domain intensity.
- Commit path remains deterministic and transitions to impact after drop cue.
- Tests/build pass.

Delivered:
- Person scene entry contract:
  - Added core-body raycast in `PersonIdentityScene` and exposed `core` selection kind.
  - Wired `IovTopologyCanvas` person pointer flow so double-clicking person core opens Time Slice when identity build is complete.
- Time Slice interaction upgrades:
  - Added pointer-driven clock-hand dragging (`start`/`end`) in `ValueLogScene` with minute snapping and minimum span guard.
  - Added explicit pointer interaction lifecycle (`beginPointerInteraction` / `endPointerInteraction`) and connected it in `IovTopologyCanvas` pointer handlers.
- Guided capture-step expansion:
  - Added new wizard step `select_intensity` between wellbeing selection and SAOcommons/performance branching.
  - Added contextual intensity prompts per wellbeing node.
  - Added SAOcommons domain intensity prompts/sliders for selected Learning/Earning/OrgBuilding domains.
  - Updated outcome computation to use context/domain intensity model.
- Capture templates and copy:
  - Added activity/proof template catalogs and surfaced them in panel controls.
  - Added panel controls for editable activity/proof text and contextual intensity.
  - Updated scene/panel narrative copy for the new step contract.
- Commit drop cue:
  - Added short commit-drop animation gate (`playCommitDrop`) so honey/value drop is visible immediately before impact scene transition.

---

### Phase 12: Time Slice Contract Cleanup (Single-Action UX + Robust Commit Gate)
Status: `COMPLETED`

Tasks:
- Remove center Time Slice composer complexity and keep in-scene guidance minimal.
- Move editing details to the side panel while keeping scene interactions primary.
- Enforce double-click drill behavior for clock/context/performance-domain flow.
- Unify commit readiness behind a single deterministic `canCommit` source.

Acceptance:
- No large center composer card with multi-action button clutter.
- Scene displays only one contextual action hint at a time.
- Double-click on Performance enters domain selection; double-click domain toggles selection.
- Commit enables as soon as required fields are satisfied (including performance-domain requirement).
- Tests/build pass.

Delivered:
- Time Slice overlay simplification:
  - Replaced center composer with a compact top action chip (`sceneActionHint`).
  - Added compact bottom commit dock visible only when `canCommit` is true.
- Contract-level state/readiness model:
  - Added `isValueLogCommitReady(draft)` and wired summary `canCommit` from it.
  - Added contextual `sceneActionHint` generation from current step/readiness.
  - Updated commit path to guard on `isValueLogCommitReady` and return `null` when invalid.
- Scene interaction drill flow:
  - Extended pointer selection to return selection metadata for reliable double-tap matching.
  - Implemented valuelog double-tap routing in `IovTopologyCanvas`.
  - Wired contextual double-click behavior:
    - clock/clock-hand confirms time stage transition
    - wellbeing context selects/drills
    - performance domains toggle on double-click
- Side panel cleanup:
  - Removed Time Slice `Prev/Next` controls and center-composer references.
  - Kept detailed capture/intensity/domain inputs in side panel, with commit gated by summary `canCommit`.
- Retained concise mobile quick actions (`Back to Person`, `Commit`) without step-navigation clutter.

---

### Phase 13: End-to-End Flow QA Hardening (Desktop + Mobile)
Status: `COMPLETED`

Tasks:
- Verify and harden critical scene-loop transitions under click/tap and double-click/double-tap input.
- Remove pre-emptive entry points that bypass person-layer progression.
- Stabilize Time Slice interaction feedback and readiness gating for predictable commit behavior.

Acceptance:
- Time Slice cannot be opened before person identity layers are complete.
- Double-tap behavior does not leak across semantic levels.
- Time Slice commit readiness is not "true on arrival"; it requires valid capture state.
- Tests/build pass.

Delivered:
- Person -> Time Slice gating:
  - Added hard guard in `handleOpenValueLog` to block entry until `identityBuildComplete`.
  - Disabled person-scene and person-panel Time Slice buttons until layers are complete.
- Interaction stability:
  - Reset double-tap memory (`lastSceneTapRef`) on semantic-level transitions to avoid accidental cross-scene double-tap triggers.
  - Added immediate valuelog summary/state sync after pointer selection handling to reduce UI lag after taps/double-taps.
- Commit readiness hardening:
  - Updated initial Time Slice draft defaults to require real capture before commit:
    - initial end time equals start time (invalid span until adjusted)
    - performance domains start unselected
- Added/updated tests for `isValueLogCommitReady` contract and updated SAOcommons outcome test expectations.

---

### Phase 14: Scene-Level Deferred Loading + Idle Preload
Status: `COMPLETED`

Tasks:
- Code-split non-topology scene runtimes so initial topology boot path carries less JS.
- Keep existing loop behavior unchanged while loading deferred scenes on demand.
- Add a safe preload strategy to warm deferred scene modules after first paint.

Acceptance:
- Topology scene initializes immediately without constructing every downstream scene.
- Block/Person/ValueLog/Impact scenes are loaded when needed, with no interaction regressions.
- Deferred scene modules are preloaded during idle time to reduce first-transition latency.
- Tests/build pass.

Delivered:
- Deferred scene module loader:
  - Added `src/game/iov/sceneModules.ts` with cached dynamic imports for:
    - `BlockInteriorScene`
    - `PersonIdentityScene`
    - `PersonImpactScene`
    - `ValueLogScene`
  - Added `preloadDeferredIovSceneModules()` for low-priority warm-up.
- Runtime initialization strategy:
  - `IovTopologyCanvas` now boots with `IovTopologyScene` only.
  - Secondary scenes are instantiated lazily via `ensureSecondaryScenes()` when flow requires them.
  - Added idle preload scheduling (`requestIdleCallback` fallback to timeout) to fetch deferred scene modules after initial render.
- Safety and no-regression guards:
  - Pointer/update/render paths now gracefully handle deferred scene availability.
  - Existing System -> Org -> Person -> Time Slice -> Impact loop remains intact.
- Shared lightweight Value Log model:
  - Added `src/game/iov/ValueLogModel.ts` to hold wizard/types/prompts/templates and draft/outcome helpers used by UI.
- Updated panel and canvas imports to depend on the lightweight model (avoids static scene-runtime coupling for these symbols).

---

### Phase 15: Presenter-Mode Single-Action Polish + Cinematic Spacing
Status: `COMPLETED`

Tasks:
- Make presenter mode enforce one clear next action in-scene per step.
- Reduce presenter panel density to one cue + optional fallback action.
- Tune overlay spacing for cleaner recording composition on desktop/mobile.

Acceptance:
- Presenter mode avoids multi-button action clutter in scene docks.
- Side panel in presenter mode no longer dumps full contextual data.
- Overlay spacing keeps scene subject visible while preserving guidance.
- Tests/build pass.

Delivered:
- Scene action simplification in presenter mode:
  - Topology selected-brick dock now emphasizes one primary action (`Open Organization`) and hides secondary replay button.
  - Block dock now emphasizes one primary action (`Open Person`) and hides secondary back action.
  - Person dock now becomes strictly single-action in presenter mode:
    - `Reveal Layers` -> `Next Layer` -> `Open Time Slice` (based on progression state).
  - Person contextual text and chips are shortened in presenter mode for lower visual noise.
- Presenter panel condensation:
  - Added a dedicated presenter panel path in `IovTopologyPanel` with:
    - one cue line (`presenterCue`)
    - one optional fallback action button (`presenterAction`)
    - no full legend/value/advanced-detail block
  - Updated mobile collapsed label to `Show cue` in presentation mode.
- Cinematic spacing refinements:
  - Added presenter-specific CSS for scene chips/docks/action anchors to improve framing and reduce occlusion.
- Added mobile presenter spacing adjustments for safe-area and button footprint.

---

### Phase 16: Mobile Time Slice Commit Visibility (Contextual Photon Anchor)
Status: `COMPLETED`

Tasks:
- Fix mobile cases where `Commit Time Slice` is not reliably visible when pinned to bottom overlays.
- Keep commit CTA contextual to the active Time Slice scene state.

Acceptance:
- Commit CTA is visible on mobile devices with varying viewport/safe-area/browser chrome behavior.
- CTA appears near the active photon/token context instead of relying only on bottom docking.
- Tests/build pass.

Delivered:
- Added photon-context commit anchoring:
  - Exposed token world position from `ValueLogScene` (`getTokenWorldPosition`).
  - Positioned commit dock each frame in `IovTopologyCanvas` by projecting token world position into screen space.
  - Added safe-area and viewport clamping for robust placement on narrow/short mobile screens.
- Added styling support for floating commit dock:
  - New `iov-scene-dock-commit-floating` class with mobile/presentation overrides.
  - Preserved fallback dock behavior if projection context is unavailable.

---

### Phase 17: Mobile Context-Peek Safe-Area Lift
Status: `COMPLETED`

Tasks:
- Prevent the collapsed mobile `Show context` control from being clipped by browser chrome / bottom insets.

Acceptance:
- Mobile `Show context` control remains fully visible on short viewports and toolbar-heavy browsers.
- No behavior change to panel expansion/collapse logic.
- Tests/build pass.

Delivered:
- Increased mobile collapsed peek offset in CSS:
  - `bottom: max(14px, calc(env(safe-area-inset-bottom) + 3svh));`
- Kept existing left anchor behavior to avoid disrupting scene interaction flow.

---

### Phase 18: System Empower CTA Always Visible In-Scene
Status: `COMPLETED`

Tasks:
- Make `Empower Community` directly tappable on System scene without requiring panel expansion.

Acceptance:
- When empowerment is available, CTA is visible in the scene even if mobile panel is collapsed.
- CTA remains reachable on mobile safe-area/browser-chrome layouts.
- Tests/build pass.

Delivered:
- Added floating System CTA in `IovTopologyCanvas`:
  - Renders when `semanticLevel === "topology"` and `canEmpowerCommunity === true`.
  - Calls existing `handleEmpowerCommunity` flow.
- Added `iov-system-empower-fab` styling in `index.css`:
  - Bottom-right anchored, safe-area aware, full-width action button on mobile.
  - Non-overlapping with left-anchored `Show context` control.

---

### Phase 19: System Empower CTA Contextual Community Anchor
Status: `COMPLETED`

Tasks:
- Move `Empower Community` from bottom-edge docking to contextual in-scene placement near the Community base.
- Keep CTA visible/reachable on mobile without opening `Show context`.

Acceptance:
- CTA appears at Community base context in System scene when empowerment is available.
- Placement remains stable across mobile/desktop viewport sizes and browser chrome safe areas.
- Tests/build pass.

Delivered:
- Added `getCommunityEmpowerAnchor()` in `IovTopologyScene` to expose a stable world-space anchor at Community base/front.
- Added per-frame anchor projection for `Empower Community` CTA in `IovTopologyCanvas`:
  - Projects world anchor to screen.
  - Applies viewport + mobile-safe clamping.
  - Falls back to Community region anchor if base anchor is unavailable.
- Updated `iov-system-empower-fab` styling from fixed bottom-right to projected floating placement defaults.

---

### Phase 20: Unified Mobile Safe-Viewport Overlay Clamping
Status: `COMPLETED`

Tasks:
- Replace per-element bottom/top hacks with a shared mobile-safe viewport model.
- Keep all scene overlays and panel affordances inside a consistent visible interaction zone.
- Preserve contextual anchors (photon/community) while preventing clipping under mobile browser chrome.

Acceptance:
- `Show context`, scene chips/docks, `Commit Time Slice`, and `Empower Community` remain visible across mobile viewport/chrome changes.
- Anchored CTA projection clamps against shared safe bounds.
- Tests/build pass.

Delivered:
- Added shared safe viewport plumbing in `IovTopologyCanvas`:
  - Computes safe top/right/bottom/left using `window.visualViewport` + layout viewport deltas.
  - Stores values in CSS vars on the stage (`--iov-safe-*`) and updates on resize + visual viewport scroll/resize.
  - Updates `--iov-app-height` to dynamic visible height for mobile browser chrome changes.
- Reworked anchor clamping in scene projection loops to use shared safe insets:
  - Topology action anchors.
  - Time Slice commit floating dock.
  - System empower floating dock.
- Updated global CSS to consume safe vars for layout-critical overlays:
  - Root/app height uses `--iov-app-height` fallback to `100dvh`.
  - Breadcrumb, panel, mobile peek, scene chips, and scene docks use shared safe offsets.
  - Presentation and mobile variants now inherit safe-zone positioning instead of raw fixed offsets.

---

### Phase 21: Scene-First Time Slice Causal Capture Flow
Status: `COMPLETED`

Tasks:
- Replace ambiguous Time Slice commit-only overlay with a strict one-action-at-a-time scene flow.
- Keep interactions in-scene (photon-context dock), not dependent on side-panel sequencing.
- Support contextual progression: time -> activity -> proof -> wellbeing -> intensity -> SAOcommons (for Performance) -> capture.

Acceptance:
- Time Slice flow is understandable on first pass with one primary action visible per stage.
- Performance node selection opens SAOcommons domain handling in-scene, including domain intensity tuning.
- Final CTA uses `Capture Value` language and preserves existing impact drop transition.
- Tests/build pass.

Delivered:
- Added explicit scene action-stage contract in `IovTopologyCanvas`:
  - `time_capture -> activity_capture -> proof_capture -> wellbeing_select -> intensity_select|performance_domains -> performance_intensity -> ready_capture`.
  - Stage-to-scene-step mapping keeps `ValueLogScene` visuals deterministic while allowing richer sequencing.
- Added contextual floating Time Slice dock (anchored near photon) with stage-specific controls:
  - Time confirmation from clock.
  - Activity/proof templates plus editable text capture.
  - Wellbeing intensity controls for non-performance contexts.
  - SAOcommons domain selection and per-domain intensity controls for performance context.
  - Final CTA renamed to `Capture Value`.
- Removed fragile auto-step jumps in `ValueLogScene.selectFromPointer`:
  - Pointer selection now updates meaningfully without forced hidden progression.
  - Domain selection toggles on direct interaction, improving mobile reliability.
- Updated ValueLog scene hint copy and panel CTA wording to align with the new capture narrative.

---

### Phase 22: Person-Centered Impact Continuity (Photon -> Human -> Aura)
Status: `COMPLETED`

Tasks:
- Remove disjoint "bottom ocean" outcome clutter from Time Slice commit handoff.
- Redesign Impact scene so the human remains visually present during photon impact.
- Show identity propagation clearly: head/core hit -> rings expand -> IdentityState ring glow -> aura formation.

Acceptance:
- Commit handoff feels continuous into the person, not a separate abstract scene.
- Impact scene includes visible human core and identity ring system.
- IdentityState ring reads as the final energized layer before transition to org/system.
- Tests/build pass.

Delivered:
- Time Slice handoff cleanup in `ValueLogScene`:
  - Removed bottom-oriented outcome clutter from the visible commit state (no bottom bars/labels/aura bands shown).
  - Changed commit token motion to stay near center for a tighter visual handoff into impact.
  - Disabled in-scene ripple/ocean effect during commit handoff.
- Impact continuity redesign in `PersonImpactScene`:
  - Added visible human core (torso/head/base) styled consistently with Person scene.
  - Added concentric identity rings around the person (using protocol layer colors).
  - Changed photon trajectory to land on the head/core target.
  - Added impact flash and outward ring propagation wave.
  - Added sustained IdentityState ring glow and aura-band emergence to represent aura formation.
  - Added responsive camera framing and explicit `dispose()` cleanup.
- Narrative copy update:
  - Updated impact phase headline in `IovTopologyCanvas` to describe photon landing in the person's identity core.

---

### Phase 23: Impact Timing Cadence Polish (Handoff + Contact + Glow Hold)
Status: `COMPLETED`

Tasks:
- Refine pacing between Time Slice commit and Impact to improve readability of causal beats.
- Add a brief "photon contact" moment at the person core before ripple expansion.
- Smooth final glow hold so identity/aura formation is legible before scene transition.

Acceptance:
- Commit handoff no longer feels abrupt.
- Head/core impact beat is visible before rings propagate.
- Final ring/aura state has enough dwell time to be understood before returning to org/system.
- Tests/build pass.

Delivered:
- Updated Time Slice handoff timing in `IovTopologyCanvas`:
  - Increased `playCommitDrop` duration (`390ms` desktop, `340ms` mobile) for cleaner handoff pacing.
- Updated Impact animation cadence in `PersonImpactScene`:
  - Added `headContactDuration` phase between drop and ripple.
  - Tuned drop/ripple/completion timing constants for clearer visual storytelling.
  - Adjusted flash timing to align with contact -> propagation sequence.
- Updated impact headline copy to match the new cadence language (`rings and aura light up`).

---

### Phase 24: Interaction Reliability Fine-Tuning (Identity Tooltip + Dock Collision Fixes)
Status: `COMPLETED`

Tasks:
- Add in-scene facet tooltip feedback in Person identity view.
- Remove unintended persistent GivenIdentity visual prominence while navigating later layers.
- Keep Time Slice confirm action reliably clickable during time selection.
- Prevent performance-stage guide dock from covering Learning/Earning/OrgBuilding targets.

Acceptance:
- Hovering a facet shows an in-scene tooltip near the hovered orb.
- Prior identity layers no longer visually "blink" as active when later layers are in focus.
- Time-selection action dock stays stable and easy to click.
- Performance-stage action dock avoids SAOcommons domain overlap.
- Tests/build pass.

Delivered:
- `PersonIdentityScene`:
  - Added dynamic in-scene facet tooltip sprite (title + contextual facet hint) anchored near hovered facet.
  - Updated tooltip lifecycle to hide on pointer leave/non-facet hover and track camera-facing orientation.
  - Adjusted ring/facet emphasis logic during staged identity build so prior layers are de-emphasized.
  - Removed steady-state rule that always surfaced the first layer label.
- `ValueLogScene`:
  - Tuned time-stage photon orbit to stay closer to the clock center and avoid wide excursions.
- `IovTopologyCanvas`:
  - Added stage-aware action dock anchoring for Value Log:
    - `time_capture`: fixed stable top position (no chasing photon).
    - `performance_domains`/`performance_intensity`: top-right safe placement to avoid SAOcommons node overlap.
    - other stages retain contextual token anchoring.

---

### Phase 25: Visual Hierarchy Scale Pass (Org Framing + Time Slice UI Weight)
Status: `COMPLETED`

Tasks:
- Pull back org interior and org-impact framing so full scenes are visible on mobile and desktop.
- Add subtle in-scene org wall context label (org type + number) for orientation.
- Reduce identity facet tooltip footprint.
- Remove oversized Time Slice scene label and reduce Value Log action-card visual weight.
- Fix oversized mobile Value Log buttons caused by shared dock flex rules.
- Keep commit CTA contextual to the photon while moving other step overlays to non-blocking positions.

Acceptance:
- Org interior reads as a full room, not cropped close-up.
- Org-impact crowd is framed with better vertical balance.
- Facet tooltip is readable but no longer scene-dominant.
- Value Log cards/buttons are compact, and no giant blue action blocks appear.
- Performance-stage action card no longer blocks SAOcommons interactions.
- Tests/build pass.

Delivered:
- `BlockInteriorScene`:
  - Reframed default/mobile camera and target for a wider organization overview.
  - Added dynamic wall label sprite showing selected org label + `Organization Interior`.
- `OrgImpactScene`:
  - Pulled camera back and increased framing distance/FOV for cleaner group visibility.
- `PersonIdentityScene`:
  - Added viewport-aware tooltip sizing and positioning.
  - Reduced tooltip canvas/sprite scale and copy length for tighter hierarchy.
- `ValueLogScene`:
  - Removed in-scene `Time Slice Clock` title sprite.
  - Retuned step camera presets to reduce over-zoom in wellbeing/performance/outcome stages.
- `IovTopologyCanvas` + `index.css`:
  - Reworked Value Log dock anchoring:
    - `ready_capture` remains photon-contextual.
    - other stages use safer top anchors, with performance cards moved left/top to avoid domain overlap.
  - Reduced dock/card widths, fonts, spacing, and button sizing.
  - Scoped mobile `flex: 1 1 140px` button rule away from Value Log dock to stop tall oversized buttons.

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
- Phase 10:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 11:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 12:
  - `npm test -- --run` passed (3 files, 7 tests).
  - `npm run build` passed (production bundle generated).
- Phase 13:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production bundle generated).
- Phase 14:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated with deferred scene chunks).
- Phase 15:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 16:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 17:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 18:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 19:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 20:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 21:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 22:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 23:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 24:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).
- Phase 25:
  - `npm test -- --run` passed (3 files, 8 tests).
  - `npm run build` passed (production build generated).

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
- Phase 10: `feat: phase 10 person focus fade and contextual identity reveal`
- Phase 11: `feat: phase 11 time-slice clock interaction and contextual intensity flow`
- Phase 12: `feat: phase 12 time-slice single-action contract and commit gating`
- Phase 13: `fix: phase 13 end-to-end flow hardening for time-slice entry and commit readiness`
- Phase 14: `perf: phase 14 deferred scene loading and idle preload`
- Phase 15: `style: phase 15 presenter-mode single-action polish and cinematic spacing`
- Phase 16: `fix: phase 16 anchor commit CTA near photon on mobile`
- Phase 17: `fix: phase 17 lift mobile show-context peek above browser chrome`
- Phase 18: `fix: phase 18 show empower community CTA in-system without opening panel`
- Phase 19: `fix: phase 19 anchor empower community CTA near community base`
- Phase 20: `fix: phase 20 unify mobile safe viewport overlay clamping`
- Phase 21: `feat: phase 21 scene-first time-slice causal capture flow`
- Phase 22: `feat: phase 22 person-centered impact continuity and aura propagation`
- Phase 23: `style: phase 23 impact timing cadence polish`
- Phase 24: `fix: phase 24 interaction reliability and overlay placement tuning`
- Phase 25: `style: phase 25 visual hierarchy scale pass for org and valuelog scenes`
