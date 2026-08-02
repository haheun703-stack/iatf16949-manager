# -*- coding: utf-8 -*-
"""A1′ — 품목 마스터 품명 채우기 (MES 사이드카 조인).

사용: python scripts/fill_item_names.py [--apply]
      (기본은 미리보기. --apply 를 줘야 실제로 쓴다)

■ 왜
`item_master` 2,308행 중 품명 보유가 **0행(0.0%)** 이었다. 코드만 있고 이름이 없어
화면에 `25466-84710` 은 떠도 `PIPE A SCR WATER` 는 안 떴다. 사장님이 2024 고도화 요구사항
10건 중 3건을 "품번·품명이 안 보인다"로 반복 요구한 것과 같은 통증의 더 심한 판이다.

■ 원천
MES 사이드카 `mes_records.db` 의 `sqc_parts.pname`(검사 기록에서 집계한 품명).
`POP_ITEM` 이 도면 BLOB(LONG/LOB)를 물고 있어 현재 추출기로 못 여는 탓에,
검사 이력이 있는 품번만 이름을 갖는다. 검사를 안 하는 원자재·부자재는 여기 없다.

■ 규율
- 이미 이름이 있는 행은 **건드리지 않는다**(덮어쓰기 금지).
- `source` 는 손대지 않는다 — 품명 출처는 `updated_at` 갱신으로만 남긴다.
- 마이그레이션이 아니라 스크립트인 이유: 원천이 저장소 밖 사이드카라 마이그가 참조할 수 없다.
  BOM 적재(`bom_import_runs`)와 같은 선례.
"""
import re
import sqlite3
import sys
from datetime import datetime

DB = "C:/Users/ASUS/AppData/Roaming/iatf16949-manager/iatf16949.db"
SIDE = "C:/Users/ASUS/AppData/Roaming/iatf16949-manager/mes_records.db"
APPLY = "--apply" in sys.argv

norm = lambda s: re.sub(r"\s+", "", str(s or "")).upper()

side = sqlite3.connect(f"file:{SIDE}?mode=ro", uri=True)
# 같은 품번이 여러 행일 수 있으므로 가장 최근 검사분의 품명을 취한다
names = {}
for pno, pname, last in side.execute(
    "SELECT pno, pname, last_ymd FROM sqc_parts "
    "WHERE pname IS NOT NULL AND TRIM(pname) <> '' ORDER BY last_ymd"
):
    names[norm(pno)] = str(pname).strip()

db = sqlite3.connect(DB)
db.execute("PRAGMA busy_timeout = 8000")
rows = list(db.execute("SELECT item_code, item_name FROM item_master"))
total = len(rows)
have = sum(1 for _c, n in rows if n and str(n).strip())

todo = []
for code, name in rows:
    if name and str(name).strip():
        continue
    hit = names.get(norm(code))
    if hit:
        todo.append((hit, code))

print(f"품목 마스터      {total:,}행 · 기존 품명 보유 {have:,}행 ({have*100.0/total:.1f}%)")
print(f"사이드카 품명    {len(names):,}종")
print(f"채울 수 있는 것  {len(todo):,}행 → 적용 후 {have+len(todo):,}행 "
      f"({(have+len(todo))*100.0/total:.1f}%)")
print(f"남는 것          {total-have-len(todo):,}행 (검사 이력 없는 품번 — POP_ITEM BLOB 소관)")
print()
for n, c in todo[:8]:
    print(f"   {c:<20} → {n}")
if len(todo) > 8:
    print(f"   … 외 {len(todo)-8:,}건")

if not APPLY:
    print("\n미리보기만 했다. 실제 적용은 --apply")
    sys.exit(0)

now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
cur = db.cursor()
cur.execute("BEGIN")
cur.executemany(
    "UPDATE item_master SET item_name = ?, updated_at = ? "
    "WHERE item_code = ? AND (item_name IS NULL OR TRIM(item_name) = '')",
    [(n, now, c) for n, c in todo],
)
changed = cur.rowcount
db.commit()

after = db.execute(
    "SELECT COUNT(*) FROM item_master WHERE item_name IS NOT NULL AND TRIM(item_name) <> ''"
).fetchone()[0]
print(f"\n적용 완료 — {changed:,}행 갱신 · 품명 보유 {after:,}/{total:,} "
      f"({after*100.0/total:.1f}%)")
