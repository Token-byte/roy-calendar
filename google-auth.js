'use strict';
/* Pure helpers for the same-window Google sign-in used by the iPhone home-screen app.
   A popup leaves that app, so the consent page has to replace this page and come back. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GoogleAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PAGES_ORIGIN = 'https://token-byte.github.io';
  const PAGES_REDIRECT = 'https://token-byte.github.io/roy-calendar/';
  function redirectUri(origin, pathname){
    if (origin === PAGES_ORIGIN) return PAGES_REDIRECT;
    let path = pathname || '/';
    path = path.replace(/index\.html$/, '');
    if (!path.endsWith('/')) path += '/';
    return origin + path;
  }
  function resolveClientId(def, stored, userSet){
    const d = String(def || '').trim();
    const s = String(stored || '').trim();
    if (userSet && s && s !== d) return { id: s, replaceStored: false };
    return { id: d || s, replaceStored: !!d && s !== d };
  }
  function buildGoogleAuthUrl(o){
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', o.clientId);
    u.searchParams.set('redirect_uri', o.redirectUri);
    u.searchParams.set('response_type', 'token');
    u.searchParams.set('scope', o.scope);
    u.searchParams.set('include_granted_scopes', 'true');
    u.searchParams.set('prompt', o.prompt || 'consent');
    if (o.loginHint) u.searchParams.set('login_hint', o.loginHint);
    if (o.state) u.searchParams.set('state', o.state);
    return u.toString();
  }
  function parseOAuthHash(hash){
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return null;
    const q = new URLSearchParams(raw);
    if (!q.get('access_token') && !q.get('error')) return null;
    return {
      access_token: q.get('access_token') || '',
      expires_in: Number(q.get('expires_in') || 0),
      error: q.get('error') || '',
      state: q.get('state') || ''
    };
  }
  const RENEW_LEAD_MS = 5 * 60 * 1000;
  const SILENT_RETRY_MS = 6 * 60 * 60 * 1000;
  const REDIRECT_COOLDOWN_MS = 90 * 1000;
  function renewDecision(s){
    s = s || {};
    const now = Number(s.now) || 0;
    if (!s.connected || !s.online || !s.hasClient) return 'none';
    if (s.sheetOpen) return 'none';
    const exp = Number(s.tokenExp) || 0;
    if (exp > now + RENEW_LEAD_MS) return 'none';
    const pendingAt = Number(s.oauthPendingAt) || 0;
    if (pendingAt && now - pendingAt < REDIRECT_COOLDOWN_MS) return 'none';
    if (s.needInteractive){
      const failedAt = Number(s.silentFailedAt) || 0;
      if (!failedAt || now - failedAt < SILENT_RETRY_MS) return 'none';
    }
    return s.standalone ? 'redirect' : 'gis';
  }
  return {
    redirectUri, buildGoogleAuthUrl, parseOAuthHash, resolveClientId, renewDecision,
    RENEW_LEAD_MS, SILENT_RETRY_MS, REDIRECT_COOLDOWN_MS, PAGES_REDIRECT
  };
});
