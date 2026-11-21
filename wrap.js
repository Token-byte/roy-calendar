'use strict';
/* Wrapped: week / month / year stats from the events already on the phone. */
let wrapSpan = 'year';

function evStartKey(ev){
  if (!ev || ev.deleted || !visibleCal(ev.calId)) return null;
  if (ev.allDay) return /^\d{4}-\d\d-\d\d$/.test(ev.start) ? ev.start : null;
  const d = new Date(ev.start);
  return isNaN(d.getTime()) ? null : keyOf(d);
}
function hoursOf(ev){
  if (ev.allDay) return 0;
  const h = (evEndMs(ev) - evStartMs(ev)) / 3600000;
  if (!isFinite(h) || h <= 0) return 1;
  return Math.min(12, h);
}
function rangeFor(span){
  const today = todayKey();
  if (span === 'week'){
    const d = parseKey(today);
    const start = addDays(today, -d.getDay());
    return { from: start, to: addDays(start, 7), label: 'השבוע שלך על הלוח', eye: 'WRAPPED' };
  }
  if (span === 'month'){
    const from = firstOfMonth(today);
    return { from, to: addMonths(from, 1), label: 'החודש שלך על הלוח', eye: 'WRAPPED' };
  }
  const y = typeof displayedYear === 'function' ? displayedYear() : parseKey(today).getFullYear();
  return { from: y + '-01-01', to: (y + 1) + '-01-01', label: 'השנה שלך על הלוח', eye: 'WRAPPED ' + y };
}
function collectWrap(span){
  const range = rangeFor(span);
  const events = Object.values(S.events).filter(ev => {
    const k = evStartKey(ev);
    return k && k >= range.from && k < range.to;
  });
  const byCat = new Map();
  const days = new Set();
  const weekday = [0,0,0,0,0,0,0];
  let sport = 0, climb = 0, run = 0, workHours = 0;
  for (const ev of events){
    const cat = catOfEvent(ev);
    const id = cat ? cat.id : 'other';
    const name = cat ? cat.name : 'אחר';
    const rec = byCat.get(id) || { id, name, n: 0, hours: 0 };
    rec.n++;
    rec.hours += hoursOf(ev);
    byCat.set(id, rec);
    const k = evStartKey(ev);
    days.add(k);
    weekday[parseKey(k).getDay()]++;
    if (id === 'sport'){
      sport++;
      if (/טיפוס|climb/i.test(ev.title || '')) climb++;
      if (/ריצ|run/i.test(ev.title || '')) run++;
    }
    if (id === 'work') workHours += hoursOf(ev);
  }
  let streak = 0, cur = 0;
  for (let k = range.from; k < range.to; k = addDays(k, 1)){
    if (days.has(k)){ cur++; if (cur > streak) streak = cur; }
    else cur = 0;
  }
  let busiest = 0;
  weekday.forEach((n, i) => { if (n > weekday[busiest]) busiest = i; });
  const cats = [...byCat.values()].sort((a, b) => b.n - a.n);
  const total = events.length;
  const top = cats[0];
  return {
    range, total, sport, climb, run, workHours: Math.round(workHours),
    streak, busiest: total ? HE_DAYS[busiest] : '',
    busiestN: total ? weekday[busiest] : 0,
    avg: total && days.size ? Math.max(1, Math.round(total / days.size)) : 0,
    cats, top, topPct: total && top ? Math.round(top.n / total * 100) : 0,
  };
}
function renderWrap(){
  const host = $('wrapView');
  if (!host) return;
  const s = collectWrap(wrapSpan);
  const tog = ['week','month','year'].map(id => {
    const label = { week:'שבוע', month:'חודש', year:'שנה' }[id];
    return `<button type="button" data-span="${id}" class="${wrapSpan === id ? 'on' : ''}">${label}</button>`;
  }).join('');
  let body;
  if (!s.total){
    body = `<div class="w-empty">אין פתקים ב${wrapSpan === 'week' ? 'שבוע' : wrapSpan === 'month' ? 'חודש' : 'שנה'} הזו. אירוע חדש נכנס לסיכום מיד.</div>`;
  } else {
    const subs = [s.climb ? s.climb + ' טיפוס' : '', s.run ? s.run + ' ריצה' : ''].filter(Boolean).join(' · ');
    const bar = s.cats.slice(0, 3).map(c => {
      const color = c.id === 'sport' ? 'var(--n-sport)' : c.id === 'work' ? 'var(--n-work)' : 'var(--n-other)';
      return `<i style="width:${Math.max(4, Math.round(c.n / s.total * 100))}%;background:${color}"></i>`;
    }).join('');
    const topLabel = s.top ? esc(s.top.name) + ' ' + s.topPct + '%' : '';
    const line = s.sport
      ? `היו ${s.sport} אימונים. <mark>${topLabel}</mark>`
      : `הודבקו ${s.total} פתקים. <mark>${topLabel}</mark>`;
    body = `
      <div class="w-hero"><div class="w-big">${s.total}</div><div class="w-lbl">פתקים הודבקו על הלוח</div></div>
      <div class="w-grid">
        <div class="w-note"><i class="tape"></i><div class="w-num">${s.workHours}</div><div class="w-t">שעות של עבודה ופגישות</div></div>
        <div class="w-note"><i class="tape"></i><div class="w-num">${s.sport}</div><div class="w-t">אימונים</div><div class="w-s">${subs || 'ספורט'}</div></div>
        <div class="w-note"><i class="tape"></i><div class="w-num">${s.streak}</div><div class="w-t">ימים ברצף עם פתק</div><div class="w-s">הרצף הכי ארוך</div></div>
        <div class="w-note"><i class="tape"></i><div class="w-num he">${s.busiest}</div><div class="w-t">היום הכי עמוס</div><div class="w-s">${s.busiestN} פתקים</div></div>
      </div>
      <div class="w-cat"><div class="row1"><span>קטגוריה מובילה</span><b>${s.top ? esc(s.top.name) : ''} ${s.topPct}%</b></div><div class="w-bar">${bar}</div></div>
      <div class="w-quote">${line}</div>`;
  }
  host.innerHTML = `
    <div class="w-top"><button type="button" class="w-back" id="wBack">הלוח</button><div class="w-tog">${tog}</div></div>
    <div class="w-eye">${esc(s.range.eye)}</div>
    <h1 class="w-h">${esc(s.range.label)}</h1>
    ${body}
    <div class="w-foot"><span></span><button type="button" class="w-share" id="wShare">שתף</button></div>`;
  host.querySelectorAll('[data-span]').forEach(b => b.onclick = () => { wrapSpan = b.dataset.span; renderWrap(); });
  $('wBack').onclick = () => setView('year');
  $('wShare').onclick = async () => {
    const text = s.total
      ? `${s.range.label}: ${s.total} פתקים, ${s.sport} אימונים, רצף של ${s.streak} ימים.`
      : s.range.label + ': אין פתקים.';
    try {
      if (navigator.share) await navigator.share({ title: 'הסיכום', text });
      else { await navigator.clipboard.writeText(text); toast('הועתק'); }
    } catch(e){ if (e && e.name !== 'AbortError') toast(text); }
  };
}
function initWrap(){
  const b = $('yWrapBtn');
  if (b) b.onclick = () => setView('wrap');
}
