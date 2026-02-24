# IoV Camera Shot Contract (Module 0)

Status: `locked`  
Date: `2026-02-24`  
Scope: semantic zoom cinematic transitions and in-scene framing contract.

## Purpose
Define deterministic camera choreography for every narrative transition so motion explains state changes instead of feeling like a hard scene swap.

This document is the source of truth for:
- shot IDs
- framing targets
- timing/easing
- mobile variants
- interruption/cancel behavior

## Global Rules
1. Camera motion must communicate intent before speed.
2. Keep one primary focal subject per shot (brick, person, or center artifact).
3. User input can interrupt any shot; interruption must not leave camera in invalid state.
4. Every shot has a reverse or return counterpart.
5. Preserve deterministic framing for presentation mode (no random camera endpoints).

## Runtime API Contract (for Module 1)
`CameraDirector.playShot(shotId, context): Promise<void>`

`CameraDirector.cancelShot(reason): void`

`CameraDirector.captureLevelPose(level): void`

`CameraDirector.restoreLevelPose(level): void`

`CameraDirector.update(deltaSeconds): void`

## Shot Context Schema
Each shot context may include:
- `selectedRegionId`
- `selectedBrickId`
- `selectedPersonId`
- `regionAnchor` (`THREE.Vector3`)
- `brickAnchor` (`THREE.Vector3`)
- `personAnchor` (`THREE.Vector3`)
- `isMobile`

## Core Shot List
### 1) `SYSTEM_TO_ORGANIZATION`
- Trigger: `Open Organization`
- Narrative intent: move from macro power map into selected institution.
- Duration: `1100ms` desktop, `1200ms` mobile
- Easing: `easeInOutCubic`
- FOV: `42 -> 38` desktop, `50 -> 46` mobile
- End framing:
  - target = selected brick center
  - camera offset desktop = `(0, +6.5, +11.5)`
  - camera offset mobile = `(0, +7.2, +12.8)`
- Pre-cue: selected brick outline pulse `180ms` before movement.
- Interrupt: allowed; on cancel snap to nearest valid block overview pose.

### 2) `ORGANIZATION_TO_PERSON`
- Trigger: click/tap person token
- Narrative intent: identify one human source inside organization.
- Duration: `900ms` desktop, `980ms` mobile
- Easing: `easeOutCubic`
- FOV: `38 -> 33` desktop, `46 -> 40` mobile
- End framing:
  - target = selected person head/chest anchor
  - camera offset desktop = `(0, +2.6, +4.8)`
  - camera offset mobile = `(0, +3.0, +5.6)`
- Pre-cue: ring highlight around selected person.
- Interrupt: allowed; restore block-level default if selection changes mid-flight.

### 3) `PERSON_TO_TIMESLICE`
- Trigger: `Open Time Slice`
- Narrative intent: move from identity inspection to action composer.
- Duration: `780ms`
- Easing: `easeInOutQuad`
- FOV: `33 -> 34` desktop, `40 -> 41` mobile
- End framing:
  - target = Time Slice clock center
  - offset desktop = `(0, +7.5, +13.5)`
  - offset mobile = `(0, +8.2, +14.8)`
- Interrupt: disabled for first `220ms`, then allowed.

### 4) `TIMESLICE_TO_IMPACT`
- Trigger: commit action
- Narrative intent: tighten focus before photon drop result.
- Duration: `520ms`
- Easing: `easeOutQuad`
- FOV: `34 -> 32` desktop, `41 -> 38` mobile
- End framing:
  - target = impact center anchor
  - offset = scene-defined impact camera pose
- Interrupt: not allowed (atomic commit transition).

### 5) `IMPACT_TO_PERSON`
- Trigger: impact complete
- Narrative intent: return to updated person state.
- Duration: `650ms`
- Easing: `easeOutCubic`
- FOV: restore previous person FOV.
- End framing: restore captured `person` pose.
- Interrupt: not allowed for first `180ms`.

### 6) `PERSON_BACK_TO_ORGANIZATION`
- Trigger: `Back`
- Narrative intent: zoom back to social container.
- Duration: `820ms`
- Easing: `easeInOutCubic`
- End framing: restore captured `organization` pose.

### 7) `ORGANIZATION_BACK_TO_SYSTEM`
- Trigger: `Back`
- Narrative intent: return to macro topology with context preserved.
- Duration: `980ms`
- Easing: `easeInOutCubic`
- End framing: restore captured `system` pose.

### 8) `ORGIMPACT_TO_SYSTEM_READY`
- Trigger: org contagion completes
- Narrative intent: return to topology and set up empowerment decision.
- Duration: `900ms`
- Easing: `easeOutCubic`
- End framing: selected source brick remains in frame with community pillar visible.
- Post condition: `Empower Community Pillar` is visible and legible.

### 9) `SYSTEM_IMPACT_PLAYBACK`
- Trigger: `Empower Community Pillar`
- Narrative intent: hold a wide frame that keeps community rise and bridge contact visible.
- Duration: controlled by system-impact sequence.
- FOV: lock at macro presentation framing (`~42 desktop`, `~50 mobile`).
- Interrupt: disabled while collapse/impact playback active.

## Reverse/Return Rules
1. Every forward shot stores terminal pose per semantic level.
2. `NAV_BACK` restores stored pose for the destination level.
3. If no stored pose exists, use default level fallback pose.

## Safe Frame Rules
1. Keep primary focal target inside right 70% of frame when left panel is open.
2. On mobile, keep focal target above bottom sheet exclusion zone.
3. Avoid composing critical action under panel header or breadcrumbs.

## Interruption Rules
1. Pointer drag/camera orbit cancels non-atomic shots.
2. Atomic shots (`TIMESLICE_TO_IMPACT`) cannot be canceled.
3. On cancel, settle to nearest valid level pose and keep controls responsive.

## Acceptance Criteria
1. `System -> Organization -> Person` transitions read as one continuous story.
2. Back-navigation returns to stable, expected framing.
3. No critical object is hidden by panel in default transition endpoints.
4. Motion timings are deterministic between runs.

## Out Of Scope For Module 0
1. No runtime camera code changes.
2. No interaction migration yet.
3. No cinematic postprocessing/audio changes yet.
