/* ניתוב, דף הבית, חזרה (לייטנר), מבחן חזרה, התקדמות והגדרות. */
'use strict';
var APP = (function () {
  var h = U.h, app = document.getElementById('app');
  // ---------- כרטיסיות לייטנר ----------
  function deck(which) {
    var D = IY.data(), T = BK.data(), out = [];
    if (which !== 'beki') {
      D.glossary.forEach(function (g) { out.push({ id: 'g:' + g.a, f: g.v, b: g.m, t: 'ארמית', gem: 1 }); });
      D.concepts.forEach(function (c) { out.push({ id: 'c:' + c.c, f: c.c, b: c.x, t: 'מושג' }); });
      D.quiz.who.forEach(function (x) { out.push({ id: 'bw:' + x.id, f: 'מי אמר: ' + x.s, b: x.a, t: 'מי אמר · ב"מ' }); });
      D.quiz.mc.forEach(function (x) { out.push({ id: 'bq:' + x.id, f: x.q, b: x.o[0], t: 'הבנה · ב"מ' }); });
      D.quiz.shakla.forEach(function (x) { out.push({ id: 'bs:' + x.id, f: 'מה עונה הגמרא על: ' + x.k, b: x.a, t: 'שקלא וטריא' }); });
      D.quiz.sevara.forEach(function (x) { out.push({ id: 'sv:' + x.id, f: x.q, b: x.model, t: 'סברה' }); });
    }
    if (which !== 'iyun') T.amudim.forEach(function (a) {
      out.push({ id: 'tt:' + a.id, f: 'מה הנושאים בתענית ' + a.daf + '?', b: a.topics.join(' · '), t: 'נושאים · תענית' });
      a.who.forEach(function (w, i) { out.push({ id: 'tw:' + a.id + ':' + i, f: 'מי אמר: ' + w.said, b: w.who + ' (' + w.ref + ')', t: 'מי אמר · תענית ' + a.daf }); });
      a.quiz.forEach(function (x) { out.push({ id: 'tq:' + x.id, f: x.q, b: x.o[0], t: 'תענית ' + a.daf }); });
    });
    return out;
  }
  var NEW_PER_SESSION = 10;
  function dueList(cards) {
    var due = [], fresh = [];
    cards.forEach(function (c) { var s = S.card(c.id); if (!s) fresh.push(c); else if (s.due <= Date.now()) due.push(c); });
    due.sort(function (a, b) { return S.card(a.id).b - S.card(b.id).b; });
    return { due: due, fresh: fresh };
  }
  function leitner(app, which) {
    which = which || 'all';
    app.appendChild(h('h2', null, 'חזרה בשיטת לייטנר'));
    var cards = deck(which), cnt = S.boxCounts(cards.map(function (c) { return c.id; })), dl = dueList(cards);
    var tabs = h('div', { class: 'btnrow', role: 'group', 'aria-label': 'בחירת חפיסה' }, [['all', 'הכול'], ['iyun', 'עיון'], ['beki', 'בקיאות']].map(function (t) {
      return h('a', { class: 'btn sm ' + (t[0] === which ? '' : 'sec'), href: '#/leitner/' + t[0], 'aria-current': t[0] === which ? 'true' : null }, t[1]);
    }));
    app.appendChild(tabs);
    app.appendChild(h('div', { class: 'card' },
      h('p', { class: 'small', style: 'margin-top:0' }, 'כל כרטיס מתחיל בתא 1. ידעתם – עובר לתא הבא וחוזר אחרי יותר זמן (תא 2: מחר, 3: עוד 3 ימים, 4: שבוע, 5: שבועיים). טעיתם – חוזר לתא 1. גם טעויות בתרגולים ובמבחנים נכנסות לתא 1.'),
      h('div', { class: 'boxes' }, [1, 2, 3, 4, 5].map(function (b) { return h('div', null, h('b', null, String(cnt[b])), 'תא ' + b); })),
      h('p', { class: 'small muted' }, 'עוד לא נלמדו: ' + cnt[0] + ' · לחזרה היום: ' + dl.due.length),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: function () { session(app, which); } },
        dl.due.length ? 'התחלת חזרה (' + Math.min(dl.due.length + NEW_PER_SESSION, dl.due.length + dl.fresh.length) + ')' : (dl.fresh.length ? 'כרטיסים חדשים (' + Math.min(NEW_PER_SESSION, dl.fresh.length) + ')' : 'אין כרטיסים לחזרה היום')))));
  }
  function session(app, which) {
    var dl = dueList(deck(which)), list = dl.due.concat(U.shuffle(dl.fresh).slice(0, NEW_PER_SESSION));
    app.innerHTML = ''; app.appendChild(h('h2', null, 'חזרה'));
    var root = h('div'); app.appendChild(root);
    var i = 0, ok = 0;
    if (!list.length) { root.appendChild(h('p', { class: 'card' }, 'אין כרטיסים לחזרה כרגע. כל הכבוד!')); return; }
    function show() {
      root.innerHTML = '';
      if (i >= list.length) {
        root.appendChild(h('div', { class: 'card' }, h('h3', null, 'סיום החזרה'), h('div', { class: 'score' }, ok + '/' + list.length),
          h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/leitner/' + which }, 'למצב התאים'), h('a', { class: 'btn sec', href: '#/' }, 'לדף הבית'))));
        return;
      }
      var c = list[i], st = S.card(c.id);
      var back = h('div', { class: 'back', hidden: true, 'aria-live': 'polite' }, c.b);
      var grade = h('div', { class: 'btnrow', hidden: true },
        h('button', { class: 'btn ok', type: 'button', onclick: function () { S.grade(c.id, true); ok++; i++; show(); } }, '✓ ידעתי'),
        h('button', { class: 'btn bad', type: 'button', onclick: function () { S.grade(c.id, false); i++; show(); } }, '✗ לא ידעתי'));
      var rev = h('button', { class: 'btn sec', type: 'button', onclick: function () { back.hidden = false; grade.hidden = false; rev.hidden = true; grade.querySelector('button').focus(); } }, 'הצג תשובה');
      root.appendChild(h('div', { class: 'card' }, h('div', { class: 'qcount' }, (i + 1) + ' / ' + list.length + ' · ' + c.t + ' · ' + (st ? 'תא ' + st.b : 'חדש')),
        h('div', { class: 'flash' }, h('div', { class: c.gem ? 'front' : 'qq' }, c.f), back), h('div', { class: 'btnrow' }, rev), grade));
    }
    show();
  }
  // ---------- חזרה למבחן ----------
  function exam(app) {
    app.appendChild(h('h2', null, 'חזרה למבחן'));
    var D = IY.data(), T = BK.data();
    var tr = 'both', n = 20, ids = T.amudim.map(function (a) { return a.id; });
    function radio(name, val, label, cur, set) {
      var id = name + val; return h('label', { for: id }, h('input', { type: 'radio', name: name, id: id, value: val, checked: cur === val ? true : null, onchange: function () { set(val); } }), label);
    }
    var from = h('select', { 'aria-label': 'מעמוד' }), to = h('select', { 'aria-label': 'עד עמוד' });
    T.amudim.forEach(function (a, i) { from.appendChild(h('option', { value: i }, a.daf)); to.appendChild(h('option', { value: i }, a.daf)); }); to.value = String(T.amudim.length - 1);
    var root = h('div');
    app.appendChild(h('div', { class: 'card' },
      h('p', { class: 'small', style: 'margin-top:0' }, 'מבחן מעורב כמו בכיתה: הבנה, מי אמר, שקלא וטריא, ארמית ובקיאות. טעויות נכנסות לחזרה (תא 1).'),
      h('fieldset', { class: 'rad' }, h('legend', null, 'מסלול'), radio('tr', 'both', 'עיון + בקיאות', tr, function (v) { tr = v; }), radio('tr', 'iyun', 'עיון בלבד (ב"מ ע"ו)', tr, function (v) { tr = v; }), radio('tr', 'beki', 'בקיאות בלבד (תענית)', tr, function (v) { tr = v; })),
      h('fieldset', null, h('legend', null, 'טווח בתענית'), h('div', { class: 'grid2' }, h('label', null, 'מ', from), h('label', null, 'עד', to))),
      h('fieldset', { class: 'rad' }, h('legend', null, 'מספר שאלות'), [10, 20, 30].map(function (k) { return radio('n', k, String(k), n, function (v) { n = v; }); })),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: start }, 'התחלת מבחן'))));
    app.appendChild(root);
    var hist = S.get().exams.slice(-5).reverse();
    if (hist.length) app.appendChild(h('div', { class: 'card' }, h('h3', null, 'מבחנים אחרונים'), h('ul', null, hist.map(function (e) { return h('li', null, U.fmtDate(e.at) + ' · ' + ({ both: 'עיון + בקיאות', iyun: 'עיון', beki: 'בקיאות' })[e.tr] + ' · ' + e.r + '/' + e.n); }))));
    function start() {
      var f = +from.value, t = +to.value; if (t < f) { var x = f; f = t; t = x; }
      var sel = T.amudim.slice(f, t + 1).map(function (a) { return a.id; });
      var iy = [].concat(Q.B.mc(D), Q.B.who(D), Q.B.shakla(D), Q.B.tf(D), U.sample(Q.B.aram(D), 12), Q.B.concepts(D));
      var bk = [].concat(Q.B.tq(T, sel), Q.B.twho(T, sel));
      var items = tr === 'iyun' ? U.sample(iy, n) : tr === 'beki' ? U.sample(bk, n) : U.shuffle(U.sample(iy, Math.ceil(n / 2)).concat(U.sample(bk, Math.floor(n / 2))));
      root.innerHTML = ''; root.scrollIntoView();
      Q.runMC(root, items, { back: { href: '#/leitner', label: 'לחזרה על הטעויות' }, onEnd: function (r, total) { var st = S.get(); st.exams.push({ at: Date.now(), tr: tr, r: r, n: total }); if (st.exams.length > 100) st.exams = st.exams.slice(-100); S.save(); } });
    }
  }
  // ---------- התקדמות ----------
  function progress(app) {
    var st = S.get(), D = IY.data(), T = BK.data();
    app.appendChild(h('h2', null, 'התקדמות והגדרות'));
    var ud = D.units.filter(function (u) { return S.unitDone(u.id); }).length;
    var ad = T.amudim.filter(function (a) { return (st.beki.amudim[a.id] || {}).reviews && st.beki.amudim[a.id].reviews.length; }).length;
    var all = deck('all').map(function (c) { return c.id; }), cnt = S.boxCounts(all);
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'עיון – ב"מ ע"ו'), U.bar(ud / D.units.length, 'יחידות'), h('div', { class: 'small' }, ud + '/' + D.units.length + ' יחידות'),
      h('table', null, h('tbody', null, Object.keys(st.iyun.quiz).map(function (k) { var q = st.iyun.quiz[k]; return h('tr', null, h('td', null, ({ mc: 'הבנה', who: 'מי אמר', order: 'סדר הסוגיא', shakla: 'שקלא וטריא', aram: 'ארמית', sevara: 'סברה', tf: 'נכון/לא נכון', concepts: 'מושגים' })[k] || k), h('td', null, 'הכי טוב ' + q.best + '% · ' + q.tries + ' ניסיונות')); })))));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'בקיאות – תענית'), U.bar(ad / T.amudim.length, 'עמודים'), h('div', { class: 'small' }, ad + '/' + T.amudim.length + ' עמודים')));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'כרטיסיות לייטנר'), h('div', { class: 'boxes' }, [1, 2, 3, 4, 5].map(function (b) { return h('div', null, h('b', null, String(cnt[b])), 'תא ' + b); })), h('p', { class: 'small muted' }, 'עוד לא נלמדו: ' + cnt[0])));
    // הגדרות
    var fs = h('input', { type: 'range', min: '0.9', max: '1.4', step: '0.1', value: String(st.settings.fs), 'aria-label': 'גודל טקסט', oninput: function () { st.settings.fs = +this.value; S.save(); applySettings(); } });
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'הגדרות'), h('label', null, 'גודל טקסט', fs),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn sec', type: 'button', 'aria-pressed': String(st.settings.sound), onclick: function () { st.settings.sound = !st.settings.sound; S.save(); applySettings(); render(); } }, st.settings.sound ? 'צלילי משוב: פועל' : 'צלילי משוב: כבוי'))));
    // ייצוא / ייבוא
    var file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: function () {
      var f = this.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { S.importJSON(r.result); U.toast('ההתקדמות נטענה ✓'); applySettings(); render(); } catch (e) { U.toast('הקובץ לא תקין'); } };
      r.readAsText(f);
    } });
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'גיבוי התקדמות'), h('p', { class: 'small', style: 'margin-top:0' }, 'ההתקדמות נשמרת רק במכשיר הזה. אפשר לשמור קובץ גיבוי ולטעון אותו במכשיר אחר.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', type: 'button', onclick: function () {
          var b = new Blob([S.exportJSON()], { type: 'application/json' }), a = h('a', { href: URL.createObjectURL(b), download: 'gemara7-progress-' + new Date().toISOString().slice(0, 10) + '.json' });
          document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        } }, 'ייצוא לקובץ JSON'),
        h('button', { class: 'btn sec', type: 'button', onclick: function () { file.click(); } }, 'ייבוא מקובץ'), file,
        h('button', { class: 'btn bad', type: 'button', onclick: function () { if (confirm('למחוק את כל ההתקדמות במכשיר הזה?')) { S.reset(); U.toast('ההתקדמות אופסה'); render(); } } }, 'איפוס'))));
    app.appendChild(h('div', { class: 'card small muted' }, h('h3', null, 'מקורות'),
      h('p', null, 'נוסח הגמרא, רש"י ותוספות: ספריא (William Davidson Edition – Vocalized Aramaic; רש"י ותוספות בנוסח ספריא). הסיכומים וההסברים נכתבו בעברית פשוטה ונבדקו מול לשון הגמרא. שמות קדושים בפסוקים הוחלפו בכינוי (ה\', אלקים).'),
      h('p', null, 'קריינות: ElevenLabs (קול "תומר"), נבדקה בבדיקת תמלול אוטומטית; קטעים שלא עברו את הבדיקה לא מוצגים.')));
  }
  // ---------- דף הבית ----------
  function home(app) {
    var D = IY.data(), T = BK.data(), st = S.get();
    var ud = D.units.filter(function (u) { return S.unitDone(u.id); }).length;
    var ad = T.amudim.filter(function (a) { return (st.beki.amudim[a.id] || {}).reviews && st.beki.amudim[a.id].reviews.length; }).length;
    var dl = dueList(deck('all'));
    var nextU = D.units.filter(function (u) { return !S.unitDone(u.id); })[0];
    var nextA = T.amudim.filter(function (a) { return !((st.beki.amudim[a.id] || {}).reviews || []).length; })[0];
    app.appendChild(h('h2', null, 'לימוד גמרא – כיתה ז\''));
    app.appendChild(h('a', { class: 'card track', href: '#/iyun' }, h('h3', null, '📖 עיון · בבא מציעא ע"ו'), h('div', { class: 'small' }, 'השוכר את האומנין – שורה אחר שורה, עם רש"י, תוספות ומהלך הסוגיא'), U.bar(ud / D.units.length, 'עיון'), h('div', { class: 'small muted' }, ud + '/' + D.units.length + ' יחידות' + (nextU ? ' · הבא: ' + nextU.title : ' · סיימתם!'))));
    app.appendChild(h('a', { class: 'card track b', href: '#/beki' }, h('h3', null, '📚 בקיאות · תענית ב–ח'), h('div', { class: 'small' }, 'סיכום לכל עמוד, נושאים, מי אמר, ושאלות'), U.bar(ad / T.amudim.length, 'בקיאות'), h('div', { class: 'small muted' }, ad + '/' + T.amudim.length + ' עמודים' + (nextA ? ' · הבא: ' + nextA.daf : ' · סיימתם!'))));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'היום'),
      h('p', { class: 'small', style: 'margin-top:0' }, dl.due.length ? 'יש ' + dl.due.length + ' כרטיסים לחזרה היום.' : 'אין כרטיסים שמחכים לחזרה. אפשר להתחיל כרטיסים חדשים.'),
      h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/leitner' }, 'חזרה (לייטנר)'), h('a', { class: 'btn sec', href: '#/exam' }, 'חזרה למבחן'),
        nextU ? h('a', { class: 'btn sec', href: '#/iyun/u/' + nextU.id }, 'להמשיך בעיון') : null)));
  }
  // ---------- ניתוב ----------
  var TITLES = { '': 'גמרא · כיתה ז\'', iyun: 'עיון · ב"מ ע"ו', beki: 'בקיאות · תענית', leitner: 'חזרה', exam: 'חזרה למבחן', progress: 'התקדמות' };
  function render() {
    U.stop();
    var p = (location.hash.replace(/^#\/?/, '') || '').split('/');
    app.innerHTML = '';
    document.querySelectorAll('.tabbar a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-r') === p[0]); if (a.getAttribute('data-r') === p[0]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.getElementById('pageTitle').textContent = TITLES[p[0]] || TITLES[''];
    try {
      if (p[0] === 'iyun') {
        if (p[1] === 'u') IY.unit(app, p[2]); else if (p[1] === 'flow') IY.flow(app); else if (p[1] === 'words') IY.words(app);
        else if (p[1] === 'practice' && p[2]) IY.runMode(app, p[2], p[3]); else if (p[1] === 'practice') IY.practice(app); else IY.home(app);
      } else if (p[0] === 'beki') {
        if (p[1] === 'a' && p[3] === 'quiz') BK.quiz(app, p[2]); else if (p[1] === 'a') BK.amud(app, p[2]); else if (p[1] === 'who') BK.who(app); else BK.home(app);
      } else if (p[0] === 'leitner') leitner(app, p[1]);
      else if (p[0] === 'exam') exam(app);
      else if (p[0] === 'progress') progress(app);
      else home(app);
    } catch (e) { app.appendChild(h('p', { class: 'card' }, 'שגיאה בהצגת הדף.')); console.error(e); }
    var t = app.querySelector('h2'); document.title = (t ? t.textContent + ' · ' : '') + 'גמרא לכיתה ז\'';
    window.scrollTo(0, 0);
  }
  function applySettings() {
    var st = S.get().settings;
    document.documentElement.style.setProperty('--fs', String(st.fs || 1));
    var b = document.getElementById('soundToggle'); b.setAttribute('aria-pressed', String(!!st.sound)); b.textContent = st.sound ? '♪' : '🔇';
  }
  document.getElementById('soundToggle').addEventListener('click', function () { var st = S.get().settings; st.sound = !st.sound; S.save(); applySettings(); U.toast(st.sound ? 'צלילי משוב פועלים' : 'צלילי משוב כבויים'); });
  applySettings();
  Promise.all([IY.load(), BK.load()]).then(function () {
    window.addEventListener('hashchange', function () { render(); app.focus({ preventScroll: true }); });
    render();
  }).catch(function () { app.innerHTML = ''; app.appendChild(h('p', { class: 'card' }, 'לא הצלחתי לטעון את חומרי הלימוד. בדקו את החיבור לאינטרנט ונסו שוב.')); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  return { render: render };
})();
