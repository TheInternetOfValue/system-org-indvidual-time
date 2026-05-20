# Deployment

This repo publishes through GitHub and Netlify.

## Production Site

Netlify project:

- `system-org-individual-time`
- production URL: `https://system-org-individual-time.netlify.app`

Netlify production deploys from the GitHub `main` branch.

That means:

- changes pushed to a feature branch are on GitHub, but are not production yet;
- changes appear on Netlify production after they are merged or pushed into `main`;
- Netlify should automatically start a new deploy when `main` receives a new commit.

## Normal Publish Flow

Use this flow for code changes:

```bash
git checkout -b codex/my-change-name
npm run test -- --run
npm run build
git add .
git commit -m "short clear message"
git push -u origin codex/my-change-name
```

Then either:

- open a pull request and merge it into `main`, or
- if the change has already been reviewed locally and should go live immediately, merge the branch into `main` and push `main`.

## Immediate Production Publish

Only do this when the local app has been verified and the change should go live.

```bash
git checkout main
git pull --rebase origin main
git merge --no-ff codex/my-change-name -m "merge my change name"
git push origin main
```

After that, check Netlify deploys and look for the latest `main@<commit>` deploy.

## How To Confirm Netlify Picked It Up

1. Open Netlify project deploys.
2. Look for a deploy from `main`.
3. Confirm the commit hash matches local `git rev-parse --short HEAD`.
4. Wait for the deploy status to become `Published`.

## Useful Commands

Current branch:

```bash
git branch --show-current
```

Current commit:

```bash
git rev-parse --short HEAD
```

Working tree status:

```bash
git status -sb
```

