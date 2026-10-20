import { chromium, CHROME } from './pw.mjs';
import { start } from './serve.mjs';
const srv = await start(8091);
const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['', 'iyun', 'iyun/u/u1', 'iyun/u/u8', 'iyun/flow', 'iyun/words', 'iyun/practice', 'iyun/practice/mc', 'iyun/practice/order', 'iyun/practice/sevara', 'iyun/practice/aram', 'iyun/practice/unit/u3', 'beki', 'beki/a/2a', 'beki/a/2a/quiz', 'beki/who', 'leitner', 'exam', 'progress'];
await p.goto('http://127.0.0.1:8091/');
for (const r of routes) {
  await p.evaluate(r => location.hash = '#/' + r, r); await p.waitForTimeout(400);
  const t = await p.evaluate(() => document.querySelector('main').innerText.slice(0, 80).replace(/\n/g, ' | '));
  console.log(r || 'home', '→', t);
  await p.screenshot({ path: `/tmp/g7_${(r || 'home').replace(/\//g, '_')}.png` });
}
console.log('errors:', errs);
await b.close(); srv.close();
