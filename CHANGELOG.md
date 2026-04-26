# Changelog

Notable changes per phase. See `specs/roadmap.md` for the full plan.

## 2026-04-26 — Phase 0: Pre-publication Cleanup

- Fixed orphaned `.reasoning.txt` files left behind on render delete; the DELETE handler now removes both the HTML and reasoning files for the render.
- Completed a public-safety audit: confirmed no secrets in source or git history, verified `.gitignore` covers `.env`, `projects/`, `renders/`, `config.json`, and `node_modules/`, and reviewed runtime data for personal content.
- Added Playwright end-to-end tests for the six core user flows (add decision, toggle, generate, save, rate, view reasoning) with `/api/generate` mocked so the suite consumes no Anthropic credits.
- Added `README.md` with a plain-language description of the tool, how it works, and the lessons learned during development.
- Added MIT `LICENSE`, populated `package.json` description and repository fields, and set GitHub repo description and topics.
- Pre-merge polish: simplified the E2E test setup to use the built-in Playwright `request` fixture, parallelize cleanup, and drop narrative comments.
