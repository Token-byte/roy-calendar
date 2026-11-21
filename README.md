# יומן של רוי

יומן PWA אישי בעברית, מינימליסטי: תצוגת חודש (ראשון עד שבת), יום ורשימה, צבע אוטומטי לפי סוג האירוע, סנכרון דו-כיווני עם Google Calendar ותזכורות.

- סטטי לגמרי, בלי שרת. נפרס ב-GitHub Pages.
- קטגוריות וצבעים: לפי מילות מפתח בכותרת, ניתנות לעריכה בהגדרות. נשמרות בטלפון.
- `config.js`: אפשר להדביק `GOOGLE_CLIENT_ID` כדי לדלג על ההדבקה באפליקציה.
- Google OAuth: Web application client, Authorized JavaScript origin = `https://token-byte.github.io`, Authorized redirect URI = `https://token-byte.github.io/roy-calendar/`. The iPhone home-screen app signs in by a full-page redirect so the login stays in that install. Safari and Mac use a Google popup.
- הרשאות: `calendar.events`, `calendar.calendarlist.readonly`.
