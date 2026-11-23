'use strict';
/* Holidays in Israel / Jewish holiday calendars. The app only shows the
   days Roy asked for, under Hebrew names. Nothing is written back to Google. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IsraelHolidays = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function norm(s){
    return String(s || '')
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function dayNum(t){
    const m = t.match(/\bday\s*(\d+)\b/) || t.match(/\b(\d+)(?:st|nd|rd|th)\s+day\b/);
    return m ? Number(m[1]) : 0;
  }
  function isHolidayCalendar(cal){
    if (!cal) return false;
    const id = decodeURIComponent(cal.id || '').toLowerCase();
    const name = String(cal.summary || cal.summaryOverride || '').toLowerCase();
    if (name.includes('holidays in israel') || name.includes('חגים בישראל')) return true;
    if (name.includes('jewish holidays') || name.includes('חגים יהודיים')) return true;
    if (/holiday@group\.v\.calendar\.google\.com/.test(id) && /israel|jewish|judaism|hebrew/.test(id)) return true;
    return false;
  }
  function classifyHoliday(title){
    const t = norm(title);
    if (!t) return { hide: true };
    if (/\beve\b/.test(t) || t.startsWith('erev ')) return { hide: true };
    const day = dayNum(t);
    if (/hanuk|chanuk/.test(t)){
      if (day === 1) return { show: true, he: 'חנוכה', span: 'all' };
      if (day === 8) return { show: true, he: 'זאת חנוכה', span: 'all' };
      if (day) return { hide: true };
      return { show: true, he: 'חנוכה', heLast: 'זאת חנוכה', span: 'first-last' };
    }
    if (/passover|pesach/.test(t)){
      if (day === 1) return { show: true, he: 'פסח', span: 'all' };
      if (day === 7) return { show: true, he: 'שביעי של פסח', span: 'all' };
      if (day === 8) return { show: true, he: 'אחרון של פסח', span: 'all' };
      if (day) return { hide: true };
      return { show: true, he: 'פסח', heLast: 'שביעי של פסח', span: 'first-last' };
    }
    if (/sukkot|succot/.test(t)){
      if (day === 1) return { show: true, he: 'סוכות', span: 'all' };
      if (day) return { hide: true };
      return { show: true, he: 'סוכות', span: 'first' };
    }
    if (/rosh hashana/.test(t)) return { show: true, he: 'ראש השנה', span: 'all' };
    if (/yom kippur/.test(t)) return { show: true, he: 'יום כיפור', span: 'all' };
    if (/simchat torah|shemini atzeret|shmini atzeret/.test(t)) return { show: true, he: 'שמחת תורה', span: 'all' };
    if (/shushan purim|purim meshulash/.test(t)) return { hide: true };
    if (/\bpurim\b/.test(t)) return { show: true, he: 'פורים', span: 'all' };
    if (/shavuot/.test(t)){
      if (day > 1) return { hide: true };
      return { show: true, he: 'שבועות', span: 'all' };
    }
    if (/yom hazikaron|yom hazikaron/.test(t)) return { hide: true };
    if (/yom haatzmaut|yom ha atzmaut|independence day/.test(t)) return { show: true, he: 'יום העצמאות', span: 'all' };
    return { hide: true };
  }
  function addDaysKey(key, n){
    const [y, m, d] = String(key).slice(0, 10).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    const p = (x) => String(x).padStart(2, '0');
    return dt.getFullYear() + '-' + p(dt.getMonth() + 1) + '-' + p(dt.getDate());
  }
  function labelOnDay(ev, dayKey){
    if (!ev) return null;
    const span = ev.holidaySpan || 'all';
    const start = String(ev.allDay ? ev.start : ev.startKey || '').slice(0, 10);
    let last = start;
    if (ev.allDay && ev.end){
      last = addDaysKey(String(ev.end).slice(0, 10), -1);
      if (last < start) last = start;
    }
    if (!start || !dayKey || dayKey < start || dayKey > last) return null;
    if (span === 'first') return dayKey === start ? (ev.displayTitle || ev.title) : null;
    if (span === 'first-last'){
      if (dayKey === start) return ev.displayTitle || ev.title;
      if (dayKey === last && last !== start) return ev.displayTitleLast || ev.displayTitle || ev.title;
      return null;
    }
    return ev.displayTitle || ev.title;
  }
  return { isHolidayCalendar, classifyHoliday, labelOnDay, norm };
});
