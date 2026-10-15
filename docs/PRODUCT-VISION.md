# Independent coaching platform — product vision

Status: Approved direction, not implemented. Updated 2026-10-15.

## Mission
Turn the existing FallBall application into a league-independent product for baseball and fastpitch softball coaches, initially recreational 8U–18U, with a future path to travel teams and commercialization. Preserve useful existing work and keep the current deployed team functional during migration.

## Principles
- No league ownership, permission, or operational dependency. SBSL is historical migration context only, not the new brand.
- Organizations, leagues, teams and seasons are distinct tenant-scoped entities; coaches may work across organizations without cross-tenant leakage.
- Coaching-first: roster, lineup, playing-time rules, defensive rotations, practices, drills, games, communication, player development.
- Sport- and league-specific rules must be configurable, not hard-coded. Location may be used for weather with consent.
- Child/player information is private by default, with role-based access, minimal collection and retention controls.
- No payment system or pricing is approved yet; design for future commercialization without prematurely implementing billing.
- The product name, domain and new owning GitHub account/organization remain undecided.

## Existing baseline
The legacy application is a single-page GitHub Pages app with Firebase Auth/Firestore and team-oriented data. Do not assume existing production Firebase configuration or security has been validated merely because repository rules exist.
