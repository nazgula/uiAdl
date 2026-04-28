# Architecture

How the pieces fit together. For stack and constraints see `tech-stack.md`; for what we're building next see `roadmap.md`.

## Shape

Single-page app with a thin Express backend. No build step. The frontend talks to the backend via JSON over HTTP; the backend proxies the Anthropic API and persists projects + renders to disk.

## Backend (`server.js`)

Express app with two responsibilities: proxy the Anthropic API (so the API key never reaches the browser) and CRUD the on-disk project / render data.

- `POST /api/generate` — Anthropic proxy. Forwards the request body to the Messages API and returns the raw response. API key read from `.env`.
- `GET /api/projects/:name`, `POST /api/projects/:name`, `DELETE /api/projects/:name` — JSON files in `projects/`.
- `POST /api/renders/:project` — saves a render. Accepts `{ html, reasoning }`. Stores `{id}.html` and `{id}.reasoning.txt` in `renders/{slug}/`. Updates `meta.json` (id, savedAt, rating, hasReasoning).
- `GET /api/renders/:project` — returns the meta array for a project.
- `GET /api/renders/:project/:id` — returns the saved HTML.
- `GET /api/renders/:project/:id/reasoning` — returns the saved reasoning text.
- `PATCH /api/renders/:project/:id` — updates `rating` / `note` / `name` in `meta.json`. `name` is optional; an empty string deletes the field (falls back to default label).
- `DELETE /api/renders/:project/:id` — deletes both `{id}.html` and `{id}.reasoning.txt` and removes the row from `meta.json`.

## Frontend layout

`index.html` + `app.js`. See `tech-stack.md` for the file split rationale; the rest of this section covers what `app.js` actually does.

### Frontend state

```js
decisions[]          // all project decisions
project {name, desc}
editingId            // prevents toggleDecision firing during inline edit
model                // 'haiku' | 'sonnet'
activeTab            // left-panel tab: 'decisions' | 'prompt'

// Render tabs (Phase 1.1)
tabs[]               // [{ id, kind, renderId, name, html, reasoning, view, compareChecked }]
activeTabId          // currently focused render tab
compareMode          // true while N-column compare view is active
```

State lives in module-scope variables in `app.js`. Persistence is via `localStorage` (autosaved on every edit) and `/api/projects/:name` (manual save). Render tabs are **ephemeral** — not persisted across reload.

### Render tabs

Each render — whether freshly generated (`live`/`unsaved`) or loaded from History (`saved`) — is a tab in the tab strip above the render-area buttons.

- **`kind: 'live'`** — the most recent unsaved generation. Closing via the tab X shows a `confirm()` guard.
- **`kind: 'unsaved'`** — a previously-live tab that was demoted when a newer Generate created a new live tab. Closes without confirmation.
- **`kind: 'saved'`** — a render loaded from History or a freshly-saved live tab. Closes without confirmation.

Generation rules:
- `generate()` demotes any existing `live` tab to `unsaved`, then creates a new `live` tab and focuses it.
- Saving a `live`/`unsaved` tab promotes it to `saved` (sets `renderId`, hides Save button).
- Clicking a History row opens that render in a new tab, or focuses the existing tab (matched by `renderId`).
- Deleting a render from History also closes any open tab pointing to it.

### Render-area hierarchy

The right pane button row reads `Render [ Preview | Source | Reasoning ] · History`. Preview, Source, and Reasoning are three aspects of one currently-active *tab*; History is a separate axis (which renders exist on disk).

**Per-tab lockstep invariant**: within a single tab, Preview, Source, and Reasoning always reflect that tab's html/reasoning. Switching to a different tab restores that tab's last-selected view (`tab.view`). A History selection opens (or focuses) a tab — it never silently mutates the active tab.

### Compare pair (locked split)

Each tab has a checkbox in the strip. Checking exactly two tabs auto-locks a **compare pair** — no separate Compare button. While a pair is locked:

- The two paired checkboxes can be unchecked; all other tabs' checkboxes are disabled (no triples).
- Clicking either paired tab shows a 2-column split (`#preview-compare` populated dynamically) — both columns render the **same view** (Preview / Source / Reasoning) at once.
- Clicking any non-paired tab returns to the single-tab render area; the pair stays locked but isn't visible until a paired tab is focused again.
- The top toolbar's Preview/Source/Reasoning buttons control **both columns simultaneously** — the compare axis is render-vs-render, source-vs-source, reasoning-vs-reasoning. There is no per-column toggle.
- History view is always single-pane (the split is hidden while History is the active view).
- Closing either paired tab or unchecking either checkbox dissolves the pair immediately.

The Save button is hidden whenever the split is currently visible (saving requires a single active tab).

### Reasoning block

`DEFAULT_PROMPT` instructs the model to write `<reasoning>...</reasoning>` before the HTML. `generate()` parses this out: stores the reasoning on the new tab, strips it from the HTML before rendering, and shows it in the Reasoning view of that tab. When saving a render, the tab's reasoning is sent to the server and stored as `{id}.reasoning.txt`. History rows show an **R** indicator on renders that have saved reasoning. Saved tabs auto-fetch the reasoning text when opened.

### Render-area hierarchy

The right pane button row reads `Render [ Preview | Source | Reasoning ] · History`. Preview, Source, and Reasoning are three aspects of one currently-viewed render; History is a separate axis (which render). **Lockstep invariant**: Preview, Source, and Reasoning always reflect the same render. A History selection (`viewRender`) updates `lastHTML`, `source-code`, the iframe preview, *and* the reasoning panel together — they cannot drift. If a saved render has no `.reasoning.txt`, the Reasoning panel shows "No reasoning saved for this render." rather than stale content.

### Prompt construction

`buildFullPrompt()` composes: project name + desc header → user prompt text → grouped active decisions by category. `generate()` reads from the editable `#prompt-preview` textarea (or falls back to `buildFullPrompt()` if empty). Users can edit the assembled prompt directly before sending.

### Render preview

`renderPreview(html)` is **async**. It fetches `/wireframe.css`, injects it at the start of `<head>` (so model CSS that follows overrides it), then sets `frame.srcdoc`. Generated HTML runs in a sandboxed iframe — `sandbox="allow-scripts allow-same-origin"` — never in the parent document.

### UX invariants worth preserving

- Decision rows: clicking the text span enters inline edit (`startEdit`); clicking the checkbox or anywhere else toggles active. `editingId` prevents toggle firing during edit.
- Inline editor is a `<textarea>` sized to the span's `offsetHeight`, auto-grows on input.
- The add-decision field is `<textarea rows="3">`: Enter adds, Shift+Enter inserts a newline.
- Generated HTML always renders in a sandboxed iframe via `srcdoc` — never injected into the parent document.

## `wireframe.css`

A wireframe vocabulary stylesheet served as a static file. Injected at the start of `<head>` in `renderPreview()` so the model's own CSS (which always comes after) overrides it. Defines: `.panel`, `.panel-header`, `.tab-bar`, `.tab`, `.card`, `.card-header`, `.card-body`, `.btn`, `.btn-primary`, `.btn-block`, `.input`, `.select`, `.form-group`, `.upload-area`, `.placeholder`, `.badge`, `.toast`, `.table`, `.modal`, `.hidden`, `.empty-state`, `.loading`, `.score-bar-wrap`, `.score-bar-fill`, `.check-item`, `.scroll-area`.

The file is a base layer the model can override. See `roadmap.md` "Deferred" for why we don't lean on it harder.

## Project file format

```json
{
  "name": "...",
  "desc": "...",
  "prompt": "...",
  "decisions": [
    { "id": 1234, "text": "...", "category": "flow|ui|constraint", "active": true }
  ]
}
```

Older project files may contain a `refinePrompt` field or decisions with `category: "entity"` — both are ignored by the current UI. No migration step rewrites them.

Stored at `projects/{slug}.json` where slug is the project name lowercased with `[^a-z0-9_-]` replaced by `_`. The same slug rule is used for `renders/{slug}/`.
