# Qawi Agent Instructions

## Low-quota handoff

When the runtime exposes that 5% or less remains in the rolling five-hour usage limit:

1. Stop starting new implementation work immediately.
2. Leave the working tree intact; do not revert, discard, or overwrite unfinished work.
3. Create or update `HANDOFF.md` in the repository root for the next agent.
4. Record the current objective, completed work, unfinished work, changed files, verification results, active blockers, and the exact safest next step.
5. Mention any pre-existing working-tree changes that must be preserved.
6. After writing the handoff, report that the handoff is ready and do no further project work.

If remaining rolling-limit information is not exposed by the runtime, do not guess the percentage. Continue normally and keep progress sufficiently documented for a later handoff.
