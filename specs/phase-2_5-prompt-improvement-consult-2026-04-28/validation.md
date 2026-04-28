# Phase 2.5 — Validation

## Manual checks

1. **Fresh state** — delete `prompts.json` if present, restart server. Confirm it gets seeded with one version equal to `DEFAULT_PROMPT`. The Prompt tab textarea reflects this version. Version dropdown shows `v1`.

2. **Threshold gating** — open a project with <3 graded saved renders. The "Improve generation prompt" button is disabled with helper text indicating how many more graded renders are needed. With exactly 3 graded renders, the button enables.

3. **Consult flow (real call, can be against mock if no credits)** — click Improve. Loading indicator shows. Modal opens with: line-level diff of current vs proposed prompt; grade comparison table where each bundled render shows the user grade, Claude's grade, and Claude's one-line rationale; limits-notes callout; editable textarea pre-filled with the proposal.

4. **Hand-edit before save** — modify the proposal in the textarea, click Save as v2. Modal closes. Version dropdown now shows `v2` selected. Prompt tab textarea reflects the saved (edited) text.

5. **Cancel discards** — open Improve again, see modal, click Cancel. No new version. Dropdown still on v2.

6. **Version switching** — pick `v1` from dropdown. Prompt tab textarea reverts to original DEFAULT_PROMPT. `PUT /api/prompts/active` was called.

7. **Render → version linkage** — generate a render with `v2` active. The live tab carries `promptVersionId = v2`. Save the render. Reload the project. History row shows a small `v2` badge. Switch active version to `v1`, generate again, save — that new render shows `v1` badge.

8. **Per-version grade stat** — grade some renders against v2, then look at the version dropdown. The `v2` entry shows `avg X.X (N)` reflecting the user grades of renders linked to v2. Renders linked to v1 contribute only to v1's stat.

9. **Limits notes survive** — confirm that the `summary` field saved with the new version (if we chose to store it) is visible somewhere — at minimum, in dev tools / `prompts.json` on disk. Not required to surface in UI in this phase.

## Automated checks

- All existing 21 Playwright tests stay green (no regressions to Phase 0/1/1.1/2 flows).
- New Playwright tests:
  - **threshold-disabled**: create a project, save 2 graded renders, confirm Improve button is disabled with helper text.
  - **consult-modal-open**: with 3 graded renders and `POST /api/generate` mocked to return a structured consult response, click Improve and assert modal contents (diff present, grade rows present, limits notes present, textarea editable).
  - **save-as-new-version**: from the modal, edit the textarea, click Save, assert `POST /api/prompts` called with the edited text and the new version becomes active in the dropdown.
  - **cancel-discards**: assert no `POST /api/prompts` after cancel.
  - **version-switch**: switch active version via dropdown, assert `PUT /api/prompts/active` called and textarea content swaps.
  - **render-version-stamp**: with a non-default active version, generate (mocked `/api/generate`), save, reload project, assert the saved render row in history has the version badge.

## Regression watch

- **Project save/load** — the per-project `prompt` field still round-trips correctly. If we change `buildFullPrompt()` to read from the registry instead of the textarea, walk through existing saved projects to confirm they still generate identical prompts.
- **`POST /api/generate` shape** — the consult uses the existing proxy. Confirm the structured `messages: [...]` array reaches Anthropic correctly (server forwards body verbatim).
- **`POST /api/renders/:project`** — schema accepts the new `promptVersionId`. Saving a render without one still works (older flows / edge cases).
- **Tab state** — `tabs[]` gains a field; ensure no `tab.promptVersionId === undefined` regressions in existing tab close / demote / split flows.
- **`meta.json` shape** — older meta rows without `promptVersionId` continue to render History without errors. No "undefined" badge text.
- **Reasoning fetch on consult** — the consult fetches each graded render's reasoning. Confirm a render with no saved reasoning is either skipped or sent with `reasoning: null` (don't crash the consult).
- **DEFAULT_PROMPT** — if the registry seeding logic relies on a shared constant, confirm both server and frontend produce identical text. Mismatch here means v1 isn't actually the in-code default.
