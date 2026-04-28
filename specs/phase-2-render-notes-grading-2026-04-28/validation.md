# Render Notes & Grading — Validation

> **Note:** Shipped UI diverged from the original plan. After early manual testing, the per-tab note diamond and the inline Reasoning-panel grade/note controls were replaced by a single shared **Assess** popover (toolbar in single view, per-column header in split view). Snapshot block is collapsible. The criteria below describe the **shipped** behavior; original criteria are preserved in the appendix.

## Manual checks (shipped UI)

1. Open a project with a few decisions; toggle some active and some inactive.
2. Click Generate. While the live tab is open:
   - Click the tab's grade badge → cycles 1→2→…→5→clear. Badge shows the value on the tab and stays visible after switching tabs and back.
   - Click the toolbar's **Assess** button → popover opens with grade picker + note textarea; type "structure feels right but spacing is off". Click outside or press Esc → popover closes.
3. Switch to Reasoning view. The Active PDL block is collapsed by default; expand it. The shipped UI does **not** mirror grade/note inline in the Reasoning view — the Assess button on the toolbar remains the single entry point. Reopen Assess and confirm the note + grade still match.
4. Save the render. Confirm:
   - Server response succeeds; tab promotes to `saved`.
   - History row for this render shows the grade badge `4` and the note indicator.
   - Reasoning view's "Active PDL at generate time" block (when expanded) lists the active decisions from step 1 (and only those).
5. Reload the page. Open the saved render from History. Grade, note, and snapshot all restored (snapshot stays collapsed by default; expand to verify).
6. From the Assess popover, change grade to 2 and edit the note. Close the popover. Reload. Both updates persisted (PATCH worked).
7. Open an older saved render (one without a snapshot). Expanding the snapshot block shows "Snapshot not captured (pre-Phase 2 render)." Assess controls still work.
8. Clear the grade (Assess popover → `clear` link) and the note on a saved render → reload → both cleared (empty string note, null grade).
9. Compare pair (split view): toolbar Assess button is hidden; each column header has its own Assess button that opens a popover scoped to that column's tab. Setting a grade on column 2 updates only that column's button label.

## Automated checks

- Playwright `notes-grading.spec.js` — 5 tests covering: tab-strip grade badge + Assess popover end-to-end persistence; PATCH path; clearing grade/note; snapshot-absent message for pre-Phase 2 renders; per-column Assess button in split view.
- Existing Phase 0c–1.1 tests still green (16 tests).
- Total: 21 tests, all passing.

## Regression watch

- Tab strip layout: adding a grade badge must not break existing close/checkbox behavior or the live-tab confirm-on-close guard.
- Compare pair: per-column Assess button does not interfere with the locked-pair checkbox UX or split view; clicking it does not steal focus to the wrong tab.
- History row layout: grade badge + note indicator do not displace the existing R indicator, rating thumbs, rename pencil, or delete affordance.
- `meta.json` backward compatibility: old rows without `note`/`grade`/`pdlSnapshot` read cleanly (treated as absent, not error).
- Save flow: live tab still demotes to `unsaved` correctly when a new Generate fires, carrying any in-progress note/grade/snapshot with it.
- Assess popover: outside-click and Esc both close it; closing flushes pending PATCH for saved tabs.

## Appendix — original (pre-implementation) criteria

These reflect the originally planned UI (inline reasoning-panel grade/note + per-tab note diamond) and are kept as historical record. They are **not** the spec to validate against:

> Click the tab's note indicator → textarea expands; click outside → collapses; indicator reflects has-note state. Reasoning panel shows grade picker and notes textarea; edits in either place mirror.
