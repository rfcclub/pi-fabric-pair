# Design: Pair workspace continuity

Status: APPROVED by the human in the current session; plan_review pending. Gate-plan is not available in the inspected CLI.

## Current behavior

`src/controller.js` derives the state directory from `(canonical cwd, ownerSession)`, validates stored identity against that session and keeps a repository-level writer lock. Reports in `src/contracts.js` bind the producer's owner/epoch, worker generation, lease and attempt. In the actual paired-project incident the old report and candidate still exist, but the new session sees no task; LoomKit was passed as task context and its checklist remains open. The repo has pre-existing uncommitted changes and is not byte-identical to the installed Pair package.

## Proposed approach

1. **Workspace, not Pi conversation, identifies durable work.** Keep a durable workspace index keyed by canonical repository/worktree identity that points to its current Pair assignment and immutable evidence. Preserve the existing repository writer lock; different worktrees remain distinct. Existing same-session behavior stays compatible. Pair must not require LoomKit to run.
2. **Explicit, guarded takeover.** On discovery from a new Main session, validate the target workspace and prior state, prove the old process/worker has exited, then transfer controller authority under the existing exclusive lock with an atomic, auditable owner-epoch transition. If the process may still run, provenance is ambiguous, or competing controllers race, hold the task and do not create another writer. Do not silently resume interrupted execution.
3. **Separate authority from historical provenance.** Preserve original session-bound evidence/report envelopes and their hashes byte-for-byte; record the transfer separately. The active controller may inspect a retained pending report using its original identity while new worker leases/nonces/epochs prevent old workers from publishing accepted results. A pending `review` remains `review`; it is not replayed or approved by adoption.
4. **Link, do not conflate, LoomKit and Pair.** A task may explicitly name an approved LoomKit workspace/change. Persist a small, idempotent machine-readable association to Pair task/report/checkpoint identity and hash alongside that change, with clear pending/review/approved-or-failed state. LoomKit's plan/checklist is the progress authority; a report alone never checks off a task or claims a gate PASS. Missing association or sync failure is visible and recoverable; ordinary Pair works without LoomKit.
5. **Legacy and crash safety.** Read existing session-bound state as legacy input, retain the old state/evidence and migrate or point to it only after successful validation. The transfer must be idempotent after a crash; invalid/missing evidence or unconfirmed ownership leaves it held. No reset, deletion, false provenance rewrite, manual lock removal, or blind redispatch.

## Likely implementation areas

- `src/controller.js`: workspace discovery, exclusive takeover, controller/worker authority and review lifecycle; preserve existing modifications.
- `src/contracts.js`, `src/actor-runtime.js`, `src/worker.js`, `src/evidence.js` and state/lock helpers: examine actual dependencies and adjust identity/provenance only where necessary; do not assume all require edits.
- A narrow opt-in LoomKit association helper and tests, with no mandatory LoomKit package dependency. UI/tools expose the current assignment and actionable held state through existing Pair surfaces.
- `test/handoff-safety.test.js`, `test/controller-scan-recovery.test.js`, evidence tests and new focused cross-session tests; documentation for upgrade, failure and rollback.

## Verification mapped to spec

| Scenario | Evidence required |
|---|---|
| SC-01 | Two Main sessions, same workspace, same immutable pending-review report/hash; no worker replay. |
| SC-02 | Concurrent takeover and live/unconfirmed prior process: exactly one or zero writers, never two. |
| SC-03 | Late worker/old lease and altered or missing checkpoint rejected; original producer identity unchanged. |
| SC-04 | Explicit association persists across restart, pending/failed never marked complete; missing LoomKit works and failed metadata write remains visible. |
| SC-05 | Existing state migration, same-session/no-LoomKit compatibility, crash at transfer boundaries and idempotent retry; existing repo changes preserved. |

Use focused offline tests first and relevant broader Pair regression tests for identity, locks, evidence and recovery. Worker runs actual gate-code against the exact reviewed code; Main independently reviews. `gate-plan` is not present in the current LoomKit CLI, so it is not PASS and must not be replaced with `loomkit_plan`.

## Delivery boundary

Implementation targets only `the Pair repository`. Do not overwrite the installed package, live Pair state, existing checkpoints, game files or saves as part of implementation. A separately reviewed rollout must reconcile the source/installed drift and preserve live state. The user approved this detailed design in the current session; plan_review and implementation verification remain separate.
