# Design: context exhaustion → handoff → fresh worker

Status: detailed design approved by the user in this session. This extends `pair-workspace-continuity`; do not alter its prior gate evidence.

## Existing mechanisms

- Pi checks projected context against `contextWindow - compaction.reserveTokens` and compacts during runs. `reserveTokens` is a trigger margin, not a cap on generated tokens.
- Pi already uses `retry.maxRetries=3` by default for transient summarization failures; overflow uses a separate compact-and-retry path. Pair observes Pi compaction/retry events and already re-injects task state after successful compaction.
- Local Pair workspace continuity can associate LoomKit and verified checkpoint/report evidence and request a fresh worker session. It is not yet the installed package.
- Pi documents `/new`/RPC `new_session`, not a built-in `/clear`; a fresh worker process/session is the equivalent here and must not erase its predecessor's transcript.

## Proposed path

1. Set `compaction.reserveTokens` to **33000** as the default in the user Pi settings at a separately reviewed deployment step; explicit project/model overrides win. This affects Main and other Pi sessions as well as workers. For the currently configured 272000-token Terra model, trigger above 239000 tokens. Back up and SHA-256 the existing settings before any overwrite; verify effective settings after restart/reload as appropriate.
2. On actual context overflow, immediately initiate handoff and a fresh thread without retrying the exhausted context, per the user's explicit clarification. Preserve Pi's existing three-retry policy for transient failures; no extra nested retries. Distinguish actual overflow from output-length truncation, other errors and user cancellation, and avoid changing ordinary threshold compaction.
3. On confirmed overflow, or after a transient compaction failure exhausts its native retry policy, controller writes one durable handoff from available task state, linked LoomKit plan, checkpoint/report identity/hash, observed incomplete changes and failure details. Explicitly mark unknown or uncheckpointed work. Do not depend on the failing model to author the only handoff and never change the original report's producer identity.
4. Confirm the old worker process and writer lease are inactive. Preserve the previous session file and the worktree as-is. Reuse the local fresh-session/workspace continuity route to spawn the replacement, pass the handoff plus LoomKit/checkpoint, and continue only the unfinished task. A pending report still requires Main's ordinary review; uncertain side effects are not replayed blindly. If safe continuation cannot be verified, stop and present the handoff instead of starting a conflicting writer.
5. Make handoff/restart idempotent and limit automatic replacement within the same recovery episode. A second exhausted replacement or invalid evidence stops visibly, so the fix cannot create a new infinite worker loop. Retain ordinary Pair authorization and independent review.

## Verification

Offline, exercise: effective 33000 default and override precedence; threshold calculation; successful auto-compact and task-state reinjection; transient failures retain Pi's three retries; actual overflow starts handoff without retrying the full thread; length/cancel are not misclassified; no nested retry multiplication; handoff includes last verified checkpoint and honest uncheckpointed changes; old worker alive/dead; missing/corrupt checkpoint; new worker identity/session and no resume of old context; restart/crash idempotence; second failure bounded; unrelated errors not misclassified; pending reports and workspace changes preserved. Run focused tests plus relevant Pair regression, actual `gate-code` and independent review against the final candidate. Report gate warnings/degraded mode, not a fabricated PASS.

`loomkit gate-plan` is absent in the inspected CLI. `loomkit_plan` is not gate-plan. A `plan_review`, if run, is separate evidence and not a substitute claimed as gate-plan. Approval authorizes implementation in the local Pair repo. Live config and package rollout remain separate reviewed steps.
