# Changelog

Notable changes per phase. See `specs/roadmap.md` for the full plan.

## 2026-04-29 — Phase 2.5: Prompt Improvement Consult

- New on-disk **prompt registry** (`prompts.json`) is the source of truth for versioned generation prompts. Seeded with the in-code `DEFAULT_PROMPT` on first run; versions are append-only and immutable. New endpoints: `GET /api/prompts`, `POST /api/prompts`, `GET /api/prompts/:id`, `PUT /api/prompts/active`, `GET /api/prompts/stats`.
- The Gen Prompt tab gains a **version dropdown** showing each version with its average user-grade (e.g. `v3 — avg 3.6 (8)`). Switching versions makes that one active and updates the textarea.
- New **Improve generation prompt** flow: with ≥3 graded renders for the active project, click Improve to send a tool-use consult bundle (active prompt + each graded render's PDL snapshot + reasoning + note + grade, no HTML). A review modal opens with a line-level diff, per-render grade comparison, limits notes, and an editable proposal. Save creates a new version (active immediately); Cancel discards.
- Renders now carry **`promptVersionId`** linking back to the version that produced them. History rows show a small version badge; the per-version average grade in the dropdown is computed across all projects' meta.
- Consult call uses the Anthropic tool-use API (not freeform JSON) for reliable structured output, and now bundles instructions to keep the proposed prompt generic across projects rather than over-fitting to one project's renders.
- 4 new Playwright tests (25 total, all green) cover the threshold gate, modal contents, save/cancel flow, version switching, and render→version linkage.

## 2026-04-28 — Phase 2: Render Notes & Grading

- Saved renders now carry a free-text **note** and a **1–5 grade** alongside the existing rating. Both persist in `meta.json` and round-trip through the `POST` and `PATCH /api/renders/:project/:id` endpoints.
- Each generation captures a **PDL snapshot** — the active decisions at generate time — onto the live tab. On save, the snapshot persists to `meta.json` (write-once; PATCH ignores it). Renders saved before this phase show "Snapshot not captured" instead.
- Single shared **Assess** popover provides grade + note editing: a button on the right-pane toolbar in single view, and a per-column button in the locked-pair split view. The reasoning view shows the captured snapshot as a collapsible block; it does not duplicate grade/note controls.
- Tab strip shows a clickable grade badge (cycles 1→5→clear) on every tab; History rows show a numeric grade badge and a small note indicator next to the existing R / rating / rename / delete affordances.
- `max_tokens` for `/api/generate` bumped from 8192 to 16384 to reduce truncation. Deeper token-cost work (per-call usage visibility, smarter budgeting, model echo) parked under "Deferred / Under Evaluation" for replan.
- 5 new Playwright tests (21 total, all green) cover the Assess popover, tab grade badge, history indicators, snapshot display, and per-column Assess in split view.

## 2026-04-28 — Phase 1.1: Render Compare

- The render area is now multi-tabbed. Each generated or History-opened render lives in its own tab; Preview/Source/Reasoning stay in lockstep within a tab and each tab remembers its own view selection.
- The most recent unsaved generation is the "live" tab — closing it via the tab X confirms first. Generating again demotes the previous live to a regular closeable unsaved tab.
- Clicking a History row opens the render in a new tab, or focuses an already-open tab for that render. Deleting a render also closes its open tab.
- New compare flow: checking the second tab auto-locks a 2-tab pair (no Compare button). Clicking either paired tab shows a 2-column split; the top toolbar Preview/Source/Reasoning drives both columns at once. Clicking any non-paired tab returns to single view. Closing or unchecking either paired tab dissolves the pair.
- Saved renders can be renamed inline from a History row via a pencil affordance. The name shows in History and as the tab label, and persists in `meta.json` (`PATCH /api/renders/:project/:id` now accepts `name`).
- The frontend state is no longer keyed off `lastHTML` / `lastReasoning` singletons — it's now a `tabs[]` array with `activeTabId`. `architecture.md` updated to match.

## 2026-04-28 — Phase 1: UI Cleanup

- Removed Refine PDL: the left-panel tab, the refine prompt, the API call, and the `refinePrompt` field on saved projects are all gone.
- Removed Load-from-URL: the modal, the top-bar button, and the `POST /api/load-url` server route are all gone.
- Restructured the render-area button row into `Render [ Preview | Source | Reasoning ] · History`. Preview, Source, and Reasoning now stay in lockstep on a single currently-viewed render — selecting a row in History auto-syncs all three.
- Renamed the Analysis view to Reasoning and moved Copy HTML into the Source view as a top-right icon button.
- Removed "entity" from the new-decision category select and restacked the add-decision form so the textarea gets full width; the per-row category select in the list now follows the same vertical-stack pattern.
- Save Render is now single-use per generation: after a successful save the button hides until the next generate; loading a saved render from History also keeps it hidden.
- The History row "R" is now a non-clickable indicator badge — clicking the row itself already auto-syncs the Reasoning panel, so the duplicate link was removed.

## 2026-04-26 — Phase 0: Pre-publication Cleanup

- Fixed orphaned `.reasoning.txt` files left behind on render delete; the DELETE handler now removes both the HTML and reasoning files for the render.
- Completed a public-safety audit: confirmed no secrets in source or git history, verified `.gitignore` covers `.env`, `projects/`, `renders/`, `config.json`, and `node_modules/`, and reviewed runtime data for personal content.
- Added Playwright end-to-end tests for the six core user flows (add decision, toggle, generate, save, rate, view reasoning) with `/api/generate` mocked so the suite consumes no Anthropic credits.
- Added `README.md` with a plain-language description of the tool, how it works, and the lessons learned during development.
- Added MIT `LICENSE`, populated `package.json` description and repository fields, and set GitHub repo description and topics.
- Pre-merge polish: simplified the E2E test setup to use the built-in Playwright `request` fixture, parallelize cleanup, and drop narrative comments.
