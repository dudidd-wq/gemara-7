#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""בוחן חיצוני לקריינות: שני "שופטים" מתמללים כל הקלטה בעיוורון – ivrit-ai (faster-whisper מקומי) ו-ElevenLabs Scribe v2 –
וציון 0–10 מחושב מול ההגייה הצפויה (tools/examiner.py, כמו באתר הקודם). קטע נכנס לאתר רק בציון 9 ומעלה.
  python3 tools/exam.py score [ids/prefix]    # בוחן את כל ההקלטות הקיימות
  python3 tools/exam.py loop  [ids/prefix]    # לקטעים מתחת ל-9: ניסיונות חוזרים (nq/hyph/comma/slow/split), בתקציב התווים
תוצאות: $TTS_DIR/exam.json (מחוץ למאגר)."""
import os, sys, json, re, time, hashlib, subprocess, threading
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__)); sys.path.append('/workspace/gemara_bm23b')
import tts as T, examiner as X, asr_local as A, bm_phonetic as PH
import stt as STT
JUDGES = ('ivrit', 'scribe'); PASS = 9.0; LOCK = threading.Lock()
MAXNEW = int(os.environ.get('MAXNEW', '5'))
def load(): return json.load(open(T.EXAM, encoding='utf-8')) if os.path.exists(T.EXAM) else {}
def save(res):
    tmp = T.EXAM + '.tmp'; json.dump(res, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0); os.replace(tmp, T.EXAM)
def transcripts(key):
    p = f'{T.D}/{key}.mp3'; tr = {}
    for j in JUDGES:
        for att in range(3):
            try: tr[j] = STT.stt(p, model='scribe_v2')['text'] if j == 'scribe' else A.asr(p, j)['text']; break
            except Exception as e: tr[j] = ''; print('ASR ERR', key, j, e, flush=True); time.sleep(5)
    return tr
def score_take(key, exp_text):
    r = X.examine(exp_text, transcripts(key), f'{T.D}/{key}.mp3'); r['key'] = key; return r
def takes(cid, text=None):
    out, seen = [], set()
    if text and os.path.exists(f'{T.D}/{T.key(text)}.mp3'): seen.add(T.key(text)); out.append({'key': T.key(text), 'text': text, 'tag': cid})
    for l in open(T.LED):
        d = json.loads(l)
        if d['status'] != 'sent' or d['key'] in seen: continue
        if not (d.get('tag') == cid or d.get('tag', '').startswith(cid + '~')): continue
        if os.path.exists(f"{T.D}/{d['key']}.mp3"): seen.add(d['key']); out.append({'key': d['key'], 'text': d.get('text', ''), 'tag': d['tag']})
    for f in os.listdir(T.D):   # הקלטות מחוברות (split)
        if f.startswith('cat_') and f.endswith('.json') and not f.endswith('.ivrit.json') and '.mp3.' not in f:
            m = json.load(open(f'{T.D}/{f}'))
            if m.get('cid') == cid and m['key'] not in seen: seen.add(m['key']); out.append({'key': m['key'], 'text': m['text'], 'tag': cid + '~split'})
    return out
def score(only):
    jobs = T.sel(T.plan(), only); res = load()
    todo = [(j, t) for j in jobs for t in takes(j[0], j[2]) if t['key'] not in res.get(j[0], {}).get('takes', {})]
    print(len(jobs), 'clips', len(todo), 'new takes', flush=True)
    def one(x):
        j, t = x; r = score_take(t['key'], j[3]); r.update(text=t['text'], tag=t['tag']); return j, r
    n = 0
    with ThreadPoolExecutor(3) as pool:
        for j, r in pool.map(one, todo):
            with LOCK:
                e = res.setdefault(j[0], {'kind': j[1], 'expected': j[3], 'takes': {}}); e['takes'][r['key']] = r; n += 1
                if n % 5 == 0: save(res)
            if n % 20 == 0: print(n, time.strftime('%H:%M'), flush=True)
    save(res); summary(res, jobs)
def summary(res, jobs):
    ok = sum(1 for j in jobs if j[0] in res and T.best_take(res[j[0]])['score'] >= PASS)
    print('pass', ok, '/', len(jobs), 'spent', T.spent(), flush=True)
PUNCT = re.compile(r'^([^\u05D0-\u05EA]*)(.*?)([^\u05D0-\u05EA\u0591-\u05C7]*)$')
def split_tok(t): m = PUNCT.match(t); return m.group(1), m.group(2), m.group(3)
PREF = 'דובלהכמש'
def hyph(w): return w[0] + '-' + w[1:] if len(w) > 3 and w[0] in PREF else w
def weak_idx(take, n):
    ws = take.get('words', [])
    pairs = [(k, c) for k, (w, c) in enumerate(ws) if k < n]
    bad = [i for i, c in sorted(pairs, key=lambda p: p[1]) if c < 0.92][:2]
    return bad or ([min(pairs, key=lambda p: p[1])[0]] if pairs else [])
def trimmed(src, dst):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '44100', '-ac', '1', dst], check=True)
def concat(cid, keys, text):
    ck = 'cat_' + hashlib.sha1('|'.join(keys).encode()).hexdigest()[:10]; out = f'{T.D}/{ck}.mp3'
    if not os.path.exists(out):
        tmp = []
        for n, k in enumerate(keys):
            p = f'/tmp/{ck}_{n}.wav'; trimmed(f'{T.D}/{k}.mp3', p); tmp.append(p)
        sil = f'/tmp/{ck}_sil.wav'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.2', sil], check=True)
        lst = f'/tmp/{ck}.txt'; open(lst, 'w').write(''.join(f"file '{p}'\nfile '{sil}'\n" for p in tmp[:-1]) + f"file '{tmp[-1]}'\n")
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'libmp3lame', '-b:a', '128k', out], check=True)
    json.dump({'cid': cid, 'key': ck, 'text': text, 'parts': keys}, open(f'{T.D}/{ck}.json', 'w'), ensure_ascii=False)
    return ck
SLOW = dict(T.VS, speed=0.8)
def improve(cid, kind, base_text, exp, nq_line, res):
    e = res[cid]; best = lambda: T.best_take(e); n = 0; log = []
    ph = base_text.split()
    nqs = nq_line.split() if nq_line else ph
    if len(nqs) != len(ph): nqs = ph
    tried = set((t.get('text') or '') + '|' + str(t.get('vs')) for t in e['takes'].values())
    plan_ = ['nq', 'hyph', 'comma', 'slow', 'split'] if kind == 'gemara' else ['comma', 'slow', 'split', 'hyph']
    for how in plan_:
        b = best()
        if b['score'] >= PASS or n >= MAXNEW: break
        weak = weak_idx(b, len(ph)); toks = (b.get('text') or base_text).split()
        if len(toks) != len(ph) or '⟂' in (b.get('text') or ''): toks = ph[:]
        try:
            vs = None
            if how == 'split':
                lo, hi = min(weak), max(weak)
                parts = [' '.join(toks[:lo]), ' '.join(toks[lo:hi + 1]), ' '.join(toks[hi + 1:])]
                parts = [p for p in parts if re.search(r'[\u05D0-\u05EA]', p)]
                if len(parts) < 2: continue
                keys = [T.tts(p, cid + '~part')[0] for p in parts]; text = ' ⟂ '.join(parts); k = concat(cid, keys, text)
            else:
                out = []
                for i, t in enumerate(toks):
                    if i not in weak or how == 'slow': out.append(t); continue
                    a, core, z = split_tok(t)
                    if how == 'nq': out.append(a + split_tok(nqs[i])[1] + z)
                    elif how == 'hyph': out.append(a + hyph(X.NQ.sub('', core)) + z)
                    elif how == 'comma': out.append(a + core + (z if z else ','))
                text = re.sub(r',,+', ',', ' '.join(out))
                if how == 'slow': vs = SLOW
                if text + '|' + str(vs) in tried: continue
                k = T.tts(text, cid + '~' + how, vs=vs)[0]
        except (T.Budget, T.Quota) as ex: log.append('STOP ' + str(ex)[:60]); return cid, best()['score'], log, True
        except RuntimeError as ex: log.append(f'ERR {ex}'[:120]); continue
        tried.add(text + '|' + str(vs)); n += 1
        r = score_take(k, exp); r.update(text=text, tag=cid + '~' + how, strategy=how, vs=vs)
        with LOCK: e['takes'][k] = r; save(res)
        log.append(f'{how}:{r["score"]}')
    return cid, best()['score'], log, False
def loop(only):
    res = load(); d = json.load(open(os.path.join(T.ROOT, 'data/bm76.json'), encoding='utf-8'))
    nq = {'%s:%d:g' % (u['id'], l['n']): l['niqqud'] for u in d['units'] for l in u['lines']}
    jobs = [j for j in T.sel(T.plan(), only) if j[0] in res and T.best_take(res[j[0]])['score'] < PASS]
    print(len(jobs), 'below', PASS, 'spent', T.spent(), flush=True)
    stop = {'v': False}
    def one(j):
        if stop['v']: return j[0], None, ['skipped'], True
        g = nq.get(j[0]); nql = re.sub(r'\s*–\s*', ', ', g.replace('״', '').replace('׳', '')) if g else None
        r = improve(j[0], j[1], j[2], j[3], nql, res)
        if r[3]: stop['v'] = True
        return r
    with ThreadPoolExecutor(3) as pool:
        for cid, sc, log, st in pool.map(one, jobs): print(cid, sc, log, 'spent', T.spent(), flush=True)
    save(res); summary(res, T.sel(T.plan(), only))
def rescore(only):
    """מחשב מחדש ציונים מהתמלולים השמורים (בלי עלות). תמלול ריק – מתמללים שוב."""
    res = load(); plan = {j[0]: j for j in T.plan()}
    for c, e in res.items():
        if only and not any(c.startswith(o) for o in only): continue
        e['expected'] = plan[c][3]
        for k, t in list(e['takes'].items()):
            tr = t['transcripts']
            if not all((tr.get(j) or '').strip() for j in JUDGES):
                for j in JUDGES:
                    if not (tr.get(j) or '').strip():
                        for suf in ('.ivrit.json', '.scribe_v2.json'):
                            f = f'{T.D}/{k}.mp3' + suf
                            if os.path.exists(f) and not (json.load(open(f)).get('text') or '').strip(): os.remove(f)
                tr = transcripts(k)
            r = X.examine(e['expected'], tr, f'{T.D}/{k}.mp3'); r['key'] = k
            for f in ('text', 'tag', 'strategy', 'vs'):
                if f in t: r[f] = t[f]
            e['takes'][k] = r
    save(res); summary(res, T.sel(T.plan(), only))
if __name__ == '__main__':
    {'score': score, 'loop': loop, 'rescore': rescore}[sys.argv[1]](sys.argv[2:])
