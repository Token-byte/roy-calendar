'use strict';
const assert = require('assert');
const { parseHebrewEvent } = require('./parse-he.js');

const NOW = new Date(2026, 10, 21, 15, 0, 0); // Saturday 21 Nov 2026

function p(text, now){ return parseHebrewEvent(text, now || NOW); }

const cases = [
  ['יום ראשון בשעה 12:00 טיפוס', { title: 'טיפוס', date: '2026-11-22', time: '12:00', allDay: false, rrule: null }],
  ['מחר ב-12 וחצי ריצה', { title: 'ריצה', date: '2026-11-22', time: '12:30', allDay: false }],
  ['היום בשתיים בערב פגישה', { title: 'פגישה', date: '2026-11-21', time: '14:00', allDay: false }],
  ['5.12 ביטוח לאומי', { title: 'ביטוח לאומי', date: '2026-12-05', allDay: true, time: null }],
  ['5 בדצמבר בשעה 9:30 רופא', { title: 'רופא', date: '2026-12-05', time: '09:30' }],
  ['כל יום ראשון בשעה 19:00 טיפוס', { title: 'טיפוס', date: '2026-11-22', time: '19:00', rrule: 'FREQ=WEEKLY;BYDAY=SU' }],
  ['מחרתיים תזכיר לי חצי שעה לפני בשמונה בבוקר אימון', { title: 'אימון', date: '2026-11-23', time: '08:00', reminderMinutes: 30 }],
  ['כל שבוע יום שלישי ב-18:00 יוגה', { title: 'יוגה', date: '2026-11-24', time: '18:00', rrule: 'FREQ=WEEKLY;BYDAY=TU' }],
  ['רבע לשבע בערב ארוחה מחר', { title: 'ארוחה', date: '2026-11-22', time: '18:45' }],
  ['ביום חמישי בצהריים שיחה', { title: 'שיחה', date: '2026-11-26', time: '12:00' }],
  ['מחר בערב טיפוס', { title: 'טיפוס', date: '2026-11-22', time: '19:00' }],
  ['15/1/27 ראיון עבודה בשעה 10:00', { title: 'ראיון עבודה', date: '2027-01-15', time: '10:00' }],
  ['כל יום ב-8:00 ריצה', { title: 'ריצה', date: '2026-11-21', time: '08:00', rrule: 'FREQ=DAILY' }],
  ['היום תזכיר לי 10 דקות לפני ב-16:00 שיחת זום', { title: 'שיחת זום', time: '16:00', reminderMinutes: 10 }],
  ['יום שבת בשעה 20:30 ארוחת שישי', { title: 'ארוחת שישי', date: '2026-11-21', time: '20:30' }],
  ['היום בשתיים בלילה טיסה', { title: 'טיסה', date: '2026-11-21', time: '02:00' }],
  ['מחר בעשר בלילה הופעה', { title: 'הופעה', date: '2026-11-22', time: '22:00' }],
];

let failed = 0;
for (const [input, expect] of cases){
  const got = p(input);
  const problems = [];
  for (const k of Object.keys(expect)){
    if (got[k] !== expect[k]) problems.push(k + ': expected ' + JSON.stringify(expect[k]) + ' got ' + JSON.stringify(got[k]));
  }
  if (problems.length){
    failed++;
    console.error('FAIL', JSON.stringify(input));
    console.error(' ', problems.join('\n  '));
    console.error(' ', JSON.stringify(got));
  } else {
    console.log('ok', input);
  }
}

assert.strictEqual(failed, 0, failed + ' parser cases failed');
console.log(cases.length + ' parser cases passed');
