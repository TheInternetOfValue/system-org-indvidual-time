# What is the System and its Value?

This repository contains an interactive visualization that models how value accumulates, distributes, and interlocks across three major economic subsystems:

- 📊 **Market** – Public financial markets including equity, credit, and derivatives
- 🏛️ **State** – Annual economic output (GDP) and governance capacity
- 🧑‍🤝‍🧑 **Community** – Households, cooperatives, nonprofits, trust networks
- 🔗 **Crony Bridge** – Top-layer interlock between Market & State (regulatory capture, bailouts, elite coordination)

The visualization uses a 3D “brick stack” analogy:
- Each brick represents a quantifiable unit of value
- Height encodes concentration
- Horizontal spread encodes participation
- Bridge layers encode elite interlock

The interface includes:
- Click-to-assemble phases (Market, State, Community, Bridge)
- Brick transfer interaction (top bricks can be reclaimed into Community)
- Tooltip + left info panel with definitions and values
- Presentation Mode toggle for cleaner demo/readability view
- Dynamic phase headline messaging (build/reveal state text)
- Legend chips for Market/State/Community/Bridge color mapping
- Log-scale height mapping driven by values data

---

## 🚀 Project Structure

```text
src/
  components/
    IovTopologyCanvas.tsx        # Three.js canvas wiring + render loop
  game/
    iov/
      IovTopologyScene.ts        # Core scene generation + interactions
      iov.topology.json          # Topology regions and UI toggle metadata
      iovValues.ts               # Values loader + helpers
      iovNarrativeConfig.ts      # Scale / identity / phase config
  ui/
    IovTopologyPanel.tsx         # Left panel UI
public/
  data/
    iov_values.json              # Editable data values (USD trillions)
docs/
  IOV_DESIGN.md                  # Coordinate and motion notes
  IOV_SEMANTIC_ZOOM_PROJECT.md   # Living plan/status for semantic zoom expansion
```

---

## 🧠 Data Model

Primary data source:
- `public/data/iov_values.json`

Current schema:
- `units`
- `market.cash_equities`
- `market.bonds`
- `market.derivatives_notional`
- `market.total`
- `state.global_gdp`
- `state.total`
- `community.*` estimates and `community.total`
- `notes.sources`, `notes.last_updated`

If a value is `null`, UI renders `TBD`.

---

## 📏 Scale Mapping

Height mapping uses log scaling:

```text
height = multiplier * log10(value + 1)
```

Implementation details:
- `mapValueToLayers(...)` in `src/game/iov/IovTopologyScene.ts`
- Market visual height currently uses **cash + derivatives** composite when available
- Layer count is clamped (`minHeightLayers`, `maxHeightLayers`) so towers remain visible in frame

---

## 🎮 Controls

- **Build buttons** (panel): `Market`, `State`, `Community`, `Bridge`
- **Keyboard shortcuts**:
  - `1` Market
  - `2` State
  - `3` Community
  - `4` Bridge
- **Pointer**:
  - Hover: tooltip
  - Click top bricks on Market/State/Bridge: reclaim to Community

---

## 🏗️ What Has Been Implemented

- Single shared baseplate topology (common coordinate space)
- Procedural towers/base/bridge with instancing
- Bridge anchored to top region logic
- Community reclaim slots + transfer animation
- No recolor during flight (source brick color is preserved)
- Values panel wired from JSON loader
- Build-phase triggering from UI/keys
- Presentation Mode toggle in panel (condensed content for demos)
- Dynamic phase headline updates on build actions (buttons + keyboard)
- Legend chips for immediate region-color readability
- Derivatives mist pipeline exists but is currently disabled by default
- Added non-color split cue for Market cash vs derivatives (white split band guide)
- Updated region identity palette (deep blue / burnt brown / muted green / graphite)

---

## ⚠️ Current Gaps / Known Issues

### 1) Shadow artifacts in dense contact zones
There have been z-fighting / shadow-acne artifacts near Community connectors.

Current mitigation:
- shadow bias tuning
- slot guide overlays disabled by default
- structure/baseplane separation improvements

Planned stable fix:
- shadow profile presets (`clean`, `cinematic`) and stricter depth offsets for contact areas

### 2) Derivatives mist toggle is not yet exposed in panel metadata
The scene supports `derivativesMist`, but `src/game/iov/iov.topology.json` currently exposes only `communityErosion` in panel toggles.

### ✅ 3) Color rendering visibility (RESOLVED)
Previously, brick faces appeared nearly black despite palette adjustments due to:
- Material configuration issue (`vertexColors: true` interfering with instanced colors)
- Insufficient minimum lightness floors for spatial averaging at distance

Fixed in recent update:
- Removed `vertexColors: true` from `MeshBasicMaterial`
- Increased min lightness floors (0.65-0.75 range) for all regions
- Colors now clearly readable at default camera distance in both normal and presentation modes

### ✅ 5) Enhanced visual polish (RESOLVED)
Added flag poles and refined color palette:
- Small flag poles extending from top of Market, State, and Community pillars
- Rectangular flags with text labels for clear identification
- Reduced pastel intensity by 10-15% for more serious aesthetic  
- Bridge further darkened for better "sitting above" appearance
- Added bridge identification text carved into support pillars ("CRONY" and "BRIDGE")
- Added individual letters carved into each bridge brick spelling "CRONY BRIDGE" in bold red (only on camera-facing bricks, first 12 bricks show letters)
- All changes maintain existing interactions and performance

---

## 🛠️ Development

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Tests:

```bash
npm run test -- --run
```

---

## 🔭 Next Recommended Steps

1. Add `renderMode: "high_contrast" | "cinematic"` toggle in `IovTopologyScene`.
2. Add optional stripe/hatch texture for derivatives segment to avoid color-only dependence.
3. Expose `derivativesMist` toggle in `src/game/iov/iov.topology.json` when ready for demos.
4. Add screenshot regression checks for known visibility states.
