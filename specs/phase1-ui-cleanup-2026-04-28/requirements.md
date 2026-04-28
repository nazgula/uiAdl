# Phase 1 — UI Cleanup

## Why

Reduce the app's surface area before the Phase 2 reasoning-quality loop. Two capabilities (Refine PDL, Load-from-URL) are unused and add cognitive load. The render-area button row mixes "view aspects of the current render" with "switch to a different render," which will get worse once Phase 2 layers reasoning grading on top. Cleaner foundation now → less rework later.

## In scope

- Remove the Refine PDL tab and all related code, including the `refinePrompt` field in saved/loaded project data.
- Remove Load-from-URL: top-bar button, modal markup, frontend functions, server route.
- Restructure the render-area button row into `Render [ Preview | Source | Reasoning ] · History` — Preview/Source/Reasoning are aspects of one render; History is a separate axis.
- Rename the "Analysis" view to "Reasoning" (its only remaining content type after refine is gone).
- When a render is selected from History, the Reasoning view auto-syncs to *that* render's reasoning. Switching between Preview/Source/Reasoning while viewing a History render should keep showing that render across all three aspects.
- Move "Copy HTML" out of the top-bar button row and into the Source view as an icon button anchored top-right of the source area.
- Remove "entity" from the new-decision category `<select>` and drop the `.category-entity` CSS rule.
- Restack the add-decision form: type select **above** the textarea so the textarea gets full width.
- Update Playwright E2E tests: drop tests for refine and load-url; add a test for the History→Reasoning auto-sync behavior.
- Update `specs/architecture.md` to reflect the removed route, removed project field, and new render-area invariant.

## Out of scope

- Reasoning grading, score, or notes (Phase 2).
- Migrating existing project files that contain `refinePrompt` or decisions with `category: "entity"` — values left in place, ignored by the new UI. No data-rewrite step.
- Changes to the generation pipeline, `wireframe.css`, or any prompt content beyond removing the refine prompt.
- Server-side reasoning storage layout (already in place).
- Save Render button placement is preserved as-is — it stays a peer action button, not part of the new view groups.

## Success signal

- Left panel shows only **Decisions** and **Prompt** tabs. No Refine tab, no `refinePDL` code path.
- Top bar contains no Load-from-URL button. The URL modal markup and `POST /api/load-url` are gone.
- Render area reads `Render [ Preview | Source | Reasoning ] · History`. The "Reasoning" button replaces "Analysis."
- Generating a render then clicking an older saved render in History and switching to Reasoning shows the *saved* render's reasoning, not the latest generation's.
- Source view has a copy icon button anchored top-right. The standalone "Copy HTML" button is gone.
- Add-decision form: category `<select>` is stacked above a full-width textarea; the select offers `flow`, `ui`, `constraint` (no `entity`).
- All Playwright E2E tests pass, including the new History→Reasoning auto-sync test.

## Open questions

None.
