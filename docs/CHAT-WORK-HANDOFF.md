# Shared Chat / Work handoff

## Session protocol
1. Read this file, PRODUCT-VISION.md, MIGRATION-ROADMAP.md, README.md and SECURE-ROLLOUT.md from current main before work.
2. Inspect current GitHub issues, PRs and deployed environment as needed; distinguish observed state from plans.
3. Use a dedicated feature branch and PR. Do not concurrently overwrite another session's files.
4. After approved work, update status with date, exact changes, tests, risks, rollback and next action; merge only after review.
5. Chat and Work do not automatically sync: explicitly fetch latest merged GitHub state at the start of each session.

## Current handoff — 2026-10-15
- User approved a complete transformation from SBSL-specific FallBall to an independent marketable baseball/softball coaching product.
- The current legacy repository remains the migration source; no rebrand, infrastructure cutover or production code changes are represented as completed.
- Immediate next task: complete a code/configuration inventory and draft an independent tenant model and rebranding diff.
- Open decisions: product name, ownership destination, domain, hosting/Firebase strategy, pilot scope.
- Security: protect minors' records; preserve restrictive Firestore rules; do not commit secrets or personal data.
