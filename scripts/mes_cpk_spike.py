# -*- coding: utf-8 -*-
"""MES 덤프에서 CP/CPK 계산 스파이크.

사용:
  덤프 직접:  python scripts/mes_cpk_spike.py <dmp> <tables.json> --since YYYYMMDD --outdir <폴더>
  CSV 재계산: python scripts/mes_cpk_spike.py --csvdir <폴더> --since YYYYMMDD --outdir <폴더>
             (선행 실행이 만든 QMS_SQC_*이후.csv / QMS_SQCDESC_*이후.csv / QMS_SPEC_검사규격전량.csv 사용)

조인 구조(실측 확인):
  QMS_SPEC  (PNO, QCGUBUN, POSITION) → REMARK=항목명, SPCTYPE(NU=수치/OK=판정),
            규격 = NOMINAL ± 공차(SU=+측, SL=−측) → USL=NOM+SU, LSL=NOM−SL
            (예: NOM=8,SU=1,SL=1 → "7~9kA" / NOM=750,±50 → "700~800℃" — REMARK와 대조 검증됨)
  QMS_SQC   (YMD, SEQ) → 헤더 1건 = 검사항목 1개: PNO, QCGUBUN(W자주/I수입/P패트롤/O출하),
            POSITION(항목번호 ↔ SPEC.POSITION)
  QMS_SQCDESC (YMD, SEQ, SUBSEQ) → 측정값 QCSTND, SUBSEQ=샘플 반복번호(X-count)
            (실측 검증: 한 날짜에 SEQ 연번으로 POSITION 1~6 헤더가 생기고 값은 샘플1에 기록)
Cp=(USL-LSL)/6σ, Cpk=min((USL-μ)/3σ, (μ-LSL)/3σ). NOMINAL 없거나 공차 0폭이면 계산 제외.

단위혼용 보정: 항목명에 kgf와 MPa가 병기된 규격(예: "5~8Kgf/㎠ / 0.5~0.8MPa")은 규격이
MPa인데 현장 입력이 kgf인 행이 다수 → 값이 USL×2 초과면 ×0.0980665(kgf→MPa) 환산한
'정규화' 통계를 별도 산출(정규Cpk). 원본 Cpk도 그대로 남김(심사 설명용 증거).
"""
import re
import csv
import io
import json
import math
import sys
from collections import Counter, defaultdict


def ffloat(s):
    if s is None:
        return None
    s = str(s).strip().replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


class Stat:
    __slots__ = ("n", "s", "s2", "mn", "mx", "ok", "nonnum")

    def __init__(self):
        self.n = 0
        self.s = 0.0
        self.s2 = 0.0
        self.mn = None
        self.mx = None
        self.ok = 0
        self.nonnum = 0

    def add(self, v):
        self.n += 1
        self.s += v
        self.s2 += v * v
        self.mn = v if self.mn is None or v < self.mn else self.mn
        self.mx = v if self.mx is None or v > self.mx else self.mx

    def mean(self):
        return self.s / self.n if self.n else None

    def std(self):
        if self.n < 2:
            return None
        m = self.mean()
        var = (self.s2 - self.n * m * m) / (self.n - 1)
        return math.sqrt(var) if var > 0 else 0.0


SPEC_COLS = None  # 소스별로 채움


def main():
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "00000000"
    outdir = sys.argv[sys.argv.index("--outdir") + 1]
    csvdir = sys.argv[sys.argv.index("--csvdir") + 1] if "--csvdir" in sys.argv else None
    log = lambda m: (sys.stderr.write(m + "\n"), sys.stderr.flush())

    if csvdir:
        def rows_of(table):
            names = {
                "QMS_SPEC": f"{csvdir}/QMS_SPEC_검사규격전량.csv",
                "QMS_SQC": f"{csvdir}/QMS_SQC_{since}이후.csv",
                "QMS_SQCDESC": f"{csvdir}/QMS_SQCDESC_{since}이후.csv",
            }
            rd = csv.reader(io.open(names[table], encoding="utf-8-sig"))
            cols = next(rd)
            idx = {c: i for i, c in enumerate(cols)}
            return idx, rd
        write_filtered = False
    else:
        dmp, tj = sys.argv[1], sys.argv[2]
        from mes_dump_extract import iter_rows
        with io.open(tj, encoding="utf-8") as fp:
            meta = json.load(fp)["tables"]

        def rows_of(table):
            cols = meta[table]["columns"]
            idx = {c: i for i, c in enumerate(cols)}
            return idx, iter_rows(dmp, meta[table]["insert_offset"])
        write_filtered = True

    # ── 1) QMS_SPEC: 규격 로드 (NOMINAL±공차 → USL/LSL) ──
    si, spec_rows = rows_of("QMS_SPEC")
    specs = {}
    for r in spec_rows:
        pno, gubun = r[si["PNO"]], r[si["QCGUBUN"]]
        pos = ffloat(r[si["POSITION"]])
        if not pno or not gubun or pos is None:
            continue
        key = (pno, gubun, int(pos))
        rev = ffloat(r[si["REVISION"]]) or 0
        cur = specs.get(key)
        if cur and cur["rev"] > rev:
            continue
        nom, su, sl = ffloat(r[si["NOMINAL"]]), ffloat(r[si["SU"]]), ffloat(r[si["SL"]])
        usl = nom + su if (nom is not None and su is not None) else None
        lsl = nom - sl if (nom is not None and sl is not None) else None
        name = (r[si["REMARK"]] or "").strip()
        specs[key] = {
            "usl": usl, "lsl": lsl, "nominal": nom,
            "name": name,
            "spctype": (r[si["SPCTYPE"]] or "").strip(),
            "unit": r[si["QCUNIT"]] or "", "rev": rev,
            "dual_unit": bool(re.search(r"kgf", name, re.I) and re.search(r"mpa", name, re.I)),
        }
    log(f"QMS_SPEC: {len(specs)} 규격키")

    # ── 2) QMS_SQC 헤더 ──
    hi, hdr_rows = rows_of("QMS_SQC")
    headers = {}
    ymd_min = ymd_max = None
    gubun_cnt = Counter()
    hw = hdr_csv = None
    if write_filtered:
        hdr_csv = io.open(f"{outdir}/QMS_SQC_{since}이후.csv", "w", encoding="utf-8-sig", newline="")
        hw = csv.writer(hdr_csv)
        hw.writerow(list(hi.keys()))
    n_all = 0
    for r in hdr_rows:
        n_all += 1
        ymd = r[hi["YMD"]] or ""
        if ymd:
            ymd_min = ymd if ymd_min is None or ymd < ymd_min else ymd_min
            ymd_max = ymd if ymd_max is None or ymd > ymd_max else ymd_max
        if ymd < since:
            continue
        pos = ffloat(r[hi["POSITION"]])
        headers[(ymd, r[hi["SEQ"]])] = (r[hi["PNO"]] or "", r[hi["QCGUBUN"]] or "",
                                        int(pos) if pos is not None else -1)
        gubun_cnt[r[hi["QCGUBUN"]] or ""] += 1
        if hw:
            hw.writerow(["" if v is None else v for v in r])
        if n_all % 500000 == 0:
            log(f"QMS_SQC: {n_all}행 스캔...")
    if hdr_csv:
        hdr_csv.close()
    log(f"QMS_SQC: 스캔 {n_all}행 (기간 {ymd_min}~{ymd_max}), since 이후 {len(headers)}건 {dict(gubun_cnt)}")

    # ── 3) QMS_SQCDESC 측정값 ──
    di, desc_rows = rows_of("QMS_SQCDESC")
    stats = defaultdict(Stat)
    stats_norm = defaultdict(Stat)  # 단위혼용 규격의 kgf→MPa 정규화 통계
    dw = desc_csv = None
    if write_filtered:
        desc_csv = io.open(f"{outdir}/QMS_SQCDESC_{since}이후.csv", "w", encoding="utf-8-sig", newline="")
        dw = csv.writer(desc_csv)
        dw.writerow(list(di.keys()))
    n_all = n_hit = 0
    for r in desc_rows:
        n_all += 1
        if n_all % 1000000 == 0:
            log(f"QMS_SQCDESC: {n_all}행 스캔... (매칭 {n_hit})")
        ymd = r[di["YMD"]] or ""
        if ymd < since:
            continue
        h = headers.get((ymd, r[di["SEQ"]]))
        if h is None:
            continue
        n_hit += 1
        if dw:
            dw.writerow(["" if v is None else v for v in r])
        raw = (r[di["QCSTND"]] or "").strip()
        if not raw:
            continue  # 미사용 샘플칸
        st = stats[h]  # (pno, gubun, position) — 헤더가 항목을 지정
        v = ffloat(raw)
        if v is not None:
            st.add(v)
            sp = specs.get(h)
            if sp and sp["dual_unit"] and sp["usl"] is not None:
                nv = v * 0.0980665 if v > sp["usl"] * 2 else v
                stats_norm[h].add(nv)
        elif raw.upper() in ("OK", "O.K", "양호", "합격"):
            st.ok += 1
        elif raw:
            st.nonnum += 1
    if desc_csv:
        desc_csv.close()
    log(f"QMS_SQCDESC: 스캔 {n_all}행, 매칭 {n_hit}행, 통계키 {len(stats)}개")

    # ── 4) CP/CPK 리포트 ──
    rep = io.open(f"{outdir}/CPK리포트_{since}이후.csv", "w", encoding="utf-8-sig", newline="")
    rw = csv.writer(rep)
    rw.writerow(["품번", "검사구분", "항목번호", "항목명", "유형", "측정n", "평균", "표준편차", "최소", "최대",
                 "LSL", "USL", "NOMINAL", "Cp", "Cpk", "판정", "단위혼용", "정규Cpk", "정규판정",
                 "OK건", "비수치건", "단위"])

    def calc(st, usl, lsl):
        m, sd = st.mean(), st.std()
        cp = cpk = None
        if sd and sd > 0 and m is not None:
            if usl is not None and lsl is not None:
                cp = (usl - lsl) / (6 * sd)
                cpk = min((usl - m) / (3 * sd), (m - lsl) / (3 * sd))
            elif usl is not None:
                cpk = (usl - m) / (3 * sd)
            elif lsl is not None:
                cpk = (m - lsl) / (3 * sd)
        return m, sd, cp, cpk

    def jg(cpk):
        if cpk is None:
            return ""
        return "우수(≥1.67)" if cpk >= 1.67 else ("적합(≥1.33)" if cpk >= 1.33 else ("주의(≥1.0)" if cpk >= 1.0 else "부적합(<1.0)"))

    n_cpk = 0
    judge_cnt = Counter()
    norm_cnt = Counter()
    for key in sorted(stats.keys()):
        st = stats[key]
        sp = specs.get(key, {})
        usl, lsl = sp.get("usl"), sp.get("lsl")
        if usl is not None and lsl is not None and usl == lsl:
            usl = lsl = None  # 0폭 규격(정확값 설정류) 제외
        m, sd, cp, cpk = calc(st, usl, lsl)
        ncpk = None
        if key in stats_norm:
            _, _, _, ncpk = calc(stats_norm[key], usl, lsl)
        judge = jg(cpk)
        if cpk is not None:
            n_cpk += 1
            judge_cnt[judge] += 1
        if ncpk is not None:
            norm_cnt[jg(ncpk)] += 1
        fmt = lambda x, p=4: (round(x, p) if isinstance(x, float) else x) if x is not None else ""
        rw.writerow([key[0], key[1], key[2], sp.get("name", ""), sp.get("spctype", ""),
                     st.n, fmt(m), fmt(sd), fmt(st.mn), fmt(st.mx),
                     fmt(lsl), fmt(usl), fmt(sp.get("nominal")), fmt(cp, 2), fmt(cpk, 2), judge,
                     "Y" if sp.get("dual_unit") else "", fmt(ncpk, 2), jg(ncpk),
                     st.ok, st.nonnum, sp.get("unit", "")])
    rep.close()
    print(f"완료: 통계키 {len(stats)}개 중 Cpk 계산 가능 {n_cpk}개")
    print(f"판정 분포: {dict(judge_cnt)}")
    print(f"단위혼용 정규화 후 판정({sum(norm_cnt.values())}건): {dict(norm_cnt)}")
    print(f"산출: {outdir}\\CPK리포트_{since}이후.csv")


if __name__ == "__main__":
    main()
