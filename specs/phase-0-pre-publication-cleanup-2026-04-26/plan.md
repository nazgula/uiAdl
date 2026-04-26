# Plan — Phase 0 Pre-publication Cleanup

Each numbered group is a single commit. Run in order — later groups assume earlier ones are clean.

Status: 0a [x], 0b [x], 0c [ ], 0d [ ], 0e [ ]

Legend: `[ ]` pending, `[~]` in progress, `[x]` done. Update both the heading checkbox and this Status line in the same edit when state changes.

## 1. [x] Code fixes (sub-phase 0a)

1.1 Fix orphaned reasoning files on render delete.
- In `server.js`, `DELETE /api/renders/:project/:id`: also unlink `{id}.reasoning.txt` if it exists.
- Update `meta.json` removal logic if `hasReasoning` flag needs cleanup.
- Manual check: save a render with reasoning, delete it, confirm both files gone.

1.2 Audit current CSS output for wireframe fidelity.
- Generate 2–3 renders against existing projects.
- Eyeball: gradients, drop shadows, polished colors, rounded buttons → that's drift.
- If drift is obvious, write findings into `specs/phase-0-pre-publication-cleanup-2026-04-26/css-audit.md` and stop. Do **not** fix here — that's Phase 2 (Two-Round Generation).
- If renders look wireframe-faithful, note that in the audit doc and move on.

**Commit**: `Phase 0a: fix orphaned reasoning files on render delete + CSS output audit`

---

## 2. [x] Public-safety audit (sub-phase 0b)

2.1 Source scan for secrets.
- `grep -r "sk-ant" .` (excluding `.env`, `node_modules`)
- `grep -rn "ANTHROPIC_API_KEY" --include="*.js" --include="*.html"` — confirm only `process.env.*` reads
- `git log --all -- .env` — confirm `.env` was never committed

2.2 Source scan for personal data.
- Hardcoded URLs, internal hostnames, absolute filesystem paths in `*.js`, `*.html`, `*.json`
- `package.json` author/repository fields

2.3 Runtime data review (`projects/`, `renders/`).
- List project names — flag any with real client/company/personal context
- Sample a few decision texts and reasoning blocks for sensitive content
- User does not expect anything personal to turn up. If something does (real names, company references, anything that looks personal), **pause execution and ask** what to do — do not auto-delete and do not bundle it into the audit summary.

2.4 `.gitignore` verification.
- Confirm coverage: `.env`, `node_modules/`, `projects/`, `renders/`, `config.json`
- Add anything missing.

**Commit**: `Phase 0b: public-safety audit (gitignore, secret scan, personal-data report)`
- Audit findings file goes in the spec folder, not the commit message.

---

## 3. [ ] Playwright E2E tests (sub-phase 0c)

3.1 Install + configure.
- `npm install -D @playwright/test`
- `npx playwright install chromium`
- Add scripts: `test:e2e` (`playwright test`), `test:e2e:ui` (`playwright test --ui`)
- Create `playwright.config.js` (NOT `.ts`):
  - `testDir: './tests/e2e'`
  - Single browser: chromium
  - `webServer`: `node server.js`, port 8080, reuse if running
  - `baseURL: 'http://localhost:8080'`

3.2 Test fixtures.
- `tests/e2e/fixtures/canned-generation.js` — exports a stub HTML+reasoning string used by `route()` mocks
- A throwaway project loaded via API in `beforeEach` so tests are isolated

3.3 Write 6 tests (picking from the 8-flow list in roadmap):
1. Add a decision (typed: entity)
2. Toggle a decision active/inactive
3. Generate UI with active decisions → wireframe HTML appears in iframe (mocked `/api/generate`)
4. Save the rendered output → appears in history
5. Rate a saved render good/bad
6. View saved render's reasoning via R button → Analysis tab shows text

Skip in this pass (note in a comment why):
- Error state (7) — covered indirectly when a test asserts no crash on empty
- Empty state (8) — trivial, low signal-to-effort for a senior reviewer

3.4 Each test asserts a user-observable outcome (text in DOM, iframe content, list count) — not class names or button existence.

3.5 Do **not** modify product code to make tests pass. If a test is hard to write because of a markup choice, write it the hard way and note untestable areas in a comment.

**Commit**: `Phase 0c: Playwright E2E tests for core flows with mocked Anthropic API`

---

## 4. [ ] README (sub-phase 0d)

4.1 Write `README.md` at repo root using exactly this structure (no extra sections). Template below — fill the bracketed parts from the actual code/state, do not paraphrase the un-bracketed parts:

```markdown
# PDL — Project Decision List

> A wireframe prototyping tool that generates HTML mockups from structured project decisions, using Claude as the generator.

![PDL screenshot](docs/screenshot.png)
<!-- TODO: add screenshot.png -->

## What it does

[1–2 paragraphs in plain language. What's the problem this solves? What does the user actually do? Pull from specs/mission.md; do not invent.]

## How it works

- **Decisions** are typed (entity, flow, ui, constraint) and toggleable
- **Generation** uses a two-stage prompt: first a `<reasoning>` block for structural planning, then the HTML
- **Reasoning** is stripped from the render but saved separately, so the user can inspect why a render came out the way it did
- A wireframe base stylesheet is injected into every render
- [Adjust based on what the code actually shows — do not invent features.]

## What I learned

- Giving the model a numbered spatial hierarchy degrades output — it flattens flows into spatial siblings and over-elaborates in wrong areas
- The CSS vocabulary approach (instructing the model to use predefined classes) doesn't save tokens — the model always rewrites CSS regardless
- The core unsolved problem: every generation is a fresh take. The model reinvents the architecture each time, so good renders can't be iterated on reliably

## Stack

Node/Express backend, single-page vanilla JS + Tailwind frontend, Anthropic Claude API. No build step. JSON file storage.

## Running locally

[Concrete steps based on the actual code: clone, npm install, set ANTHROPIC_API_KEY in .env, the actual start command (`node server.js`, port 8080).]

## Tests

[One paragraph. How to run the Playwright tests (`npm run test:e2e`). What they cover at a high level. That the Anthropic API is mocked, no real credits used.]
```

The "What I learned" bullets must appear verbatim — directness is the differentiator. Do not soften.

4.2 Constraints (hard):
- No badges, emojis, marketing copy
- Do not add sections beyond this structure
- Do not invent features the code doesn't have
- If unsure about anything, leave a `<!-- TODO -->` and ask user

**Commit**: `Phase 0d: README with structure, plain-language description, lessons learned`

---

## 5. [ ] Repo metadata + final checklist (sub-phase 0e)

5.1 License.
- Add `LICENSE` file with MIT text. Year 2026, copyright holder line: project name only (`PDL` or `PSL UI`) — personal tool, no individual name.

5.2 `package.json`.
- Confirm `description`: short, matches GitHub About text
- Confirm `repository.url`: ask user if remote isn't set yet
- `license: "MIT"`

5.3 GitHub metadata (only if remote exists).
- `gh repo edit --description "Wireframe prototyping tool. Generates HTML mockups from structured, toggleable decisions using Claude."`
- `gh repo edit --add-topic claude-api,wireframe,prototyping,playwright,nodejs`

5.4 Final checklist (verify before declaring done):
- No secrets in source or history
- `npm install && npm run test:e2e` passes on a clean checkout
- README renders sensibly in a markdown previewer (GitHub render verified after push)
- `.gitignore` covers all runtime data
- License file present
- **Do not run `gh repo edit --visibility public`** — user does this herself

**Commit**: `Phase 0e: MIT license, package.json metadata, GitHub repo description + topics`
