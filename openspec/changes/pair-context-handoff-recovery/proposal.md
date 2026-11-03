# Proposal: Pair context handoff recovery

## Why

Auto compact helps but may fail, and repeatedly resuming an exhausted worker conversation is not a recovery. A real handoff preserves the task when retry is exhausted.

## Change

- Set the Pi default reserve to 33,000 tokens, preserving explicit overrides; document the global scope and backup/rollback for the settings change.
- On confirmed context overflow, immediately hand off to a fresh worker thread; do not retry the exhausted context. Keep Pi's existing three-retry policy for transient errors.
- Reuse Pair's LoomKit/checkpoint and workspace continuity mechanisms to write a durable handoff, stop/verify the old writer and run the unfinished task in a fresh session.
- Preserve original evidence and expose uncertain state; avoid any retry/worker-creation loop.

## Boundary

This extends `pair-workspace-continuity`, without rewriting its reviewed artifacts or gate verdict. Local source and targeted offline tests only until separately reviewed rollout. No game or save operations.
