# Wellbeing Identity Product Bible v0.1

## Product Thesis

Wellbeing Identity is a mobile-first identity exploration app where people map who they are becoming.

The product uses the Internet of Value wellbeing identity protocol underneath, but the user experience must feel human before it feels technical.

Core rule:

```text
The protocol is underneath. The person is on top.
```

The current `PersonIdentityScene` proves the system logic: a person at the center, identity layers orbiting them, time entering as action, and disclosure controlling what leaves the system. The next product step is to make that system emotionally obvious.

The app should not say:

```text
Here is a 3D identity system.
```

It should make the user feel:

```text
This is me.
```

## Target User

The first target user is not a protocol expert.

The first target user is someone who wants a clearer relationship with:

- who they are,
- what they have built,
- which labels they have borrowed from institutions and platforms,
- what they value,
- what they can actually do,
- what story they are living inside,
- how they are doing right now,
- and what they choose to reveal.

Likely early users:

- founders, creators, students, community builders, independent workers, and reflective professionals,
- people rebuilding identity after a transition,
- people who feel fragmented across resumes, platforms, communities, and private life,
- people who want a more sovereign alternative to public profiles and algorithmic labels.

The app should be useful privately before it becomes useful publicly.

## Product Category

This is not a productivity app, journaling app, meditation app, resume builder, or crypto wallet.

It is closer to:

- a self-concept reconstruction tool,
- a personal wellbeing mirror,
- a game-like identity map,
- a consent-aware profile builder,
- and a meaning-tracking layer for daily action.

People change when they can see themselves clearly, act differently in small ways, and watch their identity update through evidence.

The core loop:

```text
Reveal -> Reflect -> Name -> Log -> See Change -> Choose Disclosure
```

Avoid this loop:

```text
Read concept -> fill form -> complete layer -> unlock next schema
```

## Canonical Product Metaphor

Keep the constellation/orbit model.

It gives the app a durable visual grammar:

```text
Person = center
Identity layers = orbits
Facets = nodes
Time = action entering the system
IdentityState = aura / weather
Disclosure = boundary / gates
```

This can scale from private exploration to community verification later.

## Human-Facing Layer Language

Protocol terms remain canonical internally, but they should not be the primary UX labels during onboarding.

Use human-facing names first, protocol names second.

| User-facing layer | Protocol term | Emotional hook |
| --- | --- | --- |
| What I inherited | `~~GivenIdentity` | Before you chose anything, some things chose you. |
| What I built | `~~EarnedIdentity` | This is the part of you proven through effort. |
| What I borrow from systems | `~~RentedIdentity` | These labels are useful. But they are not sovereign. |
| What I refuse to betray | `~~MoralCompass` | Your values are most visible under pressure. |
| The story I live inside | `~~Story` | The story you repeat becomes the room you live in. |
| What I can actually do | `~~Skills` | Skill is identity with evidence. |
| How I am right now | `~~IdentityState` | Your state is not your identity. But it shapes what identity can express today. |
| What I choose to reveal | `~~ConsentAndDisclosure` | Privacy is not hiding. It is boundary intelligence. |

Do not make a new user tap `~~GivenIdentity`.

Make them tap:

```text
What I inherited
```

Then show the smaller protocol term underneath for canon learning.

## Canon Mapping

The app should maintain an explicit mapping from user-facing language to IoV protocol language.

### What I Inherited

Protocol:

```text
~~GivenIdentity
```

Canonical facets:

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

MVP-facing fields:

- name,
- place,
- language,
- family context,
- cultural inheritance,
- early expectations,
- unchosen constraints,
- inherited strengths.

Sensitive fields must be optional. Do not directly prompt for caste, religion, sexuality, medical history, political background, trauma, exact address, or family conflict in the MVP.

Use this copy:

```text
Add only what feels relevant and safe.
```

### What I Built

Protocol:

```text
~~EarnedIdentity
```

Canonical facets:

- `~~~Schooling`
- `~~~UG`
- `~~~PG`
- `~~~PhD`
- `~~~Certifications`
- `~~~WorkExperience`
- `~~~Portfolio`

MVP-facing fields:

- skills,
- completed projects,
- reputation,
- discipline,
- knowledge,
- craft,
- achievements,
- survived difficulty.

Product rule:

Earned identity must not privilege elite institutional signals over lived experience, craft, evidence, and repeated effort.

### What I Borrow From Systems

Protocol:

```text
~~RentedIdentity
```

Canonical facets:

- `~~~X`
- `~~~LinkedIn`
- `~~~YouTube`
- `~~~Instagram`
- `~~~Substack`
- `~~~GitHub`
- `~~~WebsiteHandles`

MVP-facing fields:

- job title,
- social media identity,
- professional label,
- platform rating,
- college or degree label,
- income bracket,
- follower count,
- algorithmic identity.

Product rule:

This layer should help users distinguish who they are from what systems temporarily call them.

### What I Refuse To Betray

Protocol:

```text
~~MoralCompass
```

Canonical facets:

- `~~~Virtues`
- `~~~Values`
- `~~~EthicalBoundaries`

MVP-facing fields:

- values,
- virtues,
- non-negotiables,
- boundaries,
- hard choices,
- tradeoff patterns.

### The Story I Live Inside

Protocol:

```text
~~Story
```

Canonical facets:

- `~~~Past`
- `~~~Now`
- `~~~Future`
- `~~~TurningPoints`
- `~~~Vision`

MVP-facing fields:

- past chapter,
- current chapter,
- future direction,
- turning point,
- recurring story,
- vision.

### What I Can Actually Do

Protocol:

```text
~~Skills
```

Canonical facets:

- `~~~HardSkills`
- `~~~SoftSkills`
- `~~~SkillLevel`
- `~~~SkillEvidence`
- `~~~SkillTrajectory`

MVP-facing fields:

- hard skills,
- soft skills,
- current level,
- proof,
- practice,
- growth path.

### How I Am Right Now

Protocol:

```text
~~IdentityState
```

Canonical facets:

- `~~~WellbeingScore`
- `~~~ScoreHistory`
- `~~~ProtocolConvergence`

MVP-facing fields:

- current state,
- energy,
- coherence,
- confidence,
- emotional charge,
- recent movement.

Product rule:

Never reduce the person to a score. Treat this layer as weather, signal, or trajectory, not a grade.

### What I Choose To Reveal

Protocol:

```text
~~ConsentAndDisclosure
```

Canonical facets:

- `~~~DisclosurePolicy`
- `~~~SelectiveDisclosure`
- `~~~RevocationState`

MVP-facing fields:

- private,
- visible,
- visible with proof,
- visible after verification,
- hidden forever.

Product rule:

Consent is not a settings page. It is part of the identity experience.

## Product Modes

### 1. Identity Walkthrough Mode

This is the first magical journey.

The user reveals the eight layers one by one. Each layer uses a human-facing name with the protocol term underneath.

Interaction contract:

- one layer visible as the primary action,
- one prompt per layer,
- one answer or facet per layer,
- one visibility choice per layer,
- always allow `skip for now`.

Button language:

- use `Reveal the next layer`,
- use `Continue inward`,
- avoid `Next Layer (1/8)`.

### 2. Facet Builder Mode

This is where identity becomes concrete.

Each layer contains facets the user can name, mark, protect, connect to proof, or leave private.

The app should help users see the difference between:

```text
Who I am
What I have built
What systems temporarily call me
```

### 3. ValueLog Mode

Do not introduce this as "logging" first.

Use this question:

```text
Which part of you did this hour serve?
```

Every action log should answer:

- What did you do?
- How long did it take?
- Which part of your identity did it strengthen?
- Which part did it drain?
- What proof exists, if any?
- How did your state change after?

Then the orbit/aura changes.

This gives the user a felt sense that identity is not biography. It is repeated time.

### 4. Share View Mode

This is the privacy and agency layer.

The app asks:

```text
What version of your identity do you want to disclose?
```

Initial share contexts:

- private only,
- share with friend,
- share with community,
- share with employer/client,
- share for verification.

Facet disclosure states:

```text
Private
Visible
Visible with proof
Visible after verification
Hidden forever
```

## First Magical Moments

### Magical Moment 1: The Full Map

The first major emotional payoff happens when the user completes one pass through all eight layers.

Copy:

```text
This is your current identity map. Not your final self. Your current configuration.
```

Show the full orbit map with each layer glowing differently based on completion, confidence, and emotional charge.

### Magical Moment 2: One Action Changes The Map

After the first map, ask:

```text
Which part of you did your last meaningful hour serve?
```

The user logs one action and sees `~~IdentityState` respond as aura, pulse, or weather.

### Magical Moment 3: Choose What The World Sees

The user creates a limited share view.

This makes the app socially useful without making it extractive.

## First-Time User Flow

Target completion time: under 12 minutes.

```text
1. Landing screen
   "Map who you are becoming."

2. Intro video
   60-90 seconds.
   Explain identity layers and time.

3. Choose mode
   Start guided walkthrough
   Explore freely

4. Reveal Layer 1
   Watch short video
   Answer 1 prompt
   Add 1 facet
   Choose visibility

5. Repeat for 8 layers
   Keep each layer under 2 minutes.

6. Generate Identity Map
   Show full orbit system.

7. First ValueLog
   "Which part of you did your last meaningful hour serve?"

8. Aura update
   IdentityState changes visibly.

9. Share View
   User selects what can be shown publicly.
```

MVP should not require essays.

One prompt per layer. One facet per layer. One action log.

## Video Pattern

Videos should unlock action. They should not explain the whole philosophy.

Length:

```text
45-75 seconds per layer
```

Structure:

```text
1. What this layer means
2. Why it matters
3. One example
4. One question for the user
```

Example for `What I borrow from systems`:

```text
Some identities are not owned. They are rented from systems.
Your job title, follower count, platform rating, income bracket, and degree can be useful.
But they become dangerous when mistaken for the whole self.
In this layer, we separate what systems call you from what your life actually proves.
Question: Which label currently has too much power over how you see yourself?
```

## Long-Term Behaviour Loop

Do not ask users to log everything.

Ask for one meaningful action.

```text
Daily: log one meaningful action
Weekly: review identity drift
Monthly: update one facet
Quarterly: generate a new identity snapshot
```

Habit:

```text
One action. One identity signal. One state change.
```

The app is not competing with time trackers or calendars. It is building a meaning-tracking layer.

## Visual System

Keep the orbit system, but give every ring symbolic behavior.

| Layer | Visual behavior |
| --- | --- |
| What I inherited | gold roots / inherited foundation ring |
| What I built | blue constructed ring / earned structure |
| What I borrow from systems | silver flickering borrowed labels / satellites |
| What I refuse to betray | vertical axis / directional pulse |
| The story I live inside | flowing thread / narrative arc |
| What I can actually do | geometric nodes / capability lattice |
| How I am right now | aura / weather field |
| What I choose to reveal | boundary shield / gates |

The central figure should be personal but anonymous:

- soft human silhouette,
- gender-neutral,
- abstract,
- slight breathing animation,
- no face,
- body as vessel, not token.

Avoid a generic low-poly placeholder as the long-term center.

## UX Language Changes

Replace internal control language with narrative language.

| Avoid | Use |
| --- | --- |
| `Next Layer` | `Reveal the next layer` |
| `Next Layer (1/8)` | `Continue inward` |
| `Complete Layers to Open Time Slice` | `Complete your map to unlock your first action log` |
| `Back to Org` | `Return to Identity Map` |
| `TimeSlice` | `Action Log` in UX, `TimeSlice` internally |
| `ValueLog` | `Meaningful Action` in UX, `ValueLog` internally |

## MVP Scope

Build a vertical slice first.

### Vertical Slice 1: One Complete Layer

Start with `What I borrow from systems`.

Why:

It is instantly understandable and emotionally sharp. People know they are more than their job title, LinkedIn bio, income, follower count, or family role.

Flow:

```text
Enter world
-> Tap "What systems call me"
-> Watch 60 second video
-> Add 3 rented labels
-> Mark each as Useful / Heavy / Expired
-> Choose visibility
-> See ring activate
```

### Vertical Slice 2: Full Map Without Deep Data

Let users reveal all eight layers with one answer each.

### Vertical Slice 3: One ValueLog Changes Aura

The user logs one meaningful action and sees the identity aura change.

If the aura change feels meaningful, continue. If it feels gimmicky, fix this before building more.

## Verification Policy

Do not launch formal verification in MVP.

Initial statuses:

```text
Self-declared
Evidence attached
```

Future status:

```text
Verified by IoV
```

Only launch `Verified by IoV` after there is:

- reviewer policy,
- appeal process,
- false claim handling,
- data retention policy,
- consent model,
- clear verification criteria,
- human review workflow.

## Privacy And Sensitive Data

Given identity can include sensitive material, but the product must not require it.

MVP should avoid directly prompting for:

- caste,
- religion,
- sexuality,
- medical history,
- political background,
- trauma,
- exact address,
- family conflict.

Users may add sensitive context voluntarily later, but only inside clear privacy boundaries.

Core copy:

```text
Add only what feels relevant and safe.
```

## What Not To Build Yet

Do not build these in the first prototype:

- deep platform imports,
- official identity verification,
- public identity marketplace,
- social feed,
- leaderboards,
- employer dashboard,
- complex scoring engine,
- AI judgment of identity quality,
- forced completion,
- mandatory sensitive fields,
- blockchain wallet dependency,
- full IoV protocol browser in the consumer UI.

## Repository Recommendation

Create a new repo for the standalone app:

```text
iov-identity-explorer/
```

Recommended structure:

```text
apps/
  web-mobile/
    src/
      app/
      components/
      scenes/
      flows/
      content/
      state/

packages/
  identity-core/
    schemas/
    scoring/
    disclosure/
    valuelog/
    adapters/

  iov-spec-adapter/
    mappings/
    version-lock.ts

docs/
  product-spec.md
  ux-principles.md
  data-model.md
  canon-mapping.md
  privacy-model.md
  mvp-roadmap.md
```

Key rule:

The new app should be canon-aligned, not canon-dependent at runtime.

The most important file:

```text
docs/canon-mapping.md
```

It should map every human-facing term to the protocol term.

## Evaluation Criteria

The prototype succeeds if:

- a user understands the eight-layer model without needing protocol knowledge,
- a user can complete first onboarding in under 12 minutes,
- a user feels emotionally recognized by the map,
- a user logs one meaningful action and sees a clear state change,
- a user understands that they control disclosure,
- protocol terms are available but not intrusive,
- no sensitive field is required,
- the visual system feels like a mirror, not an admin console.

## Next Codex Build Prompt

Use this prompt when starting the new repo:

```text
Create a new repo called iov-identity-explorer.

Build a mobile-first web app prototype using the existing orbit/constellation scene as the base interaction model.

Do not expose protocol terms as primary UX labels. Use human-facing names and map them internally to iov-spec terms.

Implement one complete vertical slice:
- intro screen
- identity world
- eight-layer reveal
- one prompt per layer
- one facet saved per layer
- identity map completion state
- one ValueLog action
- visible IdentityState aura change
- disclosure choice per facet

Create canon-mapping.md and keep all protocol mappings explicit.
```

## Final Product Rule

The prototype currently shows the machine.

The app must show the mirror.
