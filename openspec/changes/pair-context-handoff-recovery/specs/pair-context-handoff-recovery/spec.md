## ADDED Requirements

### Requirement: Default reserve and finite retry
The system SHALL use a Pi default compaction reserve of 33,000 tokens without overriding explicit project/model settings, retain Pi's existing maximum of three retries for transient failures, and transition a confirmed context overflow directly to handoff and a fresh thread without retrying the exhausted context.

#### Scenario: Compaction reaches threshold
- **WHEN** the worker session exceeds its model window minus the effective reserve
- **THEN** Pi's existing auto-compaction runs; for a 272,000-token model with the 33,000 default and no override, the threshold is 239,000 tokens.

#### Scenario: Context overflow
- **WHEN** a worker reports an actual context overflow
- **THEN** do not retry its exhausted conversation; hand off and start a fresh thread after the ownership and evidence checks.

#### Scenario: Transient errors persist
- **WHEN** Pi encounters a transient failure
- **THEN** retain the existing three-retry policy without another nested retry layer; user cancellation and unrelated errors are not silently classified as overflow.

### Requirement: Durable handoff to fresh worker
The system SHALL preserve the old session and checkpoint, record a handoff from available durable facts, verify the old writer has stopped, and start a fresh worker session with the handoff, LoomKit state and last verified checkpoint when the evidence and ownership are sufficient.

#### Scenario: Exhausted worker is stopped and evidence is valid
- **WHEN** the retry budget is exhausted and ownership/checkpoint verification succeeds
- **THEN** the worker's new generation receives the existing task and handoff without resuming the full conversation, silently approving reports or losing incomplete changes.

#### Scenario: Ownership or checkpoint uncertain
- **WHEN** old-writer liveness, checkpoint integrity or the next safe operation cannot be established
- **THEN** record the uncertainty, preserve all evidence, do not start a conflicting writer or replay uncertain side effects, and surface the issue to Main.

#### Scenario: Repeated exhaustion or interruption
- **WHEN** handoff or restart fails, is interrupted, or the replacement also exhausts context for the same recovery episode
- **THEN** recovery remains bounded and idempotent; no automatic unbounded chain of workers is created.

### Requirement: Scope and delivery honesty
#### Scenario: Local implementation is tested
- **WHEN** local tests or gates complete
- **THEN** report the exact results and limitations separately from installation; do not modify live package, Pi settings, game or saves without the corresponding reviewed rollout.
