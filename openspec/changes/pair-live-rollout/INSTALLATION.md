# Installation receipt — Pair live rollout

## Status

**Installed on disk; not yet activated in the running Pi.** The current Main/idle worker still hold their old modules and settings. The user must close and reopen Pi before using Pair; after restart inspect registered tools and `pair_status` without dispatching work. Do not claim an actual overflow recovery has run.

- Candidate code commit: `031e93d5b866324751bc07f152505103085e294a`, based on `18d4c47` plus the one-line lock-owner diagnostic fix.
- Live package: `~/.pi/agent/local/fabric-pair` — **39 files**, byte-identical to the tested candidate.
- Old package: the pre-install backup package, retained and verified against its backup.
- External backup: `external-backup/pair-live-rollout-20261103/package-before`; manifest SHA-256 `cd6b6ed7d404b16b360caac75da2e2c04603637b4bbe1130f9823dd11bdbc2a6`.
- Candidate manifest SHA-256: `554fd51ce9a4ce56d143fa53a1196858c4f28cf114d560e4089cf36c2a7aaea3`.
- Install receipt: `external-backup/pair-live-rollout-20261103/INSTALL-RECEIPT.json`, SHA-256 `28ad3e0e87c6e52823eb2401402f0d09e1206ff59780b82e7c10db3b5fb12508`.
- Installed verification: `external-backup/pair-live-rollout-20261103/installed-verification.json`, SHA-256 `f019809f45cf7956c4002e8af6624522fc32bafbcc3ee6bb456feceda71766a1`.

## Evidence and limitations

- After the diagnostic fix: installed-version fixtures **28/28**, owner/lock tests **10/10**, unauthorized-workspace regression **1/1**, isolated promotion/rollback guards **5/5**; direct TypeScript check passed. Initial fixture, typecheck-shim and gate failures remain recorded in `self-check.md` and the external logs.
- The actual installed path loads with the real Pi extension loader, **14 tools registered**, zero loader errors/warnings; this was an isolated loader, not the already-running Pi session.
- Sixteen retained session state files validated without migration. An old stopped session's unreviewed report, checkpoint manifest, snapshot and all five changed-file blobs were inspected read-only and remained unchanged; no report was approved, task resumed or ownership transferred.
- SEAL plan_review 02 **PASS**, trust 100, 12 low structural-heading warnings. LoomKit code gate **PASS_WITH_WARNINGS**, trust 75, degraded without `phase.json`; its earlier escalations and final verdict are retained. No semantic model reviewer or live overflow was exercised.
- Rollback means verifying current ownership and both package manifests first; never restore or overwrite Pair task/session state or game/save data. Preserve both backups.
