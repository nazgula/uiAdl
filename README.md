# PDL — Project Decision List

> A wireframe prototyping tool that generates HTML mockups from structured project decisions, using Claude as the generator.

![PDL screenshot](docs/screenshot.png)
<!-- TODO: add screenshot.png -->

## What it does

PDL converts a product idea — expressed as a list of typed decisions across entities, flows, UI components, and constraints — into a complete, interactive HTML wireframe. You write the decisions; Claude plans the structure in a `<reasoning>` block, then writes the HTML.

It is a personal design tool for the early stage of product work, when the question is "what does this thing actually do" rather than "how does it look polished." Wireframe fidelity, Balsamiq-style.

## How it works

- **Decisions** are typed (entity, flow, ui, constraint) and toggleable — only active ones are sent to the model
- **Generation** uses a two-stage prompt: first a `<reasoning>` block for structural planning, then the HTML
- **Reasoning** is stripped from the render but saved separately, so the user can inspect why a render came out the way it did
- A wireframe base stylesheet (`wireframe.css`) is injected into every render before the model's own styles, giving consistent layout primitives the model can override
- A **Refine PDL** pass takes the full decision list and returns a re-categorized, gap-filled version as text
- All renders are saved with their reasoning under `renders/{project-slug}/`, ratable as good/bad for future reference

## What I learned

- Giving the model a numbered spatial hierarchy degrades output — it flattens flows into spatial siblings and over-elaborates in wrong areas
- The CSS vocabulary approach (instructing the model to use predefined classes) doesn't save tokens — the model always rewrites CSS regardless
- The core unsolved problem: every generation is a fresh take. The model reinvents the architecture each time, so good renders can't be iterated on reliably

## Stack

Node/Express backend, single-page vanilla JS + Tailwind frontend, Anthropic Claude API. No build step. JSON file storage.

## Running locally

```bash
git clone <this repo>
cd PDL
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
node server.js
```

Then open `http://localhost:8080`. Or double-click `start.command` on macOS — it runs `npm install` if needed and opens the browser.

The Anthropic API key is read server-side from `.env` and proxied; it is never sent to the browser.

## Tests

End-to-end tests use Playwright against a real chromium instance, with `/api/generate` mocked via `route()` to return a canned `<reasoning>`+HTML payload — so test runs consume zero Anthropic credits.

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # Playwright UI mode
```

The six tests cover the core user flows: adding a typed decision, toggling active state, generating into the iframe, saving to history, rating a saved render, and viewing a render's reasoning. Each test asserts a user-observable outcome (text in the DOM or iframe, list counts) rather than class names or button presence.
