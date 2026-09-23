const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-fallball', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const team of ['A', 'B']) {
      await setDoc(doc(db, 'teams', team), { teamName: 'Synthetic ' + team });
      await setDoc(doc(db, 'teams', team, 'players', 'synthetic'), { name: 'Test player' });
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
