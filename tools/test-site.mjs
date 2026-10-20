// בדיקה אוטומטית בדפדפן (Chrome headless, תצוגת Samsung 412x915, מגע אמיתי).
// הרצה:  PW_DIR=/tmp/pw node tools/test-site.mjs [תיקיית-צילומים] [base-url]
import { chromium, CHROME } from './pw.mjs';
import { start } from './serve.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.resolve(process.argv[2] || '/tmp/g7-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const results = []; let failed = 0;
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info: String(info) }); if (!cond) failed++; console.log((cond ? '✔' : '✖') + ' ' + name + (info ? '  — ' + info : '')); };
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const bm = J('data/bm76.json'), ta = J('data/taanit.json'), audio = J('data/audio.json');
// ---------- בדיקות סטטיות ----------
try { const o = execFileSync('python3', [path.join(ROOT, 'tools/check-content.py')], { encoding: 'utf8' }); ok('content rules check (names / people emoji)', true, o.trim()); }
catch (e) { ok('content rules check (names / people emoji)', false, e.stdout); }
try { execFileSync('python3', [path.join(ROOT, 'tools/check-content.py'), '--self-test']); ok('content checker self-test', true); } catch (e) { ok('content checker self-test', false, e.stdout); }
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swFiles = JSON.parse(/var FILES = (\[[\s\S]*?\]);/.exec(sw)[1]);
ok('SW precache files exist', swFiles.every(f => f === './' || fs.existsSync(path.join(ROOT, f))));
ok('SW VERSION matches current content (build-sw.py was run)', (() => { const v = /VERSION = '([^']+)'/.exec(sw)[1]; const o = execFileSync('python3', [path.join(ROOT, 'tools/build-sw.py')], { encoding: 'utf8' }); return o.includes(v); })());
const aud = Object.values(audio), onDisk = fs.existsSync(path.join(ROOT, 'audio')) ? fs.readdirSync(path.join(ROOT, 'audio')) : [];
ok(`audio map: ${aud.length} clips, all files exist, none extra`, aud.every(f => onDisk.includes(f)) && onDisk.every(f => aud.includes(f)));
{ // מפתח ה-API (אם מוגדר בסביבה) לא מופיע באף קובץ באתר – בלי להדפיס אותו
  const key = process.env.ELEVENLABS_API_KEY || ''; let hit = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { if (f === '.git' || f === 'node_modules') continue; const q = path.join(d, f); if (fs.statSync(q).isDirectory()) walk(q); else { const t = fs.readFileSync(q); if ((key && t.includes(key)) || /sk_[a-f0-9]{30,}/.test(t.toString('latin1'))) hit.push(path.relative(ROOT, q)); } } };
  walk(ROOT); ok('no API keys / secrets in site files', !hit.length, hit.join(','));
}
// ---------- דפדפן ----------
let srv = null, BASE = process.argv[3];
if (!BASE) { srv = await start(8093); BASE = 'http://127.0.0.1:8093/'; }
const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: 'he-IL',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36', acceptDownloads: true });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
const go = async (r) => { await p.evaluate(r => { if (location.hash === '#/' + r) APP.render(); else location.hash = '#/' + r; }, r); await p.waitForTimeout(250); };
const shot = (n) => p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: false });
await p.goto(BASE); await p.waitForSelector('main h2');
ok('home renders both tracks', (await p.locator('a.track').count()) === 2);
// כל המסלולים
const ROUTES = ['', 'iyun', 'iyun/flow', 'iyun/words', 'iyun/practice', 'beki', 'beki/who', 'leitner', 'leitner/iyun', 'leitner/beki', 'exam', 'progress',
  ...bm.units.map(u => 'iyun/u/' + u.id), ...['mc', 'who', 'order', 'shakla', 'aram', 'sevara', 'tf', 'concepts'].map(m => 'iyun/practice/' + m),
  ...ta.amudim.map(a => 'beki/a/' + a.id), ...ta.amudim.map(a => 'beki/a/' + a.id + '/quiz')];
const NAMEJS = new RegExp('\u05D9\u05D4\u05D5\u05D4|(?<![\u05D0-\u05EA])\u05D0\u05DC\u05D5?\u05D4(?:\u05D9\u05DD|\u05D9(?:\u05E0\u05D5|\u05DA|\u05D5|\u05D4|\u05D4\u05DD|\u05DB\u05DD)?)(?![\u05D0-\u05EA])');
let overflow = [], small = [], names = [], blank = [];
for (const r of ROUTES) {
  await go(r);
  const info = await p.evaluate(() => {
    const t = document.body.innerText.replace(/[\u0591-\u05C7]/g, '');
    const sm = [...document.querySelectorAll('button, a, select, input, summary, [role=button]')].filter(e => { const s = e.getBoundingClientRect(); return s.width > 0 && s.height > 0 && !e.classList.contains('w') && !e.closest('.skip') && getComputedStyle(e).visibility !== 'hidden'; })
      .filter(e => { const s = e.getBoundingClientRect(); return (e.type === 'checkbox' || e.type === 'radio') ? false : (s.height < 47.5 || s.width < 47.5); }).map(e => (e.innerText || e.getAttribute('aria-label') || e.tagName).slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
    return { t, ov: document.documentElement.scrollWidth > window.innerWidth + 1, sm, h2: !!document.querySelector('main h2') };
  });
  if (info.ov) overflow.push(r); if (info.sm.length) small.push(r + ': ' + info.sm.slice(0, 3).join(' | ')); if (NAMEJS.test(info.t)) names.push(r); if (!info.h2) blank.push(r);
}
ok(`all ${ROUTES.length} routes render a heading`, !blank.length, blank.join(','));
ok('no horizontal overflow at 412px', !overflow.length, overflow.join(','));
ok('all tap targets ≥48px (except inline glossary words)', !small.length, small.slice(0, 5).join(' || '));
ok('no full divine name in rendered DOM (all routes)', !names.length, names.join(','));
// טקסט הגמרא בתענית (נטען לפי דרישה) – בדיקת שמות גם בו
{
  let bad = [];
  for (const a of ta.amudim) { await go('beki/a/' + a.id); await p.locator('details summary', { hasText: 'טקסט הגמרא' }).click(); await p.waitForSelector('.gem p'); const t = await p.locator('.gem').innerText(); if (NAMEJS.test(t.replace(/[\u0591-\u05C7]/g, ''))) bad.push(a.id); }
  ok('Taanit gemara text loads lazily for all 14 amudim, no full divine name', !bad.length, bad.join(','));
}
// ---------- עיון: יחידה ----------
await go('iyun/u/u1'); await shot('unit-u1');
await p.locator('.gtext .w').first().tap(); await p.waitForTimeout(150);
ok('tap on glossed word shows translation popup', await p.locator('.pop').isVisible());
await p.locator('.pop').tap();
const l1 = p.locator('.gline').first();
await l1.locator('.tg', { hasText: 'רש"י' }).tap(); ok('Rashi panel opens', await l1.locator('.panel.rashi').isVisible());
await l1.locator('.tg', { hasText: 'תוספות' }).tap(); ok('Tosafot panel opens with simple explanation', (await l1.locator('.panel.tos').innerText()).includes('בפשטות'));
await l1.locator('.tg', { hasText: 'רש"י' }).tap(); ok('Rashi panel toggles closed', !(await l1.locator('.panel.rashi').count()));
await p.locator('button', { hasText: 'הצג פשט לכל השורות' }).tap(); await p.waitForTimeout(150);
ok('"show pshat for all" shows pshat under every line', (await p.locator('.gline > .panel').count()) === bm.units[0].lines.length);
await p.locator('button', { hasText: 'הסתר פשט' }).tap(); await p.waitForTimeout(150);
await p.locator('button', { hasText: 'סיימתי את היחידה' }).tap(); await p.waitForTimeout(150);
await p.reload(); await p.waitForSelector('main h2');
ok('unit "done" persists after reload', await p.evaluate(() => !!JSON.parse(localStorage.g7_progress_v1).iyun.units.u1));
// שמע בעיון
{
  const n = Object.keys(audio).filter(k => k.startsWith('u')).length;
  if (n) {
    const u = bm.units.find(u => u.lines.some(l => audio[u.id + ':' + l.n + ':g'])); await go('iyun/u/' + u.id);
    const btn = p.locator('.gline .play').first(); await btn.tap(); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => { const a = [...document.querySelectorAll('audio')]; return document.querySelector('.play.on') ? 'on' : 'off'; });
    ok('line audio button starts playback (button pressed state)', st === 'on');
    const t = await p.evaluate(() => new Promise(r => setTimeout(() => r(document.querySelector('.play.on') !== null), 300)));
    await btn.tap(); ok('second tap stops playback', !(await p.locator('.play.on').count()));
  }
}
{ await go('iyun/u/u6'); const hs = await p.evaluate(() => [...document.querySelectorAll('.gtext .w')].map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  ok(`inline glossary words ≥24px (WCAG 2.5.8): ${hs.length} words`, hs.every(x => x >= 24), 'min ' + Math.round(Math.min(...hs))); }
{ await go('beki/a/2a'); const b = p.locator('button', { hasText: 'השמעת הסיכום' }); await b.tap(); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({ pr: document.querySelector('main [aria-pressed=true]')?.textContent || '', hl: !!document.querySelector('li.playing') }));
  ok('Taanit summary audio plays and highlights current point', st.pr.includes('השמעת') && st.hl); await b.tap(); }
// u8 טבלה
await go('iyun/u/u8'); ok('u8 shows ת"ק / רבי דוסא table', (await p.locator('table').innerText()).includes('רבי דוסא'));
// זרימה
await go('iyun/flow'); await shot('flow');
ok('flow chart has nodes for all units', (await p.locator('.flow li').count()) === bm.units.reduce((s, u) => s + u.flow.length, 0));
// ---------- תרגול בחירה ----------
async function runMC(answerRight) {
  let n = 0;
  while (await p.locator('.opts').count()) {
    const opts = p.locator('.opts .opt'); const c = await opts.count();
    // מוצאים את הנכונה דרך המשוב: לוחצים, בודקים
    await opts.nth(answerRight === 'first' ? 0 : c - 1).tap();
    await p.locator('.fb').waitFor(); n++;
    await p.locator('button', { hasText: /לשאלה הבאה|לתוצאות/ }).tap();
  }
  return n;
}
await p.evaluate(() => { const s = JSON.parse(localStorage.g7_progress_v1); s.leitner = {}; localStorage.g7_progress_v1 = JSON.stringify(s); }); await p.reload(); await p.waitForSelector('main h2');
await go('iyun/practice/mc'); const nq = await runMC('first');
const score = await p.locator('.score').innerText();
ok(`MC quiz runs all ${bm.quiz.mc.length} questions to a result screen`, nq === bm.quiz.mc.length && /\d+\/\d+/.test(score), score);
const wrongN = +score.split('/')[1] - +score.split('/')[0];
const lt = await p.evaluate(() => Object.keys(JSON.parse(localStorage.g7_progress_v1).leitner).length);
ok('wrong answers go to Leitner box 1', lt === wrongN, `wrong=${wrongN} leitner=${lt}`);
ok('quiz best score saved', await p.evaluate(() => JSON.parse(localStorage.g7_progress_v1).iyun.quiz.mc.best >= 0));
// כל שאלה: התשובה הנכונה מסומנת ירוק אחרי בחירה
await go('iyun/practice/who'); await p.locator('.opt').first().tap();
ok('after answering, correct option is highlighted', (await p.locator('.opt.right').count()) === 1);
// ---------- סדר הסוגיא: גרירה במגע אמיתי ----------
await go('iyun/practice/order'); await p.waitForSelector('.order li');
const cdp = await ctx.newCDPSession(p);
async function touchDrag(from, to) {
  const a = await from.boundingBox(), z = await to.boundingBox();
  const x = a.x + a.width / 2, y = a.y + a.height / 2, y2 = z.y + z.height * 0.75;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (y2 - y) * i / 12 }] }); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
{
  const before = await p.locator('.order li .tx').allInnerTexts();
  await touchDrag(p.locator('.order li .handle').first(), p.locator('.order li').nth(2)); await p.waitForTimeout(200);
  const after = await p.locator('.order li .tx').allInnerTexts();
  ok('order game: touch drag moves item down 2+ places', after.indexOf(before[0]) >= 2, `${before[0].slice(0, 15)} -> pos ${after.indexOf(before[0])}`);
  // פתרון בעזרת חיצים
  const correct = bm.quiz.order.slice(0, 6);
  for (let k = 0; k < correct.length; k++) {
    let cur = await p.locator('.order li .tx').allInnerTexts(); let i = cur.indexOf(correct[k]);
    while (i > k) { await p.locator('.order li').nth(i).locator('.up').tap(); i--; }
  }
  await p.locator('button', { hasText: 'בדיקה' }).tap();
  ok('order game: arrow buttons solve it and check says correct', (await p.locator('.fb.ok').innerText()).includes('הסדר נכון'));
  await shot('order');
}
// ---------- סברה ----------
await go('iyun/practice/sevara'); await p.locator('textarea').fill('בדיקה');
await p.locator('button', { hasText: 'בדיקה מול נקודות' }).tap(); await p.locator('.sv input').first().check();
ok('sevara shows points + model answer', (await p.locator('.panel.rashi').innerText()).includes('תשובה לדוגמה'));
await p.locator('button', { hasText: 'המשך' }).tap(); ok('sevara advances', (await p.locator('.qcount').innerText()).includes('2 מתוך'));
// ---------- בקיאות ----------
await go('beki/a/2a'); await shot('beki-2a');
await p.locator('button', { hasText: 'חזרתי על העמוד' }).tap(); await p.waitForTimeout(150);
ok('Taanit review recorded', await p.evaluate(() => JSON.parse(localStorage.g7_progress_v1).beki.amudim['2a'].reviews.length === 1));
await go('beki'); ok('beki list shows review count', (await p.locator('.item').first().innerText()).includes('חזרות: 1'));
await go('beki/a/3b/quiz'); const n3 = await runMC('first'); ok('amud quiz completes', n3 >= 4 && await p.evaluate(() => JSON.parse(localStorage.g7_progress_v1).beki.amudim['3b'].best != null));
await go('beki/who'); await p.locator('button', { hasText: 'התחל' }).tap(); ok('who-said (Taanit) runs 12 questions', (await p.locator('.qcount').innerText()).includes('מתוך 12'));
// ---------- לייטנר ----------
await go('leitner'); await shot('leitner');
await p.locator('button', { hasText: /התחלת חזרה|כרטיסים חדשים/ }).tap();
let graded = 0;
for (let i = 0; i < 4; i++) { await p.locator('button', { hasText: 'הצג תשובה' }).tap(); await p.locator('button', { hasText: i % 2 ? '✗ לא ידעתי' : '✓ ידעתי' }).tap(); graded++; }
const boxes = await p.evaluate(() => { const L = JSON.parse(localStorage.g7_progress_v1).leitner; const c = [0, 0, 0, 0, 0, 0]; Object.values(L).forEach(x => c[x.b]++); return c; });
ok('Leitner: known cards move to box 2, unknown stay in box 1', boxes[2] >= 2 && boxes[1] >= 1, JSON.stringify(boxes));
// ---------- מבחן ----------
await go('exam'); await p.locator('label', { hasText: /^10$/ }).tap(); await p.locator('button', { hasText: 'התחלת מבחן' }).tap();
const ne = await runMC('last'); ok('exam: 10 mixed questions, result saved to history', ne === 10 && await p.evaluate(() => JSON.parse(localStorage.g7_progress_v1).exams.length === 1));
await go('exam'); ok('exam history listed', (await p.locator('text=מבחנים אחרונים').count()) === 1);
// ---------- ייצוא / ייבוא ----------
await go('progress');
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'ייצוא לקובץ JSON' }).tap()]);
const fp = path.join(SHOTS, 'export.json'); await dl.saveAs(fp); const ex = JSON.parse(fs.readFileSync(fp, 'utf8'));
ok('export JSON contains progress', ex.app === 'gemara-7' && ex.data.iyun.units.u1 && ex.data.exams.length === 1);
p.once('dialog', d => d.accept()); await p.locator('button', { hasText: 'איפוס' }).tap(); await p.waitForTimeout(200);
ok('reset clears progress', await p.evaluate(() => !JSON.parse(localStorage.g7_progress_v1).iyun.units.u1));
await p.locator('input[type=file]').setInputFiles(fp); await p.waitForTimeout(400);
ok('import restores progress', await p.evaluate(() => !!JSON.parse(localStorage.g7_progress_v1).iyun.units.u1));
fs.writeFileSync('/tmp/bad.json', '{"x":1}'); await p.locator('input[type=file]').setInputFiles('/tmp/bad.json'); await p.waitForTimeout(300);
ok('invalid import file rejected (progress kept)', await p.evaluate(() => !!JSON.parse(localStorage.g7_progress_v1).iyun.units.u1) && (await p.locator('#toast').innerText()).includes('לא תקין'));
// גודל טקסט
await p.locator('input[type=range]').fill('1.3'); ok('text size setting applies', await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim() === '1.3'));
await p.locator('input[type=range]').fill('1');
// ---------- אופליין ----------
await p.goto(BASE); await p.waitForSelector('main h2');
await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
await p.reload(); await p.waitForTimeout(500);
await ctx.setOffline(true);
await p.reload(); await p.waitForSelector('main h2', { timeout: 8000 }).catch(() => {});
await go('iyun/u/u3'); const offOK = (await p.locator('.gline').count()) > 0;
await go('beki/a/5a'); await p.locator('details summary', { hasText: 'טקסט הגמרא' }).click(); await p.waitForTimeout(400);
ok('works offline after first visit (SW): unit + Taanit text', offOK && (await p.locator('.gem p').count()) > 0);
await ctx.setOffline(false);
ok('no console errors', !errs.filter(e => !/favicon/.test(e)).length, errs.slice(0, 3).join(' | '));
await b.close(); if (srv) srv.close();
fs.writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify({ failed, results }, null, 1));
console.log(failed ? `✖ ${failed} failed` : `✔ all ${results.length} passed`);
process.exit(failed ? 1 : 0);
