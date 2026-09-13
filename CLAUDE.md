# FallBall 2026 — Claude Context

## What this is
Single-file softball team manager web app. Everything lives in `index.html`.
Firebase Firestore backend, GitHub Pages hosting, no build step.

## Key facts
- **Live site:** https://sbslfall2026.github.io/fallball2026/
- **Firebase project:** `swansboro-softball-fall-2026`
- **Team code:** `SBSL-14USB`
- **Firestore path:** `teams/SBSL-14USB/{collection}/{docId}`
- **App admin:** Andrew Brown — gysgtbrown85@gmail.com (isAdmin:true in coaches collection)
- **Head coach:** Jessica Danison
- **Classification:** public

## Deploy workflow
1. Edit `index.html`
2. `git add index.html && git commit -m "..." && git push`
3. Wait ~60 seconds → reload the site

## Revert to stable state
`git checkout v1-working-weather` — snapshot from 2026-09-12 with weather working

## Backup system
- GitHub Actions: `.github/workflows/weekly-backup.yml`
- Runs every Sunday 11:30 PM Eastern, commits JSON to `backups/`
- Requires repo secret: `FIREBASE_SERVICE_ACCOUNT` (Firebase Console → Project Settings → Service Accounts → Generate new private key)

## Important implementation notes
- `confirm()` dialogs are blocked on GitHub Pages — always use `openModal()` for confirmations
- All 15 players bat every game (continuous batting order, fall season = no lineup lock)
- Anita Brown "Nit" has non-sequential Firebase ID: `mtwgx100ojio` (not p002)
- Weather uses Open-Meteo API (free, no key) — field coords in `FIELD_COORDS` constant near bottom of script

## Collections (COLLS array)
`players, games, lineups, stats, notes, resources, pitching, compliance, fields, opponents, activity, coaches, batteries, chat, history, scouting`

## Files
| File | Purpose |
|---|---|
| `index.html` | Entire app |
| `simulation_import.json` | 10 fake games for testing (import via ⚙️) |
| `clear_games_import.json` | Deprecated — use the Clear All Game Data button in Settings instead |
| `scripts/backup-firestore.js` | Weekly backup script (run by GitHub Actions) |
| `backups/` | Auto-generated weekly JSON backups |
