'use strict';
const assert = require('assert');
const { redirectUri, buildGoogleAuthUrl, parseOAuthHash, resolveClientId, renewDecision, RENEW_LEAD_MS, SILENT_RETRY_MS, REDIRECT_COOLDOWN_MS } = require('./google-auth.js');
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

const now = Date.UTC(2026, 10, 24, 12, 0, 0);
const base = { connected: true, online: true, hasClient: true, standalone: true, now, sheetOpen: false };
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now - 1000 })), 'redirect');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now - 1000, standalone: false })), 'gis');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now - 1000, online: false })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now - 1000, connected: false })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now + 30 * 60000 })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now + RENEW_LEAD_MS - 1000 })), 'redirect');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: now + 2 * 60000, sheetOpen: true })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: 0, needInteractive: true, silentFailedAt: now - 1000 })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: 0, needInteractive: true, silentFailedAt: now - SILENT_RETRY_MS - 1000 })), 'redirect');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: 0, oauthPendingAt: now - 1000 })), 'none');
assert.strictEqual(renewDecision(Object.assign({}, base, { tokenExp: 0, oauthPendingAt: now - REDIRECT_COOLDOWN_MS - 1000 })), 'redirect');

const silent = new URL(buildGoogleAuthUrl({
  clientId: 'abc.apps.googleusercontent.com',
  redirectUri: 'https://token-byte.github.io/roy-calendar/',
  scope: 'https://www.googleapis.com/auth/calendar',
  prompt: 'none',
  state: 'silent'
}));
assert.strictEqual(silent.searchParams.get('prompt'), 'none');
assert.strictEqual(silent.searchParams.get('response_type'), 'token');
console.log('google-auth cases passed');
