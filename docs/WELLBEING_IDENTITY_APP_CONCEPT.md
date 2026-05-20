# Wellbeing Identity Exploration App

## Purpose

This document describes how the current `Person` identity screen could become a standalone app where people explore, create, and evolve their wellbeing identity.

The idea is strong because it turns identity from a static profile into a living, explorable system. Most identity products ask: "Who are you?" This app can ask something deeper:

```text
What makes you you, what is changing, what do you consent to reveal, and how does daily action shape your wellbeing?
```

The app should feel like an identity garden, constellation, or inner world rather than a form. It can still produce structured protocol data, but the user's first experience should be exploration, reflection, and agency.

## Core Product Idea

The app is a game-like identity exploration experience based on the Internet of Value wellbeing identity protocol.

Users build a personal identity map across eight canonical layers:

1. `~~GivenIdentity`
2. `~~EarnedIdentity`
3. `~~RentedIdentity`
4. `~~MoralCompass`
5. `~~Story`
6. `~~Skills`
7. `~~IdentityState`
8. `~~ConsentAndDisclosure`

Each layer contains smaller facets. A user can inspect, fill, protect, evolve, or connect those facets. Over time, daily value logs and wellbeing signals update the live `~~IdentityState`.

The product should avoid feeling like a resume builder, therapy app, or crypto wallet. It is closer to:

- a guided self-knowledge game,
- a personal wellbeing mirror,
- a consent-aware identity vault,
- a living proof-of-contribution map,
- and a narrative system for understanding how action changes identity.

## Why This Matters

Identity is usually fragmented:

- government identity lives in documents,
- professional identity lives on LinkedIn or resumes,
- social identity lives on platforms,
- moral identity lives privately,
- story identity lives in memory,
- skills identity lives across artifacts,
- wellbeing identity is rarely tracked coherently,
- consent identity is often ignored.

The wellbeing identity protocol gives us a way to bring these into one coherent map without flattening the person into one score.

The product thesis:

```text
People should be able to see, shape, and selectively reveal their identity across wellbeing, contribution, consent, and lived story.
```

## Current Screen Interpretation

The current `PersonIdentityScene` already contains the seed of the app.

It renders:

- a central person identity core,
- concentric identity rings,
- orbiting facet nodes,
- layer labels,
- hover/focus tooltips,
- progressive layer reveal,
- wellbeing score,
- aura strength,
- direct impact layers,
- derived impact layers,
- selected layer/facet context,
- and a transition into `Time Slice` action logging.

In the current IoV topology app, this screen is one step in a larger system loop:

```text
System -> Organization -> Person -> Time Slice -> Impact
```

For a standalone identity app, this screen becomes the main world.

## The Eight Protocol Layers

### 1. `~~GivenIdentity`

Inherited or assigned identity.

Facets:

- `~~~FullName`
- `~~~NationalId`
- `~~~BirthDate`
- `~~~BirthPlace`
- `~~~Sex`
- `~~~Language`
- `~~~Nationality`
- `~~~Citizenship`
- `~~~Religion`
- `~~~Genetics`
- `~~~DID`

Product meaning:

This is the baseline identity a person starts with. Some parts are legal, some biological, some cultural, some technical. The app should treat this layer carefully because it contains sensitive information.

Game/exploration treatment:

- reveal as foundation stones or root markers,
- let users mark facets as private, verified, unknown, or intentionally undisclosed,
- avoid forcing completion,
- use consent controls early.

### 2. `~~EarnedIdentity`

Identity built through effort, learning, and demonstrated capability.

Facets:

- `~~~Schooling`
- `~~~UG`
- `~~~PG`
- `~~~PhD`
- `~~~Certifications`
- `~~~WorkExperience`
- `~~~Portfolio`

Product meaning:

This is the layer of earned credibility. It should not be limited to elite institutional signals. Work, lived experience, craft, informal learning, and visible artifacts should matter.

Game/exploration treatment:

- quests for adding proof,
- artifact cards,
- skill trees connected to evidence,
- progress paths that reward demonstrated work rather than credentials alone.

### 3. `~~RentedIdentity`

Identity borrowed from platforms and networks.

Facets:

- `~~~X`
- `~~~LinkedIn`
- `~~~YouTube`
- `~~~Instagram`
- `~~~Substack`
- `~~~GitHub`
- `~~~WebsiteHandles`

Product meaning:

This is externally hosted identity: audience, handles, reputation, distribution, and platform presence. It is useful but fragile because the person does not fully own the platform.

Game/exploration treatment:

- show as orbiting satellites,
- indicate owned vs rented surface,
- let users connect/import links,
- show dependency risk and portability options.

### 4. `~~MoralCompass`

Values, virtues, and ethical boundaries.

Facets:

- `~~~Virtues`
- `~~~Values`
- `~~~EthicalBoundaries`

Product meaning:

This layer answers: what guides action when nobody is watching, when incentives conflict, or when tradeoffs are hard?

Game/exploration treatment:

- values sorting,
- dilemma cards,
- "would you rather" ethical choices,
- boundary setting,
- reflection prompts after real actions.

### 5. `~~Story`

The narrative continuity of the self.

Facets:

- `~~~Past`
- `~~~Now`
- `~~~Future`
- `~~~TurningPoints`
- `~~~Vision`

Product meaning:

Story creates coherence across time. It helps a user understand where they came from, what is true now, where they are going, and which moments changed them.

Game/exploration treatment:

- timeline map,
- chapter cards,
- turning point quests,
- future vision boards,
- reflective prompts after major logs.

### 6. `~~Skills`

The capacity to act.

Facets:

- `~~~HardSkills`
- `~~~SoftSkills`
- `~~~SkillLevel`
- `~~~SkillEvidence`
- `~~~SkillTrajectory`

Product meaning:

Skills translate identity into execution. This layer should connect to earned identity, daily logs, and visible proof.

Game/exploration treatment:

- skill constellations,
- evidence-based leveling,
- practice streaks,
- peer validation,
- skill trajectory graph.

### 7. `~~IdentityState`

The live identity and wellbeing signal.

Facets:

- `~~~WellbeingScore`
- `~~~ScoreHistory`
- `~~~ProtocolConvergence`

Product meaning:

This is not the whole person. It is a living state layer showing how aligned, coherent, and well the person currently is across protocol signals.

Game/exploration treatment:

- aura strength,
- wellbeing weather,
- score history as a pulse or tide,
- convergence meter,
- visible impact from logged actions.

Important design rule:

Do not reduce the person to this score. Use it as feedback, not judgment.

### 8. `~~ConsentAndDisclosure`

What can be shared, with whom, and when it can be revoked.

Facets:

- `~~~DisclosurePolicy`
- `~~~SelectiveDisclosure`
- `~~~RevocationState`

Product meaning:

This is what makes the identity app ethically different. The user should not merely create an identity; they should control its disclosure.

Game/exploration treatment:

- privacy locks,
- consent gates,
- shareable identity cards,
- temporary disclosure passes,
- revocation history,
- "show this, hide that" preview mode.

## Core Experience Loop

The app can use a simple loop:

```text
Explore -> Reflect -> Add Evidence -> Log Action -> See Impact -> Choose Disclosure
```

In product terms:

1. User enters their identity world.
2. They choose one layer to explore.
3. They inspect or fill one facet.
4. They add a reflection, proof, or action.
5. The app updates `~~IdentityState`.
6. The user chooses what stays private and what can be shared.

This loop can repeat daily without feeling like a form.

## Game Structure

### Mode 1: Guided Discovery

For first-time users.

Goal:

Help the user understand the eight layers without overwhelming them.

Mechanics:

- one layer unlocked at a time,
- short prompts,
- visual reveal,
- no forced completion,
- "skip for now" always available.

### Mode 2: Identity Map

For returning users.

Goal:

Let the user navigate their whole identity system.

Mechanics:

- orbit map / constellation view,
- clickable layers and facets,
- completion/verification/private indicators,
- search and filter,
- recent changes.

### Mode 3: Daily Value Log

For behavior and wellbeing evolution.

Goal:

Connect daily action to identity and wellbeing.

Mechanics:

- choose a time slice,
- describe an action,
- attach proof,
- select wellbeing context,
- see effect on `~~IdentityState`, `~~Story`, and `~~Skills`.

### Mode 4: Reflection Quests

For deeper self-knowledge.

Goal:

Use prompts and challenges to help people develop moral, story, and skill clarity.

Example quests:

- "Name one boundary you honored this week."
- "What skill did you practice today?"
- "What turning point still shapes your current choices?"
- "Which platform identity feels least owned by you?"

### Mode 5: Disclosure Builder

For sharing identity safely.

Goal:

Let users create selective identity views for different contexts.

Example outputs:

- public profile,
- collaborator profile,
- mentor profile,
- investor/employer profile,
- community contribution profile,
- private self-only profile.

## Visual Direction

The app should be visual-first.

Possible metaphors:

- identity solar system,
- living tree,
- inner city,
- constellation,
- layered temple,
- personal operating system.

Recommended direction:

Use a **constellation / orbit system** for early versions because it matches the existing scene implementation:

- central identity core,
- eight rings/layers,
- facet nodes orbiting each layer,
- aura field around current state,
- action logs entering as light pulses,
- disclosure boundaries as visible shields or gates.

## UX Principles

1. Scene first, form second.
2. One prompt at a time.
3. User controls depth.
4. Sensitive data is optional.
5. Consent is always visible.
6. Scores explain; they do not judge.
7. Proof and story both matter.
8. Identity can evolve.
9. Private exploration is a valid outcome.
10. Sharing is explicit, scoped, and revocable.

## Data Model Sketch

Each user identity can be represented as:

```text
WellbeingIdentity
  GivenIdentity
  EarnedIdentity
  RentedIdentity
  MoralCompass
  Story
  Skills
  IdentityState
  ConsentAndDisclosure
```

Each facet can have:

```text
Facet
  value
  confidence
  verification_status
  proof_links
  visibility_policy
  last_updated
  user_notes
```

Each logged action can update:

```text
ValueLog
  TimeSlice
  Activity
  Proof
  WellbecomingContext
  ImpactDirection
  IdentityStateDelta
```

## MVP Proposal

Build the first standalone version around three flows:

### Flow 1: Build My Identity Map

User reveals all eight layers and adds at least one facet per layer.

### Flow 2: Log One Action

User records one real action and sees the identity/aura response.

### Flow 3: Create A Share View

User chooses which facets to disclose and generates a scoped identity card.

MVP success criteria:

- user understands the eight-layer model,
- user feels agency over what is private,
- user sees that daily action changes identity state,
- user can share a limited identity view without exposing everything.

## Product Risks

### Risk 1: It feels like a form

Mitigation:

Use scene-first exploration, progressive reveal, and quests.

### Risk 2: It feels too abstract

Mitigation:

Each layer needs concrete examples and prompts.

### Risk 3: It feels invasive

Mitigation:

Make every sensitive facet optional and consent-governed.

### Risk 4: Score anxiety

Mitigation:

Frame `~~IdentityState` as weather, signal, or trajectory rather than a grade.

### Risk 5: Platform import complexity

Mitigation:

Start with manual links and proof artifacts before deep integrations.

## Open Design Questions

1. Is this primarily private self-exploration, or also a public identity profile?
2. Should users create multiple identities for different contexts?
3. How much verification is required before sharing?
4. Should the app support anonymous/pseudonymous identity?
5. What parts of `~~GivenIdentity` should be avoided in the MVP for safety?
6. How should wellbeing scoring be explained without feeling reductive?
7. What is the first magical moment: seeing the full map, logging an action, or creating a consent-safe share card?

## Recommended Next Step

Prototype a standalone `Identity Explorer` app with one complete vertical slice:

```text
Enter identity world -> reveal eight layers -> select one facet -> answer one prompt -> log one action -> see IdentityState aura change -> choose disclosure setting
```

This is enough to test whether users understand the model and feel emotionally pulled into the experience.

