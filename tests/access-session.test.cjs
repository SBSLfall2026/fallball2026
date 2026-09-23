const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createAccessSession } = require('../access-session.js');

function harness() {
  const callbacks = [], events = [];
  let resolveTeam;
  const gate = createAccessSession({
    watchMembership: (team, uid, next, error) => {
      callbacks.push({ team, uid, next, error });
      return () => events.push('unsubscribe');
    },
    loadTeam: team => { events.push('team:' + team); return new Promise(resolve => { resolveTeam = resolve; }); },
    onAllowed: (user, member) => events.push('allowed:' + user.uid + ':' + member.role),
    onReset: () => events.push('reset'),
    onBlocked: reason => events.push('blocked:' + reason),
  });
  const snapshot = (data, fromCache = false) => ({ exists: !!data, data: () => data, metadata: { fromCache } });
  return { gate, callbacks, events, snapshot, finish: () => resolveTeam({ exists: true }) };
}
const user = { uid: 'coach-a', isAnonymous: false };
const membership = { active: true, role: 'coach' };

test('signed-out and anonymous visitors never read membership or team data', () => {
  const h = harness();
  h.gate.start(null, 'A');
  h.gate.start({ uid: 'anonymous', isAnonymous: true }, 'A');
  assert.equal(h.callbacks.length, 0);
  assert.equal(h.events.filter(x => x.startsWith('team:')).length, 0);
});
test('missing, inactive, and unknown-role memberships cannot load private data', async () => {
  for (const record of [null, { active: false, role: 'coach' }, { active: true, role: 'owner' }]) {
    const h = harness();
    h.gate.start(user, 'A');
    await h.callbacks[0].next(h.snapshot(record));
    assert.ok(h.events.includes('blocked:permission-denied'));
    assert.ok(!h.events.some(x => x.startsWith('team:')));
  }
});
test('cached membership cannot authorize; server-confirmed membership can', async () => {
  const h = harness();
  h.gate.start(user, 'A');
  await h.callbacks[0].next(h.snapshot(membership, true));
  assert.ok(!h.events.some(x => x.startsWith('team:')));
  const pending = h.callbacks[0].next(h.snapshot(membership));
  assert.ok(!h.events.some(x => x.startsWith('allowed:')));
  h.finish(); await pending;
  assert.ok(h.events.includes('allowed:coach-a:coach'));
});
test('duplicate membership events do not create duplicate private listeners', async () => {
  const h = harness(); h.gate.start(user, 'A');
  const pending = h.callbacks[0].next(h.snapshot(membership));
  await h.callbacks[0].next(h.snapshot(membership));
  h.finish(); await pending;
  await h.callbacks[0].next(h.snapshot(membership));
  assert.equal(h.events.filter(x => x.startsWith('allowed:')).length, 1);
});
test('sign-out invalidates an in-flight team read', async () => {
  const h = harness(); h.gate.start(user, 'A');
  const pending = h.callbacks[0].next(h.snapshot(membership));
  h.gate.start(null, 'A'); h.finish(); await pending;
  assert.ok(!h.events.some(x => x.startsWith('allowed:')));
  assert.ok(h.events.includes('unsubscribe'));
});
test('old team callbacks cannot grant access after switching teams', async () => {
  const h = harness(); h.gate.start(user, 'A');
  h.gate.start(user, 'B');
  await h.callbacks[0].next(h.snapshot(membership));
  assert.ok(!h.events.some(x => x.startsWith('team:')));
});
test('revocation clears the session and stops membership listening', async () => {
  const h = harness(); h.gate.start(user, 'A');
  const pending = h.callbacks[0].next(h.snapshot(membership));
  h.finish(); await pending;
  await h.callbacks[0].next(h.snapshot({ active: false, role: 'coach' }));
  assert.deepEqual(h.events.slice(-3), ['unsubscribe', 'reset', 'blocked:permission-denied']);
});
test('role changes and offline membership invalidate an open session', async () => {
  for (const change of ['role', 'offline']) {
    const h = harness(); h.gate.start(user, 'A');
    const pending = h.callbacks[0].next(h.snapshot(membership));
    h.finish(); await pending;
    await h.callbacks[0].next(h.snapshot({ active: true, role: change === 'role' ? 'admin' : 'coach' }, change === 'offline'));
    assert.ok(h.events.includes('blocked:' + (change === 'role' ? 'membership-changed' : 'unavailable')));
  }
});
test('permission errors stay distinct from network errors', () => {
  for (const code of ['permission-denied', 'unavailable']) {
    const h = harness(); h.gate.start(user, 'A');
    h.callbacks[0].error({ code });
    assert.equal(h.events.at(-1), 'blocked:' + code);
  }
});
test('team selection invokes sign-in without any Firestore read', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const fn = html.slice(html.indexOf('async function selectTeam(code)'), html.indexOf('function openCreateTeamModal()'));
  let launches = 0;
  const context = vm.createContext({
    document: { getElementById: () => ({}) },
    localStorage: { setItem() {} },
    launchApp: () => launches++,
    db: new Proxy({}, { get() { throw Error('Unexpected pre-auth database access'); } }),
  });
  vm.runInContext(fn, context);
  await context.selectTeam(' team-a ');
  assert.equal(launches, 1);
  assert.equal(context.teamCode, 'TEAM-A');
  await context.selectTeam('invalid/path');
  assert.equal(launches, 1);
});
test('page script parses and Auth SDK is loaded once', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  assert.equal((html.match(/firebase-auth-compat.js/g) || []).length, 1);
  assert.ok(!html.includes('isFirstEverUser'));
});
