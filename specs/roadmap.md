# Roadmap

Phases are kept small and sequential. Each phase should be shippable on its own.
Priority: ship fast, but fix gross problems before adding features.

---

## Phase 0 — Pre-publication Cleanup (NOW)

Get the project into a clean, shareable state before making the repo public. Sub-tasks must run in order.

### 0a — Code fixes (before going public)
- [x] Fix orphaned reasoning files: `DELETE /api/renders/:project/:id` does not delete `.reasoning.txt`
- [x] Audit current CSS output: are renders actually wireframe-style, or drifting toward polished UI?

### 0b — Public-safety audit (before any git push)
- [x] Confirm `ANTHROPIC_API_KEY` is loaded from `.env` only — not hardcoded anywhere in source
- [x] Check git history for any committed `.env` file (`git log --all -- .env`)
- [x] Look for hardcoded internal URLs, hostnames, or personal filesystem paths
- [x] Review `projects/` and `renders/` directories: flag any project names or decision text containing real client names, company names, or personal content — user decides what to clean
- [x] Verify `.gitignore` covers: `.env`, `node_modules/`, `projects/`, `renders/`, `config.json`
- [x] **Report findings before proceeding. Do not auto-delete anything.**

### 0c — Playwright E2E tests
- [x] Install: `npm install -D @playwright/test` + `npx playwright install chromium`
- [x] Add `test:e2e` and `test:e2e:ui` scripts to `package.json`
- [x] Create `playwright.config.js` (not `.ts` — no TypeScript in this project): single browser (chromium), `webServer` pointing to `node server.js`, `baseURL` at `localhost:8080`
- [x] Write 5–8 tests covering real user flows (not button-existence checks):
  1. Add a decision (entity, flow, ui, or constraint)
  2. Toggle a decision active/inactive
  3. Generate UI with active decisions → wireframe renders in iframe
  4. Save a render
  5. Rate a saved render good/bad
  6. View a saved render's reasoning (R button → Analysis tab)
  7. Error state when API call fails
  8. Empty state (no decisions, no saved renders)
- [x] Mock `/api/generate` with Playwright `route()` — no real API credits in tests
- [x] Do not modify product code to make tests pass. Note untestable areas in comments.

### 0d — README
- [x] Write `README.md` using the agreed structure:
  - One-line description
  - Screenshot or GIF placeholder (user provides)
  - "What it does" (1–2 paragraphs, plain language)
  - "How it works" (bullet list of real mechanics)
  - "What I learned" (pull from existing notes — directness is the differentiator)
  - Stack summary
  - Running locally (concrete steps)
  - Tests (how to run Playwright)
- [x] No badges, no emojis, no marketing copy. Do not invent features.

### 0e — Repo metadata + final checklist
- [x] Confirm `package.json` has `description` and `repository.url`
- [x] Confirm license file exists (MIT recommended); ask user if absent
- [x] Set GitHub repo description: *"Wireframe prototyping tool. Generates HTML mockups from structured, toggleable decisions using Claude."*
- [x] Set GitHub topics: `claude-api`, `wireframe`, `prototyping`, `playwright`, `nodejs`
- [x] Verify: no secrets committed, tests pass on fresh clone, README renders on GitHub
- [x] **User makes the repo public herself — do not run `gh repo edit --visibility public`**

---

## Phase 1 — UI Cleanup

Reduce surface area before the reasoning loop. Remove unused capabilities and tighten the render-area hierarchy so future phases build on a smaller, clearer foundation.

### 1a — Remove Refine PDL
- [x] Delete the "Refine Prompt" tab (button + panel) from the left panel
- [x] Delete `refinePDL()`, `setRefineLoading()`, `DEFAULT_REFINE_PROMPT`, and the `refinePrompt` field from saved/loaded project data
- [x] Update project file schema in `architecture.md` to drop `refinePrompt`

### 1b — Remove Load-from-URL
- [x] Delete the URL modal markup and related top-bar button
- [x] Delete `openUrlModal`, `closeUrlModal`, `loadFromUrl` from `app.js`
- [x] Delete `POST /api/load-url` from `server.js`

### 1c — Render-area hierarchy fix
- [x] **Behavior**: when a render is selected from History, the Reasoning view auto-syncs to *that* render's reasoning (no more stale refine/last-render content while viewing a different render)
- [x] **Visual**: regroup view buttons so the hierarchy reads as "**Render** [Preview | Source | Reasoning] · History" — Preview/Source/Reasoning are aspects of one render; History is a separate axis
- [x] Rename the "Analysis" view button to "Reasoning" (its only remaining content type after refine is gone)
- [x] Move "Copy HTML" into the **Source** view as an icon button in the top-right of the source area

### 1d — Decision-type cleanup
- [x] Remove "entity" from the new-decision category `<select>` and remove `.category-entity` CSS
- [x] Restack the add-decision form: type select **above** the textarea instead of beside it, so the textarea gets full width
- [x] No data migration — "entity" was never used in any saved project

### 1e — Tests + architecture doc
- [x] Update Playwright E2E tests: remove tests covering refine/load-url; add a test for the History→Reasoning auto-sync behavior
- [x] Update `specs/architecture.md`: drop refine/load-url from the route inventory, drop `refinePrompt` from the project file format, document the new render-area hierarchy as an invariant

---

## Phase 1.1 — Render Compare

Side-by-side comparison of renders. Built before the reasoning loop because grading reasoning is meaningless until you've actually compared a bunch — you need to *see* what good looks like before you can encode it as a score.

- [x] **Multi-tab render area**: open multiple renders (live or saved) into tabs above the render area; History row click opens or focuses a tab
- [x] **Live tab guard**: the most recent freshly-generated render shows a confirm() dialog when closing via the tab X; other unsaved/saved tabs close without prompt
- [x] **Generate demotion**: a new Generate demotes the previous live tab to a regular unsaved tab and creates a new live tab
- [x] **Save button scope**: visible only on unsaved tabs; hidden on saved tabs
- [x] **Per-tab lockstep**: Preview/Source/Reasoning stay in lockstep within each tab; switching tabs restores that tab's view
- [x] **Compare pair (locked split)**: checking a second tab's checkbox auto-locks a 2-tab pair (no Compare button). While paired, other checkboxes are disabled. Clicking either paired tab shows a 2-column split; clicking any non-paired tab returns to single view. Top toolbar Preview/Source/Reasoning controls both columns at once. Closing or unchecking a paired tab dissolves the pair.
- [x] **Rename saved render**: pencil affordance on History rows inline-edits the name; persists in `meta.json`; tab labels update live

---

## Phase 2 — Render Notes & Grading

Capture per-render feedback so Phase 2.5 has real data to work from.

- [x] **Free-text notes** textarea per render (live + saved), persisted in `meta.json`
- [x] **1–5 grade** per render, persisted in `meta.json` alongside rating
- [x] **Active PDL snapshot** captured into `meta.json` at generate time (no backfill — historical renders had all decisions active)
- [x] Notes + grade visible in the Reasoning panel
- [x] Notes/grade indicator on History rows

---

## Phase 2.5 — Prompt Improvement Consult

Use the captured render data to improve the generation prompt itself, instead of guessing.

- [x] **"Improve generation prompt"** action bundles: current generation prompt + N saved renders (each with PDL snapshot + reasoning + notes + grade, no HTML)
- [x] One-shot call to Claude; returns suggested edits to the generation prompt
- [x] User reviews and accepts/rejects the edits before they take effect
- [x] Defer chat/iteration unless one-shot proves insufficient

---

## Phase 2.6 — Project Save / New

Small UX gap. Today the only Save downloads a JSON to the user's Downloads folder; there's no way to write to the on-disk `projects/` folder from the UI, and no "New project" reset. Prerequisite for creating eval cases.

- [x] **Save → server**: replace the current download-to-file Save with a button that POSTs to `/api/projects/:slug`. Slug derived from the project-name field. Block if name is empty. Toast on success.
- [x] **New project**: button next to Save. Clears project name, desc, decisions, prompt-text. Confirm if the workspace has unsaved state.
- [x] **Open**: dropdown listing what's in `projects/` (uses existing `GET /api/projects/:name` plus a small list endpoint). Click to load.
- [x] Keep the existing JSON file Export / Import flow as-is for sharing.
- [x] Playwright tests for save → reload → open round-trip and the New confirm.

---

## Phase 2.7 — Eval Harness

Why this comes before any further prompt or pipeline work: per-render variance is larger than the effect of a typical prompt change. Without a fixed eval set, every iteration is a coin flip. The eval harness is the measurement layer; everything after this phase gets graded against it.

- [ ] **Frozen cases** under `evals/cases/*.json` — 3–5 hand-picked PDLs covering different shapes (multi-tab flow with external boundaries, CRUD entity management, single-page form with hard validation gating)
- [ ] **Rubric per case** under `evals/rubrics/*.json` — 5–8 yes/no checks each (e.g. "primary action visible without clicking", "external action uses mock boundary not real input", "all flows reachable")
- [ ] **Run flow** — UI button or CLI to generate one render per case against the active prompt version, save under `evals/runs/{promptVersionId}/`
- [ ] **Auto-grader** — Claude scores each render against its rubric, returns yes/no per check (separate from the existing per-render Assess UI)
- [ ] **Manual override** — eval renders are openable in the existing Assess flow for human grading
- [ ] **Compare view** — table of prompt versions × pass rates (overall + per-check), so "did that prompt change help" is a number
- [ ] Baseline run on the current active prompt before any further changes

---

## Phase 2.8 — Enforcement Layer

The "model rewrites all CSS regardless" lesson and the "model invents real file inputs" pattern can't be fixed with more prompt-tuning. What the model can't do, you don't have to ask it not to do.

- [ ] **`wireframe.css` enforcement**: add `!important` only on the visual-vocabulary tokens — font-family, colors, `border-radius: 0`, `box-shadow: none`, basic border style. Layout properties stay overrideable.
- [ ] **Server-side `<style>` whitelist**: post-process generated HTML before it reaches the iframe. Strip or warn on properties outside an allowed set (display, flex, grid, padding, margin, width, height, gap, etc.). Aesthetic tokens locked by the !important layer above.
- [ ] **Mock-boundary convention**: define `.mock-boundary` modal with OK / Cancel pattern in `wireframe.css`. Update `default-prompt.txt` with the convention: any cross-app action (upload, fetch, third-party login, payment) must render as a labeled mock dialog, not a real `<input type=file>` or form submission.
- [ ] **Visibility heuristic**: add to `default-prompt.txt` — primary actions and primary data are visible without interaction; collapsing is for secondary detail only.
- [ ] Re-run Phase 2.7 eval harness; expect material pass-rate improvement on rubric checks targeting these issues.

---

## Phase 2.9 — PDL Clarify

PDL ambiguity is upstream of prompt quality. If the PDL says "expandable cards," no prompt change makes the model show things expanded. Fix the input.

- [ ] **Clarify button** next to Generate. Optional pre-generate call.
- [ ] **One Claude tool-use call** that reads the active PDL, returns a structured list `[{ question, suggestedAnswers[], category }]`. Empty list = PDL is unambiguous.
- [ ] **Review UI**: show questions; user picks/edits an answer per question. Accepted answers append as new decisions in the chosen category. Show diff before commit.
- [ ] **No silent mutation** — answers always commit through the user's review.
- [ ] Re-run eval harness; expect improvement on cases with ambiguous PDLs.

---

## Phase 3 — Two-Round Generation

Separate structure from style to fix the CSS-bloat problem.

- [ ] **Round 1**: generate HTML + JS only, using semantic class names (`.card`, `.panel`, `.tab`, etc.) — no `<style>` blocks
- [ ] **Round 2**: CSS-only pass — takes the Round 1 HTML and generates a matching stylesheet
- [ ] Both rounds happen automatically on "Generate"; user sees the final result
- [ ] Round 1 HTML is saved separately for debugging if needed
- [ ] Evaluate: does Round 2 CSS stay wireframe-faithful, or does it drift toward polished?

---

## Phase 4 — Section Selection

Keep what works, replace what doesn't — without regenerating everything.

- [ ] After a render, the user can select which UI sections (panels, tabs, pages) to lock/keep
- [ ] Locked sections are passed as fixed HTML into the next generation prompt
- [ ] UI: overlay on the iframe showing named sections (based on `data-name` attributes from reasoning)
- [ ] Requires naming system: reasoning must produce consistent `data-name` values

---

## Phase 5 — Segment Architecture (Multi-call generation)

Scale to complex apps by generating one segment at a time.

- [ ] **Phase 5a — Plan call**: separate API call that returns a JSON segment plan (container, pages, segments, state shape)
- [ ] User reviews and edits the plan before generation runs
- [ ] **Phase 5b — Segment calls**: N generation calls, one per segment, using plan + locked sections
- [ ] Final pass: unification call to resolve navigation and state conflicts across segments

---

## Deferred / Under Evaluation

- **Wireframe CSS vocabulary as token-saver**: tried, doesn't work — model rewrites all CSS regardless. Keep `wireframe.css` as visual base layer only.
- **Reference injection (full HTML)**: inject a full saved render into prompt. High token cost (~3000 tokens per render). Evaluate after Phase 1 to see if reasoning-only reference makes it unnecessary.
- **Token usage & cost**: surface per-call `output_tokens` vs `max_tokens` cap so truncation is predictable; show the actually-returned model (confirm Sonnet vs Haiku); smarter `max_tokens` budgeting per model; in-UI cost dashboard. The Phase 2 bump from 8192 → 16384 was a band-aid; the real cap is 64K on both 4.5/4.6 models.

## Lessons learned (do not re-litigate)

- The reasoning block (parse + save) is built and working — see `architecture.md` "Reasoning block".
- The CSS vocabulary instruction doesn't save tokens — the model rewrites all CSS regardless. `wireframe.css` is a base layer only; the model overrides it. Not worth investing further in this direction.
- A numbered spatial hierarchy in the prompt degrades output — the model flattens flows into spatial siblings and over-elaborates in wrong areas.
- The core unsolved problem: every generation is a fresh take. The model reinvents the architecture each time, so good renders can't be iterated on reliably. Phase 1 (reasoning quality loop) is the first attempt to address this.
