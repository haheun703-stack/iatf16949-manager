-- 0004_apqp.sql
-- APQP (Advanced Product Quality Planning) 5단계 + 산출물 요소
-- IATF 16949 Core Tool — 8.3 설계·개발 프로세스와 연계

CREATE TABLE IF NOT EXISTS apqp_phases (
  id TEXT PRIMARY KEY,
  phase_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS apqp_elements (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES apqp_phases(id),
  seq INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  io TEXT CHECK(io IN ('input','output')) DEFAULT 'output',
  core_tool TEXT,
  clause_id TEXT REFERENCES clauses(id),
  team_id TEXT REFERENCES teams(id),
  status TEXT CHECK(status IN ('not_started','in_progress','completed','na')) DEFAULT 'not_started',
  target_date TEXT,
  actual_date TEXT,
  note TEXT,
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apqp_elements_phase ON apqp_elements(phase_id);
CREATE INDEX IF NOT EXISTS idx_apqp_elements_clause ON apqp_elements(clause_id);
CREATE INDEX IF NOT EXISTS idx_apqp_elements_team ON apqp_elements(team_id);
CREATE INDEX IF NOT EXISTS idx_apqp_elements_status ON apqp_elements(status);
