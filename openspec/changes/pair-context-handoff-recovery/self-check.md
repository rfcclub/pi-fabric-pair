# Self-Check

## Claims
- A confirmed context overflow cancels Pi's overflow compact-and-retry and moves to a guarded handoff and fresh worker session; ordinary length/cancel events and threshold compaction are not treated as overflow.
- When native transient summarization retries have actually been exhausted and auto-compaction fails, the same bounded handoff path runs without an additional retry loop. Worker event identity is fenced to the current task/attempt/lease.
- Handoff retains the old session, linked LoomKit metadata, approved checkpoint and uncheckpointed workspace paths. The old process must have exited and checkpoint manifest, report identity and changed-file evidence blobs must verify. An unknown exit, missing/corrupt checkpoint or unreviewed report is held rather than replayed.

## Evidence
```json
[
  {"type":"command","command":"node --test --test-concurrency=4 --test-timeout=60000 --test-force-exit test/**/*.test.js","exit_code":0,"output":"690 tests; 689 pass; 0 fail; 1 skip (installed-version compatibility fixtures require an isolated stage). Security regression: unauthorized workspace cannot inspect or adopt a retained assignment; concurrent stale-lock takeovers have at most one owner; a held lock is not removed when its owner returns EPERM. Regression: a temporary status read failure cannot replay old transcript as new activity. Passed: confirmed overflow starts a fresh worker from LoomKit and approved checkpoint; confirmed compaction-retries-exhausted starts a fresh worker; corrupt checkpoint blob holds recovery; unreviewed latch blocks fresh writer; unconfirmed exit holds; partial retry/cancellation/success never trigger context recovery; temporary status read failure cannot replay old transcript; older low without a status file still works."},
  {"type":"command","command":"node --test --test-timeout=40000 --test-name-pattern=\"corrupt checkpoint blob|overflow with verified checkpoint|confirmed overflow|confirmed compaction-retries-exhausted|unreviewed latch\" test/controller-scan-recovery.test.js test/handoff-safety.test.js","exit_code":0,"output":"5 pass; 0 fail. Both causes create distinct Pi RPC fixture sessions; corrupt evidence and unresolved reports hold."},
  {"type":"command","command":"node --test --test-timeout=40000 --test-name-pattern=\"overflow|compaction retries|partial retry\" test/compaction-window.test.js test/controller-scan-recovery.test.js test/handoff-safety.test.js","exit_code":0,"output":"9 pass; 0 fail. Covers native retry event accounting, cancellation, old worker fault, missing checkpoint and bounded recovery."},
  {"type":"command","command":"node --test --test-timeout=60000 --test-name-pattern=\"temporary status read failure|stands still|older low without a status\" test/low-runtime.test.js","exit_code":0,"output":"3 pass; 0 fail. A previously seen heartbeat status missing transiently is not counted as fresh activity; old Low without status still works."},
  {"type":"command","command":"node external-backup/pair-reserve33000-settings-20261103/verify-effective-v2.mjs","exit_code":0,"output":"SettingsManager resolves reserve 33000 and retry 3 for both workspaces; model override 41000 works. Native retry makes 4 transient attempts and 1 overflow attempt."},
  {"type":"command","command":"node external-backup/pair-context-loader-probe-20261103/probe.mjs","exit_code":0,"output":"Real Pi extension loader: one extension loaded, no errors/warnings, isolated package has no node_modules and no inference was used."},
  {"type":"command","command":"node external-backup/pair-reserve33000-settings-20261103/verify-threshold.mjs","exit_code":0,"output":"Pi shouldCompact: at 239000=false, above at 239001=true for contextWindow 272000 and reserve 33000; disabled=false. This is a direct predicate probe, not a live model run."},
  {"type":"command","command":"node node_modules/typescript/bin/tsc -p tsconfig.json","exit_code":0,"output":"TypeScript checkJs passes."}
]
```

## Known Limitations
- No approved checkpoint, corrupt evidence, unfinished report, unconfirmed writer exit, human pause or recovery-budget refusal means a visible hold; there is no blind replay or replacement.
- The automatic handoff file is exclusive per task step; repeated exhaustion on that step is held. A crash while writing or before starting requires inspection rather than speculative replay.
- `reserveTokens=33000` and `retry.maxRetries=3` were verified in the user's Pi settings, not enforced by this package; explicit overrides still win and existing processes may need restart.
- The installed live package was not modified. Tests use isolated temporary repositories and offline Pi RPC fixtures, not real provider inference or a production worker.
- Full suite passed with concurrency 4; the installed-version compatibility fixture is intentionally skipped without an isolated stage. Earlier full runs failed; one exposed a real transient Low status-read defect, reproduced and fixed. LoomKit gate-code first BLOCKED, then returned PASS_WITH_WARNINGS in degraded mode after true security evidence and rollback were added; see progress and the retained verdicts. Pi's threshold predicate was probed separately; actual live model compaction and L2 semantic model review remain unverified.

## Unresolved Assumptions
- Provider error classification follows the installed Pi AI package's official `isContextOverflow` detection; provider-specific unrecognized overflow errors will not trigger this path.
- Pi versions whose compaction retry events lack matching scheduled/attempt/finished metadata are conservatively held by existing generic recovery rather than counted as an exhausted native retry series.
