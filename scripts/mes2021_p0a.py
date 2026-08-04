# -*- coding: utf-8 -*-
"""P0a: 2021 MES 기초자료(xls) 파싱 → 정규화 CSV + 2026 운영 MES(POP_BOM) 대사 리포트.

산출물(전부 디스크, 마이그 0건 — 코워크 결정 #5):
  docs/mes-foundation/p0a/
    process_master_2021.csv   공정 마스터
    bom_edges_2021.csv        2021 설계 BOM (상위,하위,소요량)
    routing_2021.csv          2021 설계 라우팅 (품목,공정,순번,외주)
    items_2021.csv            품목 유도 마스터 (유형 분류: 완제품/반제품/원자재)
    bom_tree_2026.html        2026 운영 POP_BOM 품번 트리 시각화 (+2021 대비 뱃지)
    P0A_대사리포트_260724.md   정합 리포트

사용: python -X utf8 scripts/mes2021_p0a.py  (repo 루트에서)
"""
import csv
import io
import os
import re
import sys
from collections import defaultdict

import xlrd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT = os.path.dirname(ROOT)  # 프로젝트 루트 — 드라이브 문자 무관
SRC2021 = os.path.join(_PROJECT, "1-1 MES 작성자료", "※2021 삼성전자 대중소 MES 자료 모음", "0. MES 최신 트리,라우팅-김민수 자료_200715")
DUMPOUT = os.path.join(_PROJECT, "8. 자주검사 체크시트 및 설비일상점검 사내 자료", "TPC AM사업부 하위코드들 모음_260718", "추출결과")
OUT = os.path.join(ROOT, "docs", "mes-foundation", "p0a")
os.makedirs(OUT, exist_ok=True)


def cell(v):
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()


def read_xls_rows(path, sheet_idx=0):
    wb = xlrd.open_workbook(path)
    sh = wb.sheet_by_index(sheet_idx)
    for r in range(sh.nrows):
        yield [cell(sh.cell_value(r, c)) for c in range(sh.ncols)]


# ── 1. 공정 마스터 ─────────────────────────────────────────────
proc_rows = []
for row in read_xls_rows(os.path.join(SRC2021, "MES 모음", "공정관리_하헌.xls")):
    code, name = (row + ["", ""])[:2]
    if not code or code.startswith("공정코드"):
        continue
    proc_rows.append((code.strip(), name))
with io.open(os.path.join(OUT, "process_master_2021.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["proc_code", "proc_name"])
    w.writerows(proc_rows)
proc_codes = {c for c, _ in proc_rows}

# ── 2. BOM (2파일 합본) ────────────────────────────────────────
bom_edges = []  # (parent, child, qty, src)
for fname in ["MES 모음/BOM_안진성,하헌.xls", "BOM - 나머지.xls"]:
    src = os.path.basename(fname)
    for row in read_xls_rows(os.path.join(SRC2021, fname)):
        row = row + [""] * 5
        parent, child, qty = row[1], row[2], row[3]
        if not parent or not child or parent.startswith("상위품목"):
            continue
        bom_edges.append((parent, child, qty or "1", src))
with io.open(os.path.join(OUT, "bom_edges_2021.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["parent", "child", "qty", "src"])
    w.writerows(bom_edges)

# ── 3. 라우팅 (2파일, 컬럼 배치 상이) ──────────────────────────
routing = []  # (item, pno_group, pname, proc_code, seq, out_yn, src)
# 파일A: 품목코드|품번(고객)|품명|공정코드|공정명|순번|영업입고여부
for row in read_xls_rows(os.path.join(SRC2021, "MES 모음", "라우팅_하헌.xls")):
    row = row + [""] * 9
    item, pno_g, pname, proc, seq = row[0], row[1], row[2], row[3], row[5]
    if not item or item.startswith("품목코드"):
        continue
    routing.append((item, pno_g, pname, proc, seq, "", "라우팅_하헌"))
# 파일B: 품목코드|품번(고객)|품번|품명|공정코드|공정명|순번|외주여부|영업입고|재고
for row in read_xls_rows(os.path.join(SRC2021, "라우팅 -나머지.xls")):
    row = row + [""] * 10
    item, pno_g, pname, proc, seq, out_yn = row[0], row[2], row[3], row[4], row[6], row[7]
    if not item or item.startswith("품목코드"):
        continue
    routing.append((item, pno_g, pname, proc, seq, out_yn, "라우팅-나머지"))
with io.open(os.path.join(OUT, "routing_2021.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["item", "pno_group", "pname", "proc_code", "seq", "out_yn", "src"])
    w.writerows(routing)

# ── 4. 품목 유도 마스터 + 유형 분류 ────────────────────────────
RE_FINISHED = re.compile(r"^S?\d{5}-[A-Z0-9]{5}(-\d)?$")  # 45264-3D900, S25452-3A600
RE_SEMI = re.compile(r"^S?\d{5}-[A-Z0-9]{5}-[A-Z]+\d*$")  # 28235-2B740-K1
items_2021 = {}
for p, c, _, _ in bom_edges:
    for code in (p, c):
        items_2021.setdefault(code, None)
for item, *_ in routing:
    items_2021.setdefault(item, None)


def classify(code):
    if RE_SEMI.match(code):
        return "반제품"
    if RE_FINISHED.match(code):
        return "완제품/조립"
    return "원자재/기타"


suffix_of = lambda c: c.rsplit("-", 1)[1] if RE_SEMI.match(c) else ""
with io.open(os.path.join(OUT, "items_2021.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["item", "type", "suffix"])
    for code in sorted(items_2021):
        w.writerow([code, classify(code), suffix_of(code)])

# ── 5. 2026 운영 MES POP_BOM 로드 ─────────────────────────────
mes_edges = []  # (MPNO, CPNO, JUST_QTY, USE_YN)
with io.open(os.path.join(DUMPOUT, "POP_BOM_전량.csv"), encoding="utf-8-sig") as f:
    rd = csv.DictReader(f)
    for row in rd:
        mes_edges.append((row["MPNO"].strip(), row["CPNO"].strip(),
                          row.get("JUST_QTY", ""), row.get("USE_YN", "")))
mes_items = {p for p, *_ in mes_edges} | {c for _, c, *_ in mes_edges}

# QMS_SPEC 품번 (검사규격 보유 품번)
spec_items = set()
spec_path = os.path.join(DUMPOUT, "QMS_SPEC_검사규격전량.csv")
if os.path.exists(spec_path):
    with io.open(spec_path, encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        pno_col = next((c for c in rd.fieldnames if c.upper() == "PNO"), None)
        if pno_col:
            for row in rd:
                v = row[pno_col].strip()
                if v:
                    spec_items.add(v)

# ── 6. 대사 ────────────────────────────────────────────────────
set2021 = set(items_2021)
both = set2021 & mes_items
only2021 = set2021 - mes_items
only2026 = mes_items - set2021

# 접미사↔공정 규칙 검증 (라우팅에서 반제품의 공정코드 첫글자 vs 접미사 첫글자)
suffix_proc = defaultdict(lambda: defaultdict(int))
for item, _, _, proc, _, _, _ in routing:
    sfx = suffix_of(item)
    if sfx and proc and proc != "0":
        suffix_proc[sfx[0]][proc] += 1

# ── 7. 트리 HTML (2026 운영 BOM 기준, 2021 대비 뱃지) ──────────
children = defaultdict(list)
all_children = set()
for p, c, q, u in mes_edges:
    children[p].append((c, q, u))
    all_children.add(c)
roots = sorted({p for p, *_ in mes_edges} - all_children)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render(code, qty, use, depth, lines):
    badge = "" if code in set2021 else ' <span class="new">2021이후</span>'
    dis = ' class="off"' if use == "0" else ""
    q = f' <span class="qty">x{qty}</span>' if qty and qty not in ("1", "") else ""
    lines.append(f'<li{dis}><span class="c">{esc(code)}</span>{q}{badge}')
    kids = children.get(code, [])
    if kids and depth < 12:
        lines.append("<ul>")
        for c, cq, cu in sorted(kids):
            render(c, cq, cu, depth + 1, lines)
        lines.append("</ul>")
    lines.append("</li>")


html = ["""<!doctype html><meta charset="utf-8"><title>POP_BOM 품번 트리 (2026-07-17 덤프)</title>
<style>body{font:14px/1.6 'Malgun Gothic',sans-serif;margin:24px;color:#1a2b45}
h1{font-size:18px} ul{list-style:none;padding-left:20px;border-left:1px dotted #b8c6dd}
li{margin:1px 0} .c{font-family:Consolas,monospace} .qty{color:#7286a3;font-size:12px}
.new{background:#ffe9a8;border-radius:4px;padding:0 5px;font-size:11px}
.off{opacity:.45;text-decoration:line-through} details{margin:6px 0}
summary{cursor:pointer;font-weight:600}</style>
<h1>POP_BOM 품번 트리 — 2026-07-17 tspmes 운영 덤프 (뱃지=2021 기초에 없던 품목)</h1>"""]
for r in roots:
    html.append("<details><summary>" + esc(r) + ("" if r in set2021 else ' <span class="new">2021이후</span>') + "</summary><ul>")
    lines = []
    for c, q, u in sorted(children[r]):
        render(c, q, u, 1, lines)
    html.extend(lines)
    html.append("</ul></details>")
with io.open(os.path.join(OUT, "bom_tree_2026.html"), "w", encoding="utf-8") as f:
    f.write("\n".join(html))

# ── 8. 리포트 ──────────────────────────────────────────────────
sample = lambda s, n=12: ", ".join(sorted(s)[:n]) + (" …" if len(s) > n else "")
rep = f"""# P0A 대사 리포트 — 2021 기초 vs 2026 운영 MES (작성 260724)

## 정정 1건 (정직 보고)
초안·코워크 지시의 "기존 BOM(0006) 대사"에서 **0006은 문서 BOM(규정↔양식)** 으로 확인 — 제품 BOM이 아님.
앱에는 제품 품목/BOM 마스터가 아직 없다. 따라서 대사 상대를 **tspmes 운영 실데이터(POP_BOM, 2026-07-17 덤프)** 로 교체 —
"2021 설계가 2026 운영에서 얼마나 살아있나"의 실측 검증이라 오히려 목적에 더 정확.
(POP_ITEM은 LOB 컬럼 포함으로 추출기 미지원[기존 백로그] → 품목 집합은 POP_BOM∪QMS_SPEC에서 유도)

## 규모
| 구분 | 2021 설계 | 2026 운영(덤프) |
| --- | --- | --- |
| BOM 간선 | {len(bom_edges)} | {len(mes_edges)} (POP_BOM 전량) |
| 품목(유도) | {len(set2021)} | {len(mes_items)} (+검사규격 보유 {len(spec_items)}) |
| 공정 마스터 | {len(proc_rows)} | (POP_CODE WRKCTR 계열) |
| 라우팅 행 | {len(routing)} | POP_ITEM.ROUTE (LOB로 미추출) |
| 거래처 | — | 139 (POP_CUST) |

## 대사 결과
- **양쪽 공존(살아있는 2021 설계)**: {len(both)}개
- **2021에만(단종/설계변경 추정)**: {len(only2021)}개 — 예: {sample(only2021)}
- **2026에만(2021 이후 신규)**: {len(only2026)}개 — 예: {sample(only2026)}

## 접미사↔공정 규칙 검증 (라우팅 실측)
반제품 접미사 첫 글자별 라우팅 공정코드 분포(건수):
"""
for sfx in sorted(suffix_proc):
    dist = ", ".join(f"{p}:{n}" for p, n in sorted(suffix_proc[sfx].items(), key=lambda x: -x[1])[:5])
    rep += f"- `{sfx}*` → {dist}\n"
rep += f"""
## 판정
1. 2021 마스터 4종은 **현행 MES의 직계 조상** — POP_BOM 구조(MPNO/CPNO/JUST_QTY)가 2021 BOM 양식(상위/하위/소요량)과 동일.
2. 품목 회전이 큼(2021에만 {len(only2021)} · 2026에만 {len(only2026)}) → 공통 기초의 품목 마스터는 **정적 시드가 아니라 갱신 파이프라인**(덤프/파일 임포트)이어야 함. 범용 모드의 "덤프 던지면 첫날부터" 온보딩과 같은 결론.
3. 접미사↔공정 호응은 대체로 성립하나 예외 존재(위 분포 참조) → 코드 규칙은 **권장 규칙**으로 두고 강제하지 않는다(라우팅이 정본).

## 산출물
process_master_2021.csv · bom_edges_2021.csv · routing_2021.csv · items_2021.csv · bom_tree_2026.html (전부 본 폴더, 마이그 0건)
"""
with io.open(os.path.join(OUT, "P0A_대사리포트_260724.md"), "w", encoding="utf-8") as f:
    f.write(rep)

print(f"공정 {len(proc_rows)} · BOM간선 2021={len(bom_edges)} / 2026={len(mes_edges)} · 라우팅 {len(routing)}")
print(f"품목: 2021={len(set2021)} 2026={len(mes_items)} 공존={len(both)} 2021만={len(only2021)} 2026만={len(only2026)}")
print(f"트리 루트(최상위 품번): {len(roots)}개")
print("산출물 ->", OUT)
