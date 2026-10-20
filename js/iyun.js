/* מסלול עיון: בבא מציעא ע"ו – יחידות, שורה אחר שורה, רש"י ותוספות, מהלך הסוגיא, תרגולים. */
'use strict';
var IY = (function () {
  var h = U.h, D = null, AUD = {};
  function load() {
    return Promise.all([U.json('data/bm76.json'), U.json('data/audio.json').catch(function () { return {}; })])
      .then(function (r) { D = r[0]; AUD = r[1] || {}; return D; });
  }
  function clip(id) { var c = AUD[id]; return c ? { file: 'audio/' + c } : null; }
  var LEG = ['משנה', 'ברייתא', 'דין', 'דיוק', 'קושיא', 'תירוץ', 'ראיה', 'דחייה', 'בעיא', 'פשיטא', 'מחלוקת'];
  function legend() { return h('div', { class: 'legend', 'aria-label': 'מקרא סוגי שלבים' }, ['קושיא', 'תירוץ', 'ראיה', 'דחייה', 'בעיא', 'מחלוקת'].map(function (r) { return h('span', { class: 'role ' + r }, r); })); }

  function home(app) {
    var done = D.units.filter(function (u) { return S.unitDone(u.id); }).length;
    app.appendChild(h('h2', null, 'עיון: בבא מציעא ע"ו'));
    app.appendChild(h('div', { class: 'card' },
      h('p', null, 'פרק "השוכר את האומנין" – מתחילת המשנה (ע"ה ע"ב) ועד סוף ע"ו ע"ב. ', h('b', null, 'השאלה המרכזית: '), 'מה קורה כשבעל הבית או הפועלים חוזרים בהם, או כשהשליח "הטעה" – מי מפסיד, ומתי יש רק "תרעומת"?'),
      U.bar(done / D.units.length, 'יחידות שנלמדו'), h('div', { class: 'small muted' }, done + ' מתוך ' + D.units.length + ' יחידות סומנו כנלמדו'),
      h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/iyun/flow' }, 'מהלך הסוגיא'), h('a', { class: 'btn sec', href: '#/iyun/practice' }, 'תרגולים'), h('a', { class: 'btn sec', href: '#/iyun/words' }, 'מילון ומושגים'))));
    app.appendChild(h('h3', null, 'יחידות הלימוד'));
    app.appendChild(h('ol', { class: 'list' }, D.units.map(function (u, k) {
      return h('li', null, h('a', { class: 'item', href: '#/iyun/u/' + u.id },
        h('span', { class: 'num', 'aria-hidden': 'true' }, String(k + 1)),
        h('span', { class: 'grow' }, h('span', { class: 't' }, u.title), h('br'), h('span', { class: 's' }, u.daf + ' · ' + u.lines.length + ' שורות')),
        S.unitDone(u.id) ? h('span', { class: 'chk', 'aria-label': 'נלמד' }, '✓') : null));
    })));
  }

  function lineText(l) {
    var toks = l.toks.slice(), out = [], i = 0;
    var at = {}; l.words.forEach(function (w) { if (w.i >= 0) at[w.i] = w; });
    while (i < toks.length) {
      var w = at[i];
      if (w) {
        var txt = toks.slice(i, i + w.k).join(' ');
        out.push(h('button', { class: 'w', type: 'button', 'aria-label': txt + ' – פירוש', onclick: function (w) { return function () { pop(w.v, w.m); }; }(w) }, txt));
        i += w.k;
      } else { out.push(toks[i]); i++; }
      if (i < toks.length) out.push(' ');
    }
    return out;
  }
  var popEl = null, popT = 0;
  function pop(v, m) {
    if (popEl) popEl.remove();
    popEl = h('div', { class: 'pop', role: 'status' }, h('div', { class: 'v' }, v), h('div', null, m));
    popEl.addEventListener('click', function () { popEl.remove(); popEl = null; });
    document.body.appendChild(popEl); clearTimeout(popT); popT = setTimeout(function () { if (popEl) { popEl.remove(); popEl = null; } }, 6000);
  }
  function toggle(label, mk, cls) {
    var panel = null, b = h('button', { class: 'tg', type: 'button', 'aria-expanded': 'false' }, label);
    b.addEventListener('click', function () {
      if (panel) { panel.remove(); panel = null; b.setAttribute('aria-expanded', 'false'); return; }
      panel = h('div', { class: 'panel ' + (cls || '') }, mk()); b.closest('.gline').appendChild(panel); b.setAttribute('aria-expanded', 'true');
    });
    return b;
  }
  function comm(list, name) {
    return list.map(function (r) {
      var t = r.text, k = t.indexOf(' - '), dh = k > 0 && k < 90 ? t.slice(0, k) : '', body = dh ? t.slice(k + 3) : t;
      return h('div', { style: 'margin-bottom:8px' },
        h('div', { class: 'rq' }, dh ? h('b', null, dh + ' – ') : null, body),
        r.x ? h('div', { style: 'margin-top:4px' }, h('b', null, 'בפשטות: '), r.x) : null);
    });
  }
  function unitClips(u) {
    var items = [];
    u.lines.forEach(function (l, k) {
      var g = clip(u.id + ':' + l.n + ':g'), e = clip(u.id + ':' + l.n + ':e');
      var mark = function () { document.querySelectorAll('.playing').forEach(function (x) { x.classList.remove('playing'); }); var el = document.getElementById('L' + l.n); if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
      if (g) items.push({ file: g.file, onstart: mark }); if (e) items.push({ file: e.file, onstart: mark });
    });
    return items;
  }
  function unit(app, id) {
    var k = -1; D.units.forEach(function (u, j) { if (u.id === id) k = j; });
    if (k < 0) { app.appendChild(h('p', null, 'היחידה לא נמצאה.')); return; }
    var u = D.units[k], showP = !!S.get().settings.pshat;
    app.appendChild(h('div', { class: 'small muted' }, 'יחידה ' + (k + 1) + ' מתוך ' + D.units.length + ' · ' + u.daf));
    app.appendChild(h('h2', null, u.title));
    var all = unitClips(u);
    app.appendChild(h('div', { class: 'card' }, h('p', { style: 'margin-top:0' }, u.intro),
      h('div', { class: 'chips' }, u.key.map(function (x) { return h('span', { class: 'chip' }, x); })),
      h('details', null, h('summary', null, 'מהלך היחידה'), flowList(u.flow)),
      h('div', { class: 'btnrow' },
        all.length ? (function () { var b = h('button', { class: 'btn sec', type: 'button', 'aria-pressed': 'false' }, '🔊 השמעת היחידה ברצף'); b.addEventListener('click', function () { U.play(unitClips(u), b); }); return b; })() : null,
        (function () { var b = h('button', { class: 'btn sec', type: 'button', 'aria-pressed': String(showP) }, showP ? 'הסתר פשט' : 'הצג פשט לכל השורות');
          b.addEventListener('click', function () { S.get().settings.pshat = !showP; S.save(); APP.render(); }); return b; })())));
    u.lines.forEach(function (l) {
      var g = clip(u.id + ':' + l.n + ':g'), e = clip(u.id + ':' + l.n + ':e');
      var box = h('div', { class: 'gline', id: 'L' + l.n },
        h('div', { class: 'lhead' }, h('span', { class: 'role ' + l.role }, l.role), h('span', null, 'שורה ' + l.n + ' · ' + l.segs.join(', '))),
        h('div', { class: 'gtext', lang: 'he' }, lineText(l)));
      var tools = h('div', { class: 'ltools' });
      if (g || e) tools.appendChild(U.playBtn(function () { return [g, e].filter(Boolean); }, 'השמעת השורה וההסבר'));
      if (!showP) tools.appendChild(toggle('פשט', function () { return l.pshat; }));
      if (l.rashi.length) tools.appendChild(toggle('רש"י', function () { return comm(l.rashi); }, 'rashi'));
      if (l.tosafot.length) tools.appendChild(toggle('תוספות', function () { return comm(l.tosafot); }, 'tos'));
      if (l.words.length) tools.appendChild(toggle('מילים', function () { return h('dl', { class: 'gloss' }, l.words.map(function (w) { return [h('dt', null, w.v), h('dd', null, w.m)]; })); }));
      box.appendChild(tools);
      if (showP) box.appendChild(h('div', { class: 'panel' }, l.pshat));
      app.appendChild(box);
    });
    if (u.id === 'u8') app.appendChild(dosaTable());
    var mine = D.quiz.mc.filter(function (x) { return x.u === u.id; });
    var done = S.unitDone(u.id);
    app.appendChild(h('div', { class: 'card' },
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn ' + (done ? 'sec' : 'ok'), type: 'button', onclick: function () { S.unitDone(u.id, !done); U.toast(done ? 'הסימון בוטל' : 'סומן כנלמד ✓'); APP.render(); } }, done ? '✓ נלמד (ביטול)' : 'סיימתי את היחידה'),
        mine.length ? h('a', { class: 'btn sec', href: '#/iyun/practice/unit/' + u.id }, 'שאלות על היחידה (' + mine.length + ')') : null),
      h('div', { class: 'btnrow' },
        k > 0 ? h('a', { class: 'btn sec', href: '#/iyun/u/' + D.units[k - 1].id }, '→ הקודמת') : null,
        k + 1 < D.units.length ? h('a', { class: 'btn sec', href: '#/iyun/u/' + D.units[k + 1].id }, 'הבאה ←') : null)));
  }
  function dosaTable() {
    // לפי הברייתא (ע"ו ע"ב): קיבלו בשתי סלעים = 8 דינרים, עשו חצי
    return h('div', { class: 'card' }, h('h3', null, 'טבלה: תנא קמא מול רבי דוסא'),
      h('p', { class: 'small' }, 'הקבלנים קיבלו עבודה בשתי סלעים (8 דינרים; סלע = 4 דינרים, שקל = 2 דינרים), עשו חצי וחזרו בהם. כמה מקבלים?'),
      h('table', null, h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'כמה עולה לגמור את החצי שנשאר'), h('th', { scope: 'col' }, 'תנא קמא – שמין מה שעשו'), h('th', { scope: 'col' }, 'רבי דוסא – שמין מה שעתיד להיעשות'))),
        h('tbody', null,
          h('tr', null, h('td', null, '6 דינרים (התייקרו פועלים)'), h('td', null, 'סלע (4) – חצי מהשכר כמו החצי שעשו'), h('td', null, 'שקל (2) = 8 פחות 6, כדי שבעל הבית ישלם בסך הכול 8 כמו שסוכם')),
          h('tr', null, h('td', null, 'סלע (4)'), h('td', null, 'סלע (4)'), h('td', null, 'סלע (4) = 8 פחות 4')))),
      h('p', { class: 'small muted' }, 'בשני המקרים יכולים הקבלנים גם לגמור את המלאכה ולקבל שתי סלעים. לפי רש"י, שיטת רבי דוסא היא "ידם על התחתונה" שבמשנה.'));
  }
  function flowList(nodes, unitId) {
    return h('ol', { class: 'flow' }, nodes.map(function (n) {
      var body = [h('div', { class: 'ft' }, n.type + (n.who ? ' · ' + n.who : '')), h('div', null, n.text)];
      return h('li', { class: n.type }, unitId ? h('a', { href: '#/iyun/u/' + unitId }, body) : body);
    }));
  }
  function flow(app) {
    app.appendChild(h('h2', null, 'מהלך הסוגיא'));
    app.appendChild(h('div', { class: 'card' }, h('p', { style: 'margin:0' }, 'כל הסוגיא מן המשנה ועד "סיירה לארעיה". לחיצה על שלב פותחת את היחידה.'), legend()));
    D.units.forEach(function (u, k) {
      app.appendChild(h('h3', null, (k + 1) + '. ' + u.title));
      app.appendChild(flowList(u.flow, u.id));
    });
  }
  function words(app) {
    app.appendChild(h('h2', null, 'מילון ארמית ומושגים'));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'מושגים מרכזיים'), h('dl', { class: 'gloss' }, D.concepts.map(function (c) { return [h('dt', null, c.c), h('dd', null, c.x)]; }))));
    D.units.forEach(function (u) {
      var list = D.glossary.filter(function (g) { return g.u === u.id; }); if (!list.length) return;
      app.appendChild(h('details', { class: 'card' }, h('summary', null, u.title + ' (' + list.length + ')'),
        h('dl', { class: 'gloss' }, list.map(function (g) { return [h('dt', null, g.v), h('dd', null, g.m)]; }))));
    });
    app.appendChild(h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/iyun/practice/aram' }, 'תרגול תרגום ארמית'), h('a', { class: 'btn sec', href: '#/leitner' }, 'כרטיסיות חזרה')));
  }
  var MODES = [
    ['mc', 'שאלות הבנה', 'מה הגמרא אומרת ולמה'],
    ['who', 'מי אמר?', 'שיוך דברים לאומרם'],
    ['order', 'סדר הסוגיא', 'לסדר את שלבי השקלא וטריא'],
    ['shakla', 'שקלא וטריא', 'מה עונה הגמרא על הקושיא'],
    ['aram', 'תרגום ארמית', 'מילים וביטויים מהסוגיא'],
    ['sevara', 'הסבר סברה', 'להסביר במילים שלך'],
    ['tf', 'נכון / לא נכון', 'בדיקת דיוקים'],
    ['concepts', 'מושגים', 'תרעומת, ידו על התחתונה…']
  ];
  function practice(app) {
    app.appendChild(h('h2', null, 'תרגולים – עיון'));
    var q = S.get().iyun.quiz;
    app.appendChild(h('ul', { class: 'list' }, MODES.map(function (m) {
      var r = q[m[0]];
      return h('li', null, h('a', { class: 'item', href: '#/iyun/practice/' + m[0] },
        h('span', { class: 'grow' }, h('span', { class: 't' }, m[1]), h('br'), h('span', { class: 's' }, m[2])),
        r ? h('span', { class: 's' }, 'הכי טוב: ' + r.best + '%') : null));
    })));
  }
  function runMode(app, mode, arg) {
    var root = h('div'), back = { href: '#/iyun/practice', label: 'לתרגולים' };
    var title = (MODES.filter(function (m) { return m[0] === mode; })[0] || [0, 'תרגול'])[1];
    var rec = function (r, t) { S.quizRec(mode, r, t); };
    if (mode === 'unit') {
      var u = D.units.filter(function (x) { return x.id === arg; })[0]; if (!u) return;
      title = 'שאלות: ' + u.title; back = { href: '#/iyun/u/' + u.id, label: 'חזרה ליחידה' };
      var items = Q.B.mc(D).filter(function (it) { return D.quiz.mc.some(function (x) { return 'bq:' + x.id === it.id && x.u === u.id; }); });
      app.appendChild(h('h2', null, title)); app.appendChild(root); Q.runMC(root, U.shuffle(items), { back: back }); return;
    }
    app.appendChild(h('h2', null, title)); app.appendChild(root);
    if (mode === 'order') {
      var steps = D.quiz.order, pick = h('div', { class: 'btnrow' });
      var go = function (s, e) { root.innerHTML = ''; Q.runOrder(root, steps.slice(s, e), function (tries) { rec(tries === 1 ? 1 : 0, 1); U.toast('כל הכבוד!'); }); };
      [[0, 6, 'חלק א: המשנה וההטעיה'], [6, 12, 'חלק ב: הבעיא והגט'], [11, 17, 'חלק ג: הברייתות'], [0, 17, 'כל הסוגיא']].forEach(function (p) {
        pick.appendChild(h('button', { class: 'btn sec sm', type: 'button', onclick: function () { go(p[0], p[1]); } }, p[2]));
      });
      app.insertBefore(pick, root); go(0, 6); return;
    }
    if (mode === 'sevara') { Q.runSevara(root, D.quiz.sevara, function (s, t) { S.quizRec('sevara', Math.round(s), t); }); return; }
    var list = Q.B[mode] ? Q.B[mode](D) : [];
    if (mode === 'aram') list = U.sample(list, 15);
    Q.runMC(root, U.shuffle(list), { back: back, onEnd: rec });
  }
  return { load: load, home: home, unit: unit, flow: flow, words: words, practice: practice, runMode: runMode, data: function () { return D; } };
})();
