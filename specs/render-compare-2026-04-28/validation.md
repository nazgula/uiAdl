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
8. Check the boxes on two tabs. Click the **Compare (2)** button. Two-column view appears. In column 1, switch to **Reasoning**; column 2 stays on Preview. Each column functions independently.
9. Exit compare mode. Original active-tab view restored.
10. Close every tab. Generate a new one. Live tab created cleanly.

## Automated checks (Playwright)

New tests, all with mocked `/api/generate`:

- `tabs.spec.js` — three saved renders → three open tabs → independent view state per tab.
- `live-guard.spec.js` — close X on live tab triggers confirm; cancel keeps it; accept closes it.
- `regenerate-demotes.spec.js` — second generate demotes first live to closeable unsaved tab (no guard).
- `compare-mode.spec.js` — check two tabs → compare button appears → two columns render → per-column view toggle independent.
- `rename.spec.js` — rename saved render → tab label and History row both update; persists across reload.

Existing suite must stay green:
- The Phase 1 history-→-reasoning auto-sync test should be updated (or split) to reflect that History now opens *into a tab* rather than replacing the current view; the lockstep invariant is preserved within the new tab.

## Regression watch

- **Reasoning view auto-sync (Phase 1 invariant)** — must hold within each tab. Switching between tabs must not leak reasoning from another tab.
- **Source-view Copy HTML button** (Phase 1) — must operate on the active tab's HTML, not stale `lastHTML`.
- **localStorage autosave** — projects + decisions must continue to persist independent of tab state.
- **Single-tab default flow** — for users who never compare, the experience should still be: generate → see render → save. The tab strip should not feel intrusive when only one tab is open.
- **iframe sandbox** — every tab's preview iframe still uses `sandbox="allow-scripts allow-same-origin"` and `srcdoc` injection. Compare mode must not relax this.
- **`meta.json` shape** — rows without a `name` (older saved renders) must still load and show `id` as fallback label.
