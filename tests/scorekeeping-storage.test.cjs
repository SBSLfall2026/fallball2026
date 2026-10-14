const { test } = require('node:test');
const assert = require('node:assert/strict');
const { append } = require('../scorekeeping-storage');
function harness() {
  const records = new Map([['teams/A/games/g', { seasonId: 'synthetic-season' }]]);
  let writes = 0;
  const ref = path => ({ path, collection: name => ref(path + '/' + name), doc: id => ref(path + '/' + id) });
  const db = { collection: name => ref(name), runTransaction: async fn => {
    const staged = [];
    const result = await fn({ get: async r => ({ exists: records.has(r.path), data: () => records.get(r.path) }), set: (r,data) => staged.push([r.path,data]) });
    for (const [key,data] of staged) { records.set(key,data); writes++; }
    return result;
  } };
  const options = { db, team: 'A', gameId: 'g', actorUid: 'synthetic-coach', operationId: 'op1', expectedRevision: 0, operation: { kind: 'run', reason: '' }, serverTimestamp: () => 'server-time', stillAuthorized: () => true };
  return { records, options, writes: () => writes };
}
test('retrying the same operation does not count a run twice', async () => {
  const h = harness();
  assert.equal((await append(h.options)).awayScore, 1);
  h.records.get('teams/A/scoreboards/g/events/op1').operation = { reason: '', kind: 'run' };
  assert.equal((await append(h.options)).awayScore, 1);
  assert.equal(h.writes(), 2);
  assert.equal(h.records.get('teams/A/scoreboards/g').seasonId, 'synthetic-season');
});
test('another operation with an old revision cannot overwrite concurrent scoring', async () => {
  const h = harness(); await append(h.options);
  await assert.rejects(append({ ...h.options, operationId: 'op2' }), /Another scorer/);
  assert.equal(h.writes(), 2);
  await assert.rejects(append({ ...h.options, operation: { kind: 'out', reason: '' } }), /already used/);
});
test('game removal, team switching and revocation cancel writes', async () => {
  const h = harness();
  await assert.rejects(append({ ...h.options, stillAuthorized: () => false }), /access changed/);
  let checks = 0;
  await assert.rejects(append({ ...h.options, stillAuthorized: () => ++checks === 1 }), /access changed/);
  h.records.delete('teams/A/games/g');
  await assert.rejects(append(h.options), /no longer exists/);
  assert.equal(h.writes(), 0);
});
