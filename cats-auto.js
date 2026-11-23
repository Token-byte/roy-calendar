'use strict';
/* One keyword list for every note. Rules live in categories.json.
   Manual ev.cat and a per-title memory win before this. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CatsAuto = api; root.autoCategoryId = api.autoCategoryId; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DATA = {
    tieOrder: ['study', 'travel', 'family', 'admin', 'culture', 'sport', 'work'],
    prefixes: ['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ'],
    maxPrefixStrips: 2,
    shortEnglish: 3,
    block: ['שיחה', 'פגישה', 'ייעוץ', 'אח', 'call', 'meeting', 'zoom', 'work', 'date', 'friend'],
    colorMap: { '2': 'family', '3': 'study', '5': 'admin', '6': 'culture', '7': 'travel', '8': 'other', '9': 'work', '11': 'sport' },
    categories: [
      { id: 'work', name: 'עבודה', emoji: '💼', color: '#A9C7FF', colorId: '9', phrases: ['reel works', 'reelworks', 'טראשטק', 'טאמבנייל', 'thumbnail', 'צילומים', 'צילום', 'עריכה', 'עורך', 'עריכת', 'סרטון', 'רילס', 'ריל', 'שוט', 'לקוחות', 'לקוחה', 'לקוח', 'ראיון', 'פרילנס', 'פרילנסר', 'משמרת', 'סושיאל', 'filming', 'editing', 'interview', 'client', 'clients', 'video', 'reel', 'reels', 'clip', 'shoot', 'shoots', 'עבודה'] },
      { id: 'study', name: 'לימודים', emoji: '📚', color: '#C9B0FF', colorId: '3', phrases: ['יום פתוח', 'פסיכומטרי', 'אוניברסיטת', 'אוניברסיטה', 'אוניברסיטאות', 'רייכמן', 'בצלאל', 'אריאל', 'בר אילן', 'המכללה למינהל', 'h-farm', 'hfarm', 'טכניון', 'שנקר', 'ספיר', 'אפקה', 'לימודים', 'לימוד', 'תואר', 'מכללה', 'הרצאה', 'מבחן', 'שיעור', 'קורס', 'sat', 'study', 'course', 'exam', 'lecture', 'school', 'open day', 'college', 'university'] },
      { id: 'sport', name: 'ספורט', emoji: '🏃', color: '#FF8B84', colorId: '11', phrases: ['חדר כושר', 'don gym', 'איגרוף', 'אגרוף', 'בולדרינג', 'אימון', 'כושר', 'טיפוס', 'בוקס', 'ריצה', 'יוגה', 'פילאטיס', 'שחייה', 'כדורגל', 'כדורסל', 'טניס', 'הליכה', 'ספורט', 'climbing', 'bouldering', 'boulder', 'boxing', 'workout', 'pilates', 'training', 'yoga', 'gym', 'swim', 'sport', 'run'] },
      { id: 'travel', name: 'טיולים', emoji: '✈️', color: '#7EE0E8', colorId: '7', phrases: ['flight to', 'stay at', 'staying at', 'travel to', 'טיסה', 'טיסות', 'חופשה', 'מלון', 'טיול', 'miami', 'מיאמי', 'תאילנד', 'thailand', 'bangkok', 'בנגקוק', 'hotel', 'flight', 'airport', 'bkk', 'usm', 'nrt', 'han', 'tlv'] },
      { id: 'family', name: 'משפחה', emoji: '🏡', color: '#7DDBA3', colorId: '2', phrases: ['יום הולדת', 'יום נישואין', 'יום נישואים', 'בר מצווה', 'בת מצווה', 'משפחה', 'חתונה', 'אמא', 'אבא', 'סבתא', 'סבא', 'פולי', 'מיה', 'לונה', 'birthday', 'anniversary', 'wedding', 'family', 'mom', 'dad'] },
      { id: 'admin', name: 'סידורים', emoji: '🧾', color: '#F0B45A', colorId: '5', phrases: ['רענון נהיגה', 'הצהרת הון', 'רשות המסים', 'תעודת זהות', 'ישראכרט', 'קופת חולים', 'רופא שיניים', 'דרכון', 'ביומטרי', 'ביומטריים', 'בנק', 'ביטוח', 'מיסים', 'מסים', 'טסט', 'מוסך', 'מנוי', 'תשלום', 'לשלם', 'סידורים', 'מכבי', 'מרפאה', 'חיסון', 'כלבת', 'שיניים', 'רופאה', 'רופא', 'passport', 'insurance', 'dentist', 'doctor', 'bank', 'tax'] },
      { id: 'culture', name: 'תרבות', emoji: '🎵', color: '#FFB4E0', colorId: '6', phrases: ['אדיר מילר', 'j. cole', 'j cole', 'eventim', 'מוזיאון', 'הופעה', 'קונצרט', 'הצגה', 'סינמה', 'קולנוע', 'פודקאסט', 'ספר', 'concert', 'museum', 'cinema', 'movie', 'festival', 'tour'] },
      { id: 'other', name: 'אחר', emoji: '📝', color: '#FFE978', colorId: '8', phrases: [] }
    ]
  };
  const BLOCK = new Set(DATA.block);
  const PREFIX = new Set(DATA.prefixes);

  function clean(s){
    return String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .replace(/&nbsp;/gi, ' ')
      .toLowerCase()
      .replace(/[״׳"'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function isHebrew(s){ return /[\u0590-\u05FF]/.test(s); }
  function tokens(text){
    return text.split(/[\s,.;:!?()[\]\\/|+]+/).map(t => t.trim()).filter(Boolean);
  }
  function strippedForms(word){
    const out = [word];
    let w = word;
    let n = 0;
    while (n < DATA.maxPrefixStrips && w.length > 1 && PREFIX.has(w[0]) && isHebrew(w)){
      w = w.slice(1);
      n++;
      if (w) out.push(w);
    }
    return out;
  }
  function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function containsPhrase(text, phrase){
    if (!phrase || BLOCK.has(phrase)) return false;
    const re = new RegExp('(?:^|[^\\p{L}\\p{N}])' + escapeRe(phrase) + '(?:$|[^\\p{L}\\p{N}])', 'u');
    return re.test(text);
  }
  function wordHit(token, phrase){
    if (!phrase || phrase.includes(' ') || BLOCK.has(phrase)) return false;
    const forms = isHebrew(token) || isHebrew(phrase) ? strippedForms(token) : [token];
    for (const w of forms){
      if (w === phrase) return true;
      if (!isHebrew(phrase) || phrase.length <= DATA.shortEnglish) continue;
      if (phrase.length >= 4 && /[הת]$/.test(phrase)){
        const stem = phrase.slice(0, -1);
        if (isHebrew(w) && w.startsWith(stem) && w.length > stem.length && w.length - stem.length <= 3) return true;
      }
    }
    return false;
  }
  function phraseHit(text, toks, phrase){
    const p = clean(phrase);
    if (!p || BLOCK.has(p)) return false;
    if (p.includes(' ')){
      if (containsPhrase(text, p)) return true;
      const stripped = toks.map(t => strippedForms(t).pop()).join(' ');
      return containsPhrase(stripped, p);
    }
    for (const t of toks) if (wordHit(t, p)) return true;
    return false;
  }
  function autoCategoryId(title, rules){
    const text = clean(title);
    if (!text) return null;
    const toks = tokens(text);
    const list = rules || DATA.categories;
    let best = null;
    for (const rule of list){
      if (!rule || rule.id === 'important' || rule.id === 'other') continue;
      const phrases = rule.phrases || [];
      for (const phrase of phrases){
        if (!phraseHit(text, toks, phrase)) continue;
        const len = clean(phrase).length;
        const tie = DATA.tieOrder.indexOf(rule.id);
        const rank = tie < 0 ? 99 : tie;
        if (!best || len > best.len || (len === best.len && rank < best.rank)){
          best = { id: rule.id, len, rank };
        }
      }
    }
    return best ? best.id : null;
  }
  function colorIdCategory(colorId){
    if (colorId == null || colorId === '') return null;
    return DATA.colorMap[String(colorId)] || null;
  }
  return {
    DATA: DATA,
    categories: DATA.categories,
    clean: clean,
    autoCategoryId: autoCategoryId,
    colorIdCategory: colorIdCategory
  };
});
