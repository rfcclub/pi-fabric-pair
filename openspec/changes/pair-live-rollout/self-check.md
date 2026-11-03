# Self-Check

## Claims
- The default owner-lock conflict message now states that the recorded PID may own the session or its status may be unknown. The `ownerAlive` condition, lock files, takeover and rejection behavior are unchanged.
- A stopped historical unreviewed report can remain preserved during package-only rollout; no approval, adoption, replay or state mutation is authorized.

## Evidence
```json
[
  {"type":"command","command":"node --test --test-timeout=60000 --test-name-pattern=\"security regression: unauthorized workspace\" test/handoff-safety.test.js","exit_code":0,"output":"1 test pass, 0 fail: security regression: unauthorized workspace cannot inspect or adopt a retained assignment."},
  {"type":"command","command":"PAIR_COMPAT_STAGE=<isolated-patched-copy> node --test --test-timeout=60000 --test-force-exit test/live-installed-compat.test.js","exit_code":0,"output":"28 tests pass, 0 fail, 0 skip. Security regression: an unknown owner process is retained and its lock file remains unchanged; a live owner is retained; malformed owner is retained; symlink/junction target cannot be reclaimed. An initial run failed because the original message omitted unknown; the stage was patched with the same reviewed one-line change before this passing run."},
  {"type":"command","command":"node --test --test-timeout=60000 --test-force-exit test/owner-proof.test.js test/lock-concurrency.test.js test/repository-lock-recovery.test.js","exit_code":0,"output":"10 tests pass, 0 fail, 0 skip. Security regression: concurrent stale-lock takeovers have at most one owner; a retained review keeps the repository held and never recommends deleting state; a missing or damaged prior state never unlocks the repository."},
  {"type":"command","command":"node node_modules/typescript/bin/tsc -p tsconfig.json","exit_code":0,"output":"TypeScript checkJs passes; npm run typecheck did not find its tsc shim, so the installed TypeScript entrypoint was called directly."},
  {"type":"command","command":"node external-backup/pair-live-rollout-20261103/probe-compat.mjs","exit_code":0,"output":"Real Pi loader loaded the packed pre-fix candidate once without errors or warnings and registered all 11 checked public tools; 16 retained session states validated on in-memory copies, with no migration needed."},
  {"type":"command","command":"node external-backup/pair-live-rollout-20261103/probe-retained.mjs","exit_code":0,"output":"The stopped unreviewed report's manifest, snapshot and five changed-file blobs verified through read-only inspect; state, manifest and snapshot SHA-256 unchanged; no review authorization or ownership transfer."}
]
```

## Known Limitations
- Pi loader ran on the original packed candidate; the one-line diagnostic fix will be committed and the final package must be rebuilt and checked before live promotion.
- The initial fixture invocation failed because a vanilla Node process lacked Pi's host-provided peer dependency; an independent isolated stage used the existing repository dependency tree. The real Pi loader did not need any node_modules in the candidate.
- An npm script typecheck initially failed because its executable shim was unavailable; the actual installed TypeScript entrypoint then passed.
- The first two code gates returned ESCALATE_TO_HUMAN because unauthorized-test evidence was missing or not read: the CLI only loads the first test entry. After running the actual unauthorized test and moving that entry first, gate-code returned PASS_WITH_WARNINGS (trust 75, 0 blocking; absent phase.json means degraded mode). It bound diff SHA-256 beginning `b0b3a20a2d94f0ea`; all three verdicts are retained. Remaining warnings cover the not-yet-exercised failed-promotion guard and no L2 semantic model review. Only documentation and the verdict artifact were added after the gate; the code did not change.
- The live package has not been installed or activated yet, and no real overflow has been exercised.
- **Rollback plan:** preserve a SHA-256 backup of the old package and its same-volume prior directory; restore only if the installed candidate and ownership are verified unchanged. Never restore old Pair state or game saves as part of package rollback.

## Unresolved Assumptions
- All relevant owners and workers must still be confirmed stopped/idle immediately before promotion; a changed live preimage, pending active work or unknown owner blocks it.
- Runtime package activation needs a restarted Pi; a disk swap alone does not replace modules already held in memory.
