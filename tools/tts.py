#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""קריינות (ElevenLabs) – קול "תומר", מודל eleven_v4, אותן הגדרות כמו באתר הקודם (gemara-bm23b).
  python3 tools/tts.py plan [-v]        # מכין טקסטים ומדפיס סיכום (בלי קריאות API)
  python3 tools/tts.py gen [ids/prefix] # יוצר קטעים חסרים (מטמון לפי hash; יומן שמסרב לחזור על קריאה שאולי חויבה)
  python3 tools/tts.py encode           # MP3 מונו 48k אל audio/ + data/audio.json – רק קטעים שקיבלו 9 ומעלה בבוחן
המטמון, היומן ותוצאות הבוחן – מחוץ למאגר: $TTS_DIR (ברירת מחדל /workspace/gemara-7-build/tts). המפתח רק ממשתנה סביבה."""
import os, re, sys, json, hashlib, base64, time, ssl, socket, subprocess, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import bm_phonetic as PH
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.environ.get('TTS_DIR', '/workspace/gemara-7-build/tts'); LED = D + '/ledger.jsonl'
EXAM = D + '/exam.json'
VOICE = 'yGpVFXFoImvRvaURKypy'
MODEL = 'eleven_v4'
VS = {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.35, 'speed': 0.9, 'use_speaker_boost': True}
NQ = re.compile(r'[\u0591-\u05C7]')
def key(text, vs=None): return hashlib.sha1(json.dumps([text, VOICE, MODEL, vs or VS], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:14]
# ---------- טקסט ההסבר להקראה ----------
ABBR = [('בעה"ב', 'בעל הבית'), ('רש"י', 'רַשִׁי'), ('ת"ק', 'תנא קמא'), ('ר\'', 'רבי'), ('= 2 דינרים', 'שהם שני דינרים'), ('?!', '?'), ('בעלי מלאכה', 'בַּעֲלֵי מלאכה'), ('של בעלי', 'של בַּעְלִי'), ('...', ','), ('ע"ה ע"ב', 'דף עין הא, עמוד בית'), ('ע"ו ע"א', 'דף עין וו, עמוד אלף'), ('ע"ו ע"ב', 'דף עין וו, עמוד בית')]
FIX = {'חמר': 'חַמָּר', 'קדר': 'קַדָּר', 'המשרה': 'הַמִּשְׁרָה', 'שנתה': 'שָׁנְתָה', 'ששנינו': 'שֶׁשָּׁנִינוּ', 'שנוי': 'שָׁנוּי', 'שמין': 'שָׁמִין',
       'עידור': 'עִידּוּר', 'לעדור': 'לַעְדּוֹר', 'דוסא': 'דּוֹסָא', 'חייא': 'חִיָּיא', 'אבוה': 'אֲבוּהּ', 'רבא': 'רָבָא', 'רבה': 'רַבָּה', 'אשי': 'אָשֵׁי',
       'סלע': 'סֶלַע', 'סלעים': 'סְלָעִים', 'צריכא': 'צְרִיכָא', 'בברייתא': 'בַּבָּרַיְיתָא', 'ברייתא': 'בָּרַיְיתָא', 'הברייתא': 'הַבָּרַיְיתָא', 'ברייתות': 'בָּרַיְיתוֹת',
       'לחה': 'לַחָה', 'אפריון': 'אַפִּרְיוֹן', 'לאפריון': 'לְאַפִּרְיוֹן', 'בעיא': 'בַּעְיָא', 'והבעיא': 'וְהַבַּעְיָא', 'נפשטה': 'נִפְשְׁטָה', 'שכרכם': 'שְׂכַרְכֶם',
       'מבערב': 'מִבָּעֶרֶב', 'מזלם': 'מַזָּלָם', 'כפועל': 'כְּפוֹעֵל', 'בטל': 'בָּטֵל', 'להולכה': 'לְהוֹלָכָה', 'לקבלה': 'לְקַבָּלָה', 'גיטי': 'גִּיטִּי',
       'חמרים': 'חַמָּרִים', 'משלם': 'מִשָּׁלֵם', 'חביבי': 'חֲבִיבִי', 'התנא': 'הַתַּנָּא', 'תנא': 'תַּנָּא', 'קמא': 'קַמָּא', 'שנה': 'שָׁנָה', 'דודי': 'דּוֹדִי',
       'הטעו': 'הִטְעוּ', 'מטעה': 'מַטְעֶה', 'הטעה': 'הִטְעָה', 'תרעומת': 'תַּרְעוֹמֶת', 'בקבלנות': 'בְּקַבְּלָנוּת', 'שוכר': 'שׂוֹכֵר', 'ששוכר': 'שֶׁשּׂוֹכֵר',
       'הפשתן': 'הַפִּשְׁתָּן', 'קרה': 'קָרָה', 'עמוס': 'עָמוּס', 'ריק': 'רֵיק', 'בגללם': 'בִּגְלָלָם', 'שמפסידים': 'שֶׁמַּפְסִידִים', 'שמפסיד': 'שֶׁמַּפְסִיד',
       'משנה': 'מִשְׁנָה', 'המשנה': 'הַמִּשְׁנָה', 'שמשנה': 'שֶׁמְּשַׁנֶּה', 'שכור': 'שְׂכוֹר', 'ושכור': 'וּשְׂכוֹר'}
SRC_REF = re.compile(r'\s*\((?:משלי|דברים|ויקרא|שמות|במדבר|איוב|תהלים|ישעיה|ירמיה|הושע|יואל|עמוס|שמואל [אב]|מלכים [אב]|דף)\b[^)]*\)')
TA_ABBR = [('הקב"ה', 'הקדוש ברוך הוא'), ('ת"ר', 'תנו רבנן'), ('יו"ט', 'יום טוב'), ('כריב"ב', 'כרבי יהודה בן בתירה'), ('כ"ד ספרים', 'עשרים וארבעה ספרים'),
    ('21 יום', 'עשרים ואחד יום'), ('מ-י-ם = "מים"', 'מם, יוד, מם, כלומר מים'), ('(מ-י-ם)', ', מם, יוד, מם,'), (' / ', ' או '),
    ("בב'–ג'–ד' בניסן", 'בשניים, בשלושה ובארבעה בניסן'), ("בה' בניסן", 'בחמישה בניסן'), ("ג', ז', י\"ז", 'שלושה, שבעה ושבעה עשר'), ("ז', י\"ז, כ\"ג", 'שבעה, שבעה עשר ועשרים ושלושה'),
    ('י"ז, כ"ג', 'שבעה עשר, עשרים ושלושה'), ("ג' במרחשון", 'בשלושה במרחשון'), ("בז'", 'בשבעה'), ("ה' בראתיו", 'השם בראתיו'), ('כמין קובה', 'כמין קוּבָּה')]
T_FIX = {k: v for k, v in FIX.items() if k in ('רבא', 'רבה', 'אשי', 'חייא', 'ברייתא', 'בברייתא', 'הברייתא', 'משנה', 'המשנה', 'תנא', 'שנתה')}
def tts_expl(t, taanit=False):
    if taanit:
        for a, b in TA_ABBR: t = t.replace(a, b)
    for a, b in ABBR: t = t.replace(a, b)
    t = SRC_REF.sub('', t)
    t = t.replace('"', '').replace('״', '').replace('׳', '')
    t = re.sub(r'\(([^)]*)\)', lambda m: ', ' + m.group(1).rstrip('.') + ',', t)
    t = re.sub(r'\s*–\s*', ', ', t)
    out = []
    for w in t.split(' '):
        m = re.match(r'^([^\u05D0-\u05EA]*)([\u05D0-\u05EA]+)(.*)$', w)
        F = T_FIX if taanit else FIX
        if m and m.group(2) in F: w = m.group(1) + F[m.group(2)] + m.group(3)
        out.append(w)
    t = ' '.join(out)
    t = re.sub(r'\s+,', ',', t); t = t.replace('.,', '.'); t = t.replace(':,', ':'); t = t.replace('?,', '?'); t = t.replace('!,', '!')
    t = re.sub(r',\s*([,.:;!?])', r'\1', t); t = re.sub(r',\s*,', ',', t); t = re.sub(r'\s+', ' ', t).strip().rstrip(',:;')
    return t
def tts_gemara(nq):
    return PH.phon(nq)
def expect_gemara(nq):
    t = nq.replace('״', '').replace('׳', '').replace('מַתְנִי', 'מַתְנִיתִין').replace('גְּמָ ', 'גְּמָרָא ')
    return re.sub(r'\s*–\s*', ', ', t)
# ההגייה הצפויה בלבד (לבוחן; לא משנה את מה שנשלח להקראה): שמות שנהגים בחיריק
EXPECT_FIX = {'חסדא': 'חִסְדָּא', 'אשה': 'אִשָּׁה'}
def expect_fix(t):
    for a, b in EXPECT_FIX.items(): t = re.sub(r'(?<![\u05D0-\u05EA])' + a + r'(?![\u05D0-\u05EA])', b, t)
    return t
def plan():
    d = json.load(open(os.path.join(ROOT, 'data/bm76.json'), encoding='utf-8'))
    jobs = []   # (id, kind, tts_text, expected_text)
    for u in d['units']:
        for l in u['lines']:
            jobs.append(('%s:%d:g' % (u['id'], l['n']), 'gemara', tts_gemara(l['niqqud']), expect_gemara(l['niqqud'])))
            e = tts_expl(l['pshat']); jobs.append(('%s:%d:e' % (u['id'], l['n']), 'expl', e, expect_fix(e)))
    if os.environ.get('WITH_TAANIT', '1') == '1':
        t = json.load(open(os.path.join(ROOT, 'data/taanit.json'), encoding='utf-8'))
        for a in t['amudim']:
            for i, s in enumerate(a['summary'], 1):
                e = tts_expl(s['t'], True); jobs.append(('t:%s:%d' % (a['id'], i), 'taanit', e, expect_fix(e)))
    return jobs
# ---------- API ----------
def K(): return os.environ.get('ELEVENLABS_API_KEY', '')
def led(d):
    with open(LED, 'a') as f: f.write(json.dumps(d, ensure_ascii=False) + '\n')
def ledstate():
    st = {}
    if os.path.exists(LED):
        for l in open(LED): d = json.loads(l); st.setdefault(d['key'], []).append(d['status'])
    return st
def spent():
    n = 0
    if os.path.exists(LED):
        for l in open(LED):
            d = json.loads(l)
            if d['status'] == 'sent': n += d.get('chars', 0)
    return n
BUDGET = int(os.environ.get('BUDGET', '60000'))
class Quota(Exception): pass
class Budget(Exception): pass
def tts(text, tag='', vs=None):
    vs = vs or VS; k = key(text, vs); mp3 = f'{D}/{k}.mp3'
    if os.path.exists(mp3): return k, False
    if spent() + len(text) > BUDGET: raise Budget(f'budget {BUDGET} reached')
    st = ledstate().get(k, [])
    if st.count('sent') > st.count('ok') + st.count('ok_err'): raise RuntimeError(f'{k} {tag}: prior call may have succeeded; refusing to repeat')
    body = {'text': text, 'model_id': MODEL, 'language_code': 'he', 'voice_settings': vs}
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128', method='POST',
                                 headers={'xi-api-key': K(), 'Content-Type': 'application/json'}, data=json.dumps(body).encode())
    for att in range(3):
        led({'key': k, 'tag': tag, 'status': 'sent', 'text': text, 'chars': len(text), 't': time.time(), **({'vs': vs} if vs != VS else {})})
        try:
            with urllib.request.urlopen(req, timeout=240) as f: audio = f.read()
            open(mp3 + '.tmp', 'wb').write(audio); os.replace(mp3 + '.tmp', mp3)
            led({'key': k, 'tag': tag, 'status': 'ok'}); return k, True
        except urllib.error.HTTPError as e:
            msg = e.read()[:400].decode('utf8', 'replace'); led({'key': k, 'tag': tag, 'status': 'http_err', 'code': e.code, 'msg': msg}); led({'key': k, 'tag': tag, 'status': 'ok_err'})
            if e.code in (401, 402, 429) and re.search(r'quota|credit|limit|exceed', msg, re.I): raise Quota(f'HTTP {e.code} {msg}')
            if e.code in (429, 500, 502, 503) and att < 2: time.sleep(15 * (att + 1)); continue
            raise RuntimeError(f'HTTP {e.code} {msg}')
        except urllib.error.URLError as e:
            if isinstance(e.reason, (ssl.SSLError, socket.gaierror, ConnectionRefusedError)):
                led({'key': k, 'tag': tag, 'status': 'ok_err', 'note': 'pre-send net err'}); time.sleep(6); continue
            raise RuntimeError(f'{k} maybe charged: {e!r}')
        except Exception as e: raise RuntimeError(f'{k} maybe charged: {e!r}')
    raise RuntimeError(f'{k} gave up')
def sel(jobs, only): return [j for j in jobs if not only or any(j[0] == o or j[0].startswith(o) for o in only)]
def gen(only):
    jobs = sel(plan(), only); stop = {'q': None}
    def run(j):
        if stop['q']: return
        try: k, new = tts(j[2], j[0]); print(j[0], k, 'new' if new else 'cached', flush=True)
        except (Quota, Budget) as e: stop['q'] = str(e); print('STOP', j[0], e, flush=True)
        except Exception as e: print('ERR', j[0], e, flush=True)
    with ThreadPoolExecutor(3) as ex: list(ex.map(run, jobs))
    print('spent', spent())
    if stop['q']: print('STOPPED:', stop['q']); sys.exit(2)
PASS = 9.0
def best_take(e):
    return max(list(e['takes'].values()) or [{'score': 0, 'key': None}], key=lambda t: (t['score'], -len(t.get('text') or '')))
def dur_of(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode().strip())
def encode():
    exam = json.load(open(EXAM, encoding='utf-8')) if os.path.exists(EXAM) else {}
    out, hidden, missing, meta = {}, [], [], {}
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    for cid, kind, text, exp in plan():
        e = exam.get(cid)
        if not e: missing.append(cid); continue
        b = best_take(e)
        if b['score'] < PASS: hidden.append(cid); continue
        k = b['key']; src = f'{D}/{k}.mp3'
        if not os.path.exists(src): missing.append(cid); continue
        dst = os.path.join(ROOT, 'audio', k + '.mp3')
        if not os.path.exists(dst):
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=80,apad=pad_dur=0.2',
                            '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', dst], check=True)
        out[cid] = k + '.mp3'; meta[cid] = {'score': b['score'], 'kind': kind}
    used = set(out.values())
    for f in os.listdir(os.path.join(ROOT, 'audio')):
        if f not in used: os.remove(os.path.join(ROOT, 'audio', f))
    json.dump(out, open(os.path.join(ROOT, 'data/audio.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    kinds = {}
    for cid, kind, _, _ in plan():
        s = kinds.setdefault(kind, [0, 0, 0]); s[0 if cid in out else (1 if cid in hidden else 2)] += 1
    json.dump({'live': len(out), 'hidden': hidden, 'missing': missing, 'by_kind_live_hidden_missing': kinds, 'chars_spent': spent()},
              open(D + '/encode_report.json', 'w'), ensure_ascii=False, indent=1)
    print('live', len(out), 'hidden', len(hidden), 'missing', len(missing), kinds, 'spent', spent())
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'plan'
    if cmd == 'plan':
        j = plan(); print(len(j), 'clips,', sum(len(x[2]) for x in j), 'chars;', 'cached:', sum(os.path.exists(f'{D}/{key(x[2])}.mp3') for x in j), 'spent', spent())
        for kd in ('gemara', 'expl', 'taanit'): print(' ', kd, sum(len(x[2]) for x in j if x[1] == kd))
        if '-v' in sys.argv:
            for x in j: print(x[0], '|', x[2])
    elif cmd == 'gen': gen(sys.argv[2:])
    elif cmd == 'encode': encode()
