# IoV Semantic Zoom Project (Living Document)

Handoff companion:
- `docs/LLM_HANDOFF_CONTEXT.md` (plain-language transfer brief for next LLM, including known UX failures and required next-pass contract)

## Purpose
Build the next narrative layer of the Internet of Value experience through semantic zoom:

1. `System` level: Market / State / Community / Crony Bridge.
2. `Brick` level: each institution brick is composed of people.
3. `Person` level: each person contains identity layers.

Core message: institutions are abstractions made from people, people are structured by identity, and identity evolves through daily logged behavior.

Narrative chain:
1. `System`: Market / State / Community / Bridge.
2. `Brick`: organizations composed of people.
3. `Person`: stable identity layers (slow-changing profile structure).
4. `Breathing Layer`: daily protocol logs that update wellbeing state/aura over time.

## Scope
- In scope:
  - Multi-level scene flow (`topology -> brick -> person`)
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
  - `TopologyScene` (existing)
  - `BlockInteriorScene` (new)
  - `PersonIdentityScene` (new)
- Introduce a scene controller:
  - File target: `src/game/iov/IovSemanticZoomController.ts`
  - State shape:
    - `level: "topology" | "block" | "person"`
    - `selectedRegionId`
    - `selectedBrickId`
    - `selectedPersonId`
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
- User can move across all 3 semantic levels and back.
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

## Next Up
1. Add `public/data/iov_people.json` to bind canonical identity attributes per person (stable band) without mixing ValueLog state.
2. Replace mobile person overlay card with compact anchored variant so controls do not occlude the avatar/orbit center.
3. Add per-log drilldown depth:
   expandable sections for `~~TimeSlice`, `~~Activity`, `~~Proof`, `~~Validation`.
4. Add explicit identity-state linkage text:
   current log delta -> wellbeing score -> aura strength.
