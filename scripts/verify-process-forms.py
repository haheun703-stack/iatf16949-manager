# 관련 양식(process_forms) 정합성 검증 리포트 생성.
# 기준: 프로세스 흐름도(regulation_sections reg_code='PROC') 본문이 참조하는 규정코드
#  vs 현재 process_forms 매핑된 양식의 규정. 누락/과잉/횡단 식별 → docs 마크다운.
import sqlite3, os, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

db = os.path.expandvars(r'%APPDATA%\iatf16949-manager\iatf16949.db')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', '관련양식_정합성_검증_2026-06-30.md')
con = sqlite3.connect(f'file:{db}?mode=ro', uri=True); c = con.cursor()

names = dict(c.execute('SELECT code, name FROM processes').fetchall())
regs_with_forms = set(r[0] for r in c.execute('SELECT DISTINCT reg_code FROM forms WHERE reg_code IS NOT NULL'))
formcount = dict(c.execute('SELECT reg_code, COUNT(*) FROM forms WHERE reg_code IS NOT NULL GROUP BY reg_code'))
PROCS = ['CP-01','CP-02','CP-03','MP-01','MP-02','MP-03','SP-01','SP-02','SP-03']
CROSS = {'B-2100','A-2200','L-2100'}  # ≥4 프로세스 참조 = 전사 공통

def refs_of(p):
    row = c.execute("SELECT section_body FROM regulation_sections WHERE reg_code='PROC' AND section_title LIKE ?", (p+'%',)).fetchone()
    if not row: return set()
    return {re.sub(r'\s+','',x) for x in re.findall(r'[A-Z]\s*-\s*\d{4}', row[0])} & regs_with_forms

def mapped_regs(p):
    return set(m[0] for m in c.execute(
        "SELECT DISTINCT f.reg_code FROM process_forms pf JOIN forms f ON pf.form_code=f.code "
        "WHERE pf.process_code=? AND f.reg_code IS NOT NULL", (p,)).fetchall())

L = []
L.append('# 관련 양식(process_forms) 정합성 검증 리포트')
L.append('')
L.append('**작성 2026-06-30** · 기준=프로세스 흐름도(캡쳐본 적용 본문)가 참조하는 규정 vs 현재 매핑.')
L.append('')
L.append('## 결론')
L.append('')
L.append('현재 매핑은 흐름도 기준과 **부분적으로 어긋남**. 단 자동 일괄수정은 비권장:')
L.append('- **추가(흐름도O·매핑X)**: 흐름도는 *규정* 단위를 참조 → 그 규정 양식 전부 링크 시 과링크 위험(예: 영업이 개발규정 참조 ≠ 개발양식 14개 전부).')
L.append('- **제거(매핑O·흐름도X)**: 흐름도는 *주 흐름*만 도식 → 프로세스 소유 양식이 미표기될 수 있어(예: 경영관리의 표준관리·윤리경영) 자동 제거 위험.')
L.append('- **횡단규정** B-2100(시정조치)·A-2200(회의록)·L-2100(검사)는 다수 프로세스 공통 → 일괄 추가 시 노이즈.')
L.append('')
L.append('→ **권장: 본 리포트를 근거로 프로세스별 명백한 항목만 선별 정리.**')
L.append('')
L.append('## 프로세스별 갭')
L.append('')
for p in PROCS:
    refs = refs_of(p); mapped = mapped_regs(p)
    missing = refs - mapped; extra = mapped - refs
    own = sorted(missing - CROSS); cross = sorted(missing & CROSS)
    cur = c.execute('SELECT COUNT(*) FROM process_forms WHERE process_code=?', (p,)).fetchone()[0]
    L.append(f'### {p} {names.get(p,"")} (현재 {cur}개 양식)')
    L.append('')
    if own:
        L.append('- **누락(고유, 추가 후보)**: ' + ', '.join(f'{r}({formcount.get(r,0)})' for r in own))
    if cross:
        L.append('- **누락(횡단, 선택)**: ' + ', '.join(f'{r}({formcount.get(r,0)})' for r in cross))
    if extra:
        # 과잉 후보의 양식명 일부
        exf = []
        for r in sorted(extra):
            fs = [x[0] for x in c.execute('SELECT code FROM forms WHERE reg_code=? LIMIT 99', (r,)).fetchall()]
            mapped_ex = [x[0] for x in c.execute(
                'SELECT pf.form_code FROM process_forms pf JOIN forms f ON pf.form_code=f.code '
                'WHERE pf.process_code=? AND f.reg_code=?', (p, r)).fetchall()]
            exf.append(f'{r}({len(mapped_ex)})')
        L.append('- **과잉(흐름도 미참조, 검토 후 제거)**: ' + ', '.join(exf))
    if not (own or cross or extra):
        L.append('- ✅ 흐름도 기준 일치')
    L.append('')

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(L))
print('생성:', OUT)
print(open(OUT, encoding='utf-8').read())
con.close()
