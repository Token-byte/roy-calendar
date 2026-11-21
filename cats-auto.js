'use strict';
/* Auto category from a Hebrew (or English) event title.
   First matching group wins. Extend by adding a phrase to the right group.
   Manual event.cat overrides this; callers decide that. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CatsAuto = api; root.autoCategoryId = api.autoCategoryId; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const RULES = [
    { id: 'important', phrases: ['יום הולדת', 'יום נישואין', 'יום נישואים', 'חתונה', 'יום שנה', 'בר מצווה', 'בת מצווה', 'birthday', 'anniversary', 'wedding'] },
    { id: 'sport', phrases: ['חדר כושר', 'טיפוס', 'אימון', 'ריצה', 'בוקס', 'אגרוף', 'כושר', 'יוגה', 'פילאטיס', 'שחייה', 'כדורגל', 'כדורסל', 'טניס', 'הליכה', 'ספורט', 'gym', 'workout', 'sport', 'climbing', 'boxing', 'run', 'yoga', 'swim', 'training', 'pilates'] },
    { id: 'work', phrases: ['פגישה', 'ראיון', 'עבודה', 'צילומים', 'צילום', 'עריכה', 'לקוח', 'לקוחה', 'זום', 'שיחה', 'משמרת', 'ייעוץ', 'meeting', 'work', 'interview', 'zoom', 'client', 'filming', 'shoot', 'editing'] },
    { id: 'personal', phrases: ['חברים', 'חבר', 'משפחה', 'אמא', 'אבא', 'רופא שיניים', 'רופא', 'רופאה', 'אחות', 'אח', 'סבתא', 'סבא', 'דייט', 'ארוחה', 'טיול', 'family', 'friends', 'friend', 'doctor', 'dentist', 'mom', 'dad'] },
  ];

  function norm(s){
    return String(s || '').toLowerCase().replace(/[״׳"'`]/g, '').replace(/\s+/g, ' ').trim();
  }
  function autoCategoryId(title){
    const text = norm(title);
    if (!text) return null;
    const words = text.split(/[\s,.\-–:;!?()[\]/\\|+]+/).filter(Boolean);
    const bare = words.map(w => w.replace(/^[והבלמשכ]+/, '') || w);
    for (const rule of RULES){
      const phrases = rule.phrases.slice().sort((a, b) => b.length - a.length);
      for (const phrase of phrases){
        const p = norm(phrase);
        if (!p) continue;
        if (p.includes(' ')){ if (text.includes(p)) return rule.id; continue; }
        const stem = p.length >= 4 && /[הת]$/.test(p) ? p.slice(0, -1) : p;
        for (const w of bare){
          if (w === p || words.includes(p)) return rule.id;
          if (p.length >= 3 && w.startsWith(stem) && w.length - stem.length <= 3) return rule.id;
        }
      }
    }
    return null;
  }
  return { RULES, autoCategoryId };
});
