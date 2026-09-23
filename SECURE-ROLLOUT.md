# Private team access rollout

This change is not safe to treat as a page-only deployment. Membership records
and the supplied Firestore rules must be deployed with it.

## Provision existing coaches

In Firebase Authentication, find each approved coach's existing account UID.
Cross-check the account against the approved coach list; do not automatically
approve every registered account or trust browser-editable profile roles.

Using the trusted Firebase console, create:

    teams/<team-code>/members/<authentication-uid>
    active: true (boolean)
    role: "coach" or "admin" (string)

Grant admin only to the designated administrator. No real account identifiers
or private roster values are committed in these instructions.

An account with no membership remains denied even if it has a coaches profile.
Creating an account is not team approval. The coaches UI now edits profiles only.
To revoke access, set the corresponding membership's active field to false.
Membership management deliberately has no browser write permission, including
for administrators. Use the console or a separately secured trusted backend.

## Tests

Run npm install, npm test, and npm run test:rules from the repository root.
The rules tests run against demo-fallball in the local Firestore emulator, never
the production project. The pull-request workflow runs both suites.

Before release, verify in a clean browser:

1. Team code opens sign-in without fetching private documents.
2. Approved coach can sign in and load the roster and all team collections.
3. An unapproved account sees access denied and no private data.
4. A coach cannot access another team's documents or modify memberships.
5. A coach cannot promote themselves through a coaches profile.
6. Sign-out and revoked membership clear rendered private data.
7. Administrator settings and coach profile edits work; a normal coach cannot
   perform those writes. Profile deletion alone does not revoke membership.
8. Offline access does not authorize from cached membership. Reload after
   connectivity is restored.
9. Test one synthetic create/update/delete in a separate test team. Do not alter
   the production roster merely to verify write permissions.

## Publish in this order

1. Confirm the emulator and login-flow tests pass.
2. Provision and verify memberships for the approved existing accounts.
3. Deploy firestore.rules to the explicitly selected production project.
   These rules replace the existing blanket authenticated rule completely.
4. Merge the page and access-session.js together and verify GitHub Pages deployed
   both files. An old page may remain unavailable during this short transition.
5. Perform the clean-browser tests above with the authorized coach account.

The supplied firebase.json has no Hosting target: this site stays on GitHub Pages.
Anonymous sign-in is not needed and is explicitly denied by the rules.
All unmatched Firestore paths remain denied. Team creation is console-managed.
Coach memberships authorize read/write access to the listed operational
collections; settings and profiles are administrator-only. Additional field
validation can be added separately without weakening these boundaries.

If the page fails, retain the restrictive rules and roll forward with a corrected
page. Never restore public access or the blanket authenticated rule to make an
old login flow work.

## Public backup exposure

The old backup workflow publishes Firestore exports into this public repository.
This change disables that workflow and removes the known backup JSON and roster
import from the current tree. These removals DO NOT erase Git history, existing
Pages deployments, forks, downloads, or cached copies.

Before re-enabling backups, configure restricted storage with authenticated
access, retention, and recovery checks. Do not use public release attachments or
commit exports. Separately review all imported data, historical commits, and
published Pages assets. Coordinate any history rewrite and removal of cached
copies with the repository owner; no history rewrite is performed by this PR.
Treat any credentials found in historical data as exposed and rotate them.
