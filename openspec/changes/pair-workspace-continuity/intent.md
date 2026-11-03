# Intent: Pair workspace continuity

Status: APPROVED by the human in the current session; plan_review pending. The CLI does not provide gate-plan.

## Raw request

> "The Pair checkpoint has to be linked to LoomKit, right? It does not matter whether a failed resume means destroy or reload; Pair state must not depend on the session."
>
> "Go ahead and implement that in the local Pair repository, right?"

## Problem

A Pair assignment and its pending checkpoint are stored under a directory bound to the Main Pi session. A fresh Main session cannot inspect or decide that assignment and the project writer guard refuses a replacement assignment. LoomKit holds the change plan but is not automatically linked to the Pair checkpoint, so the user is asked to find an old session to continue even though evidence exists on disk.

## Desired outcome

A user can continue a Pair-supervised change in a later Pi session using durable workspace/task identity and a verifiable link to the relevant LoomKit change, without losing or silently replaying work. A pending report remains reviewable and retains its original evidence and provenance. LoomKit remains the work-plan/progress authority; worker execution state does not depend on the lifetime of a Main session.

## Scope

- Pair source repository `the Pair repository`, including focused offline tests and documentation.
- Recovery across Main sessions for the same canonical workspace, including existing session-bound pending-review state.
- An optional durable link from a Pair task/checkpoint to its LoomKit change; Pair remains usable when LoomKit is absent.

## Non-goals

- Destroying old sessions, deleting or rewriting evidence, silently approving a checkpoint, or rerunning a task merely to recreate its report.
- Weakening the single-writer lock, bypassing unconfirmed process exit, or resetting a worker conversation to hide an error.
- Game, save, engine, or installed Pair-package changes in this change; rollout is a separate reviewed action.
- Making LoomKit itself mandatory for all Pair users.

## Constraints and observations

- Existing `src/controller.js` derives its state directory from canonical cwd and Main `ownerSession`; the repo writer guard protects against another unresolved task.
- Current assignment passed `loomkit_plan` in its context, but there is no demonstrated automatic report-to-LoomKit link; its 5 tasks remain open.
- Source checkout has existing uncommitted changes in `src/controller.js`, `src/contracts.js` and tests; preserve them. The installed package differs from this checkout.
- No Prewalk. Real gate-plan is unavailable in the currently inspected LoomKit CLI; do not substitute `loomkit_plan` or claim it passed.

## Success

- A fresh Main session can discover and take over a stopped or interrupted workspace assignment safely and inspect the same pending immutable report without an old-session login or blind redispatch.
- Process, lease and checkpoint provenance stay verifiable; a live or unconfirmed former writer prevents takeover.
- The linked LoomKit change exposes the task/report/checkpoint reference and honest progress; missing or failed evidence never becomes PASS.
- Existing same-session workflows, non-LoomKit use and user changes remain intact.

## Risks and assumptions

Cross-session ownership, old report identity, crash consistency and concurrent writers are safety-critical. Preserve historical evidence rather than rewriting owner IDs. Assume a user has approved the LoomKit change and its workspace association; automatic adoption of an unrelated change is out of scope. Detailed design is DRAFT pending user review.
