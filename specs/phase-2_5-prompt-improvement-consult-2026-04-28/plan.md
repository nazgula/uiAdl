# Phase 2.5 — Plan

Status: 1 [ ], 2 [ ], 3 [ ], 4 [ ], 5 [ ], 6 [ ], 7 [ ]

## 1. [ ] Prompts registry — backend + storage

- Add `prompts.json` at the repo root (gitignored alongside other runtime data). Shape: `{ versions: [ { id, createdAt, text, parentId, summary } ], activeVersionId }`.
- On first server start, if `prompts.json` is missing, seed it with a single version where `text === DEFAULT_PROMPT` (read the constant from a small shared module so both server and frontend agree, OR have the seed live server-side and frontend fetches via API).
- `GET /api/prompts` — returns full registry.
- `POST /api/prompts` — body `{ text, parentId?, summary? }`. Server assigns `id` (timestamp-based or short uuid) and `createdAt`. Appends to `versions[]`, sets `activeVersionId` to the new id. Returns the new version object.
- `GET /api/prompts/:id` — returns one version (handy for diff fetching, not strictly required).
- `PUT /api/prompts/active` — body `{ id }`. Updates `activeVersionId` only. (Used by version dropdown.)
- Update `.gitignore` if needed for `prompts.json`.

## 2. [ ] Frontend — version registry wiring

- On app load, fetch `/api/prompts`. Cache in module-scope `prompts` and `activePromptVersionId`.
- The left-panel Prompt tab renders:
  - Existing textarea (`prompt-text`) pre-filled with the active version's `text`.
  - New **version dropdown** above the textarea: shows each version as `vN — created Apr 28 — avg 3.2 (8)`. Selecting a version sets it active (calls `PUT /api/prompts/active`) and replaces the textarea content with that version's text.
- Hand-editing the textarea no longer mutates the registry. (Local edits are project-scope, persisted via project file as today. Versions are immutable.)
- Update `generate()` to read the current `activePromptVersionId` and stamp it onto the new live tab (`tab.promptVersionId`).

## 3. [ ] Consult call — bundle + send

- New function `runImprovementConsult()`:
  - Gather graded saved renders for the current project — meta entries with `grade != null`.
  - Refuse if fewer than 3.
  - For each, fetch the saved reasoning text (already exposed via `GET /api/renders/:project/:id/reasoning`).
  - Build a `messages: [...]` array — system block, one user block stating "Current Generation Prompt:" + active version text, one user block per render (PDL snapshot + reasoning + note + grade, clearly delimited), final user block stating the required output format (proposed prompt + per-render grades with rationales + limits notes).
  - System block instructs strict output structure: a JSON object with keys `proposedPrompt`, `grades` (array of `{ renderId, grade, rationale }`), `limitsNotes`. JSON parsing on the frontend is straightforward and failure-tolerant.
  - Send via `POST /api/generate` (existing proxy). No new endpoint.
- "Improve generation prompt" button on the Prompt tab kicks this off. Disabled state with helper text below threshold.
- Loading indicator while in flight.

## 4. [ ] Review modal

- Modal component (Tailwind) shows:
  - **Diff panel** — line-level diff of `current activeVersion.text` → `proposedPrompt`. Use a tiny in-file diff helper (no library — diff at line granularity is ~30 lines of code).
  - **Grade comparison table** — for each bundled render: name, user grade, Claude grade, Claude rationale.
  - **Limits notes** — rendered as plain text in a callout block.
  - **Editable proposal textarea** — pre-filled with `proposedPrompt`, full-height. User can hand-tweak.
  - **Save as v(N+1)** button — POSTs to `/api/prompts` with `{ text: textarea.value, parentId: activeVersionId, summary: <auto-derived first line of limitsNotes or empty> }`. On success, refresh registry, set new version active, close modal.
  - **Cancel** button — discards the proposal, no write.

## 5. [ ] Render → version linkage

- `tabs[]` already extended for Phase 2. Add `promptVersionId` field. `generate()` stamps it from `activePromptVersionId`.
- `POST /api/renders/:project` accepts `promptVersionId` and writes it into the meta row.
- `meta.json` schema gains optional `promptVersionId` (null for renders saved pre-Phase-2.5 — no migration).
- History rows render a small `v3` badge when present.
- The version dropdown's "avg grade: X.X (n)" computes per version by scanning all projects' meta on demand (or by an aggregate endpoint `GET /api/prompts/stats` if scanning is expensive — start with on-demand).

## 6. [ ] Architecture impact (to be added at finish-phase)

- New section in `architecture.md` "Prompt registry": shape of `prompts.json`, the four endpoints (`GET /api/prompts`, `POST /api/prompts`, `GET /api/prompts/:id`, `PUT /api/prompts/active`), invariant that versions are immutable.
- Update `architecture.md` "Project file format" → noting that the prompt is no longer the single source of truth; the registry is, and projects' inline prompt is a per-project override that is *not* version-tracked.
- Update `architecture.md` "Frontend state" — add `prompts[]`, `activePromptVersionId`, `promptVersionId` on tabs.
- Update "Notes & grading" section header → cross-reference Phase 2.5's consult flow.
- Update `tech-stack.md` only if `prompts.json` is added to the storage list (yes, it should be — alongside `config.json`).

## 7. [ ] Tests

- Playwright tests:
  - Improve button is disabled with fewer than 3 graded renders; tooltip/helper text explains why.
  - With ≥3 graded renders, mocked `POST /api/generate` returns a stub consult response. Modal opens and shows diff + grade table + limits notes + editable textarea.
  - Saving creates a new version (mock `POST /api/prompts`); dropdown updates; textarea reflects new version.
  - Cancel discards; dropdown unchanged.
  - Version dropdown: switching versions calls `PUT /api/prompts/active` and updates the prompt textarea.
  - New generation after switching versions stamps the live tab with the right `promptVersionId`; saving the render persists it; History row shows the version badge.

## Architecture impact summary (one-liner)

Adds a global, immutable, on-disk prompt-versions registry; couples renders to the version that produced them; introduces a Claude-driven consult to propose new versions from accumulated graded renders.
