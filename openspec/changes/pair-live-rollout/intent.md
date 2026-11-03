# Intent: deploy the committed Pair recovery package

## Request

After the local implementation was committed, the user approved rollout. Deliver the reviewed Pair implementation derived from commit `18d4c473bef0714ff0983778812522bcc38befec`, including the narrowly scoped owner-diagnostic fix discovered during rollout verification, to the local Pi package that the paired project actually loads, with a verified backup and a clear activation/rollback path.

## Outcome

A verified candidate is installed at `~/.pi/agent/local/fabric-pair`, preserving Pair task/session evidence. The user is told exactly whether activation and runtime checks happened or still require restarting Pi.

## Scope

- Stage and check the complete package, assess compatibility against the live installation and retained state, back up the live package with SHA-256, then promote only when preconditions hold.
- Verify the resulting package and hand over activation to the user; retain the original package and exact receipts.

## Non-goals

- Do not edit paired-project source, game, saves, Pair transcripts or assignments; do not dispatch a task or start/kill a worker.
- Do not overwrite live files or start/stop processes if ownership/activity cannot be established.
- Do not claim that reload, live overflow recovery or a skipped test passed without actual evidence.

## Approval

APPROVED: the user directed the assistant to proceed automatically after a successful review, without asking for confirmation again. LoomKit CLI does not offer `gate-plan`; do not claim it passed.
