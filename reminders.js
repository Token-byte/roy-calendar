'use strict';
/* Reminder defaults and the Google Calendar popup payload.
   In-app timers only run while the page is open. The popup is what rings when it is closed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Reminders = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isNotable(title, catId){
    if (catId === 'important') return true;
    const text = String(title || '');
    if (/ראיון|interview|שיחת היכרות/i.test(text)) return true;
    if (/(?:^|\s)חשוב(?:\s|$)/.test(text)) return true;
    return false;
  }
  function defaultMinutes(o){
    o = o || {};
    const base = o.settingsDefault == null || o.settingsDefault === '' ? 15 : Number(o.settingsDefault);
    if (isNotable(o.title, o.catId) && !(base >= 60)) return 60;
    return base;
  }
  function googleReminders(ev, email){
    const overrides = [];
    if (ev && ev.reminder != null && ev.reminder !== ''){
      const minutes = Number(ev.reminder);
      if (!Number.isNaN(minutes) && minutes >= 0){
        overrides.push({ method: 'popup', minutes: minutes });
        if (email) overrides.push({ method: 'email', minutes: minutes });
      }
    }
    return { useDefault: false, overrides };
  }
  return { isNotable, defaultMinutes, googleReminders };
});
