# Validation — Render Compare

## Manual checks

Walk through this end-to-end on a fresh project:

1. **Generate** a render. Verify a live tab appears with default name and the Save button is visible.
2. Click the live tab's close **X**. Confirm dialog appears. Cancel — tab stays. Click X again, accept — tab closes.
3. **Generate** again. **Generate** again. Two renders exist; previous live demoted to a closeable unsaved tab (no confirm on its X), newest is the guarded live tab.
4. **Save** the live tab. Save button hides; tab kind becomes saved; tab appears in History.
5. **Rename** the saved render from its History row (pencil affordance). Tab label updates immediately. Reload page — name persists in `meta.json`.
6. Click two more saved renders from History — they open as new tabs. Click one of them again — the existing tab is focused, no duplicate.
7. In tab A, switch to **Source** view. Switch to tab B — it shows its own last view (e.g. Preview), not Source. Switch back to A — still on Source.
8. Check the box on tab A — single view unchanged. Check the box on tab B — pair locks (status indicator "Comparing 2 renders" appears). Active tab is whichever was active before; if it isn't one of A or B, view stays single.
9. Click tab A — split view appears (two columns). Click the top **Source** button — both columns switch to source. Click **Reasoning** — both switch. The single-view preview/source/reasoning panels never overlap the split.
10. Click a non-paired tab (e.g. C) — split disappears, regular single view returns; status indicator stays. Click tab A again — split returns.
11. While paired, every other tab's checkbox is **disabled**. Uncheck tab A — split disappears, status indicator hides, all checkboxes re-enable.
12. Re-pair A and B. Close tab A via its X — split disappears immediately; tab B's checkbox state is preserved but it's alone, no split.
13. Close every tab. Generate a new one. Live tab created cleanly.

## Automated checks (Playwright)

All new tests live in `tests/e2e/render-compare.spec.js`, with mocked `/api/generate`:

- Generate creates a live tab (visible in the strip, marked `live`).
- Closing the live tab via X requires confirmation; cancel keeps it, accept closes it.
- A second generate demotes the previous live to a closeable unsaved tab (no confirm on its X).
- Opening a saved render from History creates a tab; clicking it again focuses (no duplicate).
- Checking the second tab auto-locks a compare pair; clicking a paired tab shows the split; non-paired tab returns to single; top toolbar P/S/R drives both columns; non-paired checkboxes are `disabled`; unchecking dissolves the pair. Single-view panels are hidden while split is visible.
- Closing a paired tab while in split exits the split immediately.
- Renaming a saved render from History updates the tab label + History label and persists across reload.
- Per-tab view state survives tab switching.

Existing core-flows suite stays green (8 tests). Total: 16 tests.

## Regression watch

- **Reasoning view auto-sync (Phase 1 invariant)** — must hold within each tab. Switching between tabs must not leak reasoning from another tab.
- **Source-view Copy HTML button** (Phase 1) — must operate on the active tab's HTML.
- **localStorage autosave** — projects + decisions must continue to persist independent of tab state.
- **Single-tab default flow** — for users who never compare, the experience should still be: generate → see render → save. The tab strip should not feel intrusive when only one tab is open.
- **iframe sandbox** — every tab's preview iframe (single or split column) still uses `sandbox="allow-scripts allow-same-origin"` and `srcdoc` injection.
- **`meta.json` shape** — rows without a `name` (older saved renders) must still load and show `id` as fallback label.
