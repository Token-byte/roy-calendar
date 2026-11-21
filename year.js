'use strict';
/* Year poster.
   Fit space: scale 1 fills the viewport (12 months × 31 days).
   Screen = translate(tx, ty) × scale. builtScale is the pixel grid the DOM
   was last drawn at; the CSS scale is scale/builtScale so pinch stays on the
   compositor and text is re-rasterized only when the gesture ends.
   Page pinch stays off (user-scalable=no). iOS uses non-passive touch listeners. */
const EN_M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const EN_D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ZOOM_MIN = 1, ZOOM_MAX = 10;
const ZOOM_STEPS = [1, 5.6, 8];
const Y = {
  year: 0, scale: 1, tx: 0, ty: 0, builtScale: 1,
  vpW: 0, vpH: 0, cellW: 1, cellH: 1, gridW: 1, gridH: 1,
  selected: null, box: {}, noteList: [], labels: [],
  gridKey: '', gesture: null, raf: 0, rect: null,
  lastTap: null, tapTimer: 0, settleT: 0, measureRetry: false,
  hotM: -1, hotY: 0,
};
let yearCache = { sig: 0, year: 0, map: null };

function yclamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function ylerp(a, b, t){ return a + (b - a) * t; }
function yhash(s){
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function displayedYear(){ return Y.year || parseKey(S.sel).getFullYear(); }

function noteKind(ev){
  const c = catOfEvent(ev);
  if (!c) return 'other';
  if (c.id === 'sport') return 'sport';
  if (c.id === 'work') return 'work';
  return 'other';
}
function eventTimeLabel(ev, dayKey){
  if (ev.allDay) return 'כל היום';
  const startKey = keyOf(new Date(evStartMs(ev)));
  if (startKey !== dayKey) return '';
  return hm(new Date(ev.start));
}
function notesLabel(n){
  if (n === 0) return 'אין פתקים ביום הזה';
  if (n === 1) return 'פתק אחד ביום הזה';
  return n + ' פתקים ביום הזה';
}
function eventSig(){
  let h = 2166136261;
  const mix = (s) => {
    s = String(s == null ? '' : s);
    for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  };
  for (const id in S.events){
    const ev = S.events[id];
    if (!ev) continue;
    mix(id); mix(ev.deleted ? 1 : 0); mix(ev.title); mix(ev.start); mix(ev.end);
    mix(ev.allDay ? 1 : 0); mix(ev.calId); mix(ev.cat);
  }
  for (const c of S.calendars) mix(c.id + (c.selected === false ? '0' : '1'));
  for (const c of S.cats) mix(c.id + c.color + c.kw);
  return h >>> 0;
}
function yearMap(year){
  const sig = eventSig();
  if (yearCache.map && yearCache.sig === sig && yearCache.year === year) return yearCache.map;
  const endKey = (year + 1) + '-01-01';
  const startMs = dayStartMs(year + '-01-01');
  const endMs = dayStartMs(endKey);
  const map = new Map();
  for (const ev of Object.values(S.events)){
    if (!ev || ev.deleted || !visibleCal(ev.calId)) continue;
    if (evStartMs(ev) >= endMs || evEndMs(ev) <= startMs) continue;
    let k = ev.allDay ? ev.start : keyOf(new Date(evStartMs(ev)));
    if (k < year + '-01-01') k = year + '-01-01';
    for (let guard = 0; k < endKey && guard < 48; guard++){
      const a = dayStartMs(k);
      if (evEndMs(ev) <= a) break;
      if (evStartMs(ev) < dayEndMs(k)){
        let arr = map.get(k);
        if (!arr){ arr = []; map.set(k, arr); }
        arr.push(ev);
      }
      k = addDays(k, 1);
    }
  }
  for (const arr of map.values()){
    arr.sort((x, y) => (y.allDay - x.allDay) || (evStartMs(x) - evStartMs(y)) || x.title.localeCompare(y.title));
  }
  yearCache = { sig, year, map };
  return map;
}

function spreadT(scale){ return yclamp((scale - 2.15) / 2.15, 0, 1); }
function textMetrics(scale){
  const num = Math.min(20, 6.2 * Math.pow(scale, 0.52));
  const wd = scale < 3.35 ? 0 : Math.min(13, 4.5 + (scale - 3.35) * 2.6);
  const note = scale < 3.45 ? 0 : Math.min(14.5, 8 + (scale - 3.45) * 2.15);
  return { num, wd, note };
}

function measure(){
  const vp = $('yVp');
  if (!vp) return;
  const w = vp.clientWidth, h = vp.clientHeight;
  if (w < 20 || h < 20) return;
  Y.vpW = w; Y.vpH = h;
  Y.cellW = w / 31;
  Y.cellH = h / 12;
  Y.gridW = w; Y.gridH = h;
}
function fitTitle(){
  const el = $('yTitle');
  if (!el) return;
  const bar = el.parentElement;
  const used = [...bar.children].filter(n => n !== el).reduce((s, n) => s + n.offsetWidth, 0);
  const max = Math.max(40, bar.clientWidth - used - 12);
  if (max < 20) return;
  let fs = 28;
  el.style.fontSize = fs + 'px';
  let guard = 0;
  while (el.scrollWidth > max && fs > 11 && guard++ < 50){
    fs -= 0.5;
    el.style.fontSize = fs + 'px';
  }
}
function zoomLabel(z){
  const r = z >= 10 ? Math.round(z) : Math.round(z * 10) / 10;
  return '×' + String(r).replace(/\.0$/, '');
}
function updateChrome(){
  const zoomed = Y.scale > 1.12;
  $('yChrome').classList.toggle('hidden', zoomed);
  $('yZoombar').classList.toggle('hidden', !zoomed);
  $('yHint').classList.toggle('hidden', zoomed);
  $('yPlus2').classList.toggle('hidden', zoomed);
  $('yZLabel').textContent = zoomLabel(Y.scale);
  $('yMinus').disabled = Y.scale <= 1.02;
  $('yPlus').disabled = Y.scale >= ZOOM_MAX - 0.02;
  const title = 'THE BIG SHABBAT CALENDAR ' + (Y.year || '');
  const yEl = $('yTitle');
  if (yEl.textContent !== title){ yEl.textContent = title; fitTitle(); }
  const m = Y.hotM < 0 ? 0 : Y.hotM;
  if (Y.hotY !== Y.year || $('yZTitle').dataset.m !== String(m)){
    $('yZTitle').dataset.m = String(m);
    Y.hotY = Y.year;
    $('yZTitle').innerHTML = EN_M[m] + ' ' + Y.year + '<small>' + HE_MONTHS[m] + '</small>';
  }
  const sheetOpen = !$('ySheet').classList.contains('hidden');
  const showFloat = S.view === 'year' && !sheetOpen;
  $('fab').style.visibility = showFloat ? '' : 'hidden';
  if ($('micBtn')) $('micBtn').style.visibility = showFloat ? '' : 'hidden';
}

function buildGrid(){
  const world = $('yWorld');
  const bs = Y.builtScale;
  world.style.width = (Y.gridW * bs) + 'px';
  world.style.height = (Y.gridH * bs) + 'px';
  world.innerHTML = '';
  Y.box = {};
  const today = todayKey();
  for (let m = 0; m < 12; m++){
    const row = document.createElement('div');
    row.className = 'y-row';
    const y0 = Math.round(m * Y.cellH * bs);
    const y1 = Math.round((m + 1) * Y.cellH * bs);
    row.style.top = y0 + 'px';
    row.style.height = (y1 - y0) + 'px';
    const dim = new Date(Y.year, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++){
      const k = Y.year + '-' + pad(m + 1) + '-' + pad(d);
      const wd = new Date(Y.year, m, d).getDay();
      const cell = document.createElement('div');
      cell.className = 'y-cell' + (wd >= 5 ? ' we' : '') + (k === today ? ' is-today' : '');
      cell.dataset.k = k;
      const x0 = Math.round((d - 1) * Y.cellW * bs);
      const x1 = Math.round(d * Y.cellW * bs);
      cell.style.left = x0 + 'px';
      cell.style.width = (x1 - x0) + 'px';
      cell.innerHTML = '<span class="w">' + EN_D[wd] + '</span><span class="n">' + d + '</span>';
      row.appendChild(cell);
      Y.box[k] = { x: (d - 1) * Y.cellW, y: m * Y.cellH, w: Y.cellW, h: Y.cellH };
    }
    world.appendChild(row);
  }
  const sel = document.createElement('div');
  sel.className = 'y-sel';
  sel.id = 'ySel';
  world.appendChild(sel);
}
function placeNotes(){
  const world = $('yWorld');
  world.querySelectorAll('.ynote').forEach(n => n.remove());
  Y.noteList = [];
  const map = yearMap(Y.year);
  for (const [k, evs] of map){
    const shown = evs.slice(0, 6);
    shown.forEach((ev, i) => {
      const note = document.createElement('div');
      note.className = 'ynote ' + noteKind(ev);
      note.dataset.k = k;
      note.dataset.i = String(i);
      note.dataset.n = String(shown.length);
      note.dataset.rot = String((yhash(ev.id + k) % 13) - 6);
      const tm = eventTimeLabel(ev, k);
      const tape = document.createElement('i');
      tape.className = 'ytape';
      const tt = document.createElement('div');
      tt.className = 'ytt';
      if (tm){
        const time = document.createElement('div');
        time.className = 'ytm';
        time.textContent = tm;
        tt.appendChild(time);
      }
      const title = document.createElement('div');
      title.className = 'yti';
      title.textContent = ev.title || '';
      tt.appendChild(title);
      note.appendChild(tape);
      note.appendChild(tt);
      world.appendChild(note);
      Y.noteList.push(note);
    });
  }
  updateNoteLayout();
}
function updateNoteLayout(){
  const bs = Y.builtScale;
  const t = spreadT(Y.scale);
  for (const note of Y.noteList){
    const box = Y.box[note.dataset.k];
    if (!box) continue;
    const i = +note.dataset.i;
    const n = +note.dataset.n || 1;
    const rot0 = +note.dataset.rot;
    const pileW = Math.min(box.w * 0.76, 9.4);
    const pileH = pileW * 0.88;
    const pileLeft = box.x + (box.w - pileW) / 2 + (i % 2 ? 1 : -1) * Math.min(i, 2) * 0.85;
    const pileTop = box.y + box.h * 0.32 + Math.min(i, 4) * 2.35;
    const spreadW = Math.max(pileW, box.w - 1.05);
    const avail = Math.max(8, box.h - 14);
    const spreadH = Math.max(7.4, Math.min(16, (avail - Math.max(0, n - 1) * 0.7) / n));
    const spreadLeft = box.x + 0.5;
    const spreadTop = box.y + 13 + i * (spreadH + 0.6);
    const left = ylerp(pileLeft, spreadLeft, t);
    const top = ylerp(pileTop, spreadTop, t);
    const w = ylerp(pileW, spreadW, t);
    const h = ylerp(pileH, spreadH, t);
    note.style.left = (left * bs) + 'px';
    note.style.top = (top * bs) + 'px';
    note.style.width = (w * bs) + 'px';
    note.style.height = (h * bs) + 'px';
    note.style.borderRadius = (1.5 * bs) + 'px ' + (1.5 * bs) + 'px ' + (3 * bs) + 'px ' + (8 * bs) + 'px / ' + (1.5 * bs) + 'px ' + (1.5 * bs) + 'px ' + (3 * bs) + 'px ' + (5 * bs) + 'px';
    note.style.transform = 'rotate(' + (rot0 * (1 - t * 0.7)).toFixed(2) + 'deg)';
    note.style.zIndex = String(40 - i);
    const tape = note.firstChild;
    const th = Math.max(1.3, Math.min(2.4, h * 0.14));
    const tw = Math.max(3, w * 0.42);
    tape.style.width = (tw * bs) + 'px';
    tape.style.height = (th * bs) + 'px';
    tape.style.top = (-th * bs / 2) + 'px';
    note.querySelector('.ytt').style.padding = (h * 0.14 * bs) + 'px ' + (w * 0.08 * bs) + 'px 0';
  }
}
function layoutLabels(){
  if (!Y.labels.length || !Y.vpH) return;
  const h = Y.cellH * Y.scale;
  const font = Math.max(11, Math.min(20, h * 0.34));
  const center = (Y.vpH / 2 - Y.ty) / Y.scale;
  const hot = Y.scale > 1.45 ? yclamp(Math.floor(center / Y.cellH), 0, 11) : -1;
  Y.hotM = hot < 0 ? yclamp(Math.floor(center / Y.cellH), 0, 11) : hot;
  for (let m = 0; m < 12; m++){
    const el = Y.labels[m];
    el.style.height = h + 'px';
    el.style.fontSize = font + 'px';
    el.style.transform = 'translateY(' + (Y.ty + m * h) + 'px)';
    el.classList.toggle('hot', m === hot);
  }
}
function layoutSelection(){
  const sel = $('ySel');
  if (!sel) return;
  const box = Y.selected && Y.box[Y.selected];
  const open = Y.selected && !$('ySheet').classList.contains('hidden');
  if (!box || !open){ sel.classList.remove('on'); return; }
  const bs = Y.builtScale;
  const pad = 0.35 * bs;
  sel.style.left = (box.x * bs - pad) + 'px';
  sel.style.top = (box.y * bs - pad) + 'px';
  sel.style.width = (box.w * bs + pad * 2) + 'px';
  sel.style.height = (box.h * bs + pad * 2) + 'px';
  sel.classList.add('on');
}
function applyTransform(){
  const world = $('yWorld');
  if (!world || !Y.builtScale) return;
  const g = Y.scale / Y.builtScale;
  if (Math.abs(g - 1) < 0.004) world.style.transform = 'translate3d(' + Y.tx + 'px,' + Y.ty + 'px,0)';
  else world.style.transform = 'translate3d(' + Y.tx + 'px,' + Y.ty + 'px,0) scale(' + g + ')';
  const tm = textMetrics(Y.scale);
  world.style.setProperty('--b', (Y.builtScale / Y.scale).toFixed(4));
  world.style.setProperty('--num', (tm.num / g).toFixed(3));
  world.style.setProperty('--wd', (Math.max(tm.wd, 0) / g).toFixed(3));
  world.style.setProperty('--wd-op', tm.wd >= 8 ? '1' : '0');
  world.style.setProperty('--nt', (tm.note / g).toFixed(3));
  world.style.setProperty('--ni', (tm.note / g).toFixed(3));
  world.style.setProperty('--show-text', tm.note >= 8 ? '1' : '0');
  layoutLabels();
  layoutSelection();
}
function clampPan(){
  const visW = Y.gridW * Y.scale, visH = Y.gridH * Y.scale;
  if (visW <= Y.vpW + 0.5) Y.tx = 0;
  else Y.tx = Math.min(0, Math.max(Y.vpW - visW, Y.tx));
  if (visH <= Y.vpH + 0.5) Y.ty = 0;
  else Y.ty = Math.min(0, Math.max(Y.vpH - visH, Y.ty));
}

function renderYear(){
  const y = parseKey(S.sel).getFullYear();
  if (Y.year !== y){
    Y.year = y;
    Y.scale = 1; Y.tx = 0; Y.ty = 0; Y.builtScale = 1;
    Y.selected = null;
    closeSheet();
    Y.gridKey = '';
  }
  measure();
  if (Y.vpW < 20 || Y.vpH < 20){
    if (!Y.measureRetry){
      Y.measureRetry = true;
      requestAnimationFrame(() => { Y.measureRetry = false; if (S.view === 'year') renderYear(); });
    }
    return;
  }
  const key = Y.year + '|' + Y.vpW + '|' + Y.vpH + '|' + Y.builtScale.toFixed(3) + '|' + eventSig();
  if (key !== Y.gridKey){
    buildGrid();
    Y.gridKey = key;
    placeNotes();
  }
  clampPan();
  applyTransform();
  updateChrome();
  if (Y.selected && !$('ySheet').classList.contains('hidden')) openSheet(Y.selected);
}
function yearOnHide(){
  cancelAnimationFrame(Y.raf);
  clearTimeout(Y.tapTimer);
  Y.gesture = null;
  const fab = $('fab');
  if (fab) fab.style.visibility = '';
}

function settle(){
  if (Y.gesture) return;
  if (Math.abs(Y.scale - Y.builtScale) > Math.max(0.4, Y.builtScale * 0.22)){
    Y.builtScale = Y.scale;
    Y.gridKey = '';
    if (S.view === 'year') renderYear();
  }
}
function scheduleSettle(){
  clearTimeout(Y.settleT);
  Y.settleT = setTimeout(settle, 150);
}
function animateTo(scale, tx, ty, onDone){
  cancelAnimationFrame(Y.raf);
  clearTimeout(Y.settleT);
  const s0 = Y.scale, x0 = Y.tx, y0 = Y.ty;
  const t0 = performance.now();
  const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 320;
  const world = $('yWorld');
  world.style.willChange = 'transform';
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    Y.scale = s0 + (scale - s0) * e;
    Y.tx = x0 + (tx - x0) * e;
    Y.ty = y0 + (ty - y0) * e;
    clampPan();
    applyTransform();
    updateNoteLayout();
    updateChrome();
    if (p < 1) Y.raf = requestAnimationFrame(frame);
    else {
      world.style.willChange = 'auto';
      settle();
      if (onDone) onDone();
    }
  };
  Y.raf = requestAnimationFrame(frame);
}
function focusFit(fx, fy, scale){
  return { scale: scale, tx: Y.vpW / 2 - fx * scale, ty: Y.vpH / 2 - fy * scale };
}
function dayCenter(k){
  const d = parseKey(k);
  return { x: (d.getDate() - 0.5) * Y.cellW, y: (d.getMonth() + 0.42) * Y.cellH };
}
function zoomAt(vx, vy, newScale){
  newScale = yclamp(newScale, ZOOM_MIN, ZOOM_MAX);
  const fx = (vx - Y.tx) / Y.scale;
  const fy = (vy - Y.ty) / Y.scale;
  Y.scale = newScale;
  Y.tx = vx - fx * Y.scale;
  Y.ty = vy - fy * Y.scale;
  clampPan();
  applyTransform();
  updateNoteLayout();
  updateChrome();
}
function stepZoom(dir){
  let target;
  if (dir > 0) target = ZOOM_STEPS.find(s => s > Y.scale + 0.08) || ZOOM_STEPS[ZOOM_STEPS.length - 1];
  else target = [...ZOOM_STEPS].reverse().find(s => s < Y.scale - 0.08) || 1;
  let fx, fy;
  const today = todayKey();
  if (dir > 0 && Y.scale < 1.2 && parseKey(today).getFullYear() === Y.year){
    const c = dayCenter(today); fx = c.x; fy = c.y;
  } else if (dir > 0 && Y.selected && Y.selected.slice(0, 4) === String(Y.year)){
    const c = dayCenter(Y.selected); fx = c.x; fy = c.y;
  } else {
    fx = (Y.vpW / 2 - Y.tx) / Y.scale;
    fy = (Y.vpH / 2 - Y.ty) / Y.scale;
  }
  const d = focusFit(fx, fy, target);
  animateTo(d.scale, d.tx, d.ty);
}
function zoomAll(){
  closeSheet();
  animateTo(1, 0, 0);
}
function zoomMonth(m){
  const today = todayKey();
  const t = parseKey(today);
  let day = (t.getFullYear() === Y.year && t.getMonth() === m) ? t.getDate() : 15;
  const dim = new Date(Y.year, m + 1, 0).getDate();
  day = Math.min(day, dim);
  const dest = focusFit((day - 0.5) * Y.cellW, (m + 0.42) * Y.cellH, Math.max(5.6, Y.scale));
  animateTo(dest.scale, dest.tx, dest.ty);
}
function shiftKeyYear(key, delta){
  const d = parseKey(key);
  const day = d.getDate();
  d.setFullYear(d.getFullYear() + delta);
  if (d.getDate() !== day) d.setDate(0);
  return keyOf(d);
}
function shiftYear(delta){
  S.sel = shiftKeyYear(S.sel, delta);
  S.cursor = firstOfMonth(S.sel);
  closeSheet();
  render();
  sync();
}
function goToday(){
  const k = todayKey();
  const y = parseKey(k).getFullYear();
  S.sel = k;
  S.cursor = firstOfMonth(k);
  const sheetWasOpen = !$('ySheet').classList.contains('hidden');
  if (y !== Y.year){
    closeSheet();
    render();
    sync();
    return;
  }
  if (Y.scale > 1.05){
    const c = dayCenter(k);
    const d = focusFit(c.x, c.y, Y.scale);
    animateTo(d.scale, d.tx, d.ty);
  }
  if (sheetWasOpen) selectDay(k, true);
}

function openSheet(k){
  const evs = eventsForDay(k);
  $('ySheetDay').textContent = fmtLong(k);
  $('ySheetSub').textContent = notesLabel(evs.length);
  $('ySheetNum').textContent = String(parseKey(k).getDate());
  const list = $('ySheetList');
  if (!evs.length) list.innerHTML = '<div class="y-empty">אין פתקים ביום הזה</div>';
  else list.innerHTML = evs.map(ev => {
    const tm = eventTimeLabel(ev, k) || (ev.allDay ? 'כל היום' : '');
    const sub = ev.location ? '<small>' + esc(ev.location) + '</small>' : '';
    return '<button type="button" class="y-item" data-id="' + esc(ev.id) + '"><i class="' + noteKind(ev) + '"></i><span class="y-tm">' + esc(tm) + '</span><span class="y-bd"><b>' + esc(ev.title) + '</b>' + sub + '</span></button>';
  }).join('');
  $('ySheet').classList.remove('hidden');
  $('ySheet').setAttribute('aria-hidden', 'false');
  updateChrome();
}
function closeSheet(){
  Y.selected = null;
  const sheet = $('ySheet');
  if (sheet){
    sheet.classList.add('hidden');
    sheet.setAttribute('aria-hidden', 'true');
  }
  layoutSelection();
  if ($('fab')) updateChrome();
}
function revealDay(k){
  if (Y.scale <= 1.05) return;
  const el = $('yWorld').querySelector('.y-cell[data-k="' + k + '"]');
  if (!el) return;
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const sheet = $('ySheet').getBoundingClientRect();
    const vp = $('yVp').getBoundingClientRect();
    let dy = 0;
    if (r.bottom > sheet.top - 12) dy = r.bottom - (sheet.top - 16);
    else if (r.top < vp.top + 4) dy = r.top - (vp.top + 8);
    if (dy){
      Y.ty -= dy;
      clampPan();
      applyTransform();
    }
  });
}
function selectDay(k, keepScale){
  Y.selected = k;
  S.sel = k;
  S.cursor = firstOfMonth(k);
  openSheet(k);
  layoutSelection();
  if (!keepScale && Y.scale < 3.3){
    const c = dayCenter(k);
    const d = focusFit(c.x, c.y, 5.6);
    animateTo(d.scale, d.tx, d.ty, () => revealDay(k));
  } else revealDay(k);
}
function dayAt(x, y){
  const el = document.elementFromPoint(x, y);
  const node = el && el.closest('[data-k]');
  if (!node) return null;
  const k = node.dataset.k;
  return /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null;
}
function onTap(x, y){
  const k = dayAt(x, y);
  if (!k){ closeSheet(); return; }
  if (Y.selected === k && !$('ySheet').classList.contains('hidden')){ closeSheet(); return; }
  selectDay(k);
}
function queueTap(x, y){
  const now = Date.now();
  if (Y.lastTap && now - Y.lastTap.t < 350) return;
  Y.lastTap = { t: now, x, y };
  onTap(x, y);
}

function cacheRect(){ Y.rect = $('yVp').getBoundingClientRect(); }
function onTouchStart(e){
  if (e.target.closest('.ysheet')) return;
  cancelAnimationFrame(Y.raf);
  clearTimeout(Y.settleT);
  cacheRect();
  if (e.touches.length >= 2){
    e.preventDefault();
    $('yWorld').style.willChange = 'transform';
    beginPinch(e.touches[0], e.touches[1]);
  } else if (e.touches.length === 1){
    const t = e.touches[0];
    Y.gesture = { mode: 'pan', x: t.clientX, y: t.clientY, tx: Y.tx, ty: Y.ty, moved: false };
  }
}
function beginPinch(a, b){
  const cx = (a.clientX + b.clientX) / 2;
  const cy = (a.clientY + b.clientY) / 2;
  const vx = cx - Y.rect.left, vy = cy - Y.rect.top;
  Y.gesture = {
    mode: 'pinch',
    dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
    scale: Y.scale,
    fx: (vx - Y.tx) / Y.scale,
    fy: (vy - Y.ty) / Y.scale,
  };
}
function onTouchMove(e){
  if (!Y.gesture) return;
  if (Y.gesture.mode === 'pinch' && e.touches.length >= 2){
    e.preventDefault();
    const a = e.touches[0], b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    const cx = (a.clientX + b.clientX) / 2, cy = (a.clientY + b.clientY) / 2;
    const next = yclamp(Y.gesture.scale * (dist / Y.gesture.dist), ZOOM_MIN, ZOOM_MAX);
    Y.scale = next;
    Y.tx = (cx - Y.rect.left) - Y.gesture.fx * next;
    Y.ty = (cy - Y.rect.top) - Y.gesture.fy * next;
    clampPan();
    applyTransform();
    updateNoteLayout();
    updateChrome();
  } else if (Y.gesture.mode === 'pan' && e.touches.length === 1){
    const t = e.touches[0];
    const dx = t.clientX - Y.gesture.x, dy = t.clientY - Y.gesture.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) Y.gesture.moved = true;
    if (!Y.gesture.moved || Y.scale <= 1.01) return;
    e.preventDefault();
    $('yWorld').style.willChange = 'transform';
    Y.tx = Y.gesture.tx + dx;
    Y.ty = Y.gesture.ty + dy;
    clampPan();
    applyTransform();
    updateChrome();
  }
}
function onTouchEnd(e){
  if (!Y.gesture) return;
  if (Y.gesture.mode === 'pan' && !Y.gesture.moved && e.touches.length === 0) queueTap(Y.gesture.x, Y.gesture.y);
  if (e.touches.length >= 2) beginPinch(e.touches[0], e.touches[1]);
  else if (e.touches.length === 1){
    const t = e.touches[0];
    Y.gesture = { mode: 'pan', x: t.clientX, y: t.clientY, tx: Y.tx, ty: Y.ty, moved: true };
  } else {
    Y.gesture = null;
    $('yWorld').style.willChange = 'auto';
    settle();
  }
}
function onPointerDown(e){
  if (e.pointerType === 'touch' || e.button !== 0) return;
  cancelAnimationFrame(Y.raf);
  clearTimeout(Y.settleT);
  cacheRect();
  Y.gesture = { mode: 'mouse', x: e.clientX, y: e.clientY, tx: Y.tx, ty: Y.ty, moved: false };
  $('yVp').setPointerCapture(e.pointerId);
}
function onPointerMove(e){
  if (!Y.gesture || Y.gesture.mode !== 'mouse' || e.pointerType === 'touch') return;
  const dx = e.clientX - Y.gesture.x, dy = e.clientY - Y.gesture.y;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) Y.gesture.moved = true;
  if (!Y.gesture.moved || Y.scale <= 1.01) return;
  Y.tx = Y.gesture.tx + dx;
  Y.ty = Y.gesture.ty + dy;
  clampPan();
  applyTransform();
  updateChrome();
}
function onPointerUp(e){
  if (!Y.gesture || Y.gesture.mode !== 'mouse' || e.pointerType === 'touch') return;
  const g = Y.gesture;
  Y.gesture = null;
  if (!g.moved) queueTap(e.clientX, e.clientY);
  else settle();
}
function onWheel(e){
  e.preventDefault();
  cacheRect();
  if (e.ctrlKey || e.metaKey){
    const factor = Math.exp(-e.deltaY * 0.012);
    zoomAt(e.clientX - Y.rect.left, e.clientY - Y.rect.top, Y.scale * factor);
    scheduleSettle();
  } else if (Y.scale > 1.01){
    Y.tx -= e.deltaX;
    Y.ty -= e.deltaY;
    clampPan();
    applyTransform();
    updateChrome();
    scheduleSettle();
  }
}

function initYear(){
  const col = $('yLabels');
  for (let m = 0; m < 12; m++){
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'y-lab';
    el.textContent = EN_M[m];
    el.setAttribute('aria-label', HE_MONTHS[m]);
    el.addEventListener('click', () => zoomMonth(m));
    col.appendChild(el);
    Y.labels.push(el);
  }
  const vp = $('yVp');
  vp.addEventListener('touchstart', onTouchStart, { passive: false });
  vp.addEventListener('touchmove', onTouchMove, { passive: false });
  vp.addEventListener('touchend', onTouchEnd, { passive: false });
  vp.addEventListener('touchcancel', onTouchEnd, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => {
    vp.addEventListener(type, (e) => e.preventDefault());
  });
  vp.addEventListener('pointerdown', onPointerDown);
  vp.addEventListener('pointermove', onPointerMove);
  vp.addEventListener('pointerup', onPointerUp);
  vp.addEventListener('pointercancel', onPointerUp);
  vp.addEventListener('wheel', onWheel, { passive: false });
  $('yAll').onclick = zoomAll;
  $('yPlus').onclick = () => stepZoom(1);
  $('yMinus').onclick = () => stepZoom(-1);
  $('yPlus2').onclick = () => stepZoom(1);
  $('yToday').onclick = goToday;
  $('yPrev').onclick = () => shiftYear(-1);
  $('yNext').onclick = () => shiftYear(1);
  $('ySettings').onclick = openSettings;
  $('ySheetAdd').onclick = () => openEditor(null, Y.selected || S.sel);
  $('ySheetHandle').onclick = closeSheet;
  $('ySheetList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const ev = S.events[b.dataset.id];
    if (ev) openEditor(ev);
  });
  if (window.ResizeObserver){
    let pending = false;
    new ResizeObserver(() => {
      if (S.view !== 'year' || pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; if (S.view === 'year') renderYear(); });
    }).observe(vp);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.view === 'year') fitTitle(); });
}
