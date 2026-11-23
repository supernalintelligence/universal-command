---
task: ''
branch: worktree-drop-repotype-devdep
reviewed_patch_id: 5a94569595507330755c29905f0cebf7a473e16b
reviewer_model: opus
reviewer_agent_id: a7bb5535095d1baad
reviewer_output_sha256: 448aae22f86c60741362df392ae679b9410b0ed271a946b234c57cd54566ad0f
author_session_id: ''
verdict: pass
findings: { critical: 0, high: 0, medium: 0, low: 1 }
resolved: { fixed: 0, skipped: 1 }
skip_class: ''
skip_reason: ''
size: { files: 3, lines: 580 }
---

## Conclusion

Ready to land: yes
Removing the repotype devDependency breaks the build cycle; the layout check still runs.

## Reviewer report

I found no critical or high defects. Diff 2 (`.husky/pre-push`) has two medium defects in what the new cycle check actually reads. Diff 1 is correct as written.

### Diff 1: universal-command `60b5256` (drops the `repotype` devDependency)

No correctness defects.

- `pnpm-lock.yaml` is consistent. `repotype` appears 0 times, and none of the 65 removed package entries is still referenced anywhere in the lockfile.
- The root supernal-coding `pnpm-lock.yaml` entry for `packages/universal-command` (line 8224) never listed `repotype`. Once the pointer moves to `60b5256`, the root lockfile and the submodule's `package.json` agree again.
- **The new `.prettierignore` does not break the layout check.** `repotype.yaml` denies unmatched files, and its dotfile glob `.{gitignore,mailmap,prettierrc}` does not list `.prettierignore`. I ran the workspace repotype 0.1.5 (`packages/repotype/bin/repotype.js validate <worktree>`) and it returned `ok: true` with no diagnostics. I did not run the npm-published 0.1.5 that `pnpm dlx` will fetch.
- **Low, `package.json` line 83:** `pnpm dlx repotype@0.1.5` installs repotype's dependencies with no lockfile. A new upstream release of one of them (for example a `commander` major) could break the CI step `pnpm run repo:lint` (ci.yml line 41) with no change in this repo. The step also now needs network access on every run.

### Diff 2: supernal-coding `e315a50e79` (cycle check on submodule pointer moves)

**Medium, `.husky/pre-push` lines 7300 and 7324 to 7353: the check reads files on disk, not the commit being pushed.**

- The trigger comes from the pushed commits.
- But `pnpm -C "$_PP_ROOT" run check:cycles` runs `turbo run build --dry=json` on the files on disk. That includes whatever commit each submodule folder happens to be on.
- A pointer bump is exactly the case where those two often differ: known submodule drift in the shared checkout; pushes of a specific commit, as in `git push origin <sha>:refs/heads/ian-dev`; a worktree whose submodule folder is empty or on another commit.
- Result: a cyclic pointer can pass when the folder is behind the pin. An unrelated push can be blocked when the folder is ahead of it.
- The lockfile check beside it already reads the pushed version (`--gitlinks=HEAD --tree=HEAD`). The cycle check does not.

**Medium, line 7327: the root lockfile check still skips pointer-only pushes.**

- A submodule pointer bump that adds or removes a dependency in a workspace member (`packages/*` is in `pnpm-workspace.yaml`) makes the root `pnpm-lock.yaml` stale. CI's frozen-lockfile install then fails.
- This already happened: `7ee7ce2` added `repotype` to universal-command, and the root lockfile entry never gained it.
- `validate-lockfile.cjs` already reads the pushed pointers (`--gitlinks=HEAD`), so it could run on pointer-only pushes too.

**Low, line 7300: it uses a pattern the file's own header bans.**

- `<(...)` process substitution is what the header (line 8) and the note at line 1041 forbid, because Husky runs hooks with `sh` (POSIX mode).
- Push mode is safe, because the hook re-runs itself under `/bin/bash` at line 29.
- Under `sh`, the substitution fails inside `$(...)` and `|| true` hides it, so `_LF_GITLINKS` comes back empty and the check silently does not run.
- The file's own pattern is a temp file plus `grep -Fxf`.

**Low, line 7346: pointer bumps now have a 120 s turbo gate, and a timeout blocks the push.**

**Low, landing order.** The shared checkout pins `packages/universal-command` at `884ee6d`, which still has the `repotype` devDependency. Until the pointer moves to `60b5256`, every push that changes a pointer or a `package.json` is blocked by the existing cycle.

**Low, line 7300: two small matching gaps.** `awk '{print $2}'` cuts a submodule path that contains spaces. `.gitmodules` is read from disk, not the pushed commit, so a submodule added only in the push is not matched.

### What I checked

- Both diffs in full; the pre-push lockfile section, `_pp_nonmerge_changed_files`, the re-run under bash, and the husky runner `.husky/_/h`.
- `grep -Fx -f` with an empty pattern list matches nothing (exit 1), so it does not fail open.
- `sh -n` and `bash -n` on the hook; root `pnpm-workspace.yaml`, `.gitmodules`, the root lockfile entry for universal-command, and the pinned submodule SHA; every `repotype` reference in universal-command and its CI workflow.

### What I could not verify

- I did not run `check:cycles` or `pnpm install --frozen-lockfile`. I did not run the npm-published `repotype@0.1.5` through `pnpm dlx`. I did not exercise the hook end to end on a real push.

## Checks run, and what each covered

Parent worktree with this commit: pnpm run check:cycles prints No workspace dependency cycle; with the old pin 884ee6d the same check exits 1 with the repotype#build and universal-command#build cycle. pnpm --filter @supernal/universal-command build and pnpm --filter repotype build both exit 0. pnpm run repo:lint (pnpm dlx repotype@0.1.5) exits 0. Commit hook: type check and 406 tests passed.

## Not verified

The report under Reviewer report is the reviewer's text with its level-2 headings lowered to level 3 and a few bullet lists joined into sentences; wording of each finding is unchanged. The npm-published repotype@0.1.5 run through pnpm dlx in GitHub CI was not run there; it was run locally (exit 0). The hook was not exercised end to end on a real push.

## Findings

- [low] [skipped] pnpm dlx resolves repotype's own dependencies without a lockfile and needs network in CI, reason: the CI job already needs network for pnpm install, and the pinned repotype version is the same one the devDependency used
