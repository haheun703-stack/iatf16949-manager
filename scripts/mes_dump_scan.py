# -*- coding: utf-8 -*-
"""tspmes exp 덤프(클래식 exp, 11gR2) 스캔: 테이블 목록/DDL/행수 추정 추출.

사용: python scripts/mes_dump_scan.py "<dmp 경로>" [--out <결과.json>]
Oracle 없이 덤프 안의 평문 DDL(TABLE "..."/CREATE TABLE/INSERT INTO)을 훑는다.
"""
import json
import re
import sys
import io

CHUNK = 64 * 1024 * 1024
OVERLAP = 64 * 1024  # 경계에 걸친 문장 보호

TABLE_RE = re.compile(rb'TABLE "([A-Z0-9_$#]+)"')
CREATE_RE = re.compile(rb'CREATE TABLE "([A-Z0-9_$#]+)"\s*\((.*?)\)\s{2}', re.DOTALL)
INSERT_RE = re.compile(rb'INSERT INTO "([A-Z0-9_$#]+)" \((.*?)\) VALUES', re.DOTALL)


def main():
    path = sys.argv[1]
    out_path = None
    if "--out" in sys.argv:
        out_path = sys.argv[sys.argv.index("--out") + 1]

    tables = {}   # name -> {"offset": int, "ddl": str, "columns": [..]}
    order = []

    with open(path, "rb") as f:
        pos = 0
        prev_tail = b""
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            buf = prev_tail + chunk
            base = pos - len(prev_tail)

            for m in CREATE_RE.finditer(buf):
                name = m.group(1).decode("ascii", "replace")
                if name not in tables:
                    ddl = m.group(2).decode("cp949", "replace")
                    tables[name] = {"offset": base + m.start(), "ddl": ddl}
                    order.append(name)

            for m in INSERT_RE.finditer(buf):
                name = m.group(1).decode("ascii", "replace")
                cols = m.group(2).decode("cp949", "replace")
                if name in tables and "columns" not in tables[name]:
                    tables[name]["columns"] = [c.strip().strip('"') for c in cols.split(",")]
                    tables[name]["insert_offset"] = base + m.start()

            pos += len(chunk)
            prev_tail = buf[-OVERLAP:]
            sys.stderr.write(f"\r{pos // (1024*1024)} MB 스캔...")

    sys.stderr.write("\n")
    print(f"테이블 수: {len(order)}")
    for name in order:
        t = tables[name]
        ncols = len(t.get("columns", []))
        print(f"  {name}  (cols={ncols}, offset={t['offset']})")

    if out_path:
        with io.open(out_path, "w", encoding="utf-8") as f:
            json.dump({"order": order, "tables": tables}, f, ensure_ascii=False, indent=1)
        print(f"저장: {out_path}")


if __name__ == "__main__":
    main()
