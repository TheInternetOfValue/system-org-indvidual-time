# Internet of Value Topology Documentation

This folder is the documentation hub for the interactive Internet of Value topology app.

If you are new to the repo, read the files in this order.

## 1. Start Here

- [`../README.md`](../README.md): plain-language overview of the product, narrative loop, scenes, data model, and local development commands.
- [`IOV_DESIGN.md`](IOV_DESIGN.md): main design and implementation notes for scene architecture, scale mapping, motion semantics, color rules, mobile behavior, and contextual panels.

## 2. Product And Story

- [`IOV_SEMANTIC_ZOOM_PROJECT.md`](IOV_SEMANTIC_ZOOM_PROJECT.md): living project document for the semantic zoom journey from System to Organization to Person to Time Slice to Impact.
- [`LLM_HANDOFF_CONTEXT.md`](LLM_HANDOFF_CONTEXT.md): concise handoff brief for future AI/dev passes, including current narrative vocabulary and implementation map.

## 3. Scene Quality Rules

- [`IOV_SCENE_VET_RULES.md`](IOV_SCENE_VET_RULES.md): checklist to use before merging scene/UI changes. This is the main QA gate for interaction clarity.
- [`IOV_CAMERA_SHOT_CONTRACT.md`](IOV_CAMERA_SHOT_CONTRACT.md): camera choreography contract for semantic transitions.
- [`IOV_COLOR_RENDERING.md`](IOV_COLOR_RENDERING.md): color rendering diagnosis, target palette semantics, and non-negotiable rendering rules.

## 4. Performance And Refactor History

- [`IOV_OPTIMIZATION_PROJECT.md`](IOV_OPTIMIZATION_PROJECT.md): optimization project log and completed performance phases.
- [`IOV_PERFORMANCE_REFACTOR_TASKBOARD.md`](IOV_PERFORMANCE_REFACTOR_TASKBOARD.md): detailed performance refactor taskboard, metrics, and follow-up UX passes.

## 5. Deployment

- [`DEPLOYMENT.md`](DEPLOYMENT.md): how GitHub and Netlify publishing work for this repo.

## Current Runtime Vocabulary

Use these names consistently in docs, UI, and commit messages:

- `System`: macro topology of Market, State, Community, and Crony Bridge.
- `Organization`: interior of one selected brick or institution.
- `Person`: wellbeing and identity stack for one human.
- `Time Slice`: action/value capture event.
- `Impact`: visual transition where action becomes wellbeing/aura change.
- `Org Impact`: aura contagion across the organization.
- `System Impact`: community uplift and bridge stress/collapse response.

## Current Narrative Loop

```text
System -> Organization -> Person -> Time Slice -> Impact -> Org Impact -> System Impact
```

The core thesis is:

```text
personal alignment -> organizational integrity -> systemic restoration
```

## Before Changing UI Or Scenes

Use this short checklist:

1. Confirm the scene name and next action are visible inside the game area.
2. Keep the side panel as context/fallback, not the only instruction source.
3. Preserve one primary action at a time.
4. Keep mobile tap targets reachable.
5. Run:

```bash
npm run test -- --run
npm run build
```

