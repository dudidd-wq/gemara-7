#!/usr/bin/env python3
"""כותב את sw.js מחדש: רשימת קבצים לשמירה במטמון + VERSION שנגזר מתוכן הקבצים
(כל שינוי בקובץ כלשהו מעלה את הגרסה אוטומטית). הרצה: python3 tools/build-sw.py"""
import hashlib, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CORE = ['index.html', 'manifest.webmanifest', 'css/style.css', 'js/util.js', 'js/store.js', 'js/quiz.js', 'js/iyun.js', 'js/beki.js', 'js/app.js',
        'data/bm76.json', 'data/taanit.json', 'data/taanit_text.json', 'data/audio.json',
        'fonts/Rubik-Hebrew.woff2', 'fonts/FrankRuhlLibre-Hebrew.woff2', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png']
h = hashlib.sha1()
for f in CORE: h.update(f.encode()); h.update(open(os.path.join(ROOT, f), 'rb').read())
aud = sorted(os.listdir(os.path.join(ROOT, 'audio'))) if os.path.isdir(os.path.join(ROOT, 'audio')) else []
for a in aud: h.update(a.encode())
ver = 'g7-' + h.hexdigest()[:10]
tpl = open(os.path.join(ROOT, 'tools/sw.template.js'), encoding='utf-8').read()
out = tpl.replace('__VERSION__', ver).replace('__FILES__', json.dumps(['./'] + CORE, ensure_ascii=False, indent=1))
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8').write(out)
print('sw.js', ver, len(CORE), 'core files;', len(aud), 'audio files (on demand)')
