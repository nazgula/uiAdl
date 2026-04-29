# Phase 2.6 — Project Save / New

## Why

Today the only "Save" downloads JSON to the user's Downloads folder. There's no way to write to the on-disk `projects/` folder from the UI, and no "New project" reset. This blocks creating eval cases (Phase 2.7) — the eval harness needs projects living on disk that can be loaded reliably.

## In scope

- New header buttons: `New`, `Save` (server), `Open ▾` (dropdown).
- `Save` POSTs to `/api/projects/:slug` where slug derives from the project-name input (existing `[^a-z0-9_-]→_` rule). Blocks if name empty. Silent overwrite. Toast on success.
- `New` clears name, desc, decisions, prompt-text, and render tabs. Shows a `confirm()` only when a workspace `dirty` flag is set.
- `dirty` flag: set true by any decision / project-name / desc / per-project prompt-text edit. Cleared by a successful Save→server or Open.
- `Open ▾` dropdown: lists projects under `projects/` (built from a new `GET /api/projects` endpoint). Click loads via the existing `GET /api/projects/:name`. Replaces current workspace; uses the same dirty-confirm as `New`.
- New backend endpoint: `GET /api/projects` → `[{ slug, name }]` derived from files in `projects/`.
- Existing JSON download-Save and Load-file flows kept as-is, relabeled `Export` / `Import`.
- Playwright tests for save → reload → open round-trip, and the `New` confirm (fires when dirty, skips when clean).

## Out of scope

- Delete-project from the UI.
- Rename-project from the UI (rename via filesystem still works).
- Server-side autosave.
- Multi-project tabs / multiple open projects at once.
- localStorage behavior changes.
- Project file format changes.

## Success signal

Typing a name, adding decisions, and clicking `Save` writes `projects/<slug>.json` on disk. After a page reload, `Open ▾` lists the project; clicking it restores name/desc/decisions/prompt. `New` on a dirty workspace prompts to discard; on a clean workspace it clears without prompt.

## Open questions

None.
