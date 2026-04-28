# Phase 1 — Validation

## Manual checks

Walk through this in a browser (`node server.js` → `localhost:8080`):

1. **Left panel tabs** — the panel header shows only **Decisions** and **Prompt**. No "Refine Prompt" tab. Switching between the two works; no console errors.
2. **Top bar** — no "Load from URL" button; clicking around does not open a URL modal. Page source contains no `#url-modal` element.
3. **Add decisions** — open the add-decision form. The category `<select>` sits above a full-width `<textarea>`. The select offers exactly: `flow`, `ui`, `constraint` (no `entity`). Type a decision, hit Enter, it appears in the list with the correct category color.
4. **Generate a render** — with at least one active decision, click Generate. The Render area shows `Render [ Preview | Source | Reasoning ] · History`. Preview shows the wireframe. Reasoning view shows the generation's reasoning. Source view shows the HTML.
5. **Copy HTML in Source** — switch to Source. A small copy icon is anchored top-right of the source area. Click it; HTML is in the clipboard. There is no separate "Copy HTML" button in the top button row.
6. **History auto-sync** — save the current render. Edit a decision so the next generation differs. Generate again; do *not* save. The Reasoning panel now shows the second generation's reasoning. Switch to History → click the saved (first) render → switch to Reasoning. The panel now shows the *saved* render's reasoning, not the second generation's. Switch to Source — same story: source matches the saved render's HTML, not the second generation's.
7. **Reasoning empty state** — if any saved render lacks `.reasoning.txt` (older saves), clicking it then Reasoning shows "No reasoning saved for this render."
8. **Project save/load round-trip** — save the project. Reload the page. The decisions list, prompt, and project header come back intact. A pre-existing project file containing a `refinePrompt` field still loads cleanly (the field is ignored, no error).

## Automated checks

- `npx playwright test` — full suite passes:
  - New test added: **History → Reasoning auto-sync** — mocks `/api/generate`, generates, saves, generates a different second response, clicks the saved entry in History, switches to Reasoning, asserts the panel text matches the *saved* reasoning.
  - Existing `core-flows.spec.js` tests (add decision, toggle, generate, save, rate, view reasoning via R button, error state, empty state) still pass — selectors updated wherever the Analysis→Reasoning rename or the regrouped button row touched them.

## Regression watch

This phase touches the right-pane button row, the tab-switching logic, and the project file shape. Watch for:

- **Save Render button visibility** — still appears after a fresh generation; still hides when viewing History; not accidentally repositioned or always-visible.
- **R button on history rows** — still works (`viewReasoning(id)` path) and routes to the renamed Reasoning view.
- **History deletion** — deleting a render still removes both `{id}.html` and `{id}.reasoning.txt` (verified at finish of Phase 0; ensure nothing here regresses it).
- **Project autosave/load** — `localStorage` autosave and `/api/projects/:name` load still round-trip; removing `refinePrompt` from saved bodies must not break loading older project JSONs that still have it.
- **Inline edit / toggle behavior** — restacking the add-decision form must not break the form-row click handlers used by existing decisions in the list above.
- **Sandboxed iframe** — Preview still uses `srcdoc` with `sandbox="allow-scripts allow-same-origin"`; never injects HTML into the parent document.
