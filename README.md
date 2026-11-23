# יומן של רוי

יומן PWA אישי בעברית, מינימליסטי: תצוגת חודש (ראשון עד שבת), יום ורשימה, צבע אוטומטי לפי סוג האירוע, סנכרון דו-כיווני עם Google Calendar ותזכורות.

- סטטי לגמרי, בלי שרת. נפרס ב-GitHub Pages.
- קטגוריות וצבעים: לפי מילות מפתח בכותרת, ניתנות לעריכה בהגדרות. נשמרות בטלפון.
- `config.js`: `GOOGLE_CLIENT_ID` is the public web client. A different id typed in settings is kept; an older stored id is replaced.
- Google OAuth: Web application client, Authorized JavaScript origin = `https://token-byte.github.io`, Authorized redirect URI = `https://token-byte.github.io/roy-calendar/`. The installed home-screen app signs in by a full-page redirect. Safari and Mac use a Google popup. No client secret.
- הרשאות: `https://www.googleapis.com/auth/calendar`. The consent screen is in Testing; the test user continues past the unverified-app page.
