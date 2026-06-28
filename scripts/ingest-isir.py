# -*- coding: utf-8 -*-
# ─────────────────────────────────────────────────────────────────────────────
# 0041 생성기 — ISIR 워크북(.xlsx) → parts/isir_packages/isir_documents/control_plan_items SQL.
#
#   도메인: ISIR = 부품 단위 통제 패키지. 한 워크북 24시트 중 3개를 척추로 추출.
#     · 표지        → parts 메타 + isir_documents(26종 제출 체크리스트, 제출유형별 필수 + 제출여부)
#     · 검사협정서   → ire_risk / qa_manager / rev_code·rev_date(개정이력)
#     · 관리계획서(을) → control_plan_items(공정×관리항목×규격×확인방법×주기 …) — 행 그룹핑
#   원본은 읽기전용(openpyxl read_only,data_only). 산출 SQL은 자식행을 (SELECT id …) 서브셀렉트로
#   패키지에 연결 → 실제 id 와 무관하게 안전. migrate.ts 트랜잭션 래핑(BEGIN 없음).
#   사용: python scripts/ingest-isir.py → resources/migrations/0041_isir_28237_2maa1.sql
# ─────────────────────────────────────────────────────────────────────────────
import os, io, sys, re, openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC = r'd:\IATF16949,SQ 자동작성 봇\TPC AM사업부 품질폴더\4. 원부자재관리 검사협정서류\22. 현대위아\28237-2MAA1\28237-2MAA1_(C2MSE448_25.08.05)_25.09.25 ISIR_26.06.04(CP 알폼 및 파이프 도포 내용 추가).xlsx'
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'resources', 'migrations', '0041_isir_28237_2maa1.sql'))
PART_CUSTOMER = '현대위아'   # 폴더 귀속 고객(22. 현대위아)
PART_PLANT = '2공장'

def S(v):
    return '' if v is None else str(v).replace('\r', ' ').replace('\n', ' ').strip()

def g(row, idx):
    return S(row[idx]) if idx < len(row) else ''

# SQL 값 헬퍼: 빈 문자열/None → NULL, 그 외 → 이스케이프 후 작은따옴표.
def q(v):
    v = S(v)
    return 'NULL' if v == '' else "'" + v.replace("'", "''") + "'"

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)

# ── 표지: part 메타 + 26종 체크리스트 ────────────────────────────────────────
cover = list(wb['표지'].iter_rows(values_only=True))

# 라벨 스캔(행 위치 변동 견고): "품 번"/"품 명" 행 찾기
part_no = part_name = model = submitted_at = recipient = ''
for r in cover:
    b = g(r, 1)
    if b.replace(' ', '') == '품번':
        part_no = g(r, 10); submitted_at = g(r, 36)
    elif b.replace(' ', '') == '품명':
        part_name = g(r, 10); model = g(r, 36)
# 수요자(삼보모터스 등) 스캔
for r in cover:
    for idx in range(len(r)):
        val = g(r, idx)
        if '모터스' in val and not recipient:
            recipient = val
            break
    if recipient:
        break

# 26종 체크리스트: B=no, E=name, AF(31)=검사협정, AJ(35)=신규, AN(39)=설변, AR(43)=제출여부
DOC_NO, DOC_NAME, C_AGREE, C_NEW, C_CHANGE, C_PRESENT = 1, 4, 31, 35, 39, 43
docs = []
for r in cover:
    no = g(r, DOC_NO)
    name = g(r, DOC_NAME)
    if no.isdigit() and name:
        mk = lambda i: 1 if g(r, i) == '○' else 0
        docs.append({
            'no': int(no), 'name': name,
            'agree': mk(C_AGREE), 'new': mk(C_NEW), 'change': mk(C_CHANGE),
            'present': mk(C_PRESENT)
        })

# 제출유형 추정:
#  도메인 규칙 우선 — 사양변경서가 제출되면(신규개발엔 변경할 사양이 없음) = 설계변경 ISIR.
#  아니면 제출여부(present) 패턴과 가장 일치하는 필수열.
def align(key):
    return sum(1 for d in docs if (d[key] == 1) == (d['present'] == 1))
if any('사양변경' in d['name'] and d['present'] for d in docs):
    submit_type = 'isir_change'
else:
    submit_type = max([('agreement', 'agree'), ('isir_new', 'new'), ('isir_change', 'change')],
                      key=lambda t: align(t[1]))[0]

# ── 검사협정서: ire_risk / qa_manager / 최신 rev ────────────────────────────
agr = list(wb['검사협정서'].iter_rows(values_only=True))
ire_risk = qa_manager = rev_code = rev_date = ''
for r in agr:
    if g(r, 7).replace(' ', '').startswith('부품품질위험도'):
        ire_risk = g(r, 10)               # K: □특별관리(고) □중요관리(중)
    if g(r, 18).replace(' ', '') == '품질보증책임자':
        qa_manager = g(r, 20)             # U
ire_risk = (re.search(r'■\s*([^□■]+)', ire_risk).group(1).strip() if '■' in ire_risk else ire_risk).strip()
qa_manager = re.sub(r'\(인\)\s*$', '', qa_manager).strip()
# 개정이력 블록: 기호(B)=c/b/a/-, 개정일(D), 개정내용=사양코드(G). 최신 = 기호 'c' 행(맨 위).
for r in agr:
    sym = g(r, 1)
    code = g(r, 6)
    if sym in ('c', 'b', 'a', '-') and code.startswith('C2'):
        rev_code = code; rev_date = g(r, 3)
        break  # 첫 매칭(c=최신)

# ── 관리계획서(을): control_plan_items (행 그룹핑) ──────────────────────────
# 컬럼: F=공정명, G=설비명, H=항목NO, I=제품, J=공정, K=특별특성, L=규격,
#       M=확인방법, N=주기, O=관리방안, Q=생산, R=QA, S=조치, W=비고
CF, CG, CH, CI, CJ, CK, CL, CM, CN, CO, CQ, CR, CS, CW = 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 22
items = []
cur = None
cur_proc = cur_equip = ''
seq = 0
rownum = 0
for row in wb['관리계획서(을)'].iter_rows(values_only=True):
    rownum += 1
    if rownum <= 4:   # 헤더 2행 + 타이틀 2행
        continue
    F = g(row, CF); G = g(row, CG); H = g(row, CH)
    I = g(row, CI); J = g(row, CJ); K = g(row, CK)
    L = g(row, CL); M = g(row, CM); N = g(row, CN); O = g(row, CO)
    Q = g(row, CQ); R = g(row, CR); Sx = g(row, CS); W = g(row, CW)
    if F:                       # 새 공정 블록
        cur_proc = F; cur_equip = G
    has_content = any([H, I, J, L, M, N, O])
    if not has_content and not F:
        continue                # 완전 빈 행
    if H:                       # 새 관리항목(항목번호 등장)
        if cur:
            items.append(cur)
        seq += 1
        char_kind = '제품' if I else ('공정' if J else '')
        control_item = ' '.join(x for x in [I, J] if x)
        cur = {
            'seq': seq, 'process_no': H, 'process_name': cur_proc, 'equipment': cur_equip,
            'char_kind': char_kind, 'control_item': control_item, 'special_char': K,
            'spec': L, 'method': M, 'frequency': N, 'control_method': O,
            'resp_production': 1 if Q in ('●', '○', '◎', '◯') else 0,
            'resp_qa': 1 if R in ('●', '○', '◎', '◯') else 0,
            'reaction': Sx, 'note': W
        }
    else:                       # 연속행: 직전 항목에 부가
        if cur is None:
            continue
        if J:
            cur['control_item'] = (cur['control_item'] + ' ' + J).strip()
        if L:
            cur['spec'] = (cur['spec'] + ' / ' + L).strip(' /') if cur['spec'] else L
        if M and not cur['method']:
            cur['method'] = M
        if N and not cur['frequency']:
            cur['frequency'] = N
        if O and not cur['control_method']:
            cur['control_method'] = O
        if Sx and not cur['reaction']:
            cur['reaction'] = Sx
        if W and not cur['note']:
            cur['note'] = W
if cur:
    items.append(cur)
wb.close()

# ── SQL 생성 ────────────────────────────────────────────────────────────────
PKG = f"(SELECT id FROM isir_packages WHERE part_no='{part_no}' AND rev_code='{rev_code}')"
L = [
    '-- 0041_isir_28237_2maa1.sql (scripts/ingest-isir.py 로 생성)',
    f'-- 레퍼런스 ISIR 적재: {part_no} ({part_name}) / 고객 {PART_CUSTOMER}·수요자 {recipient} / 사양 {rev_code}.',
    f'-- 표지 26종 + 관리계획서(을) {len(items)}개 관리항목. migrate.ts 트랜잭션 래핑(BEGIN 없음).',
    '',
    f"INSERT OR IGNORE INTO parts (part_no, part_name, customer, model, plant, created_at) "
    f"VALUES ({q(part_no)}, {q(part_name)}, {q(PART_CUSTOMER)}, {q(model)}, {q(PART_PLANT)}, datetime('now'));",
    '',
    f"INSERT INTO isir_packages (part_no, rev_code, rev_date, submit_type, customer_recipient, ire_risk, qa_manager, submitted_at, approved, source_path, created_at) "
    f"VALUES ({q(part_no)}, {q(rev_code)}, {q(rev_date)}, {q(submit_type)}, {q(recipient)}, {q(ire_risk)}, {q(qa_manager)}, {q(submitted_at)}, 1, {q(SRC)}, datetime('now'));",
    '',
    '-- 26종 제출 체크리스트(표지)',
]
for d in docs:
    L.append(
        f"INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present) "
        f"VALUES ({PKG}, {d['no']}, {q(d['name'])}, {d['agree']}, {d['new']}, {d['change']}, {d['present']});"
    )
L.append('')
L.append(f'-- 관리계획서(을) 라인아이템 {len(items)}개')
for it in items:
    L.append(
        "INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note) "
        f"VALUES ({PKG}, {it['seq']}, {q(it['process_no'])}, {q(it['process_name'])}, {q(it['equipment'])}, {q(it['char_kind'])}, {q(it['control_item'])}, {q(it['special_char'])}, {q(it['spec'])}, {q(it['method'])}, {q(it['frequency'])}, {q(it['control_method'])}, {it['resp_production']}, {it['resp_qa']}, {q(it['reaction'])}, {q(it['note'])});"
    )
L.append('')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(L))

# ── 요약 출력(검증용) ────────────────────────────────────────────────────────
print(f'생성: {OUT}')
print(f'part_no={part_no} | part_name={part_name} | model={model} | recipient={recipient}')
print(f'submit_type={submit_type} | rev={rev_code} ({rev_date}) | qa={qa_manager}')
print(f'ire_risk={ire_risk}')
print(f'docs={len(docs)}종 (present={sum(d["present"] for d in docs)}) | control_plan_items={len(items)}')
print('--- 관리항목 표본 5 ---')
for it in items[:5]:
    print(f"  #{it['seq']} [{it['process_name']}] {it['control_item']} | 규격={it['spec'][:30]} | {it['method']} | {it['frequency']}")
