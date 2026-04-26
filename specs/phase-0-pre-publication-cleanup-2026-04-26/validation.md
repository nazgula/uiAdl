# Validation — Phase 0 Pre-publication Cleanup

The phase is mergeable when **all** of the following are true. Each section maps to a sub-phase commit.

## 0a — Code fixes

- Saving a render with reasoning, then deleting it, leaves no `.reasoning.txt` orphan in `renders/{slug}/`.
- `meta.json` no longer references the deleted render.
- `specs/phase-0-pre-publication-cleanup-2026-04-26/css-audit.md` exists with one of:
  - "Renders are wireframe-faithful — no action needed in Phase 0", OR
  - "Drift observed: [examples] — defer fix to Phase 2."
- No product behavior changes beyond the orphan-file fix.

## 0b — Public-safety audit

- `grep` shows no `sk-ant-...` literals in tracked source files.
- `git log --all -- .env` returns empty.
- `.gitignore` includes: `.env`, `node_modules/`, `projects/`, `renders/`, `config.json`.
- A findings report has been shown to the user covering: hardcoded paths/URLs, project names, decision content.
- If anything personal surfaced (real names, companies, sensitive content), execution paused and the user gave explicit instructions before continuing. Otherwise the audit can pass without deletion.
- No content is deleted without explicit user approval.

## 0c — Playwright E2E tests

- `npm install` on a fresh clone succeeds.
- `npx playwright install chromium` succeeds.
- `npm run test:e2e` exits 0 with all 6 tests passing.
- `playwright.config.js` exists (not `.ts`).
- Tests do not hit the real Anthropic API: a network log or `route()` assertion confirms `/api/generate` is intercepted.
- Each test asserts a user-observable outcome (text content, iframe presence, list state), not the existence of a button or class.
- No product code was changed to make a test pass. Any awkward selectors are commented as such.

## 0d — README

- `README.md` exists at repo root.
- Sections present in this exact order: title/one-liner, screenshot placeholder, What it does, How it works, What I learned, Stack, Running locally, Tests.
- No badges, emojis, or marketing language.
- "What I learned" section contains the three lessons from CLAUDE.md / roadmap (numbered hierarchy, CSS vocab tokens, fresh-take problem) — phrased directly, not softened.
- "How it works" describes only mechanics that exist in current code (verifiable against `server.js` and `index.html`).
- Running-locally steps work end-to-end on a clean checkout (manually verified once).

## 0e — Repo metadata + final

- `LICENSE` file present, MIT, copyright line uses the project name (`PDL` / `PSL UI`) — no individual name.
- `package.json` has non-empty `description`, `license: "MIT"`, and a `repository.url` (or a TODO if no remote yet).
- If GitHub remote exists: `gh repo view` shows the description and topics from the plan.
- Repo is **not** made public by Claude — user does this step herself.

## Cross-cutting checks (run before declaring the phase done)

1. Fresh clone test:
   ```
   git clone <repo> /tmp/pdl-fresh && cd /tmp/pdl-fresh
   npm install
   echo "ANTHROPIC_API_KEY=test" > .env
   npm run test:e2e   # passes
   node server.js     # boots, serves index.html
   ```
2. `git log` on the branch shows 5 atomic commits, one per sub-phase, with the messages from `plan.md`.
3. `git diff main...phase-0-pre-publication-cleanup` touches only:
   - `server.js` (delete-handler fix)
   - `package.json`, `package-lock.json` (Playwright dep)
   - `playwright.config.js`
   - `tests/e2e/**` (new)
   - `README.md` (new)
   - `LICENSE` (new)
   - `.gitignore` (only if missing entries were added)
   - `specs/roadmap.md` (phase title only)
   - `specs/phase-0-pre-publication-cleanup-2026-04-26/**` (this folder + css-audit.md)
4. No changes to: `index.html` (frontend logic), `wireframe.css`, prompt construction, generation logic, or anything in `projects/`/`renders/`.

## Out-of-scope work that surfaces during execution

If a real bug is found in product code while writing tests:
- Write the failing test that exposes it.
- Add a comment in the test referencing the bug.
- Add an entry to `specs/roadmap.md` under a new "Found during Phase 0" subsection.
- Do **not** fix the bug in this phase (unless it's the 0a orphan-file issue).
