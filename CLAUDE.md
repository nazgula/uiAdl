# CLAUDE.md

Guidance for Claude Code working in this repository. This file is intentionally thin — it points at the constitution and the workflow skills. Do not duplicate stack or architecture facts here.

## Spec-driven development

This project follows SDD. Specs are the source of truth; code follows from them. Before implementing anything, read the relevant spec.

```
specs/
  mission.md       — what this tool is for and what "good" looks like
  tech-stack.md    — stack and constraints (no TypeScript, no build step, etc.)
  architecture.md  — how the pieces fit together (server routes, frontend shape, render pipeline)
  roadmap.md       — phases of work and lessons learned; source of truth for what to build next
```

**Rules:**
- Never implement a feature that isn't in the roadmap, or that belongs to a later phase
- Never violate a constraint in `tech-stack.md`
- If a task seems to conflict with the specs, flag it — don't resolve it silently
- The current phase is whichever phase in `specs/roadmap.md` has the first unchecked items
- When stack, architecture, or roadmap details change, update the relevant `/specs/*.md` file. Do not record those facts in this file.

## Workflow skills

Phase work is driven by three slash commands, used in order:

- **`/next-phase`** (`.claude/skills/next-phase/SKILL.md`) — start a new phase: read the constitution, ask only the gap-filling questions needed to draft the spec, write `requirements.md` / `plan.md` / `validation.md` under `specs/<name>-<YYYY-MM-DD>/`, cut a branch.
- **`/finish-phase`** (`.claude/skills/finish-phase/SKILL.md`) — close a phase: verify completion, mark roadmap, update `specs/architecture.md` (and `tech-stack.md` only if changed), update `CHANGELOG.md`, merge to main with `--no-ff`, delete the branch.
- **`/replan`** (`.claude/skills/replan/SKILL.md`) — between phases, after `/finish-phase` and before `/next-phase`: confirm the planned next phase is still right. Default outcome is "no change, proceed." If priorities shifted, edit `roadmap.md` and commit a `Replan:` change.

The skill files are the source of truth for each workflow. Do not duplicate their contents here.

## Environment

`.env` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
```

`projects/`, `renders/`, and `config.json` are gitignored runtime data. See `tech-stack.md` "Storage" for the on-disk layout.

## Running locally

See `README.md` "Running locally" — the steps live there.
