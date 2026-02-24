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
7. `System Impact` (Community pillar growth that stresses and can collapse the bridge)

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
- Org contagion scene lives in `src/game/iov/OrgImpactScene.ts`.
- System impact scene lives in `src/game/iov/SystemImpactScene.ts`.
- Block scene now persists completed org activation state per brick (full glow + aura rings).
- Time Slice commit wiring regression was fixed (`onValueLogCommit` and draft change handlers restored).
- Feature flag is currently `true` in `src/game/iov/iovNarrativeConfig.ts`.
- Escalation path is now `impact -> orgimpact -> systemimpact -> topology`.
- Next pass should focus on cleanup/migration (remove legacy transfer-count bridge collapse path entirely and tune visuals/copy).

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
