# Render Notes & Grading — Requirements

## Why

Reasoning quality and prompt iteration (Phase 2.5) need real per-render feedback to work from. Today there is only a thumbs rating and the reasoning text — no notes, no graded judgment, no record of which decisions were active at generate time. Capture that data structurally so the next phase has signal to bundle.

## In scope

- **Per-tab free-text note**, editable on any tab kind (live / unsaved / saved). Tab-level affordance: a small indicator on the tab strip that expands inline into a textarea and collapses back to an indicator when not writing — must not block the surrounding UI when collapsed.
- **Per-tab 1–5 grade**, shown as a numeric badge on the active tab and on History rows.
- **Notes + grade also surfaced in the Reasoning panel**, mirroring the tab-level state (edits in either place update the same source of truth).
- **Active-decisions snapshot** captured at generate time onto the live tab in memory; persisted into `meta.json` when the tab is saved. Snapshot is `[{ text, category }]` of decisions active at generate time. Only active decisions; inactive ones are not recorded.
- **Backend**: `meta.json` gains `note`, `grade`, `pdlSnapshot`. `PATCH /api/renders/:project/:id` accepts `note` and `grade`. `POST /api/renders/:project` accepts `pdlSnapshot`, `note`, `grade` on initial save.
- **History row indicator**: grade as a numeric badge; a separate small indicator when a note is present.

## Out of scope

- Phase 2.5 prompt-improvement consult (uses this data; not built here).
- Backfilling `pdlSnapshot` for existing saved renders. Historical renders have no snapshot; the Reasoning panel handles missing values gracefully.
- Editing or pruning the captured snapshot after generation.
- Cross-render aggregation, search, sort, or filtering by grade/note.
- Replacing or removing the existing thumbs `rating` — both `rating` and `grade` coexist in `meta.json`.

## Success signal

After generating a render, the user can grade it 1–5 and jot a note from the tab strip without leaving the preview; on save, the note, grade, and the PDL active at generate time persist to disk; reopening the render from History restores all three and shows the grade badge + note indicator on the row.

## Open questions

None.
