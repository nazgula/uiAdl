# Render Notes & Grading — Validation

## Manual checks

1. Open a project with a few decisions; toggle some active and some inactive.
2. Click Generate. While the live tab is open:
   - Click the tab's grade badge → set grade to 4. Badge shows `4` on the tab and stays visible after switching tabs and back.
   - Click the tab's note indicator → textarea expands; type "structure feels right but spacing is off". Click outside → textarea collapses; the note indicator now shows the "has-note" state.
3. Open the Reasoning panel for the live tab → grade picker shows `4`, notes textarea shows the note. Edit the note in the Reasoning panel; switch back to Preview and re-open the tab note affordance — the new text is there.
4. Save the render. Confirm:
   - Server response succeeds; tab promotes to `saved`.
   - History row for this render shows the grade badge `4` and the note indicator.
   - Reasoning panel shows an "Active PDL at generate time" block listing the active decisions from step 1 (and only those).
5. Reload the page. Open the saved render from History. Grade, note, and snapshot all restored.
6. From the Reasoning panel, change grade to 2 and edit the note. Reload. Both updates persisted (PATCH worked).
7. Open an older saved render (one without a snapshot). Reasoning panel shows "Snapshot not captured (pre-Phase 2 render)." Grade and note controls still work.
8. Clear the grade and the note on a saved render → reload → both cleared (empty string note, null grade).

## Automated checks

- New Playwright test: generate → set grade and note via tab strip → save → reload page → reopen from History → assert grade badge, note indicator on row, snapshot block in Reasoning panel.
- New Playwright test: edit note from Reasoning panel; assert tab-strip note indicator updates. Edit grade from tab strip; assert Reasoning panel grade picker updates.
- New Playwright test: PATCH path — saved render, change grade and note, reload, assert persisted.
- Existing Phase 0c–1.1 tests still green.

## Regression watch

- Tab strip layout: adding a grade badge + note indicator must not break existing close/checkbox behavior or the live-tab confirm-on-close guard.
- Compare pair: ensure new per-tab controls don't interfere with the locked-pair checkbox UX or split view.
- History row layout: grade badge + note indicator should not displace the existing R indicator, rating thumbs, rename pencil, or delete affordance.
- `meta.json` backward compatibility: old rows without `note`/`grade`/`pdlSnapshot` must read cleanly (treated as absent, not error).
- Save flow: live tab still demotes to `unsaved` correctly when a new Generate fires, carrying any in-progress note/grade/snapshot with it.
