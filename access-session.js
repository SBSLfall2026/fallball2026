/* Shared browser/Node controller. Only server-confirmed membership opens data. */
(function (root) {
  function createAccessSession({ watchMembership, loadTeam, onAllowed, onBlocked, onReset }) {
    let generation = 0, stop = null, grantedRole = null, pendingRole = null;
    function reset() {
      generation++;
      if (stop) stop();
      stop = null; grantedRole = null; pendingRole = null;
      onReset();
    }
    function start(user, team) {
      reset();
      const current = generation;
      if (!user || user.isAnonymous) { onBlocked('signed-out'); return; }
      stop = watchMembership(team, user.uid, async snapshot => {
        if (current !== generation) return;
        // Never authorize from a stale local membership cache.
        if (snapshot.metadata.fromCache) {
          if (grantedRole) { reset(); onBlocked('unavailable'); }
          return;
        }
        const membership = snapshot.exists ? snapshot.data() : null;
        if (!membership || membership.active !== true || !['coach', 'admin'].includes(membership.role)) {
          reset(); onBlocked('permission-denied'); return;
        }
        if (grantedRole === membership.role || pendingRole === membership.role) return;
        if (grantedRole || pendingRole) { reset(); onBlocked('membership-changed'); return; }
        pendingRole = membership.role;
        try {
          const teamSnapshot = await loadTeam(team);
          if (current !== generation) return;
          if (!teamSnapshot.exists) { reset(); onBlocked('permission-denied'); return; }
          grantedRole = membership.role;
          pendingRole = null;
          onAllowed(user, membership);
        } catch (error) {
          if (current !== generation) return;
          reset(); onBlocked(error.code || 'unknown');
        }
      }, error => {
        if (current !== generation) return;
        reset(); onBlocked(error.code || 'unknown');
      });
    }
    return { start, reset };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createAccessSession };
  else root.createAccessSession = createAccessSession;
})(typeof globalThis !== 'undefined' ? globalThis : this);
