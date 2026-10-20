/* התקדמות ב-localStorage, ייצוא/ייבוא JSON, ושיטת לייטנר (5 תאים). */
'use strict';
var S = (function () {
  var KEY = 'g7_progress_v1', DAY = 864e5;
  // מרווחי חזרה לפי תא: 1 = היום, 2 = מחר, 3 = עוד 3 ימים, 4 = שבוע, 5 = שבועיים
  var INTERVAL = [0, 0, 1, 3, 7, 14];
  function blank() { return { v: 1, iyun: { units: {}, quiz: {} }, beki: { amudim: {} }, leitner: {}, exams: [], settings: { sound: true, fs: 1 } }; }
  function norm(p) {
    var b = blank();
    if (!p || typeof p !== 'object') return b;
    p.iyun = p.iyun || b.iyun; p.iyun.units = p.iyun.units || {}; p.iyun.quiz = p.iyun.quiz || {};
    p.beki = p.beki || b.beki; p.beki.amudim = p.beki.amudim || {};
    p.leitner = p.leitner || {}; p.exams = Array.isArray(p.exams) ? p.exams : [];
    p.settings = p.settings || b.settings; if (p.settings.sound == null) p.settings.sound = true; p.settings.fs = +p.settings.fs || 1;
    p.v = 1; return p;
  }
  var st;
  try { st = norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { st = blank(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  // ---------- לייטנר ----------
  function card(id) { return st.leitner[id] || null; }
  function isDue(id) { var c = card(id); return !c || c.due <= Date.now(); }
  function grade(id, ok) {
    var c = st.leitner[id] || { b: 1, due: 0, n: 0, ok: 0 };
    c.n++; if (ok) c.ok++;
    c.b = ok ? Math.min(5, c.b + 1) : 1;
    c.due = today() + INTERVAL[c.b] * DAY; c.at = Date.now();
    st.leitner[id] = c; save(); return c;
  }
  function toBox1(id) { var c = st.leitner[id] || { b: 1, n: 0, ok: 0 }; c.b = 1; c.due = 0; c.at = Date.now(); st.leitner[id] = c; save(); }
  function boxCounts(ids) {
    var r = [0, 0, 0, 0, 0, 0]; // 0 = עוד לא נלמד
    ids.forEach(function (id) { var c = card(id); r[c ? c.b : 0]++; }); return r;
  }
  // ---------- עיון ובקיאות ----------
  function unitDone(id, v) { if (v === undefined) return !!st.iyun.units[id]; if (v) st.iyun.units[id] = Date.now(); else delete st.iyun.units[id]; save(); }
  function quizRec(key, right, total) {
    var q = st.iyun.quiz[key] || { best: 0, tries: 0 };
    var pct = total ? Math.round(100 * right / total) : 0;
    q.best = Math.max(q.best, pct); q.last = pct; q.tries++; q.at = Date.now(); st.iyun.quiz[key] = q; save(); return q;
  }
  function amud(id) { return st.beki.amudim[id] || (st.beki.amudim[id] = { reviews: [] }); }
  function amudReview(id) { var a = amud(id); a.reviews.push(Date.now()); if (a.reviews.length > 50) a.reviews = a.reviews.slice(-50); save(); }
  function amudQuiz(id, right, total) { var a = amud(id); var pct = Math.round(100 * right / total); a.best = Math.max(a.best || 0, pct); a.last = pct; a.qat = Date.now(); save(); }
  // ---------- ייצוא/ייבוא ----------
  function exportJSON() { return JSON.stringify({ app: 'gemara-7', exported: new Date().toISOString(), data: st }, null, 1); }
  function importJSON(txt) {
    var o = JSON.parse(txt); var d = o && o.app === 'gemara-7' ? o.data : o;
    if (!d || typeof d !== 'object' || !(d.iyun || d.beki || d.leitner)) throw new Error('bad');
    st = norm(d); save();
  }
  function reset() { var s = st.settings; st = blank(); st.settings = s; save(); }
  return { get: function () { return st; }, save: save, card: card, isDue: isDue, grade: grade, toBox1: toBox1, boxCounts: boxCounts,
    unitDone: unitDone, quizRec: quizRec, amud: amud, amudReview: amudReview, amudQuiz: amudQuiz,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset, INTERVAL: INTERVAL };
})();
