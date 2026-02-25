# IoV Color Rendering Spec (First Principles)

This document defines how pillar colors are rendered today, why they can appear too dark in practice, and the target visual behavior we want.

## Problem Statement

Observed behavior in presentation view:
- Market / State / Community masses are hard to differentiate at a glance.
- Towers can read as near-black silhouettes from default camera distance.

This is a perception failure, not only a "hex code" failure.

## Current Rendering Pipeline

### 1) Color assignment
- Region identity colors come from `src/game/iov/iovNarrativeConfig.ts` (`IOV_IDENTITY_COLORS`).
- Market layers are overridden in `src/game/iov/IovTopologyScene.ts`:
  - `cashMarketColor`
  - `derivativesMarketColor`
- Every brick color is passed through `ensureMinLightness(...)` in `generateRegionBricks(...)`.

### 2) Material + mesh path
- Bricks use `THREE.InstancedMesh` + `THREE.MeshBasicMaterial({ vertexColors: true })`.
- Brick color is written per instance via `mesh.setColorAt(...)`.
- `MeshBasicMaterial` is unlit, so light sources do not directly brighten/darken brick faces.

### 3) Additional visual layers
- Per-brick edge overlays (`LineSegments`) add structural readability.
- Top-cap edges are highlighted gold.
- Studs are a separate instanced mesh using palette color.
- Scene still has shadows/lights for environment and non-basic materials.

### 4) Output settings
- `renderer.outputColorSpace = THREE.SRGBColorSpace`
- `renderer.toneMapping = THREE.NoToneMapping`

## Why It Still Looks Dark (Honest Diagnosis)

1. Palette mismatch with intended semantics
- Current identity palette is blue/brown/yellow/graphite.
- Canonical palette is:
  - Market: dark green + lighter green derivatives
  - State: red
  - Community: yellow
- If semantic colors are not applied, viewers already lose categorical clarity.

2. Spatial averaging at distance
- Towers are made of many small bricks separated by dark creases/gaps.
- At presentation camera distance, the eye blends face+gaps into a darker aggregate mass.
- Result: even moderately bright face colors can read as "almost black."

3. Luminance compression between regions
- If region palettes are too close in perceived luminance, category separation collapses.
- Distinct hue alone is insufficient when structures are dense and far from camera.

4. Contrast budget is consumed by line work
- Edge overlays and structural detail help shape readability.
- But if body fill luminance is too low relative to line density, masses feel black with thin highlights.

5. **Material configuration issue** (FIXED)
- `MeshBasicMaterial` was configured with `vertexColors: true` which is for geometry vertex colors, not instanced colors.
- This interfered with proper application of per-instance colors via `setColorAt()`.
- Removed `vertexColors: true` and `color: "#ffffff"` from material, allowing instance colors to display correctly.

6. **Insufficient minimum lightness** (FIXED)
- Previous min lightness floors were too conservative (0.5-0.64 range).
- Increased to 0.65-0.75 range to ensure brick faces are bright enough to overcome spatial averaging at distance.

## Target Color Semantics

Canonical target for storytelling:
- Market cash: dark green (money)
- Market derivatives: lighter green (same family, clearly separate)
- State: red (institutional authority / emergency services association)
- Community: yellow (foundational social substrate)
- Bridge: graphite neutral

## Non-Negotiable Rendering Rules

1. Identity permanence
- Brick category color is immutable through lifecycle states.
- State changes must use outline/glow/pulse, not hue reassignment.

2. Segment clarity (Market)
- Cash and derivatives must be distinguishable by both:
  - hue/lightness difference
  - structural cue (split band / optional pattern)

3. Readability at default camera
- A first-time viewer must classify Market / State / Community in under 1 second.

## Quantitative Acceptance Criteria

At default camera and default viewport:

1. Region separability
- Market vs State vs Community should be visibly distinct without hovering UI.

2. Luminance floor
- Main body fills must avoid black-crush appearance in aggregate.
- Use a tested minimum lightness floor for each region, not one global value only.

3. Market dual-tone
- Cash and derivatives are both green but visibly different in stacked view.

4. Color-blind fallback support
- Keep non-color cue for market split (already present via white split band).
- Add optional texture/pattern cue if needed.

## Implementation Direction (Completed)

1. ✅ Set canonical palette tokens first
- Semantic colors were already in place in `IOV_IDENTITY_COLORS`.

2. ✅ Tune by perception, not by hex in isolation
- Increased minimum lightness floors significantly:
  - Market cash: 0.5 → 0.65
  - Market derivatives: 0.64 → 0.75
  - State: 0.56 → 0.7
  - Community: 0.62 → 0.75
  - Bridge: 0.52 → 0.65
- This ensures colors remain readable at presentation distance despite spatial averaging.

3. ✅ Separate face readability from edge readability
- Face colors now carry sufficient luminance for category identity at distance.

4. ✅ Fix material configuration
- Removed `vertexColors: true` from `MeshBasicMaterial` as it was interfering with instanced colors.
- Instance colors now display correctly via `setColorAt()`.

5. ✅ Darker brick outlines for better definition
- Changed edge overlays from light colors (`#f5f8ff`, `#ffd66b`) to dark blue-grey (`#2a3b4d`, `#4a5568`).
- Increased opacity slightly (0.32 vs 0.24) for better visibility against bright brick faces.
- This creates stronger contrast and makes individual bricks appear more distinct.

6. ✅ Reduced pastel intensity by 10-15% for more serious aesthetic
- Lowered minimum lightness floors: cash 0.65→0.585, derivatives 0.75→0.675, state 0.7→0.63, community 0.75→0.675
- Bridge darkened further to 0.55 for better "sitting above" appearance
- Creates more serious, less toy-like aesthetic

7. ✅ Added flag poles with pillar identification
- Small vertical poles extending from top of each pillar (Market, State, Community only)
- Rectangular flags with black text on white background
- Labels: "MARKET", "STATE", "COMMUNITY"
- Bridge excluded as it lacks brick structure
- Flags animate with region reveal (appear/disappear with pillars)

8. ✅ Added bridge identification text
- Text labels "CRONY" and "BRIDGE" carved into the top faces of bridge support pillars
- Uses dark graphite color (#2a3b4d) matching bridge edge theme
- Text planes positioned flat on pillar tops with slight forward offset for visibility
- Labels animate with bridge reveal (scale with support pillars)
- Provides clear identification for the bridge structure without traditional brick stacking

9. ✅ Added individual letters on bridge bricks
- Each bridge brick displays a single bold red letter spelling "CRONY BRIDGE" (12 characters including space)
- Text appears only on camera-facing bricks (one side of the bridge) for optimal visibility
- First 12 camera-facing bricks show letters, remaining bricks are blank (no repetition)
- Uses bright red color (#dc2626) for high contrast against graphite bridge material
- Canvas-generated textures applied to individual brick faces
- Creates "carved" appearance with letters appearing to be etched into each brick
- Bridge bricks use individual meshes instead of instancing for unique text per brick

10. ✅ Balanced cross-pillar scaling for better visual proportions
- Reduced market height scale from 1.6x to 1.2x (22 layers vs 29)
- Increased community scale from 0.35x to 0.8x with max height 6 (6 layers vs 2)
- State remains at 1x scale (12 layers)
- Better relative proportions: Market 1.8x State, State 2x Community

## Notes

This doc is intentionally focused on first principles:
- perception at distance
- category semantics
- deterministic mapping from data category -> visible color identity
