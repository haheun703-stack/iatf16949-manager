# -*- coding: utf-8 -*-
"""MES 검사기록 커버리지 사이드카 빌드 — 덤프(QMS_SQC+MAC_DESC) → mes_records.db.

사용: python scripts/mes_records_build.py <dmp> <tables.json> <out.db>

앱의 'MES 기록 현황' 화면(MES_RECORDS_* IPC)이 읽는 별도 SQLite.
목적 = "기록이 들어왔는지/비었는지" 판정: 일자×검사구분×품번(설비) 커버리지.
측정값(QMS_SQCDESC, ~840MB)은 커버리지에 불필요 — 헤더만 스캔해 빌드가 빠름.
스키마:
  sqc_daily(ymd, qcgubun, pno, items, lots, inspectors, rounds, line_no)
  sqc_parts(qcgubun, pno, pname, first_ymd, last_ymd, total_items, active_days)
  mac_daily(ymd, line_no, items, checkers, confirmed_items)
  mac_lines(line_no, first_ymd, last_ymd, total_items, active_days)
  meta(key, value)  -- built_at·원천·구분별 총계·기간
qcgubun = QMS_SQC.QCGUBUN (W자주/I수입/P패트롤/O출하 — 라벨은 앱 mes_codes QC_GBN).
설비 = MAC_DESC.LINE_NO (이름은 앱 mes_codes WRKCTR). 확인자 = CONFIRMOR(관리자 확인).
mes_trace.db 와 같은 운영: 주기적 dmp 반입 시 이 스크립트만 재실행(앱 재시작 불필요).
"""
import io
import json
import os
import sqlite3
import sys
import time
from collections import defaultdict
from datetime import datetime

from mes_dump_extract import iter_rows


def norm_ymd(v):
    """'20230503' → '2023-05-03' (이상값은 None)."""
    s = str(v or "").strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
    return None


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    dmp, tj, out = sys.argv[1], sys.argv[2], sys.argv[3]
    log = lambda m: (sys.stderr.write(m + "\n"), sys.stderr.flush())

    with io.open(tj, encoding="utf-8") as fp:
        meta_tables = json.load(fp)["tables"]

    def idx(t):
        return {c: i for i, c in enumerate(meta_tables[t]["columns"])}

    t0 = time.time()
    # 미래 일자 = MES 입력 오류(예: 2027 오타) — 커버리지 왜곡 방지를 위해 제외하고 건수만 보존
    today = datetime.now().strftime("%Y-%m-%d")
    future_sqc = future_mac = 0

    # ── Pass 1: QMS_SQC (검사 헤더 — 1행 = 검사항목 1건) ──
    i = idx("QMS_SQC")
    daily = defaultdict(lambda: [0, set(), set(), set(), None])  # (ymd,gbn,pno) -> [items, lots, men, rounds, line]
    parts = {}  # (gbn,pno) -> [pname, first, last, total, days:set]
    n = 0
    for r in iter_rows(dmp, meta_tables["QMS_SQC"]["insert_offset"]):
        n += 1
        if n % 500000 == 0:
            log(f"QMS_SQC {n}...")
        ymd = norm_ymd(r[i["YMD"]])
        gbn = str(r[i["QCGUBUN"]] or "").strip()
        pno = str(r[i["PNO"]] or "").strip()
        if not ymd or not gbn or not pno:
            continue
        if ymd > today:
            future_sqc += 1
            continue
        d = daily[(ymd, gbn, pno)]
        d[0] += 1
        if r[i["LOTNO"]]:
            d[1].add(r[i["LOTNO"]])
        if r[i["QCMAN"]]:
            d[2].add(r[i["QCMAN"]])
        if r[i["SPCCNT"]]:
            d[3].add(r[i["SPCCNT"]])
        if d[4] is None and r[i["LINE_NO"]]:
            d[4] = str(r[i["LINE_NO"]])
        p = parts.get((gbn, pno))
        if p is None:
            parts[(gbn, pno)] = [str(r[i["PNAME"]] or ""), ymd, ymd, 1, {ymd}]
        else:
            if str(r[i["PNAME"]] or ""):
                p[0] = str(r[i["PNAME"]])
            if ymd < p[1]:
                p[1] = ymd
            if ymd > p[2]:
                p[2] = ymd
            p[3] += 1
            p[4].add(ymd)
    sqc_rows = n
    log(f"QMS_SQC 완료: {n}행 → daily {len(daily)}키, parts {len(parts)}키, {time.time() - t0:.1f}초")

    # ── Pass 2: MAC_DESC (설비 일상점검 — 1행 = 점검항목 1건) ──
    t1 = time.time()
    i = idx("MAC_DESC")
    mac_daily = defaultdict(lambda: [0, set(), 0])  # (ymd,line) -> [items, men, confirmed]
    mac_lines = {}  # line -> [first, last, total, days:set]
    n = 0
    for r in iter_rows(dmp, meta_tables["MAC_DESC"]["insert_offset"]):
        n += 1
        if n % 200000 == 0:
            log(f"MAC_DESC {n}...")
        ymd = norm_ymd(r[i["YMD"]])
        line = str(r[i["LINE_NO"]] or "").strip()
        if not ymd or not line:
            continue
        if ymd > today:
            future_mac += 1
            continue
        d = mac_daily[(ymd, line)]
        d[0] += 1
        if r[i["DCMAN"]]:
            d[1].add(r[i["DCMAN"]])
        if r[i["CONFIRMOR"]]:
            d[2] += 1
        ln = mac_lines.get(line)
        if ln is None:
            mac_lines[line] = [ymd, ymd, 1, {ymd}]
        else:
            if ymd < ln[0]:
                ln[0] = ymd
            if ymd > ln[1]:
                ln[1] = ymd
            ln[2] += 1
            ln[3].add(ymd)
    mac_rows = n
    log(f"MAC_DESC 완료: {n}행 → daily {len(mac_daily)}키, lines {len(mac_lines)}대, {time.time() - t1:.1f}초")

    # ── Pass 3: POP_JEPUM_SUBUL (제품 수불 원장 — P1 ⓒ 월 수불량 정렬, R1 확정 260730) ──
    # 제품 수불만 집계(자재 POP_JAJE_SUBUL 335만행은 R1 §2-3 범위 밖 유지 — 필요 시 동일 방식).
    t2 = time.time()
    subul_rows = 0
    future_subul = 0
    subul = {}  # (month, pno, iogbn) -> [qty, rows, last_ymd]
    if "POP_JEPUM_SUBUL" in meta_tables:
        i = idx("POP_JEPUM_SUBUL")
        n = 0
        for r in iter_rows(dmp, meta_tables["POP_JEPUM_SUBUL"]["insert_offset"]):
            n += 1
            if n % 200000 == 0:
                log(f"POP_JEPUM_SUBUL {n}...")
            ymd = norm_ymd(r[i["YMD"]])
            pno = str(r[i["PNO"]] or "").strip()
            gbn = str(r[i["IOGBN"]] or "").strip()
            if not ymd or not pno or not gbn:
                continue
            if ymd > today:
                future_subul += 1
                continue
            try:
                qty = float(r[i["QTY"]] or 0)
            except (TypeError, ValueError):
                qty = 0.0
            k = (ymd[:7], pno, gbn)
            s = subul.get(k)
            if s is None:
                subul[k] = [qty, 1, ymd]
            else:
                s[0] += qty
                s[1] += 1
                if ymd > s[2]:
                    s[2] = ymd
        subul_rows = n
        log(f"POP_JEPUM_SUBUL 완료: {n}행 → monthly {len(subul)}키, {time.time() - t2:.1f}초")
    else:
        log("POP_JEPUM_SUBUL 오프셋 없음 — subul_monthly 생략(구 tables.json)")

    # ── 사이드카 기록 ──
    tmp = out + ".tmp"
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.execute("PRAGMA journal_mode=OFF")
    db.execute("PRAGMA synchronous=OFF")
    db.execute("""CREATE TABLE sqc_daily (
        ymd TEXT NOT NULL, qcgubun TEXT NOT NULL, pno TEXT NOT NULL,
        items INTEGER NOT NULL, lots INTEGER NOT NULL, inspectors INTEGER NOT NULL,
        rounds INTEGER NOT NULL, line_no TEXT)""")
    db.execute("""CREATE TABLE sqc_parts (
        qcgubun TEXT NOT NULL, pno TEXT NOT NULL, pname TEXT,
        first_ymd TEXT, last_ymd TEXT, total_items INTEGER NOT NULL, active_days INTEGER NOT NULL)""")
    db.execute("""CREATE TABLE mac_daily (
        ymd TEXT NOT NULL, line_no TEXT NOT NULL,
        items INTEGER NOT NULL, checkers INTEGER NOT NULL, confirmed_items INTEGER NOT NULL)""")
    db.execute("""CREATE TABLE mac_lines (
        line_no TEXT NOT NULL, first_ymd TEXT, last_ymd TEXT,
        total_items INTEGER NOT NULL, active_days INTEGER NOT NULL)""")
    db.execute("""CREATE TABLE subul_monthly (
        month TEXT NOT NULL, pno TEXT NOT NULL, iogbn TEXT NOT NULL,
        qty REAL NOT NULL, rows INTEGER NOT NULL, last_ymd TEXT)""")
    db.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")

    db.executemany(
        "INSERT INTO sqc_daily VALUES (?,?,?,?,?,?,?,?)",
        [(k[0], k[1], k[2], v[0], len(v[1]), len(v[2]), len(v[3]), v[4]) for k, v in daily.items()]
    )
    db.executemany(
        "INSERT INTO sqc_parts VALUES (?,?,?,?,?,?,?)",
        [(k[0], k[1], v[0], v[1], v[2], v[3], len(v[4])) for k, v in parts.items()]
    )
    db.executemany(
        "INSERT INTO mac_daily VALUES (?,?,?,?,?)",
        [(k[0], k[1], v[0], len(v[1]), v[2]) for k, v in mac_daily.items()]
    )
    db.executemany(
        "INSERT INTO mac_lines VALUES (?,?,?,?,?)",
        [(k, v[0], v[1], v[2], len(v[3])) for k, v in mac_lines.items()]
    )
    db.executemany(
        "INSERT INTO subul_monthly VALUES (?,?,?,?,?,?)",
        [(k[0], k[1], k[2], v[0], v[1], v[2]) for k, v in subul.items()]
    )
    db.execute("CREATE INDEX ix_sqc_daily_ymd ON sqc_daily(ymd)")
    db.execute("CREATE INDEX ix_sqc_daily_gbn ON sqc_daily(qcgubun, ymd)")
    db.execute("CREATE INDEX ix_sqc_parts_gbn ON sqc_parts(qcgubun, last_ymd)")
    db.execute("CREATE INDEX ix_mac_daily_ymd ON mac_daily(ymd)")
    db.execute("CREATE INDEX ix_subul_month ON subul_monthly(iogbn, month)")
    db.execute("CREATE INDEX ix_subul_pno ON subul_monthly(pno)")

    # 구분별 총계·기간 (STATUS 용)
    gbn_stats = defaultdict(lambda: [0, None, None])
    for (ymd, gbn, _), v in daily.items():
        g = gbn_stats[gbn]
        g[0] += v[0]
        g[1] = ymd if g[1] is None or ymd < g[1] else g[1]
        g[2] = ymd if g[2] is None or ymd > g[2] else g[2]
    mac_first = min((v[0] for v in mac_lines.values()), default=None)
    mac_last = max((v[1] for v in mac_lines.values()), default=None)
    for k, v in {
        "built_at": datetime.now().isoformat(timespec="seconds"),
        "source_dmp": os.path.basename(dmp),
        "sqc_rows": str(sqc_rows),
        "mac_rows": str(mac_rows),
        "gbn_stats": json.dumps({g: {"items": s[0], "first": s[1], "last": s[2]} for g, s in gbn_stats.items()}, ensure_ascii=False),
        "mac_stats": json.dumps({"items": mac_rows - future_mac, "first": mac_first, "last": mac_last, "lines": len(mac_lines)}, ensure_ascii=False),
        "future_rows": json.dumps({"sqc": future_sqc, "mac": future_mac, "subul": future_subul}),
        "subul_stats": json.dumps({
            "rows": subul_rows,
            "months": len({k[0] for k in subul}),
            "parts": len({k[1] for k in subul}),
            "first": min((k[0] for k in subul), default=None),
            "last": max((k[0] for k in subul), default=None)
        }, ensure_ascii=False),
    }.items():
        db.execute("INSERT INTO meta VALUES (?,?)", (k, v))
    db.commit()
    db.close()

    try:
        if os.path.exists(out):
            os.remove(out)
        os.rename(tmp, out)
    except PermissionError:
        log("⚠️ 대상 파일이 사용 중(앱이 열어 둠) — 앱을 종료한 뒤 다시 실행하세요.")
        log(f"   빌드 결과는 임시 파일에 보존됨: {tmp}")
        sys.exit(2)
    print(json.dumps({
        "out": out, "MB": round(os.path.getsize(out) / (1024 * 1024), 1),
        "sqc행": sqc_rows, "mac행": mac_rows, "subul행": subul_rows,
        "sqc_daily": len(daily), "sqc_parts": len(parts),
        "mac_daily": len(mac_daily), "설비": len(mac_lines), "subul_monthly": len(subul),
        "구분": {g: s[0] for g, s in gbn_stats.items()},
        "총소요초": round(time.time() - t0, 1)
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
