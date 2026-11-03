# Pair live rollout specification

## ADDED Requirements

### Requirement: deterministic candidate and compatibility

The candidate SHALL be derived from reviewed commit `18d4c473bef0714ff0983778812522bcc38befec` plus the one owner-diagnostic fix described in the design, be committed and tested in isolation against the installed-version compatibility fixtures and actual Pi extension loader, and be compared with copies of relevant retained state without mutating the originals. A compatibility failure or unknown state SHALL block promotion rather than be waived.

#### Scenario: incompatible installed data or behavior

- **WHEN** the candidate cannot safely load required existing state or an applicable compatibility check fails
- **THEN** keep the live package untouched, retain evidence, and report the blocker before revising the design.

### Requirement: guarded promotion and rollback

Before changing the live package, the installer SHALL verify the current task and process situation, create an external full-package backup and SHA-256 manifest, and verify the live package still matches the saved preimage. Promotion SHALL use a staged same-volume candidate and a recoverable whole-directory swap, never a mixed per-file update. If it fails, restore only a verified unchanged preimage and report any conflict.

#### Scenario: live owner or worker is active or uncertain

- **WHEN** a current or otherwise live/unknown owner has an active assignment, an unreviewed report, or an unverified worker
- **THEN** do not replace the package or terminate the process; hold for safe resolution.

#### Scenario: historical report remains under a stopped owner

- **WHEN** a retained unreviewed report belongs to a demonstrably stopped owner and worker and its state/evidence are left untouched
- **THEN** the package may be promoted after the stopped status and immutable evidence are verified, without adopting, approving, replaying or modifying that report.

### Requirement: explicit activation and preserved data

The rollout SHALL preserve existing configs, locks, transcripts, handoffs, assignments, and game/save files, and SHALL not dispatch work. It SHALL distinguish filesystem installation from a restarted Pi loading the new package; live recovery remains unproven until independently observed.

#### Scenario: installation succeeds while current Pi remains open

- **WHEN** files are promoted but Pi has not restarted
- **THEN** do not use Pair in that session; tell the user to restart Pi, then verify registration and status without dispatching work.
