'use strict';
const assert = require('assert');
const fs = require('fs');
const { FONT_FILES, requiredFontLoads } = require('./story-card.js');

const sw = fs.readFileSync(__dirname + '/sw.js', 'utf8');
const css = fs.readFileSync(__dirname + '/styles.css', 'utf8');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(sw.includes("const CACHE = 'roy-cal-v2.4.1'"));
assert.ok(!sw.includes('roy-cal-v2.4.0'));
FONT_FILES.forEach(file => {
  assert.ok(fs.existsSync(__dirname + '/' + file), file);
  assert.ok(sw.includes(file), file);
});
requiredFontLoads().forEach(spec => {
  assert.ok(spec.includes('Anton') || spec.includes('Varela Round'), spec);
});
assert.ok(css.includes("font-family:'Anton'"));
assert.ok(css.includes("font-family:'Varela Round'"));
assert.ok(css.includes('fonts/anton-400.woff2'));
assert.ok(css.includes('fonts/varela-round-hebrew-400.woff2'));
assert.ok(css.includes('fonts/varela-round-latin-400.woff2'));
assert.ok(!html.includes('fonts.googleapis.com'));
assert.ok(html.includes('story-card.js'));
assert.ok(html.includes('reminders.js'));
console.log('story-card font shell passed');
