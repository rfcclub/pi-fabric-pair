# Rollback plan: Pair workspace and context recovery

This is a contingency plan, not an instruction to perform a rollback. The local code has not been deployed to the active Pair package and no game/save rollback is authorized by this change.

1. Stop dispatching new Pair work. Establish that the old Main and worker writers have actually exited and that the applicable owner/repository locks are available. If exit or ownership is unknown, hold; do not delete locks or start another writer.
2. Preserve the current Pair state, session transcripts, handoffs, worktree and any later progress in a new external backup with SHA-256 before changing code or state. Keep any transfer preimage produced by Pair; compare hashes and timestamps. Never replace current state with a historical preimage simply because it exists.
3. For **code**, review a revert of the eventual commit or restoration of the SHA-backed code preimage in a separate worktree, run the relevant tests, and deploy only after explicit approval. The existing installed package is unchanged by this local implementation. Reverting code does not automatically reverse persistent Pair state.
4. For **persistent Pair state or a state migration**, there is no automatic down migration. A byte-exact pre-transfer state may only be considered for restoration when its provenance is verified, exclusive ownership is proved, no newer task/report/checkpoint progress would be lost, and the human explicitly approves that exact restoration. Otherwise retain current state and evidence and stop for reconciliation; do not guess or replay side effects.
5. For **Pi global settings**, the original is backed up with SHA-256 under `external-backup/pair-reserve33000-settings-20261103/`. If the human requests a settings rollback, first back up the then-current settings and reconcile unrelated later edits; do not blindly overwrite them. A newly started Pi process is needed to confirm the effective settings.

Never restore or alter game saves as part of this Pair rollback plan.
