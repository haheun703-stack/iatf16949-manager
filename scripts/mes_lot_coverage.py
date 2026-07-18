# -*- coding: utf-8 -*-
"""MES LOT 추적 체인 커버리지 실측 (Scan-to-Trace 사전조사).

사용: python scripts/mes_lot_coverage.py <dmp> <tables.json>
v4 뼈대의 4개 스캔 포인트(입고/투입/외주/출하) 대비 MES가 이미 커버하는 구간을
POP_LOT_INFO(LOT 원장)·POP_TRACE(계보)·POP_LOT_OUTSOURCE(외주)·SCM_*(협력사) 전량 스캔으로 판정.
"""
import io
import json
import sys
from collections import Counter

from mes_dump_extract import iter_rows


def main():
    dmp, tj = sys.argv[1], sys.argv[2]
    with io.open(tj, encoding="utf-8") as fp:
        meta = json.load(fp)["tables"]
    log = lambda m: (sys.stderr.write(m + "\n"), sys.stderr.flush())

    def idx(t):
        return {c: i for i, c in enumerate(meta[t]["columns"])}

    out = {}

    # ── POP_LOT_INFO: LOT 원장 ──
    i = idx("POP_LOT_INFO")
    n = 0
    gbn = Counter()
    years = Counter()
    scan_years = Counter()
    n_scan = n_inlot = 0
    lotgbn = Counter()
    scangbn = Counter()
    for r in iter_rows(dmp, meta["POP_LOT_INFO"]["insert_offset"]):
        n += 1
        if n % 500000 == 0:
            log(f"POP_LOT_INFO {n}...")
        gbn[r[i["GBN"]] or ""] += 1
        ymd = str(r[i["ADDYMD"]] or "")[:4]
        years[ymd] += 1
        if r[i["SCANDATE"]]:
            n_scan += 1
            scan_years[str(r[i["SCANDATE"]])[:4]] += 1
            scangbn[r[i["SCANGBN"]] or ""] += 1
        if r[i["INLOTNO"]]:
            n_inlot += 1
        lotgbn[r[i["LOTGBN"]] or ""] += 1
    out["POP_LOT_INFO"] = {"rows": n, "GBN": dict(gbn.most_common(10)), "년도": dict(sorted(years.items())),
                           "SCANDATE있음": n_scan, "SCAN년도": dict(sorted(scan_years.items())),
                           "SCANGBN": dict(scangbn.most_common(8)), "INLOTNO있음": n_inlot,
                           "LOTGBN": dict(lotgbn.most_common(8))}
    log(f"POP_LOT_INFO 완료 {n}행")

    # ── POP_TRACE: 계보(부모↔자식) ──
    i = idx("POP_TRACE")
    n = 0
    years = Counter()
    parents = set()
    children = set()
    for r in iter_rows(dmp, meta["POP_TRACE"]["insert_offset"]):
        n += 1
        if n % 500000 == 0:
            log(f"POP_TRACE {n}...")
        years[str(r[i["ADDYMD"]] or "")[:4]] += 1
        if n <= 3000000:  # 메모리 가드
            parents.add((r[i["BARCODENO"]], r[i["LOTSEQ"]]))
            children.add((r[i["CBARCODENO"]], r[i["CLOTSEQ"]]))
    out["POP_TRACE"] = {"rows": n, "년도": dict(sorted(years.items())),
                        "고유부모LOT": len(parents), "고유자식LOT": len(children)}
    log(f"POP_TRACE 완료 {n}행")

    # ── POP_LOT_OUTSOURCE: 외주 ──
    i = idx("POP_LOT_OUTSOURCE")
    n = 0
    years = Counter()
    endyn = Counter()
    for r in iter_rows(dmp, meta["POP_LOT_OUTSOURCE"]["insert_offset"]):
        n += 1
        years[str(r[i["ADDYMD"]] or "")[:4]] += 1
        endyn[r[i["ENDYN"]] or ""] += 1
    out["POP_LOT_OUTSOURCE"] = {"rows": n, "년도": dict(sorted(years.items())), "ENDYN": dict(endyn)}
    log(f"POP_LOT_OUTSOURCE 완료 {n}행")

    # ── SCM (협력사측) ──
    for t in ["SCM_LOT_INFO", "SCM_TRACE"]:
        i = idx(t)
        n = 0
        years = Counter()
        for r in iter_rows(dmp, meta[t]["insert_offset"]):
            n += 1
            years[str(r[i["ADDYMD"]] or "")[:4]] += 1
        out[t] = {"rows": n, "년도": dict(sorted(years.items()))}
        log(f"{t} 완료 {n}행")

    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
