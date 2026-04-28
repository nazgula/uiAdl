# Phase 1.1 — Render Compare

## Why

Grading reasoning quality in the abstract (Phase 2) is meaningless until you've compared real renders side-by-side. You need to *see* what good looks like across several attempts before encoding it as a score. Today the render area is single-slot — switching between renders destroys the previous view, so comparison is impossible.

## In scope

- **Multi-tab render area** above the existing Render/History button row. Each tab is one render (live or saved).
- **Open from History**: clicking a History row opens that render as a new tab, or focuses the existing tab if one is already open for that render.
- **Live tab guard**: the most recent freshly-generated render is unsaved and "live." Closing it via the tab X shows an "Are you sure? This render is unsaved." confirm dialog. All other tabs (other unsaved tabs, saved tabs) close without confirmation.
- **Generate behavior**: clicking Generate while a previous live tab is still open demotes the previous live to a regular closeable unsaved tab; the new generation takes the guarded live slot.
- **Save button scope**: visible/enabled only on unsaved tabs. Hidden on saved tabs.
- **Per-tab view state**: each tab independently tracks its active view (Preview / Source / Reasoning). Switching tabs restores that tab's view selection.
- **Lockstep invariant per tab**: Preview, Source, and Reasoning within a single tab always reflect the same render (Phase 1 invariant, scoped to each tab).
- **Compare pair (locked split)**: each tab has a checkbox in the strip. Checking a second tab auto-locks a compare pair (no separate Compare button). While the pair is locked:
  - The two paired tabs' checkboxes can be unchecked; all other tabs' checkboxes are disabled (no triples).
  - Clicking either paired tab shows a 2-column split of the pair.
  - Clicking any non-paired tab returns to the regular single-tab view (the pair stays locked but isn't visible).
  - The top toolbar's Preview/Source/Reasoning buttons control **both** columns simultaneously — the compare axis is render-vs-render, source-vs-source, reasoning-vs-reasoning. There is no per-column toggle.
  - History view is single-pane even while a pair is locked.
  - Closing either paired tab or unchecking either checkbox dissolves the pair immediately (split disappears).
- **Rename a render**: from a History row, the user can inline-edit the render's name. The name is shown as the tab label (when open) and the History row label. Stored in `meta.json` as `name`. Live (unsaved) tabs show a default placeholder ("New render" or timestamp) until saved.

## Out of scope

- **Tab persistence across reload** — tabs are ephemeral session state. Reload restores live render only.
- **Tab drag-reorder** — tab order is open-order; no drag.
- **Diff highlighting** between compared columns — visual side-by-side only, no automated diff.
- **Comparing the live tab against itself across regenerations** beyond the basic "previous live becomes a regular tab" mechanism.
- **Renaming live (unsaved) tabs** before save — name is a property of saved renders only, set when first naming or by editing in History after save.

## Success signal

The user can generate three renders, save them all with distinct names, open all three from History into tabs, check two of them (auto-locking a compare pair), and toggle between Preview/Source/Reasoning to compare those two side-by-side. Clicking the third tab returns to single view; re-clicking either paired tab restores the split. Unchecking either dissolves the pair.

## Open questions

None blocking.
