# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
npm install        # first time only
node server.js     # starts at http://localhost:8080
```

Or double-click `start.command` in Finder (runs npm install if needed, opens browser).

## Architecture

Single-page app with a thin Express backend. No build step.

**`server.js`** — three responsibilities:
1. Serves `index.html` as a static file
2. `POST /api/generate` — proxies requests to Anthropic API (key lives in `.env`, never sent to browser)
3. `POST /api/load-url` — fetches a remote JSON project file server-side (avoids browser CORS)
4. CRUD routes under `/api/projects/:name` for reading/writing JSON files in `projects/`

**`index.html`** — entire frontend in one file: markup, Tailwind (CDN), and vanilla JS. No framework, no bundler.

Key frontend state: `decisions[]`, `project {name, desc}`, `editingId`, `model`. All state lives in JS variables; `autosave()` persists to `localStorage` as a session fallback.

## Project file format

```json
{ "name": "...", "desc": "...", "decisions": [{ "id": 1234, "text": "...", "category": "entity|flow|ui|constraint", "active": true }] }
```

## Prompt construction

`buildFullPrompt()` assembles: project name + desc header → user prompt text → grouped active decisions by category. This is what gets sent to the model via `/api/generate`.

## Key UX details to preserve

- Decision rows: clicking the text span enters inline edit mode (`startEdit`); clicking the checkbox or elsewhere on the row toggles active. `editingId` flag prevents toggle firing during an edit (avoids a DOM conflict).
- Inline editor is a `<textarea>` sized to the span's `offsetHeight`, auto-grows on input.
- The add-decision field is a `<textarea rows="3">`: Enter adds, Shift+Enter inserts newline.
- Generated HTML renders in a sandboxed iframe via `srcdoc`.

## Environment

`.env` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
```

`projects/` and `config.json` are gitignored — they are runtime data.
