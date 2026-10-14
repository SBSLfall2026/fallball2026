const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
const { initial, transition } = require('../scorekeeping');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-fallball', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const team of ['A', 'B']) {
      await setDoc(doc(db, 'teams', team), { teamName: 'Synthetic ' + team });
      await setDoc(doc(db, 'teams', team, 'players', 'synthetic'), { name: 'Test player' });
      await setDoc(doc(db, 'teams', team, 'games', 'scored'), { seasonId: 'synthetic-season' });
    }
    for (const [uid, active, role] of [['coach', true, 'coach'], ['admin', true, 'admin'], ['inactive', false, 'coach'], ['anon', true, 'coach']]) {
      await setDoc(doc(db, 'teams/A/members', uid), { active, role });
    }
  });
});
after(async () => { if (env) await env.cleanup(); });
const account = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: uid === 'anon' ? 'anonymous' : 'google.com' } }).firestore();
test('signed-out, unapproved, inactive, and anonymous access is denied', async () => {
  for (const db of [env.unauthenticatedContext().firestore(), account('outsider'), account('inactive'), account('anon')]) {
    await assertFails(getDoc(doc(db, 'teams/A')));
    await assertFails(getDocs(collection(db, 'teams/A/players')));
    await assertFails(setDoc(doc(db, 'teams/A/players/attack'), { name: 'Attack' }));
  }
});
test('approved coach can access own team but not another team', async () => {
  const db = account('coach');
  await assertSucceeds(getDoc(doc(db, 'teams/A')));
  await assertSucceeds(getDocs(collection(db, 'teams/A/players')));
  await assertSucceeds(setDoc(doc(db, 'teams/A/players/test'), { name: 'Synthetic' }));
  await assertSucceeds(deleteDoc(doc(db, 'teams/A/players/test')));
  await assertFails(getDoc(doc(db, 'teams/B')));
  await assertFails(getDocs(collection(db, 'teams/B/players')));
  await assertFails(setDoc(doc(db, 'teams/B/players/test'), { name: 'Synthetic' }));
});
test('membership is self-readable only and never browser-writable', async () => {
  const db = account('coach');
  await assertSucceeds(getDoc(doc(db, 'teams/A/members/coach')));
  await assertFails(getDoc(doc(db, 'teams/A/members/admin')));
  await assertFails(getDocs(collection(db, 'teams/A/members')));
  for (const actor of ['coach', 'admin', 'outsider']) {
    const actorDb = account(actor);
    await assertFails(setDoc(doc(actorDb, 'teams/A/members', actor), { active: true, role: 'admin' }));
    await assertFails(deleteDoc(doc(actorDb, 'teams/A/members/coach')));
  }
});
test('coach cannot grant access via profiles or modify team settings', async () => {
  const db = account('coach');
  await assertFails(setDoc(doc(db, 'teams/A/coaches/self'), { isAdmin: true }));
  await assertFails(updateDoc(doc(db, 'teams/A'), { teamName: 'Changed' }));
  await assertFails(setDoc(doc(db, 'teams/NEW'), { teamName: 'New' }));
  await assertFails(getDocs(collection(db, 'teams')));
  await assertFails(setDoc(doc(db, 'unmatched/path'), { value: true }));
});
test('administrator can manage settings and profiles, but profiles do not grant access', async () => {
  const db = account('admin');
  await assertSucceeds(updateDoc(doc(db, 'teams/A'), { teamName: 'Synthetic updated' }));
  await assertSucceeds(setDoc(doc(db, 'teams/A/coaches/outsider'), { isAdmin: true }));
  await assertFails(getDoc(doc(account('outsider'), 'teams/A')));
});
test('revoking membership denies subsequent reads and writes', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'teams/A/members/revoked'), { active: true, role: 'coach' }));
  const db = account('revoked');
  await assertSucceeds(getDoc(doc(db, 'teams/A/players/synthetic')));
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'teams/A/members/revoked'), { active: false }));
  await assertFails(getDoc(doc(db, 'teams/A/players/synthetic')));
  await assertFails(setDoc(doc(db, 'teams/A/players/no'), { name: 'Denied' }));
});

function scoringBatch(db, game, eventId, before, operation, options = {}) {
  const scoreboard = transition(before, operation);
  const batch = writeBatch(db);
  const actorUid = options.actorUid || 'coach';
  batch.set(doc(db, `teams/A/scoreboards/${game}`), { scoreboard, seasonId: options.seasonId || 'synthetic-season', lastEventId: eventId, updatedBy: actorUid, updatedAt: serverTimestamp() });
  batch.set(doc(db, `teams/A/scoreboards/${game}/events/${eventId}`), { scoreboard, previousRevision: before.revision, operation, actorUid, timestamp: serverTimestamp() });
  return batch;
}
test('scoring state and immutable event must be written together', async () => {
  const db = account('coach');
  const state = transition(initial(), { kind: 'run', reason: '' });
  await assertFails(setDoc(doc(db, 'teams/A/scoreboards/scored'), { scoreboard: state, seasonId: 'synthetic-season', lastEventId: 'missing', updatedBy: 'coach', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'teams/A/scoreboards/scored/events/orphan'), { scoreboard: state, previousRevision: 0, operation: { kind: 'run', reason: '' }, actorUid: 'coach', timestamp: serverTimestamp() }));
  await assertSucceeds(scoringBatch(db, 'scored', 'first', initial(), { kind: 'run', reason: '' }).commit());
  await assertFails(updateDoc(doc(db, 'teams/A/scoreboards/scored/events/first'), { actorUid: 'admin' }));
  await assertFails(deleteDoc(doc(db, 'teams/A/scoreboards/scored/events/first')));
  await assertFails(deleteDoc(doc(db, 'teams/A/scoreboards/scored')));
});
test('scoring denies another team, forged actor, stale revisions and standalone events', async () => {
  const db = account('coach');
  await assertFails(getDoc(doc(db, 'teams/B/scoreboards/scored')));
  await assertFails(getDocs(collection(db, 'teams/B/scoreboards/scored/events')));
  await assertFails(scoringBatch(db, 'scored', 'stale', initial(), { kind: 'run', reason: '' }).commit());
  const before = (await getDoc(doc(db, 'teams/A/scoreboards/scored'))).data().scoreboard;
  await assertFails(scoringBatch(db, 'scored', 'forged', before, { kind: 'out', reason: '' }, { actorUid: 'admin' }).commit());
  await assertFails(scoringBatch(db, 'scored', 'wrong-season', before, { kind: 'out', reason: '' }, { seasonId: 'other' }).commit());
  await assertFails(scoringBatch(db, 'nonexistent', 'no-game', initial(), { kind: 'out', reason: '' }).commit());
});
test('coach reviews a revision and reasoned correction invalidates review', async () => {
  const db = account('coach');
  const before = (await getDoc(doc(db, 'teams/A/scoreboards/scored'))).data().scoreboard;
  await assertSucceeds(scoringBatch(db, 'scored', 'review', before, { kind: 'review', reason: '' }).commit());
  const reviewed = (await getDoc(doc(db, 'teams/A/scoreboards/scored'))).data().scoreboard;
  const scoreboard = { inning: 1, half: 'bottom', outs: 1, homeScore: 2, awayScore: 1 };
  await assertSucceeds(scoringBatch(db, 'scored', 'correction', reviewed, { kind: 'correction', reason: 'Verified paper book', scoreboard }).commit());
  const corrected = (await getDoc(doc(db, 'teams/A/scoreboards/scored'))).data().scoreboard;
  require('node:assert/strict').equal(corrected.reviewedRevision, null);
});
test('rules reject fabricated score jumps, missing reasons and unapproved scoring', async () => {
  const db = account('coach');
  const before = (await getDoc(doc(db, 'teams/A/scoreboards/scored'))).data().scoreboard;
  const state = { ...before, revision: before.revision + 1, homeScore: 999, reviewedRevision: null };
  for (const operation of [{ kind: 'run', reason: '' }, { kind: 'correction', reason: '', scoreboard: state }]) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'teams/A/scoreboards/scored'), { scoreboard: state, seasonId: 'synthetic-season', lastEventId: 'jump', updatedBy: 'coach', updatedAt: serverTimestamp() });
    batch.set(doc(db, 'teams/A/scoreboards/scored/events/jump'), { scoreboard: state, previousRevision: before.revision, operation, actorUid: 'coach', timestamp: serverTimestamp() });
    await assertFails(batch.commit());
  }
  await assertFails(scoringBatch(account('outsider'), 'scored', 'outsider', before, { kind: 'out', reason: '' }, { actorUid: 'outsider' }).commit());
});
