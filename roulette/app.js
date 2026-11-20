'use strict';

const HOD = { id: 'hod-hasharon', name: 'הוד השרון', lat: 32.15, lon: 34.89 };
const DAY_MS = 24 * 60 * 60 * 1000;
const FETCH_MS = 6000;
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

const CATEGORIES = [
  { id: 'food', label: 'אוכל ומסעדות', emoji: '🍽️', color: '#c65a32', setting: 'in', budget: 'mid', limit: 36,
    filters: [['amenity', 'restaurant'], ['amenity', 'fast_food'], ['amenity', 'food_court']] },
  { id: 'bars', label: 'ברים ופאבים', emoji: '🍻', color: '#8e3d4d', setting: 'in', budget: 'mid', limit: 24,
    filters: [['amenity', 'bar'], ['amenity', 'pub'], ['amenity', 'biergarten']] },
  { id: 'cafes', label: 'בתי קפה', emoji: '☕', color: '#8d6430', setting: 'both', budget: 'cheap', limit: 24,
    filters: [['amenity', 'cafe']] },
  { id: 'nature', label: 'טבע ופארקים', emoji: '🌳', color: '#3e6b45', setting: 'out', budget: 'free', limit: 24,
    filters: [['leisure', 'park'], ['leisure', 'nature_reserve'], ['leisure', 'garden']] },
  { id: 'beach', label: 'חוף ים', emoji: '🏖️', color: '#2f6f93', setting: 'out', budget: 'free', limit: 20,
    filters: [['natural', 'beach'], ['leisure', 'beach_resort']] },
  { id: 'attractions', label: 'אטרקציות וחדרי בריחה', emoji: '🎯', color: '#6a5494', setting: 'both', budget: 'mid', limit: 24,
    filters: [['leisure', 'escape_game'], ['tourism', 'attraction'], ['tourism', 'theme_park']] },
  { id: 'bowling', label: 'באולינג וביליארד', emoji: '🎳', color: '#2f6d66', setting: 'in', budget: 'mid', limit: 16,
    filters: [['leisure', 'bowling_alley'], ['sport', 'billiards'], ['sport', '10pin'], ['sport', '9pin']] },
  { id: 'cinema', label: 'קולנוע', emoji: '🎬', color: '#9a4630', setting: 'in', budget: 'mid', limit: 12,
    filters: [['amenity', 'cinema']] },
  { id: 'sport', label: 'ספורט וטיפוס', emoji: '🧗', color: '#3f6844', setting: 'both', budget: 'mid', limit: 20,
    filters: [['sport', 'climbing'], ['leisure', 'fitness_centre'], ['leisure', 'sports_centre']] },
  { id: 'culture', label: 'מוזיאונים ותרבות', emoji: '🏛️', color: '#5c4d68', setting: 'in', budget: 'mid', limit: 20,
    filters: [['tourism', 'museum'], ['tourism', 'gallery'], ['amenity', 'arts_centre'], ['amenity', 'theatre']] }
];
const MATCH_ORDER = ['bowling', 'attractions', 'cinema', 'beach', 'culture', 'bars', 'cafes', 'sport', 'food', 'nature'];
const DEFAULT_CATS = ['food', 'bars', 'cafes', 'nature', 'attractions', 'cinema'];

const CITIES = [
  HOD,
  { id: 'ramat-hasharon', name: 'רמת השרון', lat: 32.1461, lon: 34.8394 },
  { id: 'raanana', name: 'רעננה', lat: 32.1847, lon: 34.8706 },
  { id: 'kfar-saba', name: 'כפר סבא', lat: 32.175, lon: 34.9069 },
  { id: 'herzliya', name: 'הרצליה', lat: 32.1624, lon: 34.8443 },
  { id: 'tel-aviv', name: 'תל אביב', lat: 32.0853, lon: 34.7818 },
  { id: 'ramat-gan', name: 'רמת גן', lat: 32.0684, lon: 34.8248 },
  { id: 'givatayim', name: 'גבעתיים', lat: 32.072, lon: 34.812 },
  { id: 'bnei-brak', name: 'בני ברק', lat: 32.083, lon: 34.833 },
  { id: 'petah-tikva', name: 'פתח תקווה', lat: 32.084, lon: 34.8878 },
  { id: 'rosh-haayin', name: 'ראש העין', lat: 32.0956, lon: 34.9566 },
  { id: 'even-yehuda', name: 'אבן יהודה', lat: 32.2696, lon: 34.887 },
  { id: 'tel-mond', name: 'תל מונד', lat: 32.2567, lon: 34.9176 },
  { id: 'netanya', name: 'נתניה', lat: 32.3215, lon: 34.8532 },
  { id: 'hadera', name: 'חדרה', lat: 32.434, lon: 34.9196 },
  { id: 'holon', name: 'חולון', lat: 32.0158, lon: 34.7874 },
  { id: 'bat-yam', name: 'בת ים', lat: 32.0132, lon: 34.748 },
  { id: 'rishon', name: 'ראשון לציון', lat: 31.973, lon: 34.7925 },
  { id: 'rehovot', name: 'רחובות', lat: 31.8948, lon: 34.8113 },
  { id: 'jerusalem', name: 'ירושלים', lat: 31.7683, lon: 35.2137 },
  { id: 'haifa', name: 'חיפה', lat: 32.794, lon: 34.9896 },
  { id: 'modiin', name: 'מודיעין', lat: 31.898, lon: 35.0104 },
  { id: 'ashdod', name: 'אשדוד', lat: 31.8044, lon: 34.6553 },
  { id: 'beer-sheva', name: 'באר שבע', lat: 31.2518, lon: 34.7913 },
  { id: 'eilat', name: 'אילת', lat: 29.5577, lon: 34.9519 }
];

const HOME_IDEAS = [
  { id: 'home:poker', name: 'ערב פוקר', note: 'צ׳יפים, מוזיקה, ומי שמפסיד שוטף כלים.', emoji: '🎲', setting: 'in' },
  { id: 'home:movies', name: 'מרתון סרטים', note: 'שלושה סרטים, שמיכה אחת, ובלי טלפונים באמצע.', emoji: '🍿', setting: 'in' },
  { id: 'home:bbq', name: 'על האש', note: 'פחמים, סלטים, ומישהו אחד שאחראי על הבשר.', emoji: '🔥', setting: 'out' },
  { id: 'home:board', name: 'ערב משחקי קופסה', note: 'משחק אחד ארוך, או שלושה קצרים.', emoji: '🧩', setting: 'in' },
  { id: 'home:karaoke', name: 'קריוקי בסלון', note: 'פלייליסט משותף ורמקול בעוצמה לא מנומסת.', emoji: '🎤', setting: 'in' },
  { id: 'home:cook', name: 'בישול משותף', note: 'כל אחד מביא מצרך אחד, ומבשלים ביחד.', emoji: '🍳', setting: 'in' },
  { id: 'home:trivia', name: 'טריוויה של החבר׳ה', note: 'שאלות על הזיכרונות המשותפים, לא על עובדות.', emoji: '❓', setting: 'in' },
  { id: 'home:games', name: 'טורניר משחקי וידאו', note: 'משחק קצר. המפסיד מזמין את השתייה.', emoji: '🎮', setting: 'in' },
  { id: 'home:pizza', name: 'ערב פיצה ביתית', note: 'בצק, תוספות, ותחרות פיצה לא רצינית.', emoji: '🍕', setting: 'in' },
  { id: 'home:series', name: 'לילה לבן של סדרה', note: 'עונה שלמה, פופקורן, ואפס ספוילרים.', emoji: '📺', setting: 'in' },
  { id: 'home:breakfast', name: 'ארוחת בוקר בלילה', note: 'חביתות, לחם, וקפה בשעה לא הגיונית.', emoji: '🥞', setting: 'in' },
  { id: 'home:picnic', name: 'פיקניק ספונטני', note: 'שמיכה, פירות, ופינה ירוקה קרובה.', emoji: '🧺', setting: 'out' }
];

const BUDGET_LABEL = { free: 'חינם', cheap: 'זול', mid: 'בינוני', high: 'מתפנק' };
const SETTING_LABEL = { in: 'בפנים', out: 'בחוץ', both: 'פנים או חוץ' };
const DAYS = { Mo: 'ב׳', Tu: 'ג׳', We: 'ד׳', Th: 'ה׳', Fr: 'ו׳', Sa: 'ש׳', Su: 'א׳' };

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  lat: HOD.lat,
  lon: HOD.lon,
  source: 'city',
  cityId: HOD.id,
  radius: 5,
  categories: new Set(DEFAULT_CATS),
  people: 0,
  budget: 'any',
  setting: 'any',
  home: false,
  spinning: false,
  gpsAt: 0
};

const view = { rotation: 0, slices: [], spun: false, anim: 0 };

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ }
}

function loadSettings() {
  const saved = readJSON('roulette.settings.v1', null);
  if (!saved) return;
  if (Array.isArray(saved.categories) && saved.categories.length) {
    state.categories = new Set(saved.categories.filter(id => CATEGORIES.some(c => c.id === id)));
  }
  if (saved.radius >= 1 && saved.radius <= 30) state.radius = saved.radius;
  if (['any', 'cheap', 'mid', 'high'].includes(saved.budget)) state.budget = saved.budget;
  if (['any', 'in', 'out'].includes(saved.setting)) state.setting = saved.setting;
  state.home = !!saved.home;
  state.people = Math.max(0, Math.min(20, saved.people || 0));
  const city = CITIES.find(c => c.id === saved.cityId);
  if (saved.source === 'gps' && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) {
    state.source = 'gps';
    state.lat = saved.lat;
    state.lon = saved.lon;
    state.gpsAt = saved.gpsAt || 0;
    state.cityId = city ? city.id : HOD.id;
  } else if (city) {
    state.cityId = city.id;
    state.lat = city.lat;
    state.lon = city.lon;
    state.source = 'city';
  }
}
function saveSettings() {
  writeJSON('roulette.settings.v1', {
    categories: [...state.categories],
    radius: state.radius,
    budget: state.budget,
    setting: state.setting,
    home: state.home,
    people: state.people,
    source: state.source,
    cityId: state.cityId,
    lat: state.lat,
    lon: state.lon,
    gpsAt: state.gpsAt
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function formatDistance(km) {
  if (km < 0.1) return 'ממש קרוב';
  if (km < 1) return Math.max(100, Math.round(km * 1000 / 50) * 50) + ' מ׳';
  if (km < 10) return km.toFixed(1) + ' ק״מ';
  return Math.round(km) + ' ק״מ';
}
function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function pickName(tags) {
  return tags['name:he'] || tags['brand:he'] || tags.name || tags['name:en'] || tags['name:ar'] || '';
}
function goodName(name) {
  const n = (name || '').trim();
  if (n.length < 2) return false;
  if (/^(yes|no|cafe|restaurant|bar|park|shop)$/i.test(n)) return false;
  return true;
}
function normalizeName(name) {
  return name.toLowerCase().replace(/["'׳״”“]/g, '').replace(/\s+/g, ' ').trim();
}
function usableHours(raw) {
  if (!raw || !/\d|24\s*\/\s*7/.test(raw)) return '';
  const trimmed = String(raw).trim();
  if (/^24\s*\/\s*7$/.test(trimmed)) return 'פתוח כל השבוע';
  let text = trimmed.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (m) => DAYS[m]);
  text = text.replace(/\boff\b/gi, 'סגור').replace(/\bclosed\b/gi, 'סגור');
  text = text.replace(/\s*;\s*/g, ' · ');
  if (text.length > 90) text = text.slice(0, 88) + '…';
  return text;
}
function formatAddress(tags) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = tags['addr:city'] || tags['addr:suburb'] || '';
  return [street, city].filter(Boolean).join(', ');
}
function catById(id) {
  return CATEGORIES.find(c => c.id === id);
}
function selectedCats() {
  return CATEGORIES.filter(c => state.categories.has(c.id));
}
function refineSetting(cat, tags) {
  if (tags.amenity === 'biergarten' || tags.natural === 'beach' || tags.leisure === 'beach_resort' || tags.tourism === 'theme_park') return 'out';
  if (tags.outdoor_seating === 'yes' && (cat.setting === 'in' || cat.id === 'cafes' || cat.id === 'food')) return 'both';
  if (tags.indoor === 'yes' && cat.setting === 'out') return 'both';
  return cat.setting;
}
function refineBudget(cat, tags) {
  if (tags.fee === 'no') return 'free';
  if (tags.amenity === 'fast_food') return 'cheap';
  if (tags.cuisine === 'fine_dining') return 'high';
  return cat.budget;
}
function matchCategory(tags, selected) {
  const ids = new Set(selected.map(c => c.id));
  for (const id of MATCH_ORDER) {
    if (!ids.has(id)) continue;
    const cat = catById(id);
    if (cat.filters.some(([key, value]) => tags[key] === value)) return cat;
  }
  return null;
}
function dedupe(places) {
  const out = [];
  for (const place of places) {
    const norm = normalizeName(place.name);
    const dup = out.find(item => item.norm === norm && haversine(item.lat, item.lon, place.lat, place.lon) < 0.2);
    if (dup) {
      if (place.hours && !dup.hours) dup.hours = place.hours;
      if (place.address && !dup.address) dup.address = place.address;
      continue;
    }
    out.push({ ...place, norm });
  }
  return out;
}

function buildQuery(cats) {
  const lat = state.lat.toFixed(5);
  const lon = state.lon.toFixed(5);
  const meters = Math.round(state.radius * 1000);
  const grouped = new Map();
  cats.forEach(cat => {
    cat.filters.forEach(([key, value]) => {
      if (!grouped.has(key)) grouped.set(key, []);
      if (!grouped.get(key).includes(value)) grouped.get(key).push(value);
    });
  });
  const lines = ['[out:json][timeout:8];', '('];
  grouped.forEach((values, key) => {
    const type = (key === 'amenity' || key === 'sport') ? 'node' : 'nwr';
    lines.push('  ' + type + '["' + key + '"~"^(' + values.join('|') + ')$"](around:' + meters + ',' + lat + ',' + lon + ');');
  });
  lines.push(');', 'out center 36;');
  return lines.join('\n');
}
function parseElements(elements, cats) {
  const places = [];
  const seen = new Set();
  elements.forEach(el => {
    const tags = el.tags || {};
    const id = el.type + '/' + el.id;
    if (seen.has(id)) return;
    seen.add(id);
    const name = pickName(tags).trim();
    if (!goodName(name)) return;
    const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
    const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const cat = matchCategory(tags, cats);
    if (!cat) return;
    places.push({
      id: 'osm:' + id,
      kind: 'place',
      name,
      cat: cat.id,
      catLabel: cat.label,
      emoji: cat.emoji,
      color: cat.color,
      lat,
      lon,
      hours: usableHours(tags.opening_hours),
      address: formatAddress(tags),
      setting: refineSetting(cat, tags),
      budget: refineBudget(cat, tags)
    });
  });
  return dedupe(places);
}

let spinControllers = [];

function areaKey(cats) {
  return [state.lat.toFixed(2), state.lon.toFixed(2), cats.map(c => c.id).slice().sort().join(',')].join('|');
}
function slimPlace(place) {
  return {
    id: place.id,
    name: place.name,
    cat: place.cat,
    lat: place.lat,
    lon: place.lon,
    hours: place.hours || '',
    address: place.address || '',
    setting: place.setting,
    budget: place.budget
  };
}
function materialize(raw) {
  const cat = catById(raw.cat);
  if (!cat || !raw.name || !Number.isFinite(raw.lat) || !Number.isFinite(raw.lon)) return null;
  return {
    id: raw.id,
    kind: 'place',
    name: raw.name,
    cat: raw.cat,
    catLabel: cat.label,
    emoji: cat.emoji,
    color: cat.color,
    lat: raw.lat,
    lon: raw.lon,
    hours: raw.hours || '',
    address: raw.address || '',
    setting: raw.setting || cat.setting,
    budget: raw.budget || cat.budget
  };
}
function readAreaCache(cats) {
  const hit = readJSON('roulette.cache.v2', []).find(item => item.key === areaKey(cats));
  if (!hit || Date.now() - hit.savedAt > DAY_MS || !hit.places || !hit.places.length) return null;
  return hit;
}
function writeAreaCache(cats, places) {
  const key = areaKey(cats);
  const bucket = readJSON('roulette.cache.v2', []).filter(item => item.key !== key);
  bucket.unshift({
    key,
    savedAt: Date.now(),
    radius: state.radius,
    places: places.map(slimPlace)
  });
  writeJSON('roulette.cache.v2', bucket.slice(0, 6));
}
function placesFromCache(cats) {
  const hit = readAreaCache(cats);
  if (!hit) return null;
  const places = withDistance(hit.places.map(materialize).filter(Boolean));
  return places.length ? places : null;
}
function placesFromSnapshot(cats) {
  const source = (typeof FALLBACK_PLACES !== 'undefined' && FALLBACK_PLACES) || [];
  const ids = new Set(cats.map(c => c.id));
  const all = source.map(materialize).filter(place => place && ids.has(place.cat));
  const near = withDistance(all);
  if (near.length) return { places: near, widened: false };
  const wider = all.map(place => {
    const km = haversine(state.lat, state.lon, place.lat, place.lon);
    return Object.assign({}, place, { km, distanceText: formatDistance(km) });
  }).filter(place => place.km <= 12).sort((a, b) => a.km - b.km).slice(0, 40);
  return { places: wider, widened: wider.length > 0 };
}
function postOverpass(url, query, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  const relay = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', relay);
  }
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*'
    },
    body: new URLSearchParams({ data: query }),
    signal: ctrl.signal
  }).then(async (res) => {
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    if (!data || !Array.isArray(data.elements)) throw new Error('bad payload');
    if (data.remark && /error|timed out|timeout/i.test(data.remark) && data.elements.length === 0) {
      throw new Error('timeout');
    }
    return data;
  }).finally(() => {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', relay);
  });
}
function firstSuccess(promises) {
  return new Promise((resolve, reject) => {
    let left = promises.length;
    if (!left) {
      reject(new Error('empty'));
      return;
    }
    promises.forEach(promise => {
      Promise.resolve(promise).then(resolve, () => {
        left -= 1;
        if (left === 0) reject(new Error('all failed'));
      });
    });
  });
}
function raceOverpass(cats, track) {
  const query = buildQuery(cats);
  const controllers = ENDPOINTS.map(() => new AbortController());
  if (track) spinControllers = controllers;
  const attempts = ENDPOINTS.map((url, index) => postOverpass(url, query, controllers[index].signal).then(data => {
    const places = parseElements(data.elements || [], cats);
    if (!places.length) throw new Error('empty');
    return places;
  }));
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), FETCH_MS + 700);
  });
  return Promise.race([firstSuccess(attempts), timeout]).finally(() => {
    clearTimeout(timer);
    controllers.forEach(ctrl => ctrl.abort());
    if (track) spinControllers = [];
  });
}
function refreshInBackground(cats) {
  raceOverpass(cats, false).then(places => {
    if (places && places.length) writeAreaCache(cats, places);
  }).catch(() => {});
}
function abortSpinFetch() {
  spinControllers.forEach(ctrl => ctrl.abort());
  spinControllers = [];
}

function homePool() {
  const custom = readJSON('roulette.custom.v1', []);
  const ideas = HOME_IDEAS.map(idea => ({
    id: idea.id,
    kind: 'home',
    name: idea.name,
    note: idea.note,
    cat: 'home',
    catLabel: 'בבית',
    emoji: idea.emoji,
    color: '#7a5340',
    setting: idea.setting,
    budget: 'free',
    lat: null,
    lon: null
  }));
  custom.forEach(idea => {
    if (!idea || !goodName(idea.name)) return;
    ideas.push({
      id: 'custom:' + idea.id,
      kind: 'home',
      name: idea.name.trim(),
      note: 'רעיון שלכם',
      cat: 'custom',
      catLabel: 'רעיון שלכם',
      emoji: '✨',
      color: '#3f4f5a',
      setting: 'both',
      budget: 'free',
      lat: null,
      lon: null,
      custom: true
    });
  });
  return ideas;
}
function withDistance(places) {
  return places.map(place => {
    if (place.lat == null) return { ...place };
    const km = haversine(state.lat, state.lon, place.lat, place.lon);
    return { ...place, km, distanceText: formatDistance(km) };
  }).filter(place => place.lat == null || place.km <= state.radius + 0.4);
}
function applySetting(pool) {
  if (state.setting === 'any') return { pool, relaxed: false };
  const filtered = pool.filter(place => place.setting === state.setting || place.setting === 'both');
  if (filtered.length) return { pool: filtered, relaxed: false };
  return { pool, relaxed: true };
}
function loadRecent() {
  try { return JSON.parse(sessionStorage.getItem('roulette.recent.v1')) || []; }
  catch (err) { return []; }
}
function pushRecent(id) {
  const list = loadRecent().filter(item => item !== id);
  list.unshift(id);
  try { sessionStorage.setItem('roulette.recent.v1', JSON.stringify(list.slice(0, 8))); } catch (err) {}
}
function avoidRecent(pool) {
  const recent = loadRecent();
  const banned = new Set(recent.slice(0, 5));
  const fresh = pool.filter(place => !banned.has(place.id));
  if (fresh.length) return fresh;
  const withoutLast = pool.filter(place => place.id !== recent[0]);
  return withoutLast.length ? withoutLast : pool;
}
function weightOf(place, pool) {
  const same = pool.reduce((count, item) => count + (item.cat === place.cat ? 1 : 0), 0) || 1;
  let weight = 1 / Math.sqrt(same);
  if (state.budget === 'cheap') {
    if (place.budget === 'free' || place.budget === 'cheap') weight *= 2.4;
    else if (place.budget === 'high') weight *= 0.35;
    else weight *= 0.8;
  } else if (state.budget === 'mid') {
    if (place.budget === 'mid') weight *= 1.8;
    else if (place.budget === 'high') weight *= 0.7;
  } else if (state.budget === 'high') {
    if (place.budget === 'high') weight *= 2.4;
    else if (place.budget === 'mid') weight *= 1.5;
    else weight *= 0.45;
  }
  if (state.people >= 8 && ['nature', 'beach', 'bowling', 'food', 'home', 'custom'].includes(place.cat)) weight *= 1.35;
  if (state.people > 0 && state.people <= 2 && ['cafes', 'bars', 'cinema'].includes(place.cat)) weight *= 1.35;
  return Math.max(0.05, weight);
}
function weightedPick(pool) {
  const weights = pool.map(place => weightOf(place, pool));
  let total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
function buildSlices(pool, winner) {
  const others = shuffle(pool.filter(place => place.id !== winner.id));
  const picked = [];
  const used = new Set([winner.cat]);
  others.forEach(place => {
    if (picked.length >= 7) return;
    if (!used.has(place.cat) || picked.length >= 3) {
      picked.push(place);
      used.add(place.cat);
    }
  });
  others.forEach(place => {
    if (picked.length >= 7) return;
    if (!picked.includes(place)) picked.push(place);
  });
  const slices = shuffle([winner, ...picked]);
  return { slices, index: slices.findIndex(place => place.id === winner.id) };
}

function tint(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const shift = (channel) => {
    const next = amount > 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  const r = shift((value >> 16) & 255);
  const g = shift((value >> 8) & 255);
  const b = shift(value & 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function drawWheel(slices) {
  const canvas = $('wheel');
  const size = canvas.clientWidth || 320;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 3;
  const count = Math.max(slices.length, 1);
  const arc = Math.PI * 2 / count;
  slices.forEach((slice, index) => {
    const start = -Math.PI / 2 + index * arc + view.rotation;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = tint(slice.color, index % 2 ? 0.12 : -0.06);
    ctx.fill();
    ctx.strokeStyle = '#f4f0e8';
    ctx.lineWidth = 3;
    ctx.stroke();
    const mid = start + arc / 2;
    ctx.font = Math.round(radius * 0.16) + 'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slice.emoji, cx + Math.cos(mid) * radius * 0.7, cy + Math.sin(mid) * radius * 0.7);
  });
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,253,249,.9)';
  ctx.lineWidth = 4;
  ctx.stroke();
}
function placeholderSlices() {
  const cats = selectedCats();
  const source = cats.length ? cats : CATEGORIES;
  const slices = [];
  for (let i = 0; i < 6; i++) {
    const cat = source[i % source.length];
    slices.push({ id: 'ph' + i, emoji: cat.emoji, color: cat.color, name: cat.label, cat: cat.id });
  }
  return slices;
}
function sliceAtPointer(rotation, count) {
  const arc = Math.PI * 2 / count;
  let angle = (-rotation) % (Math.PI * 2);
  if (angle < 0) angle += Math.PI * 2;
  return Math.floor(angle / arc) % count;
}
function spinTarget(index, count) {
  const arc = Math.PI * 2 / count;
  const jitter = (Math.random() - 0.5) * arc * 0.5;
  let target = ((-(index + 0.5) * arc + jitter) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const current = ((view.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let delta = target - current;
  if (delta < 0) delta += Math.PI * 2;
  delta += Math.PI * 2 * (reduceMotion ? 0 : 5);
  return view.rotation + delta;
}
function animateTo(target, slices, winner) {
  cancelAnimationFrame(view.anim);
  const from = view.rotation;
  const started = performance.now();
  const duration = reduceMotion ? 350 : 4600;
  let lastHub = 0;
  return new Promise(resolve => {
    const step = (now) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      view.rotation = from + (target - from) * eased;
      drawWheel(slices);
      const idx = sliceAtPointer(view.rotation, slices.length);
      if (now - lastHub > 90 || t > 0.86) {
        $('hubKicker').textContent = slices[idx].catLabel || 'הערב';
        $('hubName').textContent = slices[idx].name;
        lastHub = now;
      }
      if (t < 1) view.anim = requestAnimationFrame(step);
      else {
        $('hubKicker').textContent = winner.catLabel;
        $('hubName').textContent = winner.name;
        resolve();
      }
    };
    view.anim = requestAnimationFrame(step);
  });
}

function setStatus(text, kind) {
  const node = $('status');
  node.textContent = text || '';
  node.className = 'status' + (kind ? ' ' + kind : '');
}
function showRetry(on) {
  $('retryBtn').hidden = !on;
}
function setSpinBusy(busy, label) {
  const button = $('spinBtn');
  button.disabled = busy;
  button.replaceChildren();
  if (busy) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.setAttribute('aria-hidden', 'true');
    button.append(spinner, document.createTextNode(label || 'רגע…'));
  } else {
    button.textContent = label || 'סובבו את הגלגל';
  }
}
function placeCountLabel(count) {
  return count === 1 ? 'מקום אחד' : count + ' מקומות';
}

function favorites() {
  return readJSON('roulette.favorites.v1', []);
}
function saveFavorites(list) {
  writeJSON('roulette.favorites.v1', list);
  const badge = $('favCount');
  badge.hidden = list.length === 0;
  badge.textContent = String(list.length);
}
function isFavorite(id) {
  return favorites().some(place => place.id === id);
}
function toggleFavorite(place) {
  const list = favorites();
  const index = list.findIndex(item => item.id === place.id);
  if (index >= 0) list.splice(index, 1);
  else list.unshift({
    id: place.id,
    kind: place.kind,
    name: place.name,
    note: place.note || '',
    cat: place.cat,
    catLabel: place.catLabel,
    emoji: place.emoji,
    color: place.color,
    lat: place.lat,
    lon: place.lon,
    hours: place.hours || '',
    address: place.address || '',
    setting: place.setting,
    budget: place.budget,
    savedAt: Date.now()
  });
  saveFavorites(list);
  return index < 0;
}

function shareText(place) {
  const lines = ['מי בא?', 'רולטת יציאות בחרה: ' + place.name];
  const bits = [place.catLabel];
  if (place.distanceText) bits.push(place.distanceText);
  if (state.people) bits.push(peoplePhrase(state.people));
  lines.push(bits.join(' · '));
  if (place.note) lines.push(place.note);
  if (place.kind === 'place' && Number.isFinite(place.lat)) {
    lines.push('https://www.google.com/maps/search/?api=1&query=' + place.lat.toFixed(5) + ',' + place.lon.toFixed(5));
  }
  lines.push('מי בא?');
  return lines.join('\n');
}
function mapsUrl(place) {
  return 'https://www.google.com/maps/search/?api=1&query=' + place.lat.toFixed(5) + ',' + place.lon.toFixed(5);
}
function wazeUrl(place) {
  return 'https://waze.com/ul?ll=' + place.lat.toFixed(5) + ',' + place.lon.toFixed(5) + '&navigate=yes&q=' + encodeURIComponent(place.name);
}

function closeSheets() {
  $('backdrop').hidden = true;
  $('resultSheet').hidden = true;
  $('favSheet').hidden = true;
}
function openSheet(node) {
  $('resultSheet').hidden = true;
  $('favSheet').hidden = true;
  $('backdrop').hidden = false;
  node.hidden = false;
}
function peoplePhrase(count) {
  if (count === 1) return 'אדם אחד';
  return count + ' אנשים';
}
function renderResult(place, notice) {
  const sheet = $('resultSheet');
  sheet.replaceChildren();
  const handle = document.createElement('div');
  handle.className = 'handle';
  const kicker = document.createElement('p');
  kicker.className = 'kicker';
  kicker.id = 'resultKicker';
  kicker.textContent = place.kind === 'place' ? 'ההצעה להערב' : 'נשארים בבית';
  const title = document.createElement('h2');
  title.className = 'place-name';
  title.id = 'resultName';
  title.textContent = place.name;
  const meta = document.createElement('div');
  meta.className = 'meta';
  [place.emoji + ' ' + place.catLabel, place.distanceText, SETTING_LABEL[place.setting], BUDGET_LABEL[place.budget]]
    .filter(Boolean)
    .forEach(text => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = text;
      meta.append(pill);
    });
  sheet.append(handle, kicker, title, meta);
  if (place.address) {
    const address = document.createElement('p');
    address.className = 'address';
    address.textContent = place.address;
    sheet.append(address);
  }
  if (place.hours) {
    const hours = document.createElement('p');
    hours.className = 'hours';
    hours.textContent = 'שעות: ' + place.hours;
    sheet.append(hours);
  }
  if (place.note) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = place.note;
    sheet.append(note);
  }
  if (notice) {
    const line = document.createElement('p');
    line.className = 'notice';
    line.textContent = notice;
    sheet.append(line);
  }
  const actions = document.createElement('div');
  actions.className = 'actions';
  if (place.kind === 'place') {
    const waze = document.createElement('a');
    waze.href = wazeUrl(place);
    waze.target = '_blank';
    waze.rel = 'noopener';
    waze.className = 'line';
    waze.textContent = 'Waze';
    const maps = document.createElement('a');
    maps.href = mapsUrl(place);
    maps.target = '_blank';
    maps.rel = 'noopener';
    maps.className = 'line';
    maps.textContent = 'Google Maps';
    actions.append(waze, maps);
  }
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'solid wide';
  again.textContent = 'סובב שוב';
  again.addEventListener('click', () => { closeSheets(); spin(); });
  const fav = document.createElement('button');
  fav.type = 'button';
  fav.className = 'line';
  const paintFav = () => { fav.textContent = isFavorite(place.id) ? 'נשמר בלב' : 'שמור ללב'; };
  paintFav();
  fav.addEventListener('click', () => { toggleFavorite(place); paintFav(); });
  const share = document.createElement('a');
  share.className = 'line';
  share.target = '_blank';
  share.rel = 'noopener';
  share.href = 'https://wa.me/?text=' + encodeURIComponent(shareText(place));
  share.textContent = 'שתף לוואטסאפ';
  actions.append(again, fav, share);
  sheet.append(actions);
  openSheet(sheet);
}
function renderFavorites() {
  const sheet = $('favSheet');
  sheet.replaceChildren();
  const handle = document.createElement('div');
  handle.className = 'handle';
  const head = document.createElement('div');
  head.className = 'sheet-head';
  const title = document.createElement('h2');
  title.id = 'favTitle';
  title.textContent = 'שמורים ללב';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'linkish';
  close.textContent = 'סגירה';
  close.addEventListener('click', closeSheets);
  head.append(title, close);
  sheet.append(handle, head);
  const list = favorites();
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'fav-empty';
    empty.textContent = 'עדיין אין שמורים. אחרי סיבוב לוחצים על «שמור ללב».';
    sheet.append(empty);
  }
  list.forEach(place => {
    const row = document.createElement('div');
    row.className = 'fav-row';
    const grow = document.createElement('div');
    grow.className = 'grow';
    const name = document.createElement('strong');
    name.textContent = place.name;
    const sub = document.createElement('span');
    sub.textContent = place.catLabel + (place.address ? ' · ' + place.address : '');
    grow.append(name, sub);
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'פתיחה';
    open.addEventListener('click', () => {
      const enriched = place.lat == null ? place : {
        ...place,
        distanceText: formatDistance(haversine(state.lat, state.lon, place.lat, place.lon))
      };
      renderResult(enriched, '');
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'הסרה';
    remove.addEventListener('click', () => {
      saveFavorites(favorites().filter(item => item.id !== place.id));
      renderFavorites();
    });
    row.append(grow, open, remove);
    sheet.append(row);
  });
  openSheet(sheet);
}

function locationLabel() {
  if (state.source === 'gps') {
    const age = state.gpsAt ? Math.round((Date.now() - state.gpsAt) / 60000) : null;
    const fresh = age != null && age < 2;
    return fresh ? 'לפי המיקום שלכם עכשיו' : 'לפי מיקום שנשמר במכשיר';
  }
  const city = CITIES.find(item => item.id === state.cityId) || HOD;
  if (city.id === HOD.id) return 'הוד השרון · נקודת התחלה';
  return city.name;
}
function renderLocation() {
  $('locLabel').textContent = locationLabel();
  $('city').value = state.source === 'gps' ? '' : state.cityId;
  $('radius').value = String(state.radius);
  $('radiusLabel').textContent = state.radius + ' ק״מ';
}
function renderChips() {
  const wrap = $('cats');
  wrap.replaceChildren();
  CATEGORIES.forEach(cat => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.setAttribute('aria-pressed', state.categories.has(cat.id) ? 'true' : 'false');
    button.textContent = cat.emoji + ' ' + cat.label;
    button.addEventListener('click', () => {
      if (state.categories.has(cat.id)) state.categories.delete(cat.id);
      else state.categories.add(cat.id);
      saveSettings();
      renderChips();
      if (!view.spun && !state.spinning) showPlaceholder();
    });
    wrap.append(button);
  });
}
function renderPeople() {
  $('peopleVal').textContent = state.people ? peoplePhrase(state.people) : 'לא משנה';
}
function renderSeg(id, value) {
  [...$(id).querySelectorAll('button')].forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.value === value ? 'true' : 'false');
  });
}
function renderIdeas() {
  const list = $('ideaList');
  list.replaceChildren();
  HOME_IDEAS.forEach(idea => {
    const chip = document.createElement('span');
    chip.className = 'idea';
    chip.textContent = idea.emoji + ' ' + idea.name;
    list.append(chip);
  });
  readJSON('roulette.custom.v1', []).forEach(idea => {
    const chip = document.createElement('span');
    chip.className = 'idea custom';
    chip.append(document.createTextNode(idea.name));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'x';
    remove.setAttribute('aria-label', 'מחיקת ' + idea.name);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      writeJSON('roulette.custom.v1', readJSON('roulette.custom.v1', []).filter(item => item.id !== idea.id));
      renderIdeas();
    });
    chip.append(remove);
    list.append(chip);
  });
  $('homeBox').classList.toggle('off', !state.home);
  $('ideaCard').classList.toggle('off', !state.home);
  $('homeToggle').checked = state.home;
}
function showPlaceholder() {
  view.slices = placeholderSlices();
  view.rotation = 0;
  $('hubKicker').textContent = 'הערב';
  $('hubName').textContent = 'סובבו';
  drawWheel(view.slices);
}

async function useGeolocation() {
  if (!navigator.geolocation || !window.isSecureContext) {
    setStatus('המיקום זמין רק בחיבור מאובטח. אפשר לבחור עיר.', 'error');
    return;
  }
  const button = $('geoBtn');
  button.disabled = true;
  button.textContent = 'מאתרים…';
  button.classList.add('busy');
  navigator.geolocation.getCurrentPosition(pos => {
    state.lat = pos.coords.latitude;
    state.lon = pos.coords.longitude;
    state.source = 'gps';
    state.gpsAt = Date.now();
    saveSettings();
    renderLocation();
    setStatus('עודכן לפי המיקום שלכם.');
    button.disabled = false;
    button.textContent = 'המיקום שלי';
    button.classList.remove('busy');
  }, err => {
    const messages = {
      1: 'הדפדפן חסם את המיקום. אפשר לבחור עיר.',
      2: 'המיקום לא זמין כרגע. בוחרים עיר.',
      3: 'חיפוש המיקום לקח יותר מדי זמן. נסו שוב, או בחרו עיר.'
    };
    setStatus(messages[err.code] || 'לא הצלחנו לקבל מיקום. בוחרים עיר.', 'error');
    button.disabled = false;
    button.textContent = 'המיקום שלי';
    button.classList.remove('busy');
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

async function gatherPlaces(cats, force) {
  if (!force) {
    const cached = placesFromCache(cats);
    if (cached) {
      state.needsRetry = false;
      refreshInBackground(cats);
      return { places: cached, source: 'cache', notice: '' };
    }
  }
  state.phase = 'fetch';
  showRetry(true);
  setStatus('מחפשים מקומות אמיתיים בסביבה…');
  const slowNote = setTimeout(() => {
    if (state.phase === 'fetch') setStatus('השרת עמוס, מנסים כתובת אחרת…');
  }, 1800);
  try {
    const places = withDistance(await raceOverpass(cats, true));
    if (!places.length) throw new Error('empty');
    writeAreaCache(cats, places);
    state.needsRetry = false;
    return { places, source: 'live', notice: '' };
  } catch (err) {
    const snap = placesFromSnapshot(cats);
    state.needsRetry = true;
    if (snap.places.length) {
      const notice = snap.widened
        ? 'השרתים עמוסים. בחרנו מקום שמור קצת יותר רחוק, כדי שהגלגל לא ייתקע.'
        : 'השרתים עמוסים, אז זו הצעה ממקומות אמיתיים שנשמרו באזור.';
      return { places: snap.places, source: 'snapshot', notice };
    }
    return { places: [], source: 'empty', notice: '' };
  } finally {
    clearTimeout(slowNote);
    state.phase = '';
  }
}
async function spin(force) {
  if (state.spinning) return;
  const cats = selectedCats();
  if (!cats.length && !state.home) {
    setStatus('בחרו לפחות סוג אחד, או הפעילו רעיונות לבית.', 'error');
    showRetry(true);
    state.needsRetry = true;
    return;
  }
  state.spinning = true;
  closeSheets();
  $('wheel').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  setSpinBusy(true, 'מחפשים…');
  let notice = '';
  try {
    let places = [];
    if (cats.length) {
      const loaded = await gatherPlaces(cats, force === true);
      places = loaded.places;
      notice = loaded.notice;
      if (loaded.source === 'cache') setStatus('מסובבים לפי מקומות שנשמרו…');
    } else {
      setStatus('מסובבים בין הרעיונות…');
    }
    let pool = places;
    if (state.home) pool = pool.concat(homePool());
    if (!pool.length) {
      state.needsRetry = true;
      setStatus('לא מצאנו מקום כרגע. לחצו על «נסו שוב».', 'error');
      return;
    }
    const filtered = applySetting(pool);
    if (filtered.relaxed) {
      notice = notice || 'אין מספיק מקומות שמתאימים לבפנים/בחוץ, אז פתחנו את הסינון.';
    }
    const candidates = avoidRecent(filtered.pool);
    const winner = weightedPick(candidates);
    pushRecent(winner.id);
    const arranged = buildSlices(filtered.pool, winner);
    view.slices = arranged.slices;
    view.spun = true;
    setStatus(places.length ? 'נמצאו ' + placeCountLabel(places.length) + '. מסובבים…' : 'מסובבים…');
    showRetry(false);
    setSpinBusy(true, 'מסתובב…');
    await animateTo(spinTarget(arranged.index, arranged.slices.length), arranged.slices, winner);
    setStatus('');
    renderResult(winner, notice);
  } finally {
    state.spinning = false;
    state.phase = '';
    setSpinBusy(false);
    showRetry(!!state.needsRetry);
  }
}

function bind() {
  $('retryBtn').addEventListener('click', () => {
    if (state.phase === 'fetch') {
      abortSpinFetch();
      return;
    }
    spin(true);
  });
  $('geoBtn').addEventListener('click', useGeolocation);
  $('city').addEventListener('change', () => {
    if (!$('city').value) {
      useGeolocation();
      return;
    }
    const city = CITIES.find(item => item.id === $('city').value);
    if (!city) return;
    state.cityId = city.id;
    state.lat = city.lat;
    state.lon = city.lon;
    state.source = 'city';
    saveSettings();
    renderLocation();
    setStatus('');
  });
  $('radius').addEventListener('input', () => {
    state.radius = Number($('radius').value);
    $('radiusLabel').textContent = state.radius + ' ק״מ';
  });
  $('radius').addEventListener('change', saveSettings);
  $('peopleMinus').addEventListener('click', () => {
    state.people = Math.max(0, state.people - 1);
    renderPeople();
    saveSettings();
  });
  $('peoplePlus').addEventListener('click', () => {
    state.people = Math.min(20, state.people + 1);
    renderPeople();
    saveSettings();
  });
  $('budget').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    state.budget = button.dataset.value;
    renderSeg('budget', state.budget);
    saveSettings();
  });
  $('setting').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    state.setting = button.dataset.value;
    renderSeg('setting', state.setting);
    saveSettings();
  });
  $('homeToggle').addEventListener('change', () => {
    state.home = $('homeToggle').checked;
    saveSettings();
    renderIdeas();
  });
  $('ideaForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('ideaInput').value.trim();
    if (!goodName(name)) return;
    const list = readJSON('roulette.custom.v1', []);
    list.push({ id: Date.now().toString(36), name });
    writeJSON('roulette.custom.v1', list.slice(-30));
    $('ideaInput').value = '';
    if (!state.home) {
      state.home = true;
      saveSettings();
    }
    renderIdeas();
  });
  $('spinBtn').addEventListener('click', spin);
  $('favBtn').addEventListener('click', renderFavorites);
  $('backdrop').addEventListener('click', closeSheets);
  $('installDismiss').addEventListener('click', () => {
    writeJSON('roulette.installDismissed.v1', true);
    $('installHint').hidden = true;
  });
  window.addEventListener('resize', () => drawWheel(view.slices.length ? view.slices : placeholderSlices()));
}

function fillCities() {
  const select = $('city');
  const gps = document.createElement('option');
  gps.value = '';
  gps.textContent = 'לפי המיקום שלי';
  select.append(gps);
  CITIES.forEach(city => {
    const option = document.createElement('option');
    option.value = city.id;
    option.textContent = city.name;
    select.append(option);
  });
}
function maybeInstallHint() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (ios && !standalone && !readJSON('roulette.installDismissed.v1', false)) $('installHint').hidden = false;
}
function registerSw() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

loadSettings();
fillCities();
bind();
renderLocation();
renderChips();
renderPeople();
renderSeg('budget', state.budget);
renderSeg('setting', state.setting);
renderIdeas();
saveFavorites(favorites());
showPlaceholder();
maybeInstallHint();
registerSw();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawWheel(view.slices));
