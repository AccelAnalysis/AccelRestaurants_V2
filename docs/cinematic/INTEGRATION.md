# Cinematic integration record

PR #3 is a draft on `feat/cinematic-productization`, stacked after measurement PR #2.
Original main baseline: `19ea52705ce1f7b158c870c93e39da70ec940fcf`.
The initial `5445cf0` integration reference in ROLLOUT.md has been superseded:
measurement `83dbd94` was incorporated, followed by
`0cc0fced69a8f053a00fb0b514cda87c63aae9c2` on September 7, 2026.

The latest seven measurement-owned files were incorporated unchanged from that owner's
commit. This includes the dashboard link selector fix, fractional revision-timestamp
regression and independent trigger verification. No competing analytics implementation
or measurement event contract was added by cinematic work.

## Landing order

1. Merge the measurement foundation to main through its owner's normal release process.
2. Retarget draft PR #3 to main; do not merge it into the measurement feature branch.
3. Refresh its base, inspect the shared PlayerScreen/schema/Functions export/rules diff,
   and rerun both cinematic and measurement verification against the combined tree.
4. Deploy the merged starter/import Functions and canonical Firestore rules before the
   corresponding Hosting build. No production deploy or merge was executed by this work.

The final `.github/workflows/cinematic-validation.yml` is a read-only validation workflow
and must remain. Temporary branch-scoped source-transport files are absent from the final
tree. There is no automatic production deployment or new approval process.

## Evidence interpretation

Use the latest PR Conversation verification record and Actions runs for exact test counts.
Earlier combined-tree measurement browser runs stopped at a hidden `<option>` selected
by getByText(...).first(); the foundation owner corrected the selector to the visible link.
The cinematic emulator suite additionally exercises successful ordinary organization edits,
not only denied plan edits. It exposed an unsupported Set.hasNone call in the inherited
rules; the cinematic branch uses supported !affectedKeys().hasAny(...) without weakening
protected plan-field checks. See Firebase's rules.Set reference.

Cinematic browser fixtures use real production rendering/setup components but substitute
Firebase calls. The separate measurement regression workflow uses real local Firebase
emulators and the production-built player. Neither is a physical-device soak, live payment
checkout test, production acceptance run or clean dependency-vulnerability audit.
See ROLLOUT.md for feature behavior, plan packaging, limits and rollback.
