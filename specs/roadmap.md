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

## Phase 1.1 — Render Compare (NEXT)

Side-by-side comparison of saved renders, with reasoning as the primary compare axis. Built before the reasoning loop because grading reasoning is meaningless until you've actually compared a bunch — you need to *see* what good looks like before you can encode it as a score.

- [ ] **Multi-tab render area**: open multiple saved renders into tabs alongside the current generation
- [ ] **Lock the live render**: the most recent freshly-generated render is locked (cannot be closed by accident); other tabs are closeable
- [ ] **Save button scope**: enabled only for unsaved (fresh) tabs; hidden once a render is saved or when viewing an already-saved render
- [ ] **Side-by-side reasoning view**: pick two open tabs and view their reasoning in two columns
- [ ] **Preview / Source stay tab-switched** within each render tab — the compare axis is reasoning, not pixels
- [ ] **Phase 1 invariant preserved per tab**: Preview/Source/Reasoning stay in lockstep within each tab

---

## Phase 2 — Reasoning Quality Loop

Make reasoning useful as a learning signal, not just a log.

- [ ] **Grade saved reasoning**: add score (1–5) + notes (strong / weak) to each saved render's reasoning view
- [ ] Store grade in `meta.json` alongside rating
- [ ] **Use reasoning as reference**: inject a high-graded reasoning block into the next generation prompt as a structural anchor
- [ ] UI: "Use as reference" button on history rows that have reasoning (R button already exists — extend it)
- [ ] Show in prompt preview when a reference reasoning is attached

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

## Lessons learned (do not re-litigate)

- The reasoning block (parse + save) is built and working — see `architecture.md` "Reasoning block".
- The CSS vocabulary instruction doesn't save tokens — the model rewrites all CSS regardless. `wireframe.css` is a base layer only; the model overrides it. Not worth investing further in this direction.
- A numbered spatial hierarchy in the prompt degrades output — the model flattens flows into spatial siblings and over-elaborates in wrong areas.
- The core unsolved problem: every generation is a fresh take. The model reinvents the architecture each time, so good renders can't be iterated on reliably. Phase 1 (reasoning quality loop) is the first attempt to address this.
