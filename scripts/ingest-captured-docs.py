# 캡쳐본(매뉴얼·프로세스9·규정) PDF 텍스트 → 마이그레이션 0044 생성.
#  - 프로세스 9개: 표지에서 문서번호/재개정일/적용범위(scope)/목적(purpose) → process_doc UPSERT
#  - 규정 A-1100 본문 → regulation_sections(reg_code='A-1100')
#  - 품질환경 매뉴얼 1~11장 + 매트릭스 → regulation_sections(reg_code='QM')
# 기존 B-1100/B-2100 섹션과 CP-03 approvals_json 은 보존(UPSERT/특정 reg_code만 처리).
import sys, io, os, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
import pypdf

SRC = r'd:\IATF16949,SQ 자동작성 봇\IATF16949 캡쳐본 모음'
OUT_SQL = r'd:\IATF16949,SQ 자동작성 봇\iatf16949-manager\resources\migrations\0044_seed_captured_docs.sql'

def sq(s):
    """SQL 문자열 리터럴 이스케이프 (None→NULL)."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def pdf_text(path, joiner='\n'):
    r = pypdf.PdfReader(path)
    return joiner.join((p.extract_text() or '') for p in r.pages)

def page1_text(path):
    r = pypdf.PdfReader(path)
    return r.pages[0].extract_text() or ''

def latest_date(t):
    """텍스트 내 모든 'YYYY년 MM월 DD일'/'YYYY-MM-DD' 중 최신(현재 재개정일)."""
    dates = []
    for m in re.finditer(r'(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일', t):
        dates.append(f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}')
    return max(dates) if dates else None

# ── 1) 프로세스 9개 ──
PROC_CODES = ['CP-01','CP-02','CP-03','MP-01','MP-02','MP-03','SP-01','SP-02','SP-03']
reg_sections = []  # (reg_code, section_title, section_body)
proc_rows = []
for code in PROC_CODES:
    matches = glob.glob(os.path.join(SRC, '2.*', f'{code}_*'))
    if not matches:
        print(f'  [경고] {code} PDF 없음'); continue
    full = pdf_text(matches[0])
    t = page1_text(matches[0])
    lines = [ln.strip() for ln in t.split('\n') if ln.strip()]
    # 문서번호: TPC - CP - 02
    m = re.search(r'TPC\s*-\s*[CMS]P\s*-\s*\d+', t)
    doc_no = re.sub(r'\s+', '', m.group(0)) if m else None
    # 재개정일 = 표지 내 최신 일자
    rev_date = latest_date(t)
    # 적용범위: '적용한다' 포함 라인 중 가장 긴 것
    scope = max((ln for ln in lines if '적용한다' in ln or '적용 한다' in ln), key=len, default=None)
    # 목적: '목적'/'위함'/'도모' 포함 라인 중 가장 긴 것
    purpose = max((ln for ln in lines if any(k in ln for k in ['목적', '위함', '도모하기'])), key=len, default=None)
    proc_rows.append((code, doc_no, rev_date, scope, purpose))
    # 프로세스 흐름도 전문도 KB에 (흐름도 단계·관련문서·관리항목 검색용)
    proc_name = matches[0]
    nm = re.search(r'(CP|MP|SP)-\d+_([^(]+)', os.path.basename(proc_name))
    pname = nm.group(2).strip() if nm else code
    reg_sections.append(('PROC', f'{code} {pname}', full.strip()))
    print(f'  {code}: doc={doc_no} rev={rev_date} scope={len(scope or "")}자 purpose={len(purpose or "")}자 전문={len(full)}자')

# ── 2) 규정 A-1100 본문 ──
a1100 = glob.glob(os.path.join(SRC, '3.*', '**', '*조직 및 업무분장 규정.pdf'), recursive=True)
a1100 = [f for f in a1100 if '구본' not in f]
if a1100:
    full = pdf_text(a1100[0])
    reg_sections.append(('A-1100', '조직 및 업무분장 규정 (REV.6)', full.strip()))
    print(f'  규정 A-1100: {len(full)}자')
else:
    print('  [경고] A-1100 규정 본문 PDF 못 찾음')

# ── 3) 매뉴얼 1~11장 + 0.5~0.7 매트릭스 ──
man_pdfs = glob.glob(os.path.join(SRC, '1.*', '**', '*.pdf'), recursive=True)
qm = 0
for f in sorted(man_pdfs):
    base = os.path.basename(f)
    m = re.search(r'_완료_(.+?)\.pdf$', base)
    sect = (m.group(1) if m else base[:-4]).strip()
    # 본문 가치 낮은 것 제외
    if any(k in sect for k in ['표지', '목차', '회사소개', '카메라', '목록표']):
        continue
    full = pdf_text(f)
    if len(full.strip()) < 50:
        continue
    reg_sections.append(('QM', sect, full.strip()))
    qm += 1
print(f'  매뉴얼: {qm}개 섹션')

# ── SQL 생성 ──
lines_out = []
lines_out.append('-- ============================================================')
lines_out.append('-- Migration 0044: 캡쳐본 적용 — 프로세스9 텍스트 + 규정/매뉴얼 본문')
lines_out.append('--')
lines_out.append('-- scripts/ingest-captured-docs.py 가 IATF16949 캡쳐본 모음(36 PDF)에서 추출.')
lines_out.append('-- process_doc 9개 UPSERT(scope/purpose/doc_no/rev_date, approvals_json 보존)')
lines_out.append('-- + regulation_sections 에 A-1100 규정본문, QM 품질환경매뉴얼 본문 추가(KB 근거).')
lines_out.append('-- 기존 B-1100/B-2100 섹션은 불변.')
lines_out.append('-- ============================================================')
lines_out.append('')
lines_out.append('-- 1) 프로세스 9개 본문 (UPSERT — 기존 approvals_json/title 보존)')
for code, doc_no, rev_date, scope, purpose in proc_rows:
    lines_out.append(
        f"INSERT INTO process_doc (process_code, doc_no, rev_date, scope, purpose, updated_at)\n"
        f"VALUES ({sq(code)}, {sq(doc_no)}, {sq(rev_date)}, {sq(scope)}, {sq(purpose)}, datetime('now'))\n"
        f"ON CONFLICT(process_code) DO UPDATE SET\n"
        f"  doc_no=excluded.doc_no, rev_date=excluded.rev_date,\n"
        f"  scope=excluded.scope, purpose=excluded.purpose, updated_at=excluded.updated_at;"
    )
lines_out.append('')
lines_out.append('-- 2) 규정/매뉴얼/프로세스 본문 → regulation_sections (재실행 안전: 해당 reg_code만 교체)')
lines_out.append("DELETE FROM regulation_sections WHERE reg_code IN ('A-1100','QM','PROC');")
for reg_code, title, body in reg_sections:
    lines_out.append(
        f"INSERT INTO regulation_sections (reg_code, section_title, section_body) "
        f"VALUES ({sq(reg_code)}, {sq(title)}, {sq(body)});"
    )
lines_out.append('')

with open(OUT_SQL, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines_out))

print(f'\n✅ 생성: {OUT_SQL}')
print(f'  process_doc UPSERT {len(proc_rows)}개 · regulation_sections {len(reg_sections)}개 섹션')
print(f'  SQL 크기: {os.path.getsize(OUT_SQL)//1024} KB')
