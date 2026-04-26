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

## 3. Update CHANGELOG.md

Maintain `CHANGELOG.md` at the repo root. If it doesn't exist, create it with a `# Changelog` header and a brief intro line.

For this phase:

- Add a new section near the top: `## YYYY-MM-DD — <Phase title>` (use today's date and the phase title from roadmap.md)
- Examine the commits on the phase branch (`git log main..HEAD --oneline`) and write 3–8 bullets summarising the main features, fixes, and notable changes
- Bullets describe outcomes for a reader, not implementation detail. One line each. No emojis or marketing language. Pull from commit messages but rephrase if a message was internal-only.

## 4. Commit roadmap + CHANGELOG updates

Stage and commit those two files only. Suggested message:

```
Phase <N> complete: update roadmap and CHANGELOG
```

## 5. Merge to main

- `git switch main`
- `git merge --no-ff <phase-branch>` (no-ff preserves the phase as a visible unit in history)
- If the merge has conflicts, stop and ask the user

## 6. Delete the branch

- `git branch -d <phase-branch>` (use `-d`, not `-D` — fail loudly if anything is unmerged)
- Do **not** push to remote unless the user explicitly asks. Report that the merge is local and ask before pushing.

## Hard constraints

- Do not skip the verification step
- Do not force-delete the branch
- Do not push without explicit user approval
- Do not edit the phase's spec files (`requirements.md`, `plan.md`, `validation.md`) — they are a record of how the phase ran
