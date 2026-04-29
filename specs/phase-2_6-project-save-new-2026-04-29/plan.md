# Phase 2.6 — Plan

Status: 1 [x], 2 [x], 3 [x], 4 [x], 5 [x], 6 [x], 7 [x]

## 1. [x] Backend list endpoint

- Add `GET /api/projects` in `server.js`.
- Reads `projects/`, returns `[{ slug, name }]` where `slug` is the filename without `.json` and `name` is the file's `name` field (fallback to slug).
- Sort alphabetically by name.
- Tolerate missing `projects/` dir (return `[]`).

## 2. [x] Save → server

- Add `saveToServer()` in `app.js`.
- Slug from `#project-name` value via existing slug rule (lowercase, `[^a-z0-9_-]→_`). Block + toast "Name a project before saving" if empty.
- Body: full project shape (`{ name, desc, prompt, decisions }`).
- POSTs to existing `POST /api/projects/:slug`. Silent overwrite (server already overwrites).
- On success: toast "Saved" and clear `dirty` flag.
- Wire to a new header `Save` button (replaces the old `Save` slot).

## 3. [x] Dirty flag + New

- Module-scope `let dirty = false`.
- Set `dirty = true` in: `addDecision`, `toggleDecision`, `deleteDecision`, `editDecision` commit path, `clearAll`, `project-name` `oninput`, `project-desc` `oninput`, prompt-text `oninput` for the per-project prompt textarea.
- Cleared on: successful `saveToServer`, successful `openProject(name)`, after `newProject()` confirm-clear.
- Add `newProject()`: if `dirty`, `confirm("Discard unsaved changes?")`. On accept (or when not dirty), reset name/desc/decisions/prompt-text + close all render tabs. Wire to header `New` button placed left of `Save`.

## 4. [x] Open dropdown

- Header `Open ▾` button reveals a dropdown built from `GET /api/projects`.
- Fetch on dropdown open (not page load — keeps it fresh after Save).
- Click row → `openProject(slug)`: same dirty-confirm as `New`. Loads via existing `GET /api/projects/:name`, populates state, clears `dirty`, closes render tabs.
- Empty-state row: "No projects yet."

## 5. [x] Header reshuffle

- Rename current header `Save` (which calls `saveToFile()`) → `Export`.
- Rename `Load file` label → `Import`.
- New header layout (left to right in the right-cluster Project actions group): `New | Save | Open ▾ | Export | Import`.
- Keep model switcher and cost badge unchanged.

## 6. [x] Playwright tests

- `tests/save-open.spec.js` (new): type a name, add a decision, click Save → toast appears; reload page; click Open ▾ → project listed; click → name/decision restored.
- `tests/new-project.spec.js` (new): on clean workspace, New does not prompt; after editing, New prompts and on accept clears state.
- Mock `GET /api/projects` and `GET/POST /api/projects/:name` in tests where helpful; otherwise let server handle it.

## 7. [x] Architecture doc

Update `specs/architecture.md`:
- Add `GET /api/projects` to the backend route inventory.
- Document the `dirty` frontend state variable in the Frontend state block.
- Note that header `Save` writes to server (`POST /api/projects/:slug`); `Export` / `Import` are the file-based flows for sharing.
- Note `New` and `Open` both honor the dirty-confirm.

## Architecture impact

- Backend: one new route (`GET /api/projects`).
- Frontend state: one new variable (`dirty`); no shape changes to `tabs[]`, `decisions[]`, project file format.
- New invariant: `dirty` is true iff there are workspace edits since the last successful Save→server or Open. `New` and `Open` use it for their confirm gate.
