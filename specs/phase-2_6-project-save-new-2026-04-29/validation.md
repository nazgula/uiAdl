# Phase 2.6 — Validation

## Manual checks

1. **Round-trip**: Start fresh (`New`). Type project name "Test Save". Add 2 decisions. Click `Save` — toast "Saved" appears. Reload the page. Click `Open ▾` — "Test Save" is listed. Click it — name + decisions restored. Confirm `projects/test_save.json` exists on disk with the expected shape.
2. **Empty-name guard**: Clear the project name. Click `Save` — toast "Name a project before saving"; nothing written.
3. **Silent overwrite**: With "Test Save" loaded, edit a decision, click `Save` — no confirm dialog, just toast "Saved". Reload + Open — edit persisted.
4. **New, clean**: Immediately after Open or Save, click `New` — no confirm prompt, workspace clears.
5. **New, dirty**: After Open, edit a decision, click `New` — confirm dialog appears. Cancel → workspace unchanged. Click `New` again, accept → workspace clears.
6. **Open, dirty**: Edit a decision, click `Open ▾`, pick a project — confirm dialog appears. Cancel keeps current state; accept loads the chosen project.
7. **Export / Import unchanged**: `Export` still downloads JSON. `Import` still loads from a JSON file.

## Automated checks

- `tests/save-open.spec.js` — full round-trip test (server-backed).
- `tests/new-project.spec.js` — dirty/clean confirm gating.
- Existing Playwright suite (`npm run test:e2e`) still passes — no regressions in render tabs, history, generate, assess, prompt-improvement consult.

## Regression watch

- `autosave()` to localStorage must still fire on edits (don't break the existing background save).
- Existing `saveToFile()` / `Load file` flows must work after relabeling — they share state plumbing with the new save path.
- Render tab strip should be empty after `New` and after `Open` (current renders belong to the previous project).
- The per-project prompt-text textarea is treated as a "dirty"-triggering edit — confirm typing in `Gen Prompt` flips dirty true.
- Promptregistry / `prompts.json` is unrelated to per-project save — confirm Phase 2.5 prompt-version controls and `GET /api/prompts/stats` still work after Open switches projects.
