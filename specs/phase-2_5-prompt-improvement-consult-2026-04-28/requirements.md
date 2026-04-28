# Phase 2.5 — Prompt Improvement Consult

## Why

Phase 2 captured per-render notes and grades. Today that data sits inert. The user iterates the Generation Prompt by hand-editing the textarea — guessing. This phase closes the loop: bundle the graded renders + their reasoning + the user's notes into a one-shot consult call, and let Claude propose an improved Generation Prompt. Result: prompt evolution is data-driven, versioned, and traceable.

## In scope

- **Global prompts registry** — `prompts.json` on disk. Each version: `{ id, createdAt, text, parentId, summary }`. Default version is the most recent. Older versions selectable from a UI dropdown.
- **Generation Prompt sourced from registry** — the left-panel Prompt tab's textarea reflects the currently-selected version. Editing it doesn't auto-create a new version (user can still hand-edit per-project), but the **active version id** is what gets recorded against renders.
- **Consult trigger** — button on the left-panel Prompt tab labeled "Improve generation prompt." Disabled with helper text until the *current project* has ≥3 graded saved renders.
- **Bundle composition** — current project's graded renders only. Sent as a structured `messages: [...]` array (system + one user block per render), not a single concatenated string. Each render block contains: PDL snapshot, reasoning, user's note, user's grade. **No HTML in the bundle** (saves tokens; reasoning is the signal).
- **Consult output (single call, structured)** — Claude returns:
  1. **Proposed new Generation Prompt** (full text, not a diff).
  2. **Claude's own grade per bundled render**, each with a one-line rationale.
  3. **Limits notes** — short paragraph on patterns the prompt alone can't fix (vague PDL items, structural problems, anything that hints at needing tool use or pipeline changes). Feeds future `/replan` decisions.
- **Review modal** — shows current-vs-proposed diff (line-level), the user-grade-vs-Claude-grade comparison table, and the limits notes. Textarea is pre-filled with the proposed prompt and is editable. "Save as v(N+1)" button writes a new version to `prompts.json` and selects it.
- **Render → version linkage** — every new generation records the active prompt version id onto the live tab (`promptVersionId`). On save, `meta.json` persists it. History rows show a small "v3" badge.
- **Per-version stats in the version dropdown** — for each version, show "avg grade: X.X (n renders)" using the user-graded renders that recorded that version id.
- **Backend** — `GET /api/prompts`, `POST /api/prompts` (creates new version; server assigns id + createdAt), `GET /api/prompts/:id`. No PATCH (versions are immutable). The consult itself is just `POST /api/generate` with the structured messages array — no new endpoint for the consult.
- **Tests** — Playwright coverage for: consult button disabled below threshold, mocked consult call structure, review modal diff + editable apply, version dropdown selection, render carries `promptVersionId` on save.

## Out of scope

- **Cross-project render bundling** — bundling renders from other projects into the consult. Defer until single-project consult is proven.
- **AskUserQuestion-style PDL clarification at generation time** — making Claude push back on vague PDL items before generating HTML. This is a generation-pipeline change (one call → two), naturally sized for Phase 3 or Phase 5. The consult's "limits notes" is the evidence path that informs whether/when to do this.
- **Per-suggestion accept/reject toggles** — the proposal is one prompt, accepted as a single edited text. Granular toggling is unnecessary plumbing.
- **Prompt deletion / version cleanup UI** — versions accumulate. If this becomes a real problem, address later.
- **Editing of historical versions** — old versions are immutable. To "edit" one, fork from it (load it, edit, save as new version).
- **Per-project prompt overrides / forking** — global registry only. No project-scoped fork line.
- **Claude self-grading replacing user grading** — both grades are kept; the value is in the comparison.
- **Backfilling `promptVersionId` onto pre-existing saved renders** — null is acceptable; renders saved before this phase simply won't show a version badge.
- **Cost / token-usage UI** — already parked under "Deferred" in roadmap; not picked up here.

## Success signal

After grading at least three saved renders, the user clicks "Improve generation prompt," sees a meaningful diff and a useful comparison of their grades vs Claude's, accepts (with or without hand-edits), and the next generation runs against the new prompt version with `promptVersionId` recorded. Subsequent renders saved against the new version contribute to the avg-grade stat shown in the version dropdown — making it visible whether the new version is actually producing better output.

Secondary signal: the limits notes from at least one consult cycle materially shape the next `/replan` discussion (e.g., "model keeps misreading flow-vs-ui categorisation; that's a clarify-step problem, not a prompt problem").

## Open questions

- None blocking. (Decisions on global vs per-project, bundle scope, accept UX, meta-output, and threshold are all locked.)
