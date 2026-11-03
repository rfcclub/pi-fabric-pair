# Intent: Pair context exhaustion recovery

## Original request

> Set the default reserve to 33K (1K buffer), and allow 3 retries. If that still fails, write a handoff and start a new session with /clear /new.
>
> If compact or overflow fails, keep the checkpoint, confirm the old worker has stopped, and create a new worker from LoomKit plus the checkpoint. Do not keep resuming a conversation that is already full. This follows the handoff approach.
>
> On overflow, start a new thread. Do not keep trying.

## Problem and desired outcome

A Pair worker can still exhaust context or fail compaction. Reopening the same full session risks repeating the failure. Keep the work and its evidence, then continue in a fresh worker session from a handoff, LoomKit and the last verified checkpoint.

## Scope and constraints

- Default Pi compaction reserve is 33,000 tokens, with project/model overrides still respected. This default affects Pi sessions generally, not only Pair workers; 1,000 of that reserve is the requested buffer.
- On an actual context overflow, handoff and create a new thread immediately: no retries on the exhausted context. Retain Pi's existing three retries for transient failures; do not multiply retry layers.
- After exhaustion, write a durable handoff; preserve checkpoint, incomplete work and original session; confirm the old worker process has stopped; create a fresh worker session and use the handoff plus available LoomKit/checkpoint state to continue.
- Never pretend an unverified or missing checkpoint is complete, replay uncertain side effects blindly, silently approve a report, or let an uncertain/live old writer race a new one.
- Implement in `the Pair repository`; deployment and the machine-global Pi settings change are separate reviewed steps. Do not touch game/save data.

## Existing facts

Pi documents reserveTokens as the threshold reserve, not an output cap. Its current default transient summarization retry budget is already three; context overflow is a distinct recovery path. Pi's built-in `/new` creates a session; a built-in `/clear` is not documented. The installed Pair package is not the same as the local candidate.

## Approval

APPROVED: user confirmed the detailed design in this session. `gate-plan` is absent from this LoomKit CLI and remains unavailable, not passed. Live settings/package rollout is a separate reviewed step.
