---
name: next-phase
description: Start a new development phase from the PDL roadmap — creates a branch, asks spec questions, writes plan/requirements/validation files
disable-model-invocation: true
---

Find the next phase in `specs/roadmap.md` (first phase with unchecked items) and make a git branch for it. Branch name: `<phase-slug>-<YYYY-MM-DD>` matching the spec folder.

## Step 1 — Read the constitution before designing

Read all three before asking the user anything:

- `specs/mission.md` — what "good" looks like; use to judge scope.
- `specs/tech-stack.md` — constraints (no TypeScript, no build step, no DB). Reject any plan that violates these.
- `specs/architecture.md` — the live map of routes, frontend state, and invariants you'll be extending. Most phases add to this doc; read it so the new work fits the existing shape rather than reinventing it.

## Step 2 — Identify gaps, then ask only what's missing

The roadmap entry + constitution already carry most of the load. Treat AskUserQuestion as a **gap-filler, not a checklist**. Soft floor: 0 questions. Hard cap: 5 across all rounds.

### 2a. Draft from what you already have

Read the roadmap entry for this phase. With mission/tech-stack/architecture in mind, mentally draft scope, plan, and validation criteria. You're allowed — encouraged — to make implementation calls based on the constitution and your own reasoning. Don't outsource thinking to the user.

### 2b. Catalog the gaps

A **gap** is a question whose answer you don't have *and* whose answer would materially change the plan or validation. Only these earn a question slot:

| Gap type | Trigger to ask |
|---|---|
| **Approach fork** | Multiple valid implementations exist and the choice changes the plan materially |
| **Hidden constraint** | You suspect a deadline, must-not-break-X, soak window, or external dependency that the user has but didn't write down |
| **Stale intent** | The roadmap entry is >30 days old or its wording leaves the *why* ambiguous |
| **Specific scope risk** | You can name a concrete adjacent thing this work realistically risks pulling in (do not ask "what's out of scope?" cold — the negative list is unbounded) |
| **Success signal unclear** | The roadmap bullets don't tell you what "good" looks like for this implementation |

If no trigger fires, **don't ask**. Drop any potential question whose answer the user has already given in the roadmap, in this conversation, or implicitly by triggering this phase.

### 2c. Round 1 — ask only what's actually needed (≤3 questions)

Use AskUserQuestion with multiple-choice options where possible — concrete forks reveal vital information faster than open-ended prompts. If no gaps were cataloged, skip the question round entirely and go straight to step 3.

### 2d. Reflect before drafting — do I have enough?

After round 1 (or after deciding none were needed), pause and check yourself:

- Can I write `requirements.md`, `plan.md`, and `validation.md` without guessing on anything material?
- Did the round 1 answers surface a *new* gap I didn't see before (a contradiction, a surprise, a dependency I missed)?

If yes to the first and no to the second → proceed to step 3.

If no, or if a new gap surfaced → run **one more round** of questions, bounded by the remaining budget (5 minus round 1). Don't pad the round; ask only the gaps that genuinely block drafting.

**Hard rule:** do not enter step 3 still guessing on a vital decision. Either you know, or you ask.

## Step 3 — Write the three spec files

Create `specs/<phase-slug>-<YYYY-MM-DD>/` and write:

### `requirements.md`
- **Why** — the one-line problem statement (Q1).
- **In scope** — bulleted list, concrete.
- **Out of scope** — bulleted list (Q2). Equally important.
- **Success signal** — one or two lines (Q3).
- **Open questions** — anything still unresolved. Empty section is fine; omitting it is not.

### `plan.md`
- **`Status:` line** at the top — single-line sub-stage summary, e.g. `Status: 1 [ ], 2 [ ], 3 [ ]`.
- **Numbered task groups**, each heading starting with a checkbox: `## 1. [ ] <title>`.
- Within each group, list concrete sub-steps. Order them so each group is independently shippable where possible.
- **Architecture impact** — short section listing what `specs/architecture.md` will need to gain at finish-phase time (routes added, state added, invariants introduced). If "none," say so.
- Sub-stage progress is tracked by updating both the group heading checkbox and the `Status:` line in the same edit:
  - `[ ]` pending · `[~]` in progress · `[x]` done (commit landed on phase branch)

### `validation.md`
- **Manual checks** — the exact user flow to walk through to verify the success signal. Step-by-step.
- **Automated checks** — Playwright tests that must pass (new tests added by this phase + existing suite green).
- **Regression watch** — what to specifically re-test that this phase risks breaking.

## Step 4 — Confirm before writing

Show the user a brief summary of the drafted scope + plan outline (not the full files) and confirm before committing the three files to disk. Cheap to revise now, expensive after.

## Mirror with `specs/roadmap.md`

The phase-internal stage tracking in `plan.md` mirrors how `specs/roadmap.md` tracks phases at the top level — same checkbox vocabulary (`[ ]`, `[~]`, `[x]`), same idea applied one level down.
