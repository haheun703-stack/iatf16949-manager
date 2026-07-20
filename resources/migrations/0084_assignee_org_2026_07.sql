-- ============================================================
-- Migration 0084: 관제탑 담당자(assignee) 신 조직도 반영 — 인사이동 30건 (2026-07-20)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 원천 = "전사 조직도"(2026-07-20 사장님 제공). 0081 이 쓴 "26년 TPC AM사업부
-- 조직도.png"(2026.1/1 승인본) 대비 인사이동 발생 → 0081 배정 72건 중 30건이
-- 재직하지 않는 인원(김기범·고형진·안진성·박민수)에게 남아 있었음.
--
-- 조직 변경 요약:
--   · 품질/개발팀 분리 → 품질팀(팀장 임하수 부장 ※26.7.23 부임 · 품질보증 류형석 과장
--     · 팀원 박세진 계장 · 수입검사 이화준 대리) / 개발팀(팀장 하헌 부장 · 김민수 과장)
--   · 퇴사/이탈: 김기범(품질팀장 차장)·고형진(품질관리 계장)·안진성(납품관리 과장)
--     ·박민수(생산 팀원)
--   · 이동: 서명진 과장 = 품질(개발) → 자재관리(자재/납품팀)
--           조성민 대리 = 자재관리 → 납품관리
--   · 신규(의무 배정 대상): 임하수·류형석·박세진·이화준(품질) · 김병철 사원(생산 보전)
--   · 신규(미배정): 예지용 계장(생산 팀원) · 김만진 계장(납품) · 김정현/노성현(납품반 용역)
--     — 조직도상 역할과 1:1 대응하는 기록 의무 없음. 필요 시 관제탑에서 개별 지정.
--
-- 배정 원칙(0081 계승): assignee = 그 기록의 "확인 책임자".
--   · 팀장급 시스템 의무(마감보고·내부심사·CAPA·LPA·문서·CSR) = 임하수(품질팀장)
--   · 검사 실무 = 역할 일치 분담: 이화준(수입검사·성적서 수취·교정/측정기),
--     박세진(순회검사·출하검사·한도견본)
--   · 품질기술(SPC·CP/CPK·ISIR) = 류형석(품질보증) — 담당자 자재 이동에도 품질팀 존치
--     (사장님 결정 2026-07-20). 10월 SQ 레벨업 심사 최우선 항목이라 품질 소재가 안전.
--   · 자재/납품 분리 = 자재계열 서명진(자재관리 과장) / 납품계열 조성민(납품관리 대리)
--   · 설비·보전 = 김병철(보전 사원)
--
-- 멱등성/안전 가드: WHERE assignee='<구 담당자>' — 0081 기본값을 그대로 들고 있는 행만
--   교체. 사용자가 관제탑에서 이미 다른 사람으로 고쳐둔 행은 불변(사용자 기입 불가침).
--   재적용 시 대상 0행. title 정확일치(id 는 설치본별 편차 가능).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ⚠️assignee 는 kb 인덱스 비수록 필드 — kb 동기 불필요(0080 R8 해당 없음).
-- ⚠️'양산이관·초기유동(ISIR) 점검' 은 owner='개발팀' 인데 assignee 는 품질팀 인원(류형석).
--   의도된 교차 배정(기록 소관=개발, 확인 책임=품질보증). owner 이동은 별건 결정 사항.
-- ⚠️임하수 부장 부임일 2026-07-23 — 그 전까지 품질팀 16건은 실질 공석.
--   부임 전 대행이 필요하면 관제탑 ObligationModal 에서 개별 수정.
-- ============================================================

-- ── 품질팀장 시스템 의무 16건: 김기범 → 임하수 ──
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='일일 마감보고 — 품질팀' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='부적합 식별·격리·NCR 등록' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='층별 공정감사(LPA)' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='주간 품질회의(부적합 리뷰)' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='CAPA 진행·기한 점검' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='품질목표/KPI 모니터링' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='부적합/고객불만 동향 분석' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='모의 역추적 훈련(리콜 시뮬레이션)' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='층별감사 종합 검토' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='내부심사 — QMS' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='내부심사 — 제조공정' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='내부심사 — 제품' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='연간 내부심사 계획 수립' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='내부심사원 자격 유지' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='문서 정기 검토(개정 유효성)' AND active=1 AND assignee='김기범';
UPDATE recurring_obligations SET assignee='임하수', updated_at=datetime('now')
WHERE title='고객특별요구(CSR) 갱신 확인' AND active=1 AND assignee='김기범';

-- ── 검사 실무 9건: 고형진 → 이화준(수입검사·성적서·교정) / 박세진(순회·출하·한도견본) ──
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='수입검사 이력카드 당일 입고분 기입 확인' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='교정 도래(Due) 점검' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='측정기 전수 교정' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='원소재 M/SHEET 수취 확인(품목별 1회/3개월)' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='중금속(MS201-02) 공인성적서 수취 확인' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='이화준', updated_at=datetime('now')
WHERE title='내식성(MS611-15) 공인성적서 수취 확인' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='박세진', updated_at=datetime('now')
WHERE title='공정 순회검사·LOT 라벨 상태 확인' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='박세진', updated_at=datetime('now')
WHERE title='출하검사·성적서 발행(생산 LOT 기재)' AND active=1 AND assignee='고형진';
UPDATE recurring_obligations SET assignee='박세진', updated_at=datetime('now')
WHERE title='한도견본·검사구(C/F)·마스터 시편 상태 점검' AND active=1 AND assignee='고형진';

-- ── 품질기술 3건: 서명진(자재 이동) → 류형석(품질보증) ──
UPDATE recurring_obligations SET assignee='류형석', updated_at=datetime('now')
WHERE title='SPC·Cpk 월간 검토(특별특성)' AND active=1 AND assignee='서명진';
UPDATE recurring_obligations SET assignee='류형석', updated_at=datetime('now')
WHERE title='공정능력 재검증(CP/CPK)' AND active=1 AND assignee='서명진';
UPDATE recurring_obligations SET assignee='류형석', updated_at=datetime('now')
WHERE title='양산이관·초기유동(ISIR) 점검' AND active=1 AND assignee='서명진';

-- ── 납품 계열 2건: 안진성 → 조성민(납품관리 대리) ──
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='납입지시(EDI/발주) 확인·출하계획 확정' AND active=1 AND assignee='안진성';
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='고객 스코어카드/포털 점검' AND active=1 AND assignee='안진성';

-- ── 자재 계열 6건: 조성민(납품관리로 이동) → 서명진(자재관리 과장) ──
-- ※ 위 '납품 계열' 블록보다 뒤에 와야 함(조성민 신규 배정 2건이 재이동되지 않도록
--   title 정확일치로 분리 — 두 블록의 title 집합은 서로소).
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='입고 LOT 등록·FIFO 불출 확인' AND active=1 AND assignee='조성민';
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='순환 재고실사·외주 진행 점검' AND active=1 AND assignee='조성민';
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='주간 소요계획(MRP) 확정·발주' AND active=1 AND assignee='조성민';
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='재고자산 결산(장기재고 보고)' AND active=1 AND assignee='조성민';
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='공급업체 납입·품질 모니터링' AND active=1 AND assignee='조성민';
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='외주 ISIR·검사협정 접수대장 갱신' AND active=1 AND assignee='조성민';

-- ── 설비·보전 3건: 박민수 → 김병철(보전 사원) ──
UPDATE recurring_obligations SET assignee='김병철', updated_at=datetime('now')
WHERE title='설비 일상점검(TPM)' AND active=1 AND assignee='박민수';
UPDATE recurring_obligations SET assignee='김병철', updated_at=datetime('now')
WHERE title='설비 주간점검' AND active=1 AND assignee='박민수';
UPDATE recurring_obligations SET assignee='김병철', updated_at=datetime('now')
WHERE title='스포트 팁 카운터↔교체대장 정합 확인' AND active=1 AND assignee='박민수';
