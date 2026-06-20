# -*- coding: utf-8 -*-
"""
3. 품질불량/01 불량개선대책서 의 실제 대책서 폴더·파일명을 파싱해
사건(cases) 샘플로 자동 적재한다. 데모용 — owner='[샘플]' 마커로 재실행 가능.
"""
import sqlite3, os, re, sys, glob
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'D:/IATF16949,SQ 자동작성 봇/TPC AM사업부 품질폴더/3. 품질불량/01 불량개선대책서'
DB = os.path.expandvars(r'%APPDATA%/iatf16949-manager/iatf16949.db')

PART_RE = re.compile(r'(\d{4,5}-[0-9A-Z]{3,6}(?:-\d)?)')
DATE_PAREN = re.compile(r'\((\d{2})[.\-](\d{1,2})[.\-](\d{1,2})\)')
DATE_YYMMDD = re.compile(r'\b(1[0-9])(0[1-9]|1[0-2])([0-3]\d)\b')
CUSTOMERS = [('JATCO','자트코(JATCO)'),('자트코','자트코(JATCO)'),('HPT','현대파워텍(HPT)'),
             ('HMC','현대자동차(HMC)'),('기아','기아'),('삼보','삼보모터스'),
             ('화승','화승'),('위아','현대위아'),('필드','필드(현대)')]
STATUS_WORDS = ['대책발표','발표없슴','발표 없슴','등록 없슴','등록 됨','등록없슴','대책 발표',
                '발표없음','완료','대책서','불량 등록','불량등록','수입검사','개선대책','삼보2',
                '발표','없슴','없음','안됨','됨','모토스','모터스','피일드 문제','피일드','관련','보고',
                '발생으로 인한','로 인한','발생','대책','문제']
# 지명/공장(불량명에서 제거)
PLACES = ['전주','명촌','매암동','울산','소하리','일본','강동','2공장','1공장','소하리','매암','전주']

def parse(name):
    m = PART_RE.search(name)
    if not m: return None
    part = m.group(1)
    # 날짜
    d = DATE_PAREN.search(name)
    if d:
        yy,mm,dd = d.group(1),d.group(2),d.group(3)
        date = f'20{yy}-{int(mm):02d}-{int(dd):02d}'
    else:
        d2 = DATE_YYMMDD.search(name)
        date = f'20{d2.group(1)}-{d2.group(2)}-{d2.group(3)}' if d2 else None
    # 고객
    cust = ''
    for kw,label in CUSTOMERS:
        if kw in name: cust = label; break
    # 불량내용: 품번 뒤 ~ 날짜/고객/상태어 앞
    after = name[m.end():]
    after = DATE_PAREN.sub(' ', after)
    after = re.sub(r'\b1[0-9](0[1-9]|1[0-2])[0-3]\d\b',' ',after)  # YYMMDD 제거
    for w in STATUS_WORDS: after = after.replace(w,' ')
    for pl in PLACES: after = after.replace(pl,' ')
    for kw,_ in CUSTOMERS: after = after.replace(kw,' ')
    after = re.sub(r'[_()]+',' ',after)
    after = re.sub(r'\b\d{1,2}\b',' ',after)        # 잔여 일련번호
    after = re.sub(r'[xX]\s*$','',after)
    defect = re.sub(r'\s+',' ',after).strip(' -·')
    if len(defect) < 2: defect = '불량(상세 대책서 참조)'
    defect = defect[:40]
    closed = ('완료' in name)
    return dict(part=part, date=date, customer=cust, defect=defect, closed=closed, raw=name)

# ── 후보 수집(고객사 2011/2012 + 사내 폴더명) ──
cands = []
for sub in ['00 고객사/2011년 대책 자료','00 고객사/2012년 대책 자료']:
    p = os.path.join(ROOT, sub)
    if os.path.isdir(p):
        for n in os.listdir(p):
            if PART_RE.search(n): cands.append(('고객사', n))
for n in (os.listdir(os.path.join(ROOT,'01 사내')) if os.path.isdir(os.path.join(ROOT,'01 사내')) else []):
    if PART_RE.search(n) and os.path.isdir(os.path.join(ROOT,'01 사내',n)): cands.append(('사내', n))

parsed = []
seen = set()
for attr, n in cands:
    r = parse(n)
    if not r or not r['date']: continue
    key = (r['part'], r['defect'][:10])
    if key in seen: continue
    seen.add(key)
    r['attr'] = attr
    parsed.append(r)

# 날짜 순 정렬 후 12건 샘플(고르게)
parsed.sort(key=lambda x: x['date'])
sample = parsed[:: max(1, len(parsed)//12)][:12]

print(f'후보 {len(parsed)}건 → 샘플 {len(sample)}건 적재')

# ── 적재 ──
con = sqlite3.connect(DB, timeout=10)
con.execute('PRAGMA busy_timeout=8000')
cur = con.cursor()
# 기존 샘플 제거(재실행)
old = [r[0] for r in cur.execute("SELECT id FROM cases WHERE owner='[샘플]'")]
for cid in old:
    cur.execute('DELETE FROM case_facts WHERE case_id=?',(cid,))
    cur.execute('DELETE FROM case_steps WHERE case_id=?',(cid,))
    cur.execute('DELETE FROM case_screening WHERE case_id=?',(cid,))
cur.execute("DELETE FROM cases WHERE owner='[샘플]'")

STEPS = ['intake','containment','investigate','corrective','verify','horizontal','change4m','close']
now = '2026-06-20T13:40:00.000Z'
seq = {}
ins = 0
for r in sample:
    yr = r['date'][:4]
    seq[yr] = seq.get(yr,0)+1
    case_no = f"QC-{yr}-{seq[yr]:04d}"
    title = f"{r['customer'] or '고객'} {r['defect']}".strip()
    cur.execute('''INSERT INTO cases
      (case_no,title,customer,source,part_no,part_name,model,defect_desc,defect_qty,
       attributable,occurred_date,received_date,due_date,status,owner,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
      (case_no, title, r['customer'], r['customer'], r['part'], '', '', r['defect'], None,
       'TPC 2공장' if r['attr']=='고객사' else 'TPC(사내)', r['date'], r['date'], None,
       'closed' if r['closed'] else 'in_progress', '[샘플]', now, now))
    cid = cur.lastrowid
    for i,sk in enumerate(STEPS):
        if r['closed']:
            st='done'
        else:
            st = 'done' if i<=2 else ('doing' if i==3 else 'todo')
        cur.execute('INSERT INTO case_steps (case_id,step_key,status,done_at,sort_order) VALUES (?,?,?,?,?)',
                    (cid, sk, st, now if st=='done' else None, i))
    for scope,owner in [('internal','생산 / 공장'),('customer','품질팀')]:
        cur.execute("INSERT INTO case_screening (case_id,scope,owner_dept,status,done_at) VALUES (?,?,?,?,?)",
                    (cid, scope, owner, 'done' if r['closed'] else 'doing', now if r['closed'] else None))
    cur.execute('INSERT INTO case_facts (case_id,fact_key,value) VALUES (?,?,?)',
                (cid,'root_cause', f"{r['defect']} 관련 근본원인 — 대책서 본문 참조 ({r['raw'][:60]})"))
    cur.execute('INSERT INTO case_facts (case_id,fact_key,value) VALUES (?,?,?)',
                (cid,'corrective_action', f"개선대책 수립·발표: {r['raw'][:70]}"))
    ins += 1
    print(f"  {case_no} | {r['part']:14} | {r['customer'][:10]:10} | {r['defect'][:24]:24} | {r['date']} | {'종결' if r['closed'] else '진행'}")

con.commit(); con.close()
print(f'✅ {ins}건 적재 완료')
