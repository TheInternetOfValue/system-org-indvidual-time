# Project: Internet of Value Topology (React + Three.js)

## Product Goal
- Build a presentable, interactive systems-visualization of Market / State / Community value topology.
- Show **Fractal Escalation of Value**: Personal Alignment (Micro) $\to$ Organizational Integrity (Meso) $\to$ Systemic Restoration (Macro).

## Scene Inventory & Purpose
Our architecture is split into zoom levels that handle specific parts of the narrative loop.

### 1. IOV Topology Scene (`src/game/iov/IovTopologyScene.ts`)
*   **Level:** Macro
*   **Purpose:** The "World Map". Renders the four main regions (Market, State, Community, Crony Bridge/Elite).
*   **Goal:** Visualize structural inequality (log-scale towers) and the parasitic extraction via the Bridge.
*   **Key Transitions:** Zoom In to Block; Receive "Radiant Bricks" from below; Bridge Collapse event.

### 2. Block Interior Scene (`src/game/iov/BlockInteriorScene.ts`)
*   **Level:** Meso (Organization)
*   **Purpose:** The interior of a single brick. Represents a Company, Unit, or Community Group.
*   **Goal:** Humanize the abstract system. Show the people inside (Tokens) and their profiles.
*   **New Requirement:** **"Activation State"**. When value is generated at the person level, this scene must show the contagion of wellbeing (auras spreading from person to group).

### 3. Person Identity Scene (`src/game/iov/PersonIdentityScene.ts`)
*   **Level:** Micro (Individual)
*   **Purpose:** The "Identity Stack" (Physiology, Safety, Love, Esteem, Actualization).
*   **Goal:** Visualize the human condition beyond financial metrics. Show the impact of "Value Actions" on Wellbeing Scores and Aura Strength.

### 4. Value Log Scene (`src/game/iov/ValueLogScene.ts`)
*   **Level:** Action Interface
*   **Purpose:** The input mechanism (Time/Energy/Money logger).
*   **Goal:** Allow the user/narrative to inject *Causal Force* into the system.
*   **Flow:** Leads directly to the Impact scene.

### 5. Person Impact Scene (`src/game/iov/PersonImpactScene.ts`)
*   **Level:** Transition / FX
*   **Purpose:** Visual feedback loop.
*   **Goal:** The "Photon Drop". Visually connects the Value Log (Action) to the Identity Layers (Result), creating ripples that update the Person State.

---

## Interaction Flow (The Complete Loop)

1.  **Topology (Macro):** User sees the imbalance. Selects a brick (Organization) in the Market/State.
2.  **Block (Org):** User enters the brick. Sees the people. Selects a Person.
3.  **Person (Micro):** User creates a Value Log (Action).
4.  **Impact (Result):** The action ripples through the Person's identity.
5.  **Person (Update):** Person glows with new Aura.
6.  **$\to$ [NEXT] Block Activation:** Returning to the Block, the Person's aura activates the Organization. The Brick becomes "Radiant".
7.  **$\to$ [NEXT] System Alignment:** Returning to Topology, the Radiant Brick shifts allegiance or strengthens the Community.
8.  **$\to$ [NEXT] Bridge Shatter:** If Community Power > Threshold, the Crony Bridge collapses.

## Visual Rules
- Region base colors:
  - Market: deep blue
  - State: burnt brown
  - Community: yellow
  - Bridge: graphite
- Top-layer/capture cues can use gold accents.
- State transitions should be indicated by glow/outline/pulse before any recolor logic.

## Data & Scale Rules
- Values source: `public/data/iov_values.json`
- Scale mapping in scene: log-based layer mapping (`log10(value + 1)` with clamps)
- Null values should render as `TBD` in UI.

## Engineering Rules
- Make minimal, surgical changes.
- Keep CSS global in `src/index.css` (no CSS modules).
- Favor data-driven mechanics and toggle behavior.
- Preserve deterministic behavior where possible (avoid unnecessary per-frame allocations).

## Skills Usage
- `skills/gameplay-mechanics/SKILL.md`: mechanics/stress toggles and action->effect clarity
- `skills/game-design-theory/SKILL.md`: phase flow, challenge/comprehension tuning
- `skills/optimization-performance/SKILL.md`: FPS/draw-call/perf guardrails
- `skills/audio-systems/SKILL.md`: optional SFX/music pipeline
- `skills/asset-optimization/SKILL.md`: textures/assets pipeline tuning

## Handoff Notes For Other Agents
- This repo is no longer a sliding puzzle implementation focus; prioritize IoV topology work.
- If asked for quick wins, choose presentation/readability improvements first.
- Keep design philosophy text and visual identity consistent with this file and `docs/IOV_DESIGN.md`.
