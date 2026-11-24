'use strict';
const assert = require('assert');
const { empty, merge, parse, hasContent, SUGGESTED_BOOKS, isProtected, blocksDelete, privateProps } = require('./yearbook.js');

const local = empty();
local.updatedAt = 10;
local.word = 'שקט';
const remote = empty();
remote.updatedAt = 20;
remote.goal = 'לטוס';
remote.books = [{ title: 'Atomic Habits', author: 'James Clear', audio: true, favorite: true }];
assert.strictEqual(merge(local, remote).goal, 'לטוס');
assert.strictEqual(merge(remote, local).goal, 'לטוס');
assert.strictEqual(merge(local, null).word, 'שקט');
const text = JSON.stringify(remote);
assert.strictEqual(parse(text).books[0].title, 'Atomic Habits');
assert.strictEqual(parse('nope'), null);
assert.strictEqual(hasContent(empty()), false);
assert.strictEqual(hasContent(local), true);
assert.strictEqual(SUGGESTED_BOOKS.length, 4);
assert.ok(SUGGESTED_BOOKS.some(b => b.title === '$100M Offers'));

const book = { id: 'yb1', title: 'יומן שנה', start: '2000-01-01', royKind: 'yearbook' };
assert.strictEqual(isProtected(book), true);
assert.strictEqual(isProtected({ title: 'יומן שנה', start: '2000-01-01' }), true);
assert.strictEqual(isProtected({ title: 'יומן שנה', start: { date: '2000-01-01' } }), true);
assert.strictEqual(isProtected({ royKind: 'yearbook', title: 'אחר', start: '2026-01-01' }), true);
assert.strictEqual(isProtected({ title: 'יומן שנה', start: '2026-05-01' }), false);
assert.strictEqual(isProtected({ title: 'ריצה', start: '2000-01-01' }), false);
assert.strictEqual(isProtected(null), false);

assert.strictEqual(blocksDelete('DELETE', '/calendars/primary/events/' + encodeURIComponent('yb1'), { knownId: 'yb1' }), true);
assert.strictEqual(blocksDelete('DELETE', '/calendars/primary/events/other', { knownId: 'yb1', event: { title: 'ריצה', start: '2026-11-26' } }), false);
assert.strictEqual(blocksDelete('DELETE', '/calendars/primary/events/yb1', { events: { yb1: book } }), true);
assert.strictEqual(blocksDelete('PATCH', '/calendars/primary/events/yb1', { knownId: 'yb1', event: book }), false);
assert.strictEqual(blocksDelete('DELETE', '/calendars/primary/events/note', { event: { title: 'פתק', start: '2026-11-26' } }), false);

const kept = privateProps({ title: 'יומן שנה', start: '2000-01-01', royKind: '' }, 'work');
assert.strictEqual(kept.royKind, 'yearbook');
assert.strictEqual(kept.royCat, 'work');
const stripped = privateProps({ title: 'ראיון', royKind: 'yearbook' }, '');
assert.strictEqual(stripped.royKind, 'yearbook');
const normal = privateProps({ title: 'ריצה' }, 'sport');
assert.strictEqual(normal.royKind, undefined);
assert.strictEqual(normal.royCat, 'sport');
const custom = privateProps({ title: 'ריצה', royKind: 'custom' }, '');
assert.strictEqual(custom.royKind, 'custom');
console.log('yearbook cases passed');
