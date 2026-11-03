# Tasks: Pair live rollout

- [x] 1. Recheck the exact committed candidate, live package registration, process/worker status and any affected retained state. Stop for active or unverified ownership; do not dispatch or kill a worker.
- [x] 2. Fix only the owner-unknown error diagnostic discovered by the installed-version fixture, without changing ownership/lock semantics. Run the existing fixture plus targeted owner/lock regressions, commit the fix and rebuild the package from that commit. Verify the Pi extension loader and copied retained state, including the historical stopped unreviewed report; never silently waive failures.
- [x] 3. Back up the full live package outside the repo with a SHA-256 manifest. Prepare an equivalent same-volume staged candidate, verify its files and recheck the live preimage and task/process state before promotion.
- [x] 4. Promote as a guarded whole-directory swap, preserve the previous directory, verify resulting hashes, and roll back only on verified unmodified state. Do not alter any Pair task/session or game/save files.
- [x] 5. Record the installation receipt, gate/review results, candidate and backup hashes; commit the new LoomKit artifacts. Tell the user if a restart is still required and do not claim in-process activation before it occurs.
- [ ] 6. After the user restarts Pi, verify registered tools and Pair status without dispatching a task; record separately. A live overflow recovery is not claimed unless actually observed.

## Risks

Live package differs substantially from the repository; legacy state or fixtures can be incompatible. Unknown ownership, failed checks, concurrent mutations or ambiguous rollback must hold the promotion. The user explicitly prefers automatic progress after passing review; ask only if a real decision or unresolvable risk requires it.
