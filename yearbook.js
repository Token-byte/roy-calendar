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
  return { SUGGESTED_BOOKS, empty, normalize, parse, merge, hasContent };
});
