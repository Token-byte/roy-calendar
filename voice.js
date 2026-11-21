'use strict';
/* Voice / typed Hebrew add, plus ?add= for an iOS Shortcut. */
let voiceRec = null;
let voiceUndo = null;
let voiceTimer = 0;

function canUseWebSpeech(){
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return false;
  if (typeof isIOS === 'function' && isIOS() && typeof isStandalone === 'function' && isStandalone()) return false;
  return true;
}
function describeParsed(p){
  const d = parseKey(p.date);
  let when = 'יום ' + HE_DAYS[d.getDay()] + ', ' + d.getDate() + ' ב' + HE_MONTHS[d.getMonth()];
  if (!p.allDay && p.time) when += ' · ' + p.time;
  else when += ' · כל היום';
  if (p.rrule){
    if (p.rrule.indexOf('DAILY') >= 0) when += ' · כל יום';
    else if (p.rrule.indexOf('MONTHLY') >= 0) when += ' · כל חודש';
    else when += ' · כל שבוע';
  }
  if (p.reminderMinutes != null && p.reminderMinutes >= 0) when += ' · תזכורת ' + p.reminderMinutes + ' דק׳ לפני';
  return when;
}
function showVoiceConfirm(ev, parsed){
  clearTimeout(voiceTimer);
  voiceUndo = ev.id;
  $('vcTitle').textContent = ev.title;
  const onGoogle = S.connected && tokenValid();
  $('vcWhen').textContent = describeParsed(parsed) + (onGoogle ? '' : ' · נשמר רק במכשיר, לא בגוגל');
  if ($('vcConnect')) $('vcConnect').classList.toggle('hidden', onGoogle);
  $('voiceConfirm').classList.remove('hidden');
  voiceTimer = setTimeout(() => {
    $('voiceConfirm').classList.add('hidden');
    voiceUndo = null;
  }, 8000);
}
function undoVoiceCreate(){
  const id = voiceUndo;
  clearTimeout(voiceTimer);
  $('voiceConfirm').classList.add('hidden');
  voiceUndo = null;
  const ev = id && S.events[id];
  if (!ev){ toast('כבר לא ביומן'); return; }
  queue('delete', ev);
  delete S.events[id];
  saveEvents();
  render();
  scheduleNotifications();
  if (S.connected) sync();
  toast('הפתק בוטל');
}
function createFromPhrase(text){
  const parsed = HeParse.parseHebrewEvent(text, new Date());
  if (!parsed.title){ toast('לא הבנתי את המשפט'); return; }
  const ev = {
    id: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    calId: 'local',
    title: parsed.title,
    allDay: parsed.allDay,
    location: '',
    notes: '',
    reminder: parsed.reminderMinutes == null ? S.settings.defaultReminder : parsed.reminderMinutes,
    cat: null,
    pending: true,
    rrule: parsed.rrule || null,
  };
  if (parsed.allDay){
    ev.start = parsed.date;
    ev.end = addDays(parsed.date, 1);
  } else {
    const s = new Date(parsed.date + 'T' + (parsed.time || '09:00'));
    const en = new Date(s.getTime() + (parsed.durationMin || 60) * 60000);
    ev.start = s.toISOString();
    ev.end = en.toISOString();
  }
  S.events[ev.id] = ev;
  saveEvents();
  queue('create', ev);
  S.sel = parsed.date;
  S.cursor = firstOfMonth(parsed.date);
  S.view = 'year';
  render();
  scheduleNotifications();
  if (S.connected) sync().then(() => { if (!S.ops.length && voiceUndo === ev.id) $('vcWhen').textContent = describeParsed(parsed) + ' · בגוגל'; });
  showVoiceConfirm(ev, parsed);
}
function stopListen(){
  if (voiceRec){ try { voiceRec.onend = null; voiceRec.stop(); } catch(e){} }
  voiceRec = null;
  const mic = $('voiceMic');
  if (mic) mic.classList.remove('on');
}
function startListen(){
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return;
  stopListen();
  const rec = new Ctor();
  voiceRec = rec;
  rec.lang = 'he-IL';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let said = '';
    for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
    $('voiceText').value = said.trim();
    if (e.results[e.results.length - 1].isFinal){
      stopListen();
      if ($('voiceText').value) createFromPhrase($('voiceText').value);
      closeVoice();
    }
  };
  rec.onerror = () => {
    stopListen();
    $('voiceHint').textContent = 'ההאזנה לא זמינה כאן. מכתיבים עם המיקרופון של המקלדת.';
    $('voiceText').focus();
  };
  rec.onend = () => { if ($('voiceMic')) $('voiceMic').classList.remove('on'); };
  try {
    rec.start();
    $('voiceMic').classList.add('on');
    $('voiceHint').textContent = 'מקשיבים… דברו עברית, למשל: יום ראשון בשעה 12:00 טיפוס';
  } catch(e){
    $('voiceHint').textContent = 'ההאזנה לא נפתחה. מכתיבים עם המיקרופון של המקלדת.';
    $('voiceText').focus();
  }
}
function closeVoice(){
  stopListen();
  $('voiceBackdrop').classList.add('hidden');
}
function openVoice(){
  $('voiceText').value = '';
  $('voiceBackdrop').classList.remove('hidden');
  const mic = $('voiceMic');
  if (canUseWebSpeech()){
    mic.classList.remove('hidden');
    $('voiceHint').textContent = 'אפשר לדבר, או לכתוב. למשל: יום ראשון בשעה 12:00 טיפוס';
    startListen();
  } else {
    mic.classList.add('hidden');
    $('voiceHint').textContent = 'באייפון מכתיבים עם המיקרופון שעל המקלדת.';
    setTimeout(() => $('voiceText').focus(), 60);
  }
}
function initVoice(){
  $('micBtn').onclick = openVoice;
  $('voiceCancel').onclick = closeVoice;
  $('voiceMic').onclick = () => { if (voiceRec) stopListen(); else startListen(); };
  $('voiceSheet').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('voiceText').value.trim();
    if (!text){ $('voiceText').focus(); return; }
    closeVoice();
    createFromPhrase(text);
  });
  $('voiceBackdrop').addEventListener('click', e => { if (e.target.id === 'voiceBackdrop') closeVoice(); });
  $('vcUndo').onclick = undoVoiceCreate;
  const params = new URLSearchParams(location.search);
  const add = params.get('add');
  if (add && add.trim()){
    params.delete('add');
    const next = params.toString();
    history.replaceState(null, '', location.pathname + (next ? '?' + next : '') + location.hash);
    setTimeout(() => createFromPhrase(add.trim()), 60);
  }
}
initVoice();
