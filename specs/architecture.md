# Architecture

How the pieces fit together. For stack and constraints see `tech-stack.md`; for what we're building next see `roadmap.md`.

## Shape

Single-page app with a thin Express backend. No build step. The frontend talks to the backend via JSON over HTTP; the backend proxies the Anthropic API and persists projects + renders to disk.

## Backend (`server.js`)

Express app with two responsibilities: proxy the Anthropic API (so the API key never reaches the browser) and CRUD the on-disk project / render data.

- `POST /api/generate` — Anthropic proxy. Forwards the request body to the Messages API and returns the raw response. API key read from `.env`.
- `GET /api/projects` — returns `[{ slug, name }]` for everything in `projects/`, sorted by display name. `name` falls back to slug when the file lacks a `name` field.
- `GET /api/projects/:name`, `POST /api/projects/:name`, `DELETE /api/projects/:name` — JSON files in `projects/`. `POST` accepts the slug in the URL path; the frontend `Save` button (Phase 2.6) lowercases the project-name input and replaces non-`[a-z0-9_-]` to derive it.
- `POST /api/renders/:project` — saves a render. Accepts `{ html, reasoning, note?, grade?, pdlSnapshot? }`. Stores `{id}.html` and `{id}.reasoning.txt` in `renders/{slug}/`. Updates `meta.json` (id, savedAt, rating, hasReasoning, optional `note`, `grade`, `pdlSnapshot`).
- `GET /api/renders/:project` — returns the meta array for a project.
- `GET /api/renders/:project/:id` — returns the saved HTML.
- `GET /api/renders/:project/:id/reasoning` — returns the saved reasoning text.
- `PATCH /api/renders/:project/:id` — updates `rating` / `note` / `grade` / `name` in `meta.json`. Empty-string `note` clears the field; `grade: null` clears it; valid grades are integers 1–5. `pdlSnapshot` is **write-once** at save time and ignored by PATCH. `name` empty string deletes the field (falls back to default label).
- `DELETE /api/renders/:project/:id` — deletes both `{id}.html` and `{id}.reasoning.txt` and removes the row from `meta.json`.
- `GET /api/prompts` — returns the prompt registry `{ versions: [...], activeVersionId }`.
- `POST /api/prompts` — body `{ text, parentId?, summary? }`. Server assigns `id` and `createdAt`, appends to `versions[]`, sets `activeVersionId` to the new id. Versions are immutable once written.
- `GET /api/prompts/:id` — returns one version object.
- `PUT /api/prompts/active` — body `{ id }`. Updates `activeVersionId` only.
- `GET /api/prompts/stats` — returns `{ [versionId]: { avg, n } }` aggregated from all projects' `meta.json` rows by `promptVersionId`.

`POST /api/renders/:project` and `meta.json` rows accept an optional `promptVersionId` linking the saved render to the prompt version that produced it. Older meta rows without this field render normally (no badge).

## Frontend layout

`index.html` + `app.js`. See `tech-stack.md` for the file split rationale; the rest of this section covers what `app.js` actually does.

### Frontend state

```js
decisions[]          // all project decisions
project {name, desc}
editingId            // prevents toggleDecision firing during inline edit
model                // 'haiku' | 'sonnet'
activeTab            // left-panel tab: 'decisions' | 'prompt'

// Prompt registry (Phase 2.5)
prompts[]            // [{ id, createdAt, text, parentId, summary }]
activePromptVersionId
promptStats          // { [versionId]: { avg, n } }

// Render tabs (Phase 1.1, extended in Phase 2)
tabs[]               // [{ id, kind, renderId, name, html, reasoning, view, compareChecked,
                     //    note, grade, pdlSnapshot, promptVersionId }]
activeTabId          // currently focused render tab
compareMode          // true while N-column compare view is active

// Workspace dirty tracking (Phase 2.6)
dirty                // true iff there have been edits since the last successful
                     // server-save (saveToServer) or Open (openProject). Set via
                     // markDirty() which is called from autosave() on every edit.
                     // Cleared on successful save / open / New.
```

`note` is a free-text string (empty when absent), `grade` is an integer 1–5 or `null`, `pdlSnapshot` is `[{ text, category }]` of decisions active at generate time (or `null` for renders saved before Phase 2). The snapshot is captured by `generate()` and is write-once on save — there is no edit path.

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

### Notes & grading (Phase 2)

Each tab carries a `note`, `grade` (1–5), and `pdlSnapshot`. Access is via a single **Assess** button (popover with grade picker + note textarea):
- **Single-pane view** — Assess button sits in the right-pane toolbar next to Save Render. Hidden while a compare pair is in split view.
- **Split view** — each column header has its own Assess button so notes/grade are editable for either render in the pair.
- **Tab strip** — only the grade badge appears (clickable: cycles 1→5→clear). No separate note indicator.
- **Reasoning view** — shows the captured `pdlSnapshot` as a collapsible block (collapsed by default; primarily for AI consumption in Phase 2.5). Reasoning view does **not** duplicate the grade/note controls — Assess in the toolbar is the only entry point.

The popover writes to the tab object immediately; for saved tabs, note edits debounce-PATCH and grade changes PATCH on click. Closing the popover (outside-click or Esc) flushes any pending PATCH. History rows show a numeric grade badge and a small note indicator.

**Single source of truth**: tab object's `note` / `grade`. Tab-strip grade badge, toolbar Assess button label, split column Assess button, and the Assess popover all read from and write to the same fields.

### Project actions (Phase 2.6)

Header row contains five project-action controls: `New | Save | Open ▾ | Export | Import`.

- **New** — clears name/desc/decisions/prompt-text and closes all render tabs. Honors the `dirty` flag: shows `confirm("Discard unsaved changes?")` only when dirty.
- **Save** — `POST /api/projects/:slug` where `:slug` is derived from the project-name input via the same lowercase + `[^a-z0-9_-]→_` rule used elsewhere. Empty name → toast "Name a project before saving" and no request. Silent overwrite. Toast "Saved" on success. Clears `dirty`.
- **Open ▾** — dropdown built from `GET /api/projects`. Fetches on open (not page load) so the list reflects recent saves. Click → `openProject(slug)` which fetches `GET /api/projects/:name`, replaces workspace, clears `dirty`. Same `dirty`-confirm gate as `New`.
- **Export / Import** — unchanged file-based JSON download / upload flow. Used for sharing; not server-backed. Imports leave the workspace dirty (no implicit server save).

The `dirty` flag is the single source of truth for the unsaved-state confirm. It is set by every project-side edit (decisions, project-name, desc, per-project prompt textarea) via `autosave() → markDirty()` and cleared by `saveToServer`, `openProject`, and `newProject`. Render-side state changes (tab grade, tab note, view switching) do not flip `dirty` — they belong to the render layer, not the project file.

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

The per-project `prompt` is a workspace-scoped override edited via the Gen Prompt textarea. The **prompt registry** (`prompts.json` at repo root) is the source of truth for *versioned* generation prompts; the per-project field is not version-tracked. Renders carry `promptVersionId` linking back to whichever registry version was active at generate time.

Stored at `projects/{slug}.json` where slug is the project name lowercased with `[^a-z0-9_-]` replaced by `_`. The same slug rule is used for `renders/{slug}/`.

## Prompt registry

`prompts.json` at the repo root (gitignored). Shape:

```json
{
  "versions": [
    { "id": "...", "createdAt": "...", "text": "...", "parentId": "...|null", "summary": "..." }
  ],
  "activeVersionId": "..."
}
```

Seeded on first server start with one version equal to the in-code `DEFAULT_PROMPT`. Versions are append-only and immutable; switching the active version is a separate operation (`PUT /api/prompts/active`).

The **Improvement Consult** is a Claude tool-use call that bundles the active prompt + N graded renders (PDL snapshot + reasoning + note + grade per render, no HTML) and asks the model to propose a new prompt. The response surfaces in a review modal showing a line-level diff, per-render grade comparison (user vs model with rationale), limits notes, and an editable proposal textarea. Save creates a new version (`POST /api/prompts`) and makes it active; Cancel discards. Threshold to enable: ≥3 graded renders for the active project.
