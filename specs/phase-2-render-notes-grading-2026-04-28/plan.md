# Render Notes & Grading — Plan

Status: 1 [x], 2 [x], 3 [x], 4 [x], 5 [x], 6 [x]

## 1. [x] Backend: meta.json schema + endpoints

- Extend the meta entry shape with optional `note` (string), `grade` (1–5 integer or null), `pdlSnapshot` (array of `{ text, category }`).
- `POST /api/renders/:project` accepts optional `note`, `grade`, `pdlSnapshot` in the body and writes them into the new meta row.
- `PATCH /api/renders/:project/:id` accepts `note` and `grade` (in addition to existing `rating` / `name`). Empty-string note clears the field; `grade: null` clears it.
- `pdlSnapshot` is write-once on save — `PATCH` ignores it.
- `GET /api/renders/:project` already returns the meta array; new fields ride along without code change.

## 2. [x] Generate path: capture active-decisions snapshot

- In `generate()`, after building the prompt, record `decisions.filter(d => d.active).map(d => ({ text, category }))` onto the new live tab as `tab.pdlSnapshot`.
- On save, send `pdlSnapshot` (and any `note` / `grade` already entered on the live tab) in the POST body.
- When a saved tab is reopened from History, fetch any persisted snapshot via the meta row (already loaded into the `tabs` History list) and attach it to the tab object so the Reasoning panel can show it.

## 3. [x] Tab strip UI: grade badge + collapsible note affordance

- Add a small grade badge to each tab in the strip showing the current grade (or empty/placeholder slot when ungraded). Active tab badge is interactive: clicking cycles through 1–5 / clear, or opens a tiny picker — pick whichever feels lighter.
- Add a note affordance on each tab: a tiny "M" / dot icon. Collapsed state is a single character/dot — non-blocking. Clicking expands a small textarea overlay anchored to the tab; clicking outside or pressing Esc collapses it back. Indicator visually differs when a note is present vs empty.
- Both controls write to `tab.note` / `tab.grade` and immediately PATCH for saved tabs; for live/unsaved tabs the values stay on the tab object until save.

## 4. [x] Reasoning panel: mirror notes + grade

- Add a notes textarea and a 1–5 grade picker to the Reasoning panel. Both are bound to the active tab's `note` / `grade` — same source of truth as the tab-strip controls.
- Show the captured `pdlSnapshot` in the Reasoning panel as a small read-only block ("Active PDL at generate time"). Renders without a snapshot show "Snapshot not captured (pre-Phase 2 render)."
- Saved-tab edits PATCH on blur / debounce.

## 5. [x] History row: grade badge + note indicator

- Render the grade as a numeric badge on the History row.
- When `note` is non-empty, show the same small note indicator used on tabs.
- Both indicators appear alongside the existing R (reasoning) marker; layout stays compact.

## 6. [x] Tests + architecture doc

- Playwright: new test that generates a render, sets a grade and note from the tab strip, saves, reloads, reopens from History, and asserts grade + note + snapshot are present.
- Playwright: test that editing the note in the Reasoning panel reflects in the tab indicator and vice versa.
- Run the existing suite; fix any regressions caused by tab-strip layout changes.
- Update `specs/architecture.md`: meta.json shape (`note`, `grade`, `pdlSnapshot`), tab state additions (`note`, `grade`, `pdlSnapshot`), PATCH/POST payload changes, mirror invariant between Reasoning panel and tab-strip controls.

## Architecture impact

`specs/architecture.md` will gain at finish-phase time:
- `meta.json` schema: `note`, `grade`, `pdlSnapshot` (active-only, captured at generate, write-once).
- Tab state: `note`, `grade`, `pdlSnapshot` on each tab object.
- Endpoint payloads: `POST /api/renders/:project` now accepts `note`, `grade`, `pdlSnapshot`; `PATCH` accepts `note`, `grade` (snapshot is write-once).
- New invariant: tab-strip note/grade controls and Reasoning-panel note/grade controls share a single source of truth (active tab's fields).
