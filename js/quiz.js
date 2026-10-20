/* מנועי תרגול: שאלות בחירה (כולל מי אמר / שקלא וטריא / ארמית / נכון-לא נכון), סדר הסוגיא, הסבר סברה. */
'use strict';
var Q = (function () {
  var h = U.h;
  // ---------- בוני שאלות: כל שאלה = {id, tag, q, ctx, opts:[טקסט], ok: אינדקס, ex, ref, card} ----------
  function mk(id, tag, q, right, wrong, ex, ref, card, ctx) {
    var opts = U.shuffle([right].concat(wrong));
    return { id: id, tag: tag, q: q, ctx: ctx || '', opts: opts, ok: opts.indexOf(right), ex: ex || '', ref: ref || '', card: card || id };
  }
  function uniq(list, not, n) {
    var seen = {}; seen[not] = 1; var out = [];
    U.shuffle(list).forEach(function (x) { if (!seen[x] && out.length < n) { seen[x] = 1; out.push(x); } });
    return out;
  }
  var B = {
    mc: function (d) { return d.quiz.mc.map(function (x) { return mk('bq:' + x.id, 'הבנה', x.q, x.o[0], x.o.slice(1), x.ex, '', 'bq:' + x.id); }); },
    who: function (d) { return d.quiz.who.map(function (x) { return mk('bw:' + x.id, 'מי אמר', 'מי אמר:', x.a, x.d, '', '', 'bw:' + x.id, x.s); }); },
    shakla: function (d) { return d.quiz.shakla.map(function (x) { return mk('bs:' + x.id, 'שקלא וטריא', 'מה עונה הגמרא על:', x.a, x.d, x.ex || '', '', 'bs:' + x.id, x.k); }); },
    tf: function (d) { return d.quiz.tf.map(function (x) { return mk('bt:' + x.id, 'נכון / לא נכון', 'נכון או לא נכון?', x.a ? 'נכון' : 'לא נכון', [x.a ? 'לא נכון' : 'נכון'], x.ex, '', 'bt:' + x.id, x.s); }); },
    aram: function (d) {
      var all = d.glossary.map(function (g) { return g.m; });
      return d.glossary.map(function (g) { return mk('g:' + g.a, 'תרגום ארמית', 'מה פירוש המילה?', g.m, uniq(all, g.m, 3), '', '', 'g:' + g.a, g.v); });
    },
    concepts: function (d) {
      var all = d.concepts.map(function (c) { return c.x; });
      return d.concepts.map(function (c) { return mk('c:' + c.c, 'מושגים', 'מה פירוש המושג?', c.x, uniq(all, c.x, 3), '', '', 'c:' + c.c, c.c); });
    },
    tq: function (t, ids) {
      var out = [];
      t.amudim.forEach(function (a) { if (ids && ids.indexOf(a.id) < 0) return;
        a.quiz.forEach(function (x) { out.push(mk('tq:' + x.id, 'תענית ' + a.daf, x.q, x.o[0], x.o.slice(1), x.ex, x.ref, 'tq:' + x.id)); }); });
      return out;
    },
    twho: function (t, ids) {
      var names = []; t.amudim.forEach(function (a) { a.who.forEach(function (w) { if (names.indexOf(w.who) < 0) names.push(w.who); }); });
      var out = [];
      t.amudim.forEach(function (a) { if (ids && ids.indexOf(a.id) < 0) return;
        var here = a.who.map(function (w) { return w.who; });
        a.who.forEach(function (w, i) {
          // מסיחים: קודם חכמים אחרים מאותו עמוד (קשה יותר), ואחר כך מכל המסכת
          var wr = uniq(here, w.who, 3); if (wr.length < 3) wr = wr.concat(uniq(names.filter(function (n) { return wr.indexOf(n) < 0; }), w.who, 3 - wr.length));
          out.push(mk('tw:' + a.id + ':' + i, 'מי אמר · ' + a.daf, 'מי אמר:', w.who, wr, '', w.ref, 'tw:' + a.id + ':' + i, w.said));
        });
      });
      return out;
    }
  };
  // ---------- הרצת שאלות בחירה ----------
  // opts: {title, onEnd(right,total,wrongs), back:{href,label}}
  function runMC(root, items, opts) {
    opts = opts || {};
    var i = 0, right = 0, wrongs = [];
    function show() {
      root.innerHTML = '';
      if (i >= items.length) return end();
      var it = items[i], answered = false;
      var fb = h('div', { 'aria-live': 'polite' });
      var nextB = h('button', { class: 'btn', type: 'button', hidden: true, onclick: function () { i++; show(); } }, i + 1 < items.length ? 'לשאלה הבאה ←' : 'לתוצאות ←');
      var buttons = it.opts.map(function (o, k) {
        return h('button', { class: 'opt', type: 'button', onclick: function () {
          if (answered) return; answered = true;
          var good = k === it.ok;
          buttons.forEach(function (b, j) { b.setAttribute('aria-disabled', 'true'); if (j === it.ok) b.classList.add('right'); });
          if (good) { right++; this.classList.add('right'); } else { this.classList.add('wrong'); wrongs.push(it); S.toBox1(it.card); }
          U.beep(good);
          fb.appendChild(h('div', { class: 'fb ' + (good ? 'ok' : 'bad') }, good ? '✔ נכון. ' : '✘ לא מדויק. התשובה: ' + it.opts[it.ok] + '. ', it.ex || '', it.ref ? h('span', { class: 'ref' }, ' (' + it.ref + ')') : null));
          nextB.hidden = false; nextB.focus();
        } }, o);
      });
      root.appendChild(h('div', { class: 'card' },
        h('div', { class: 'qcount' }, 'שאלה ' + (i + 1) + ' מתוך ' + items.length + ' · ' + it.tag),
        h('p', { class: 'qq', id: 'qq' }, it.q),
        it.ctx ? h('p', { class: 'rq' }, it.ctx) : null,
        h('div', { class: 'opts', role: 'group', 'aria-labelledby': 'qq' }, buttons), fb, h('div', { class: 'btnrow' }, nextB)));
      var t = root.querySelector('.qq'); if (t) { t.setAttribute('tabindex', '-1'); }
    }
    function end() {
      if (opts.onEnd) opts.onEnd(right, items.length, wrongs);
      var pct = items.length ? Math.round(100 * right / items.length) : 0;
      root.appendChild(h('div', { class: 'card' },
        h('h3', null, 'תוצאה'), h('div', { class: 'score' }, right + '/' + items.length),
        h('p', { class: 'muted', style: 'text-align:center' }, pct >= 90 ? 'מצוין – שולט בחומר.' : pct >= 70 ? 'טוב. כדאי לחזור על הטעויות.' : 'כדאי לחזור על החומר ולנסות שוב.'),
        wrongs.length ? h('div', null, h('h3', null, 'לחזור על:'), h('p', { class: 'small muted' }, 'השאלות האלה נוספו לתא 1 בחזרה (לייטנר).'),
          h('ul', null, wrongs.map(function (w) { return h('li', null, (w.ctx ? w.ctx + ' – ' : w.q + ' – '), h('b', null, w.opts[w.ok])); }))) : null,
        h('div', { class: 'btnrow' },
          h('button', { class: 'btn', type: 'button', onclick: function () { items = items.map(function (x) { return mk(x.id, x.tag, x.q, x.opts[x.ok], x.opts.filter(function (_, j) { return j !== x.ok; }), x.ex, x.ref, x.card, x.ctx); }); items = U.shuffle(items); i = 0; right = 0; wrongs = []; show(); } }, 'שוב'),
          opts.back ? h('a', { class: 'btn sec', href: opts.back.href }, opts.back.label) : null)));
    }
    show();
  }
  // ---------- סדר הסוגיא: גרירה או חיצים ----------
  function runOrder(root, steps, onEnd) {
    var correct = steps.slice(), cur;
    do { cur = U.shuffle(correct); } while (steps.length > 1 && cur.join() === correct.join());
    var ol = h('ol', { class: 'order', 'aria-label': 'שלבי הסוגיא – סדרו מלמעלה למטה' });
    var fb = h('div', { 'aria-live': 'polite' });
    function clear() { ol.querySelectorAll('li').forEach(function (l) { l.classList.remove('right', 'wrong'); }); fb.innerHTML = ''; }
    function moveBy(li, d) {
      var sib = d < 0 ? li.previousElementSibling : li.nextElementSibling; if (!sib) return;
      if (d < 0) ol.insertBefore(li, sib); else ol.insertBefore(sib, li);
      clear(); var b = li.querySelector(d < 0 ? '.up' : '.dn'); if (b) b.focus();
    }
    cur.forEach(function (s) {
      var li = h('li', { 'data-s': s });
      var handle = h('button', { class: 'handle', type: 'button', 'aria-label': 'גרירה' }, '⠿');
      var up = h('button', { class: 'mv up', type: 'button', 'aria-label': 'הזז למעלה', onclick: function () { moveBy(li, -1); } }, '▲');
      var dn = h('button', { class: 'mv dn', type: 'button', 'aria-label': 'הזז למטה', onclick: function () { moveBy(li, 1); } }, '▼');
      li.appendChild(handle); li.appendChild(h('span', { class: 'tx' }, s)); li.appendChild(up); li.appendChild(dn);
      // מאזינים במסמך: הזזת ה-li ב-DOM מבטלת pointer capture
      var pid = null;
      var move = function (e) {
        if (pid !== e.pointerId) return; e.preventDefault();
        var y = e.clientY, items = [].slice.call(ol.children);
        for (var k = 0; k < items.length; k++) {
          var o = items[k]; if (o === li) continue; var r = o.getBoundingClientRect();
          if (y > r.top && y < r.bottom) { if (y < r.top + r.height / 2) ol.insertBefore(li, o); else ol.insertBefore(li, o.nextSibling); break; }
        }
      };
      var end = function (e) { if (pid !== e.pointerId) return; pid = null; li.classList.remove('dragging');
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); };
      handle.addEventListener('pointerdown', function (e) { pid = e.pointerId; li.classList.add('dragging'); clear(); e.preventDefault();
        document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end); });
      ol.appendChild(li);
    });
    var tries = 0;
    var check = h('button', { class: 'btn', type: 'button', onclick: function () {
      tries++;
      var lis = [].slice.call(ol.children), ok = 0;
      lis.forEach(function (l, k) { var g = l.getAttribute('data-s') === correct[k]; l.classList.toggle('right', g); l.classList.toggle('wrong', !g); if (g) ok++; });
      fb.innerHTML = '';
      var all = ok === correct.length; U.beep(all);
      fb.appendChild(h('div', { class: 'fb ' + (all ? 'ok' : 'bad') }, all ? '✔ הסדר נכון!' : ok + ' מתוך ' + correct.length + ' במקום הנכון. הירוקים במקום – נסו להזיז את האדומים.'));
      if (all && onEnd) onEnd(tries);
    } }, 'בדיקה');
    var show = h('button', { class: 'btn sec', type: 'button', onclick: function () {
      correct.forEach(function (s) { var li = ol.querySelector('[data-s="' + CSS.escape(s) + '"]'); ol.appendChild(li); }); clear();
      fb.appendChild(h('div', { class: 'fb ok' }, 'זה הסדר הנכון. נסו לזכור, ואחר כך תרגלו שוב.'));
    } }, 'הראה סדר נכון');
    root.appendChild(h('div', { class: 'card' }, h('p', { class: 'small muted' }, 'גררו בעזרת ⠿ או השתמשו בחיצים ▲▼. השלב הראשון למעלה.'), ol, fb, h('div', { class: 'btnrow' }, check, show)));
  }
  // ---------- הסבר סברה: כתיבה עצמית, ואז בדיקה מול נקודות ----------
  function runSevara(root, list, onEnd) {
    var i = 0, sum = 0;
    function show() {
      root.innerHTML = '';
      if (i >= list.length) {
        if (onEnd) onEnd(sum, list.length);
        root.appendChild(h('div', { class: 'card' }, h('h3', null, 'סיימתם את שאלות הסברה'), h('div', { class: 'score' }, Math.round(100 * sum / list.length) + '%'),
          h('p', { class: 'muted' }, 'הציון הוא לפי הנקודות שסימנתם בעצמכם. כדאי להסביר בעל פה לחבר או להורה.'),
          h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: function () { i = 0; sum = 0; show(); } }, 'שוב'), h('a', { class: 'btn sec', href: '#/iyun/practice' }, 'לתרגולים'))));
        return;
      }
      var it = list[i];
      var ta = h('textarea', { 'aria-label': 'ההסבר שלך', placeholder: 'כתבו כאן בקצרה את ההסבר שלכם (או אמרו אותו בקול)…' });
      var box = h('div');
      var reveal = h('button', { class: 'btn', type: 'button', onclick: function () {
        reveal.hidden = true;
        var cbs = it.pts.map(function (p, k) { return h('input', { type: 'checkbox', id: 'pt' + k }); });
        box.appendChild(h('div', { class: 'panel sv' }, h('b', null, 'האם ההסבר שלכם כולל את הנקודות?'),
          it.pts.map(function (p, k) { return h('label', { for: 'pt' + k }, cbs[k], h('span', null, p)); })));
        box.appendChild(h('div', { class: 'panel rashi' }, h('b', null, 'תשובה לדוגמה: '), it.model));
        box.appendChild(h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', onclick: function () {
          var c = cbs.filter(function (x) { return x.checked; }).length; sum += c / it.pts.length;
          if (c < it.pts.length) S.toBox1('sv:' + it.id); i++; show();
        } }, 'המשך ←')));
      } }, 'בדיקה מול נקודות התשובה');
      root.appendChild(h('div', { class: 'card' }, h('div', { class: 'qcount' }, 'סברה ' + (i + 1) + ' מתוך ' + list.length),
        h('p', { class: 'qq' }, it.q), ta, h('div', { class: 'btnrow' }, reveal), box));
    }
    show();
  }
  return { B: B, mk: mk, runMC: runMC, runOrder: runOrder, runSevara: runSevara };
})();
