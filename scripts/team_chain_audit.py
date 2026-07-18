# -*- coding: utf-8 -*-
"""팀→프로세스→지침(규정)→하위양식 체인 전수 감사 (5팀 재편 검증, 2026-07-19 초판).

사용: python scripts/team_chain_audit.py  (설치판 DB를 읽기전용으로 검사)
검사 7종: ①forms.resp_dept 팀 매핑 ②규정별 팀(무팀/복수팀) ③프로세스 주관팀
④process_forms 고아 ⑤의무 owner 매핑 ⑥SQ 항목 팀 산출(sq_reg_map 경유,
 ⚠️fallback_dept 미반영 — 이 목록에 떠도 fallback 있으면 앱에선 정상 배정)
⑦팀별 트리 요약.
⚠️TEAMS/HINTS는 src/shared/team-theme.ts 의 사본 — 팀 재편 시 양쪽 동기 필수.
향후 계획: 앱 내 '정합성 점검' IPC로 내장 + 마이그레이션 diff 검수 에이전트와 세트.
"""
import re, sqlite3, sys
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding="utf-8")
db = sqlite3.connect(r"file:C:\Users\ASUS\AppData\Roaming\iatf16949-manager\iatf16949.db?mode=ro", uri=True)

TEAMS = {
    "gaebal": ("개발팀", ["개발팀", "설계팀", "개발영업팀"]),
    "jajae": ("영업/자재팀", ["영업/자재팀", "영업자재팀", "자재/출하팀", "자재출하팀", "자재팀", "출하팀", "구매팀", "영업팀"]),
    "saengsan": ("생산팀", ["생산팀", "생산기술팀"]),
    "pumjil": ("품질팀", ["품질팀", "품질보증팀", "품질경영팀", "품질개발팀", "품질경영·보증팀"]),
    "gwanli": ("관리팀", ["관리팀", "총무팀", "경영지원팀"]),
}
HINTS = {"경영지원": "gwanli", "경영진": "gwanli", "경영자": "gwanli", "총무": "gwanli",
         "자재": "jajae", "출하": "jajae", "구매": "jajae", "영업": "jajae",
         "생산기술": "saengsan", "생산관리": "saengsan"}
LUT = {}
for tid, (_, keys) in TEAMS.items():
    for k in keys:
        LUT[re.sub(r"[\s　]", "", k)] = tid

def norm_team(s):
    if not s: return None
    return LUT.get(re.sub(r"[\s　]", "", s))

def norm_owner(s):
    if not s: return None
    for tok in re.split(r"[/,·+&]", s):
        t = re.sub(r"[\s　]", "", tok)
        if not t: continue
        r = LUT.get(t) or LUT.get(t + "팀") or HINTS.get(t)
        if r: return r
    return None

label = lambda tid: TEAMS[tid][0] if tid else "★미매핑"

print("=" * 70)
print("① forms.resp_dept 값별 팀 매핑")
bad_depts = []
for dept, n in db.execute("SELECT resp_dept, COUNT(*) FROM forms WHERE deprecated=0 GROUP BY resp_dept ORDER BY 2 DESC"):
    t = norm_team(dept)
    mark = "" if t else "  ← ★미매핑!"
    if not t: bad_depts.append((dept, n))
    print(f"  {str(dept):<16} {n:>4}건 → {label(t)}{mark}")

print()
print("② 규정(지침)별 팀 — forms.reg_code 기준")
reg_team = defaultdict(set)
reg_forms = Counter()
for reg, dept in db.execute("SELECT reg_code, resp_dept FROM forms WHERE deprecated=0"):
    reg_forms[reg] += 1
    t = norm_team(dept)
    if t: reg_team[reg].add(t)
noteam_regs = [r for r in reg_forms if not reg_team.get(r)]
multi = {r: ts for r, ts in reg_team.items() if len(ts) > 1}
print(f"  규정 수: {len(reg_forms)} / 팀 없는 규정: {len(noteam_regs)} / 복수 팀 규정: {len(multi)}")
if noteam_regs:
    print("  ★팀 없는 규정:", ", ".join(sorted(noteam_regs)[:20]))
for r, ts in sorted(multi.items())[:15]:
    print(f"    복수팀 {r}: {[label(t) for t in sorted(ts)]} (양식 {reg_forms[r]})")

print()
print("③ 프로세스 → 주관팀 (bom_documents.owner_dept)")
for code, name, dept in db.execute(
        "SELECT p.code, p.name, b.owner_dept FROM processes p LEFT JOIN bom_documents b ON b.doc_no_raw = p.code ORDER BY p.sort_order"):
    t = norm_team(dept)
    print(f"  {code} {name:<14} owner={str(dept):<10} → {label(t)}")

print()
print("④ process_forms 고아 (양식 마스터에 없는 연결)")
orphans = list(db.execute(
    "SELECT pf.process_code, pf.form_code FROM process_forms pf LEFT JOIN forms f ON f.code = pf.form_code WHERE f.code IS NULL"))
print(f"  고아 연결: {len(orphans)}건", orphans[:10] if orphans else "")

print()
print("⑤ recurring_obligations owner 매핑 (72건)")
bad_own = []
for owner, n in db.execute("SELECT owner, COUNT(*) FROM recurring_obligations GROUP BY owner"):
    t = norm_owner(owner)
    if not t: bad_own.append((owner, n))
print("  ★미매핑 owner:", bad_own if bad_own else "없음 — 전건 5팀 배정")

print()
print("⑥ SQ 42항목 → 팀 (sq_reg_map 경유)")
item_regs = defaultdict(list)
for ic, rc in db.execute("SELECT item_code, reg_code FROM sq_reg_map"):
    item_regs[ic].append(rc)
unassigned = []
for code, in db.execute("SELECT code FROM sq_items ORDER BY code"):
    ts = set()
    for rc in item_regs.get(code, []):
        ts |= reg_team.get(rc, set())
    if not ts: unassigned.append(code)
print(f"  팀 미배정 항목: {unassigned if unassigned else '없음'}")
badmap = sorted({rc for rcs in item_regs.values() for rc in rcs if rc not in reg_forms})
print(f"  sq_reg_map 이 참조하는데 양식 마스터에 없는 규정: {badmap if badmap else '없음'}")

print()
print("=" * 70)
print("⑦ 팀별 트리 요약 (팀 → 규정 수 → 양식 수)")
team_regs = defaultdict(set)
team_form_cnt = Counter()
for reg, ts in reg_team.items():
    for t in ts: team_regs[t].add(reg)
for reg, dept in db.execute("SELECT reg_code, resp_dept FROM forms WHERE deprecated=0"):
    t = norm_team(dept)
    if t: team_form_cnt[t] += 1
for tid in TEAMS:
    print(f"  {label(tid):<10} 규정 {len(team_regs[tid]):>3} · 양식 {team_form_cnt[tid]:>3}")
un_forms = db.execute("SELECT COUNT(*) FROM forms WHERE deprecated=0 AND (resp_dept IS NULL OR resp_dept='')").fetchone()[0]
print(f"  (resp_dept 공란 양식: {un_forms}건)")
