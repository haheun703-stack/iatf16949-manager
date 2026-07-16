-- ============================================================
-- Migration 0066: 홈 확장 — 담당자(개인) 차원 + KPI 지수 (2026-07-16 사장님 지시)
--
-- ① recurring_obligations.assignee = 담당자 개인(자유 텍스트, 사람 마스터는
--    다중사용자 도입 시 승격). owner(팀)와 별개 — 홈 보드 팀별⇄개인별 토글용.
-- ② KPI 지수: 지표 정의(kpi_indicators)와 월별 측정값(kpi_measurements) 분리.
--    지표 정의는 KSSI(0036)·품질실적 월보(B2200-05)와 동일 원천의 대표 6종 시드
--    — 목표값은 초기 제안값(09 목업·KSSI 기준)이며 앱에서 수정 가능.
--    측정값은 비어 있음(입력 전 '미입력' 정직 표시 — 소급 생성 금지).
-- ============================================================

ALTER TABLE recurring_obligations ADD COLUMN assignee TEXT;

CREATE TABLE IF NOT EXISTS kpi_indicators (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT '%',
  target     REAL,                                -- NULL = 목표 미설정
  direction  TEXT NOT NULL DEFAULT 'higher' CHECK(direction IN ('higher','lower')), -- 높을수록/낮을수록 좋음
  cadence    TEXT NOT NULL DEFAULT '월',
  owner_team TEXT,                                -- 책임팀(자유 텍스트, normalizeTeam 호환)
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS kpi_measurements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id INTEGER NOT NULL,
  period       TEXT NOT NULL,                     -- 'YYYY-MM'
  value        REAL NOT NULL,
  entered_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(indicator_id, period)
);
CREATE INDEX IF NOT EXISTS idx_kpi_meas ON kpi_measurements(indicator_id, period);

-- 대표 지표 6종 시드 (테이블 최초 생성 시에만 — 멱등)
INSERT INTO kpi_indicators (name, unit, target, direction, owner_team, sort_order, note)
SELECT * FROM (VALUES
  ('공정 불량 PPM', 'PPM', 1000, 'lower',  '품질보증팀', 10, '재작업 포함 · 품질실적 월보(B2200-05) 연동 예정'),
  ('고객 불량 PPM', 'PPM', 50,   'lower',  '품질보증팀', 20, '납품 기준'),
  ('외주 불량 PPM', 'PPM', 500,  'lower',  '구매팀',     30, '입고 기준'),
  ('납기 준수율',   '%',   100,  'higher', '영업팀',     40, NULL),
  ('생산계획 달성율','%',  95,   'higher', '생산팀',     50, 'KSSI CP-03 — 목표 초기값, 수정 가능'),
  ('설비 가동율',   '%',   85,   'higher', '생산기술팀', 60, 'KSSI CP-03 — 목표 초기값, 수정 가능')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM kpi_indicators);
