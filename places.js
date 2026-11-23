'use strict';
/* Cities and countries for the year summary. Hebrew and English names.
   Home is Hod Hasharon. A cached geocoder can fill gaps. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Places = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const HOME = { lat: 32.15, lon: 34.89, he: 'הוד השרון', code: 'IL' };
  const CITIES = [
    ['תל אביב', ['tel aviv', 'tel-aviv'], 'IL', 32.0853, 34.7818],
    ['ירושלים', ['jerusalem'], 'IL', 31.7683, 35.2137],
    ['חיפה', ['haifa'], 'IL', 32.794, 34.9896],
    ['הוד השרון', ['hod hasharon', 'hod-hasharon'], 'IL', 32.15, 34.89],
    ['אילת', ['eilat'], 'IL', 29.5577, 34.9519],
    ['נתניה', ['netanya'], 'IL', 32.3215, 34.8532],
    ['הרצליה', ['herzliya'], 'IL', 32.1624, 34.8447],
    ['באר שבע', ['beer sheva', 'beersheba'], 'IL', 31.2518, 34.7913],
    ['טבריה', ['tiberias'], 'IL', 32.7959, 35.531],
    ['צפת', ['safed', 'tzfat'], 'IL', 32.9646, 35.496],
    ['מיאמי', ['miami'], 'US', 25.7617, -80.1918],
    ['ניו יורק', ['new york', 'nyc'], 'US', 40.7128, -74.006],
    ['לוס אנג׳לס', ['los angeles'], 'US', 34.0522, -118.2437],
    ['סן פרנסיסקו', ['san francisco'], 'US', 37.7749, -122.4194],
    ['לאס וגאס', ['las vegas'], 'US', 36.1699, -115.1398],
    ['בנגקוק', ['bangkok', 'bkk'], 'TH', 13.7563, 100.5018],
    ['פוקט', ['phuket'], 'TH', 7.8804, 98.3923],
    ['צ׳יאנג מאי', ['chiang mai'], 'TH', 18.7883, 98.9853],
    ['קו סמוי', ['koh samui', 'ko samui', 'usm'], 'TH', 9.512, 100.0136],
    ['האנוי', ['hanoi', 'han'], 'VN', 21.0278, 105.8342],
    ['הו צ׳י מין', ['ho chi minh', 'saigon'], 'VN', 10.8231, 106.6297],
    ['טוקיו', ['tokyo', 'nrt'], 'JP', 35.6762, 139.6503],
    ['קיוטו', ['kyoto'], 'JP', 35.0116, 135.7681],
    ['סיאול', ['seoul'], 'KR', 37.5665, 126.978],
    ['סינגפור', ['singapore'], 'SG', 1.3521, 103.8198],
    ['הונג קונג', ['hong kong'], 'HK', 22.3193, 114.1694],
    ['באלי', ['bali', 'denpasar'], 'ID', -8.3405, 115.092],
    ['קואלה לומפור', ['kuala lumpur'], 'MY', 3.139, 101.6869],
    ['דלהי', ['delhi'], 'IN', 28.7041, 77.1025],
    ['מומבאי', ['mumbai'], 'IN', 19.076, 72.8777],
    ['גואה', ['goa'], 'IN', 15.2993, 74.124],
    ['דובאי', ['dubai'], 'AE', 25.2048, 55.2708],
    ['אבו דאבי', ['abu dhabi'], 'AE', 24.4539, 54.3773],
    ['לונדון', ['london'], 'GB', 51.5074, -0.1278],
    ['פריז', ['paris'], 'FR', 48.8566, 2.3522],
    ['רומא', ['rome', 'roma'], 'IT', 41.9028, 12.4964],
    ['מילאנו', ['milan', 'milano'], 'IT', 45.4642, 9.19],
    ['ונציה', ['venice', 'venezia'], 'IT', 45.4408, 12.3155],
    ['ברצלונה', ['barcelona'], 'ES', 41.3874, 2.1686],
    ['מדריד', ['madrid'], 'ES', 40.4168, -3.7038],
    ['ליסבון', ['lisbon', 'lisboa'], 'PT', 38.7223, -9.1393],
    ['אמסטרדם', ['amsterdam'], 'NL', 52.3676, 4.9041],
    ['ברלין', ['berlin'], 'DE', 52.52, 13.405],
    ['מינכן', ['munich'], 'DE', 48.1351, 11.582],
    ['פראג', ['prague', 'praha'], 'CZ', 50.0755, 14.4378],
    ['וינה', ['vienna', 'wien'], 'AT', 48.2082, 16.3738],
    ['בודפשט', ['budapest'], 'HU', 47.4979, 19.0402],
    ['אתונה', ['athens'], 'GR', 37.9838, 23.7275],
    ['סנטוריני', ['santorini'], 'GR', 36.3932, 25.4615],
    ['מיקונוס', ['mykonos'], 'GR', 37.4467, 25.3289],
    ['איסטנבול', ['istanbul'], 'TR', 41.0082, 28.9784],
    ['לרנקה', ['larnaca'], 'CY', 34.9229, 33.6233],
    ['לימסול', ['limassol'], 'CY', 34.7071, 33.0226],
    ['טביליסי', ['tbilisi'], 'GE', 41.7151, 44.8271],
    ['ציריך', ['zurich'], 'CH', 47.3769, 8.5417],
    ['ז׳נבה', ['geneva'], 'CH', 46.2044, 6.1432],
    ['דבלין', ['dublin'], 'IE', 53.3498, -6.2603],
    ['קופנהגן', ['copenhagen'], 'DK', 55.6761, 12.5683],
    ['שטוקהולם', ['stockholm'], 'SE', 59.3293, 18.0686],
    ['אוסלו', ['oslo'], 'NO', 59.9139, 10.7522],
    ['הלסינקי', ['helsinki'], 'FI', 60.1699, 24.9384],
    ['ורשה', ['warsaw'], 'PL', 52.2297, 21.0122],
    ['קרקוב', ['krakow', 'cracow'], 'PL', 50.0647, 19.945],
    ['דוברובניק', ['dubrovnik'], 'HR', 42.6507, 18.0944],
    ['ספליט', ['split croatia'], 'HR', 43.5081, 16.4402],
    ['רייקיאוויק', ['reykjavik'], 'IS', 64.1466, -21.9426],
    ['מקסיקו סיטי', ['mexico city'], 'MX', 19.4326, -99.1332],
    ['קנקון', ['cancun'], 'MX', 21.1619, -86.8515],
    ['ריו דה ז׳נרו', ['rio de janeiro'], 'BR', -22.9068, -43.1729],
    ['בואנוס איירס', ['buenos aires'], 'AR', -34.6037, -58.3816],
    ['קייפ טאון', ['cape town'], 'ZA', -33.9249, 18.4241],
    ['סידני', ['sydney'], 'AU', -33.8688, 151.2093],
    ['מלבורן', ['melbourne'], 'AU', -37.8136, 144.9631],
    ['אוקלנד', ['auckland'], 'NZ', -36.8509, 174.7645],
    ['טורונטו', ['toronto'], 'CA', 43.6532, -79.3832],
    ['ונקובר', ['vancouver'], 'CA', 49.2827, -123.1207],
    ['קהיר', ['cairo'], 'EG', 30.0444, 31.2357],
    ['שארם א-שייח', ['sharm el sheikh', 'sharm'], 'EG', 27.9158, 34.33],
    ['מרקש', ['marrakech'], 'MA', 31.6295, -7.9811],
    ['עמאן', ['amman'], 'JO', 31.9454, 35.9284],
    ['פטרה', ['petra'], 'JO', 30.3285, 35.4444]
  ].map(row => ({ he: row[0], en: row[1], code: row[2], lat: row[3], lon: row[4] }));
  const COUNTRIES = [
    ['IL', 'ישראל', ['israel']],
    ['US', 'ארצות הברית', ['united states', 'usa']],
    ['TH', 'תאילנד', ['thailand']],
    ['VN', 'וייטנאם', ['vietnam']],
    ['JP', 'יפן', ['japan']],
    ['KR', 'קוריאה', ['south korea', 'korea']],
    ['SG', 'סינגפור', ['singapore']],
    ['HK', 'הונג קונג', ['hong kong']],
    ['ID', 'אינדונזיה', ['indonesia']],
    ['MY', 'מלזיה', ['malaysia']],
    ['IN', 'הודו', ['india']],
    ['AE', 'איחוד האמירויות', ['united arab emirates', 'uae']],
    ['GB', 'בריטניה', ['united kingdom', 'uk', 'britain']],
    ['FR', 'צרפת', ['france']],
    ['IT', 'איטליה', ['italy']],
    ['ES', 'ספרד', ['spain']],
    ['PT', 'פורטוגל', ['portugal']],
    ['NL', 'הולנד', ['netherlands', 'holland']],
    ['DE', 'גרמניה', ['germany']],
    ['CZ', 'צ׳כיה', ['czech', 'czechia']],
    ['AT', 'אוסטריה', ['austria']],
    ['HU', 'הונגריה', ['hungary']],
    ['GR', 'יוון', ['greece']],
    ['TR', 'טורקיה', ['turkey']],
    ['CY', 'קפריסין', ['cyprus']],
    ['GE', 'גאורגיה', ['georgia']],
    ['CH', 'שווייץ', ['switzerland']],
    ['IE', 'אירלנד', ['ireland']],
    ['DK', 'דנמרק', ['denmark']],
    ['SE', 'שוודיה', ['sweden']],
    ['NO', 'נורווגיה', ['norway']],
    ['FI', 'פינלנד', ['finland']],
    ['PL', 'פולין', ['poland']],
    ['HR', 'קרואטיה', ['croatia']],
    ['IS', 'איסלנד', ['iceland']],
    ['MX', 'מקסיקו', ['mexico']],
    ['BR', 'ברזיל', ['brazil']],
    ['AR', 'ארגנטינה', ['argentina']],
    ['ZA', 'דרום אפריקה', ['south africa']],
    ['AU', 'אוסטרליה', ['australia']],
    ['NZ', 'ניו זילנד', ['new zealand']],
    ['CA', 'קנדה', ['canada']],
    ['EG', 'מצרים', ['egypt']],
    ['MA', 'מרוקו', ['morocco']],
    ['JO', 'ירדן', ['jordan']]
  ].map(row => ({ code: row[0], he: row[1], en: row[2] }));
  const BY_CODE = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

  function clean(s){
    return String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .toLowerCase()
      .replace(/[״׳"'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hasName(text, name){
    if (!name) return false;
    const pre = /[\u0590-\u05FF]/.test(name) ? '[והבלמשכ]?' : '';
    const re = new RegExp('(?:^|[^\\p{L}\\p{N}])' + pre + escapeRe(name) + '(?:$|[^\\p{L}\\p{N}])', 'u');
    return re.test(text);
  }
  function countryOf(code){
    return BY_CODE[code] || { code: code, he: code, en: [] };
  }
  function flag(code){
    const cc = String(code || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return '';
    return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
  }
  function haversine(a, b){
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function isHome(p){
    if (!p || p.lat == null || p.lon == null) return false;
    return haversine(p, HOME) < 8;
  }
  function placeFromCity(city){
    const country = countryOf(city.code);
    return {
      key: city.he,
      city: city.he,
      country: country.he,
      code: city.code,
      lat: city.lat,
      lon: city.lon,
      flag: flag(city.code)
    };
  }
  function findPlaces(text){
    const raw = clean(text);
    if (!raw) return [];
    const found = [];
    const used = new Set();
    const cities = CITIES.slice().sort((a, b) => Math.max(b.he.length, ...b.en.map(x => x.length)) - Math.max(a.he.length, ...a.en.map(x => x.length)));
    for (const city of cities){
      const names = [city.he, ...city.en];
      if (names.some(n => hasName(raw, clean(n)))){
        const p = placeFromCity(city);
        if (!used.has(p.key)){ used.add(p.key); found.push(p); }
      }
    }
    if (!found.length){
      for (const country of COUNTRIES){
        const names = [country.he, ...country.en];
        if (names.some(n => hasName(raw, clean(n)))){
          found.push({ key: country.code, city: '', country: country.he, code: country.code, lat: null, lon: null, flag: flag(country.code) });
          break;
        }
      }
    }
    return found;
  }
  function lookupPlace(text){
    const hits = findPlaces(text);
    return hits.find(p => p.city) || hits[0] || null;
  }
  function dedupePlaces(list){
    const out = [];
    const seen = new Set();
    for (const p of list){
      if (!p) continue;
      const key = (p.city || p.country || p.name || '') + '|' + (p.code || '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }
  function summarize(list){
    const away = list.filter(p => p.city && !isHome(p));
    const countries = [];
    const seenC = new Set();
    for (const p of away){
      if (!p.code || seenC.has(p.code)) continue;
      seenC.add(p.code);
      countries.push({ code: p.code, name: p.country, flag: p.flag || flag(p.code) });
    }
    const cities = away.filter(p => p.city);
    let far = null;
    for (const p of away){
      if (p.lat == null || p.lon == null) continue;
      const km = Math.round(haversine(HOME, p));
      if (!far || km > far.km) far = { place: p.city, country: p.country, flag: p.flag || flag(p.code), km: km };
    }
    return { countries: countries, cities: cities, far: far };
  }
  async function nominatim(name, fetchImpl){
    const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetchFn) return null;
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=' + encodeURIComponent(name);
    const r = await fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!r || !r.ok) return null;
    const j = await r.json();
    const row = j && j[0];
    if (!row) return null;
    const addr = row.address || {};
    const code = String(addr.country_code || '').toUpperCase();
    const country = countryOf(code);
    const city = addr.city || addr.town || addr.village || addr.state || name;
    return {
      key: city,
      city: city,
      country: code && country.he !== code ? country.he : (addr.country || ''),
      code: code,
      lat: Number(row.lat),
      lon: Number(row.lon),
      flag: flag(code),
      name: name
    };
  }
  return { HOME, findPlaces, lookupPlace, dedupePlaces, summarize, haversine, isHome, flag, nominatim, clean };
});
