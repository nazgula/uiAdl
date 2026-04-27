---
name: replan
description: Between-phase roadmap check — confirm the planned next phase is still the right move; if not, edit the roadmap and commit a "Replan" change before /next-phase
disable-model-invocation: true
---

Run this **between phases**, after `/finish-phase` has merged the previous phase to main and before starting `/next-phase`.

The default outcome is *"no change, proceed."* This skill exists because plans drift quietly: the work just shipped sometimes teaches you something that changes priorities, and re-asking before each new phase costs almost nothing while preventing a wrong-direction phase.

## Step 1 — Read the current state

Read:

- `specs/roadmap.md` — identify the next phase (first phase with unchecked items below the most recently completed one).
- The most recent `CHANGELOG.md` entry — what just shipped.
- Any "Lessons learned" or "Deferred" notes at the bottom of `roadmap.md` that were updated by `/finish-phase`.

## Step 2 — Show the user a one-screen summary

Plain text, no questions yet. Format:

```
Just shipped (Phase N): <title>
  - <1–2 bullets from CHANGELOG>

Currently planned next (Phase N+1): <title>
  - <2–4 bullets summarising the scope from roadmap.md>

Lessons / deferred items worth re-evaluating:
  - <any relevant items from roadmap.md, or "none">
```

## Step 3 — Ask one question (AskUserQuestion)

Single multiple-choice question:

> *"Is Phase N+1 still the right next move?"*

Options:

- **A. Yes — proceed as planned.** (Default. Most common answer.)
- **B. Adjust scope of Phase N+1.** (Same phase, different bullets.)
- **C. Reorder — a later phase should come first.**
- **D. Add a new phase before N+1.**
- **E. Drop or defer Phase N+1.**

If **A** → end the skill. Tell the user: *"Roadmap unchanged. Run `/next-phase` when ready."* Do not commit anything.

If **B–E** → continue to step 4.

## Step 4 — Gather the change (only if not A)

Ask follow-up questions only as needed to make the roadmap edit. Same rules as `next-phase` Step 2: draft what you can, ask only for gaps, hard cap of 3 follow-up questions.

Make the edit to `specs/roadmap.md`:

- **B. Scope adjust** — edit bullets under the existing phase.
- **C. Reorder** — swap phase headings + renumber.
- **D. Insert** — add a new `## Phase X — <title>` block; renumber following phases.
- **E. Drop/defer** — either delete the phase or move its bullets to the "Deferred / Under Evaluation" section near the bottom.

When renumbering, also update any in-text references (e.g. "Phase 4a" → "Phase 5a").

## Step 5 — Commit

Stage `specs/roadmap.md` only. Commit message format:

```
Replan: <one-line reason>

<2–4 lines explaining what changed and why — what you learned, what
shifted priorities, or what the previous phase revealed.>
```

Examples:
- `Replan: insert UI cleanup ahead of reasoning loop`
- `Replan: drop two-round generation — wireframe.css experiment showed it doesn't help`
- `Replan: reorder section selection before reasoning loop`

After committing, tell the user: *"Roadmap updated. Run `/next-phase` when ready."* Do **not** auto-run `/next-phase`.

## Hard constraints

- Do not edit any file other than `specs/roadmap.md` in this skill. Architecture/tech-stack changes belong to phase work, not replanning.
- Do not run `/next-phase` automatically. The user invokes it when they're ready.
- Do not push to remote unless asked. Replan is a local main-branch commit, same as `/finish-phase`.
- If the answer is "A — proceed as planned," commit nothing. Silence is the correct outcome.
