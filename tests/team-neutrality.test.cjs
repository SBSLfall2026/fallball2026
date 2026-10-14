const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
test('app has no built-in league identity, field seeding or fixed weather coordinates', () => {
  assert.ok(html.includes('<title>Coaching Team Manager</title>'));
  for (const term of ['seedFields(', 'seedOpponents(', 'seedResources(', 'FIELD_COORDS']) assert.ok(!html.includes(term));
  assert.ok(html.includes('TeamSettings.coordinates'));
  assert.ok(html.includes('s.leagueName'));
  assert.ok(html.includes('s.leagueLocation'));
});
test('scorekeeping uses the normal tab lifecycle and scripts parse', () => {
  assert.ok(html.includes('id="tab-scorekeeping" class="tab-section"'));
  for (const filename of ['scorekeeping.js','scorekeeping-ui.js','scorekeeping-storage.js','team-settings.js']) new vm.Script(fs.readFileSync(filename,'utf8'), { filename });
});
