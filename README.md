# Independent Coaching Team Manager

Baseball and softball team tools for independent coaches, primarily 8U–18U recreational play. Teams may enter an optional league name/location; league affiliation never grants access or supplies built-in fields, opponents, weather locations or participation rules.

This proposed version keeps the existing Firebase connection and team membership protection, removes the seasonal/league product identity and adds an online scoreboard. Opening a PR does not deploy it.

## Score Game
Select a scheduled game with Home / Away set. Record runs, outs and half innings. Ending a half before three outs requires a reason, allowing time/run limits without guessing your rules. Coaches can review the current score and record reasoned corrections. Corrections and new scoring require another review.

Scoreboard revisions and append-only events are written together in a Firestore transaction. Events have an authenticated actor, server timestamp and prior revision. Retries reuse an operation ID; stale revisions cannot overwrite another scorer. Browser rules deny event updates/deletion. Firebase administrators retain privileged access.

**Current limits:** Manual scoreboard, not automatic batter/base-runner or player-stat calculation. Scoring requires online confirmation and does not persist youth data on a device. Independent onboarding/invitations, admin succession, full season archives, scorekeeper-only roles and offline sync remain to be implemented. Membership provisioning is still console-managed. Advanced travel-ball rules are not assumed.

## Team settings and weather
Choose sport, age division (8U–18U), season and optional league metadata. New games capture the season label as an initial identifier; existing unassigned games are not silently moved when edited. A dedicated season model/archive UI is future work.

Participation reminders require explicit administrator opt-in to the one-at-bat/one-fielding-inning target. Fields, opponents and resources start empty. Weather uses coordinates entered for a field and the forecast location's timezone, with no pre-sign-in weather request or geographic default. League location is metadata, not automatic geocoding.

## Verification
From the repository root:

    npm install --ignore-scripts
    npm test
    npm run test:rules

Rules tests use a demo emulator project only. Never use production for tests or commit real player/parent records, exports, credentials or service accounts. PR CI runs the model/access and rules suites.

Read [secure rollout](SECURE-ROLLOUT.md) and [implementation status](IMPLEMENTATION.md) before release. Deploy reviewed scoring rules before the page and four new scripts. Legacy backup/import tools do not include nested scoring events; they are not a complete scoring backup. Public backup automation stays disabled.
