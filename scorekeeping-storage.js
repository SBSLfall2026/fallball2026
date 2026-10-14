/* Append an event and its materialized scoreboard in one Firestore transaction. */
(function (root) {
  const model = typeof module !== 'undefined' && module.exports ? require('./scorekeeping') : root.Scorekeeping;
  function canonical(value) {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  async function append({ db, team, gameId, actorUid, operationId, expectedRevision, operation, serverTimestamp, stillAuthorized }) {
    const gameRef = db.collection('teams').doc(team).collection('games').doc(gameId);
    const stateRef = db.collection('teams').doc(team).collection('scoreboards').doc(gameId);
    const eventRef = stateRef.collection('events').doc(operationId);
    return db.runTransaction(async transaction => {
      if (!stillAuthorized()) throw Error('Team access changed');
      const event = await transaction.get(eventRef);
      if (event.exists) {
        const previousEvent = event.data();
        if (previousEvent.actorUid !== actorUid || canonical(previousEvent.operation) !== canonical(operation)) throw Error('Scoring operation ID already used');
        return previousEvent.scoreboard;
      }
      const state = await transaction.get(stateRef);
      const game = await transaction.get(gameRef);
      if (!game.exists) throw Error('Game no longer exists');
      const previous = state.exists ? state.data().scoreboard : model.initial();
      if (previous.revision !== expectedRevision) throw Error('Another scorer changed this game. Review the latest score and try again.');
      const scoreboard = model.transition(previous, operation);
      if (!stillAuthorized()) throw Error('Team access changed');
      const timestamp = serverTimestamp();
      const seasonId = state.exists ? state.data().seasonId : (game.data().seasonId || 'unassigned');
      transaction.set(eventRef, { actorUid, previousRevision: previous.revision, operation, scoreboard, timestamp });
      transaction.set(stateRef, { scoreboard, seasonId, lastEventId: operationId, updatedBy: actorUid, updatedAt: timestamp });
      return scoreboard;
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { append };
  else root.ScorekeepingStorage = { append };
})(typeof globalThis !== 'undefined' ? globalThis : this);
