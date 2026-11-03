## Why

A Pair checkpoint survives on disk but its active ownership is tied to a Main session; LoomKit progress is not automatically connected to it. After a crash or new session, a valid pending report is inaccessible from the new controller while the writer guard prevents a replacement assignment.

## What changes

- Give a Pair workspace durable identity and a guarded path to continue an existing assignment across Main sessions, including legacy session-bound reports.
- Preserve the original checkpoint, decision and worker-conversation provenance; distinguish current controller authority from historical report identity.
- Record a verifiable Pair task/report/checkpoint reference with an explicitly selected LoomKit change when enabled. Never infer completion merely from a checkpoint.
- Retain no-LoomKit and same-session operation. Keep writer/lease guards and fail closed on unresolved ownership or evidence mismatch.

## Impact

The local `pi-fabric-pair` controller, state/identity validation, repository lock and report/evidence paths, the optional LoomKit metadata bridge, and focused recovery/concurrency tests and documentation. Exact file ownership is refined during implementation without overwriting existing uncommitted edits. No installed package, game or save is changed by this design.
