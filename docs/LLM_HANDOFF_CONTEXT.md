# IoV Handoff Context (For Next LLM)

## Why this file exists
Current implementation is functional but still confusing in the `Time Slice` scene.  
This doc is meant to let a new LLM continue quickly without re-discovering intent.

## Product intent (canonical narrative)
The experience is a semantic zoom story:

1. `System`  
2. `Organization`  
3. `Person` (wellbeing identity layers)  
4. `Time Slice` (value log cascade)
5. `Impact` (photon drop + ripple transition)
6. `Org Impact` (aura contagion across people in selected organization)
7. Return to `System` with queued org activation (`Empower Community Pillar`)
8. `System Impact` (Community pillar growth that stresses and can collapse the bridge)

The core message:
- institutions are made of organizations,
- organizations are made of people,
- people evolve through logged behavior,
- logged behavior updates wellbeing and aura.

## Current semantic vocabulary
- `System` = former topology level
- `Organization` = former brick level
- `Person` = wellbeing identity layer view
- `Time Slice` = value log composition / protocol cascade view
- `Org Impact` = contagion activation of one organization after person impact
- `Empower Community Pillar` = explicit system-level trigger to consume queued org activation
- `System Impact` = Community pillar growth + bridge stress/collapse sequence

## Current implementation map
- Main canvas/router:
  - `src/components/IovTopologyCanvas.tsx`
- Scene modules:
  - `src/game/iov/IovTopologyScene.ts`
  - `src/game/iov/BlockInteriorScene.ts`
  - `src/game/iov/PersonIdentityScene.ts`
  - `src/game/iov/ValueLogScene.ts`
  - `src/game/iov/PersonImpactScene.ts`
- Camera orchestration:
  - `src/game/iov/IovCameraDirector.ts`
- Zoom controller:
  - `src/game/iov/IovSemanticZoomController.ts`
- Left panel:
  - `src/ui/IovTopologyPanel.tsx`
- Value logs data:
  - `public/data/iov_valuelogs.json`
  - loader/types in `src/game/iov/iovTimelogs.ts`
- State evolution:
  - `src/game/iov/PersonStateEngine.ts`

## New Priority Contract (locked for next passes)
Implement impact as a strict three-scene pipeline:
1. `Person Impact` (existing): committed log updates one person.
2. `Org Impact` (new): one impacted person spreads aura through org until full activation and radiant brick state.
3. `System Impact` (new): org activation increases Community pillar height and bridge stress until collapse threshold.

Critical rule:
- bridge collapse must be driven by Community pillar growth / stress model.
- do not use raw reclaimed-brick count as collapse trigger.
- collapse timing must be contact-gated: no bridge shatter before visible community-to-bridge contact.

### Contract IO (must remain explicit)
- `Person Impact` output: `PersonImpactResult`.
- `Org Impact` input: `PersonImpactResult`; output: `OrgImpactResult` with `communityPowerDelta`.
- `System Impact` input: `OrgImpactResult` + macro state; output: `SystemImpactResult` with `bridgeCollapsed`.

### Safe rollout requirement
- Add behind feature flag first (`enableImpactEscalation`).
- Keep current behavior unchanged when flag is off.
- Update docs after each pass before moving to next pass.

Current pass status:
- Pass 1, Pass 2, and Pass 3 are implemented.
- Contracts/state live in `src/game/iov/iovImpactEscalation.ts`.
- Org contagion playback now lives in `src/game/iov/BlockInteriorScene.ts` via `playOrgContagion(...)`.
- System impact playback now lives in `src/game/iov/IovTopologyScene.ts` via `playSystemImpact(...)`.
- Block scene now persists completed org activation state per brick (full glow + aura rings).
- Time Slice commit wiring regression was fixed (`onValueLogCommit` and draft change handlers restored).
- Feature flag is currently `true` in `src/game/iov/iovNarrativeConfig.ts`.
- Escalation route is now `impact -> orgimpact -> block -> topology`; system impact is user-triggered via `Empower Community Pillar`.
- System impact now includes rapid community build-up visuals before bridge collision and stress evaluation.
- Bridge collapse now requires both threshold and contact gate, using bridge geometry bounds for impact targeting.
- Next pass should remove the legacy transfer-count collapse fallback and tune end-scene presentation.

## New Approved Track: Aesthetic + Interaction Development
Branch context:
- active implementation branch for this track: `codex/aesthetic-interaction-development`
- branched from `codex/end-scenes-overhaul` to retain latest end-scene fixes.

Primary goals:
1. Cinematic camera transitions across semantic zoom levels.
2. Move primary actions from side panel into in-scene interaction affordances.

Module plan:
1. `Module 0`: camera shot contract (spec doc only, no runtime changes).
2. `Module 1`: camera director implementation and transition wiring.
3. `Module 2`: transition polish pass (focus cue, settle hold, subtle cinematic emphasis).
4. `Module 3`: in-scene controls phase 1 (`Open Organization`, `Inspect/Reclaim`, `Open Person`) with panel fallback.
5. `Module 4`: in-scene controls phase 2 (person/time-slice primary actions in scene).
6. `Module 5`: cinematic consistency/performance sweep.

Execution policy:
- commit each module as a checkpoint before moving to the next.
- run regression checks on each module (`npm run test -- --run`, `npm run build`).
- keep current impact escalation logic stable while camera/interaction UX evolves.

Module status update:
- `Module 0` is complete.
- camera contract doc added: `docs/IOV_CAMERA_SHOT_CONTRACT.md`.
- `Module 1` is complete:
  - `IovCameraDirector` added and wired into `IovTopologyCanvas`.
  - cinematic shots active for:
    - `Open Organization` (`SYSTEM_TO_ORGANIZATION`)
    - `Open Person` (`ORGANIZATION_TO_PERSON`)
  - interactions are blocked during active shot playback to avoid transition conflicts.
- `Module 2` is complete:
  - pre-focus cues added before open transitions (`IovTopologyScene.playBrickFocusCue`, `BlockInteriorScene.playPersonFocusCue`)
  - settle holds added after shot completion before level swap
  - subtle FOV overshoot/settle emphasis added to `IovCameraDirector.playShot(...)`
  - transition-busy lock added to prevent concurrent interactions during cue/settle windows.
- next implementation target: `Module 3` (in-scene controls phase 1).

## Newly added (this pass)
- `Person` scene has a staged identity-build mode:
  - `Start Identity Build` begins at `GivenIdentity`.
  - `Next Identity` advances one orbit/layer at a time.
  - `Replay Layer` replays the current layer drop.
- Facet tokens now animate as staggered drops from above instead of appearing all at once.
- Controls are wired in both desktop and mobile panel for `Person` level.

## What the yellow element is (explicit)
In the `Time Slice` scene, the yellow moving sphere near the clock hands is the **activity token**:
- it represents the currently active point moving across the selected time slice wedge,
- it is not a separate “block” in the economic topology.

If this stays, rename in UI copy to: `Activity token` or `Current log token`.

## Known UX problems to fix next
1. **Scene still feels unclear**
- Too many visual metaphors are present relative to what user is doing at each step.
- User still asks “what is happening on screen?”

2. **Panel occlusion / layout conflict**
- Left panel can hide important scene objects on desktop.
- Some stage elements can appear “behind” the panel and look broken.

3. **Interaction model is mixed**
- Direct scene click interactions + `Prev/Next` buttons coexist.
- This dual model makes control flow ambiguous.

4. **Time Slice step clarity**
- User should understand one clear action at a time.
- Current text and visuals still allow interpretation overload.

## Non-negotiable behavior goals
1. No “everything at once” in Time Slice.
2. One decision per step with obvious affordance.
3. User must always know:
- what to click now,
- what changed,
- what the result means.

## Recommended redesign contract for next LLM
Implement Time Slice as a **guided wizard scene**:

### Step A: Select Time Slice
- Show only clock, start/end handles, selected wedge.
- Hide wellbeing/SAO/outcome visuals.
- CTA: `Confirm Time Slice`.

### Step B: Add Wellbeing Context
- Show only six wellbeing nodes.
- Pick one node.
- Auto-advance on selection.

### Step C: Performance gate
- If node != `~~Performance`, skip to Step D.
- If `~~Performance`, show L/E/O chips only.

### Step D: Compute + Commit
- Show only 3 output signals:
  - Wellbeing delta
  - Aura delta
  - IdentityState delta
- CTA: `Commit Time Slice`.

## Camera + layout requirements for next LLM
1. Keep orbit/pan/zoom enabled in Time Slice.
2. Add `safe frame` composition so key objects are not hidden by left panel.
3. Prefer center-right composition when panel is visible.
4. On mobile, avoid fixed overlays that block the clock center.

## Suggested immediate cleanup
1. Add an on-screen legend for Time Slice scene:
- `Blue hand = start`
- `Gold hand = end`
- `Yellow token = activity token`

2. Replace `Prev/Next` with single contextual button:
- `Continue` / `Apply Context` / `Compute` / `Commit`.

3. Keep breadcrumb as-is but simplify status text to one sentence per step.

## Acceptance criteria for next LLM pass
1. First-time user can complete one Time Slice without guessing controls.
2. No critical visual element hidden behind panel at default camera.
3. User can describe what yellow token is after one interaction.
4. Scene explains protocol cascade:
   `~ValueCaptureProtocol -> ~WellbeingProtocol -> ~SAOcommons`.

## Suggested prompt for next LLM (copy/paste)
Use this if you want a direct handoff prompt:

```text
You are taking over an existing React + Three.js semantic zoom project.
Current levels: System -> Organization -> Person -> Time Slice.

Critical issue: Time Slice scene is still confusing.
Implement a strict one-action-per-step wizard interaction in Time Slice:
1) Select time wedge on clock and confirm.
2) Select wellbeing context node.
3) If Performance, select L/E/O domains.
4) Compute and commit with only three outputs visible (Wellbeing/Aura/IdentityState deltas).

Constraints:
- Keep OrbitControls enabled in Time Slice.
- Do not show all labels at once.
- Ensure no key scene element is hidden behind left panel at default camera.
- Explain yellow token in UI as activity token.
- Keep protocol vocabulary canonical:
  ~ValueCaptureProtocol -> ~WellbeingProtocol -> ~SAOcommons.

Update docs/IOV_SEMANTIC_ZOOM_PROJECT.md and docs/LLM_HANDOFF_CONTEXT.md after changes.
```
