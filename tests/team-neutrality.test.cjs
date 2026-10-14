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
test('a correction stays tied to the revision the coach opened, even after another scorer updates it', () => {
  let submit, saved;
  const original = { ...require('../scorekeeping').initial(), revision: 4 };
  const controls = { 'sc-half': 'top', 'sc-inning': '1', 'sc-outs': '0', 'sc-homeScore': '2', 'sc-awayScore': '1', 'sc-reason': 'Checked paper book' };
  const context = vm.createContext({
    Scorekeeping: require('../scorekeeping'),
    document: { getElementById: id => ({ value: controls[id] }) },
    openModal: (title, body, footer, callback) => { submit = callback; },
    closeModal() {}, toast: message => { throw Error(message); },
    saveScoring: (operation, retry, revision) => { saved = { operation, retry, revision }; },
  });
  const source = fs.readFileSync('scorekeeping-ui.js', 'utf8');
  vm.runInContext(source.slice(source.indexOf('function openScoreCorrection(')), context);
  context.openScoreCorrection(original);
  context.scoringState = { ...original, revision: 5, homeScore: 3 };
  submit();
  assert.equal(saved.revision, 4);
  assert.equal(saved.operation.kind, 'correction');
});
