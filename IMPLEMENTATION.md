# Work implementation record — 2026-10-14

## Decision and scope
User controls the existing GitHub organization and reports being sole administrator of connected Firebase resources. Work verified repository admin access and the signed-in Firebase permissions page showing the user's account as Owner (one human member displayed, four service accounts also have access). The deployed Firestore rules shown in the console match the inspected membership-based repository policy; the active version is dated September 23, 2026. This is not a complete inherited-IAM or service-account-role audit. Reuse the existing backend on this undeployed feature branch; naming alone does not require migration.

Reuse useful roster, lineup, pitching and team isolation code. No production branding, rules, records or access settings changed. User says current records can be reimported and need not block implementation. Names, jersey numbers, stats and parent contacts are personal data: tests use synthetic data. Firestore navigation automatically reopened a previously selected team settings document; its private contents were not copied into files or GitHub, and no player documents or exports were opened.

## Proposed implementation
- Neutral title, optional league/location and 8U–18U settings; no league identifier in application code or default backup team.
- Remove field/opponent/resource seeding, including automatic field rewrites/deletions.
- Team-entered field weather coordinates and location timezone, with no pre-sign-in forecast request.
- Opt-in participation reminders rather than built-in mandatory league policy.
- Manual online scoreboard: runs/outs/half innings, coach review and reasoned corrections. Rules enforce actor/server timestamp, valid transitions, atomic event/state writes, revision ordering, team isolation and retained season identity. Events are append-only through browser rules; privileged backend admins remain able to alter data.
- Retry deduplication and stale-edit rejection; session/team changes cancel client writes. No persistent offline scoring cache.
- Initial season identifier on new games; editing existing games retains their season/unassigned state. Full archival remains outstanding.

## Validation
All 11 original access tests passed before edits. Updated local model/storage/access/neutrality suites passed (21 tests). A synthetic browser smoke at 390px width passed runs, three outs, half change, coach review, correction, eight audit entries, tab hiding and no page errors. This verifies browser integration with a stand-in, not live Firebase connectivity. Firestore emulator tests must pass in PR CI before release.

## Release and rollback
Owner review and passing rules tests are required before merge/deployment. Complete inherited IAM/service-account and deployment-identity checks, then deploy rules before page/scripts and exercise an isolated synthetic team. Google Cloud's advanced IAM page presented Terms of Service acceptance, which Work did not accept. Owner action is needed to get past that gate. No production cutover or reimport has occurred.

Legacy export/import excludes nested scoring events. Restricted complete scoring backup and restore must be implemented before production adoption. The Firebase console shows Spark billing and an upgrade gate for scheduled backups/point-in-time recovery; this does not prove no manual/external backup exists. Restore evidence remains unknown. Historical public export exposure remains unaudited. Keep backup automation disabled; no plan upgrade was performed.

Rollback uses the prior page/scripts while retaining protective rules; never weaken access to make an old page work. Scoreboards are additive, and nothing has been deployed.

## Remaining product work
Trusted independent team onboarding/invitations, dedicated scorekeeper permissions, succession/recovery and last-admin protection, full season history, player-level scoring, secure offline sync, complete restricted backups, and actual Firebase verification. This first scoreboard slice is not production-ready or fully independent while membership provisioning remains console-managed.

A private neutral repository may simplify identity/history later; its creation/destination is a separate decision. Do not mirror legacy export history.
