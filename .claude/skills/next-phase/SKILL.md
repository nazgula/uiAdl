---
name: next-phase
description: Start a new development phase from the PDL roadmap — creates a branch, asks spec questions, writes plan/requirements/validation files
disable-model-invocation: true
---

Find the next phase in specs/roadmap.md (first phase with unchecked items) and make a git branch for it.

Then ask me about the feature spec using AskUserQuestion, grouped on these 3 files before writing anything to disk:
- `requirements.md` — scope, decisions, context
- `plan.md` — numbered task groups
- `validation.md` — how to know the implementation succeeded and can be merged

After asking, create a new directory `specs/<feature-name>-<YYYY-MM-DD>/` and write all three files there.

Refer to specs/mission.md and specs/tech-stack.md for guidance on constraints and goals.
