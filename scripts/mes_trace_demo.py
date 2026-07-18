# -*- coding: utf-8 -*-
"""모의 역추적(리콜 시뮬레이션) — POP_TRACE 계보로 자재 LOT → 생산 LOT 전개.

사용: python scripts/mes_trace_demo.py <dmp> <tables.json> [--since YYYY]
POP_TRACE 전량을 메모리 그래프로 적재(부모→자식) 후, 최근 부모 LOT 하나를 골라
하위 전개(정추적)와 상위 전개(역추적)를 수행·소요시간 측정.
v4 뼈대 §06 '월 1회 리콜 시뮬레이션'의 데이터 기반 사전 검증.
"""
import io
import json
import sys
import time
from collections import defaultdict

from mes_dump_extract import iter_rows


def main():
    dmp, tj = sys.argv[1], sys.argv[2]
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "2026"
    with io.open(tj, encoding="utf-8") as fp:
        meta = json.load(fp)["tables"]
    log = lambda m: (sys.stderr.write(m + "\n"), sys.stderr.flush())

    cols = meta["POP_TRACE"]["columns"]
    i = {c: k for k, c in enumerate(cols)}

    down = defaultdict(list)  # 부모 -> [자식]
    up = defaultdict(list)    # 자식 -> [부모]
    recent_parents = []
    n = 0
    t0 = time.time()
    for r in iter_rows(dmp, meta["POP_TRACE"]["insert_offset"]):
        n += 1
        if n % 1000000 == 0:
            log(f"적재 {n}...")
        p = (r[i["BARCODENO"]], r[i["LOTSEQ"]])
        c = (r[i["CBARCODENO"]], r[i["CLOTSEQ"]])
        down[p].append(c)
        up[c].append(p)
        if str(r[i["ADDYMD"]] or "").startswith(since) and len(recent_parents) < 500:
            recent_parents.append(p)
    load_s = time.time() - t0
    log(f"그래프 적재: {n}행, {load_s:.1f}초")

    def expand(start, graph):
        seen = {start}
        frontier = [start]
        depth = 0
        while frontier and depth < 10:
            nxt = []
            for node in frontier:
                for m in graph.get(node, []):
                    if m not in seen:
                        seen.add(m)
                        nxt.append(m)
            frontier = nxt
            depth += 1
        return seen, depth

    # 자식이 있는 최근 부모 중 전개량이 큰 것 선택
    best = None
    for p in recent_parents:
        k = len(down.get(p, []))
        if best is None or k > best[1]:
            best = (p, k)
    if not best:
        print("최근 부모 LOT 없음")
        return
    start = best[0]

    t1 = time.time()
    fwd, fd = expand(start, down)
    fwd_ms = (time.time() - t1) * 1000
    t2 = time.time()
    bwd, bd = expand(start, up)
    bwd_ms = (time.time() - t2) * 1000

    print(json.dumps({
        "그래프": {"링크": n, "적재초": round(load_s, 1)},
        "출발LOT": {"BARCODENO": start[0], "LOTSEQ": start[1], "직계자식": best[1]},
        "정추적(이 자재가 들어간 곳)": {"전개LOT수": len(fwd) - 1, "최대깊이": fd, "소요ms": round(fwd_ms, 1)},
        "역추적(이 LOT에 들어온 것)": {"전개LOT수": len(bwd) - 1, "최대깊이": bd, "소요ms": round(bwd_ms, 1)}
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
