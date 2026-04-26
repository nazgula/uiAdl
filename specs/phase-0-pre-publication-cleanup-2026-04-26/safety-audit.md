# Public-safety Audit — Phase 0b

Date: 2026-04-26
Scope: secrets, hardcoded URLs/paths, runtime data, `.gitignore` coverage. Pre-publication audit before the repo is made public.

## 1. Secrets

| Check | Result |
|---|---|
| `grep -rI "sk-ant"` in tracked source | only placeholder `sk-ant-...` text in CLAUDE.md, plan.md, validation.md (docs/specs) — no real keys |
| `git log -p --all -S "sk-ant-"` (history scan) | only the same docs/specs hits — no real key ever committed |
| `git log --all -- .env` | no commits — `.env` was never tracked |
| `ANTHROPIC_API_KEY` references | only `process.env.ANTHROPIC_API_KEY` in `server.js` (proxy reads server-side, never sent to browser) |

**Verdict**: clean.

## 2. Hardcoded URLs / paths in source

| Hit | File:Line | Assessment |
|---|---|---|
| `https://api.anthropic.com/v1/messages` | `server.js:10` | required public API endpoint |
| `https://cdn.tailwindcss.com` | `index.html:7` | required public CDN |
| `https://…/project.json` | `index.html:29` | placeholder text in input — not a real URL |
| `http://localhost:${PORT}` | `server.js:156` | startup log line — fine |
| `/Users/gula/projects/uiAdl/renders/...` | `.claude/settings.local.json:8` | gitignored via global `~/.config/git/ignore` (`**/.claude/settings.local.json`); confirmed not tracked. Only `.claude/skills/*/SKILL.md` files are tracked under `.claude/`. |

**Verdict**: clean. No internal hostnames, no leaked filesystem paths in tracked files.

## 3. `package.json`

```
name: "pdl"
version: "1.0.0"
description: "PDL — Project Decision List tool for rapid UI prototyping"
scripts: { start: "node server.js" }
dependencies: dotenv, express
```

No `author`, `repository`, or `license` field. To be added in sub-phase 0e.

## 4. Runtime data review (`projects/`, `renders/`)

`projects/` contains: `job_hund.json` — concept Chrome extension for finding fitting job roles from a CV. Generic feature description. No client/company/personal context.

`renders/job_hund/` — 4 saved renders + 2 reasoning files. Reasoning content uses model-generated placeholder names (`john_resume.pdf`, `TechCorp`, sample percentages). No real names, no personal data.

**Verdict**: nothing personal surfaced — matches the user's expectation. No pause-and-ask required.

## 5. `.gitignore` coverage

Current contents:

```
config.json
.env
.DS_Store
node_modules/
projects/
renders/
__pycache__/
```

Required (from plan): `.env`, `node_modules/`, `projects/`, `renders/`, `config.json` — all present. ✓

**Verdict**: complete; no additions needed.

## Summary

Repo is safe to publish from a secrets/personal-data standpoint. The only required follow-up is in sub-phase 0e (`package.json` license + repo metadata).
