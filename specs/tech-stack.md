# Tech Stack

## Runtime

- **Node.js** — no version pinning; whatever is current on the host machine
- **Express** — thin HTTP server, no middleware beyond `express.json` and `express.static`

## Frontend

- **Vanilla JS** — no framework, no bundler, no build step
- **Tailwind CSS** — loaded from CDN in `index.html`; used only for app UI chrome, never injected into generated wireframes
- **File layout** — `index.html` holds markup + inline `<style>` and loads `/app.js` at the end of `<body>`. `app.js` holds all frontend logic. Both are served as static files; top-level `function` declarations in `app.js` stay global so the inline `onclick=` handlers in the markup keep working.

## AI

- **Anthropic API** — `POST /api/messages` proxied through `server.js`
- **Models in use:**
  - `claude-haiku-4-5-20251001` — fast, cheap; default for iteration
  - `claude-sonnet-4-6` — higher quality; used for important renders
- **API key** — stored in `.env`, never exposed to the browser

## Storage

- **Projects** — JSON files in `projects/{name}.json`
- **Renders** — HTML files in `renders/{slug}/{id}.html`
- **Reasoning** — plain text in `renders/{slug}/{id}.reasoning.txt`
- **Render metadata** — `renders/{slug}/meta.json` (id, savedAt, rating, hasReasoning, optional `name`)
- **No database** — file system is the database; sufficient for solo use

## Testing

- **Playwright** — E2E tests only (`@playwright/test`, dev dependency)
- Single browser: Chromium
- API calls mocked via `route()` — no real Anthropic credits burned in tests
- Config: `playwright.config.js` (`.js` not `.ts` — no TypeScript in this project)

## Constraints

- No TypeScript
- No build step
- No external database
- No authentication
- Runs locally only (`localhost:8080`)
