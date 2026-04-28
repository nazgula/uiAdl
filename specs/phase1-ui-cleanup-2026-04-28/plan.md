# Phase 1 — Plan

Status: 1 [ ], 2 [ ], 3 [ ], 4 [ ], 5 [ ]

## 1. [ ] Remove Refine PDL

- `index.html`: delete the `tab-refine` button (≈line 99) and the `panel-refine` block (≈lines 153–183), including the `refine-prompt-text` textarea, reset link, refine button, spinner, and label.
- `app.js`:
  - Delete `DEFAULT_REFINE_PROMPT` (≈line 63).
  - Delete `refinePDL()` and `setRefineLoading()` (≈lines 523–586).
  - Remove `refinePrompt` from `saveProject()` (the field included in the JSON body) and from `loadProject()` (the line that writes back into `refine-prompt-text`).
  - Remove the `refine-prompt-text` reset branch from `resetPrompt()`.
  - Remove `'refine'` from the tabs array in the tab-switching logic; the array becomes `['decisions', 'prompt']`.
  - Remove the `refine-btn` line in `setLoading()`.
- Drop `refinePrompt` from any default-project initialization in `app.js` (only the field — leave older saved JSON files alone).

## 2. [ ] Remove Load-from-URL

- `index.html`: delete the `#url-modal` block (≈lines 26+) and the top-bar Load-from-URL button (≈line 57).
- `app.js`: delete `openUrlModal()`, `closeUrlModal()`, and `loadFromUrl()` (≈lines 162–200).
- `server.js`: delete the `POST /api/load-url` handler.

## 3. [ ] Render-area hierarchy fix

- Markup: regroup the button row in `index.html` (≈lines 191–204) so it reads `Render [ Preview | Source | Reasoning ] · History`. Use a small visual separator (e.g. a `·` span or a thin divider) between the Render group and History.
- Rename ids: `view-analysis` → `view-reasoning`, `preview-analysis` → `preview-reasoning`, `analysis-empty` → `reasoning-empty`, `analysis-content` → `reasoning-content`. Update every reference in `app.js` (search for `analysis`).
- Rename the visible label "Analysis" → "Reasoning" on the button. Update the empty-state copy inside the panel — the old "Click Refine PDL to analyze your decisions" message is no longer accurate; replace with "No reasoning yet — generate a render to see one."
- `setView()`: update the views list to `['render', 'source', 'reasoning', 'history']` and adjust each `getElementById('preview-...')` reference accordingly.
- Move "Copy HTML" out of the top button row and into the Source view: place a copy icon button (small SVG) absolutely positioned top-right inside `#preview-source`, wired to `copySource()`. Keep `copySource()` as-is.
- Auto-sync Reasoning view: in `viewRender(id)` (the History row click handler), also fetch `/api/renders/:project/:id/reasoning` and write the result into `lastReasoning` plus the `#reasoning-content` element. If the response is empty or 404 (older renders without reasoning), show the empty state with copy "No reasoning saved for this render."
- The "currently-viewed render" model: any time `lastHTML` is replaced (fresh generation, History selection), the Reasoning panel content is updated in lockstep. Document this lockstep as the new invariant — record it in the plan's Architecture impact section so it lands in `architecture.md` at finish-phase time.

## 4. [ ] Decision-type cleanup

- `index.html`: remove the `<option value="entity">` from `#new-category` (≈line 108) and remove the `.category-entity` CSS rule (line 10). The default selected option becomes `flow`.
- Restack the add-decision form so the type `<select>` sits above the `<textarea>` rather than beside it; remove any flex-row container that paired them and let the textarea span full width.
- No data migration. Saved decisions with `category: "entity"` continue to render with no category color — acceptable, no project in `projects/` actually uses the value.

## 5. [ ] Tests + architecture doc

- `tests/e2e/core-flows.spec.js` currently has no refine or load-url coverage (verified) — nothing to delete. If existing tests break because of the Analysis→Reasoning rename or the regrouped button row, update the selectors in place.
- Add a Playwright test for History→Reasoning auto-sync:
  - Mock `/api/generate` to return a render with a `<reasoning>` block.
  - Generate, save, then generate a second time so `lastReasoning` differs from the saved one.
  - Click the older entry in History; switch to Reasoning; assert the panel content matches the *saved* reasoning, not the latest generation's.
- Update `specs/architecture.md`:
  - Drop `POST /api/load-url` from the route inventory.
  - Drop `refinePrompt` from the project-file format JSON example.
  - Add an invariant under "Frontend layout" (or a new "Render area" subsection): the Render group (Preview/Source/Reasoning) reflects a single currently-viewed render — switching renders via History keeps all three aspects in sync.
  - Update the "Reasoning block" paragraph if needed (rename Analysis → Reasoning).

## Architecture impact

When this phase finishes, `specs/architecture.md` needs:

- Removed route: `POST /api/load-url`.
- Removed project-file field: `refinePrompt`.
- Renamed view: Analysis → Reasoning.
- New invariant: **Render-aspect lockstep** — the Render group (Preview/Source/Reasoning) always reflects one "currently-viewed render." A history selection updates `lastHTML` *and* the reasoning panel content together; they cannot drift.
