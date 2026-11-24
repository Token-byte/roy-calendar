'use strict';
/* Manual year notes. A copy lives on the phone and inside one hidden Google event. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Yearbook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SUGGESTED_BOOKS = [
    { title: '$100M Offers', author: 'Alex Hormozi', audio: false, favorite: false },
    { title: "Can't Hurt Me", author: 'David Goggins', audio: false, favorite: false },
    { title: 'Atomic Habits', author: 'James Clear', audio: false, favorite: false },
    { title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', audio: false, favorite: false }
  ];
  function empty(){
    return { updatedAt: 0, places: [], hiddenNames: [], books: [], movies: [], shows: [], word: '', goal: '' };
  }
  function arr(v){ return Array.isArray(v) ? v : []; }
  function normalize(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      updatedAt: Number(src.updatedAt) || 0,
      places: arr(src.places).filter(p => p && (p.city || p.name || p.country)),
      hiddenNames: arr(src.hiddenNames).map(s => String(s || '').trim()).filter(Boolean),
      books: arr(src.books).filter(b => b && b.title),
      movies: arr(src.movies).filter(m => m && m.title),
      shows: arr(src.shows).filter(s => s && s.name),
      word: String(src.word || '').trim(),
      goal: String(src.goal || '').trim()
    };
  }
  function parse(text){
    if (!text) return null;
    try { return normalize(JSON.parse(text)); }
    catch (e) { return null; }
  }
  function merge(local, remote){
    const a = local ? normalize(local) : empty();
    const b = remote ? normalize(remote) : null;
    if (!b || !b.updatedAt) return a;
    if (!a.updatedAt || b.updatedAt > a.updatedAt) return b;
    return a;
  }
  function hasContent(y){
    y = normalize(y);
    return !!(y.places.length || y.hiddenNames.length || y.books.length || y.movies.length || y.shows.length || y.word || y.goal);
  }
  function eventStartKey(ev){
    let start = ev && ev.start;
    if (start && typeof start === 'object') start = start.date || start.dateTime || '';
    return String(start || '').slice(0, 10);
  }
  function isProtected(ev){
    if (!ev || typeof ev !== 'object') return false;
    if (ev.royKind === 'yearbook') return true;
    const title = String(ev.title || ev.summary || '').trim();
    return title === 'יומן שנה' && eventStartKey(ev) === '2000-01-01';
  }
  function eventIdFromPath(path){
    const m = String(path || '').match(/\/events\/([^/?#]+)/);
    if (!m) return '';
    try { return decodeURIComponent(m[1]); }
    catch (e) { return m[1]; }
  }
  function blocksDelete(method, path, ctx){
    if (String(method || '').toUpperCase() !== 'DELETE') return false;
    ctx = ctx || {};
    const id = eventIdFromPath(path);
    if (ctx.knownId && id && String(ctx.knownId) === id) return true;
    if (isProtected(ctx.event)) return true;
    if (id && ctx.events && isProtected(ctx.events[id])) return true;
    return false;
  }
  function privateProps(ev, royCat){
    const priv = { royCat: royCat == null ? '' : String(royCat) };
    if (ev && ev.royLocalId) priv.royLocalId = String(ev.royLocalId);
    if (ev && ev.royKind) priv.royKind = String(ev.royKind);
    if (isProtected(ev)) priv.royKind = 'yearbook';
    return priv;
  }
  return {
    SUGGESTED_BOOKS, empty, normalize, parse, merge, hasContent,
    isProtected, blocksDelete, privateProps, eventIdFromPath
  };
});
