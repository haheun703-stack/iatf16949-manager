-- ============================================================
-- Migration 0046: PPAP(양산부품승인) 모듈 — Core Tool #1
--
-- 코워크 APQP 명세서(docs/core-tools-design-spec.md §4.1)의 도메인을
-- v5 아키텍처로 네이티브 구현. 고객 양산부품 승인용 18 표준 요구사항 묶음.
-- 제출수준(Level 1~5)에 따라 제출/보관 범위 상이. APQP Phase 4 핵심 산출물.
-- clause_id/team_id 는 v5 clauses/teams 와 FK 호환(전수 검증됨).
-- ============================================================

CREATE TABLE IF NOT EXISTS ppap_submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  part_no        TEXT NOT NULL,
  part_name      TEXT,
  customer       TEXT,
  level          INTEGER NOT NULL DEFAULT 3 CHECK(level IN (1,2,3,4,5)),
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK(status IN ('draft','submitted','approved','interim','rejected')),
  submitted_date TEXT,                          -- YYYY-MM-DD
  approved_date  TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ppap_elements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL,              -- 1~18
  name          TEXT NOT NULL,
  name_en       TEXT,
  clause_id     TEXT REFERENCES clauses(id),
  team_id       TEXT REFERENCES teams(id),
  status        TEXT NOT NULL DEFAULT 'not_started'
                  CHECK(status IN ('not_started','in_progress','completed','na')),
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ppap_elem_sub ON ppap_elements(submission_id, seq);

-- ── 데모 제출 1건 (빈 화면 방지) ──
INSERT INTO ppap_submissions (part_no, part_name, customer, level, status, submitted_date, note)
SELECT 'DEMO-001', '브래킷 ASSY (데모)', '현대위아', 3, 'draft', NULL, 'PPAP 제출 데모 — 18요구사항 진척 추적 예시'
WHERE NOT EXISTS (SELECT 1 FROM ppap_submissions);

-- ── 18 표준 요구사항 (명세 §4.1, clause/team FK 검증됨) ──
-- 데모 진척: 1~6 완료, 7~10 진행, 11~18 미착수 (진척률 표시용)
-- VALUES 기본 컬럼명(column1..column6) 사용 + 데모 제출과 크로스조인.
-- ⚠️FK 안전(2026-07-30 검수 C-6): clauses/teams 는 seedDatabase() 가 채우고 그 호출은
-- runMigrations() **이후**다. 완전 신규 DB(빈 userData)에서는 이 시점에 부모 행이 없어
-- FK 위반으로 체인이 중단되고 앱이 창 없이 죽었다(FK ON 드라이런 실측).
-- → 존재하는 참조만 값으로 쓰고 없으면 NULL(두 컬럼 모두 nullable). 시드된 DB에서는 종전과
--    완전 동일한 값이 들어가므로 라이브 무영향.
INSERT INTO ppap_elements (submission_id, seq, name, name_en, clause_id, team_id, status, sort_order)
SELECT s.id, x.column1, x.column2, x.column3,
       (SELECT c.id FROM clauses c WHERE c.id = x.column4),
       (SELECT t.id FROM teams t WHERE t.id = x.column5),
       x.column6, x.column1 * 10
FROM (SELECT id FROM ppap_submissions WHERE part_no='DEMO-001') s,
(VALUES
  (1,  '설계기록',           'Design Records',                      '8.3.5',     'team-de', 'completed'),
  (2,  '엔지니어링 변경 문서', 'Engineering Change Documents',        '8.3.6',     'team-de', 'completed'),
  (3,  '고객 엔지니어링 승인', 'Customer Engineering Approval',       '8.3.4',     'team-de', 'completed'),
  (4,  '설계 FMEA',          'Design FMEA',                         '8.3.5',     'team-de', 'completed'),
  (5,  '공정 흐름도',         'Process Flow Diagram',                '8.5.1',     'team-pr', 'completed'),
  (6,  '공정 FMEA',          'Process FMEA',                        '8.5.1',     'team-qc', 'completed'),
  (7,  '관리계획서',          'Control Plan',                        '8.5.1',     'team-qc', 'in_progress'),
  (8,  '측정시스템분석',       'MSA Studies',                         '7.1.5.1.1', 'team-qc', 'in_progress'),
  (9,  '치수결과',           'Dimensional Results',                 '8.6.2',     'team-qc', 'in_progress'),
  (10, '재료·성능 시험결과',   'Material & Performance Test Results',  '8.6',       'team-qc', 'in_progress'),
  (11, '초기공정연구',        'Initial Process Studies',             '9.1.1',     'team-qc', 'not_started'),
  (12, '공인시험소 문서',      'Qualified Laboratory Documentation',  '7.1.5',     'team-qc', 'not_started'),
  (13, '외관승인보고서(AAR)',  'Appearance Approval Report',          '8.6.3',     'team-qc', 'not_started'),
  (14, '양산 샘플',          'Sample Production Parts',             '8.6',       'team-qc', 'not_started'),
  (15, '한도견본',           'Master Sample',                       '8.5.1',     'team-qc', 'not_started'),
  (16, '검사치공구',          'Checking Aids',                       '7.1.5',     'team-qc', 'not_started'),
  (17, '고객별 특정요구 기록', 'Customer-Specific Requirements',      '8.2.3',     'team-qc', 'not_started'),
  (18, '부품제출보증서(PSW)',  'Part Submission Warrant',             '8.3.4.4',   'team-qc', 'not_started')
) x
WHERE NOT EXISTS (SELECT 1 FROM ppap_elements);
