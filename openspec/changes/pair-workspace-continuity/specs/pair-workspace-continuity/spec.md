# Pair workspace continuity

## ADDED Requirements

### Requirement: SC-01 — Workspace continuity
For the same canonical project/workspace, a later Main session SHALL be able to discover an existing Pair assignment and inspect a pending report, without replaying its task or requiring the previous Main session to be opened.

#### Scenario: Pending review survives a new session
- **WHEN** the previous controller has stopped and a task holds an immutable checkpoint in review
- **THEN** the new session can obtain that same task, report and checkpoint for review, with their original identities and bytes preserved.

### Requirement: SC-02 — Guarded ownership
A takeover SHALL preserve the single-writer invariant and SHALL NOT continue when a prior worker may still be running or ownership cannot be established.

#### Scenario: Competing controllers or uncertain exit
- **WHEN** another controller is active, exit cannot be proven, or two sessions try takeover concurrently
- **THEN** at most one owns the workspace and the other fails closed; no duplicate task runs or evidence is deleted.

### Requirement: SC-03 — Immutable evidence and stale leases
The original report provenance and checkpoint hash SHALL remain verifiable after takeover; only the new valid authority may continue work.

#### Scenario: Old report or altered checkpoint
- **WHEN** an old worker sends a late report after authority changes, or a stored checkpoint is missing or its hash differs
- **THEN** the late report is rejected or held and the checkpoint cannot be approved as valid.

### Requirement: SC-04 — Honest LoomKit association
When a task is explicitly associated with a LoomKit change, the change SHALL have a durable, verifiable reference to Pair task/report/checkpoint evidence; a pending or failed checkpoint MUST NOT be recorded as complete.

#### Scenario: Report is recorded, not auto-approved
- **WHEN** an associated task produces a report or is recovered in a new session
- **THEN** the associated change can identify the exact report and hash, and work remains open until applicable verification and human/Main review succeed.

#### Scenario: No LoomKit association or failed sync
- **WHEN** the user has not associated a task with LoomKit, or a metadata write fails
- **THEN** generic Pair remains usable and the missing link is visible; a failed write MUST NOT create a false success or erase evidence.

### Requirement: SC-05 — Existing state and crash compatibility
Existing same-session state SHALL remain readable and existing session-bound assignments SHALL have a safe, auditable continuation path. Interrupted work MUST NOT restart itself solely because ownership changed.

#### Scenario: Legacy assignment or interrupted transfer
- **WHEN** the prior-format state has a pending report, or a crash interrupts the ownership transfer
- **THEN** preserved evidence remains recoverable, takeover is idempotent or held for review, and there is no silent replay or destructive state reset.
