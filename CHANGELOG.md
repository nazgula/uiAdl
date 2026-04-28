# Changelog

Notable changes per phase. See `specs/roadmap.md` for the full plan.

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
