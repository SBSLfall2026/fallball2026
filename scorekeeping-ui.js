let scoringGameId = '', scoringState = null, scoringEvents = [], scoringUnsubs = [], scoringGeneration = 0;
let scoringReady = false, scoringBusy = false, scoringError = '', scoringPending = null;

function resetScorekeeping() {
  scoringGeneration++;
  scoringUnsubs.forEach(stop => stop()); scoringUnsubs = [];
  scoringState = null; scoringEvents = []; scoringGameId = '';
  scoringReady = false; scoringBusy = false; scoringError = ''; scoringPending = null;
}
function watchScorekeeping(gameId) {
  resetScorekeeping(); scoringGameId = gameId;
  if (!gameId || !_appInitialized) return;
  const generation = scoringGeneration;
  const ref = db.collection('teams').doc(teamCode).collection('scoreboards').doc(gameId);
  const fail = error => {
    if (generation !== scoringGeneration) return;
    scoringReady = false;
    if (error.code === 'permission-denied') { handlePrivateListenerError(error); return; }
    scoringError = 'Scoring could not load. Check your connection and the scoring access setup.';
    drawScorekeeping();
  };
  scoringUnsubs.push(ref.onSnapshot({ includeMetadataChanges: true }, snapshot => {
    if (generation !== scoringGeneration) return;
    scoringReady = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
    scoringState = snapshot.exists ? snapshot.data().scoreboard : Scorekeeping.initial();
    drawScorekeeping();
  }, fail));
  scoringUnsubs.push(ref.collection('events').orderBy('scoreboard.revision', 'desc').limit(100).onSnapshot(snapshot => {
    if (generation !== scoringGeneration) return;
    scoringEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    drawScorekeeping();
  }, fail));
}
function renderScorekeepingTab() {
  if (!scoringGameId && cache.games.length) watchScorekeeping([...cache.games].sort((a,b)=>b.date.localeCompare(a.date))[0].id);
  drawScorekeeping();
}
function drawScorekeeping() {
  const el = document.getElementById('scorekeeping-content'); if (!el) return;
  const game = cache.games.find(g => g.id === scoringGameId);
  const state = scoringState || Scorekeeping.initial();
  const home = game?.homeAway === 'home' ? getSettings().teamName || 'Our team' : game?.opponent || 'Home';
  const away = game?.homeAway === 'away' ? getSettings().teamName || 'Our team' : game?.opponent || 'Away';
  const disabled = !game || !scoringReady || scoringBusy || !['home','away'].includes(game.homeAway);
  el.innerHTML = `
    <div class="form-group"><label>Game</label><select id="score-game"><option value="">Choose game</option>${[...cache.games].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>`<option value="${esc(g.id)}" ${g.id===scoringGameId?'selected':''}>${esc(gameLabel(g))} · ${esc(g.seasonId || 'Season unassigned')}</option>`).join('')}</select></div>
    ${!game ? '<p>Add a game in Schedule to begin.</p>' : `
    <div class="card" style="padding:18px">
      <div style="display:flex;justify-content:space-around;text-align:center;gap:12px"><div>${esc(away)} (away)<div style="font-size:3rem;font-weight:700">${state.awayScore}</div></div><div>${esc(home)} (home)<div style="font-size:3rem;font-weight:700">${state.homeScore}</div></div></div>
      <p style="text-align:center;font-size:1.2rem">${state.half === 'top'?'Top':'Bottom'} ${state.inning} · ${state.outs} out${state.outs===1?'':'s'}</p>
      <p role="status">${scoringBusy?'Saving…':scoringReady?'Saved score · revision '+state.revision:'Waiting for online confirmation. Scoring is unavailable offline.'} · ${state.reviewedRevision===state.revision && state.revision?'Coach reviewed':'Needs coach review'}</p>
      ${!['home','away'].includes(game.homeAway)?'<p>Set Home / Away for this game in Schedule before scoring.</p>':''}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-score="run" ${disabled||state.outs===3?'disabled':''}>+ Run for ${state.half==='top'?'away':'home'}</button><button class="btn btn-primary" data-score="out" ${disabled||state.outs===3?'disabled':''}>+ Out</button><button class="btn btn-secondary" data-score="next-half" ${disabled?'disabled':''}>Next half inning</button><button class="btn btn-secondary" id="score-correct" ${disabled?'disabled':''}>Correct score</button><button class="btn btn-secondary" data-score="review" ${disabled||!state.revision?'disabled':''}>Coach review</button></div>
      ${scoringError?`<p role="alert">${esc(scoringError)}</p>`:''}
      ${scoringPending&&!scoringBusy?`<button class="btn btn-secondary" id="score-retry" ${disabled?'disabled':''}>Retry unsaved operation</button><button class="btn btn-secondary" id="score-discard" ${scoringBusy?'disabled':''}>Discard unsaved operation</button>`:''}
      <p style="font-size:.8rem;color:var(--muted)">Record runs and outs manually. Player stats and base runners are tracked separately. Half innings change only when you choose, allowing team-specific time or run limits.</p>
    </div>
    <h3>Scoring audit</h3><p>Newest 100 events shown. Corrections retain earlier entries.</p>
    <ol style="padding-left:22px">${scoringEvents.map(event=>`<li style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${esc(event.operation.kind)}</strong> · revision ${event.scoreboard.revision} · ${esc(event.actorUid)}${event.operation.reason?' · '+esc(event.operation.reason):''} · ${event.timestamp?.toDate?esc(event.timestamp.toDate().toLocaleString()):'Awaiting server timestamp'}<br>${event.scoreboard.awayScore}–${event.scoreboard.homeScore} · ${esc(event.scoreboard.half)} ${event.scoreboard.inning} · ${event.scoreboard.outs} outs</li>`).join('')}</ol>`}
  `;
  el.querySelector('#score-game').addEventListener('change', e => { watchScorekeeping(e.target.value); drawScorekeeping(); });
  el.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.score;
    let reason = '';
    if (kind === 'next-half' && state.outs !== 3) { reason = prompt('Why is this half inning ending before three outs?') || ''; if (!reason.trim()) return; }
    if (kind === 'review' && !confirm('Confirm you checked this scoreboard against the game record?')) return;
    saveScoring({ kind, reason });
  }));
  el.querySelector('#score-correct')?.addEventListener('click', () => openScoreCorrection(state));
  el.querySelector('#score-retry')?.addEventListener('click', () => saveScoring(scoringPending.operation, true));
  el.querySelector('#score-discard')?.addEventListener('click', () => { scoringPending = null; scoringError = ''; drawScorekeeping(); });
}
async function saveScoring(operation, retry = false) {
  if (scoringBusy || !scoringReady || !_appInitialized || !auth.currentUser) return;
  if (scoringPending && !retry) { toast('Retry or discard the unsaved operation first'); return; }
  const generation = scoringGeneration, team = teamCode, gameId = scoringGameId, actorUid = auth.currentUser.uid;
  const pending = retry ? scoringPending : { operation, operationId: crypto.randomUUID(), expectedRevision: (scoringState || Scorekeeping.initial()).revision };
  scoringPending = pending; scoringBusy = true; scoringError = ''; drawScorekeeping();
  try {
    await ScorekeepingStorage.append({ db, team, gameId, actorUid, ...pending, serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
      stillAuthorized: () => generation === scoringGeneration && _appInitialized && teamCode === team && auth.currentUser?.uid === actorUid });
    if (generation !== scoringGeneration) return;
    scoringPending = null;
  } catch (error) {
    if (generation !== scoringGeneration) return;
    scoringError = error.code === 'unavailable' ? 'Not saved. Reconnect, then retry this operation.' : error.message || 'Scoring could not save';
    if (error.code === 'permission-denied') { handlePrivateListenerError(error); return; }
  } finally { if (generation === scoringGeneration) { scoringBusy = false; drawScorekeeping(); } }
}
function openScoreCorrection(state) {
  openModal('Correct scoreboard', `
    <div class="form-group"><label>Inning</label><input id="sc-inning" type="number" min="1" max="99" value="${state.inning}"></div>
    <div class="form-group"><label>Half</label><select id="sc-half"><option value="top" ${state.half==='top'?'selected':''}>Top</option><option value="bottom" ${state.half==='bottom'?'selected':''}>Bottom</option></select></div>
    ${['outs','homeScore','awayScore'].map(key=>`<div class="form-group"><label>${key==='outs'?'Outs':key==='homeScore'?'Home runs':'Away runs'}</label><input id="sc-${key}" type="number" min="0" max="${key==='outs'?3:999}" value="${state[key]}"></div>`).join('')}
    <div class="form-group"><label>Reason (required)</label><textarea id="sc-reason" maxlength="500"></textarea></div>`,
    '<button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-submit">Record correction</button>', () => {
      const operation = { kind: 'correction', reason: document.getElementById('sc-reason').value.trim(), scoreboard: { half: document.getElementById('sc-half').value } };
      for (const key of ['inning','outs','homeScore','awayScore']) operation.scoreboard[key] = Number(document.getElementById('sc-'+key).value);
      try { Scorekeeping.transition(state, operation); } catch(error) { toast(error.message); return; }
      closeModal(); saveScoring(operation);
    });
}
