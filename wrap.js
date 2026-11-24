'use strict';
/* Wrapped: week / month / year, plus places, people, and the manual yearbook. */
let wrapSpan = 'year';
let wrapPulled = false;
let storyModel = null;

function readYearbook(){ return Yearbook.normalize(LS.get('yearbook', Yearbook.empty())); }
function writeYearbook(data){
  const y = Yearbook.normalize(data);
  y.updatedAt = Date.now();
  LS.set('yearbook', y);
  if (typeof scheduleYearbookPush === 'function') scheduleYearbookPush();
  return y;
}
function evStartKey(ev){
  if (!ev || ev.deleted || ev.royKind === 'yearbook' || !visibleCal(ev.calId)) return null;
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
function monthsFor(range){
  const out = [];
  let k = range.from.slice(0, 8) + '01';
  const today = todayKey();
  while (k < range.to && k <= today){
    out.push(k.slice(0, 7));
    k = addMonths(k, 1);
  }
  return out;
}
function hebCount(n, one, many){
  if (Number(n) === 1) return one;
  return n + ' ' + many;
}
function monthName(key){
  const n = Number(String(key).slice(5, 7));
  return HE_MONTHS[n - 1] || key;
}
function collectWrap(span){
  const range = rangeFor(span);
  const events = Object.values(S.events).filter(ev => {
    if (!ev || ev.royKind === 'yearbook' || onHolidayCalendar(ev)) return false;
    const k = evStartKey(ev);
    return k && k >= range.from && k < range.to;
  });
  const byCat = new Map();
  const days = new Set();
  const weekday = [0,0,0,0,0,0,0];
  let sport = 0, climb = 0, run = 0, workHours = 0;
  const sportDates = [], sportTitles = [], titles = [], interviews = [];
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
    titles.push(ev.title || '');
    if (id === 'sport'){
      sport++;
      sportDates.push(k);
      sportTitles.push(ev.title || '');
      if (/טיפוס|climb/i.test(ev.title || '')) climb++;
      if (/ריצ|run/i.test(ev.title || '')) run++;
    }
    if (id === 'work') workHours += hoursOf(ev);
    if (WrapExtra.isInterview(ev.title)) interviews.push(ev.title);
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
  const yb = readYearbook();
  const found = [];
  for (const ev of events){
    if (ev.location) found.push(...Places.findPlaces(ev.location));
    const cat = catOfEvent(ev);
    if (cat && cat.id === 'travel') found.push(...Places.findPlaces(ev.title));
  }
  for (const p of yb.places){
    found.push({
      key: p.city || p.name || p.country,
      city: p.city || p.name || '',
      country: p.country || '',
      code: p.code || '',
      lat: p.lat == null ? null : Number(p.lat),
      lon: p.lon == null ? null : Number(p.lon),
      flag: p.flag || Places.flag(p.code)
    });
  }
  const where = Places.summarize(Places.dedupePlaces(found));
  const people = WrapExtra.topPeople(titles, yb.hiddenNames);
  const months = WrapExtra.monthStats(events.map(evStartKey), monthsFor(range));
  return {
    range, total, sport, climb, run, workHours: Math.round(workHours),
    streak, busiest: total ? HE_DAYS[busiest] : '',
    busiestN: total ? weekday[busiest] : 0,
    avg: total && days.size ? Math.max(1, Math.round(total / days.size)) : 0,
    cats, top, topPct: total && top ? Math.round(top.n / total * 100) : 0,
    where, people, interviews, months,
    sportWeeks: WrapExtra.weekStreak(sportDates),
    workout: WrapExtra.topWorkout(sportTitles),
    yearbook: yb,
    events
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
  const ybEmpty = !s.yearbook.books.length && !s.yearbook.movies.length && !s.yearbook.shows.length && !s.where.cities.length;
  if (!s.total && ybEmpty){
    body = `<div class="w-empty">אין פתקים ב${wrapSpan === 'week' ? 'שבוע' : wrapSpan === 'month' ? 'חודש' : 'שנה'} הזו. אירוע חדש נכנס לסיכום מיד.</div>`;
  } else {
    const subs = [s.climb ? s.climb + ' טיפוס' : '', s.run ? s.run + ' ריצה' : ''].filter(Boolean).join(' · ');
    const bar = s.cats.slice(0, 3).map(c => {
      const color = 'var(--n-' + (c.id || 'other') + ')';
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
      ${placesBlock(s)}
      ${monthsBlock(s)}
      ${peopleBlock(s)}
      ${interviewBlock(s)}
      ${sportBlock(s)}
      ${manualBlock(s)}
      <div class="w-cat"><div class="row1"><span>קטגוריה מובילה</span><b>${s.top ? esc(s.top.name) : ''} ${s.topPct}%</b></div><div class="w-bar">${bar}</div></div>
      <div class="w-quote">${line}</div>`;
  }
  host.innerHTML = `
    <div class="w-top"><button type="button" class="w-back" id="wBack">הלוח</button><div class="w-tog">${tog}</div></div>
    <div class="w-eye">${esc(s.range.eye)}</div>
    <h1 class="w-h">${esc(s.range.label)}</h1>
    ${body}
    <div class="w-foot"><button type="button" class="w-text" id="wYear">השנה שלי</button><button type="button" class="w-share" id="wShare">שתף</button></div>`;
  host.querySelectorAll('[data-span]').forEach(b => b.onclick = () => { wrapSpan = b.dataset.span; renderWrap(); });
  host.querySelectorAll('[data-hide]').forEach(b => b.onclick = () => hidePerson(b.dataset.hide));
  $('wBack').onclick = () => setView('year');
  $('wYear').onclick = openYearbook;
  $('wShare').onclick = () => shareWrap(s);
  maybeAskWord();
  maybeGeocode(s.events);
  if (!wrapPulled && S.connected && tokenValid()){
    wrapPulled = true;
    syncYearbook().then(() => { if (S.view === 'wrap') renderWrap(); });
  }
}
function placesBlock(s){
  const w = s.where;
  const flags = w.countries.map(c => c.flag).join(' ');
  const cities = w.cities.slice(0, 8).map(c => esc(c.city)).join(' · ');
  const far = w.far ? `${w.far.flag} ${esc(w.far.place)} · ${w.far.km.toLocaleString('he')} ק״מ` : 'עוד אין נקודה רחוקה';
  return `<div class="w-block">
    <div class="w-k">${hebCount(w.countries.length, 'מדינה אחת', 'מדינות')} · ${hebCount(w.cities.length, 'עיר אחת', 'ערים')}</div>
    <div class="w-flags">${flags || 'אפשר להוסיף מקום ידנית'}</div>
    <div class="w-sub">${cities}</div>
    <div class="w-sub">הכי רחוק מהוד השרון: ${far}</div>
  </div>`;
}
function monthsBlock(s){
  if (!s.months.busy) return '';
  return `<div class="w-block"><div class="w-k">חודשים</div>
    <div class="w-sub">עמוס: ${esc(monthName(s.months.busy.key))} · ${s.months.busy.n}</div>
    <div class="w-sub">שקט: ${esc(monthName(s.months.quiet.key))} · ${s.months.quiet.n}</div>
  </div>`;
}
function peopleBlock(s){
  if (!s.people.length) return `<div class="w-block"><div class="w-k">אנשים</div><div class="w-sub">אין שמות בפתקים. לחיצה על שם מסתירה אותו.</div></div>`;
  const chips = s.people.map(p => `<button type="button" class="w-person" data-hide="${esc(p.name)}">${esc(p.name)} ${p.n}</button>`).join('');
  return `<div class="w-block"><div class="w-k">מי שמופיע הכי הרבה</div><div class="w-people">${chips}</div></div>`;
}
function interviewBlock(s){
  const list = s.interviews.slice(0, 6).map(t => `<div>${esc(t)}</div>`).join('');
  return `<div class="w-block"><div class="w-k">${hebCount(s.interviews.length, 'ראיון אחד', 'ראיונות')}</div>${list}</div>`;
}
function sportBlock(s){
  const top = s.workout ? `${esc(s.workout.name)} · ${s.workout.n}` : 'אין סוג בולט';
  return `<div class="w-block"><div class="w-k">ספורט</div>
    <div class="w-sub">${hebCount(s.sportWeeks, 'שבוע אחד ברצף עם אימון', 'שבועות ברצף עם אימון')}</div>
    <div class="w-sub">הכי הרבה: ${top}</div>
  </div>`;
}
function manualBlock(s){
  const y = s.yearbook;
  const favBook = y.books.find(b => b.favorite);
  const favMovie = y.movies.find(m => m.favorite);
  const best = y.shows.find(sh => sh.best);
  const bits = [];
  if (y.books.length) bits.push(`${y.books.length} ספרים${favBook ? ' · ' + esc(favBook.title) : ''}`);
  if (y.movies.length) bits.push(`${y.movies.length} סרטים וסדרות${favMovie ? ' · ' + esc(favMovie.title) : ''}`);
  if (y.shows.length) bits.push(`${y.shows.length} הופעות${best ? ' · ' + esc(best.name) : ''}`);
  if (y.word) bits.push('המילה: ' + esc(y.word));
  if (y.goal) bits.push('היעד: ' + esc(y.goal));
  if (!bits.length) return `<div class="w-block"><div class="w-k">השנה שלי</div><div class="w-sub">ספרים, סרטים והופעות נשמרים בגוגל.</div></div>`;
  return `<div class="w-block"><div class="w-k">השנה שלי</div>${bits.map(t => `<div class="w-sub">${t}</div>`).join('')}</div>`;
}
function hidePerson(name){
  const y = readYearbook();
  if (!y.hiddenNames.some(n => n.toLowerCase() === name.toLowerCase())) y.hiddenNames.push(name);
  writeYearbook(y);
  toast('השם הוסתר');
  renderWrap();
}
function maybeAskWord(){
  if (wrapSpan !== 'year') return;
  const y = readYearbook();
  if (y.word && y.goal) return;
  if (LS.get('wordAsked', '') === todayKey()) return;
  LS.set('wordAsked', todayKey());
  openWordSheet(null);
}
function openWordSheet(after){
  const y = readYearbook();
  $('wordYear').value = y.word || '';
  $('wordGoal').value = y.goal || '';
  $('wordBackdrop').classList.remove('hidden');
  $('wordBackdrop').dataset.after = after ? 'share' : '';
  setTimeout(() => $('wordYear').focus(), 200);
}
function closeWordSheet(){ $('wordBackdrop').classList.add('hidden'); }
function shareWrap(s){
  const y = readYearbook();
  if (wrapSpan === 'year' && (!y.word || !y.goal)){ openWordSheet(true); storyModel = s; return; }
  showStory(s);
}
function showStory(s){
  storyModel = s;
  const y = readYearbook();
  const flags = s.where.countries.map(c => c.flag).join(' ');
  const far = s.where.far ? `${s.where.far.flag} ${esc(s.where.far.place)}<br>${s.where.far.km.toLocaleString('he')} ק״מ מהבית` : '';
  $('storyCard').innerHTML = `
    <div class="st-eye">${esc(s.range.eye)}</div>
    <div class="st-big">${s.total}</div>
    <div class="st-lbl">פתקים על הלוח</div>
    <div class="st-row">${hebCount(s.where.countries.length, 'מדינה אחת', 'מדינות')} · ${hebCount(s.where.cities.length, 'עיר אחת', 'ערים')}</div>
    <div class="st-flags">${flags}</div>
    <div class="st-far">${far}</div>
    <div class="st-row">${hebCount(s.sport, 'אימון אחד', 'אימונים')} · ${hebCount(s.sportWeeks, 'שבוע אחד ברצף', 'שבועות ברצף')}</div>
    <div class="st-row">${hebCount(s.interviews.length, 'ראיון אחד', 'ראיונות')} · ${s.workHours} שעות עבודה</div>
    <div class="st-word">${y.word ? esc(y.word) : ''}</div>
    <div class="st-goal">${y.goal ? esc(y.goal) : ''}</div>`;
  $('storyBack').classList.remove('hidden');
}
function closeStory(){ $('storyBack').classList.add('hidden'); }
async function ensureStoryFonts(){
  if (!(document.fonts && document.fonts.load)) return;
  const loads = (typeof StoryCard !== 'undefined' ? StoryCard.requiredFontLoads() : [
    '400 13px "Anton"', '400 92px "Anton"', '400 16px "Varela Round"', '700 34px "Varela Round"'
  ]).map(spec => document.fonts.load(spec).catch(() => []));
  await Promise.all(loads);
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
function storyFontFamily(node){
  if (node.classList.contains('st-big') || node.classList.contains('st-eye')) return 'Anton, Impact, sans-serif';
  return '"Varela Round", "Arial Hebrew", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
}
async function canvasFromStoryCard(card){
  await ensureStoryFonts();
  const rect = card.getBoundingClientRect();
  const scale = rect.width ? 1080 / rect.width : 3;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = Math.max(1, Math.round((rect.height || rect.width * 16 / 9) * scale));
  const ctx = canvas.getContext('2d');
  const bg = getComputedStyle(card).backgroundColor || '#1F3FA8';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const nodes = card.querySelectorAll('.st-eye, .st-big, .st-lbl, .st-row, .st-flags, .st-far, .st-word, .st-goal');
  nodes.forEach(node => {
    const lines = (node.innerText || '').split(/\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    const size = parseFloat(cs.fontSize) * scale;
    const weight = cs.fontWeight || '400';
    const ltr = node.classList.contains('st-big') || node.classList.contains('st-eye');
    ctx.font = weight + ' ' + size + 'px ' + storyFontFamily(node);
    ctx.fillStyle = cs.color || '#fff';
    ctx.direction = ltr ? 'ltr' : 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx){
      const spacing = parseFloat(cs.letterSpacing);
      ctx.letterSpacing = node.classList.contains('st-eye') && isFinite(spacing) ? (spacing * scale) + 'px' : '0px';
    }
    const x = (r.right - rect.left) * scale;
    const lhRaw = parseFloat(cs.lineHeight);
    const lineHeight = (isFinite(lhRaw) ? lhRaw : parseFloat(cs.fontSize) * 1.35) * scale;
    lines.forEach((line, i) => {
      const y = lines.length === 1
        ? ((r.top + r.bottom) / 2 - rect.top) * scale
        : (r.top - rect.top) * scale + lineHeight * (i + 0.5);
      ctx.fillText(line, x, y);
    });
  });
  return canvas;
}
async function shareStoryImage(){
  const y = readYearbook();
  const s = storyModel || collectWrap('year');
  const card = $('storyCard');
  const canvas = await canvasFromStoryCard(card);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'wrapped.png', { type: 'image/png' });
  const text = (y.word ? y.word + '. ' : '') + (y.goal || s.range.label);
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'הסיכום', text });
    else if (navigator.share) await navigator.share({ title: 'הסיכום', text });
    else toast('הכרטיס מוכן לצילום מסך');
  } catch(e){ if (e && e.name !== 'AbortError') toast('הכרטיס מוכן לצילום מסך'); }
}
function geoCache(){ return LS.get('geoCache', {}); }
async function maybeGeocode(events){
  const cache = geoCache();
  const pending = [];
  for (const ev of events || []){
    if (ev.location && !Places.findPlaces(ev.location).length) pending.push(ev.location);
  }
  for (const p of readYearbook().places) if (p && p.manual && p.lat == null && (p.name || p.city)) pending.push(p.name || p.city);
  const name = pending.map(t => Places.clean(t)).find(t => t && !cache[t]);
  if (!name) return;
  cache[name] = { miss: true };
  LS.set('geoCache', cache);
  try {
    const hit = await Places.nominatim(name);
    cache[name] = hit || { miss: true };
    LS.set('geoCache', cache);
    if (hit && hit.lat != null){
      const y = readYearbook();
      y.places.push(Object.assign({ manual: false, name: name }, hit));
      writeYearbook(y);
      if (S.view === 'wrap') renderWrap();
    }
  } catch(e){}
}
function openYearbook(){
  const y = readYearbook();
  const suggest = Yearbook.SUGGESTED_BOOKS.filter(b => !y.books.some(x => x.title === b.title));
  const placeRows = y.places.map((p, i) => `<div class="yb-row"><span>${p.flag || ''} ${esc(p.city || p.name || '')}${p.country ? ' · ' + esc(p.country) : ''}</span><button type="button" data-del-place="${i}">הסרה</button></div>`).join('');
  const bookRows = y.books.map((b, i) => `<div class="yb-row"><span>${esc(b.title)}${b.author ? ' · ' + esc(b.author) : ''}${b.audio ? ' · אודיו' : ''}</span><button type="button" data-fav-book="${i}">${b.favorite ? '★' : '☆'}</button><button type="button" data-del-book="${i}">הסרה</button></div>`).join('');
  const movieRows = y.movies.map((m, i) => `<div class="yb-row"><span>${esc(m.title)}</span><button type="button" data-fav-movie="${i}">${m.favorite ? '★' : '☆'}</button><button type="button" data-del-movie="${i}">הסרה</button></div>`).join('');
  const showRows = y.shows.map((sh, i) => `<div class="yb-row"><span>${esc(sh.name)}</span><button type="button" data-best-show="${i}">${sh.best ? 'הכי טוב' : 'סמן'}</button><button type="button" data-del-show="${i}">הסרה</button></div>`).join('');
  const hidden = y.hiddenNames.map((n, i) => `<button type="button" data-restore="${i}">${esc(n)}</button>`).join(' ');
  $('yearSheet').innerHTML = `
    <div class="sheet-head"><button type="button" class="link" id="yearClose">סגירה</button><strong>השנה שלי</strong><span></span></div>
    <p class="small">נשמר בטלפון ובגוגל, באירוע מוסתר. לא למחוק את „יומן שנה”.</p>
    <div class="w-k">מקומות</div>
    <div class="yb-add"><input id="yearPlace" class="input" placeholder="מיאמי, בנגקוק, אסיה"><button type="button" id="yearPlaceAdd">הוספה</button></div>
    <div id="yearPlaces">${placeRows}</div>
    <div class="w-k">ספרים</div>
    <div class="yb-suggest">${suggest.map((b, i) => `<button type="button" data-suggest="${i}">${esc(b.title)}</button>`).join('')}</div>
    <div id="yearBooks">${bookRows}</div>
    <div class="yb-add"><input id="yearBook" class="input" placeholder="שם הספר"><label class="chk"><input type="checkbox" id="yearAudio">אודיו</label><button type="button" id="yearBookAdd">הוספה</button></div>
    <div class="w-k">סרטים וסדרות</div>
    <div id="yearMovies">${movieRows}</div>
    <div class="yb-add"><input id="yearMovie" class="input" placeholder="שם"><button type="button" id="yearMovieAdd">הוספה</button></div>
    <div class="w-k">הופעות</div>
    <div id="yearShows">${showRows}</div>
    <div class="yb-add"><input id="yearShow" class="input" placeholder="שם ההופעה"><button type="button" id="yearShowAdd">הוספה</button></div>
    ${hidden ? `<div class="w-k">שמות מוסתרים</div><div class="yb-suggest">${hidden}</div>` : ''}`;
  $('yearBackdrop').classList.remove('hidden');
  $('yearClose').onclick = () => $('yearBackdrop').classList.add('hidden');
  $('yearPlaceAdd').onclick = addManualPlace;
  $('yearBookAdd').onclick = () => addBook($('yearBook').value, $('yearAudio').checked, '');
  $('yearMovieAdd').onclick = () => addMovie($('yearMovie').value);
  $('yearShowAdd').onclick = () => addShow($('yearShow').value);
  $('yearSheet').querySelectorAll('[data-suggest]').forEach(b => b.onclick = () => {
    const book = suggest[Number(b.dataset.suggest)];
    addBook(book.title, book.audio, book.author);
  });
  $('yearSheet').querySelectorAll('[data-del-place]').forEach(b => b.onclick = () => { const y = readYearbook(); y.places.splice(Number(b.dataset.delPlace), 1); writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-del-book]').forEach(b => b.onclick = () => { const y = readYearbook(); y.books.splice(Number(b.dataset.delBook), 1); writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-del-movie]').forEach(b => b.onclick = () => { const y = readYearbook(); y.movies.splice(Number(b.dataset.delMovie), 1); writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-del-show]').forEach(b => b.onclick = () => { const y = readYearbook(); y.shows.splice(Number(b.dataset.delShow), 1); writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-fav-book]').forEach(b => b.onclick = () => { const y = readYearbook(); const i = Number(b.dataset.favBook); y.books[i].favorite = !y.books[i].favorite; writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-fav-movie]').forEach(b => b.onclick = () => { const y = readYearbook(); const i = Number(b.dataset.favMovie); y.movies[i].favorite = !y.movies[i].favorite; writeYearbook(y); openYearbook(); });
  $('yearSheet').querySelectorAll('[data-best-show]').forEach(b => b.onclick = () => {
    const y = readYearbook();
    const i = Number(b.dataset.bestShow);
    y.shows.forEach((sh, n) => { sh.best = n === i ? !sh.best : false; });
    writeYearbook(y);
    openYearbook();
  });
  $('yearSheet').querySelectorAll('[data-restore]').forEach(b => b.onclick = () => { const y = readYearbook(); y.hiddenNames.splice(Number(b.dataset.restore), 1); writeYearbook(y); openYearbook(); });
}
function addManualPlace(){
  const text = $('yearPlace').value.trim();
  if (!text) return;
  const hit = Places.lookupPlace(text);
  const y = readYearbook();
  if (hit) y.places.push(Object.assign({ manual: true, name: text }, hit));
  else y.places.push({ manual: true, name: text, city: text, country: '', code: '', lat: null, lon: null, flag: '' });
  writeYearbook(y);
  if (!hit) toast('נשמר. אם יש שם מוכר הוא יתווסף למפה');
  openYearbook();
}
function addBook(title, audio, author){
  title = String(title || '').trim();
  if (!title) return;
  const y = readYearbook();
  if (!y.books.some(b => b.title === title)) y.books.push({ title, author: author || '', audio: !!audio, favorite: false });
  writeYearbook(y);
  openYearbook();
}
function addMovie(title){
  title = String(title || '').trim();
  if (!title) return;
  const y = readYearbook();
  if (!y.movies.some(m => m.title === title)) y.movies.push({ title, favorite: false });
  writeYearbook(y);
  openYearbook();
}
function addShow(name){
  name = String(name || '').trim();
  if (!name) return;
  const y = readYearbook();
  if (!y.shows.some(s => s.name === name)) y.shows.push({ name, best: false });
  writeYearbook(y);
  openYearbook();
}
function initWrap(){
  const b = $('yWrapBtn');
  if (b) b.onclick = () => setView('wrap');
  const wordForm = $('wordSheet');
  if (wordForm) wordForm.onsubmit = (e) => {
    e.preventDefault();
    const y = readYearbook();
    y.word = $('wordYear').value.trim();
    y.goal = $('wordGoal').value.trim();
    writeYearbook(y);
    const again = $('wordBackdrop').dataset.after === 'share';
    closeWordSheet();
    if (again && storyModel) showStory(storyModel);
    else if (S.view === 'wrap') renderWrap();
  };
  if ($('wordSkip')) $('wordSkip').onclick = () => {
    const again = $('wordBackdrop').dataset.after === 'share';
    closeWordSheet();
    if (again && storyModel) showStory(storyModel);
  };
  if ($('wordBackdrop')) $('wordBackdrop').addEventListener('click', e => { if (e.target.id === 'wordBackdrop') closeWordSheet(); });
  if ($('yearBackdrop')) $('yearBackdrop').addEventListener('click', e => { if (e.target.id === 'yearBackdrop') $('yearBackdrop').classList.add('hidden'); });
  if ($('storyClose')) $('storyClose').onclick = closeStory;
  if ($('storyShare')) $('storyShare').onclick = shareStoryImage;
  if ($('storyBack')) $('storyBack').addEventListener('click', e => { if (e.target.id === 'storyBack') closeStory(); });
}
