---
name: replan
description: Between-phase roadmap check — confirm the planned next phase is still the right move; if not, edit the roadmap before /next-phase
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

If **A** → end the skill. Tell the user: *"Roadmap unchanged. Run `/next-phase` when ready."* Nothing to write.

If **B–E** → continue to step 4.

## Step 4 — Gather the change (only if not A)

Ask follow-up questions only as needed to make the roadmap edit. Same rules as `next-phase` Step 2: draft what you can, ask only for gaps, hard cap of 3 follow-up questions.

Make the edit to `specs/roadmap.md`:

- **B. Scope adjust** — edit bullets under the existing phase.
- **C. Reorder** — swap phase headings; keep their original numbers attached to their content (i.e. retitle, don't renumber). If that's awkward, prefer the fractional insert pattern below.
- **D. Insert** — add a new fractional phase block between the existing phases. Numbering rule: a phase added between Phase N and Phase N+1 is `Phase N.1` (or `N.2` if `N.1` already exists). **Never renumber the phases that follow.** This keeps phase numbers stable across replans, so cross-references in older specs, CHANGELOG entries, and commit messages stay valid forever.
- **E. Drop/defer** — either delete the phase or move its bullets to the "Deferred / Under Evaluation" section near the bottom. Do not renumber following phases — leave the gap.

Numbering principle: original phases keep their integer numbers for the life of the project. Anything added during replan gets a fractional number. Gaps from dropped phases are fine — stable numbers matter more than dense numbering.

## Step 5 — Commit on main and hand off

Confirm the working tree has no other unstaged changes (only `specs/roadmap.md` should be modified). If there are unrelated changes, stop and tell the user — do not bundle them into the replan commit.

Then commit the roadmap change to `main`:

```
git add specs/roadmap.md
git commit -m "Replan: <one-line summary of what changed>"
```

Use the `Replan:` prefix so the change is greppable in `git log`. Do not push.

Tell the user: *"Roadmap updated and committed on main. Run `/next-phase` when ready."* Do **not** auto-run `/next-phase`.

## Hard constraints

- Do not edit any file other than `specs/roadmap.md` in this skill. Architecture/tech-stack changes belong to phase work, not replanning.
- Commit only `specs/roadmap.md`. If anything else is modified, abort and surface it to the user.
- Do not push. The user controls remote pushes.
- Do not run `/next-phase` automatically. The user invokes it when they're ready.
- If the answer is "A — proceed as planned," touch nothing — no edit, no commit. Silence is the correct outcome.
