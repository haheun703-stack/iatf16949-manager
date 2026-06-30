-- ============================================================
-- Migration 0043: 정기 의무 캘린더 (recurring obligations)
--
-- 일회성 schedule_items 와 달리 "주기적으로 반복되는 IATF 의무 활동"을
-- 등록·도래관리. 주기=일|주|월|분기|년. 이행완료 시 다음 도래일 자동 전진.
-- 시드=IATF 16949 표준 정기의무 세트(앱에서 수정/추가/삭제 가능).
-- 라이브 심사 갭(CP/CPK·제품안전교육·경영검토 회의이력)을 직접 커버.
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_obligations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  cadence        TEXT NOT NULL DEFAULT '월',     -- 일|주|월|분기|년
  category       TEXT NOT NULL DEFAULT '기타',   -- 내부심사|경영검토|모니터링|공급업체|교육/인식|교정/MSA|FMEA/관리계획서|안전/비상|문서관리|기타
  clause_ref     TEXT,                           -- IATF/SQ 조항 (예: 9.3)
  owner          TEXT,                           -- 담당
  lead_days      INTEGER NOT NULL DEFAULT 7,     -- 도래 전 임박 알림 리드타임(일)
  anchor_date    TEXT,                           -- 최초 기준일(선택, YYYY-MM-DD)
  last_done_date TEXT,                           -- 최근 이행일(YYYY-MM-DD)
  next_due_date  TEXT,                           -- 다음 도래일(YYYY-MM-DD)
  form_code      TEXT,                           -- 연결 증빙 양식(선택)
  active         INTEGER NOT NULL DEFAULT 1,     -- 1=활성, 0=비활성
  note           TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_obligation_due ON recurring_obligations(active, next_due_date);
CREATE INDEX IF NOT EXISTS idx_obligation_cadence ON recurring_obligations(cadence, sort_order);

-- IATF 표준 정기의무 시드 (멱등: 테이블이 비어있을 때만)
-- next_due_date 는 최초 실행일 기준 상대 오프셋으로 분산 → 사용자가 실제일정에 맞춰 조정.
INSERT INTO recurring_obligations
  (title, cadence, category, clause_ref, owner, lead_days, next_due_date, form_code, sort_order, note)
SELECT * FROM (VALUES
  -- ── 일 ──
  ('초·중·종물 검사(초/중/종)', '일', '모니터링', '8.6.2', '품질팀', 0, date('now','+1 day'), NULL, 10, '작업 시작·교대·종료 시 첫/끝 제품 검사'),
  ('작업 셋업 검증(Job Set-up)', '일', '모니터링', '8.5.1.3', '생산팀', 0, date('now','+1 day'), NULL, 20, '셋업 후 초품 승인 기록'),
  ('설비 일상점검(TPM)', '일', '모니터링', '8.5.1', '생산팀', 0, date('now','+1 day'), NULL, 30, '일상 점검 체크시트'),
  -- ── 주 ──
  ('층별 공정감사(LPA)', '주', '내부심사', '8.6', '품질팀', 1, date('now','+5 day'), NULL, 40, '계층별 공정 준수 점검(CSR 주기 확인)'),
  ('주간 품질회의(부적합 리뷰)', '주', '경영검토', '9.1.1', '품질팀', 1, date('now','+4 day'), NULL, 50, '회의록 보존 — 심사 회의이력 증빙'),
  -- ── 월 ──
  ('품질목표/KPI 모니터링', '월', '모니터링', '9.1.1', '품질팀', 5, date('now','+12 day'), NULL, 60, '품질목표 달성률 집계'),
  ('고객 스코어카드/포털 점검', '월', '모니터링', '9.1.2', '영업/품질', 5, date('now','+14 day'), NULL, 70, '납입실적·클레임·등급 확인'),
  ('교정 도래(Due) 점검', '월', '교정/MSA', '7.1.5.2', '품질팀', 7, date('now','+16 day'), NULL, 80, '교정 만기 임박 측정장비 식별'),
  ('공급업체 납입·품질 모니터링', '월', '공급업체', '8.4.2.4', '구매팀', 7, date('now','+18 day'), NULL, 90, '입고불량·납기 모니터링'),
  ('부적합/고객불만 동향 분석', '월', '모니터링', '10.2', '품질팀', 7, date('now','+20 day'), NULL, 100, '월간 부적합 추이·재발 분석'),
  -- ── 분기 ──
  ('층별감사 종합 검토', '분기', '내부심사', '8.6', '품질팀', 14, date('now','+1 month'), NULL, 110, 'LPA 결과 종합·시정'),
  ('공급업체 성과 평가', '분기', '공급업체', '8.4.2.4', '구매팀', 14, date('now','+2 month'), NULL, 120, '공급업체 등급 재평가'),
  ('비상대응계획 점검', '분기', '안전/비상', '6.1.2.3', '생산팀', 14, date('now','+2 month'), NULL, 130, 'contingency plan 검토'),
  ('리스크/기회 검토(SWOT)', '분기', '경영검토', '6.1', '경영지원', 14, date('now','+3 month'), NULL, 140, '6.1 리스크·기회 갱신'),
  -- ── 년 ──
  ('내부심사 — QMS', '년', '내부심사', '9.2.2.2', '품질팀', 30, date('now','+2 month'), NULL, 150, '연간 내부심사 프로그램(전 프로세스)'),
  ('내부심사 — 제조공정', '년', '내부심사', '9.2.2.3', '품질팀', 30, date('now','+3 month'), NULL, 160, '공정심사(제조공정 효과성)'),
  ('내부심사 — 제품', '년', '내부심사', '9.2.2.4', '품질팀', 30, date('now','+3 month'), NULL, 170, '제품심사(규격 적합성)'),
  ('경영검토 회의', '년', '경영검토', '9.3', '경영진', 30, date('now','+4 month'), NULL, 180, 'Management Review — 회의록 보존'),
  ('MSA 측정시스템 분석 재평가', '년', '교정/MSA', '7.1.5.1.1', '품질팀', 30, date('now','+5 month'), NULL, 190, 'Gage R&R 등 재평가'),
  ('공정능력 재검증(CP/CPK)', '년', '교정/MSA', '9.1.1.1', '품질팀', 30, date('now','+5 month'), NULL, 200, '특별특성 공정능력 자료 갱신 — 심사 갭'),
  ('FMEA·관리계획서 정기 검토', '년', 'FMEA/관리계획서', '8.3.3.3', '품질개발', 30, date('now','+6 month'), NULL, 210, 'PFMEA·CP 주기 검토·갱신'),
  ('제품안전 교육·인식', '년', '교육/인식', '4.4.1.2', '경영지원', 30, date('now','+4 month'), NULL, 220, '제품안전 책임·인식 교육 — 심사 갭'),
  ('교육훈련 계획 수립·효과성', '년', '교육/인식', '7.2', '경영지원', 30, date('now','+5 month'), NULL, 230, '연간 교육계획·효과성 평가'),
  ('문서 정기 검토(개정 유효성)', '년', '문서관리', '7.5.2', '품질팀', 30, date('now','+7 month'), NULL, 240, '규정·양식 최신성 점검'),
  ('고객특별요구(CSR) 갱신 확인', '년', '문서관리', '8.2.3.1.2', '품질팀', 30, date('now','+6 month'), NULL, 250, '고객별 CSR 최신판 반영'),
  ('내부심사원 자격 유지', '년', '교육/인식', '7.2.3', '품질팀', 30, date('now','+8 month'), NULL, 260, '내부심사원 역량·자격 갱신'),
  ('2자(공급업체) 심사 계획·실시', '년', '공급업체', '8.4.2.4.1', '구매팀', 30, date('now','+9 month'), NULL, 270, '공급업체 현장심사')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM recurring_obligations);
