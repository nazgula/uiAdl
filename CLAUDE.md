# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Spec-driven development

This project follows SDD — specs define what gets built and in what order. Before implementing anything, read the relevant spec.

```
specs/
  mission.md      — what this tool is for and what "good" looks like
  tech-stack.md   — stack constraints (no TypeScript, no build step, etc.)
  roadmap.md      — phases of work; source of truth for what to build next
```

**Rules:**
- Never implement a feature that isn't in the roadmap, or that belongs to a later phase
- Never violate a constraint in `tech-stack.md` (e.g. don't add TypeScript, don't add a framework)
- If a task seems to conflict with the specs, flag it — don't resolve it silently
- The current phase is whichever phase in `specs/roadmap.md` has the first unchecked items — read it to find out

---

## Running the app

```bash
npm install        # first time only
node server.js     # starts at http://localhost:8080
```

Or double-click `start.command` in Finder (runs npm install if needed, opens browser).

## Architecture

Single-page app with a thin Express backend. No build step.

**`server.js`** — proxies Anthropic API, serves static files, CRUD for projects and renders.
- `POST /api/generate` — Anthropic proxy (key in `.env`, never sent to browser)
- `POST /api/load-url` — fetches remote JSON project files server-side (avoids CORS)
- `GET/POST/DELETE /api/projects/:name` — JSON files in `projects/`
- `POST /api/renders/:project` — saves HTML + optional reasoning. Accepts `{ html, reasoning }`. Stores `{id}.html` and `{id}.reasoning.txt` in `renders/{slug}/`. Meta in `meta.json` includes `hasReasoning` flag.
- `GET /api/renders/:project` — returns meta array
- `GET /api/renders/:project/:id` — returns HTML
- `GET /api/renders/:project/:id/reasoning` — returns reasoning text
- `PATCH /api/renders/:project/:id` — update rating/note
- `DELETE /api/renders/:project/:id` — delete render

**`index.html`** — entire frontend in one file: markup, Tailwind (CDN), vanilla JS. No framework, no bundler.

**`wireframe.css`** — wireframe vocabulary stylesheet served as a static file. Injected at the start of `<head>` in `renderPreview()` so the model's own CSS (which always comes after) overrides it. Defines: `.panel`, `.panel-header`, `.tab-bar`, `.tab`, `.card`, `.card-header`, `.card-body`, `.btn`, `.btn-primary`, `.btn-block`, `.input`, `.select`, `.form-group`, `.upload-area`, `.placeholder`, `.badge`, `.toast`, `.table`, `.modal`, `.hidden`, `.empty-state`, `.loading`, `.score-bar-wrap`, `.score-bar-fill`, `.check-item`, `.scroll-area`.

## Key frontend state

```js
decisions[]          // all project decisions
project {name, desc}
editingId            // prevents toggleDecision firing during inline edit
model                // 'haiku' | 'sonnet'
lastHTML             // most recently generated/viewed HTML
lastReasoning        // reasoning block extracted from last generation
activeView / activeTab
```

## Reasoning block

`DEFAULT_PROMPT` instructs the model to write `<reasoning>...</reasoning>` before the HTML. `generate()` parses this out: saves reasoning to `lastReasoning`, strips it from HTML before rendering, and shows it in the Analysis tab. When saving a render, `lastReasoning` is sent to the server and stored as `{id}.reasoning.txt`. History rows show an **R** button on renders that have saved reasoning; clicking it calls `viewReasoning()` which loads the text into the Analysis view.

## Prompt construction

`buildFullPrompt()`: project name + desc header → user prompt text → grouped active decisions by category. `generate()` reads from the editable `#prompt-preview` textarea (or falls back to `buildFullPrompt()`).

## Render preview

`renderPreview(html)` is **async**. It fetches `/wireframe.css`, injects it at the start of `<head>` (so model CSS that follows overrides it), then sets `frame.srcdoc`.

## Project file format

```json
{ "name": "...", "desc": "...", "prompt": "...", "refinePrompt": "...", "decisions": [{ "id": 1234, "text": "...", "category": "entity|flow|ui|constraint", "active": true }] }
```

## Key UX details to preserve

- Decision rows: clicking the text span enters inline edit (`startEdit`); clicking checkbox or elsewhere toggles active. `editingId` prevents toggle firing during edit.
- Inline editor is a `<textarea>` sized to the span's `offsetHeight`, auto-grows on input.
- The add-decision field is `<textarea rows="3">`: Enter adds, Shift+Enter inserts newline.
- Generated HTML renders in a sandboxed iframe via `srcdoc`.

## Environment

`.env` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
```

`projects/`, `renders/`, and `config.json` are gitignored — runtime data.

## Generation architecture status

See `specs/roadmap.md` for the full plan and current phase.

Key lessons already learned (do not re-litigate):
- Reasoning block (parse + save) is built and working
- CSS vocabulary instruction doesn't save tokens — model rewrites all CSS regardless. `wireframe.css` is a base layer only; model overrides it. Not worth investing further in this direction.
- Next: reasoning quality loop (Phase 1) — grade saved reasoning, inject high-scored blocks as structural reference
