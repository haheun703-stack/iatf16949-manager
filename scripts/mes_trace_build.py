# -*- coding: utf-8 -*-
"""MES LOT 계보 사이드카 DB 빌드 — 덤프(POP_LOT_INFO+POP_TRACE) → mes_trace.db.

사용: python scripts/mes_trace_build.py <dmp> <tables.json> <out.db>

앱의 'LOT 계보 조회' 화면(MES_TRACE_* IPC)이 읽는 별도 SQLite 를 만든다.
본 DB(iatf16949.db)에 넣지 않는 이유: 328만 링크 ≈ 수백 MB — 마이그레이션 스냅샷
(VACUUM INTO)·백업이 그만큼 비대해지므로 읽기전용 사이드카로 분리한다.
스키마:
  lots(id PK, barcode, lotseq, pno, addymd, gbn, qty)  -- POP_LOT_INFO(LOT 원장)
  edges(parent_id, child_id, addymd)                    -- POP_TRACE(부모→자식 계보)
  meta(key, value)                                      -- built_at·원천·건수·연도범위
경로 규칙: 기본 = <userData>/mes_trace.db (앱 app_config 'mes.traceDbPath' 로 변경 가능).
주기적 dmp 반입(사장님 논의) 시 이 스크립트만 다시 돌리면 앱은 재시작 없이 새 파일을 읽는다.
"""
import io
import json
import os
import sqlite3
import sys
import time
from datetime import datetime

from mes_dump_extract import iter_rows

BATCH = 50000


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    dmp, tj, out = sys.argv[1], sys.argv[2], sys.argv[3]
    log = lambda m: (sys.stderr.write(m + "\n"), sys.stderr.flush())

    with io.open(tj, encoding="utf-8") as fp:
        meta = json.load(fp)["tables"]

    def idx(t):
        return {c: i for i, c in enumerate(meta[t]["columns"])}

    tmp = out + ".tmp"
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.execute("PRAGMA journal_mode=OFF")
    db.execute("PRAGMA synchronous=OFF")
    db.execute("""CREATE TABLE lots (
        id INTEGER PRIMARY KEY, barcode TEXT NOT NULL, lotseq INTEGER NOT NULL,
        pno TEXT, addymd TEXT, gbn TEXT, qty REAL)""")
    db.execute("CREATE TABLE edges (parent_id INTEGER NOT NULL, child_id INTEGER NOT NULL, addymd TEXT)")
    db.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")

    ids = {}  # "barcode\x1flotseq" -> id
    next_id = 1

    def key_of(barcode, lotseq):
        return f"{barcode}\x1f{lotseq}"

    def norm_seq(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return 0

    def norm_ymd(v):
        s = str(v or "")
        return s[:10] if s else None

    # ── Pass 1: POP_LOT_INFO (LOT 원장 → 품번·일자 부여) ──
    i = idx("POP_LOT_INFO")
    t0 = time.time()
    buf = []
    n = 0
    for r in iter_rows(dmp, meta["POP_LOT_INFO"]["insert_offset"]):
        n += 1
        if n % 500000 == 0:
            log(f"POP_LOT_INFO {n}...")
        bc = r[i["BARCODENO"]]
        if not bc:
            continue
        seq = norm_seq(r[i["LOTSEQ"]])
        k = key_of(bc, seq)
        if k in ids:
            continue  # 중복 (barcode,lotseq) 은 최초 행 유지
        ids[k] = next_id
        try:
            qty = float(r[i["QTY"]]) if r[i["QTY"]] is not None else None
        except (TypeError, ValueError):
            qty = None
        buf.append((next_id, bc, seq, r[i["PNO"]], norm_ymd(r[i["ADDYMD"]]), r[i["GBN"]], qty))
        next_id += 1
        if len(buf) >= BATCH:
            db.executemany("INSERT INTO lots VALUES (?,?,?,?,?,?,?)", buf)
            buf = []
    if buf:
        db.executemany("INSERT INTO lots VALUES (?,?,?,?,?,?,?)", buf)
    lot_rows = next_id - 1
    log(f"POP_LOT_INFO 완료: 스캔 {n}행 → lots {lot_rows}건, {time.time() - t0:.1f}초")

    # ── Pass 2: POP_TRACE (계보 링크) — 원장에 없는 LOT 은 bare 노드로 추가 ──
    i = idx("POP_TRACE")
    t1 = time.time()
    buf = []
    bare = []
    n = 0
    y_min, y_max = None, None
    for r in iter_rows(dmp, meta["POP_TRACE"]["insert_offset"]):
        n += 1
        if n % 500000 == 0:
            log(f"POP_TRACE {n}...")
        pk = key_of(r[i["BARCODENO"]], norm_seq(r[i["LOTSEQ"]]))
        ck = key_of(r[i["CBARCODENO"]], norm_seq(r[i["CLOTSEQ"]]))
        for k in (pk, ck):
            if k not in ids:
                ids[k] = next_id
                bc, _, seq = k.partition("\x1f")
                bare.append((next_id, bc, int(seq), None, None, None, None))
                next_id += 1
        ymd = norm_ymd(r[i["ADDYMD"]])
        if ymd:
            y = ymd[:4]
            y_min = y if y_min is None or y < y_min else y_min
            y_max = y if y_max is None or y > y_max else y_max
        buf.append((ids[pk], ids[ck], ymd))
        if len(buf) >= BATCH:
            db.executemany("INSERT INTO edges VALUES (?,?,?)", buf)
            buf = []
        if len(bare) >= BATCH:
            db.executemany("INSERT INTO lots VALUES (?,?,?,?,?,?,?)", bare)
            bare = []
    if buf:
        db.executemany("INSERT INTO edges VALUES (?,?,?)", buf)
    if bare:
        db.executemany("INSERT INTO lots VALUES (?,?,?,?,?,?,?)", bare)
    edge_rows = n
    log(f"POP_TRACE 완료: edges {edge_rows}건 (lots 총 {next_id - 1}), {time.time() - t1:.1f}초")

    # ── 인덱스 + 메타 ──
    t2 = time.time()
    db.execute("CREATE INDEX ix_edges_parent ON edges(parent_id)")
    db.execute("CREATE INDEX ix_edges_child ON edges(child_id)")
    db.execute("CREATE UNIQUE INDEX ix_lots_key ON lots(barcode, lotseq)")
    db.execute("CREATE INDEX ix_lots_pno ON lots(pno)")
    for k, v in {
        "built_at": datetime.now().isoformat(timespec="seconds"),
        "source_dmp": os.path.basename(dmp),
        "lot_rows": str(next_id - 1),
        "edge_rows": str(edge_rows),
        "trace_year_min": y_min or "",
        "trace_year_max": y_max or "",
    }.items():
        db.execute("INSERT INTO meta VALUES (?,?)", (k, v))
    db.commit()
    db.execute("PRAGMA optimize")
    db.close()
    log(f"인덱스: {time.time() - t2:.1f}초")

    if os.path.exists(out):
        os.remove(out)
    os.rename(tmp, out)
    size_mb = os.path.getsize(out) / (1024 * 1024)
    print(json.dumps({
        "out": out, "MB": round(size_mb, 1), "lots": next_id - 1, "edges": edge_rows,
        "연도": f"{y_min}~{y_max}", "총소요초": round(time.time() - t0, 1)
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
