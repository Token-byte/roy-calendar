'use strict';
const assert = require('assert');
const fs = require('fs');
const { autoCategoryId, categories, clean } = require('./cats-auto.js');
const file = JSON.parse(fs.readFileSync(__dirname + '/categories.json', 'utf8'));

assert.deepStrictEqual(categories.map(c => c.id), file.categories.map(c => c.id));
categories.forEach((c, i) => {
  assert.deepStrictEqual(c.phrases, file.categories[i].phrases, c.id);
  assert.strictEqual(c.color.toLowerCase(), file.categories[i].color.toLowerCase());
});

const cases = [
  ['יום הולדת לאמא', 'family'],
  ['יום הולדת', 'family'],
  ['חתונה', 'family'],
  ['פולי', 'family'],
  ['טיפוס', 'sport'],
  ['האימון', 'sport'],
  ['ובאימון', 'sport'],
  ['חדר כושר', 'sport'],
  ['ריצה', 'sport'],
  ['עריכת סרטון', 'work'],
  ['Reel Works', 'work'],
  ['טראשטק', 'work'],
  ['רילס', 'work'],
  ['פסיכומטרי', 'study'],
  ['יום פתוח ברייכמן', 'study'],
  ['sat', 'study'],
  ['saturday class', null],
  ['Flight to Miami', 'travel'],
  ['הטיסה', 'travel'],
  ['Stay at hotel', 'travel'],
  ['דרכון', 'admin'],
  ['ישראכרט', 'admin'],
  ['אדיר מילר', 'culture'],
  ['J. Cole', 'culture'],
  ['פגישה', null],
  ['שיחה', null],
  ['ייעוץ', null],
  ['work', null],
  ['meeting', null],
  ['אח', null],
  ['run', 'sport'],
  ['running club', null],
  ['gym sat', 'study'],
  ['<b style="font-family: Arial">צילום</b>', 'work'],
  ['<span style="font-family:arial">hello</span>', null],
  ['\u202bמשפחה\u202c', 'family'],
  ['לקנות משהו', null],
  ['', null],
];

let failed = 0;
for (const [title, expect] of cases){
  const got = autoCategoryId(title);
  if (got !== expect){
    failed++;
    console.error('FAIL', JSON.stringify(title), 'expected', expect, 'got', got);
  } else console.log('ok', clean(title).slice(0, 40), '->', got);
}
assert.strictEqual(failed, 0, failed + ' category cases failed');
console.log(cases.length + ' category cases passed');
