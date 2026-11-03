# Implementation plan: Pair workspace continuity

Human approved intent/design in the current session. Run the real `plan_review` requested by the human and report its actual verdict; do not call it gate-plan. Preserve all existing uncommitted work. No Prewalk.

## Tasks

- [x] Trace the approved design through the actual local source and existing identity, evidence, lock and lifecycle tests; identify how the current session-bound state and existing uncommitted changes are preserved. Record the source/installed drift; do not modify the installed package.
- [x] Implement canonical workspace discovery and a guarded transfer of controller authority for a prior assignment. Preserve the single-writer lock, prove prior exit, make transfer crash-safe/idempotent, and keep an interrupted task held rather than replaying it. Cover concurrent claim, live/uncertain prior process and legacy-state cases (SC-01, SC-02, SC-05).
- [x] Preserve pending-review evidence and original report/worker provenance across transfer, while issuing fresh authority and rejecting stale workers or altered/missing checkpoint hashes. Cover pending-review identity, stale leases, tampering and recovery (SC-01, SC-03, SC-05).
- [x] Add the narrow, explicit and optional LoomKit association for task/report/checkpoint identity and honest status. Pair without LoomKit must continue to work; report metadata errors and never mark a task/gate complete just because a checkpoint exists (SC-04).
- [x] Run focused offline tests for workspace adoption, legacy and same-session compatibility, concurrency, evidence/identity, interruption and LoomKit association. Extend existing handoff, recovery and evidence tests where appropriate; do not run the game, native game DLL or plugin.
- [ ] Worker runs actual LoomKit `gate-code` on the exact candidate diff and reports its real verdict, evidence and limitations. Main independently reviews every checkpoint and affected callers; do not claim gates or runtime proof that did not occur.
- [x] Keep implementation in `the Pair repository` only. Do not install or modify the live Pair package, existing Pair task/state/evidence, game roots or saves. Any future rollout or migration of live state requires a separate reviewed operation.

## Verification

- Targeted Node tests covering SC-01 through SC-05, plus existing Pair handoff, recovery, identity and evidence regression tests affected by the patch.
- `npm run typecheck` and exact-diff gate-code where applicable; preserve and report existing unrelated failures rather than hiding them.
- Independent source/diff and checkpoint-hash review. Preserve the existing uncommitted changes and record any interactions.
