---
name: next-phase
description: Start a new development phase from the PDL roadmap — creates a branch, asks spec questions, writes plan/requirements/validation files
disable-model-invocation: true
---

Find the next phase in specs/roadmap.md (first phase with unchecked items) and make a git branch for it.

Then ask me about the feature spec using AskUserQuestion, grouped on these 3 files before writing anything to disk:
- `requirements.md` — scope, decisions, context
- `plan.md` — numbered task groups, with stage tracking (see below)
- `validation.md` — how to know the implementation succeeded and can be merged

After asking, create a new directory `specs/<feature-name>-<YYYY-MM-DD>/` and write all three files there.

## Stage tracking inside the phase

`plan.md` must support tracking sub-stage progress. Required structure:

- Near the top of `plan.md`, write a single-line `Status:` summary, e.g.
  `Status: 0a [ ], 0b [ ], 0c [ ], 0d [ ], 0e [ ]`
- Every numbered task group heading begins with a checkbox, e.g.
  `## 1. [ ] Code fixes (sub-phase 0a)`
- The implementer updates checkboxes as work progresses:
  - `[ ]` pending
  - `[~]` in progress
  - `[x]` done (commit landed on the phase branch)
- Update both the heading checkbox and the `Status:` line in the same edit when state changes.

This mirrors how `specs/roadmap.md` tracks phases at the top level.

Refer to specs/mission.md and specs/tech-stack.md for guidance on constraints and goals.
