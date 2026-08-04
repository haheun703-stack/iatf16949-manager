# -*- coding: utf-8 -*-
"""
3. 품질불량/01 불량개선대책서 의 실제 대책서 PPTX *본문 라벨*을 읽어
사건(cases) 샘플로 적재. 라벨(품번/품명/현상/원인/근본대책/발생지역/발생수량/발생일자/LOT)을
경계 기반으로 정확히 추출한다. 데모용 — owner='[샘플]' 마커로 재실행 가능.
"""
import sqlite3, os, re, sys, glob, zipfile
sys.stdout.reconfigure(encoding='utf-8')

_PROJECT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 프로젝트 루트 — 드라이브 문자 무관
ROOT = os.path.join(_PROJECT, 'TPC AM사업부 품질폴더', '3. 품질불량', '01 불량개선대책서')
DB = os.path.expandvars(r'%APPDATA%/iatf16949-manager/iatf16949.db')

PART_RE = re.compile(r'(\d{4,5}-[0-9A-Z]{3,6}(?:-\d)?)')
CUSTOMERS = [('JATCO','자트코(JATCO)'),('자트코','자트코(JATCO)'),('HPT','현대파워텍(HPT)'),
             ('KMI','삼보 KMI'),('INLINE','삼보 INLINE'),('HMC','현대자동차(HMC)'),
             ('기아','기아'),('삼보','삼보모터스'),('화승','화승'),('위아','현대위아')]

# 모든 라벨(경계로 사용) — 한 라벨 값은 다음 라벨 전까지
LABELS = ['품번','품 명','품명','보고자','보고','현 상','현상','원 인','원인','발생지역','발생 지역',
          '발생장소','발생수량','발생 수량','발생일자','발생 일자','근본 대책','근본대책','개선 내용',
          '개선내용','문제점','첨부','제조 공정도','P/NO','PRODUCE','LOT','로트','일정','조치']

def pptx_text(f):
    try:
        z = zipfile.ZipFile(f)
        slides = sorted([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml', n)],
                        key=lambda x: int(re.search(r'(\d+)', x).group()))
        out = []
        for n in slides:
            out += re.findall(r'<a:t>(.*?)</a:t>', z.read(n).decode('utf-8', 'ignore'))
        t = ' '.join(out)
        for a, b in [('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&#10;', ' ')]:
            t = t.replace(a, b)
        return re.sub(r'\s+', ' ', t).strip()
    except Exception:
        return ''

def field(text, keys, n=200, extra_stops=()):
    """라벨 keys 뒤 ~ 다음 라벨(또는 extra_stops) 전까지."""
    stops = [s for s in LABELS] + list(extra_stops)
    best = ''
    for k in keys:
        i = text.find(k)
        if i < 0:
            continue
        seg = text[i + len(k): i + len(k) + n]
        cut = len(seg)
        for st in stops:
            j = seg.find(st)
            if 0 <= j < cut:
                cut = j
        s = seg[:cut].strip(' :：.-◆▣▶▷●○■◈/')
        s = re.sub(r'\s+', ' ', s)
        if len(s) >= 2 and len(s) > len(best):
            best = s
    return best

def to_date(s):
    m = re.search(r'(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})', s)
    if not m:
        return None
    y = m.group(1)
    if len(y) == 2:
        y = '20' + y
    return f'{y}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'

files = glob.glob(os.path.join(ROOT, '**', '*.pptx'), recursive=True)
cand = []
seen = set()
for f in files:
    name = os.path.basename(f)
    pm = PART_RE.search(name)
    if not pm:
        continue
    part = pm.group(1)
    txt = pptx_text(f)
    if len(txt) < 350:
        continue
    # ◆형식(헤더 라벨) 구조화 대책서만 — 발생일자/지역/수량 중 하나라도 있어야 깔끔하게 뽑힘
    if not any(lbl in txt for lbl in ['발생일자', '발생 일자', '발생지역', '발생 지역', '발생수량', '발생 수량']):
        continue
    root = field(txt, ['원 인', '원인'], 220)
    corr = field(txt, ['근본 대책', '근본대책', '개선 내용', '개선내용'], 220)
    if len(root) < 8 and len(corr) < 8:
        continue
    # 품명 정제: 품번/슬래시/P|NO 제거 + 숫자·잡음 있으면 버림
    pname = field(txt, ['품 명', '품명'], 40)
    pname = PART_RE.sub('', pname)
    pname = re.sub(r'P\s*/?\s*NO.*$', '', pname, flags=re.I).strip(' /-:')
    if re.search(r'\d', pname) or pname in ('불량 내용', '불량내용', '추 진') or len(pname) < 3:
        pname = ''
    symptom = field(txt, ['현 상', '현상'], 50)
    symptom = symptom.split('◆')[0].strip()
    if re.search(r'\d{6}|_|\.ppt|차 종|구 분|봉쇄|^\)', symptom) or len(symptom) < 3:
        symptom = ''
    loc = field(txt, ['발생지역', '발생 지역', '발생장소'], 24).split('◆')[0].strip()
    qm = re.search(r'\d+', field(txt, ['발생수량', '발생 수량'], 12))
    qty = int(qm.group()) if qm else None
    if qty and qty > 500:        # 품번 조각이 수량으로 잡힌 경우 제거
        qty = None
    date = to_date(field(txt, ['발생일자', '발생 일자'], 16)) or to_date(name)
    lot = field(txt, ['LOT NO', 'LOT', '로트'], 18)
    lot = lot.strip() if re.match(r'^[A-Z]{2,}\d', lot) else ''   # 영문+숫자 LOT만(날짜 제외)
    cust = next((lbl for kw, lbl in CUSTOMERS if kw in (loc + ' ' + name + ' ' + txt[:300])), '')
    defect = symptom if 2 < len(symptom) < 40 else re.sub(r'\s+', ' ', re.sub(r'\.pptx?$', '', re.sub(r'[_\d]', ' ', name))).strip()[:30]
    # 품명/현상 둘 다 비면(식별 불가) 스킵
    if not pname and not symptom:
        continue

    # 완성도 점수(깔끔한 라벨 많은 PPT 우선)
    score = sum([1 if 2 < len(pname) < 30 else 0, 2 if symptom else 0, 1 if loc else 0,
                 1 if qty else 0, 1 if date else 0, 1 if lot else 0,
                 1 if len(root) > 15 else 0, 1 if len(corr) > 15 else 0])

    key = (part, defect[:8])
    if key in seen:
        continue
    seen.add(key)
    cand.append(dict(part=part, pname=pname[:40], defect=defect, root=root, corr=corr,
                     loc=loc, qty=qty, date=date, lot=lot, customer=cust, file=name, score=score))

cand.sort(key=lambda x: x['score'], reverse=True)
sample = cand[:12]
print(f'본문 보유 대책서 {len(cand)}건 → 샘플 {len(sample)}건 적재')

con = sqlite3.connect(DB, timeout=10)
con.execute('PRAGMA busy_timeout=8000')
cur = con.cursor()
old = [r[0] for r in cur.execute("SELECT id FROM cases WHERE owner='[샘플]'")]
for cid in old:
    cur.execute('DELETE FROM form_submissions WHERE case_id=?', (cid,))
    cur.execute('DELETE FROM case_facts WHERE case_id=?', (cid,))
    cur.execute('DELETE FROM case_steps WHERE case_id=?', (cid,))
    cur.execute('DELETE FROM case_screening WHERE case_id=?', (cid,))
cur.execute("DELETE FROM cases WHERE owner='[샘플]'")

# 남은(비샘플) 번호와 충돌하지 않게 채번
existing = set(r[0] for r in cur.execute('SELECT case_no FROM cases'))
def make_no(yr):
    n = 1
    while f'QC-{yr}-{n:04d}' in existing:
        n += 1
    no = f'QC-{yr}-{n:04d}'
    existing.add(no)
    return no

STEPS = ['intake','containment','investigate','corrective','verify','horizontal','change4m','close']
now = '2026-06-21T09:00:00.000Z'
ins = 0
for r in sample:
    yr = (r['date'] or '2024')[:4]
    case_no = make_no(yr)
    title = f"{r['customer'] or '고객'} {r['defect']}".strip()
    cur.execute('''INSERT INTO cases
      (case_no,title,customer,source,part_no,part_name,model,defect_desc,defect_qty,
       attributable,occurred_date,received_date,due_date,status,owner,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
      (case_no, title, r['customer'], r['loc'] or r['customer'], r['part'], r['pname'], '',
       r['defect'], r['qty'], 'TPC 2공장', r['date'], r['date'], None, 'in_progress', '[샘플]', now, now))
    cid = cur.lastrowid
    for i, sk in enumerate(STEPS):
        st = 'done' if i <= 2 else ('doing' if i == 3 else 'todo')
        cur.execute('INSERT INTO case_steps (case_id,step_key,status,done_at,sort_order) VALUES (?,?,?,?,?)',
                    (cid, sk, st, now if st == 'done' else None, i))
    for scope, owner in [('internal', '생산 / 공장'), ('customer', '품질팀')]:
        cur.execute("INSERT INTO case_screening (case_id,scope,owner_dept,status) VALUES (?,?,?, 'doing')",
                    (cid, scope, owner))
    facts = {'root_cause': r['root'] or f"{r['defect']} (대책서: {r['file'][:50]})",
             'corrective_action': r['corr'] or f"개선대책 (대책서: {r['file'][:50]})"}
    if r['lot']:
        facts['lot'] = r['lot']
    for k, v in facts.items():
        cur.execute('INSERT INTO case_facts (case_id,fact_key,value) VALUES (?,?,?)', (cid, k, v))
    ins += 1
    print(f"  {case_no} | {r['part']:13} | 품명:{r['pname'][:16]:16} | 현상:{r['defect'][:16]:16} | 지역:{r['loc'][:10]:10} | 수량:{r['qty']} | LOT:{r['lot'][:10]}")

con.commit(); con.close()
print(f'✅ {ins}건 적재 완료 (라벨 기반 추출)')
