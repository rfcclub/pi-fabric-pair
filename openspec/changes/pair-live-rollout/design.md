# Design: controlled local Pair deployment

## Context

- The paired project loads `~/.pi/agent/local/fabric-pair` directly; this is a real directory, not the local repository. The repository is clean at commit `18d4c473bef0714ff0983778812522bcc38befec`.
- The current Pair status reports `worker` ready with no task in this Main session, but an RPC worker process still exists. A historical stopped session contains an unreviewed report; preserve it byte-for-byte and do not adopt or approve it. The old owner lock is absent and its recorded worker PID is absent; verify evidence and process state before promotion.
- The installed-version fixture found that an unknown/inaccessible owner is safely kept locked but the default error says the owner is definitely live. Make one message-only change to `src/util.js` so it says the process may be live **or its status unknown**. Do not change `ownerAlive`, lock ownership or takeover behavior. The existing fixture is the regression test; run it and the targeted owner/lock tests. Commit the fix before rebuilding the candidate.
- The installed package differs across most common source files and lacks new recovery modules. The old `compat/install-live-backport.mjs` changes only three files of a different baseline and is **not** an installer for this feature.

## Design

1. Re-check the committed source, project registration, all relevant Pi/worker processes, pending reports and task/lock state. If another owner/worker is active or unknown, stop; never kill it. Historical unreviewed reports whose owner and worker are demonstrably stopped do not require adoption or review for a package-only swap; verify and preserve their state and checkpoint evidence byte-for-byte, and never copy unrelated 5.8 GB of history. Work only on copies for any state migration or fixture.
2. Fix the identified diagnostic only and commit it after the compatibility fixture and targeted lock tests pass; rebuild from that commit. The original failed fixture and its stderr remain in the external evidence directory.
3. Produce the complete package from the exact commit in isolated staging, not a hand-picked three-file patch. Run the existing installed-version compatibility fixtures against the candidate and real Pi's extension loader with isolated state; verify existing state/config compatibility and public tool registrations. Any true failure, unknown state or unsupported fixture blocks live mutation and requires an explicit design adjustment. Reuse existing tests; do not benchmark again.
4. Back up the entire current live package outside the repo with a per-file SHA-256 manifest. Recheck live preimage, task/process state and source commit immediately before promotion. Preserve all Pair state and configuration paths separately; no cleanup or state migration by the installer.
5. Stage the checked candidate beside the live directory on the same volume. If only the current Pi and its **idle, understood** worker remain, leave those loaded old processes untouched, promote by renaming the original directory aside and the candidate into its place, then verify all installed package hashes. Between promotion and restart no Pair dispatch or recovery may be performed. If exclusive control cannot be established, stop instead; if Windows refuses a rename, restore the verified original and stop. Do not blindly overwrite a changed destination during rollback.
6. The current Pi process may still hold old code and settings; ask the user to close/reopen Pi after promotion. Verify the new package is loaded, tools are registered and `pair_status` is healthy without dispatching a task. Report filesystem-installed vs activated separately; do not claim a live context-overflow exercise.

## Safety and rollback

Preserve the complete external backup, same-volume prior directory, source tarball and checksums. Roll back package files only if the installed candidate still matches the known manifest and ownership/activity are known; otherwise stop for human reconciliation. Never restore or overwrite Pair state, transcripts, paired-project files or game/save data as a package rollback.

## Verification

- Commit and package SHA, compatible retained state and isolated loader/registration proof.
- Applicable installed-version fixture tests; any skips or actual failures are disclosed.
- Bytewise preimage/backup/installed manifest verification; previous directory retained.
- Pi restart and fresh-session Pair status when the user performs it; real overflow remains untested unless it actually occurs.

## Gate

This LoomKit CLI has no `gate-plan`; the gate is unavailable, not passed. The user approved proceeding automatically after successful `plan_review`; the PASS receipt covers the pre-approval intent/design hashes, before this approval note.
