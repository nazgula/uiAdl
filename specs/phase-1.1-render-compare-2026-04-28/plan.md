# Plan — Render Compare

Status: 1 [x], 2 [x], 3 [x], 4 [x], 5 [x], 6 [x], 7 [x]

## 1. [x] Per-tab state model + tab strip scaffolding

- Replace singleton `lastHTML` / `lastReasoning` / `activeView` with a `tabs[]` array and an `activeTabId`.
- Each tab carries: `id` (local, e.g. timestamp), `kind` ('live' | 'saved'), `renderId` (saved id or null), `name`, `html`, `reasoning`, `view` ('preview' | 'source' | 'reasoning'), `compareChecked` (bool).
- Add a `<div id="tab-strip">` above the existing render button row. Each tab shows: name, view checkbox (for compare), close X (with guard for live tab).
- The existing Render/History buttons + Preview/Source/Reasoning toggle now operate on `getActiveTab()`.
- Migrate `viewRender`, `renderPreview`, `setActiveView`, source code panel, reasoning panel to read/write the active tab.

## 2. [x] History → open-in-tab + dedup

- History row click: if a tab with matching `renderId` exists, focus it; else create a new saved tab from the saved render's html + reasoning + meta name and focus it.
- Remove the old single-slot replace behavior.

## 3. [x] Live tab + Generate demotion + close guard

- On `generate()` success, if a live tab exists and is still unsaved, mark it `kind='unsaved'` (demote, no confirm guard going forward), then create a new `kind='live'` tab with the new html/reasoning and focus it.
- Closing a `kind='live'` tab via X: show `confirm("This render is unsaved. Close anyway?")`.
- Saving a live tab promotes it: `kind='saved'`, fill in `renderId` + `name`, hide its Save button.

## 4. [x] Save-button scoping

- Save button visible only when `getActiveTab().kind === 'live' || 'unsaved'`. Hidden on saved tabs.
- After save, immediately mutate the active tab to `kind='saved'` so the button hides without a refresh.

## 5. [x] Compare pair (locked split)

- Tabs have a checkbox in the strip. Checking a second tab auto-locks a 2-tab compare pair (no Compare button).
- While paired, other tabs' checkboxes are `disabled`. The two paired checkboxes can be unchecked; doing so dissolves the pair.
- `isInSplit()` returns true when: a pair exists, the active tab is in the pair, and the active view is render/source/reasoning.
- `showSplit()` populates `#preview-compare` with two columns; both render whichever view the active tab has selected. The top toolbar's P/S/R buttons act on the active tab's view, which both columns share.
- Clicking a non-paired tab returns to single-tab view (pair stays locked, just not visible).
- History view is single-pane regardless of pair state.
- Closing a paired tab dissolves the pair (since `checkedTabs()` drops to 1).

## 6. [x] Rename saved render

- History row: existing label becomes inline-editable on click of a small pencil affordance (not the row body — that opens the tab).
- On commit: `PATCH /api/renders/:project/:id` with `{ name }`. Server writes `name` into the row in `meta.json`.
- If a tab is open for that render, update its `name` in place so the tab label updates.
- Live/unsaved tabs default name: `"New render"` or short timestamp. Becomes editable only after save.

## 7. [x] Tests + architecture doc

- Playwright tests:
  - Open three saved renders into tabs; switch between them; verify each tab's Preview/Source/Reasoning is preserved independently.
  - Generate → live tab appears guarded; close X triggers confirm; cancel keeps tab.
  - Generate twice → previous live demotes, new live is guarded.
  - Check two tabs → pair auto-locks → click a paired tab → both columns visible → top toolbar Source switches both at once → click non-paired tab → split disappears → uncheck → pair dissolves.
  - Rename a saved render → tab label and History row both update.
- Update `specs/architecture.md`:
  - Replace Frontend State block (singletons → `tabs[]` + `activeTabId`).
  - Add "Tabs" subsection describing live/unsaved/saved kinds and the close-guard.
  - Add "Compare pair (locked split)" subsection (2-column split tied to active-tab focus, top-toolbar drives both columns).
  - Update "Render-area hierarchy" invariant: lockstep is *within each tab*.
  - `meta.json` row format gains `name`.
  - Backend route note: `PATCH /api/renders/:project/:id` now accepts `name` (in addition to existing rating/note).

## Architecture impact

- **Frontend state**: singletons (`lastHTML`, `lastReasoning`, `activeView`) replaced by `tabs[]` + `activeTabId`. This is the largest change in the project so far at the frontend state level.
- **New invariant**: per-tab lockstep (Phase 1 invariant rewritten).
- **New mode**: compare (multi-column render area).
- **Backend**: `PATCH /api/renders/:project/:id` extended to accept `name`; `meta.json` rows gain optional `name` field. Old rows without `name` fall back to `id` as the display label.
- **No new routes.**
