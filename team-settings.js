/* Team metadata is data, never an authorization boundary. */
(function (root) {
  function coordinates(latitude, longitude) {
    if (latitude === '' || longitude === '' || latitude == null || longitude == null) return null;
    const lat = Number(latitude), lon = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
  }
  function participation(settings) {
    return settings.participationTracking === true;
  }
  const api = { coordinates, participation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TeamSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
