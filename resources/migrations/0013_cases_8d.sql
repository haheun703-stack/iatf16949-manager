-- ============================================================
-- Migration 0013: 사건중심 8D 워크플로우 (고객 불량 케이스)
--
-- 현실의 출발점 = 고객사 부적합 통보. 한 건의 케이스가
--   접수 → 임시대책(선별) → 8D조사 → 개선대책서 → 유효성 → 수평전개 → 4M → 종결
-- 흐름을 따라가며, 공유 사실을 한 번 입력하면 관련 IATF 양식에 분배된다.
--
-- 핵심 도메인:
--   선별(containment)은 두 갈래 — 사내재고 선별(사내/생산), 고객사 선별(품질).
--   → case_screening 에 scope 로 구분 저장.
--
-- 멱등: cases 류는 IF NOT EXISTS(데이터 보존). form_submissions.case_id 는
--   _migrations 추적으로 1회만 ALTER(0010 layout_json ALTER와 동일 패턴).
-- ============================================================

-- 1) 케이스 헤더 (고객 통보 접수 정보 = 안정적 컬럼)
CREATE TABLE IF NOT EXISTS cases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_no      TEXT UNIQUE,              -- 자동채번 QC-2026-####
  title        TEXT,                     -- 통보 제목
  customer     TEXT,                     -- 고객사 (예: 삼보모터스)
  source       TEXT,                     -- 발생처 (예: 삼보 INLINE)
  part_no      TEXT,                     -- 품번 (28237-2MAA1)
  part_name    TEXT,                     -- 품명 (PIPE ASSY,B-T/C WATER,OUT)
  model        TEXT,                     -- 차종 (감마2)
  defect_desc  TEXT,                     -- 불량내용 (클립 이물 불량)
  defect_qty   INTEGER,                  -- 불량수량
  attributable TEXT,                     -- 귀책처 (TPC 2공장)
  occurred_date TEXT,                    -- 발생일
  received_date TEXT,                    -- 접수일(통보 수신)
  due_date     TEXT,                     -- 회신 요구일 (개선대책서 限)
  status       TEXT NOT NULL DEFAULT 'open',  -- open|in_progress|closed
  owner        TEXT,                     -- 사내 담당
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status, due_date);

-- 2) 선별(봉쇄) — 두 주체로 구분. 케이스 생성 시 사내/고객 2행 자동 생성.
CREATE TABLE IF NOT EXISTS case_screening (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER NOT NULL,
  scope        TEXT NOT NULL,            -- 'internal'(사내재고) | 'customer'(고객사)
  owner_dept   TEXT,                     -- 사내재고→생산/공장, 고객사→품질팀
  total_qty    INTEGER,                  -- 선별 대상 수량
  screened_qty INTEGER,                  -- 선별 완료 수량
  defect_qty   INTEGER,                  -- 발견 불량 수량
  status       TEXT NOT NULL DEFAULT 'todo',  -- todo|doing|done
  note         TEXT,
  done_at      TEXT,
  UNIQUE(case_id, scope),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);
CREATE INDEX IF NOT EXISTS idx_screening_case ON case_screening(case_id);

-- 3) 8D 흐름 단계 진행상태. 케이스 생성 시 8단계 자동 생성.
CREATE TABLE IF NOT EXISTS case_steps (
  case_id   INTEGER NOT NULL,
  step_key  TEXT NOT NULL,               -- intake|containment|investigate|corrective|verify|horizontal|change4m|close
  status    TEXT NOT NULL DEFAULT 'todo',-- todo|doing|done
  done_at   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (case_id, step_key),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- 4) 흐름 진행 중 생기는 공유 사실(근본원인·개선대책·유효성·수평전개·4M 등) key/value.
CREATE TABLE IF NOT EXISTS case_facts (
  case_id   INTEGER NOT NULL,
  fact_key  TEXT NOT NULL,               -- root_cause|corrective_action|verification|horizontal_deploy|change_4m...
  value     TEXT,
  PRIMARY KEY (case_id, fact_key),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- 5) 케이스가 낳은 양식 작성본 연결(분배 산출물 추적). 비파괴 컬럼 추가.
ALTER TABLE form_submissions ADD COLUMN case_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_sub_case ON form_submissions(case_id);
