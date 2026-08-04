# 캡쳐본 프로세스 PDF(9개) → 흐름도 페이지 PNG 렌더 → userData/process-images/ + process_pages 적재.
# ⚠️ 앱을 종료한 상태에서 실행할 것(better-sqlite3 WAL 잠금 회피).
# 안전 규칙: 기존 이미지(image_path 있음)는 절대 덮지 않음. NULL 페이지 채움 + 누락 흐름도 페이지만 추가.
#           CP-03(사용자 수동 업로드 3장)은 통째로 건너뜀.
import sys, io, os, glob, sqlite3
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
import fitz  # PyMuPDF

_PROJECT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 프로젝트 루트 — 드라이브 문자 무관
SRC = os.path.join(_PROJECT, 'IATF16949 캡쳐본 모음')
DB = os.path.expandvars(r'%APPDATA%\iatf16949-manager\iatf16949.db')
IMG_DIR = os.path.expandvars(r'%APPDATA%\iatf16949-manager\process-images')

SKIP = {'CP-03'}  # 사용자 수동 큐레이션 — 건드리지 않음
PROC_CODES = ['CP-01','CP-02','CP-03','MP-01','MP-02','MP-03','SP-01','SP-02','SP-03']

def flow_label(n):
    if n == 2: return '업무 흐름도 (Plan-Do)'
    if n == 3: return '업무 흐름도 (Check-Act)'
    return f'업무 흐름도 ({n})'

con = sqlite3.connect(DB)
c = con.cursor()
added = filled = skipped = 0

for code in PROC_CODES:
    if code in SKIP:
        print(f'{code}: 건너뜀(수동 큐레이션 보존)'); continue
    matches = glob.glob(os.path.join(SRC, '2.*', f'{code}_*'))
    if not matches:
        print(f'{code}: [경고] PDF 없음'); continue
    doc = fitz.open(matches[0])
    pagecount = doc.page_count
    procdir = os.path.join(IMG_DIR, code)
    os.makedirs(procdir, exist_ok=True)
    # 흐름도 = page index 1..N-1 (page0=표지는 기존 이미지 보존)
    for idx in range(1, pagecount):
        page_no = idx + 1                 # DB page_no 는 1-base
        label = flow_label(page_no)
        # 기존 행 조회
        row = c.execute(
            'SELECT id, image_path FROM process_pages WHERE process_code=? AND page_no=?',
            (code, page_no)
        ).fetchone()
        if row and row[1]:
            skipped += 1; continue        # 이미 이미지 있음 → 보존
        # PNG 렌더 (150 dpi)
        out = os.path.join(procdir, f'{code}__cap-p{page_no:02d}.png')
        doc[idx].get_pixmap(dpi=150).save(out)
        if row:                            # 행 있으나 image NULL → 채움
            c.execute('UPDATE process_pages SET image_path=?, page_label=COALESCE(page_label,?) WHERE id=?',
                      (out, label, row[0]))
            filled += 1
        else:                              # 행 없음 → 추가
            c.execute('INSERT INTO process_pages (process_code, page_no, page_label, image_path, created_at) '
                      "VALUES (?,?,?,?,datetime('now'))", (code, page_no, label, out))
            added += 1
    doc.close()
    print(f'{code}: {pagecount}p PDF 처리')

con.commit()
print(f'\n✅ 흐름도 페이지 적재: 신규추가 {added} · NULL채움 {filled} · 기존보존(스킵) {skipped}')
# 최종 상태
print('--- process_pages 최종 ---')
for r in c.execute('SELECT process_code, COUNT(*), SUM(image_path IS NOT NULL) FROM process_pages GROUP BY process_code ORDER BY process_code'):
    print(f'  {r[0]}: {r[1]}페이지, 이미지 {r[2]}')
con.close()
