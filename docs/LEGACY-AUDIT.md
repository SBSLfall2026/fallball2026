# Legacy source audit — initial repository-only inventory

Observed 2026-10-15 via connected GitHub. No live Firebase or deployed browser inspection performed.

## Files and dependencies
- index.html: single-file application, approximately 289 KB; full hard-coded identifier audit pending.
- access-session.js: client-side access/session logic; inspect for assumptions before tenant migration.
- firestore.rules: team-path membership model at teams/{team}; roles coach/admin; operational collections include players, games, lineups, stats, pitching, compliance, chat, scouting, and others.
- firebase.json: Firestore rules and emulator only; GitHub Pages serves web app.
- tests/: access-session and Firestore rules tests. Tests have not been executed in this session.
- .github/workflows/: access tests and weekly-backup workflow. Confirm backup workflow is disabled in deployed branch; do not publish exports.
- scripts/backup-firestore.js and legacy JSON import files exist in current repository tree. Treat these as a potential data exposure risk; audit contents/history before any migration or publicity. Do not assume they are safe to distribute.
- SECURE-ROLLOUT.md: documented membership provisioning and restrictive rules rollout; deployment status unverified.

## Immediate technical work
1. Search every tracked source file and GitHub Pages configuration for SBSL, fallball, team IDs, project IDs, URLs and hard-coded rules.
2. Audit the existing backups/import JSON and Git history for sensitive information, without copying them into new documentation.
3. Capture existing authentication and data-flow behavior with synthetic tests.
4. Produce a change-by-change migration diff, new environment requirements and rollback plan.

No production system or source code was changed by this audit.
