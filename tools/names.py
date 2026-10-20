# -*- coding: utf-8 -*-
"""החלפת שמות קדושים בטקסט מספריא (מנוקד או לא) – לפני שהוא נכנס לאתר.
 * השם בן ארבע האותיות -> ה׳
 * אלקים (וכל הנטיות, גם עם תחיליות) -> ה מוחלפת ב-ק, הניקוד נשמר
 * אֱלָהּ (ארמית, עם מפיק) -> אֱלָקּ ;  אֵל (בצירה – שם) -> קֵל ;  שַׁדַּי -> שַׁ-דַּי ; צבאות (כשם) -> צבקות
האותיות כתובות כקודים כדי שהקובץ עצמו לא יכיל שם."""
import re, unicodedata
A, L, H, Y, V, M, K, SH, D, Q = '\u05D0', '\u05DC', '\u05D4', '\u05D9', '\u05D5', '\u05DD', '\u05DA', '\u05E9', '\u05D3', '\u05E7'
NQ = re.compile(r'[\u0591-\u05C7]')
TSERE, MAPIQ = '\u05B5', '\u05BC'
TETRA = Y + H + V + H
SUFF = ['', Y + M, Y, Y + '\u05E0' + V, Y + K, Y + K + M, Y + H + M, Y + V, Y + H, Y + H + '\u05DF', K, Y + '\u05DB' + M]
PREF = re.compile('^([' + V + '\u05D1\u05DC\u05DE\u05DB\u05E9' + H + ']{0,3})')
def letters(w):  # [(letter, marks)]
    return re.findall(r'([\u05D0-\u05EA])([\u0591-\u05C7]*)', w)
def fix_word(w):
    w = unicodedata.normalize('NFC', w)
    p = NQ.sub('', w); core_re = re.match(r'^([^\u05D0-\u05EA]*)([\u05D0-\u05EA\u0591-\u05C7]+)(.*)$', w, re.S)
    if not core_re: return w, None
    a, core, z = core_re.groups(); pc = NQ.sub('', core)
    if TETRA in pc:
        pre = PREF.match(pc).group(1)
        # keep vocalized prefix letters
        lt = letters(core); pv = ''.join(l + m for l, m in lt[:len(pre)])
        return a + pv + H + '\u05F3' + z, 'tetra'
    for i in range(0, 3):
        pre, rest = pc[:i], pc[i:]
        if i and not re.fullmatch('[' + V + '\u05D1\u05DC\u05DE\u05DB\u05E9' + H + ']+', pre): break
        lt = letters(core)
        # אלה + סיומת (אלקים)
        for st in (A + L + H, A + L + V + H):
            if rest.startswith(st) and rest[len(st):] in SUFF:
                suf = rest[len(st):]
                if suf == '':   # אלה – "אלה"=these ; רק עם מפיק בה (ארמית) או אלוה
                    hm = lt[i + len(st) - 1][1]
                    if st == A + L + H and MAPIQ not in hm: continue
                hpos = i + len(st) - 1
                out = ''.join((Q if k == hpos else l) + m for k, (l, m) in enumerate(lt))
                return a + out + z, 'elo-him'
        # אֵל בצירה (שם) – רק מילה של שתי אותיות אחרי התחילית
        if rest == A + L and i <= 1 and pre in ('', V, H, '\u05DC', '\u05D1', '\u05DB') and len(lt) == i + 2 and TSERE in lt[i][1]:
            out = ''.join((Q if k == i else l) + m for k, (l, m) in enumerate(lt))
            return a + out + z, 'el'
        if rest == SH + D + Y and len(lt) == i + 3 and '\u05B7' in lt[i + 1][1] and MAPIQ in lt[i + 1][1]:
            out = ''.join(l + m for l, m in lt[:i + 2]) + '-' + ''.join(l + m for l, m in lt[i + 2:])
            # שַׁ-דַּי : מקף אחרי השי"ן
            out = ''.join(l + m for l, m in lt[:i + 1]) + '-' + ''.join(l + m for l, m in lt[i + 1:])
            return a + out + z, 'shaddai'
    return w, None
def fix(text, log=None):
    out = []
    for tok in re.split(r'(\s+)', text):
        if not tok or tok.isspace(): out.append(tok); continue
        # טיפול גם בתוך מקף/גרש
        parts = re.split(r'([\u05BE\-])', tok); res = []
        for p in parts:
            if p in ('\u05BE', '-'): res.append(p); continue
            nw, kind = fix_word(p)
            if kind and log is not None: log.append((kind, p, nw))
            res.append(nw)
        out.append(''.join(res))
    return ''.join(out)
if __name__ == '__main__':
    import json, sys, os
    d = json.load(open(os.path.join(os.path.dirname(__file__), 'sefaria/all.json')))
    def fl(x):
        if isinstance(x, list):
            for y in x: yield from fl(y)
        elif x: yield x
    log = []
    for ref, r in d.items():
        for k in ('gemara', 'rashi', 'tosafot'):
            for t in fl(r[k]): fix(t, log)
    from collections import Counter
    for (kind, a, b), n in Counter(log).most_common(): print(kind, n, a, '->', b)
