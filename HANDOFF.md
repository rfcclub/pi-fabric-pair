# HANDOFF — Pair rollout, restart pending

**2026-11-03. Continue this work in `the Pair repository`; the active Pi project remains `the paired project`.**

## User direction

the user asked to install the new Pair package, and explicitly said to **proceed automatically after a successful review** rather than repeatedly asking him to confirm. Only interrupt him for a real unresolved risk or a decision that is genuinely his. No Prewalk, no game boot or automated gameplay; never modify game/saves or silently approve/replay a retained report. He asked for this handoff before closing Pi.

## Current state

- New package is **installed on disk**, but this Pi process and its idle worker still run the **old loaded code**. The old Main and worker processes were still alive on the last check; these PIDs are historical observations, not authorities to kill.
- Live package path: `~/.pi/agent/local/fabric-pair`; the paired project's `.pi/settings.json` loads this path directly. `src/` matches commit **`031e93d5b866324751bc07f152505103085e294a`**. Docs, compat probes, and `.gitignore` in that commit were scrubbed after install, so the full tree is not the installed byte image. `13d5811` subsequently committed the installation ledger; this handoff is another documentation-only commit.
- Global Pi settings on disk: default compaction reserve **33,000** tokens and native retry **3**; project/model overrides still win. Existing processes may have old settings.
- Current old Pair status: enabled, worker `worker` ready, `task: null`, zero waiting reports. This is **not** proof that the new extension is loaded.

## Do next, after the user closes and reopens Pi

1. Confirm the new extension actually registered, e.g. use Fabric `tools.describe({ref:'extensions.pair_discover'})` or equivalent discovery, and check `extensions.pair_status({})`. New tools include `pair_discover`, `pair_inspect_workspace`, `pair_adopt`, `pair_continue`, and `pair_link_loomkit`. Do not start or dispatch a worker just to verify installation.
2. If registration/status is healthy, record the actual fresh-session result in `openspec/changes/pair-live-rollout/INSTALLATION.md`, mark task 6 in `openspec/changes/pair-live-rollout/tasks.md` complete, and commit the documentation. If not, inspect the error and fix/hold honestly. A package on disk is not equivalent to an activated session.
3. Keep the prior historical report in review until appropriately inspected and decided in its own authorized workflow. **Do not automatically adopt, approve, resume, or redispatch it** as part of this installation check.
4. The user prefers no repeated full suite, smoke, benchmark or broad re-investigation: use the fresh status/registration delta; rerun other checks only for changed code or a real failure. Actual context overflow recovery has not been exercised against a live provider and must not be claimed as proven.

## Evidence and safety

- Installation receipt and detailed checks: `openspec/changes/pair-live-rollout/INSTALLATION.md`; LoomKit tasks: `openspec/changes/pair-live-rollout/tasks.md`.
- Live package has 39 files, verified byte-for-byte; actual Pi loader loaded it with **14 registered tools**, zero loader errors/warnings in an independent process. This is not proof the old process reloaded it.
- Relevant checks: **28/28** installed-version compatibility, **10/10** owner/lock, **1/1** unauthorized-workspace, **5/5** promotion/rollback probes, and direct TypeScript check passed. The first fixture failed on an overly definite owner message and was fixed; the initial test environment and gate failures are retained, not erased.
- SEAL `plan_review` **PASS**, trust 100, 12 low structural warnings. LoomKit `gate-code` **PASS_WITH_WARNINGS**, trust 75, degraded because `phase.json` is absent; no L2 semantic model review. CLI has no `gate-plan`; do not claim one passed.
- Old package: the pre-install backup package. External SHA backup: `external-backup/pair-live-rollout-20261103/package-before`; full receipt `external-backup/pair-live-rollout-20261103/INSTALL-RECEIPT.json`. Do not overwrite/delete either backup or restore Pair state as package rollback.
- A historical stopped session still has an unreviewed report. Its state, manifest, snapshot and five changed-file blobs were verified read-only and left unchanged; no ownership was transferred. The old recorded worker process was absent at rollout time. Its task/report are not part of rollout approval.

## Boundary

Only Pair source, package files, global Pi settings previously approved, and Pair rollout documentation were changed. No paired-project source, game files or save were touched. The user requested all Pair-repository changes be committed. `tasks.md` task 6 deliberately remains open until restart verification actually succeeds.
