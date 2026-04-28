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
- **Compare mode**: each tab has a checkbox to mark it for inclusion in compare. Entering compare mode splits the render area into N columns (one per checked tab), each column with its own Preview/Source/Reasoning toggle. Exit returns to single-tab view.
- **Rename a render**: from a History row, the user can inline-edit the render's name. The name is shown as the tab label (when open) and the History row label. Stored in `meta.json` as `name`. Live (unsaved) tabs show a default placeholder ("New render" or timestamp) until saved.

## Out of scope

- **Tab persistence across reload** — tabs are ephemeral session state. Reload restores live render only.
- **Tab drag-reorder** — tab order is open-order; no drag.
- **Diff highlighting** between compared columns — visual side-by-side only, no automated diff.
- **Comparing the live tab against itself across regenerations** beyond the basic "previous live becomes a regular tab" mechanism.
- **Renaming live (unsaved) tabs** before save — name is a property of saved renders only, set when first naming or by editing in History after save.

## Success signal

The user can generate three renders, save them all with distinct names, open all three from History into tabs, check two of them, enter compare mode, and view all three views (Preview / Source / Reasoning) side-by-side per column — switching each column's view independently — without losing any tab's state.

## Open questions

None blocking.
