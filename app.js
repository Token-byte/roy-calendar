'use strict';
const VERSION = '2.0.0';
const CFG = window.APP_CONFIG || {};
const TZ = CFG.TIME_ZONE || 'Asia/Jerusalem';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HE_DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const HE_DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const GCOLORS = {1:'#7986cb',2:'#33b679',3:'#8e24aa',4:'#e67c73',5:'#f6bf26',6:'#f4511e',7:'#039be5',8:'#616161',9:'#3f51b5',10:'#0b8043',11:'#d50000'};
const LOCAL_COLOR = '#0a84ff';

/* ---------- storage ---------- */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn('storage', e); } },
  del(k){ localStorage.removeItem(k); }
};
const S = {
  events: LS.get('events', {}),          // id -> event
  ops: LS.get('ops', []),                // pending sync ops
  calendars: LS.get('calendars', []),
  token: LS.get('gtoken', null),         // {access_token, exp}
  connected: LS.get('connected', false),
  settings: Object.assign({ defaultReminder: 15, emailReminder: false, gColor: true }, LS.get('settings', {})),
  cats: LS.get('cats', null) || defaultCats(),
  fired: LS.get('fired', {}),
  view: 'month',
  sel: todayKey(),
  cursor: null, // first day of displayed month
  syncing: false,
};
S.cursor = firstOfMonth(S.sel);
function saveEvents(){ LS.set('events', S.events); }
function saveOps(){ LS.set('ops', S.ops); }
function saveSettings(){ LS.set('settings', S.settings); }

/* ---------- date helpers ---------- */
function pad(n){ return String(n).padStart(2,'0'); }
function keyOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function todayKey(){ return keyOf(new Date()); }
function parseKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function addDays(k, n){ const d = parseKey(k); d.setDate(d.getDate()+n); return keyOf(d); }
function firstOfMonth(k){ return k.slice(0,8)+'01'; }
function addMonths(k, n){ const d = parseKey(firstOfMonth(k)); d.setMonth(d.getMonth()+n); return keyOf(d); }
function hm(date){ return pad(date.getHours())+':'+pad(date.getMinutes()); }
function fmtLong(k){ const d = parseKey(k); return 'יום '+HE_DAYS[d.getDay()]+', '+d.getDate()+' ב'+HE_MONTHS[d.getMonth()]; }
function dayStartMs(k){ return parseKey(k).getTime(); }
function dayEndMs(k){ return parseKey(addDays(k,1)).getTime(); }

/* ---------- categories (auto color by title) ---------- */
function defaultCats(){
  return [
    { id:'sport', name:'ספורט', color:'#ff3b30', g:'11', kw:'אימון, כושר, חדר כושר, טיפוס, אגרוף, ריצה, ספורט, יוגה, פילאטיס, שחייה, כדורגל, כדורסל, טניס, הליכה, gym, workout, sport, climbing, boxing, run, yoga, swim, training, pilates' },
    { id:'study', name:'לימודים', color:'#af52de', g:'3', kw:'קורס, לימודים, מבחן, פסיכומטרי, שיעור, הרצאה, תואר, אוניברסיטה, מכללה, רענון, study, course, exam, class, lecture, school' },
    { id:'content', name:'תוכן', color:'#ff9500', g:'6', kw:'צילומים, צילום, עריכה, תוכן, סרטון, רילס, ריל, שוט, פוסט, filming, shoot, editing, edit, content, video, reel, clip' },
    { id:'admin', name:'סידורים', color:'#c9a000', g:'5', kw:'רכב, מוסך, טסט, בנק, מס, מסים, מיסים, רשות המסים, רופא, רופאה, דרכון, ביטוח, תשלום, לשלם, סידורים, car, bank, tax, doctor, dentist, passport, insurance, pay' },
    { id:'personal', name:'אישי', color:'#34c759', g:'2', kw:'אמא, אבא, משפחה, חברים, חברה שלי, בת זוג, בן זוג, טיול, יום הולדת, ארוחה, דייט, אחי, אחותי, סבתא, סבא, family, friends, mom, dad, trip, birthday, dinner, date' },
    { id:'work', name:'עבודה ופגישות', color:'#0a84ff', g:'9', kw:'פגישה, עבודה, ראיון, שיחה, זום, לקוח, לקוחה, משמרת, ייעוץ, meeting, work, interview, call, zoom, client, meet, sync' },
  ];
}
const NEUTRAL = '#8e8e93';
function saveCats(){ LS.set('cats', S.cats); catCache.clear(); }
const HEB_PREFIX = /^[והבלמשכ]{1,2}/;
function normWord(w){ return w.toLowerCase().replace(/[״׳"'`]/g, ''); }
function kwMatches(kw, title, words){
  kw = kw.trim().toLowerCase(); if (!kw) return false;
  if (kw.includes(' ')) return title.includes(kw);
  const stem = kw.length >= 4 && /[הת]$/.test(kw) ? kw.slice(0, -1) : kw;
  for (const w of words){
    const cands = [w];
    if (/^[\u0590-\u05FF]/.test(w)){ const a = w.replace(/^[והבלמשכ]/, ''); cands.push(a, a.replace(/^[והבלמשכ]/, '')); }
    for (const c of cands){
      if (c === kw) return true;
      if (kw.length >= 3 && c.startsWith(stem) && c.length - stem.length <= 3) return true;
    }
  }
  return false;
}
const catCache = new Map();
function categoryOf(title){
  title = (title || '').toLowerCase();
  if (catCache.has(title)) return catCache.get(title);
  const words = title.split(/[\s,.\-–:;!?()\[\]/\\|+]+/).map(normWord).filter(Boolean);
  let found = null;
  for (const c of S.cats){ if (c.kw.split(',').some(k => kwMatches(k, title, words))){ found = c; break; } }
  catCache.set(title, found); return found;
}
function catOfEvent(ev){
  if (ev.cat){ const c = S.cats.find(c => c.id === ev.cat); if (c) return c; }
  return categoryOf(ev.title);
}
function nearestGColor(hex){
  const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
  const a = p(hex); let best = '8', bd = 1e9;
  for (const [id, h] of Object.entries(GCOLORS)){ const b = p(h); const d = (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2; if (d < bd){ bd = d; best = id; } }
  return best;
}

/* ---------- events model ---------- */
function evColor(ev){
  const c = catOfEvent(ev);
  return c ? c.color : NEUTRAL;
}
function evStartMs(ev){ return ev.allDay ? dayStartMs(ev.start) : new Date(ev.start).getTime(); }
function evEndMs(ev){ return ev.allDay ? dayStartMs(ev.end) : new Date(ev.end).getTime(); }
function visibleCal(calId){
  if (!calId || calId === 'local') return true;
  const c = S.calendars.find(c => c.id === calId);
  return !c || c.selected !== false;
}
function eventsForDay(k){
  const a = dayStartMs(k), b = dayEndMs(k);
  return Object.values(S.events).filter(ev => !ev.deleted && visibleCal(ev.calId) && evStartMs(ev) < b && evEndMs(ev) > a)
    .sort((x,y) => (y.allDay - x.allDay) || (evStartMs(x) - evStartMs(y)) || x.title.localeCompare(y.title));
}
function fromGoogle(g, cal){
  const allDay = !!(g.start && g.start.date);
  let reminder = null;
  if (g.reminders){
    if (g.reminders.useDefault){
      const p = (cal.defaultReminders||[]).find(r => r.method === 'popup');
      reminder = p ? p.minutes : -1;
    } else {
      const p = (g.reminders.overrides||[]).find(r => r.method === 'popup');
      reminder = p ? p.minutes : -1;
    }
  }
  return {
    id: g.id, calId: cal.id, title: g.summary || '(ללא כותרת)', allDay,
    start: allDay ? g.start.date : g.start.dateTime, end: allDay ? g.end.date : g.end.dateTime,
    location: g.location || '', notes: g.description || '', colorId: g.colorId || null,
    cat: (g.extendedProperties && g.extendedProperties.private && g.extendedProperties.private.royCat) || null,
    reminder, recurring: !!g.recurringEventId, readOnly: !['owner','writer'].includes(cal.accessRole),
    link: g.htmlLink || ''
  };
}
function toGoogle(ev){
  const body = {
    summary: ev.title, location: ev.location || '', description: ev.notes || '',
    start: ev.allDay ? { date: ev.start } : { dateTime: new Date(ev.start).toISOString(), timeZone: TZ },
    end: ev.allDay ? { date: ev.end } : { dateTime: new Date(ev.end).toISOString(), timeZone: TZ },
  };
  const cat = catOfEvent(ev);
  if (S.settings.gColor && cat) body.colorId = cat.g || nearestGColor(cat.color);
  body.extendedProperties = { private: { royCat: ev.cat || '' } };
  const overrides = [];
  if (ev.reminder != null && ev.reminder >= 0){
    overrides.push({ method:'popup', minutes: ev.reminder });
    if (S.settings.emailReminder) overrides.push({ method:'email', minutes: ev.reminder });
  }
  body.reminders = { useDefault: false, overrides };
  return body;
}

/* ---------- Google auth ---------- */
let tokenClient = null, gisLoading = null;
function clientId(){ return (CFG.GOOGLE_CLIENT_ID || LS.get('clientId','') || '').trim(); }
function tokenValid(){ return S.token && S.token.exp > Date.now() + 60000; }
function loadGIS(){
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = res; s.onerror = () => { gisLoading = null; rej(new Error('GIS load failed')); };
    document.head.appendChild(s);
  });
  return gisLoading;
}
async function initTokenClient(){
  await loadGIS();
  if (tokenClient) return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId(), scope: SCOPES, login_hint: CFG.LOGIN_HINT || '',
    callback: () => {}, error_callback: () => {}
  });
  return tokenClient;
}
function requestToken(prompt){
  return new Promise(async (resolve, reject) => {
    if (!clientId()){ reject(new Error('no-client-id')); return; }
    try { await initTokenClient(); } catch(e){ reject(e); return; }
    tokenClient.callback = (resp) => {
      if (resp.error){ reject(new Error(resp.error)); return; }
      S.token = { access_token: resp.access_token, exp: Date.now() + (Number(resp.expires_in||3600)*1000) };
      LS.set('gtoken', S.token); S.connected = true; LS.set('connected', true);
      resolve(S.token);
    };
    tokenClient.error_callback = (err) => reject(new Error(err && err.type || 'popup_failed'));
    tokenClient.requestAccessToken({ prompt: prompt == null ? '' : prompt, login_hint: CFG.LOGIN_HINT || '' });
  });
}
async function api(method, path, body){
  if (!tokenValid()) throw Object.assign(new Error('token'), { code: 401 });
  const r = await fetch(API + path, {
    method, headers: { Authorization: 'Bearer ' + S.token.access_token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401){ S.token = null; LS.del('gtoken'); throw Object.assign(new Error('token'), { code: 401 }); }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || ('HTTP '+r.status)), { code: r.status });
  return j;
}

/* ---------- sync ---------- */
async function loadCalendars(){
  const j = await api('GET', '/users/me/calendarList?maxResults=250');
  const prev = Object.fromEntries(S.calendars.map(c => [c.id, c]));
  S.calendars = (j.items || []).map(c => ({
    id: c.id, summary: c.summaryOverride || c.summary, color: c.backgroundColor, primary: !!c.primary,
    accessRole: c.accessRole, defaultReminders: c.defaultReminders || [],
    selected: prev[c.id] ? prev[c.id].selected !== false : (c.selected !== false)
  })).sort((a,b) => (b.primary - a.primary));
  LS.set('calendars', S.calendars);
}
function primaryCalId(){ const p = S.calendars.find(c => c.primary); return p ? p.id : 'primary'; }
async function fetchRange(fromKey, toKey){
  const timeMin = new Date(dayStartMs(fromKey)).toISOString(), timeMax = new Date(dayStartMs(toKey)).toISOString();
  const pendingIds = new Set(S.ops.map(o => o.id));
  for (const cal of S.calendars){
    if (cal.selected === false) continue;
    let items = [], pageToken = '';
    do {
      const q = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeZone: TZ });
      if (pageToken) q.set('pageToken', pageToken);
      const j = await api('GET', '/calendars/' + encodeURIComponent(cal.id) + '/events?' + q);
      items = items.concat(j.items || []); pageToken = j.nextPageToken || '';
    } while (pageToken);
    const a = Date.parse(timeMin), b = Date.parse(timeMax);
    for (const [id, ev] of Object.entries(S.events)){
      if (ev.calId === cal.id && !pendingIds.has(id) && evStartMs(ev) < b && evEndMs(ev) > a) delete S.events[id];
    }
    for (const g of items){
      if (g.status === 'cancelled' || pendingIds.has(g.id)) continue;
      S.events[g.id] = fromGoogle(g, cal);
    }
  }
  saveEvents();
}
async function flushOps(){
  while (S.ops.length){
    const op = S.ops[0];
    const ev = S.events[op.id];
    if (op.kind === 'create'){
      if (!ev){ S.ops.shift(); continue; }
      const calId = ev.calId && ev.calId !== 'local' ? ev.calId : primaryCalId();
      const g = await api('POST', '/calendars/' + encodeURIComponent(calId) + '/events', toGoogle(ev));
      delete S.events[op.id];
      const cal = S.calendars.find(c => c.id === calId) || { id: calId, accessRole: 'owner' };
      S.events[g.id] = fromGoogle(g, cal);
      S.ops.forEach(o => { if (o.id === op.id) o.id = g.id; });
    } else if (op.kind === 'update'){
      if (!ev){ S.ops.shift(); continue; }
      const g = await api('PATCH', '/calendars/' + encodeURIComponent(ev.calId) + '/events/' + encodeURIComponent(ev.id), toGoogle(ev));
      const cal = S.calendars.find(c => c.id === ev.calId) || { id: ev.calId, accessRole: 'owner' };
      S.events[g.id] = fromGoogle(g, cal);
    } else if (op.kind === 'delete'){
      try { await api('DELETE', '/calendars/' + encodeURIComponent(op.calId) + '/events/' + encodeURIComponent(op.id)); }
      catch(e){ if (e.code !== 404 && e.code !== 410) throw e; }
      delete S.events[op.id];
    }
    S.ops.shift(); saveOps(); saveEvents();
  }
}
let lastFullSync = 0;
async function sync(opts = {}){
  if (!S.connected || !clientId()) { renderBanner(); return; }
  if (!navigator.onLine){ renderBanner(); return; }
  if (!tokenValid()){ renderBanner(); return; }
  if (S.syncing) return;
  S.syncing = true; 
  try {
    if (!S.calendars.length || opts.calendars || Date.now() - lastFullSync > 30*60000){ await loadCalendars(); lastFullSync = Date.now(); }
    await flushOps();
    const from = addMonths(S.cursor, -1), to = addMonths(S.cursor, 3);
    await fetchRange(from, to);
    LS.set('lastSync', Date.now());
  } catch(e){
    console.warn('sync', e);
    if (e.code !== 401) toast('שגיאת סנכרון: ' + e.message);
  } finally {
    S.syncing = false; render(); scheduleNotifications();
  }
}
function queue(kind, ev){
  if (kind === 'update' && S.ops.some(o => o.id === ev.id && o.kind === 'create')) { saveOps(); return; }
  if (kind === 'delete'){
    const hadCreate = S.ops.some(o => o.id === ev.id && o.kind === 'create');
    S.ops = S.ops.filter(o => o.id !== ev.id);
    if (!hadCreate && !String(ev.id).startsWith('local-')) S.ops.push({ kind, id: ev.id, calId: ev.calId });
  } else if (!S.ops.some(o => o.id === ev.id && o.kind === kind)) {
    S.ops.push({ kind, id: ev.id, calId: ev.calId });
  }
  saveOps();
}

/* ---------- rendering ---------- */
const $ = (id) => document.getElementById(id);
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function render(){
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === S.view));
  $('monthView').classList.toggle('hidden', S.view !== 'month');
  $('dayView').classList.toggle('hidden', S.view !== 'day');
  $('listView').classList.toggle('hidden', S.view !== 'list');
  const titleKey = S.view === 'month' ? S.cursor : S.sel;
  const td = parseKey(titleKey);
  $('title').innerHTML = esc(HE_MONTHS[td.getMonth()]) + (td.getFullYear() !== new Date().getFullYear() ? '<small>' + td.getFullYear() + '</small>' : '');
  if (S.view === 'month') renderMonth();
  else if (S.view === 'day') renderDay();
  else renderList();
  renderBanner();
}
function renderWeekdays(){
  $('weekdays').innerHTML = HE_DAYS_SHORT.map((d,i) => `<div>${d}</div>`).join('');
}
function renderMonth(){
  const first = parseKey(S.cursor);
  const startKey = addDays(S.cursor, -first.getDay());
  const daysInMonth = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  const grid = $('grid');
  grid.style.gridTemplateRows = `repeat(${weeks}, 1fr)`;
  const cellH = grid.clientHeight ? grid.clientHeight / weeks : 80;
  const maxLines = Math.max(1, Math.floor((cellH - 34) / 16));
  const tk = todayKey();
  let html = '';
  for (let i = 0; i < weeks*7; i++){
    const k = addDays(startKey, i), d = parseKey(k);
    const other = d.getMonth() !== first.getMonth();
    const evs = eventsForDay(k);
    const lines = evs.map(ev => `<div class="chip${ev.allDay ? ' allday' : ''}" style="--c:${evColor(ev)}">${esc(ev.title)}</div>`);
    let shown = lines.slice(0, lines.length > maxLines ? maxLines - 1 : maxLines);
    const extra = lines.length - shown.length;
    html += `<div class="cell${other?' other':''}${k===tk?' today':''}${k===S.sel?' sel':''}" data-k="${k}">
      <span class="d">${d.getDate()}</span>
      ${shown.join('')}${extra>0?`<div class="more">+${extra}</div>`:''}</div>`;
  }
  grid.innerHTML = html;
  renderDayPanel();
}
function evRow(ev){
  const c = evColor(ev);
  let tm;
  if (ev.allDay) tm = 'כל היום';
  else {
    const s = new Date(ev.start), e = new Date(ev.end);
    tm = hm(s) + '<br>' + hm(e);
  }
  const sub = [ev.location, ev.pending ? 'ממתין לסנכרון' : ''].filter(Boolean).join(' · ');
  return `<div class="ev" data-id="${esc(ev.id)}" style="--c:${c}"><div class="tm">${tm}</div><div class="bar"></div>
    <div class="bd"><div class="t">${esc(ev.title)}</div>${sub?`<div class="s">${esc(sub)}</div>`:''}</div></div>`;
}
function renderDayPanel(){
  const k = S.sel, evs = eventsForDay(k);
  $('dayPanel').innerHTML = `<div class="dp-head">${esc(fmtLong(k))}</div>${evs.map(evRow).join('') || '<div class="empty">יום פנוי</div>'}`;
}
function renderDay(){
  const k = S.sel;
  $('dayHead').textContent = fmtLong(k);
  const evs = eventsForDay(k);
  const allDay = evs.filter(e => e.allDay || evStartMs(e) < dayStartMs(k) && evEndMs(e) >= dayEndMs(k));
  const timed = evs.filter(e => !allDay.includes(e));
  $('allDay').innerHTML = allDay.map(ev => `<div class="chip allday" data-id="${esc(ev.id)}" style="--c:${evColor(ev)}">${esc(ev.title)}</div>`).join('');
  const HOUR = 56;
  let html = '';
  for (let h = 0; h < 24; h++) html += `<div class="hour" data-h="${h}" style="top:${h*HOUR}px"><span>${pad(h)}:00</span></div>`;
  // layout overlapping events into columns
  const items = timed.map(ev => {
    const s = Math.max(evStartMs(ev), dayStartMs(k)), e = Math.min(evEndMs(ev), dayEndMs(k));
    return { ev, s, e: Math.max(e, s + 20*60000) };
  }).sort((a,b) => a.s - b.s || b.e - a.e);
  let cluster = [], clusterEnd = 0;
  const flush = () => {
    const cols = [];
    cluster.forEach(it => {
      let c = cols.findIndex(end => end <= it.s);
      if (c < 0){ c = cols.length; cols.push(0); }
      cols[c] = it.e; it.col = c;
    });
    cluster.forEach(it => it.ncol = cols.length);
    cluster = [];
  };
  items.forEach(it => { if (cluster.length && it.s >= clusterEnd) flush(); cluster.push(it); clusterEnd = Math.max(clusterEnd, it.e); });
  flush();
  const base = dayStartMs(k);
  items.forEach(it => {
    const top = (it.s - base) / 3600000 * HOUR, height = Math.max(22, (it.e - it.s) / 3600000 * HOUR - 2);
    const w = 100 / it.ncol;
    const st = new Date(evStartMs(it.ev)), en = new Date(evEndMs(it.ev));
    html += `<div class="tblock" data-id="${esc(it.ev.id)}" style="top:${top}px;height:${height}px;inset-inline-start:${it.col*w}%;width:${w}%;--c:${evColor(it.ev)}">
      ${esc(it.ev.title)}<small>${hm(st)}–${hm(en)}${it.ev.location ? ' · ' + esc(it.ev.location) : ''}</small></div>`;
  });
  if (k === todayKey()){
    const now = new Date();
    html += `<div class="nowline" style="top:${(now.getHours()*60+now.getMinutes())/60*HOUR}px"></div>`;
  }
  $('timeline').innerHTML = html;
  const wrap = $('timelineWrap');
  if (wrap.dataset.k !== k){
    wrap.dataset.k = k;
    const first = items.length ? (items[0].s - base)/3600000 : (k === todayKey() ? new Date().getHours() : 8);
    requestAnimationFrame(() => { wrap.scrollTop = Math.max(0, (first - 1) * HOUR); });
  }
}
function renderList(){
  const start = todayKey(); let html = '';
  for (let i = 0; i < 90; i++){
    const k = addDays(start, i), evs = eventsForDay(k);
    if (!evs.length) continue;
    html += `<div class="ag-day${i===0?' today':''}" data-k="${k}">${esc(i===0?'היום · ':i===1?'מחר · ':'')}${esc(fmtLong(k))}</div>`;
    html += evs.map(evRow).join('');
  }
  $('agenda').innerHTML = html || '<div class="empty">אין אירועים ב־90 הימים הקרובים. לחיצה על + להוספה</div>';
}
function renderBanner(){
  const b = $('banner');
  let msg = '', action = '', fn = null;
  if (!navigator.onLine){ msg = 'אין חיבור לאינטרנט. השינויים יישמרו ויסונכרנו אחר כך.'; }
  else if (!clientId() || !S.connected){ if (!LS.get('bannerDismissed', false)){ msg = 'לחבר את גוגל קלנדר?'; action = 'חיבור'; fn = openGoogle; } }
  else if (!tokenValid()){ msg = 'החיבור לגוגל פג.' + (S.ops.length ? ` ${S.ops.length} שינויים ממתינים.` : ''); action = 'חיבור מחדש'; fn = () => connect(''); }
  if (!msg){ b.classList.add('hidden'); return; }
  const closable = action === 'חיבור';
  b.innerHTML = `<span>${esc(msg)}</span><span>${action ? `<button id="bannerBtn">${esc(action)}</button>` : ''}${closable ? '<button id="bannerX" class="banner-x" aria-label="סגירה">✕</button>' : ''}</span>`;
  b.classList.remove('hidden');
  if (fn) $('bannerBtn').onclick = fn;
  if (closable) $('bannerX').onclick = () => { LS.set('bannerDismissed', true); renderBanner(); };
}
let toastT;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

/* ---------- navigation ---------- */
function go(delta){
  if (S.view === 'month'){ S.cursor = addMonths(S.cursor, delta); const sm = firstOfMonth(S.sel); if (sm !== S.cursor) S.sel = S.cursor === firstOfMonth(todayKey()) ? todayKey() : S.cursor; }
  else if (S.view === 'day'){ S.sel = addDays(S.sel, delta); S.cursor = firstOfMonth(S.sel); }
  else return;
  render(); maybeFetchForCursor();
}
const fetchedMonths = new Set();
function maybeFetchForCursor(){
  if (fetchedMonths.has(S.cursor)) return;
  fetchedMonths.add(S.cursor); sync();
}
function setView(v){ S.view = v; if (v === 'month') S.cursor = firstOfMonth(S.sel); render(); }

/* ---------- editor ---------- */
let editing = null, edCat = null;
function openEditor(ev, presetKey, presetHour){
  editing = ev ? Object.assign({}, ev) : null;
  if (ev && ev.readOnly){ toast('יומן לקריאה בלבד'); return; }
  $('edTitleLbl').textContent = ev ? 'עריכת אירוע' : 'אירוע חדש';
  $('edDelete').classList.toggle('hidden', !ev);
  const k = presetKey || S.sel;
  let date, endDate, st, en, allDay;
  if (ev){
    allDay = ev.allDay;
    if (allDay){ date = ev.start; endDate = addDays(ev.end, -1); st = '09:00'; en = '10:00'; }
    else { const s = new Date(ev.start), e = new Date(ev.end); date = keyOf(s); endDate = keyOf(e); st = hm(s); en = hm(e); }
  } else {
    allDay = false; date = k; endDate = k;
    let h = presetHour != null ? presetHour : (k === todayKey() ? Math.min(new Date().getHours() + 1, 23) : 9);
    st = pad(h) + ':00'; en = pad(Math.min(h + 1, 23)) + (h + 1 > 23 ? ':59' : ':00');
  }
  $('edTitle').value = ev ? ev.title : '';
  $('edAllDay').checked = allDay;
  $('edDate').value = date; $('edEndDate').value = endDate;
  $('edStart').value = st; $('edEnd').value = en;
  $('edLocation').value = ev ? ev.location : ''; $('edNotes').value = ev ? ev.notes : '';
  const rem = ev ? (ev.reminder == null ? S.settings.defaultReminder : ev.reminder) : S.settings.defaultReminder;
  const sel = $('edReminder'); sel.value = String(rem);
  if (sel.value !== String(rem)){ const o = document.createElement('option'); o.value = rem; o.textContent = rem + ' דק׳ לפני'; sel.appendChild(o); sel.value = String(rem); }
  edCat = ev ? (ev.cat || null) : null;
  renderEdCats();
  toggleTimes();
  $('editorBackdrop').classList.remove('hidden');
  if (!ev) setTimeout(() => $('edTitle').focus(), 250);
}
function renderEdCats(){
  const auto = categoryOf($('edTitle').value);
  const cur = edCat ? S.cats.find(c => c.id === edCat) : auto;
  $('edCats').innerHTML = S.cats.map(c => `<button type="button" data-cat="${c.id}" style="--c:${c.color}" class="${cur && cur.id === c.id ? 'on' + (!edCat ? ' auto' : '') : ''}">${esc(c.name)}</button>`).join('');
}
function toggleTimes(){ $('edTimes').classList.toggle('hidden', $('edAllDay').checked); }
function closeEditor(){ $('editorBackdrop').classList.add('hidden'); document.activeElement && document.activeElement.blur(); }
function saveEditor(e){
  e.preventDefault();
  const title = $('edTitle').value.trim(); if (!title) return;
  const allDay = $('edAllDay').checked, date = $('edDate').value;
  let endDate = $('edEndDate').value || date; if (endDate < date) endDate = date;
  const ev = editing || { id: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), calId: S.connected ? primaryCalId() : 'local' };
  ev.title = title; ev.allDay = allDay; ev.location = $('edLocation').value.trim(); ev.notes = $('edNotes').value;
  ev.reminder = Number($('edReminder').value); ev.cat = edCat || null;
  if (allDay){ ev.start = date; ev.end = addDays(endDate, 1); }
  else {
    const s = new Date(date + 'T' + ($('edStart').value || '09:00'));
    let en = new Date(endDate + 'T' + ($('edEnd').value || '10:00'));
    if (en <= s) en = new Date(s.getTime() + 3600000);
    ev.start = s.toISOString(); ev.end = en.toISOString();
  }
  ev.pending = true;
  S.events[ev.id] = ev; saveEvents();
  queue(editing ? 'update' : 'create', ev);
  S.sel = allDay ? date : keyOf(new Date(ev.start)); S.cursor = S.view === 'month' ? firstOfMonth(S.sel) : S.cursor;
  closeEditor(); render(); scheduleNotifications();
  if (S.connected) sync().then(() => { if (!S.ops.length) toast('נשמר בגוגל קלנדר'); });
  else toast('נשמר');
}
function deleteEditing(){
  if (!editing) return;
  if (editing.recurring && !confirm('זה אירוע חוזר. למחוק רק את המופע הזה?')) return;
  if (!editing.recurring && !confirm('למחוק את האירוע?')) return;
  const ev = S.events[editing.id] || editing;
  queue('delete', ev);
  delete S.events[ev.id]; saveEvents();
  closeEditor(); render(); scheduleNotifications();
  if (S.connected) sync();
}

/* ---------- notifications ---------- */
let notifTimers = [];
function reminderFor(ev){
  if (ev.reminder != null) return ev.reminder;
  return S.settings.defaultReminder;
}
function scheduleNotifications(){
  notifTimers.forEach(clearTimeout); notifTimers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now(), horizon = now + 2*86400000;
  for (const ev of Object.values(S.events)){
    if (!visibleCal(ev.calId)) continue;
    const r = reminderFor(ev); if (r == null || r < 0) continue;
    const start = ev.allDay ? dayStartMs(ev.start) + 9*3600000 : evStartMs(ev);
    const at = start - r*60000;
    const fkey = ev.id + '@' + start + '@' + r;
    if (S.fired[fkey] || at > horizon) continue;
    if (at <= now){ if (now - at < 10*60000 && start > now - 5*60000) fireNotification(ev, fkey); continue; }
    notifTimers.push(setTimeout(() => fireNotification(ev, fkey), at - now));
  }
  // prune old fired keys
  const cutoff = now - 3*86400000;
  for (const k of Object.keys(S.fired)) if (S.fired[k] < cutoff) delete S.fired[k];
  LS.set('fired', S.fired);
}
async function fireNotification(ev, fkey){
  S.fired[fkey] = Date.now(); LS.set('fired', S.fired);
  const when = ev.allDay ? 'היום, כל היום' : (keyOf(new Date(ev.start)) === todayKey() ? 'היום ' : fmtLong(keyOf(new Date(ev.start))) + ' ') + hm(new Date(ev.start));
  const body = [ev.allDay ? when : when, ev.location].filter(Boolean).join(' · ');
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(ev.title, { body, tag: fkey, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { k: keyOf(new Date(evStartMs(ev))) } });
  } catch(e){ try { new Notification(ev.title, { body }); } catch(_){} }
}
async function enableNotifications(){
  if (!('Notification' in window)){
    $('stNotifStatus').textContent = 'בטלפון צריך קודם להוסיף את האפליקציה למסך הבית (שיתוף ← הוספה למסך הבית) ולפתוח אותה משם.';
    return;
  }
  const p = await Notification.requestPermission();
  updateNotifStatus();
  if (p === 'granted'){ scheduleNotifications(); toast('התראות הופעלו'); }
}
function updateNotifStatus(){
  const el = $('stNotifStatus');
  if (!('Notification' in window)) { el.textContent = 'התראות זמינות באייפון רק כשהאפליקציה מותקנת במסך הבית.'; return; }
  el.textContent = { granted: 'התראות פעילות. הן מגיעות כשהאפליקציה פתוחה או ברקע.', denied: 'ההתראות חסומות. אפשר להפעיל בהגדרות האייפון ← התראות ← יומן.', default: 'ההתראות עוד לא הופעלו.' }[Notification.permission];
}

/* ---------- settings ---------- */
function openSettings(){
  $('stClientId').value = clientId();
  $('stDefaultReminder').value = String(S.settings.defaultReminder);
  $('stEmailReminder').checked = !!S.settings.emailReminder;
  $('stGColor').checked = !!S.settings.gColor;
  renderCatList();
  $('stVersion').textContent = VERSION;
  renderGoogleSettings(); updateNotifStatus();
  $('settingsBackdrop').classList.remove('hidden');
}
function renderGoogleSettings(){
  const has = !!clientId();
  const ok = S.connected && tokenValid();
  const last = LS.get('lastSync', 0);
  $('stGoogleStatus').textContent = !has ? 'עוד לא הוגדר' :
    ok ? ('מחובר' + (last ? ' · סנכרון אחרון ' + hm(new Date(last)) : '')) : (S.connected ? 'החיבור פג. לחץ על התחברות.' : 'לא מחובר');
  $('stConnect').classList.toggle('hidden', ok);
  $('gSetup').classList.toggle('hidden', has && S.connected);
  $('stConnect').textContent = S.connected ? 'חיבור מחדש' : 'התחברות לגוגל';
  $('stSyncNow').classList.toggle('hidden', !ok);
  $('stDisconnect').classList.toggle('hidden', !S.connected);
  $('stCalendars').innerHTML = S.connected && S.calendars.length ? '<p class="muted small">יומנים להצגה:</p>' + S.calendars.map(c =>
    `<label><input type="checkbox" data-cal="${esc(c.id)}" ${c.selected!==false?'checked':''}><i style="background:${c.color}"></i>${esc(c.summary)}${c.primary?' (ראשי)':''}</label>`).join('') : '';
}
function openGoogle(){ openSettings(); setTimeout(() => $('googleCard').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }
async function connect(prompt){
  const typed = $('stClientId').value.trim();
  if (typed && typed !== clientId()){
    if (!/\.apps\.googleusercontent\.com$/.test(typed)){ toast('המפתח צריך להיגמר ב-apps.googleusercontent.com'); return; }
    LS.set('clientId', typed); tokenClient = null;
  }
  if (!clientId()){ openGoogle(); toast('קודם מדביקים את ה-Client ID'); $('stClientId').focus(); return; }
  try {
    await requestToken(S.connected ? prompt : 'consent');
    toast('מחובר לגוגל קלנדר');
    fetchedMonths.clear(); fetchedMonths.add(S.cursor);
    await sync({ calendars: true });
    // upload events that were created locally before connecting
    renderGoogleSettings();
  } catch(e){
    console.warn('auth', e);
    toast(e.message === 'no-client-id' ? 'חסר Client ID' : 'ההתחברות לא הושלמה');
  }
  renderBanner();
}
function disconnect(){
  if (S.token && window.google && google.accounts) try { google.accounts.oauth2.revoke(S.token.access_token, () => {}); } catch(e){}
  S.token = null; S.connected = false; LS.del('gtoken'); LS.set('connected', false);
  for (const [id, ev] of Object.entries(S.events)) if (!String(id).startsWith('local-')) delete S.events[id];
  S.ops = S.ops.filter(o => String(o.id).startsWith('local-')); saveOps();
  S.calendars = []; LS.set('calendars', []); saveEvents();
  renderGoogleSettings(); render();
}

function renderCatList(){
  $('catList').innerHTML = S.cats.map(c => `<div class="cat" data-id="${c.id}">
    <div class="cat-top"><input type="color" value="${c.color}" aria-label="צבע"><input class="name" value="${esc(c.name)}"><button type="button" class="del" aria-label="מחיקה">מחיקה</button></div>
    <textarea rows="3" placeholder="מילים, מופרדות בפסיק">${esc(c.kw)}</textarea></div>`).join('');
}

/* ---------- install guide ---------- */
let deferredPrompt = null;
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = () => isIOS() || /android/i.test(navigator.userAgent);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; maybeShowInstall(); });
function showInstall(force){
  const android = !isIOS() && !!deferredPrompt;
  $('installSteps').classList.toggle('hidden', android);
  $('installHint').classList.toggle('hidden', android);
  $('installArrow').classList.toggle('hidden', android);
  $('installBtn').classList.toggle('hidden', !android);
  $('install').classList.remove('hidden');
}
function hideInstall(){ $('install').classList.add('hidden'); }
function maybeShowInstall(){
  const force = new URLSearchParams(location.search).get('install') === '1';
  if (force) return showInstall(true);
  if (isStandalone() || !isMobile()) return;
  const d = LS.get('installDismissed', 0);
  if (d && Date.now() - d < 3*86400000) return;
  if (isIOS() || deferredPrompt) showInstall();
}

/* ---------- wiring ---------- */
function bind(){
  renderWeekdays();
  $('btnPrev').onclick = () => go(-1);
  $('btnNext').onclick = () => go(1);
  $('btnToday').onclick = () => { S.sel = todayKey(); S.cursor = firstOfMonth(S.sel); render(); maybeFetchForCursor(); };
  $('btnSettings').onclick = openSettings;
  $('fab').onclick = () => openEditor(null, S.view === 'list' ? todayKey() : S.sel);
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setView(b.dataset.view));
  $('grid').addEventListener('click', e => {
    const c = e.target.closest('.cell'); if (!c) return;
    const k = c.dataset.k;
    if (k === S.sel && !swiped){ setView('day'); return; }
    S.sel = k;
    if (firstOfMonth(k) !== S.cursor){ S.cursor = firstOfMonth(k); maybeFetchForCursor(); }
    render();
  });
  const evClick = e => {
    const el = e.target.closest('[data-id]'); if (!el) return false;
    const ev = S.events[el.dataset.id]; if (ev) openEditor(ev); return true;
  };
  $('dayPanel').addEventListener('click', evClick);
  $('agenda').addEventListener('click', e => { if (evClick(e)) return; const d = e.target.closest('.ag-day'); if (d){ S.sel = d.dataset.k; setView('day'); } });
  $('allDay').addEventListener('click', evClick);
  $('timeline').addEventListener('click', e => {
    if (evClick(e)) return;
    const rect = $('timeline').getBoundingClientRect();
    const h = Math.floor((e.clientY - rect.top) / 56);
    openEditor(null, S.sel, Math.max(0, Math.min(23, h)));
  });
  // swipe (RTL: swipe right -> next)
  let sx = 0, sy = 0, swiped = false;
  const onStart = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiped = false; };
  const onEnd = e => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50){ swiped = true; go(dx > 0 ? 1 : -1); setTimeout(() => swiped = false, 350); }
  };
  ['grid','timelineWrap','dayHead'].forEach(id => { $(id).addEventListener('touchstart', onStart, { passive: true }); $(id).addEventListener('touchend', onEnd); });

  $('editor').addEventListener('submit', saveEditor);
  $('edCancel').onclick = closeEditor;
  $('edDelete').onclick = deleteEditing;
  $('edAllDay').onchange = toggleTimes;
  $('edDate').onchange = () => { if ($('edEndDate').value < $('edDate').value) $('edEndDate').value = $('edDate').value; };
  $('edStart').onchange = () => {
    const [h, m] = $('edStart').value.split(':').map(Number);
    if ($('edDate').value === $('edEndDate').value && $('edEnd').value <= $('edStart').value){ $('edEnd').value = pad(Math.min(h+1,23)) + ':' + pad(m); }
  };
  $('edCats').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const auto = categoryOf($('edTitle').value); edCat = (edCat === b.dataset.cat || (!edCat && auto && auto.id === b.dataset.cat)) ? null : b.dataset.cat; renderEdCats(); });
  $('edTitle').addEventListener('input', renderEdCats);
  $('editorBackdrop').addEventListener('click', e => { if (e.target.id === 'editorBackdrop') closeEditor(); });

  $('stClose').onclick = () => $('settingsBackdrop').classList.add('hidden');
  $('settingsBackdrop').addEventListener('click', e => { if (e.target.id === 'settingsBackdrop') $('settingsBackdrop').classList.add('hidden'); });
  $('stConnect').onclick = () => connect('consent');
  $('stSyncNow').onclick = async () => { fetchedMonths.clear(); await sync({ calendars: true }); renderGoogleSettings(); toast('סונכרן'); };
  $('stDisconnect').onclick = () => { if (confirm('לנתק את גוגל קלנדר מהטלפון הזה?')) disconnect(); };
  $('copyOrigin').onclick = async () => { try { await navigator.clipboard.writeText('https://token-byte.github.io'); toast('הועתק'); } catch(e){ toast('https://token-byte.github.io'); } };
  $('stGColor').onchange = e => { S.settings.gColor = e.target.checked; saveSettings(); };
  $('catReset').onclick = () => { if (confirm('לחזור לקטגוריות ברירת המחדל?')){ S.cats = defaultCats(); saveCats(); renderCatList(); render(); } };
  $('catAdd').onclick = () => { S.cats.push({ id: 'c' + Date.now().toString(36), name: 'קטגוריה חדשה', color: '#5ac8fa', kw: '' }); saveCats(); renderCatList(); };
  $('catList').addEventListener('input', e => {
    const row = e.target.closest('.cat'); if (!row) return; const c = S.cats.find(c => c.id === row.dataset.id); if (!c) return;
    if (e.target.type === 'color'){ c.color = e.target.value; c.g = nearestGColor(c.color); }
    else if (e.target.classList.contains('name')) c.name = e.target.value;
    else if (e.target.tagName === 'TEXTAREA') c.kw = e.target.value;
    saveCats(); render();
  });
  $('catList').addEventListener('click', e => {
    const b = e.target.closest('.del'); if (!b) return; const id = b.closest('.cat').dataset.id;
    S.cats = S.cats.filter(c => c.id !== id); saveCats(); renderCatList(); render();
  });
  $('stShowInstall').onclick = () => { $('settingsBackdrop').classList.add('hidden'); showInstall(true); };
  $('installClose').onclick = () => { LS.set('installDismissed', Date.now()); hideInstall(); };
  $('install').addEventListener('click', e => { if (e.target.id === 'install') { LS.set('installDismissed', Date.now()); hideInstall(); } });
  $('installBtn').onclick = async () => { if (deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; hideInstall(); } };
  $('stCalendars').addEventListener('change', e => {
    const id = e.target.dataset.cal; const c = S.calendars.find(c => c.id === id); if (!c) return;
    c.selected = e.target.checked; LS.set('calendars', S.calendars); render(); if (c.selected){ fetchedMonths.clear(); sync(); }
  });
  $('stDefaultReminder').onchange = e => { S.settings.defaultReminder = Number(e.target.value); saveSettings(); scheduleNotifications(); };
  $('stEmailReminder').onchange = e => { S.settings.emailReminder = e.target.checked; saveSettings(); };
  $('stNotif').onclick = enableNotifications;
  $('stTestNotif').onclick = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted'){ await enableNotifications(); if (!('Notification' in window) || Notification.permission !== 'granted') return; }
    fireNotification({ id: 'test', title: 'בדיקה: ככה תיראה תזכורת', start: new Date().toISOString(), allDay: false, location: '' }, 'test-' + Date.now());
  };

  window.addEventListener('online', () => { renderBanner(); sync(); });
  window.addEventListener('offline', renderBanner);
  window.addEventListener('resize', () => { if (S.view === 'month') renderMonth(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible'){
      if (S.sel !== todayKey() && lastVisibleToday !== todayKey()){ S.sel = todayKey(); S.cursor = firstOfMonth(S.sel); }
      lastVisibleToday = todayKey();
      render(); scheduleNotifications(); sync();
    }
  });
  setInterval(() => { if (document.visibilityState === 'visible'){ if (S.view === 'day') renderDay(); sync(); } }, 5*60000);
}
let lastVisibleToday = todayKey();

if ('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e));
  navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.k){ S.sel = e.data.k; setView('day'); } });
}
bind();
maybeShowInstall();
// deep link ?d=YYYY-MM-DD&view=day
(() => { const p = new URLSearchParams(location.search); const d = p.get('d'); if (d && /^\d{4}-\d\d-\d\d$/.test(d)){ S.sel = d; S.cursor = firstOfMonth(d); } const v = p.get('view'); if (['month','day','list'].includes(v)) S.view = v; })();
render();
requestAnimationFrame(() => render());
fetchedMonths.add(S.cursor);
sync({ calendars: true });
scheduleNotifications();
