'use strict';
const assert = require('assert');
const { shouldPreserveEvent } = require('./sync-keep.js');

const pending = new Set(['waiting']);
assert.strictEqual(shouldPreserveEvent('local-abc', { calId: 'primary@gmail.com', pending: true }, pending), true);
assert.strictEqual(shouldPreserveEvent('local-abc', { calId: 'primary@gmail.com' }, new Set()), true);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'local', pending: false }, new Set()), true);
assert.strictEqual(shouldPreserveEvent('waiting', { calId: 'primary@gmail.com' }, pending), true);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'primary@gmail.com', pending: false }, new Set()), false);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'primary@gmail.com', deleted: true }, pending), false);
console.log('6 sync-keep cases passed');
