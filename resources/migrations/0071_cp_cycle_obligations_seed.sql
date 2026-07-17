-- ============================================================
-- Migration 0071: CP 주기의무 시드 — 관리자 확인 의무형 (2026-07-17)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 근거 = docs/sq-levelup-2026-10/40_CP주기의무_매핑표.md.
-- 관리계획서(4품번 공통)가 선언한 주기 기록 의무를 관리자 "기입 확인"
-- 의무로 전개 — 현장 기록(종이 C/SHEET·MES)은 현행 유지.
-- 홈 관제탑 팀 매칭: form_code→forms.resp_dept 1순위, owner 폴백.
-- ⚠️같은 form_code를 의무 2건에 연결 금지(연결양식 오늘 작성=auto-done 오검).
-- ⚠️'반기' cadence는 본 커밋의 코드 4곳(advanceDate 등)과 세트.
-- 일 주기 항목은 당일 도래(date('now'))로 시드 — 보드 즉시 표출.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

-- 1) 신규 확인 의무 9건 (sort_order 는 0043 마지막 270 이후)
INSERT INTO recurring_obligations
  (title, cadence, category, clause_ref, owner, lead_days, next_due_date, form_code, sort_order, note)
VALUES
  -- ── 일 ──
  ('브레이징 조건 기록(3회/일) 확인', '일', '모니터링', 'SQ 1_5/3_5', '생산팀', 0, date('now'), 'M1200-11',
   300, 'CP 특별특성(◈/◆) 공정 — 3-zone 온도·LPG/AIR 유량·MESH 기록이 당일분 기입됐는지. 컨트롤박스 설정값=CP 범위 확인 포함 (4품번 공통)'),
  ('수입검사 이력카드 당일 입고분 기입 확인', '일', '모니터링', 'SQ 2_2', '품질보증팀', 0, date('now'), 'L2100-07',
   310, 'CP 단품입고 공정 5EA/LOT — 당일 입고 LOT의 외관·치수 실측 기입 여부(O표시만이면 지적감). 입고 없는 날은 해당없음 처리'),
  -- ── 주 ──
  ('스포트 팁 카운터↔교체대장 정합 확인', '주', '모니터링', 'SQ 1_5', '생산팀', 1, date('now','+3 day'), 'M1200-08',
   320, 'CP: 연마 5,000EA·교체 20,000EA(28236)/연마 50,000타(25460) — 카운터 현재값과 대장 기록 일치. 심사원 단골 확인 지점'),
  -- ── 월 ──
  ('완성품 검사일지↔MES 수량 정합 점검', '월', '모니터링', 'SQ 2_7', '생산팀', 5, date('now','+10 day'), NULL,
   330, 'CP 장착·외관검사 전수 기록 — 검사일지와 MES 실적 수량 일치, 작업자 입력 시점 통일 확인'),
  ('한도견본·검사구(C/F)·마스터 시편 상태 점검', '월', '모니터링', '8.6', '품질보증팀', 5, date('now','+14 day'), 'L2300-01',
   340, 'CP 장착성 C/F 전 공정 + LEAK/벤딩 OK·NG 마스터 — 식별라벨·보관 상태·검증 시효(JIG 2017·CMM 2022 갱신은 심사트랙 C8)'),
  -- ── 분기 ──
  ('원소재 M/SHEET 수취 확인(품목별 1회/3개월)', '분기', '공급업체', '8.6.2', '품질보증팀', 14, date('now','+21 day'), NULL,
   350, 'CP 재질 관리 — 품목별(PIPE·NIPPLE·BRKT·HOSE) 최근 분기분 밀시트 수취·편철. 제3사 명의분은 구매경로 체인 소명 자료와 연결(심사트랙 C6). 기록은 수입검사 관리대장(L2100-07)에 편철'),
  ('외주 ISIR·검사협정 접수대장 갱신', '분기', '공급업체', '8.4.2.4', '구매팀', 14, date('now','+28 day'), 'K1200-07',
   360, '외주업체(가공·프레스·표면처리) ISIR/협정 신규·개정분 접수 기록 — 심사원 단골 질문("외주 ISIR 받았나") 대비'),
  -- ── 반기 ──
  ('중금속(MS201-02) 공인성적서 수취 확인', '반기', '공급업체', 'MS201-02', '품질보증팀', 21, date('now','+30 day'), NULL,
   370, 'CP 중금속 1회/6개월 — 품목별 공인기관 성적서 유효기간 내 수취·편철 (4품번 공통)'),
  ('내식성(MS611-15) 공인성적서 수취 확인', '반기', '공급업체', 'MS611-15', '품질보증팀', 21, date('now','+35 day'), NULL,
   380, 'CP 표면처리 내식성 1회/6개월 — 도금업체(영남금속·대양금속) 성적서 수취·편철');

-- 2) 0043 기존 의무 보강 4건 (title 매칭 — 없으면 no-op)
UPDATE recurring_obligations SET
  form_code = 'M1200-10',
  owner = '생산팀',
  note = COALESCE(note, '') || ' — CP 자주검사 C/SHEET(초/중/종·전수, LEAK 조건·마스터 검출확인 란 포함) 기입 확인. CP 분담=생산●(0071)',
  updated_at = datetime('now')
WHERE title = '초·중·종물 검사(초/중/종)';

UPDATE recurring_obligations SET
  note = COALESCE(note, '') || ' — LEAK·벤딩 마스터(OK/NG) 시업전 검출 확인 포함(CP, 0071)',
  updated_at = datetime('now')
WHERE title = '작업 셋업 검증(Job Set-up)';

-- 설비일상점검: form_code 연결하지 않음 — L1100-07(설비 일상 점검표)의 resp_dept=생산기술팀이라
-- form 1순위 매칭이 수행 주체(생산팀)를 덮어쓰는 오배정 발생. note로만 양식 안내.
UPDATE recurring_obligations SET
  note = COALESCE(note, '') || ' — CP 명시 시업전 1회/일(양식 L1100-07 설비 일상 점검표), 점검표 항목=설비 실물 일치 확인(0071)',
  updated_at = datetime('now')
WHERE title = '설비 일상점검(TPM)';

UPDATE recurring_obligations SET
  form_code = 'L4102-02',
  note = COALESCE(note, '') || ' — 28236 CP 70/90공정 SPC 선언 이행(기밀 관리도)·25460 제출목록 X 해소(0071, 심사트랙 C1)',
  updated_at = datetime('now')
WHERE title = '공정능력 재검증(CP/CPK)';

-- 3) 시드 교정: 28236 EO 이력 확정 (7/17 사장님 — 정정 아닌 정상 이력)
UPDATE sqtrack_items SET
  title = 'EO 이력 즉답 준비(C2MRE654/C2MSE481)',
  detail = '이력 확정: C2MRE654=양산 전 최종 ISIR, C2MSE481=설변 전 개발품 단계 체결분 — 정상 이력. 심사 시 즉답 스토리로 사용(2권 사유서 내 변경전 C2MRE604 판독분만 원본 확인).'
WHERE code = '28236-2MAA0:1-03';
