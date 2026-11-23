'use strict';
/* Pure pieces of the year summary: people, interviews, months, sport weeks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WrapExtra = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP = new Set(['בערב', 'הערב', 'מחר', 'היום', 'בבוקר', 'בצהריים', 'בלילה', 'שם', 'זה', 'זאת', 'על', 'את', 'שלי', 'שלו', 'שלה', 'tomorrow', 'today', 'tonight', 'the', 'a', 'an', 'at', 'for', 'on', 'in', 'to', 'and', 'my']);
  const WORKOUTS = [
    ['בולדרינג', /בולדרינג|boulder/i],
    ['טיפוס', /טיפוס|climb/i],
    ['ריצה', /ריצ|\brun\b|\brunning\b/i],
    ['שחייה', /שחי|swim/i],
    ['חדר כושר', /חדר כושר|\bgym\b/i],
    ['אימון', /אימון|workout|training/i]
  ];

  function cleanName(s){
    return String(s || '').replace(/[״׳"'`]/g, '').replace(/\s+/g, ' ').trim();
  }
  function takeName(rest){
    const parts = String(rest || '').trim().split(/\s+/);
    const out = [];
    for (const raw of parts){
      const w = raw.replace(/[.,!?:;]+$/g, '').replace(/^[.,!?:;]+/g, '');
      if (!w) continue;
      if (STOP.has(w) || STOP.has(w.toLowerCase())) break;
      if (/^(ביום|בשעה|ב-|ל-)/.test(w)) break;
      out.push(w);
      if (out.length === 2) break;
    }
    const name = cleanName(out.join(' '));
    if (name.length < 2) return '';
    return name;
  }
  function peopleInTitle(title){
    const text = String(title || '');
    const found = [];
    const patterns = [
      /פגישה עם\s+(.+)/,
      /שיחה עם\s+(.+)/,
      /שיחת היכרות עם\s+(.+)/,
      /אצל\s+(.+)/,
      /עם\s+(.+)/,
      /\bwith\s+(.+)/i
    ];
    for (const re of patterns){
      const m = text.match(re);
      if (!m) continue;
      const name = takeName(m[1]);
      if (name) found.push(name);
    }
    return found;
  }
  function topPeople(titles, hidden){
    const skip = new Set((hidden || []).map(n => cleanName(n).toLowerCase()));
    const counts = new Map();
    for (const title of titles){
      const seen = new Set();
      for (const name of peopleInTitle(title)){
        const key = cleanName(name).toLowerCase();
        if (!key || skip.has(key) || seen.has(key)) continue;
        seen.add(key);
        const rec = counts.get(key) || { name: name, n: 0 };
        rec.n++;
        counts.set(key, rec);
      }
    }
    return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'he')).slice(0, 5);
  }
  function isInterview(title){
    return /ראיון|interview|שיחת היכרות/i.test(String(title || ''));
  }
  function workoutType(title){
    const text = String(title || '');
    for (const [name, re] of WORKOUTS) if (re.test(text)) return name;
    return '';
  }
  function pad(n){ return String(n).padStart(2, '0'); }
  function keyOf(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function weekStart(dateKey){
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - dt.getDay());
    return keyOf(dt);
  }
  function daysBetween(a, b){
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
  }
  function weekStreak(dateKeys){
    const weeks = [...new Set(dateKeys.filter(Boolean).map(weekStart))].sort();
    let best = 0, cur = 0, prev = '';
    for (const w of weeks){
      cur = prev && daysBetween(prev, w) === 7 ? cur + 1 : 1;
      if (cur > best) best = cur;
      prev = w;
    }
    return best;
  }
  function topWorkout(titles){
    const counts = new Map();
    for (const title of titles){
      const kind = workoutType(title);
      if (!kind) continue;
      counts.set(kind, (counts.get(kind) || 0) + 1);
    }
    let best = '', n = 0;
    for (const [name, c] of counts) if (c > n){ best = name; n = c; }
    return best ? { name: best, n: n } : null;
  }
  function monthStats(eventKeys, months){
    const counts = new Map(months.map(m => [m, 0]));
    for (const k of eventKeys){
      const m = String(k || '').slice(0, 7);
      if (counts.has(m)) counts.set(m, counts.get(m) + 1);
    }
    const rows = [...counts.entries()];
    if (rows.length < 2) return { busy: null, quiet: null };
    let busy = rows[0], quiet = rows[0];
    for (const row of rows){
      if (row[1] > busy[1]) busy = row;
      if (row[1] < quiet[1]) quiet = row;
    }
    return {
      busy: { key: busy[0], n: busy[1] },
      quiet: { key: quiet[0], n: quiet[1] }
    };
  }
  return { peopleInTitle, topPeople, isInterview, workoutType, weekStart, weekStreak, topWorkout, monthStats, cleanName };
});
