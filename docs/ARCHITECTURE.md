# Independent coaching platform — architecture proposal

Status: Design proposal, not deployed. 2026-10-15.

## Product boundaries
- One platform, multiple independent organizations, teams and seasons.
- An individual coach may belong to multiple organizations; authorization is scoped to each organization and team.
- Sport configuration: baseball or fastpitch softball, 8U–18U initially. Rulesets are versioned by league/season and not embedded in application logic.
- The existing single-file Firebase web app is a legacy source, not the target architectural constraint.

## Proposed data model
- users/{uid}: minimal account profile, no global authorization role from browser-controlled data.
- organizations/{orgId}: organization metadata and settings.
- organizations/{orgId}/members/{uid}: role, active state, invite provenance; trusted backend only for elevated roles.
- organizations/{orgId}/teams/{teamId}: team, sport, age division, location region.
- organizations/{orgId}/teams/{teamId}/seasons/{seasonId}: schedule, rosters, lineups, practices, stats, pitching, compliance and notes.
- Rulesets: centrally versioned templates with team-level approved overrides, immutable audit history for rule changes.

## Access and security
- Firestore security rules must verify both organization and team membership for every private path; never rely on a client-supplied org ID or role alone.
- Support coach, organization admin, and restricted family/player access only when explicitly designed.
- Protect minors: avoid public player profiles, require minimal data, implement retention/deletion and consent workflows before commercialization.
- Backups must be access-controlled and never committed to a public repository.
- Authentication and deployment should use separate dev/staging/prod environments and least-privilege secrets.

## Migration strategy
- Preserve existing team identifiers through a mapping table and test with synthetic fixtures before copying live records.
- Build a new product environment in parallel, validate authorization and migration, then coordinate cutover and rollback.
- Existing home-projects-hub remains separate; cross-link only non-sensitive coordination references.
