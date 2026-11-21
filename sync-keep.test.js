'use strict';
const assert = require('assert');
const { shouldPreserveEvent, isLocalOnlyEvent } = require('./sync-keep.js');

const pending = new Set(['waiting']);
assert.strictEqual(shouldPreserveEvent('local-abc', { calId: 'primary@gmail.com', pending: true }, pending), true);
assert.strictEqual(shouldPreserveEvent('local-abc', { calId: 'primary@gmail.com' }, new Set()), true);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'local', pending: false }, new Set()), true);
assert.strictEqual(shouldPreserveEvent('waiting', { calId: 'primary@gmail.com' }, pending), true);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'primary@gmail.com', pending: false }, new Set()), false);
assert.strictEqual(shouldPreserveEvent('google-id', { calId: 'primary@gmail.com', deleted: true }, pending), false);
assert.strictEqual(isLocalOnlyEvent('local-1', { calId: 'local' }), true);
assert.strictEqual(isLocalOnlyEvent('g1', { calId: 'local' }), true);
assert.strictEqual(isLocalOnlyEvent('g1', { calId: 'a@gmail.com' }), false);
assert.strictEqual(isLocalOnlyEvent('local-1', { calId: 'local', deleted: true }), false);
console.log('10 sync-keep cases passed');
