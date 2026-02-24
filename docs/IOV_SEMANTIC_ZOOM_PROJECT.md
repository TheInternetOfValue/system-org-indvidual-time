# IoV Semantic Zoom Project (Living Document)

Handoff companion:
- `docs/LLM_HANDOFF_CONTEXT.md` (plain-language transfer brief for next LLM, including known UX failures and required next-pass contract)

## Purpose
Build the next narrative layer of the Internet of Value experience through semantic zoom:

1. `System` level: Market / State / Community / Crony Bridge.
2. `Brick` level: each institution brick is composed of people.
3. `Person` level: each person contains identity layers.
4. `Time Slice` level: compose a value action.
5. `Impact` level: visualize causal drop/ripple before state return.

Core message: institutions are abstractions made from people, people are structured by identity, and identity evolves through daily logged behavior.

## Current Runtime Snapshot
- Active scene host: `src/components/IovTopologyCanvas.tsx`
- Active semantic chain: `topology -> block -> person -> valuelog -> impact`
- Active scenes:
  - `src/game/iov/IovTopologyScene.ts` (System)
  - `src/game/iov/BlockInteriorScene.ts` (Organization)
  - `src/game/iov/PersonIdentityScene.ts` (Person)
  - `src/game/iov/ValueLogScene.ts` (Time Slice)
  - `src/game/iov/PersonImpactScene.ts` (Impact transition)
- Legacy note: old puzzle scene `src/game/GameScene.ts` has been removed from this repo.

Narrative chain:
1. `System`: Market / State / Community / Bridge.
2. `Brick`: organizations composed of people.
3. `Person`: stable identity layers (slow-changing profile structure).
4. `Breathing Layer`: daily protocol logs that update wellbeing state/aura over time.
5. `Impact`: post-commit transition that makes state change legible.

## Impact Escalation Contract (Next Pass)
Goal: make impact progression explicit and modular across three scenes:
`Person Impact -> Org Impact -> System Impact`.

### Scene A: Person Impact (`impact`, existing)
Purpose:
- Show causal event from committed Time Slice to one person state change.

Input:
- `selectedPersonId`
- committed `IovValueLogEntry`
- computed `ValueLogOutcome` (`wellbeingDelta`, `auraDelta`, `identityStateDelta`)
- source org context (`selectedRegionId`, `selectedBrickId`)

Behavior:
- photon drop and ripple visualization.
- returns control to person context after animation.

Output:
- `PersonImpactResult`:
  - `personId`
  - `sourceRegionId`
  - `sourceBrickId`
  - `auraDelta`
  - `timestamp`

### Scene B: Org Impact (`orgimpact`, new)
Purpose:
- Show contagion from one impacted person to the full organization.

Input:
- `PersonImpactResult`
- block population snapshot (`personIds`, positions, profile mix)
- deterministic contagion config (`spreadIntervalMs`, `spreadBatchSize`, `motionGainCurve`)

Behavior:
- impacted person starts with aura.
- aura spreads person-to-person in timed waves.
- people motion transitions from mostly static to active.
- once contagion completes, org brick transitions to radiant state.

Output:
- `OrgImpactResult`:
  - `regionId`
  - `brickId`
  - `activatedPeopleCount`
  - `populationCount`
  - `contagionComplete`
  - `orgRadiance` (0..1)
  - `communityPowerDelta` (derived from full-org activation quality)

### Scene C: System Impact (`systemimpact`, new)
Purpose:
- Convert org activation into macro-level Community growth and bridge pressure.

Input:
- `OrgImpactResult`
- current macro state (`communityPillarHeight`, `communityPower`, `bridgeStress`, `bridgeResistance`)
- source alignment context (Market/State/Community origin)

Behavior:
- applies `communityPowerDelta` into Community pillar growth.
- animates Community pillar height increase (not just brick count changes).
- maps increased Community pillar to bridge collision/stress.
- collapses bridge when stress/resistance condition is met.

Output:
- `SystemImpactResult`:
  - `communityPillarHeightBefore`
  - `communityPillarHeightAfter`
  - `bridgeStressBefore`
  - `bridgeStressAfter`
  - `bridgeCollapsed`

Important rule:
- bridge collapse trigger must not be raw reclaim count (`transferredCount > N`).
- bridge collapse must be driven by accumulated Community pillar growth and resulting bridge stress.

## Modular Execution Plan (Safe Rollout)
Implementation should be merged in isolated passes with docs updated at each pass.

### Pass 1: Contracts + State Model (no visual overhaul)
Deliverables:
- Add typed contracts for `PersonImpactResult`, `OrgImpactResult`, `SystemImpactResult`.
- Add shared impact state store (or controller slice) for deterministic progression.
- Add feature flag (`enableImpactEscalation`) defaulting to `false`.

Done when:
- app behavior unchanged with flag off.
- contract tests compile and pass.

Pass 1 progress (implemented):
- Added impact contract/controller module: `src/game/iov/iovImpactEscalation.ts`.
- Added feature flag in `src/game/iov/iovNarrativeConfig.ts`:
  - initially landed as `false` for safe rollout.
- Wired no-op-safe integration in `src/components/IovTopologyCanvas.tsx`:
  - when flag is `false`, existing runtime path is unchanged.
  - when enabled later, person impact results are recorded and marked for org impact pending.
- Added tests:
  - `src/game/iov/__tests__/IovImpactEscalationController.test.ts`
  - verifies default flag state and controller phase progression.

### Pass 2: Org Impact Scene
Deliverables:
- add `OrgImpactScene` module.
- wire transition `impact -> orgimpact -> block`.
- implement aura contagion, progressive activation, and movement gain.
- emit `OrgImpactResult`.

Done when:
- one impacted person can activate full org in deterministic waves.
- org brick reaches radiant state only after contagion complete.

Pass 2 progress (implemented):
- Added `src/game/iov/OrgImpactScene.ts` with deterministic contagion waves:
  - one impacted person seeds activation
  - activation spreads in timed batches
  - motion amplitude increases as people activate
  - org brick glow ramps with activation ratio
- Extended semantic routing:
  - `IovSemanticZoomController` now supports `OPEN_ORG_IMPACT` and `level="orgimpact"`.
  - `NAV_BACK` from `orgimpact` returns to `block`.
- Wired `IovTopologyCanvas` transition flow:
  - post-person-impact flow can enter `impact -> orgimpact`.
  - `OrgImpactScene` completion emits and records `OrgImpactResult`.
- Added routing test:
  - `src/game/iov/__tests__/IovSemanticZoomController.test.ts`

### Pass 3: System Impact Scene
Deliverables:
- add `SystemImpactScene` module.
- wire transition `orgimpact -> systemimpact -> topology`.
- implement Community pillar growth animation from `communityPowerDelta`.
- replace bridge collapse logic with stress/resistance model.

Done when:
- Community pillar visibly grows from org outcomes.
- bridge collapse occurs from stress model, not transfer count.

Pass 3 progress (implemented):
- Added `src/game/iov/SystemImpactScene.ts`:
  - grows community pillar from `communityPowerDelta`
  - propagates photon from community pillar to bridge
  - applies bridge stress progression and collapse threshold
  - emits `SystemImpactResult`
- Extended semantic routing:
  - `IovSemanticZoomController` now supports `OPEN_SYSTEM_IMPACT` and `level="systemimpact"`.
  - `NAV_BACK` from `systemimpact` returns to `topology`.
- Wired `IovTopologyCanvas` escalation chain:
  - `impact -> orgimpact -> systemimpact -> topology`
  - records and persists macro stress state (`communityPillarHeight`, `bridgeStress`)
  - triggers topology `shatterBridge()` only when system stress result crosses threshold.
- Disabled legacy transfer-count bridge collapse while escalation flag is enabled.
- Escalation feature flag is now enabled for demo flow:
  - `IOV_FEATURE_FLAGS.enableImpactEscalation = true`.

### Pass 4: Cleanup + Migration
Deliverables:
- remove deprecated transfer-count collapse path.
- tune timings, camera framing, mobile safe controls.
- update all docs and handoff notes.

Done when:
- old fallback logic removed.
- narrative chain is consistent across panel text, scenes, and docs.

## Documentation Protocol For Each Pass
For every pass above, update in the same commit:
1. `docs/IOV_SEMANTIC_ZOOM_PROJECT.md`
2. `docs/LLM_HANDOFF_CONTEXT.md`
3. `README.md` (scene inventory/flow if changed)
4. Change Log + Decision Log entries with date and rationale

## Scope
- In scope:
  - Current multi-level scene flow (`topology -> block -> person -> valuelog -> impact`)
  - Planned impact escalation flow (`impact -> orgimpact -> systemimpact -> topology`)
  - Smooth transitions and clear back-navigation
  - Data-driven person/identity modeling
  - Mobile-safe interaction patterns
- Out of scope (for now):
  - Full body anatomy simulation
  - Real-time networking/multi-user
  - Photoreal human rendering

## Constraints
- Preserve current IoV topology interactions and panel logic.
- Keep performance stable (instancing, LOD, lazy loading).
- Keep behavior deterministic for demos (seeded generation).

## Architecture Plan
- Keep one route/canvas, split rendering into scene modules:
  - `IovTopologyScene` (existing)
  - `BlockInteriorScene` (new)
  - `PersonIdentityScene` (new)
  - `ValueLogScene` (new)
  - `PersonImpactScene` (new)
  - `OrgImpactScene` (planned)
  - `SystemImpactScene` (planned)
- Introduce a scene controller:
  - File target: `src/game/iov/IovSemanticZoomController.ts`
  - Current state shape:
    - `level: "topology" | "block" | "person" | "valuelog" | "impact"`
    - `selectedRegionId`
    - `selectedBrickId`
    - `selectedPersonId`
  - Planned extension:
    - `level` adds `"orgimpact" | "systemimpact"`
    - `impactState` carries typed outputs across scenes (`PersonImpactResult -> OrgImpactResult -> SystemImpactResult`)
- Add breadcrumb UI:
  - `Topology > Brick > Person`
  - Back actions from each deep level.
- Keep person-level composition split into two state bands:
  - `Identity Band` (slow-changing): GivenIdentity, EarnedIdentity, RentedIdentity, MoralCompass, Story, Skills, IdentityState, ConsentAndDisclosure.
  - `ValueLog Band` (fast-changing): `~ValueCaptureProtocol -> ~WellbeingProtocol -> ~SAOcommons` entries replayed as a timeline.

## Delivery Phases

### Phase 0: Interaction Contract (Spec)
Status: `completed`
- Define entry triggers:
  - Topology -> Brick (click + optional zoom threshold)
  - Brick -> Person
- Define exit/back behavior.
- Define per-level tooltips/panel copy.
- Define mobile gesture mapping.

#### Phase 0 Contract (v0.1 locked)

#### Level Definitions
- `topology`: existing Market/State/Community/Bridge structure.
- `block`: interior view for one selected brick, showing people composition.
- `person`: identity view for one selected person from block level.

#### Transition Triggers
- `topology -> block`:
  - Desktop: user selects a valid brick and either double-clicks or presses `Enter`.
  - Mobile: user taps a valid brick, then taps `Open Brick` CTA in the panel.
  - Guard: ignore during camera drag (`pointer travel > 6px`) and while transfer animation is active.
- `block -> person`:
  - Desktop: click person token.
  - Mobile: tap person token.
  - Guard: ignore while block-level transition is in progress.

#### Exit / Back Contract
- `person -> block`: breadcrumb tap or `Esc`.
- `block -> topology`: breadcrumb tap or `Esc`.
- Always preserve previous camera state per level (return to prior framing on back).

#### Zoom/Distance Guardrails
- Use level entry by explicit selection intent, not pure zoom threshold, to avoid accidental deep navigation.
- Optional helper rule: only show `Open Brick` CTA when camera distance is inside brick-legibility band (`minDistance <= d <= preferredEntryDistance`).

#### UI Contract Per Level
- Topology panel:
  - keeps current values, toggles, and build actions.
  - adds conditional `Open Brick` CTA after selecting a valid brick.
- Block panel:
  - shows `Region`, `Brick ID`, `People count`, `Profile mix`.
  - shows `Open Person` hint on hover/select.
- Person panel:
  - shows `Person ID`, `identity layers`, and a short interpretation note.

#### Mobile Contract
- Keep current bottom-sheet behavior:
  - collapsed by default
  - primary actions visible in collapsed state.
- Mobile deep-level actions:
  - `Open Brick` and `Back` always visible as primary buttons.
  - no hover dependency; all interactions must be tap-first.
- Disable deep-level activation during pinch gesture.

#### Event Contract (Controller API Draft)
- `SELECT_BRICK` `{ regionId, brickId }`
- `OPEN_BLOCK` `{ regionId, brickId }`
- `SELECT_PERSON` `{ personId }`
- `OPEN_PERSON` `{ personId }`
- `NAV_BACK` `{}`
- `SET_LEVEL` `{ level }`
- `TRANSITION_START` `{ from, to }`
- `TRANSITION_END` `{ level }`

### Phase 1: Scene Router Skeleton
Status: `completed`
- Add controller + level state.
- Keep current topology as default level.
- Add scene switching with transition (fade or dolly).
- Add breadcrumb shell UI.

#### Phase 1 Output (implemented)
- Added semantic zoom controller scaffold:
  - `src/game/iov/IovSemanticZoomController.ts`
  - state/events for `topology`, `block`, `person`
- Wired topology brick selection into controller state:
  - scene now emits selected brick metadata
  - `Open Brick` CTA is gated by selected-brick eligibility
- Added breadcrumb shell + back navigation in overlay UI.
- Added block/person scaffold overlays to prove routing flow while preserving existing topology interactions.

### Phase 2: Brick Interior Scene
Status: `completed`
- Implement block interior with instanced person tokens.
- Add person hover/select.
- Add person count and category summary in panel.

#### Phase 2 Output (implemented)
- Added real block interior module:
  - `src/game/iov/BlockInteriorScene.ts`
  - instanced person tokens (body/head) generated by selected source brick region
- Added block-level interaction:
  - person hover marker
  - person selection marker
  - person tooltip + selected person ID flow
- Wired scene switching:
  - topology renders at `level=topology`
  - block interior renders at `level=block|person`
- Panel now shows block-level summary:
  - selected brick label
  - people count
  - profile mix
  - hovered/selected person IDs

#### Phase 2 Refinement (interaction clarity)
- Added explicit brick click modes in topology:
  - `Inspect` mode: click selects brick (for semantic zoom entry)
  - `Reclaim` mode: click transfers eligible top bricks into Community
- Exposed mode controls in panel and mobile collapsed row.
- Mobile now shows `Open Brick` in collapsed state (no expand required).
- Replaced proxy cylinder-only people with stylized humanoid assemblies
  (torso, pelvis, arms, legs, head) for stronger “people” readability.

### Phase 3: Person Identity Scene
Status: `completed`
- Implement identity layers around a selected person.
- Add label system for identity dimensions.
- Add back navigation to brick level.

#### Phase 3 Output (implemented)
- Added full person identity scene:
  - `src/game/iov/PersonIdentityScene.ts`
  - concentric orbit rings + aura pulses + rotating facet nodes
- Wired semantic rendering split:
  - `level=person` now renders `PersonIdentityScene` (not block scaffold)
- Added person-level hover/select feedback:
  - facet tooltip
  - panel summary for hovered/selected facet and layer
- Added protocol vocabulary source module:
  - `src/game/iov/wellbeingIdentityProtocol.ts`
  - layer/facet terms mirrored from the canonical wellbeing-identity protocol in
    `the-internet-of-value-spec` (`specs/protocols/wellbeing-identity/*.md`).

#### Phase 3 Progress (identity build pass)
- Added progressive identity construction controls:
  - `Start Identity Build`
  - `Next Identity`
  - `Replay Layer`
- Person scene now supports staged reveal:
  - one identity layer at a time
  - facet tokens drop from above in staggered sequence per layer
  - future layers stay hidden until advanced
- Person level now enters with staged build active by default (no full identity autoload).
- Primary identity-build controls are in the in-scene semantic card (game area).

### Phase 4: Data Model + Loader
Status: `in_progress`
- Add `public/data/iov_people.json`.
- Map region -> brick archetype -> people profiles.
- Map person profile -> identity attributes.
- Add schema/type guards + fallback behavior.
- Add deterministic linkage:
  - selected person -> resolved protocol ValueLog stream
  - ValueLog replay -> wellbeing delta -> aura delta

#### Phase 4 Progress (current pass)
- Added canonical protocol vocabulary module for evolution layer:
  - `src/game/iov/iovProtocolVocabulary.ts`
  - mirrors `~ValueCaptureProtocol`, `~WellbeingProtocol`, `~SAOcommons` from spec lock.
- Added timeline data source:
  - `public/data/iov_valuelogs.json` (preferred) with fallback to `public/data/iov_timelogs.json`.
  - uses canonical protocol keys with profile-level logs and person override (`Trader-13`).
- Added timeline loader + resolver:
  - `src/game/iov/iovTimelogs.ts`
  - resolves by exact person ID, then profile prefix, then deterministic fallback.
- Added person state evolution engine:
  - `src/game/iov/PersonStateEngine.ts`
  - computes wellbeing score, deltas, aura strength from daily logs.
- Wired person scene evolution:
  - `PersonIdentityScene` now runs timeline playback and drives aura + yellow timeline ring/dot.
  - panel now displays score/delta/log progress in person mode.
- Clarified semantic contract:
  - identity layers are treated as mostly stable attributes.
  - daily logs are treated as the changing layer that drives `IdentityState` evolution.

### Phase 5: Performance + Mobile Hardening
Status: `in_progress`
- Lazy load deep scenes.
- Add LOD caps for person counts.
- Ensure mobile controls are readable and non-blocking.
- Verify transitions and controls on small viewports.

#### Phase 5 Progress (current pass)
- Added person sub-mode split in UI:
  - `Identity` mode for stable identity layers.
  - `ValueLog` mode for canonical protocol replay inspection.
- Added mobile-safe person controls:
  - quick row for mode/play/next-log actions.
  - horizontal identity-layer rail so labels remain visible on phones.
- Added explicit protocol chain visibility in panel (ValueLog mode):
  - `~ValueCaptureProtocol`
  - `~WellbeingProtocol`
  - `~SAOcommons`
- Added timeline control hooks:
  - play/pause
  - next-log step
  - playback speed presets.

#### Phase 5 Progress (latest)
- Split `person` and `valuelog` into distinct semantic levels:
  - `person` renders identity-orbit scene.
  - `valuelog` renders a separate pipeline scene.
- Added dedicated ValueLog pipeline module:
  - `src/game/iov/ValueLogScene.ts`
  - visual stages: `TimeSlice -> ValueCapture -> Wellbeing -> SAOcommons -> Outcome`.
- Added stepwise ValueLog composer in panel:
  - 1) time slice
  - 2) value capture
  - 3) wellbeing context
  - 4) performance tags (L/E/O, gated by `~~Performance`)
  - 5) compute deltas
  - 6) commit ValueLog.
- Added canonical context/activation fields in value log entries:
  - `~WellbeingProtocol.~~Context`
  - `~SAOcommons.~~Activation`.
- Build is currently passing (`npm run build`).

#### Phase 5 Progress (clock + vocabulary pass)
- Renamed semantic breadcrumb vocabulary for narrative clarity:
  - `Topology -> System`
  - `Brick -> Organization`
  - `Person -> Person`
  - `ValueLog -> Time Slice`
- Replaced ValueLog lane scene with a clock-centered Time Slice scene:
  - explicit start/end hands
  - highlighted time-slice arc
  - moving token along selected slice
  - wellbeing node ring (`~~Physiology..~~Performance`)
  - conditional SAO domains (`~~Learning/~~Earning/~~OrgBuilding`) when Performance is active
  - outward aura bands that react to delta sign/magnitude.
- Updated panel copy to match the new vocabulary:
  - `Open Time Slice`
  - `Time Slice Composer`
  - `Commit Time Slice`.

#### Phase 5 Progress (interaction-led reveal pass)
- Time Slice scene now reveals by step instead of showing all layers at once:
  - `time_slice/value_capture`: clock + slice only
  - `wellbeing_context`: wellbeing nodes only
  - `performance_tags`: SAO domains only when `~~Performance` is selected
  - `compute/commit`: outcome bars + aura bands.
- Added step-based camera framing so each step focuses on the active decision area.
- Removed center semantic overlay card while in Time Slice mode to reduce visual conflict with composer UI.

#### Phase 5 Progress (direct manipulation pass)
- Added direct in-scene interaction for Time Slice scene:
  - click clock dial to advance from slice selection into context stage
  - click wellbeing context nodes to set `~~Context` and auto-route to next relevant stage
  - click `~~Learning/~~Earning/~~OrgBuilding` nodes to toggle SAO tags in Performance mode.
- Added `OrbitControls` to Time Slice scene:
  - pan/orbit/zoom now works like other semantic levels.
- Reduced in-scene clutter:
  - hidden large stage labels
  - smaller node labels
  - panel guidance updated (`Next/Prev optional`).

## Initial Task Breakdown (Actionable)
1. Create semantic zoom state model and event list.
2. Scaffold controller and wire into `IovTopologyCanvas`.
3. Add breadcrumb component and back handlers.
4. Stub `BlockInteriorScene` with static placeholders.
5. Add transition manager (crossfade).
6. Add people data schema and sample file.
7. Replace placeholders with data-driven persons.
8. Add `PersonIdentityScene` and wiring.
9. Performance pass + mobile QA pass.

## Data Contracts (Draft)
- `iov_people.json` (draft keys):
  - `version`
  - `seed`
  - `regions[]`
    - `regionId`
    - `brickArchetypes[]`
      - `archetypeId`
      - `peopleCount`
      - `profiles[]`
  - `profiles[]`
    - `profileId`
    - `label`
    - `identityLayers[]`
      - `key`
      - `label`
      - `value`

## Risks / Open Questions
1. Visual style of people: abstract glyphs vs simple 3D figures?
2. Identity vocabulary: which dimensions are canonical for v1?
3. Transition timing: fixed duration vs performance-adaptive?

## Definition of Done (v1)
- User can move across all active semantic levels and back (`System -> Organization -> Person -> Time Slice -> Impact`).
- No level blocks mobile usability.
- 60 FPS target on desktop; acceptable performance on mobile.
- Data files drive labels and counts (no hardcoded narrative constants).
- Existing topology/reclaim interactions still work.

## Update Protocol
After each implementation pass:
1. Update phase status.
2. Add a `Change Log` entry.
3. Record any architectural decision under `Decision Log`.
4. Add next 1-3 concrete tasks.

## Decision Log
- 2026-02-22: Use modular scene architecture with a shared controller instead of one monolithic scene file.
- 2026-02-22: Deep navigation uses explicit intent (selection + action), not pure zoom threshold, to avoid accidental level jumps.
- 2026-02-22: Mobile flow uses tap-first CTAs (`Open Brick`, `Back`) with no hover dependency.
- 2026-02-22: Person semantics split into `stable identity` vs `daily breathing logs`; only the breathing layer updates per timeslice and affects wellbeing/aura.
- 2026-02-22: Canonical vocabulary source of truth remains `the-internet-of-value-spec`; visualization mirrors protocol terms instead of introducing ad-hoc labels.
- 2026-02-24: Impact must escalate in three explicit scenes (`Person Impact -> Org Impact -> System Impact`) with typed outputs between scenes.
- 2026-02-24: System bridge collapse is tied to Community pillar growth and bridge stress, not raw reclaimed-brick count.
- 2026-02-24: Pass 1 ships behind `IOV_FEATURE_FLAGS.enableImpactEscalation=false` to preserve existing demo behavior while contracts/controller land.
- 2026-02-24: Pass 2 org-impact routing and scene logic are also integrated behind the same feature flag; default demo flow remains unchanged while scaffold stabilizes.
- 2026-02-24: Block interior must persist contagion completion state per brick so revisits show full-org activation (not only single-person seed aura).
- 2026-02-24: Pass 3 enables `IOV_FEATURE_FLAGS.enableImpactEscalation=true` after system-impact scene and stress-model routing validated with tests/build.

## Change Log
- 2026-02-22: Document created; phases, architecture, and task plan established.
- 2026-02-22: Phase 0 interaction contract completed and locked (v0.1) with trigger, mobile, and event API definitions.
- 2026-02-22: Phase 1 completed with semantic controller scaffold, breadcrumb/back UI, and `Open Brick` gating from topology brick selection.
- 2026-02-22: Phase 2 completed with `BlockInteriorScene`, instanced people, hover/select interactions, and block summary panel wiring.
- 2026-02-22: Phase 2 refinement completed with Inspect/Reclaim click mode split, mobile-visible Open Brick action, and stylized humanoid people visuals.
- 2026-02-22: Phase 3 completed with orbit/aura-based `PersonIdentityScene` and canonical wellbeing-identity vocabulary integration.
- 2026-02-22: Phase 4 started with canonical protocol vocabulary, `iov_valuelogs.json` (fallback `iov_timelogs.json`), person-state timeline engine, and aura evolution wiring.
- 2026-02-22: Project model explicitly aligned to "system -> brick -> people -> person identity -> daily protocol logs" narrative with clear slow-vs-fast state separation.
- 2026-02-22: Added person/value split with separate `ValueLog` semantic level, explicit canonical protocol cards, and timeline playback controls for auditable breathing-layer evolution.
- 2026-02-22: Reworked person aura from center sphere pulse to orbit-field pulse bands/waves; daily logs now explicitly drive Story/Skills (direct) and IdentityState (derived) in the panel narrative.
- 2026-02-24: Added Impact Escalation Contract with explicit scene-by-scene `Input -> Behavior -> Output` definitions for Person, Org, and System impact.
- 2026-02-24: Added modular rollout plan (Pass 1-4) and documentation protocol to reduce regression risk during end-scenes implementation.
- 2026-02-24: Implemented Pass 1 contracts/state slice + default-off feature flag + tests, with no visual runtime changes when flag is off.
- 2026-02-24: Implemented Pass 2 scaffold: `OrgImpactScene`, semantic routing (`impact -> orgimpact -> block`), contagion animation logic, and controller test coverage.
- 2026-02-24: Fixed regression in Time Slice commit wiring (`onValueLogCommit` / `onValueLogDraftChange`) to restore end-to-end commit flow.
- 2026-02-24: Added block-level org activation persistence and visuals so contagion completion resolves to full-organization glow state on return/revisit.
- 2026-02-24: Implemented Pass 3 with `SystemImpactScene`, `orgimpact -> systemimpact -> topology` routing, macro stress state persistence, and stress-driven bridge collapse trigger.
- 2026-02-24: Escalation flag switched on for live end-scene flow (`IOV_FEATURE_FLAGS.enableImpactEscalation=true`).

## Next Up
1. Pass 4: remove deprecated transfer-count collapse path entirely (not only gated off).
2. Tune SystemImpactScene camera, timing, and copy for stronger narrative readability on mobile and desktop.
3. Add panel-level system-impact telemetry (current pillar height / bridge stress) for observability.
