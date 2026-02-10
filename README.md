# Internet of Value — Market / State / Community

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
- Derivatives mist removed (currently disabled)
- Added non-color split cue for Market cash vs derivatives (white split band guide)

---

## ⚠️ Current Gaps / Known Issues

### 1) Color readability remains inconsistent across environments
Despite multiple lighting/material passes, some displays still show pillars too dark.

Current mitigation:
- explicit Market split guide text + structural split band
- unlit/basic color material path for brick readability

Planned stable fix:
- dedicated “high-contrast mode” toggle with strict palette + unlit materials + no shadows on brick bodies

### 2) Shadow artifacts in dense contact zones
There have been z-fighting / shadow-acne artifacts near Community connectors.

Current mitigation:
- shadow bias tuning
- slot guide overlays disabled by default
- structure/baseplane separation improvements

Planned stable fix:
- shadow profile presets (`clean`, `cinematic`) and stricter depth offsets for contact areas

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
2. Add explicit legend chips (Cash, Derivatives, State, Community) in panel.
3. Add optional stripe/hatch texture for derivatives segment to avoid color-only dependence.
4. Add screenshot regression checks for known visibility states.

