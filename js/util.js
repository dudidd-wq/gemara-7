/* כלי עזר: DOM, ערבוב, שמע, משוב. JS רגיל, בלי שלב בנייה. */
'use strict';
var U = (function () {
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function strip(s) { return String(s || '').replace(/[\u0591-\u05C7]/g, '').replace(/["'׳״.,!?:;()\-–־]/g, '').replace(/\s+/g, ' ').trim(); }
  // ---------- שמע: תור קבצים, כפתור אחד פעיל ----------
  var audioEl = null, curBtn = null, queue = [], onDone = null;
  function ensure() {
    if (!audioEl) {
      audioEl = new Audio(); audioEl.preload = 'none';
      audioEl.addEventListener('ended', next);
      audioEl.addEventListener('error', function () { toast('לא הצלחתי להשמיע את הקטע'); stop(); });
    }
    return audioEl;
  }
  function next() {
    if (queue.length) { var it = queue.shift(); startOne(it); return; }
    var cb = onDone; finish(); if (cb) cb();
  }
  function startOne(it) {
    var a = ensure();
    if (it.onstart) it.onstart();
    a.src = it.file; var p = a.play(); if (p && p.catch) p.catch(function () { stop(); });
  }
  function finish() {
    if (curBtn) { curBtn.classList.remove('on'); curBtn.setAttribute('aria-pressed', 'false'); }
    curBtn = null; onDone = null; document.querySelectorAll('.playing').forEach(function (x) { x.classList.remove('playing'); });
  }
  // items: [{file, onstart}] ; לחיצה שנייה על אותו כפתור עוצרת
  function play(items, btn, done) {
    var same = curBtn && curBtn === btn;
    stop();
    if (same || !items.length) return;
    curBtn = btn || null; onDone = done || null;
    if (btn) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
    queue = items.slice(1); startOne(items[0]);
  }
  function stop() { queue = []; if (audioEl) audioEl.pause(); finish(); }
  function playBtn(items, label) {
    var b = h('button', { class: 'play', type: 'button', 'aria-label': label || 'השמעה', 'aria-pressed': 'false', text: '🔊' });
    b.addEventListener('click', function (e) { e.stopPropagation(); play(typeof items === 'function' ? items() : items, b); });
    return b;
  }
  // ---------- משוב ----------
  var actx = null;
  function beep(good) {
    if (!S.get().settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime, notes = good ? [660, 880] : [330, 294];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.1); g.gain.exponentialRampToValueAtTime(good ? 0.14 : 0.07, t + i * 0.1 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.1 + 0.2);
        o.connect(g); g.connect(actx.destination); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.22);
      });
    } catch (e) {}
  }
  var toastT = 0;
  function toast(msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function bar(ratio, label) {
    var pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    return h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': label || 'התקדמות' }, h('i', { style: 'width:' + pct + '%' }));
  }
  function fmtDate(ts) { if (!ts) return '—'; var d = new Date(ts); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2); }
  function cache(url) {
    cache.m = cache.m || {};
    if (!cache.m[url]) cache.m[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }).catch(function (e) { delete cache.m[url]; throw e; });
    return cache.m[url];
  }
  return { h: h, add: add, shuffle: shuffle, sample: sample, strip: strip, play: play, stop: stop, playBtn: playBtn,
    beep: beep, toast: toast, bar: bar, fmtDate: fmtDate, json: cache };
})();
