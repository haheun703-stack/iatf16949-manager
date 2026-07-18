# -*- coding: utf-8 -*-
"""POP_CODE 추출 CSV → mes_codes 시드 마이그레이션 SQL 생성.

사용: python scripts/mes_code_to_sql.py <POP_CODE.csv> <출력.sql> <덤프날짜 YYYY-MM-DD>
- 스키마 + INSERT OR IGNORE 시드 (UNIQUE(main_code, sub_code) 로 멱등)
- MILL_CD(상수 1000)·CODE_LEVEL(전부 공란) 제외, REF_STR6~20 은 값 있을 때만 extras_json
"""
import csv
import io
import json
import sys

CHUNK = 400


def q(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def main():
    src, dst, dump_date = sys.argv[1], sys.argv[2], sys.argv[3]
    rows = list(csv.reader(io.open(src, encoding="utf-8-sig")))
    hdr, data = rows[0], rows[1:]
    idx = {h: i for i, h in enumerate(hdr)}

    out = io.open(dst, "w", encoding="utf-8", newline="\n")
    out.write(f"""-- ============================================================
-- Migration 0076: MES 하위코드 마스터 (mes_codes) 적재 ({dump_date} 덤프)
-- [스키마+데이터] [TPC팩 후보]
--
-- 원천 = 사내 MES(TSPMES, Oracle 11gR2) 야간백업 tspmes_{dump_date}.dmp 의
-- POP_CODE 전량({len(data)}행, 128그룹). 추출기 = scripts/mes_dump_extract.py.
-- 핵심 그룹: QC_GBN(검사구분 I수입/W자주/P패트롤/O출하), SPC_INSP(자주검사 항목),
-- MAC_CLGBN(설비보전항목), ROUTEBAD(공정별 불량), WRKCTR(설비/작업장),
-- CON_SCOPE(브레이징 조건범위), DEPT(부서), SPC_CNT(검사 차수/시각).
-- ref1~ref5 의미는 그룹별 상이(예: ROUTEBAD ref1=공정 ref2=불량,
-- WRKCTR ref1=공정코드, CON_SCOPE ref1=PLC주소 ref2=관리범위).
-- sub_code='$' 행 = 그룹 헤더(코드분류, up_code=상위분류).
-- 멱등: UNIQUE(main_code,sub_code) + INSERT OR IGNORE. 신덤프 갱신은 재생성 후
-- 신규 마이그레이션으로(OR IGNORE 라 기존행 갱신 안 됨). ⚠️BEGIN/COMMIT 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS mes_codes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  main_code      TEXT NOT NULL,             -- 코드그룹 (예: QC_GBN)
  sub_code       TEXT NOT NULL,             -- 하위코드
  code_name      TEXT NOT NULL,             -- 코드명
  ref1           TEXT, ref2 TEXT, ref3 TEXT, ref4 TEXT, ref5 TEXT,
  remark         TEXT,
  up_code        TEXT,                      -- 그룹 헤더($)의 상위 분류
  use_gbn        INTEGER NOT NULL DEFAULT 1,-- 1=사용 0=미사용
  sort_no        INTEGER,
  extras_json    TEXT,                      -- REF_STR6~20 등 잔여 필드(값 있을 때만)
  mes_added_at   TEXT,                      -- MES ADDYMD
  mes_updated_at TEXT,                      -- MES UPDYMD
  UNIQUE(main_code, sub_code)
);
CREATE INDEX IF NOT EXISTS idx_mes_codes_group ON mes_codes(main_code, use_gbn);

""")

    cols = ("main_code, sub_code, code_name, ref1, ref2, ref3, ref4, ref5, "
            "remark, up_code, use_gbn, sort_no, extras_json, mes_added_at, mes_updated_at")
    vals = []
    for r in data:
        extras = {}
        for k in list(range(6, 21)):
            v = r[idx.get(f"REF_STR{k}", -1)] if f"REF_STR{k}" in idx else ""
            if v.strip():
                extras[f"REF_STR{k}"] = v
        extras_json = json.dumps(extras, ensure_ascii=False) if extras else ""
        use = 1 if r[idx["USE_GBN"]] == "1" else 0
        sort_no = r[idx["SORT_NO"]]
        sort_sql = sort_no if sort_no not in ("", None) else "NULL"
        vals.append(
            f"({q(r[idx['MAIN_CODE']])}, {q(r[idx['SUB_CODE']])}, {q(r[idx['CODE_NAME']])}, "
            f"{q(r[idx['REF_STR1']])}, {q(r[idx['REF_STR2']])}, {q(r[idx['REF_STR3']])}, "
            f"{q(r[idx['REF_STR4']])}, {q(r[idx['REF_STR5']])}, {q(r[idx['REMARK']])}, "
            f"{q(r[idx['UP_CODE']])}, {use}, {sort_sql}, {q(extras_json)}, "
            f"{q(r[idx['ADDYMD']])}, {q(r[idx['UPDYMD']])})"
        )

    for i in range(0, len(vals), CHUNK):
        out.write(f"INSERT OR IGNORE INTO mes_codes ({cols}) VALUES\n")
        out.write(",\n".join(vals[i:i + CHUNK]))
        out.write(";\n\n")
    out.close()
    print(f"{dst}: {len(vals)} rows, {len(range(0, len(vals), CHUNK))} statements")


if __name__ == "__main__":
    main()
