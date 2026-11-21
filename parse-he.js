'use strict';
/* Hebrew event phrase → { title, date, time, allDay, durationMin, reminderMinutes, rrule }.
   Pure: no DOM. `now` is a Date; all calendar math is local time. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HeParse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const MONTH_ALT = { 'מרס': 2 };
  const DAY_NAMES = [
    ['שלישי', 2], ['רביעי', 3], ['חמישי', 4], ['ראשון', 0], ['שישי', 5], ['שבת', 6], ['שני', 1],
  ];
  const BYDAY = ['SU','MO','TU','WE','TH','FR','SA'];
  const HOUR_WORDS = [
    ['שתים עשרה', 12], ['שתיים עשרה', 12], ['שתים-עשרה', 12], ['שתיים-עשרה', 12],
    ['אחת עשרה', 11], ['אחת-עשרה', 11],
    ['שתיים', 2], ['שתים', 2], ['שלוש', 3], ['ארבע', 4], ['חמש', 5], ['שש', 6],
    ['שבע', 7], ['שמונה', 8], ['תשע', 9], ['עשר', 10], ['אחת', 1],
  ];

  function pad(n){ return String(n).padStart(2, '0'); }
  function keyOf(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function atMidnight(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n){ const x = atMidnight(d); x.setDate(x.getDate() + n); return x; }
  function nextWeekday(now, weekday){
    const d = atMidnight(now);
    const delta = (weekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + delta);
    return d;
  }
  function clampDate(year, monthIndex, day){
    const dim = new Date(year, monthIndex + 1, 0).getDate();
    const d = Math.min(Math.max(1, day), dim);
    return new Date(year, monthIndex, d);
  }
  function preferFuture(now, date){
    const today = atMidnight(now);
    if (date >= today) return date;
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }

  function normalize(s){
    return String(s || '')
      .replace(/[\u05F3\u05F4'"`]/g, '')
      .replace(/[־–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function strip(text, re){
    const m = re.exec(text);
    if (!m) return null;
    return { match: m, text: (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() };
  }

  function extractReminder(text){
    const rules = [
      [/חצי\s+שעה\s+לפני/, 30],
      [/רבע\s+שעה\s+לפני/, 15],
      [/שעתיים\s+לפני/, 120],
      [/שעה\s+ו?חצי\s+לפני/, 90],
      [/שעה\s+לפני/, 60],
      [/יום\s+לפני/, 1440],
      [/(\d+)\s*דקות?\s+לפני/, null],
      [/(\d+)\s*שעות?\s+לפני/, null],
    ];
    let minutes = null;
    for (const [re, fixed] of rules){
      const wrapped = new RegExp('(?:תזכ(?:יר|ירי|ורת)(?:\\s+לי)?\\s+)?' + re.source, '');
      const hit = strip(text, wrapped);
      if (!hit) continue;
      if (fixed != null) minutes = fixed;
      else if (re.source.startsWith('(\\d+)\\s*שעות')) minutes = Number(hit.match[1]) * 60;
      else minutes = Number(hit.match[1]);
      text = hit.text;
      break;
    }
    text = text.replace(/תזכ(?:יר|ירי|ורת)(?:\s+לי)?/g, ' ').replace(/\s+/g, ' ').trim();
    return { text, minutes };
  }

  function extractRecurrence(text){
    let rrule = null;
    let weekday = null;
    let hit = strip(text, /כל\s+יום\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/);
    if (hit){
      weekday = DAY_NAMES.find(d => d[0] === hit.match[1])[1];
      rrule = 'FREQ=WEEKLY;BYDAY=' + BYDAY[weekday];
      return { text: hit.text, rrule, weekday };
    }
    hit = strip(text, /כל\s+יום(?!\s+(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת))/);
    if (hit) return { text: hit.text, rrule: 'FREQ=DAILY', weekday: null };
    hit = strip(text, /כל\s+שבוע/);
    if (hit) return { text: hit.text, rrule: 'FREQ=WEEKLY', weekday: null };
    hit = strip(text, /כל\s+חודש/);
    if (hit) return { text: hit.text, rrule: 'FREQ=MONTHLY', weekday: null };
    return { text, rrule, weekday };
  }

  function extractAbsoluteDate(text, now){
    const months = MONTHS.map((name, i) => [name, i]).concat(Object.entries(MONTH_ALT).map(([n, i]) => [n, i]));
    const monthRe = new RegExp('(\\d{1,2})\\s+ב?(' + months.map(m => m[0]).join('|') + ')');
    let hit = strip(text, monthRe);
    if (hit){
      const day = Number(hit.match[1]);
      const monthIndex = months.find(m => m[0] === hit.match[2])[1];
      let year = now.getFullYear();
      const date = preferFuture(now, clampDate(year, monthIndex, day));
      return { text: hit.text, date };
    }
    hit = strip(text, /(\d{1,2})[./\-](\d{1,2})(?:[./\-](\d{2,4}))?/);
    if (hit){
      const a = Number(hit.match[1]), b = Number(hit.match[2]);
      const yraw = hit.match[3];
      const monthOk = b >= 1 && b <= 12 && a >= 1 && a <= 31;
      if (!monthOk) return { text, date: null, restored: hit.match[0] };
      let year = now.getFullYear();
      if (yraw) year = yraw.length === 2 ? 2000 + Number(yraw) : Number(yraw);
      let date = clampDate(year, b - 1, a);
      if (!yraw) date = preferFuture(now, date);
      return { text: hit.text, date };
    }
    return { text, date: null };
  }

  function extractRelative(text, now){
    let hit = strip(text, /מחרתיים/);
    if (hit) return { text: hit.text, date: addDays(now, 2), weekday: null };
    hit = strip(text, /מחר/);
    if (hit) return { text: hit.text, date: addDays(now, 1), weekday: null };
    hit = strip(text, /היום/);
    if (hit) return { text: hit.text, date: atMidnight(now), weekday: null };
    hit = strip(text, /(?:^|\s)(?:ביום|יום)\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?=\s|$)/);
    if (!hit) hit = strip(text, /(?:^|\s)(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?=\s|$)/);
    if (hit){
      const weekday = DAY_NAMES.find(d => d[0] === hit.match[1])[1];
      return { text: hit.text, date: nextWeekday(now, weekday), weekday };
    }
    return { text, date: null, weekday: null };
  }

  function applyPeriod(hour, minute, period){
    if (period === 'בערב' || period === 'בלילה'){
      if (hour >= 1 && hour <= 7) hour += 12;
      if (period === 'בלילה' && hour === 12) hour = 0;
    }
    if (period === 'בצהריים' || period === 'בצהרים'){
      if (hour >= 1 && hour <= 7) hour += 12;
      if (hour === 0) hour = 12;
    }
    return { hour, minute };
  }

  function hhmm(hour, minute){
    hour = ((hour % 24) + 24) % 24;
    minute = Math.max(0, Math.min(59, minute));
    return pad(hour) + ':' + pad(minute);
  }

  function extractTime(text){
    let period = null;
    const per = strip(text, /בערב|בצהריים|בצהרים|בבוקר|בלילה/);
    if (per){ period = per.match[0]; text = per.text; }

    const quarterToWord = strip(text, new RegExp('רבע\\s+ל-?\\s*(' + HOUR_WORDS.map(h => h[0]).join('|') + ')'));
    if (quarterToWord){
      const hour = HOUR_WORDS.find(h => h[0] === quarterToWord.match[1])[1];
      const adj = applyPeriod(hour, 0, period);
      let total = adj.hour * 60 + adj.minute - 15;
      if (total < 0) total += 24 * 60;
      return { text: quarterToWord.text, time: hhmm(Math.floor(total / 60), total % 60), period };
    }
    const quarterToNum = strip(text, /רבע\s+ל-?\s*(\d{1,2})(?!:\d)/);
    if (quarterToNum){
      const adj = applyPeriod(Number(quarterToNum.match[1]), 0, period);
      let total = adj.hour * 60 - 15;
      if (total < 0) total += 24 * 60;
      return { text: quarterToNum.text, time: hhmm(Math.floor(total / 60), total % 60), period };
    }

    const clock = strip(text, /(?:בשעה\s+|ב-?\s*)?(\d{1,2}):(\d{2})/);
    if (clock){
      const adj = applyPeriod(Number(clock.match[1]), Number(clock.match[2]), period);
      return { text: clock.text, time: hhmm(adj.hour, adj.minute), period };
    }
    const dotted = strip(text, /(?:בשעה\s+)(\d{1,2})\.(\d{2})/);
    if (dotted){
      const adj = applyPeriod(Number(dotted.match[1]), Number(dotted.match[2]), period);
      return { text: dotted.text, time: hhmm(adj.hour, adj.minute), period };
    }

    const wordRe = new RegExp('(?:בשעה\\s+|ב)?(' + HOUR_WORDS.map(h => h[0]).join('|') + ')(?:\\s+וחצי|\\s+ורבע)?');
    const word = strip(text, wordRe);
    if (word){
      let hour = HOUR_WORDS.find(h => h[0] === word.match[1])[1];
      let minute = 0;
      if (/וחצי/.test(word.match[0])) minute = 30;
      if (/ורבע/.test(word.match[0])) minute = 15;
      const adj = applyPeriod(hour, minute, period);
      return { text: word.text, time: hhmm(adj.hour, adj.minute), period };
    }

    const num = strip(text, /(?:בשעה\s+|ב-?\s*)(\d{1,2})(?:\s+וחצי|\s+ורבע)?(?!\d)/);
    if (num){
      let hour = Number(num.match[1]);
      let minute = 0;
      if (/וחצי/.test(num.match[0])) minute = 30;
      if (/ורבע/.test(num.match[0])) minute = 15;
      if (hour <= 24){
        const adj = applyPeriod(hour === 24 ? 0 : hour, minute, period);
        return { text: num.text, time: hhmm(adj.hour, adj.minute), period };
      }
    }

    if (period === 'בערב') return { text, time: '19:00', period };
    if (period === 'בצהריים' || period === 'בצהרים') return { text, time: '12:00', period };
    if (period === 'בבוקר') return { text, time: '09:00', period };
    if (period === 'בלילה') return { text, time: '21:00', period };
    return { text, time: null, period };
  }

  function extractDuration(text){
    const rules = [
      [/לשעה\s+וחצי/, 90],
      [/לשעתיים/, 120],
      [/לחצי\s+שעה/, 30],
      [/לשעה/, 60],
      [/ל-?\s*(\d+)\s*שעות/, null],
      [/ל-?\s*(\d+)\s*דקות/, null],
    ];
    for (const [re, fixed] of rules){
      const hit = strip(text, re);
      if (!hit) continue;
      const durationMin = fixed != null ? fixed : (re.source.includes('שעות') ? Number(hit.match[1]) * 60 : Number(hit.match[1]));
      return { text: hit.text, durationMin };
    }
    return { text, durationMin: null };
  }

  function cleanupTitle(text){
    return text
      .replace(/(?:^|\s)(?:בשעה|ביום|בערב|בבוקר|בצהריים|בצהרים|בלילה)(?=\s|$)/g, ' ')
      .replace(/(?:^|\s)ב-(?=\s|$)/g, ' ')
      .replace(/(?:^|\s)ב(?=\s|$)/g, ' ')
      .replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseHebrewEvent(input, now){
    now = now instanceof Date ? now : new Date();
    let text = normalize(input);
    const rem = extractReminder(text);
    text = rem.text;
    const rec = extractRecurrence(text);
    text = rec.text;
    const abs = extractAbsoluteDate(text, now);
    text = abs.text;
    let date = abs.date;
    let weekday = rec.weekday;
    if (!date){
      const rel = extractRelative(text, now);
      text = rel.text;
      date = rel.date;
      if (rel.weekday != null) weekday = rel.weekday;
    } else {
      const rel = extractRelative(text, now);
      text = rel.text;
    }
    const tm = extractTime(text);
    text = tm.text;
    const dur = extractDuration(text);
    text = dur.text;
    if (!date && weekday != null) date = nextWeekday(now, weekday);
    if (!date) date = atMidnight(now);
    let rrule = rec.rrule;
    if (rrule === 'FREQ=WEEKLY') rrule = 'FREQ=WEEKLY;BYDAY=' + BYDAY[date.getDay()];
    const title = cleanupTitle(text) || 'אירוע';
    return {
      title,
      date: keyOf(date),
      time: tm.time,
      allDay: !tm.time,
      durationMin: dur.durationMin || 60,
      reminderMinutes: rem.minutes,
      rrule,
      weekday: date.getDay(),
    };
  }

  return { parseHebrewEvent, normalize };
});
