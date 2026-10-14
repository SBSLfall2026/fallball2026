/* Deterministic scoreboard transitions shared by browser and tests. */
(function (root) {
  const initial = () => ({ revision: 0, inning: 1, half: 'top', outs: 0, homeScore: 0, awayScore: 0, reviewedRevision: null });
  function validate(state) {
    for (const key of ['revision', 'inning', 'outs', 'homeScore', 'awayScore']) {
      if (!Number.isSafeInteger(state[key]) || state[key] < 0) throw Error('Invalid scoreboard');
    }
    if (state.inning < 1 || state.inning > 99 || state.outs > 3 || !['top', 'bottom'].includes(state.half) || state.homeScore > 999 || state.awayScore > 999) throw Error('Invalid scoreboard');
  }
  function transition(previous, operation) {
    validate(previous);
    const next = { ...previous, revision: previous.revision + 1, reviewedRevision: null };
    switch (operation.kind) {
      case 'run':
        if (previous.outs === 3) throw Error('Advance the half inning before recording a run');
        next[previous.half === 'top' ? 'awayScore' : 'homeScore']++;
        break;
      case 'out':
        if (previous.outs === 3) throw Error('Three outs already recorded');
        next.outs++;
        break;
      case 'next-half':
        if (previous.outs !== 3 && !operation.reason?.trim()) throw Error('Give a reason to end a half inning before three outs');
        next.half = previous.half === 'top' ? 'bottom' : 'top';
        next.inning += previous.half === 'bottom' ? 1 : 0;
        next.outs = 0;
        break;
      case 'correction':
        if (!operation.reason?.trim()) throw Error('A correction needs a reason');
        for (const key of ['inning', 'half', 'outs', 'homeScore', 'awayScore']) next[key] = operation.scoreboard?.[key];
        break;
      case 'review':
        if (!previous.revision) throw Error('Record scoring before reviewing');
        next.reviewedRevision = next.revision;
        break;
      default: throw Error('Unknown scoring operation');
    }
    validate(next);
    if ((operation.reason || '').length > 500) throw Error('Keep the reason to 500 characters');
    return next;
  }
  const api = { initial, transition, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scorekeeping = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
