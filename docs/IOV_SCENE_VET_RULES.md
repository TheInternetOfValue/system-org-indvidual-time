# IOV Scene Vet Rules

Use this list before merging any scene/UI change. A change passes only if every item is true.

## A. Story Continuity (Forward + Back)
- [ ] Scene title states where the player is now in the loop.
- [ ] Scene text explicitly indicates the next scene destination.
- [ ] Back navigation label matches the actual previous scene.
- [ ] No scene uses stale story language from an earlier flow.

## B. One-Step Interaction Contract
- [ ] Exactly one primary action is emphasized at a time in the active scene.
- [ ] Side panel primary button matches the same active in-scene action.
- [ ] Secondary actions are hidden or visually de-emphasized while primary step is incomplete.
- [ ] No required step depends only on double-click; single click/tap path exists.

## C. Panel-Scene Context Parity
- [ ] Panel explains only what is currently visible in-scene.
- [ ] Panel text and button labels use the same step name as in-scene dock/chip.
- [ ] Old step controls are not shown after stage transition.
- [ ] Level context (System/Org/Person/Time Slice/Impact) is accurate.

## D. Time Slice Specific (Value Log)
- [ ] Time capture is constrained to one day window (24h stream).
- [ ] Start is backward-only from now; no future-time selection.
- [ ] End is constrained between Start and Now.
- [ ] Stage copy and CTA labels stay synchronized (`Lock Start`, `Lock End`, etc.).
- [ ] Photon visualization is hidden during pure time capture and appears in later layers only.

## E. Logic Integrity
- [ ] State-machine progression is valid (no skipped required stages).
- [ ] `canCommit`/advance guards enforce completion before transition.
- [ ] Back navigation returns to deterministic expected level.
- [ ] Scene transitions do not mutate unrelated state.

## F. Visual Clarity + UX Safety
- [ ] Key action target is not occluded by overlays or decorative meshes.
- [ ] Titles/cues are readable on desktop and mobile.
- [ ] Tap targets are reachable with one-thumb usage on mobile.
- [ ] Critical labels avoid overlap with dynamic scene markers.

## G. Performance + Regression
- [ ] `npm run build` passes.
- [ ] `npm run test -- --run` passes.
- [ ] No new per-frame allocation churn on hot paths.
- [ ] Performance overlay (`?perf=1`) shows stable FPS/draw calls in each semantic level.

## H. Release Gate
- [ ] Manual walkthrough complete for: System -> Organization -> Person -> Time Slice -> Impact -> System.
- [ ] Copy and CTA reviewed for contradiction across scene chip, dock, and side panel.
- [ ] At least one mobile viewport and one desktop viewport checked end-to-end.
