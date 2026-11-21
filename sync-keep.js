'use strict';
/* An event must stay on the phone until Google has a copy.
   A refresh must not delete it just because it is not in the server list yet. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.shouldPreserveEvent = api.shouldPreserveEvent; root.isLocalOnlyEvent = api.isLocalOnlyEvent; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function shouldPreserveEvent(id, ev, pendingIds){
    if (!ev || ev.deleted) return false;
    if (ev.pending) return true;
    if (String(id).indexOf('local-') === 0) return true;
    if (!ev.calId || ev.calId === 'local') return true;
    if (pendingIds && pendingIds.has(id)) return true;
    return false;
  }
  function isLocalOnlyEvent(id, ev){
    if (!ev || ev.deleted || ev.readOnly) return false;
    if (String(id).indexOf('local-') === 0) return true;
    if (!ev.calId || ev.calId === 'local') return true;
    return false;
  }
  return { shouldPreserveEvent, isLocalOnlyEvent };
});
