# Phase 0 — Pre-publication Cleanup

## Goal

Get PDL (also known as PSL UI) into a clean, publicly-shareable state before the repo is made public. The repo should be safe to publish, documented in a way an engineer can read seriously, and demonstrate real engineering practice (E2E tests, no-build vanilla JS discipline, AI integration patterns).

## README audience

The README should read well to a frontend senior engineer skimming the repo. Surface choices that signal engineering substance over polish:

- Real E2E tests covering user flows (not button-existence checks)
- Vanilla JS / no-bundler discipline
- AI integration: server-side proxy, prompt construction, reasoning extraction
- Spec-driven development visible in repo structure (`specs/`, this folder)
- Honest "what I learned" notes — directness is the differentiator

## Scope

All of Phase 0 (sub-phases 0a–0e) in `specs/roadmap.md`. Each sub-phase ships as its own atomic commit on the `phase-0-pre-publication-cleanup` branch.

In scope:
- 0a — Code fixes: orphaned reasoning files on delete, CSS-output drift audit
- 0b — Public-safety audit: secrets, history, personal content, `.gitignore` coverage
- 0c — Playwright E2E tests: 5–8 user-flow tests with mocked Anthropic API
- 0d — README: structure per briefing v2, written from actual code state
- 0e — Repo metadata: license (MIT), `package.json` fields, GitHub description/topics

Out of scope (deferred to Phase 1+):
- Reasoning quality loop / grading
- Two-round generation
- Section selection
- Any product feature changes
- Any prompt-design or generation-logic changes

## Hard constraints

From `pdl_claude_code_briefing_v2.md` and `specs/tech-stack.md`:

- No TypeScript anywhere (Playwright config is `.js`)
- No build step
- No new framework or bundler
- No product feature changes — if a bug is found while testing, write the test that exposes it and flag it; do not fix unless it's the in-scope 0a item
- Do not refactor architecture
- Do not change the prompt design or generation logic
- Do not change the visual style of the UI
- Do not suggest UX improvements
- Do not modify product code to make tests easier
- Do not run `gh repo edit --visibility public` — the user makes the repo public herself
- No marketing copy, badges, or emojis in the README
- Do not invent README features that don't exist in the code

## Decisions

- **Branch**: `phase-0-pre-publication-cleanup` (already created)
- **Commit style**: one atomic commit per sub-phase (0a, 0b, 0c, 0d, 0e)
- **License**: MIT, copyright holder line uses the project name (`PDL` / `PSL UI`) — this is a personal tool, no individual name needed
- **README authoring**: Claude writes it from current code + roadmap; user reviews
- **Screenshot/GIF**: placeholder path with TODO note; user drops file in later
- **Test mocking**: Playwright `route()` intercepts `/api/generate` and returns canned `<reasoning>...</reasoning>` + minimal HTML — no real Anthropic calls
- **Personal-data review**: user expects nothing personal will turn up. If the 0b scan does surface anything (real client/company name, personal context in a project or decision), **pause and ask** before any other action.

## Open questions for user (resolve during execution)

- If 0a CSS audit shows real drift toward polished output (not wireframe), flag and stop — fixing is a Phase 2 concern (Two-Round Generation), not Phase 0.

## Reference

- `pdl_claude_code_briefing_v2.md` — original task brief
- `specs/roadmap.md` — Phase 0 task list (source of truth for sub-tasks)
- `specs/mission.md` — what "good" looks like
- `specs/tech-stack.md` — stack constraints
