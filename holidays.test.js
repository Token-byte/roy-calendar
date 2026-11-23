'use strict';
const assert = require('assert');
const { classifyHoliday, isHolidayCalendar, labelOnDay } = require('./holidays.js');

const show = {
  'Hanukkah (Day 1)': 'חנוכה',
  'Hanukkah (Day 8)': 'זאת חנוכה',
  'Chanukah (Day 1)': 'חנוכה',
  'Passover (Day 1)': 'פסח',
  'Passover (Day 7)': 'שביעי של פסח',
  'Passover (Day 8)': 'אחרון של פסח',
  'Purim': 'פורים',
  'Rosh Hashana': 'ראש השנה',
  'Rosh Hashana (Day 2)': 'ראש השנה',
  "Rosh Hashanah": 'ראש השנה',
  'Shavuot': 'שבועות',
  'Shemini Atzeret / Simchat Torah': 'שמחת תורה',
  'Sukkot (Day 1)': 'סוכות',
  'Yom HaAtzmaut': 'יום העצמאות',
  "Yom Ha'atzmaut": 'יום העצמאות',
  'Yom Kippur': 'יום כיפור',
};
const hide = [
  'Hanukkah (Day 2)', 'Hanukkah (Day 6) / Rosh Chodesh Tevet', 'Hanukkah (Day 7)',
  'Passover (Day 2)', 'Passover (Day 3)', 'Passover (Day 6)', 'Passover Eve',
  'Sukkot (Day 2)', 'Sukkot (Day 7) / Hoshanah Rabah', 'Sukkot Eve',
  'Purim Eve', 'Shushan Purim', 'Purim Meshulash (Jerusalem only)',
  'Rosh Hashana Eve', 'Yom Kippur Eve', 'Shavuot Eve', 'Shavuot (Day 2)',
  'Tu Bishvat', 'Lag BaOmer', 'Tisha B\'Av', 'Tisha B\'Av Eve',
  '17th of Tammuz', 'Asarah B\'Tevet (Tenth of Tevet)', 'Fast of Esther', 'Gedaliah Fast',
  'Yom HaShoah', 'Yom HaZikaron', 'Jerusalem Day', 'Sigd',
  'Memorial Day for Ethiopian Jews',
];

let failed = 0;
function check(title, he){
  const got = classifyHoliday(title);
  const ok = he ? got.show && got.he === he : got.hide;
  if (!ok){ failed++; console.error('FAIL', title, 'expected', he || 'hide', 'got', got); }
  else console.log('ok', title, '->', he || 'hide');
}
for (const [title, he] of Object.entries(show)) check(title, he);
for (const title of hide) check(title);
const span = classifyHoliday('Hanukkah');
assert.strictEqual(span.span, 'first-last');
assert.strictEqual(span.heLast, 'זאת חנוכה');
assert.strictEqual(classifyHoliday('Sukkot').span, 'first');
assert.strictEqual(classifyHoliday('Passover').span, 'first-last');

const ev = { allDay: true, start: '2026-12-05', end: '2026-12-13', displayTitle: 'חנוכה', displayTitleLast: 'זאת חנוכה', holidaySpan: 'first-last' };
assert.strictEqual(labelOnDay(ev, '2026-12-05'), 'חנוכה');
assert.strictEqual(labelOnDay(ev, '2026-12-12'), 'זאת חנוכה');
assert.strictEqual(labelOnDay(ev, '2026-12-08'), null);
const suk = { allDay: true, start: '2026-09-26', end: '2026-10-03', displayTitle: 'סוכות', holidaySpan: 'first' };
assert.strictEqual(labelOnDay(suk, '2026-09-26'), 'סוכות');
assert.strictEqual(labelOnDay(suk, '2026-09-27'), null);

assert.strictEqual(isHolidayCalendar({ id: 'en.israeli#holiday@group.v.calendar.google.com', summary: 'Holidays in Israel' }), true);
assert.strictEqual(isHolidayCalendar({ id: 'en.judaism#holiday@group.v.calendar.google.com', summary: 'Jewish Holidays' }), true);
assert.strictEqual(isHolidayCalendar({ id: 'en.usa#holiday@group.v.calendar.google.com', summary: 'Holidays in the United States' }), false);
assert.strictEqual(isHolidayCalendar({ id: 'primary', summary: 'Roy' }), false);

assert.strictEqual(failed, 0, failed + ' holiday cases failed');
console.log('holiday cases passed');
