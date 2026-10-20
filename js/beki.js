/* מסלול בקיאות: תענית ב–ח – סיכום לכל עמוד, נושאים, מי אמר, טקסט הגמרא, שאלות ומעקב חזרות. */
'use strict';
var BK = (function () {
  var h = U.h, T = null, AUD = {};
  function load() {
    return Promise.all([U.json('data/taanit.json'), U.json('data/audio.json').catch(function () { return {}; })])
      .then(function (r) { T = r[0]; AUD = r[1] || {}; return T; });
  }
  function find(id) { var k = -1; T.amudim.forEach(function (a, j) { if (a.id === id) k = j; }); return k; }
  function status(a) {
    var p = S.get().beki.amudim[a.id];
    var n = p && p.reviews ? p.reviews.length : 0, last = n ? p.reviews[n - 1] : 0;
    return { n: n, last: last, best: p && p.best != null ? p.best : null };
  }
  function home(app) {
    var learned = T.amudim.filter(function (a) { return status(a).n > 0; }).length;
    app.appendChild(h('h2', null, 'בקיאות: תענית ב–ח'));
    app.appendChild(h('div', { class: 'card' },
      h('p', { style: 'margin-top:0' }, 'פרק ראשון של מסכת תענית, "מאימתי": הזכרת גשמים ושאלתם, מעלת הגשמים, ודברי אגדה על תפילה, תורה ותשובה. לכל עמוד – סיכום, נושאים, "מי אמר", טקסט הגמרא ושאלות.'),
      U.bar(learned / T.amudim.length, 'עמודים שנלמדו'), h('div', { class: 'small muted' }, learned + ' מתוך ' + T.amudim.length + ' עמודים סומנו כנלמדו'),
      h('div', { class: 'btnrow' }, h('a', { class: 'btn', href: '#/beki/who' }, 'מי אמר? – כל הפרק'), h('a', { class: 'btn sec', href: '#/exam' }, 'מבחן חזרה'))));
    app.appendChild(h('ol', { class: 'list' }, T.amudim.map(function (a) {
      var s = status(a), old = s.last && Date.now() - s.last > 7 * 864e5;
      return h('li', null, h('a', { class: 'item', href: '#/beki/a/' + a.id },
        h('span', { class: 'num', 'aria-hidden': 'true' }, a.daf.replace(' ע"א', '.').replace(' ע"ב', ':')),
        h('span', { class: 'grow' }, h('span', { class: 't' }, a.daf + ' – ' + a.title), h('br'),
          h('span', { class: 's' }, s.n ? 'חזרות: ' + s.n + ' · אחרונה: ' + U.fmtDate(s.last) + (old ? ' · הגיע הזמן לחזור' : '') : 'עוד לא נלמד', s.best != null ? ' · שאלות: ' + s.best + '%' : '')),
        s.n ? h('span', { class: 'chk', 'aria-label': 'נלמד' }, '✓') : null));
    })));
  }
  function amud(app, id) {
    var k = find(id); if (k < 0) { app.appendChild(h('p', null, 'העמוד לא נמצא.')); return; }
    var a = T.amudim[k], s = status(a);
    var clips = a.summary.map(function (x, i) { var f = AUD['t:' + a.id + ':' + (i + 1)]; return f ? { file: 'audio/' + f, onstart: function () { document.querySelectorAll('.playing').forEach(function (y) { y.classList.remove('playing'); }); var el = document.getElementById('S' + (i + 1)); if (el) el.classList.add('playing'); } } : null; }).filter(Boolean);
    app.appendChild(h('div', { class: 'small muted' }, 'מסכת תענית · עמוד ' + (k + 1) + ' מתוך ' + T.amudim.length));
    app.appendChild(h('h2', null, a.daf + ' – ' + a.title));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'נושאים'), h('div', { class: 'chips' }, a.topics.map(function (t) { return h('span', { class: 'chip' }, t); })),
      clips.length ? h('div', { class: 'btnrow' }, (function () { var b = h('button', { class: 'btn sec', type: 'button', 'aria-pressed': 'false' }, '🔊 השמעת הסיכום' + (clips.length < a.summary.length ? ' (' + clips.length + ' מתוך ' + a.summary.length + ' סעיפים)' : '')); b.addEventListener('click', function () { U.play(clips, b); }); return b; })()) : null));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'סיכום'), h('ol', null, a.summary.map(function (x, i) { return h('li', { id: 'S' + (i + 1), style: 'margin-bottom:6px' }, x.t, ' ', h('span', { class: 'ref' }, '(' + x.ref + ')')); }))));
    app.appendChild(h('div', { class: 'card' }, h('h3', null, 'מי אמר מה'),
      h('table', null, h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'מי'), h('th', { scope: 'col' }, 'מה אמר'))),
        h('tbody', null, a.who.map(function (w) { return h('tr', null, h('td', { class: 'who' }, w.who), h('td', null, w.said, ' ', h('span', { class: 'ref' }, '(' + w.ref + ')'))); })))));
    var gem = h('details', { class: 'card' }, h('summary', null, 'טקסט הגמרא (מנוקד, מספריא)'));
    gem.addEventListener('toggle', function () {
      if (!gem.open || gem.dataset.l) return; gem.dataset.l = 1;
      var box = h('div', { class: 'gem', lang: 'he' }, 'טוען…'); gem.appendChild(box);
      U.json('data/taanit_text.json').then(function (tx) { box.innerHTML = ''; (tx[a.id] || []).forEach(function (p, i) { box.appendChild(h('p', null, h('span', { class: 'ref' }, a.id + ':' + (i + 1)), p)); }); })
        .catch(function () { box.textContent = 'לא הצלחתי לטעון את הטקסט (אין חיבור?).'; });
    });
    app.appendChild(gem);
    app.appendChild(h('div', { class: 'card' },
      h('p', { class: 'small muted', style: 'margin-top:0' }, s.n ? 'חזרתם על העמוד ' + s.n + ' פעמים. אחרונה: ' + U.fmtDate(s.last) : 'אחרי שקראתם את הסיכום ואת הגמרא – סמנו חזרה.'),
      h('div', { class: 'btnrow' },
        h('a', { class: 'btn', href: '#/beki/a/' + a.id + '/quiz' }, 'שאלות על העמוד (' + a.quiz.length + ')'),
        h('button', { class: 'btn ok', type: 'button', onclick: function () { S.amudReview(a.id); U.toast('נרשמה חזרה ✓'); APP.render(); } }, 'חזרתי על העמוד')),
      h('div', { class: 'btnrow' },
        k > 0 ? h('a', { class: 'btn sec', href: '#/beki/a/' + T.amudim[k - 1].id }, '→ ' + T.amudim[k - 1].daf) : null,
        k + 1 < T.amudim.length ? h('a', { class: 'btn sec', href: '#/beki/a/' + T.amudim[k + 1].id }, T.amudim[k + 1].daf + ' ←') : null)));
  }
  function quiz(app, id) {
    var k = find(id); if (k < 0) return; var a = T.amudim[k];
    app.appendChild(h('h2', null, 'שאלות: ' + a.daf));
    var root = h('div'); app.appendChild(root);
    var items = U.shuffle(Q.B.tq(T, [a.id]).concat(U.sample(Q.B.twho(T, [a.id]), 3)));
    Q.runMC(root, items, { back: { href: '#/beki/a/' + a.id, label: 'חזרה לעמוד' }, onEnd: function (r, t) { S.amudQuiz(a.id, r, t); } });
  }
  function rangePicker(onGo, label) {
    var from = h('select', { 'aria-label': 'מעמוד' }), to = h('select', { 'aria-label': 'עד עמוד' });
    T.amudim.forEach(function (a, i) { from.appendChild(h('option', { value: i }, a.daf)); to.appendChild(h('option', { value: i }, a.daf)); });
    to.value = String(T.amudim.length - 1);
    return h('div', { class: 'card' }, h('div', { class: 'grid2' }, h('label', null, 'מעמוד', from), h('label', null, 'עד עמוד', to)),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: function () {
        var f = +from.value, t = +to.value; if (t < f) { var x = f; f = t; t = x; }
        onGo(T.amudim.slice(f, t + 1).map(function (a) { return a.id; }));
      } }, label)));
  }
  function who(app) {
    app.appendChild(h('h2', null, 'מי אמר? – תענית'));
    var root = h('div');
    app.appendChild(rangePicker(function (ids) { root.innerHTML = ''; Q.runMC(root, U.sample(Q.B.twho(T, ids), 12), { back: { href: '#/beki', label: 'לבקיאות' } }); }, 'התחל (12 שאלות)'));
    app.appendChild(root);
  }
  return { load: load, home: home, amud: amud, quiz: quiz, who: who, rangePicker: rangePicker, data: function () { return T; } };
})();
