'use strict';
const assert = require('assert');
const { isNotable, defaultMinutes, googleReminders } = require('./reminders.js');

assert.strictEqual(isNotable('ראיון עבודה', ''), true);
assert.strictEqual(isNotable('Interview', 'work'), true);
assert.strictEqual(isNotable('שיחת היכרות עם דנה', ''), true);
assert.strictEqual(isNotable('קפה', 'important'), true);
assert.strictEqual(isNotable('חשוב לשלם', ''), true);
assert.strictEqual(isNotable('ריצה', 'sport'), false);

assert.strictEqual(defaultMinutes({ title: 'ריצה', settingsDefault: 15 }), 15);
assert.strictEqual(defaultMinutes({ title: 'ראיון', settingsDefault: 15 }), 60);
assert.strictEqual(defaultMinutes({ title: 'קפה', catId: 'important', settingsDefault: 15 }), 60);
assert.strictEqual(defaultMinutes({ title: 'ראיון', settingsDefault: 120 }), 120);
assert.strictEqual(defaultMinutes({ title: 'ראיון', settingsDefault: -1 }), 60);
assert.strictEqual(defaultMinutes({ title: 'ריצה', settingsDefault: -1 }), -1);
assert.strictEqual(defaultMinutes({ title: 'ריצה' }), 15);

const popup = googleReminders({ reminder: 60 }, false);
assert.deepStrictEqual(popup, { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] });
const both = googleReminders({ reminder: '15' }, true);
assert.deepStrictEqual(both.overrides, [
  { method: 'popup', minutes: 15 },
  { method: 'email', minutes: 15 }
]);
assert.deepStrictEqual(googleReminders({ reminder: 0 }, false).overrides, [{ method: 'popup', minutes: 0 }]);
assert.deepStrictEqual(googleReminders({ reminder: -1 }, false), { useDefault: false, overrides: [] });
assert.deepStrictEqual(googleReminders({ reminder: null }, true), { useDefault: false, overrides: [] });
console.log('reminders cases passed');
