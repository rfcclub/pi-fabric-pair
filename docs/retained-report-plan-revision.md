# Offline fix: retained report survives plan revision

## Scope and status

- Branch: `fix/retained-report-plan-revision`.
- Upstream base: `d8b297b1ad3df5519c06f6a1acc81d6dacd9986e`.
- Implementation is offline only. No installed-package/config/state/game mutation, model request, Pair reload/recovery, session reset, commit or push.
- The live stuck assignment is **not repaired by this branch yet**. Rollout and reconciliation remain separate.

## Defects and changes

`src/contracts.js` now permits a retained report to reference a removed step only when it is resolved by a non-cancel continuation decision, has an older plan revision and older attempt, and is not current/pending evidence. Existing producer/decision identity binding still applies. Task, worker, attempt, lease, same-plan and pending-report guards remain strict; reports and artifacts are not rewritten to match the new plan.

`src/controller.js` builds and validates a proposed continuation before publishing its revised work order or mutating the live task/counters. Completed prefixes, revision budgets and retained report evidence remain protected. A synchronous continuation reservation failure now leaves an interrupted, persisted task instead of stranding it activating. Existing asynchronous activation failure containment continues to work with changed step IDs.

Five added regressions in `test/step-limit-escape.test.js` cover changed IDs and retained evidence/reload/follow-up approval/cancel; rejected completed-prefix proposals; rejected continuation drafts and work-order atomicity; asynchronous activation rejection; and synchronous reservation rejection. Identity-forgery subcases exercise historical and current-report guard boundaries.

## Verification

| Check | Result |
|---|---|
| Both original defects on untouched upstream, same final offline dependencies | RED, 2/2 fail as expected |
| Step-limit suite, including five new regressions | 22/22 PASS |
| Handoff safety | 28/28 PASS |
| Controller scan/recovery | 18/18 PASS |
| Supervision notices | 12/12 PASS |
| Combined focused coverage, taken from final full run | 80/80 PASS |
| TypeScript, unchanged compiler settings | PASS |
| Offline package dry-run | PASS |
| Full suite | **627/638 PASS; 11 FAIL; not green** |
| Protected installed-package/config preimage hashes | 18/18 unchanged |
| Production diff whitespace check | PASS |

The two RED failures are `Report targets a step outside the task plan` after renaming the current step, and rejected-prefix proposals spending `stepReplans` despite rejection.

### Broader-suite failures

An archived, unmodified upstream tree with the **same** offline toolchain reproduces ten of the eleven failures: evidence filenames containing a tab on Windows; PID reuse proof; low-session resume; two settings fixture cleanup failures; POSIX path expectations in native-profile; provider fallback/session assertions; two shell-guard fixtures that inherit an incompatible shell profile; and one worker-removal cleanup failure.

The remaining worker-removal case failed with Windows `EBUSY` cleanup under the full run, but passed in isolation on both upstream and the patched branch. It is recorded as a flaky cleanup observation, not a passing full suite. No unrelated guards were disabled and no tests were skipped to conceal these failures.

### Offline toolchain limitation

`npm ci --offline` could not complete from the available cache. Clone-local dependencies were provisioned from cached archives and installed local packages; lockfile and compiler options are unchanged. Actual versions: Node 24.19.0; TypeScript 5.9.3; Pi SDK/TUI 1.3.0; Pi AI/agent-core 1.4.0; Node declarations 24.12.2; MCP SDK 1.30.0. Therefore these results do not certify a fresh lockfile installation or a live Pi 1.4 rollout.

## Reproduction

From the clone:

```sh
node --test --test-concurrency=4 --test-timeout=60000 --test-force-exit "test/**/*.test.js"
node node_modules/typescript/bin/tsc -p tsconfig.json --pretty false
npm pack --dry-run --offline --ignore-scripts --json
```

External evidence directory on this machine:

`external-backup/pair-plan-revision-offline-20261031-001/`

Key receipts: `FINAL-AUDIT-v2.json`, `baseline-red-final.log`, `full-suite.log`, `baseline-failures.log`, `flaky-cleanup-recheck.log`, `typecheck-final.log`, `pack-final.json`, and the original `MANIFEST.json`. The earlier `FINAL-AUDIT.json` contains a superseded regex-based test-name count; v2 uses the TypeScript AST and records the correct counts.

## Review and pending rollout

Fovea impact surfaced the runtime, native/UI/config, evidence and worker dependencies; the full offline suite covers their regression surface with failures disclosed above. Contour reported advisory complexity increases in three touched functions and incomplete coverage, not correctness approval. The added branches implement explicit identity and failure-containment boundaries, so no score-driven refactor was made.

Before any live rollout: preserve/merge the previously installed Windows telemetry patch; back up the installed package and assignment state with hashes; apply the intended supervision/time limits through supported configuration; reconcile the old stranded assignment without rewriting report provenance, bypassing readiness or resetting the retained conversation. None of those live operations were performed in this offline task.
