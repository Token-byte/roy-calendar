'use strict';
const assert = require('assert');
const { autoCategoryId } = require('./cats-auto.js');

const cases = [
  ['יום הולדת לאמא', 'important'],
  ['יום הולדת', 'important'],
  ['יום נישואין', 'important'],
  ['חתונה', 'important'],
  ['טיפוס', 'sport'],
  ['אימון', 'sport'],
  ['ריצה', 'sport'],
  ['חדר כושר', 'sport'],
  ['בוקס', 'sport'],
  ['פגישה', 'work'],
  ['ראיון עבודה', 'work'],
  ['עבודה', 'work'],
  ['צילום', 'work'],
  ['עריכה', 'work'],
  ['לקוח', 'work'],
  ['אמא', 'personal'],
  ['רופא', 'personal'],
  ['חברים', 'personal'],
  ['ארוחה עם אבא', 'personal'],
  ['לקנות משהו', null],
  ['', null],
];

let failed = 0;
for (const [title, expect] of cases){
  const got = autoCategoryId(title);
  if (got !== expect){
    failed++;
    console.error('FAIL', JSON.stringify(title), 'expected', expect, 'got', got);
  } else console.log('ok', title, '->', got);
}
assert.strictEqual(failed, 0, failed + ' category cases failed');
console.log(cases.length + ' category cases passed');
