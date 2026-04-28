# Changelog

Notable changes per phase. See `specs/roadmap.md` for the full plan.

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
