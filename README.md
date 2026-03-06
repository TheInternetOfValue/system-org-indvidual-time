# What Is the System and Its Value?

An interactive Internet of Value simulation built with React and Three.js.

This project visualizes how value is created, captured, distorted, and restored across the actual semantic layers used in the Internet of Value experience:

- `System`: the topology of `Market`, `State`, `Community`, and the `Crony Bridge`
- `Organization`: the interior of one institution, company, co-op, or group
- `Person`: the wellbeing-identity layer of one human being
- `Time Slice`: the protocol event where one logged action is captured
- `Impact`: the causal transition from committed action to visible change

It is not just a data visualization. It is a playable causal model.

The goal is simple: help people see that value is not only financial, that extraction is structural, and that aligned human action can propagate from a person to an organization to the wider system.

If we use economics language at all, the clean mapping is:

- `System` is the macro/systemic layer
- `Organization` is the institutional or meso layer
- `Person` is the human behavioral and wellbeing layer

But the project itself should be named using its own canonical scene vocabulary:

`System -> Organization -> Person -> Time Slice -> Impact`

**Movement:** [The Internet of Value](https://www.TheInternetOfValue.xyz)  
**Author:** [Moses Sam Paul](https://www.linkedin.com/in/mosessampaul/)

---

## Why This Project Exists

Most systems dashboards show outputs after the damage is already done.

This project is trying to make something different:

- a systems map that shows imbalance, not just totals
- a person-centered model that links lived effort to real wellbeing
- a narrative loop where one action can move through person, organization, and system
- a visual language for structural restoration, not only structural extraction

The core thesis is:

> If we can make value legible across scales, we can build systems that reward contribution, coherence, and wellbeing instead of capture.

---

## What You Experience In The App

The runtime is organized as a semantic zoom journey.

### 1. System
You begin at the macro topology.

You see four major regions:

- `Market`: public financial markets, capital concentration, speculative scale
- `State`: GDP, institutional coordination, administrative power
- `Community`: households, co-ops, nonprofits, trust networks, unpaid care
- `Bridge`: the crony interlock between Market and State

The scene is designed to show structural inequality clearly:

- tower height reflects scale concentration
- spread reflects participation
- the bridge shows extraction and elite coordination

### 2. Organization
You open a brick and enter the interior of an organization or social unit.

This moves the story away from abstraction. The block is not just a number anymore. It contains people.

### 3. Person
You select a person and inspect the wellbeing-identity protocol layers used by the project.

The current identity stack is not generic Maslow language. It is defined in the repo vocabulary and mirrored from the canonical protocol source.

The eight layers currently rendered are:

- `~~GivenIdentity`
- `~~EarnedIdentity`
- `~~RentedIdentity`
- `~~MoralCompass`
- `~~Story`
- `~~Skills`
- `~~IdentityState`
- `~~ConsentAndDisclosure`

This is where the project makes its key claim: value must be understood through human wellbeing, identity, and lived context, not just money.

### 4. Time Slice
You log one concrete action through the project’s protocol cascade.

The Time Slice scene is not just a timer. It is where one action is turned into structured causal input:

- `~ValueCaptureProtocol`
  - `~~TimeSlice`: `~~~StartTime`, `~~~EndTime`, `~~~Duration`
  - `~~Activity`: `~~~ActivityLabel`, `~~~TaskType`, `~~~Intent`
  - `~~Proof`: `~~~ProofOfActivity`, `~~~EvidenceLink`, `~~~ArtifactType`
  - `~~Attribution`: `~~~Community`, `~~~Project`, `~~~ContributorRole`
  - `~~Integrity`: `~~~ProofQuality`, `~~~AnomalyFlag`, `~~~FraudRiskSignal`
- `~WellbeingProtocol`
  - `~~Context`: primary node, signal label, signal score, impact direction
  - and, when relevant, `~~Performance`
- `~SAOcommons`
  - activated when performance context is selected, including domain and validation flows

In other words, Time Slice is the value-capture event band that feeds wellbeing and commons activation.

### 5. Impact
The committed action becomes visual impact.

A photon drop, ripple, and return loop update the person state, then flow upward:

- person alignment
- organization activation
- system-level restoration

That loop is the heart of the project.

---

## The Full Narrative Loop

1. `System`: see the imbalance and select a brick
2. `Organization`: enter the block and choose a person
3. `Person`: inspect the identity stack
4. `Time Slice`: record a real value action
5. `Impact`: play the result back into the person
6. `Organization`: show aura contagion and organizational activation
7. `System`: return with a radiant brick and visible community uplift
8. `Bridge`: if enough aligned value accumulates, structural extraction can crack and collapse

This is the project’s working thesis in interactive form:

`personal alignment -> organizational integrity -> systemic restoration`

---

## Core Scene Architecture

### `src/game/iov/IovTopologyScene.ts`
Macro world map of the system.

Responsibilities:

- render Market / State / Community / Bridge
- show large-scale imbalance
- handle reclaim and transfer interactions
- stage bridge stress and collapse
- receive activation from lower layers

### `src/game/iov/BlockInteriorScene.ts`
Organization interior scene.

Responsibilities:

- show people inside one block
- humanize the institution
- display activation contagion after person impact

### `src/game/iov/PersonIdentityScene.ts`
Person wellbeing-identity scene.

Responsibilities:

- show the canonical wellbeing-identity layers
- reflect wellbeing changes
- visualize aura strength and identity shifts

### `src/game/iov/ValueLogScene.ts`
Time Slice and value-capture interface.

Responsibilities:

- capture `~ValueCaptureProtocol`, `~WellbeingProtocol`, and `~SAOcommons` inputs
- translate lived effort into structured causal input
- hand off to the impact layer

### `src/game/iov/PersonImpactScene.ts`
Transition and results scene.

Responsibilities:

- photon drop
- ripple propagation
- state update before returning to the person/org/system chain

### `src/game/iov/IovSemanticZoomController.ts`
Semantic state machine.

Responsibilities:

- move the user through `topology -> block -> person -> valuelog -> impact -> orgimpact -> topology`
- keep narrative progression coherent

---

## Current Feature Set

- 3D macro topology with Market / State / Community / Bridge regions
- log-scale value tower mapping
- organization brick selection and reclaim flow
- person selection inside block interiors
- identity stack inspection and wellbeing update loop
- Time Slice action capture flow
- photon-drop impact transition
- organization activation contagion
- system-impact return flow with visible community uplift
- bridge break sequence with staged timing
- presenter mode / cleaner demo framing
- contextual scene panels and anchored action cards
- mobile-aware panel behavior and breadcrumb navigation

---

## Data Model

Primary values source:

- `public/data/iov_values.json`

This file drives system-level value representation for:

- `market`
- `state`
- `community`
- notes and source metadata

Null values render as `TBD`.

Scene scale uses log mapping so very large numbers remain legible in one frame:

```text
height = multiplier * log10(value + 1)
```

---

## Visual Language

Region identity colors:

- `Market`: deep blue
- `State`: burnt brown
- `Community`: yellow
- `Bridge`: graphite

Top-layer and capture cues can use gold accents.

State transitions should read through:

- glow
- pulse
- outline

before any recolor logic is applied.

---

## Tech Stack

- `React 18`
- `Three.js`
- `TypeScript`
- `Vite`
- `Vitest`

This repository is intentionally scene-driven. It is not a generic charting app. It is a narrative systems simulation.

---

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm run test -- --run
```

---

## Project Structure

```text
src/
  components/
    IovTopologyCanvas.tsx
  game/
    iov/
      IovTopologyScene.ts
      BlockInteriorScene.ts
      PersonIdentityScene.ts
      ValueLogScene.ts
      PersonImpactScene.ts
      IovCameraDirector.ts
      IovSemanticZoomController.ts
      PersonStateEngine.ts
      iovTimelogs.ts
      iov.topology.json
      iovValues.ts
      iovNarrativeConfig.ts
  ui/
    IovTopologyPanel.tsx
public/
  data/
    iov_values.json
docs/
  IOV_DESIGN.md
  IOV_SEMANTIC_ZOOM_PROJECT.md
  LLM_HANDOFF_CONTEXT.md
```

---

## Documentation

If you want the deeper design and implementation context, start here:

- [docs/IOV_DESIGN.md](docs/IOV_DESIGN.md)
- [docs/IOV_SEMANTIC_ZOOM_PROJECT.md](docs/IOV_SEMANTIC_ZOOM_PROJECT.md)
- [docs/LLM_HANDOFF_CONTEXT.md](docs/LLM_HANDOFF_CONTEXT.md)

---

## Join The Build

This repository is part of a larger attempt to make value legible, participatory, and restorative.

If this resonates with you, join the movement:

- explore and share [The Internet of Value](https://www.TheInternetOfValue.xyz)
- connect with [Moses Sam Paul](https://www.linkedin.com/in/mosessampaul/)
- open an issue with ideas, critiques, edge cases, or ecosystem references
- contribute code, design, systems thinking, narrative design, data modeling, or movement strategy

The strongest contributions to this project will likely come from people working across more than one domain:

- systems thinkers
- game designers
- economists
- civic designers
- community builders
- developers
- storytellers

If you care about building post-extractive systems, this project is for you.

---

## Status

The project is active and evolving. The current priority is improving scene readability, narrative coherence, and the causal clarity of the person-to-system loop.
