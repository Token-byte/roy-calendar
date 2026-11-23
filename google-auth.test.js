'use strict';
const assert = require('assert');
const { redirectUri, buildGoogleAuthUrl, parseOAuthHash, resolveClientId } = require('./google-auth.js');
const CLIENT = '155342303431-bgvi9gq0rgab2s6vtj09f83ge4psbqkv.apps.googleusercontent.com';

assert.strictEqual(redirectUri('https://token-byte.github.io', '/roy-calendar/'), 'https://token-byte.github.io/roy-calendar/');
assert.strictEqual(redirectUri('https://token-byte.github.io', '/roy-calendar/index.html'), 'https://token-byte.github.io/roy-calendar/');
assert.strictEqual(redirectUri('https://token-byte.github.io', '/roy-calendar'), 'https://token-byte.github.io/roy-calendar/');
assert.strictEqual(redirectUri('http://127.0.0.1:8765', '/'), 'http://127.0.0.1:8765/');

const replaced = resolveClientId(CLIENT, 'old.apps.googleusercontent.com', false);
assert.strictEqual(replaced.id, CLIENT);
assert.strictEqual(replaced.replaceStored, true);
const kept = resolveClientId(CLIENT, 'other.apps.googleusercontent.com', true);
assert.strictEqual(kept.id, 'other.apps.googleusercontent.com');
assert.strictEqual(kept.replaceStored, false);
const same = resolveClientId(CLIENT, CLIENT, false);
assert.strictEqual(same.id, CLIENT);
assert.strictEqual(same.replaceStored, false);

const url = new URL(buildGoogleAuthUrl({
  clientId: 'abc.apps.googleusercontent.com',
  redirectUri: 'https://token-byte.github.io/roy-calendar/',
  scope: 'https://www.googleapis.com/auth/calendar.events',
  prompt: 'consent',
  state: 's1',
  loginHint: 'roifridman24@gmail.com'
}));
assert.strictEqual(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
assert.strictEqual(url.searchParams.get('response_type'), 'token');
assert.strictEqual(url.searchParams.get('redirect_uri'), 'https://token-byte.github.io/roy-calendar/');
assert.strictEqual(url.searchParams.get('login_hint'), 'roifridman24@gmail.com');
assert.strictEqual(url.searchParams.get('prompt'), 'consent');
assert.strictEqual(url.searchParams.get('state'), 's1');

const ok = parseOAuthHash('#access_token=ya29.x&expires_in=3600&state=s1');
assert.strictEqual(ok.access_token, 'ya29.x');
assert.strictEqual(ok.expires_in, 3600);
assert.strictEqual(ok.state, 's1');
const err = parseOAuthHash('#error=interaction_required&state=silent');
assert.strictEqual(err.error, 'interaction_required');
assert.strictEqual(parseOAuthHash(''), null);
assert.strictEqual(parseOAuthHash('#year'), null);
console.log('google-auth cases passed');
