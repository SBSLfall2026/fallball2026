# DugoutCP — product vision

Status: DugoutCP approved as working brand; implementation and independent migration not yet complete. Updated 2026-10-15.

## Brand
- Working product name: **DugoutCP** (Dugout Command Post).
- Tagline: **Less paperwork. More ball.**
- Founder perspective: military veteran and experienced volunteer baseball and softball coach. The platform is for all coaches, not only veterans or military users.
- Domain `dugoutcp.com` was advertised as available; purchase and ownership have not been verified. Trademark clearance remains outstanding; do not claim exclusive rights.

## Mission
Turn the existing FallBall application into a league-independent product for baseball and fastpitch softball coaches, initially recreational 8U–18U, with a future path to travel teams and commercialization. Preserve useful existing work and keep the current deployed team functional during migration.

## Principles
- No league ownership, permission, or operational dependency. SBSL is historical migration context only, not the new brand.
- Organizations, leagues, teams and seasons are distinct tenant-scoped entities; coaches may work across organizations without cross-tenant leakage.
- Coaching-first: roster, lineup, playing-time rules, defensive rotations, practices, drills, games, communication, player development.
- Sport- and league-specific rules must be configurable, not hard-coded. Location may be used for weather with consent.
- Child/player information is private by default, with role-based access, minimal collection and retention controls.
- No payment system or pricing is approved yet; design for future commercialization without prematurely implementing billing.
- DugoutCP is the working name; domain ownership, trademark clearance, and new owning GitHub account/organization remain unresolved.

## Existing baseline
The legacy application is a single-page GitHub Pages app with Firebase Auth/Firestore and team-oriented data. Do not assume existing production Firebase configuration or security has been validated merely because repository rules exist.
