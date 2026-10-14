const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initial, transition } = require('../scorekeeping');
const { coordinates, participation } = require('../team-settings');

test('baseball and softball share explicit half-inning scoring without a league default', () => {
  let state = transition(initial(), { kind: 'run' });
  assert.equal(state.awayScore, 1);
  for (let i = 0; i < 3; i++) state = transition(state, { kind: 'out' });
  assert.throws(() => transition(state, { kind: 'out' }));
  assert.throws(() => transition(state, { kind: 'run' }));
  state = transition(state, { kind: 'next-half' });
  assert.deepEqual([state.inning, state.half, state.outs], [1, 'bottom', 0]);
  state = transition(state, { kind: 'run' });
  assert.equal(state.homeScore, 1);
  state = transition(state, { kind: 'next-half', reason: 'Team-selected run limit' });
  assert.deepEqual([state.inning, state.half], [2, 'top']);
});
test('corrections require reasons and new activity invalidates a coach review', () => {
  const recorded = transition(initial(), { kind: 'run' });
  const reviewed = transition(recorded, { kind: 'review' });
  assert.equal(reviewed.reviewedRevision, reviewed.revision);
  assert.equal(transition(reviewed, { kind: 'out' }).reviewedRevision, null);
  const scoreboard = { inning: 2, half: 'bottom', outs: 1, homeScore: 2, awayScore: 3 };
  assert.throws(() => transition(reviewed, { kind: 'correction', scoreboard }));
  const corrected = transition(reviewed, { kind: 'correction', scoreboard, reason: 'Checked paper book' });
  assert.equal(corrected.awayScore, 3);
  assert.equal(corrected.reviewedRevision, null);
  assert.equal(reviewed.awayScore, 1);
});
test('invalid states and premature half changes are rejected', () => {
  assert.throws(() => transition(initial(), { kind: 'next-half' }));
  assert.throws(() => transition(initial(), { kind: 'review' }));
  for (const changes of [{ outs: 4 }, { homeScore: -1 }, { inning: 0 }, { half: 'side' }, { awayScore: 1.5 }]) {
    assert.throws(() => transition(initial(), { kind: 'correction', reason: 'Test', scoreboard: { ...initial(), ...changes } }));
  }
});
test('weather coordinates are optional and valid zero coordinates are retained', () => {
  assert.deepEqual(coordinates('0', '0'), { lat: 0, lon: 0 });
  for (const args of [['', '0'], ['91', '0'], ['0', '-181'], ['bad', '0'], [null, 0]]) assert.equal(coordinates(...args), null);
});
test('participation carry-forward is an explicit team choice', () => {
  assert.equal(participation({}), false);
  assert.equal(participation({ participationTracking: 'true' }), false);
  assert.equal(participation({ participationTracking: true }), true);
});
