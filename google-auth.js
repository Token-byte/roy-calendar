'use strict';
/* Pure helpers for the same-window Google sign-in used by the iPhone home-screen app.
   A popup leaves that app, so the consent page has to replace this page and come back. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GoogleAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function redirectUri(origin, pathname){
    let path = pathname || '/';
    path = path.replace(/index\.html$/, '');
    if (!path.endsWith('/')) path += '/';
    return origin + path;
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
  return { redirectUri, buildGoogleAuthUrl, parseOAuthHash };
});
