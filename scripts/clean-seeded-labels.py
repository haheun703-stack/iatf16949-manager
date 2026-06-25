# -*- coding: utf-8 -*-
# ─────────────────────────────────────────────────────────────────────────────
# 0034 생성기 — 자동시드(0028) 라벨의 "자간 노이즈" 정규화.
#
#   엑셀 균등분할로 글자 사이 공백이 박힌 라벨(예 "소 속", "불 만 사 항")을
#   붙여쓰기("소속", "불만사항")로 교정. field_key·type·sort_order 는 불변.
#
#   안전성: 출력 브리지(form-export-engine.bridge)는 norm()으로 공백을 무시하므로
#           라벨 공백 제거는 셀맵 매칭에 영향 없음(출력 무손실·동일). 순수 표시 개선.
#
#   대상: section='작성 항목'(0028 자동시드)이고 라벨이 자간패턴인 행만.
#         자간패턴 = 공백 split 토큰이 모두 1글자이고 토큰 ≥2 ("소 속" O, "회의 일자" X).
#   키: (form_code, field_key) — clean-install 재현 시에도 동일(0028 결정적 시드).
#
#   better-sqlite3 가 Electron ABI 빌드라 plain node 로 안 떠서 generator 는 python(read-only).
#   사용: python scripts/clean-seeded-labels.py  → resources/migrations/0034_clean_seeded_labels.sql 생성
# ─────────────────────────────────────────────────────────────────────────────
import sqlite3, os, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB = os.path.join(os.environ['APPDATA'], 'iatf16949-manager', 'iatf16949.db')
OUT = os.path.join(os.path.dirname(__file__), '..', 'resources', 'migrations', '0034_clean_seeded_labels.sql')


def is_jagan(label):
    if not label or not re.search(r'\s', label):
        return False
    toks = label.strip().split()
    return len(toks) >= 2 and all(len(t) == 1 for t in toks)


def sql_esc(s):
    return s.replace("'", "''")


uri = 'file:' + DB.replace('\\', '/') + '?mode=ro'
con = sqlite3.connect(uri, uri=True)
rows = con.execute(
    "SELECT form_code, field_key, label FROM form_fields "
    "WHERE section = '작성 항목' ORDER BY form_code, sort_order"
).fetchall()
con.close()

updates = []
for fc, fk, label in rows:
    if not is_jagan(label):
        continue
    clean = re.sub(r'\s+', '', label)
    if clean == label:
        continue
    updates.append((fc, fk, label, clean))

lines = [
    '-- 0034_clean_seeded_labels.sql (scripts/clean-seeded-labels.py 로 생성)',
    '-- 자동시드(0028) 라벨의 자간 노이즈 정규화: "소 속"→"소속" 등. field_key·type 불변.',
    '-- 브리지가 norm()으로 공백 무시 → 출력 무영향(순수 표시 개선). migrate.ts 트랜잭션 래핑(BEGIN/COMMIT 없음).',
    f'-- 대상 {len(updates)}건.',
    '',
]
for fc, fk, _from, to in updates:
    lines.append(
        f"UPDATE form_fields SET label='{sql_esc(to)}' "
        f"WHERE form_code='{sql_esc(fc)}' AND field_key='{sql_esc(fk)}' AND section='작성 항목';"
    )
lines.append('')

with open(os.path.normpath(OUT), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'생성: {os.path.normpath(OUT)}')
print(f'UPDATE {len(updates)}건')
print('샘플:')
for fc, fk, _from, to in updates[:8]:
    print(f'   {fc}  "{_from}" -> "{to}"')
