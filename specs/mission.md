# Mission

## What this is

A personal design tool that converts product decisions into interactive UI wireframes using Claude.

You define what your product does — as a list of decisions across entities, flows, UI choices, and constraints. The tool generates a complete, functional HTML wireframe from those decisions, using AI reasoning to plan the structure before writing code.

## Core loop

```
Product decisions (PDL)
  → AI reasoning (structure plan)
    → Generated wireframe (HTML + JS)
      → Saved render (with reasoning)
        → Feedback into next generation
```

## What "good" looks like

- The wireframe captures the right structure on the first or second try
- Reasoning blocks describe *why* things are laid out as they are, not just what exists
- Good renders inform future renders — the tool learns from what worked
- CSS does not fight the structure; it serves it

## What this is not

- Not a production UI builder
- Not a team tool (solo use)
- Not a pixel-perfect mockup tool — wireframe fidelity, Balsamiq-style
