'use strict';
const assert = require('assert');
const { topPeople, isInterview, weekStreak, topWorkout, monthStats } = require('./wrap-extra.js');

const people = topPeople([
  'פגישה עם דני כהן בערב',
  'עם דני כהן',
  'אצל פולי',
  'Climbing with Dana',
  'עם אמא'
], ['פולי']);
assert.strictEqual(people[0].name, 'דני כהן');
assert.strictEqual(people[0].n, 2);
assert.deepStrictEqual(people.map(p => p.name).slice(1).sort(), ['Dana', 'אמא']);
assert.strictEqual(isInterview('ראיון עבודה'), true);
assert.strictEqual(isInterview('שיחת היכרות עם נועה'), true);
assert.strictEqual(isInterview('אימון בוקר'), false);
assert.strictEqual(weekStreak(['2026-01-04', '2026-01-11', '2026-01-25']), 2);
assert.strictEqual(weekStreak(['2026-01-06', '2026-01-07']), 1);
assert.strictEqual(topWorkout(['בולדרינג', 'בולדרינג', 'ריצה']).name, 'בולדרינג');
const months = monthStats(['2026-01-02', '2026-01-03', '2026-02-01'], ['2026-01', '2026-02', '2026-03']);
assert.strictEqual(months.busy.key, '2026-01');
assert.strictEqual(months.quiet.key, '2026-03');
assert.strictEqual(months.quiet.n, 0);
console.log('wrap-extra cases passed');
