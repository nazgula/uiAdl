---
name: finish-phase
description: Close out a completed development phase — verify completion, update roadmap and CHANGELOG, commit, merge to main, delete branch
disable-model-invocation: true
---

Run when a phase branch's work is complete and ready to merge. The active phase is the one whose folder lives at `specs/<feature-name>-<YYYY-MM-DD>/` matching the current branch name.

## 1. Verify completion

Before merging, confirm:

- All checkboxes in `plan.md` are `[x]` and the `Status:` line agrees
- Every criterion in `validation.md` passes — re-run any commands listed there (fresh-clone test, `npm run test:e2e`, etc.) and report results
- Working tree is clean (`git status` shows no uncommitted changes)

If any of these fail, **stop and report**. Do not proceed to merge.

## 2. Mark the phase done in roadmap.md

- Check off every `- [ ]` item under the phase heading in `specs/roadmap.md` so they become `- [x]`
- Do not modify other phases

## 3. Update the architecture map (and tech-stack only if needed)

The constitution docs have different update rhythms. After marking the roadmap, review the phase's actual changes and update accordingly:

- **`specs/architecture.md`** — update if this phase added or changed any of: API routes, frontend state shape, render pipeline behavior, invariants (e.g. iframe sandbox rules, CSS injection order), or on-disk file formats. **Most phases will touch this doc.** Keep edits surgical: add to the relevant section rather than restructuring.
- **`specs/tech-stack.md`** — update only if this phase added/removed a dependency, swapped a model, or added/relaxed a constraint. Most phases will not touch this.
- **`specs/mission.md`** — do **not** update as part of routine phase work. Mission changes signal a pivot, not a feature, and should be a deliberate separate decision.

If neither architecture nor tech-stack changed, say so explicitly in the commit message in step 5 — silence is ambiguous.

## 4. Update CHANGELOG.md

Maintain `CHANGELOG.md` at the repo root. If it doesn't exist, create it with a `# Changelog` header and a brief intro line.

For this phase:

- Add a new section near the top: `## YYYY-MM-DD — <Phase title>` (use today's date and the phase title from roadmap.md)
- Examine the commits on the phase branch (`git log main..HEAD --oneline`) and write 3–8 bullets summarising the main features, fixes, and notable changes
- Bullets describe outcomes for a reader, not implementation detail. One line each. No emojis or marketing language. Pull from commit messages but rephrase if a message was internal-only.

## 5. Commit spec + CHANGELOG updates

Stage and commit only the docs touched in steps 2–4 (`roadmap.md`, `CHANGELOG.md`, and any of `architecture.md` / `tech-stack.md` you updated). Suggested message:

```
Phase <N> complete: update roadmap, CHANGELOG, architecture
```

If architecture/tech-stack were not touched, say so in the message body (e.g. "no architecture changes — phase was UI-only") so the silence is intentional, not forgotten.

## 6. Merge to main

- `git switch main`
- `git merge --no-ff <phase-branch>` (no-ff preserves the phase as a visible unit in history)
- If the merge has conflicts, stop and ask the user

## 7. Delete the branch

- `git branch -d <phase-branch>` (use `-d`, not `-D` — fail loudly if anything is unmerged)
- Do **not** push to remote unless the user explicitly asks. Report that the merge is local and ask before pushing.

## Hard constraints

- Do not skip the verification step
- Do not force-delete the branch
- Do not push without explicit user approval
- Do not edit the phase's spec files (`requirements.md`, `plan.md`, `validation.md`) — they are a record of how the phase ran
