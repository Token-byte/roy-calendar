# יומן של רוי

יומן PWA אישי בעברית, מינימליסטי: תצוגת חודש (ראשון עד שבת), יום ורשימה, צבע אוטומטי לפי סוג האירוע, סנכרון דו-כיווני עם Google Calendar ותזכורות.

- סטטי לגמרי, בלי שרת. נפרס ב-GitHub Pages.
- קטגוריות וצבעים: לפי מילות מפתח בכותרת, ניתנות לעריכה בהגדרות. נשמרות בטלפון.
- `config.js`: אפשר להדביק `GOOGLE_CLIENT_ID` כדי לדלג על ההדבקה באפליקציה.
- Google OAuth: Web application client, Authorized JavaScript origin = `https://token-byte.github.io`.
- הרשאות: `calendar.events`, `calendar.calendarlist.readonly`.
