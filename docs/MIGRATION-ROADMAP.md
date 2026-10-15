# Product migration roadmap

Status: Proposed implementation phases, subject to review. 2026-10-15.

## Phase 0 — audit and protect
- Inventory code, hard-coded league/team strings, Firebase project IDs, domains, workflows, authentication, rules, deployment, backups, and data schema.
- Validate the current deployment and backup/recovery with synthetic data only. Do not publish private roster exports.
- Check history and Pages for previously published personal data; handle remediation separately with owner approval.

## Phase 1 — independent identity
- Decide product name, domain and owner-controlled GitHub organization/repository.
- Migrate with preserved Git history as appropriate; keep the legacy production deployment working during cutover.
- Remove SBSL branding and identifiers from active product UI/config/code. Retain only necessary historical migration records and optional league metadata.
- Establish independent Firebase project/environment and secrets configuration; do not switch production until verified.

## Phase 2 — multi-tenant architecture
- Design organizations, leagues, teams, seasons, memberships, roles and invitations; migrate legacy team data safely.
- Enforce tenant boundaries in backend rules, not only the UI; include negative authorization tests.
- Configure sport/age/league-specific rules for baseball and softball rather than embedding one league's policy.

## Phase 3 — coaching product
- Preserve roster, lineup, stats, pitching, compliance and game workflows.
- Add practice/drill planning, team schedules, coach collaboration, and optional family-facing functions only after privacy review.
- Test mobile usability, offline behavior, onboarding and accessibility.

## Phase 4 — release readiness
- Pilot with independent teams; validate backups, security, support, privacy policy, terms, and operational costs.
- Evaluate pricing and payments later, after explicit approval.

## Cutover gates
- No deletion or rename of legacy repository, Firebase project, live data, domain or deployment without explicit approval and tested rollback.
- No production rules relaxation or data export to a public repo.
- Obtain owner approval for new product identity, infrastructure and migration window.
