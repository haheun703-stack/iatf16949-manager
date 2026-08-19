-- ============================================================
-- resources/core/schema.sql — 코어 스키마 스냅샷 (자동 생성 · 손편집 금지)
-- 생성기: scripts/gen-core-schema.mjs · 스냅샷 지점: 0144_company_profile_tpc_values.sql (마이그 143개 적용 결과)
-- 내용: table 98 · index 85 — 데이터 0행(팩이 공급)
-- 클린 설치 전용: server/migrate-core.cjs 가 빈 DB 에서 1회 실행하고 스냅샷 이하 마이그를 status=snapshot 으로 기록한다.
-- ============================================================
CREATE TABLE clauses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES clauses(id),
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  category TEXT
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  clause_id TEXT NOT NULL REFERENCES clauses(id),
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('form','record','procedure','manual')) DEFAULT 'form',
  template_path TEXT,
  current_version TEXT DEFAULT '1.0',
  retention_days INTEGER DEFAULT 1095,
  created_at TEXT DEFAULT (datetime('now'))
, team_id TEXT REFERENCES teams(id), doc_code TEXT, revision TEXT);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id TEXT
);

CREATE TABLE persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id),
  role TEXT,
  email TEXT,
  qualifications TEXT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  clause_id TEXT NOT NULL REFERENCES clauses(id),
  assignee_id TEXT REFERENCES persons(id),
  team_id TEXT REFERENCES teams(id),
  status TEXT CHECK(status IN ('plan','do','check','act','done')) DEFAULT 'plan',
  priority TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
  deadline TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE task_pdca_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  changed_by TEXT REFERENCES persons(id),
  note TEXT
);

CREATE TABLE audits (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  scheduled_date TEXT,
  actual_date TEXT,
  status TEXT DEFAULT 'planned',
  lead_auditor TEXT,
  scope TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES audits(id),
  clause_id TEXT REFERENCES clauses(id),
  type TEXT CHECK(type IN ('major_nc','minor_nc','observation','opportunity')),
  description TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  due_date TEXT,
  verification_date TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE company_profile (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE regulation_sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_code     TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_body TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE forms (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  reg_code        TEXT NOT NULL,
  description     TEXT,
  approvals_json  TEXT NOT NULL,
  next_form_code  TEXT,
  next_form_label TEXT,
  prev_form_code  TEXT
, layout_json TEXT, scope TEXT NOT NULL DEFAULT 'common', deprecated INTEGER NOT NULL DEFAULT 0, deprecated_note TEXT, replacement_page TEXT, resp_dept   TEXT, iatf_clause TEXT, sq_item_ids TEXT, template_path TEXT);

CREATE TABLE form_fields (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code          TEXT NOT NULL,
  field_key          TEXT NOT NULL,
  label              TEXT NOT NULL,
  type               TEXT NOT NULL,
  section            TEXT,
  placeholder        TEXT,
  options_json       TEXT,
  unit               TEXT,
  ai_enabled         INTEGER NOT NULL DEFAULT 0,
  ai_prompt_hint     TEXT,
  sort_order         INTEGER NOT NULL DEFAULT 0, field_class TEXT
  CHECK(field_class IN ('frame','fact')) DEFAULT 'frame',
  UNIQUE(form_code, field_key),
  FOREIGN KEY (form_code) REFERENCES forms(code)
);

CREATE TABLE form_submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code   TEXT NOT NULL,
  serial_no   TEXT,
  values_json TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_by  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL, case_id INTEGER,
  FOREIGN KEY (form_code) REFERENCES forms(code)
);

CREATE TABLE form_submission_links (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  from_submission_id INTEGER NOT NULL,
  to_submission_id   INTEGER NOT NULL,
  created_at         TEXT NOT NULL,
  UNIQUE(from_submission_id, to_submission_id),
  FOREIGN KEY (from_submission_id) REFERENCES form_submissions(id),
  FOREIGN KEY (to_submission_id)   REFERENCES form_submissions(id)
);

CREATE TABLE processes (
  code        TEXT PRIMARY KEY,
  category    TEXT NOT NULL,           -- 'CP' | 'MP' | 'SP'
  name        TEXT NOT NULL,
  description TEXT,
  doc_no      TEXT,                    -- 'TPC-CP-01' 등
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE process_pages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  page_no      INTEGER NOT NULL,        -- 1, 2, 3...
  page_label   TEXT,                    -- '표지', '흐름도 P/D', '흐름도 C/A' 등
  image_path   TEXT,                    -- 절대경로(or userData 기준 상대). NULL이면 미등록.
  created_at   TEXT,
  UNIQUE(process_code, page_no),
  FOREIGN KEY (process_code) REFERENCES processes(code)
);

CREATE TABLE process_forms (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  form_code    TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(process_code, form_code),
  FOREIGN KEY (process_code) REFERENCES processes(code),
  FOREIGN KEY (form_code)    REFERENCES forms(code)
);

CREATE TABLE bom_documents (
  doc_no_norm    TEXT PRIMARY KEY,
  doc_no_raw     TEXT NOT NULL,
  category       TEXT NOT NULL,
  category_label TEXT NOT NULL,
  name           TEXT NOT NULL,
  owner_dept     TEXT,
  list_rev       INTEGER,
  list_date      TEXT,
  file_rev       INTEGER,
  file_date      TEXT,
  status         TEXT NOT NULL,
  forms_count    INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bom_form_refs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no_norm    TEXT NOT NULL,
  form_type      TEXT NOT NULL,        -- form | variant | appendix | external_ref
  form_no_raw    TEXT,                 -- A1100-01, B2300-1, 65200-03
  form_no_norm   TEXT,                 -- 정규화: A110001, B230001, 6520003
  label          TEXT NOT NULL,        -- 원문 양식명/부표명
  sort_order     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (doc_no_norm) REFERENCES bom_documents(doc_no_norm)
);

CREATE TABLE form_guides (
  form_code     TEXT PRIMARY KEY,
  guide_json    TEXT NOT NULL,        -- { purpose, mustInclude[], auditPoints[], commonFindings[], tips[] }
  provider      TEXT,
  model         TEXT,
  generated_at  TEXT NOT NULL
);

CREATE TABLE form_scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code     TEXT NOT NULL,
  submission_id INTEGER,              -- nullable: 임시 입력값 채점도 허용
  score         INTEGER NOT NULL,     -- 0~100
  grade         TEXT,                 -- A | B | C | D
  verdict       TEXT,                 -- 적합 | 보완필요 | 부적합
  summary       TEXT,
  result_json   TEXT NOT NULL,        -- 전체 채점 결과(강점/감점/개선/누락)
  provider      TEXT,
  model         TEXT,
  scored_at     TEXT NOT NULL
);

CREATE TABLE schedule_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '기타',   -- 심사준비|내부심사|교육훈련|문서/양식|시정조치|기타
  status      TEXT NOT NULL DEFAULT '예정',   -- 예정|진행|완료|보류
  priority    TEXT NOT NULL DEFAULT '보통',   -- 높음|보통|낮음
  owner       TEXT,
  start_date  TEXT,                            -- YYYY-MM-DD
  due_date    TEXT,                            -- YYYY-MM-DD
  note        TEXT,
  form_code   TEXT,                            -- 연결 양식(선택)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sq_categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  points      INTEGER NOT NULL,
  iatf_clause TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sq_items (
  code        TEXT PRIMARY KEY,          -- 대제목_세부번호 (예 2_7)
  category_id INTEGER NOT NULL,
  title       TEXT NOT NULL,
  points      INTEGER NOT NULL,
  requirement TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0, fallback_dept TEXT,
  FOREIGN KEY (category_id) REFERENCES sq_categories(id)
);

CREATE TABLE sq_reg_map (
  reg_code  TEXT NOT NULL,               -- forms.reg_code 와 동일 도메인 (예 B-1100)
  item_code TEXT NOT NULL,
  PRIMARY KEY (reg_code, item_code),
  FOREIGN KEY (item_code) REFERENCES sq_items(code)
);

CREATE TABLE sq_item_docs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL,
  doc_code  TEXT,
  doc_name  TEXT,
  dept      TEXT,
  FOREIGN KEY (item_code) REFERENCES sq_items(code)
);

CREATE TABLE sq_item_form_types (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code        TEXT NOT NULL,
  form_type        TEXT NOT NULL,
  count_in_archive INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_code) REFERENCES sq_items(code)
);

CREATE TABLE cases (
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

CREATE TABLE case_screening (
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

CREATE TABLE case_steps (
  case_id   INTEGER NOT NULL,
  step_key  TEXT NOT NULL,               -- intake|containment|investigate|corrective|verify|horizontal|change4m|close
  status    TEXT NOT NULL DEFAULT 'todo',-- todo|doing|done
  done_at   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (case_id, step_key),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE case_facts (
  case_id   INTEGER NOT NULL,
  fact_key  TEXT NOT NULL,               -- root_cause|corrective_action|verification|horizontal_deploy|change_4m...
  value     TEXT,
  PRIMARY KEY (case_id, fact_key),
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE process_doc (
  process_code   TEXT PRIMARY KEY,
  doc_no         TEXT,
  title          TEXT,
  rev_no         TEXT,
  rev_date       TEXT,
  scope          TEXT,
  purpose        TEXT,
  approvals_json TEXT,                 -- [{role,title,name}]
  updated_at     TEXT,
  FOREIGN KEY (process_code) REFERENCES processes(code)
);

CREATE TABLE process_revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  rev_no       TEXT,
  rev_date     TEXT,
  reason       TEXT,
  author       TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0, kpi TEXT, formula TEXT, cycle TEXT, owner TEXT,
  FOREIGN KEY (process_code) REFERENCES processes(code)
);

CREATE TABLE form_cell_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT,
  cell TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE form_grid_spec (
  form_code      TEXT NOT NULL,
  grid_key       TEXT NOT NULL,
  data_start_row INTEGER NOT NULL,
  stride         INTEGER NOT NULL DEFAULT 1,
  max_rows       INTEGER NOT NULL,
  PRIMARY KEY (form_code, grid_key)
);

CREATE TABLE form_grid_columns (
  form_code  TEXT NOT NULL,
  grid_key   TEXT NOT NULL,
  col_key    TEXT NOT NULL,
  label      TEXT NOT NULL,
  sheet_col  TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_code, grid_key, col_key)
);

CREATE TABLE form_option_cells (
  form_code  TEXT NOT NULL,
  field_key  TEXT NOT NULL,
  option     TEXT NOT NULL,
  cell       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_code, field_key, option)
);

CREATE TABLE form_submission_revisions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  rev_no        INTEGER NOT NULL,          -- 작성본별 1,2,3...
  values_json   TEXT NOT NULL,             -- 스냅샷 당시 입력값
  change_reason TEXT,                      -- 변경사유(개정 사유)
  author        TEXT,                      -- 개정 작성자
  status        TEXT,                      -- 스냅샷 당시 작성본 상태(draft/submitted/approved)
  created_at    TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES form_submissions(id)
);

CREATE TABLE ai_drafts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  target_kind  TEXT NOT NULL,                       -- form_entry|case|assignment|schedule|sq_self
  target_key   TEXT,                                -- 안정키(form_code/case_no/sq_item_key…), 신규면 NULL
  payload_json TEXT NOT NULL,                        -- 제안 내용(셀/필드 매핑 포함)
  rationale    TEXT,                                 -- 왜 이렇게 제안했는지(사람이 읽음)
  source_refs  TEXT,                                 -- JSON [{kind,key,quote_short}] 근거
  confidence   REAL,                                 -- 0~1
  status       TEXT NOT NULL DEFAULT 'proposed',     -- proposed|approved|rejected|superseded|expired
  created_by   TEXT NOT NULL DEFAULT 'ai',
  model        TEXT,
  created_at   TEXT NOT NULL,
  decided_by   TEXT,                                 -- 결재자
  decided_at   TEXT,
  decided_note TEXT,                                 -- 거절 사유 등
  edit_diff    TEXT,                                 -- 사람이 결재 전 수정한 diff(★수용률 학습용)
  applied_ref  TEXT                                  -- 반영된 공식 레코드 식별(예 form_submissions:42)
);

CREATE TABLE ai_actions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor       TEXT NOT NULL,                         -- ai|human
  action      TEXT NOT NULL,                         -- draft|approve|reject|query|briefing|structure_capture
  draft_id    INTEGER REFERENCES ai_drafts(id),
  purpose     TEXT,
  source_refs TEXT,
  model       TEXT,
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    REAL,
  ts          TEXT NOT NULL
);

CREATE TABLE kb_chunks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,        -- clause|sq_item|form_def|case|process
  ref_key    TEXT NOT NULL,        -- 안정키(reg_code/sq_item code/form code/case_no/process_code)
  title      TEXT,
  text       TEXT NOT NULL,
  updated_at TEXT
);

CREATE VIRTUAL TABLE kb_fts USING fts5(
  kind UNINDEXED,
  ref_key UNINDEXED,
  title,
  text,
  tokenize = 'trigram'
);

CREATE TABLE raw_captures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL DEFAULT 'memo',   -- memo|paste|photo(후속)
  content       TEXT NOT NULL,                   -- 원문(메모/붙여넣기 텍스트)
  attached_path TEXT,                            -- 첨부(후속)
  form_code     TEXT,                            -- 대상 양식(있으면)
  status        TEXT NOT NULL DEFAULT 'new',     -- new|drafted|done
  created_by    TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE parts (
  part_no    TEXT PRIMARY KEY,                  -- 28237-2MAA1
  part_name  TEXT,                              -- PIPE ASSY B-T/C WATER,OUT
  customer   TEXT,                              -- 현대위아 / 삼보모터스(폴더 귀속 고객)
  model      TEXT,                              -- 감마2-ENG (차종)
  plant      TEXT,                              -- 2공장
  created_at TEXT
);

CREATE TABLE isir_packages (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  part_no            TEXT NOT NULL REFERENCES parts(part_no),
  rev_code           TEXT,                      -- 사양코드 C2MSE448
  rev_date           TEXT,                      -- 25.08.05
  submit_type        TEXT,                      -- agreement|isir_new|isir_change (검사협정/ISIR신규/설변)
  customer_recipient TEXT,                      -- 수요자(삼보모터스(주))
  ire_risk           TEXT,                      -- 부품품질 위험도(특별관리/중요관리) — 검사협정서
  qa_manager         TEXT,                      -- 품질보증 책임자(김기범)
  submitted_at       TEXT,                      -- 제출일(2025.10.15)
  approved           INTEGER NOT NULL DEFAULT 0,
  source_path        TEXT,                      -- 원본 xlsx 경로(읽기전용 참조)
  created_at         TEXT
);

CREATE TABLE isir_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  isir_id       INTEGER NOT NULL REFERENCES isir_packages(id),
  doc_no        INTEGER,                        -- 1..26
  doc_name      TEXT,                           -- 관리계획서 / 공정 FMEA / 검사 협정서 …
  req_agreement INTEGER NOT NULL DEFAULT 0,     -- 검사협정 필수
  req_new       INTEGER NOT NULL DEFAULT 0,     -- ISIR 신규개발 필수
  req_change    INTEGER NOT NULL DEFAULT 0,     -- ISIR 설계변경 필수
  present       INTEGER NOT NULL DEFAULT 0,     -- 실제 보유(증빙) 여부
  evidence_path TEXT
);

CREATE TABLE control_plan_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  isir_id         INTEGER NOT NULL REFERENCES isir_packages(id),
  seq             INTEGER,                      -- 행 순번(원본 순서 보존)
  process_no      TEXT,                         -- 공정번호(10,20… 또는 sub)
  process_name    TEXT,                         -- 단품입고(PIPE_A) / 수입검사 …
  equipment       TEXT,                         -- 설비명
  char_kind       TEXT,                         -- 제품 | 공정
  control_item    TEXT,                         -- 관리항목(포밍 외경/재질/중금속/장착성 …)
  special_char    TEXT,                         -- 특별특성
  spec            TEXT,                         -- 규격(텍스트: "Ø23.0±0.3","STKM11A Ø21.0X1.0T")
  method          TEXT,                         -- 확인방법(육안/V·C/C·F/M-SHEET)
  frequency       TEXT,                         -- 주기(5EA/LOT·전수·1회/3개월)
  control_method  TEXT,                         -- 관리방안(수입검사 성적서 …)
  resp_production INTEGER NOT NULL DEFAULT 0,    -- 생산 분담(●=1)
  resp_qa         INTEGER NOT NULL DEFAULT 0,    -- QA 분담
  reaction        TEXT,                         -- 이상 발생시 조치
  note            TEXT                           -- 비고(공급처 등)
);

CREATE TABLE recurring_obligations (
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
, assignee TEXT, trigger_type TEXT NOT NULL DEFAULT 'periodic');

CREATE TABLE ppap_submissions (
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

CREATE TABLE ppap_elements (
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

CREATE TABLE fmea_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fmea_no       TEXT NOT NULL,
  part_name     TEXT,                          -- 품명
  part_no       TEXT,                          -- 품번
  proc_owner    TEXT,                          -- 공정 책임자
  model         TEXT,                          -- 적용차종
  author        TEXT,                          -- 작성
  reviewer      TEXT,                          -- 검토
  approver      TEXT,                          -- 승인
  due_date      TEXT,                          -- 완료 예정일
  mp_date       TEXT,                          -- 양산 적용일
  team_members  TEXT,                          -- 상호 기능팀원
  revision_note TEXT,                          -- 주요 개정내용
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK(status IN ('draft','in_review','approved')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
, customer TEXT);

CREATE TABLE fmea_rows (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id           INTEGER NOT NULL REFERENCES fmea_documents(id) ON DELETE CASCADE,
  seq              INTEGER NOT NULL DEFAULT 0,
  -- 구조분석 (B/C/D)
  proc_item        TEXT,                        -- 1.공정 항목
  proc_step        TEXT,                        -- 2.공정 단계
  proc_element     TEXT,                        -- 3.공정 작업요소
  -- 기능분석 (E/F/G)
  func_item        TEXT,                        -- 공정 항목의 기능
  func_step        TEXT,                        -- 공정단계 및 기능
  func_element     TEXT,                        -- 작업요소 기능
  -- 고장분석 (H/I/J/K)
  failure_effect   TEXT,                        -- FE(고장영향, 상위)
  severity         INTEGER CHECK(severity IS NULL OR severity BETWEEN 1 AND 10),  -- 심각도 S
  failure_mode     TEXT,                        -- FM(고장형태)
  failure_cause    TEXT,                        -- FC(고장원인)
  -- 리스크분석 (L/M/N/O/P/Q)
  prevention_ctrl  TEXT,                        -- 현재 예방관리
  occurrence       INTEGER CHECK(occurrence IS NULL OR occurrence BETWEEN 1 AND 10),  -- 발생도 O
  detection_ctrl   TEXT,                        -- 현재 검출관리
  detection        INTEGER CHECK(detection IS NULL OR detection BETWEEN 1 AND 10),  -- 검출도 D
  action_priority  TEXT CHECK(action_priority IS NULL OR action_priority IN ('H','M','L')),  -- AP
  special_char     TEXT,                        -- 특별공정특성
  -- 최적화 (R~AD)
  prevention_action TEXT,                       -- 예방조치
  detection_action  TEXT,                       -- 검출조치
  responsible       TEXT,                       -- 책임자
  due_date          TEXT,                       -- 목표 완료일
  action_status     TEXT,                       -- 상태
  evidence          TEXT,                       -- 증거 포인터
  completed_date    TEXT,                       -- 완료일
  re_severity       INTEGER CHECK(re_severity IS NULL OR re_severity BETWEEN 1 AND 10),
  re_occurrence     INTEGER CHECK(re_occurrence IS NULL OR re_occurrence BETWEEN 1 AND 10),
  re_detection      INTEGER CHECK(re_detection IS NULL OR re_detection BETWEEN 1 AND 10),
  special_prod_char TEXT,                        -- 특별제품특성
  re_action_priority TEXT CHECK(re_action_priority IS NULL OR re_action_priority IN ('H','M','L')),
  note              TEXT,                        -- 비고
  sort_order        INTEGER NOT NULL DEFAULT 0,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE msa_studies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gage_name     TEXT NOT NULL,
  gage_no       TEXT,
  characteristic TEXT,                          -- 측정 대상 특성
  method        TEXT NOT NULL DEFAULT 'gage_rr'
                  CHECK(method IN ('gage_rr','bias','linearity','stability')),
  grr_percent   REAL,                           -- %GRR
  ndc           INTEGER,                         -- 구별 범주 수(ndc)
  result        TEXT NOT NULL DEFAULT 'pending'
                  CHECK(result IN ('acceptable','marginal','unacceptable','pending')),
  clause_id     TEXT REFERENCES clauses(id),
  team_id       TEXT REFERENCES teams(id),
  study_date    TEXT,                            -- YYYY-MM-DD
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE apqp_phases (
  id          TEXT PRIMARY KEY,
  phase_no    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  title_en    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE apqp_elements (
  id          TEXT PRIMARY KEY,
  phase_id    TEXT NOT NULL REFERENCES apqp_phases(id),
  seq         INTEGER NOT NULL,
  name        TEXT NOT NULL,
  name_en     TEXT,
  io          TEXT NOT NULL DEFAULT 'output' CHECK(io IN ('input','output')),
  core_tool   TEXT,                            -- FMEA|CP|MSA|SPC|PPAP (딥링크 태그)
  clause_id   TEXT REFERENCES clauses(id),
  team_id     TEXT REFERENCES teams(id),
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK(status IN ('not_started','in_progress','completed','na')),
  target_date TEXT,                            -- YYYY-MM-DD
  actual_date TEXT,
  note        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE form_approvals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  step          INTEGER NOT NULL DEFAULT 1,       -- 결재 순번(1=담당 → 2=팀장 → 3=사업부장 …)
  role          TEXT,                             -- 결재란 라벨(forms.approvals_json 과 대응)
  approver      TEXT,                             -- 결재자(로그인 도입 전 = 이름 문자열)
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  acted_at      TEXT,                             -- 처리 시각(ISO8601)
  note          TEXT                              -- 반려 사유 등
);

CREATE TABLE obligation_completions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation_id INTEGER NOT NULL,
  done_date     TEXT NOT NULL,                       -- YYYY-MM-DD (이행일, 로컬)
  done_by       TEXT,                                -- 완료 처리자(선택)
  source        TEXT NOT NULL DEFAULT 'manual',      -- manual | form
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sq_guide_items (
  item_code        TEXT PRIMARY KEY,   -- sq_items.code ('1_1'~'6_12')
  area             TEXT NOT NULL,
  high_value       INTEGER NOT NULL DEFAULT 0,  -- 50점급 ★
  regulations_text TEXT,               -- 지배규정 원문 문자열(파싱은 뷰에서)
  forms_text       TEXT,               -- 필요양식 원문 문자열
  cycle_retention  TEXT,               -- 주기/보존
  guide_version    TEXT NOT NULL
);

CREATE TABLE sq_guides (
  id         INTEGER PRIMARY KEY,
  item_code  TEXT NOT NULL,
  section    TEXT NOT NULL CHECK(section IN ('evidence','how_to_write','examples','penalty_patterns')),
  sort_order INTEGER NOT NULL,
  content    TEXT NOT NULL
);

CREATE TABLE sq_checkpoints (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code     TEXT NOT NULL,
  guide_id      INTEGER,              -- sq_guides(evidence 불릿)와 1:1
  status        TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('met','partial','missing','na')),
  evidence_note TEXT,
  updated_by    TEXT,
  updated_at    TEXT
);

CREATE TABLE sq_assessments (
  id          TEXT PRIMARY KEY,       -- 'SA-2026-H1'
  assessed_at TEXT NOT NULL,
  total_score REAL,
  grade       TEXT,                   -- S/G/불합격
  report_path TEXT,
  approved_by TEXT,
  approved_at TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
, assessor TEXT, witness TEXT, summary_opinion TEXT, next_due TEXT);

CREATE TABLE sq_assessment_lines (
  assessment_id   TEXT NOT NULL,
  item_code       TEXT NOT NULL,
  suggested_state TEXT,               -- 자동 제안값(감사 추적 보존)
  final_state     TEXT,               -- 사람 확정: 우수/양호/보완/일부미흡/다수미흡/미관리/미해당
  observation     TEXT,
  extra_finding   TEXT,
  PRIMARY KEY (assessment_id, item_code)
);

CREATE TABLE kpi_indicators (
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

CREATE TABLE kpi_measurements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id INTEGER NOT NULL,
  period       TEXT NOT NULL,                     -- 'YYYY-MM'
  value        REAL NOT NULL,
  entered_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(indicator_id, period)
);

CREATE TABLE sqtrack_parts (
  part_no     TEXT PRIMARY KEY REFERENCES parts(part_no),
  binder_info TEXT,                    -- '1권 정기검사 세트 / 2권 ISIR 풀세트(CP p058~062)'
  scan_ref    TEXT,                    -- 스캔 원본 파일 안내
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sqtrack_items (
  code           TEXT PRIMARY KEY,     -- '25460-2T500:2-03'
  part_no        TEXT NOT NULL REFERENCES sqtrack_parts(part_no),
  phase          INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
                 -- 1=서류 확보 2=정합성 리스크 해소 3=현장검증 준비 4=인터뷰 대비
  seq            INTEGER NOT NULL DEFAULT 0,
  title          TEXT NOT NULL,
  detail         TEXT,                 -- 무엇이 왜 문제인지 + 조치 방향
  evidence_pages TEXT,                 -- 근거 스캔 페이지 '2권 p003' (UI 배지)
  severity       TEXT NOT NULL DEFAULT 'yellow' CHECK (severity IN ('red','orange','yellow')),
  team           TEXT,                 -- TeamId: chongmu|yeongup|gumae|saengsan|saengki|pumjil|gaebal
  form_code      TEXT,                 -- forms.code 바로가기 (느슨한 참조, FK 아님)
  sq_item_code   TEXT,                 -- sq_items.code 표시 전용 (sq_reg_map 연동 금지)
  tag            TEXT                  -- 인터뷰 토픽 등 자유 라벨
);

CREATE TABLE sqtrack_item_status (
  item_code  TEXT PRIMARY KEY REFERENCES sqtrack_items(code),
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','na')),
  note       TEXT,
  updated_by TEXT,
  updated_at TEXT
);

CREATE TABLE mes_import_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  drop_date   TEXT NOT NULL,                -- 드롭 폴더 날짜 (YYYY-MM-DD)
  record_type TEXT NOT NULL CHECK (record_type IN ('자주검사','수입검사','공정패트롤','설비일상점검','기타')),
  file_name   TEXT NOT NULL,
  file_path   TEXT,
  imported_at TEXT DEFAULT (datetime('now')),
  row_count   INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);

CREATE TABLE mes_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER REFERENCES mes_import_files(id),
  record_date TEXT NOT NULL,                -- 실제 기록 일자 (YYYY-MM-DD)
  record_type TEXT NOT NULL,
  part_no     TEXT,                         -- 품번 (parts 와 느슨 연결, FK 아님)
  process     TEXT,                         -- 공정명 (예: 로브레이징, LEAK TEST)
  inspector   TEXT,                         -- 검사자/작업자
  judgment    TEXT,                         -- 판정 (합격/OK/NG 등 원문 그대로)
  qty         INTEGER,                      -- 수량 (있으면)
  raw_json    TEXT,                         -- 파싱 원본 행 전체 (포맷 미확정 대비)
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE mes_codes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  main_code      TEXT NOT NULL,             -- 코드그룹 (예: QC_GBN)
  sub_code       TEXT NOT NULL,             -- 하위코드
  code_name      TEXT NOT NULL,             -- 코드명
  ref1           TEXT, ref2 TEXT, ref3 TEXT, ref4 TEXT, ref5 TEXT,
  remark         TEXT,
  up_code        TEXT,                      -- 그룹 헤더($)의 상위 분류
  use_gbn        INTEGER NOT NULL DEFAULT 1,-- 1=사용 0=미사용
  sort_no        INTEGER,
  extras_json    TEXT,                      -- REF_STR6~20 등 잔여 필드(값 있을 때만)
  mes_added_at   TEXT,                      -- MES ADDYMD
  mes_updated_at TEXT,                      -- MES UPDYMD
  UNIQUE(main_code, sub_code)
);

CREATE TABLE app_users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,        -- 실명(표기·기록 주체)
  team_dept  TEXT,                        -- normalizeTeam 가능한 부서 문자열(team-theme deptKeys)
  role       TEXT CHECK(role IN ('member','manager','executive')) DEFAULT 'member',
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
, password_hash TEXT, must_change_pw INTEGER NOT NULL DEFAULT 1, pw_reset_by TEXT, pw_reset_at TEXT);

CREATE TABLE form_examples (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code     TEXT NOT NULL,
  field_key     TEXT NOT NULL,           -- form_fields.field_key 매칭(0004)
  example_value TEXT NOT NULL,           -- 모범 값(fact 필드도 '보기'용으로만 — 우측 주입 경로 없음)
  why_note      TEXT,                    -- "왜 이렇게 쓰나" 좌측 패널 각주
  version       TEXT NOT NULL DEFAULT 'v1',
  UNIQUE(form_code, field_key)
);

CREATE TABLE obligation_reset_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reset_at       TEXT NOT NULL DEFAULT (datetime('now')),
  reset_by       TEXT,                          -- 실행자(활성 사용자 이름)
  affected_count INTEGER NOT NULL DEFAULT 0      -- 도래일이 재설정된 활성 의무 수
);

CREATE TABLE process_master (
  proc_code      TEXT PRIMARY KEY,              -- C10, P10, K10 …
  proc_name      TEXT NOT NULL,                 -- 절단, 포밍, 코킹 …
  proc_type      TEXT NOT NULL DEFAULT '사내' CHECK (proc_type IN ('사내','외주')),
  insp_form_code TEXT,                          -- 공정↔검사양식 연계 (forms.code 느슨)
  active         INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  source         TEXT,                          -- '2021' | 'manual' | …
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE item_master (
  item_code   TEXT PRIMARY KEY,                 -- 28235-2B740 / 28235-2B740-K1 / STKM11A-0845-07
  item_name   TEXT,
  item_type   TEXT NOT NULL DEFAULT '완제품/조립' CHECK (item_type IN ('원자재/기타','반제품','완제품/조립')),
  spec        TEXT,                             -- 규격
  cust_pno1   TEXT, cust_pno2 TEXT, cust_pno3 TEXT,  -- 고객품번 ≤3 (pop_item CUST_PNO 계약)
  car_type    TEXT,                             -- 차종
  trace_gbn   INTEGER NOT NULL DEFAULT 0,       -- LOT 추적 opt-in (품목별, pop_item.TRACE_GBN)
  inlotuse    INTEGER NOT NULL DEFAULT 0,       -- 입고 시 업체LOT→내부LOT 승계 (INLOTUSE)
  insp_skip   INTEGER NOT NULL DEFAULT 0,       -- 수입검사 생략 (INSP_SKIP)
  qc_gbn_o    TEXT,                             -- 출하검사 구분 (QC_GBN_O)
  out_yn      INTEGER NOT NULL DEFAULT 0,       -- 외주 품목 (OUT_YN)
  active      INTEGER NOT NULL DEFAULT 1,
  source      TEXT,                             -- '2021' | 'popbom' | 'manual'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE bom_edge (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_code  TEXT NOT NULL,                   -- item_master 느슨 참조
  child_code   TEXT NOT NULL,
  qty          REAL NOT NULL DEFAULT 1,
  active       INTEGER NOT NULL DEFAULT 1,      -- 파이프라인이 소멸 간선을 0으로 (삭제 금지)
  source       TEXT,                            -- '2021' | 'popbom' | 'manual'
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (parent_code, child_code)
);

CREATE TABLE routing_step (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code  TEXT NOT NULL,
  seq        INTEGER NOT NULL,                  -- 10, 20, 30 …
  proc_code  TEXT NOT NULL,                     -- process_master 느슨 참조 ('0'=입고/무공정)
  out_yn     INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, seq, proc_code)
);

CREATE TABLE partner (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code TEXT UNIQUE,                     -- POP_CUST.CUST_NO 등
  name         TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT '기타' CHECK (partner_type IN ('고객','외주처','자재공급처','기타')),
  biz_no       TEXT,
  ceo          TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE defect_type (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,              -- mes_codes ROUTEBAD 계열 호환
  name       TEXT NOT NULL,
  proc_code  TEXT,                              -- 공정별 불량이면 지정
  active     INTEGER NOT NULL DEFAULT 1,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE work_order (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no   TEXT NOT NULL UNIQUE,              -- WO-YYMMDD-nn (핸들러 발번)
  item_code  TEXT NOT NULL,
  order_qty  REAL,
  line_no    TEXT,
  start_date TEXT,                              -- YYYY-MM-DD
  end_date   TEXT,
  status     TEXT NOT NULL DEFAULT '대기' CHECK (status IN ('대기','진행','완료','취소')),
  batch_id   TEXT,                              -- 월 단위 일괄 등록 묶음 (VOC ③)
  note       TEXT,
  created_by TEXT,                              -- 세션 강제(STAMP)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, status_by TEXT, status_at TEXT);

CREATE TABLE prod_record (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date   TEXT NOT NULL,                  -- YYYY-MM-DD
  work_order_id INTEGER REFERENCES work_order(id),
  seq           INTEGER NOT NULL DEFAULT 1,     -- 일자+지시 내 순번 (pop_sil 계약)
  item_code     TEXT NOT NULL,
  lot_no        TEXT,                           -- lot_registry 느슨 참조
  line_no       TEXT,
  ok_qty        INTEGER NOT NULL DEFAULT 0,
  ng_qty        INTEGER NOT NULL DEFAULT 0,
  defect_code   TEXT,                           -- defect_type 느슨 참조 (ng_qty>0 시)
  shift         TEXT,                           -- 주/야
  start_time    TEXT,                           -- ISO
  end_time      TEXT,
  worker        TEXT,                           -- 세션 강제(STAMP) — defaultAuthor 폴백 금지
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, canceled_at TEXT, cancel_reason TEXT, canceled_by TEXT);

CREATE TABLE mat_receipt (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_date TEXT NOT NULL,
  item_code    TEXT NOT NULL,                   -- 원자재 품목
  vendor_lot   TEXT,                            -- 업체(밀시트) LOT
  internal_lot TEXT,                            -- 내부 LOT (INLOTUSE 승계 시 = vendor_lot)
  partner_code TEXT,                            -- 자재공급처
  qty          REAL,
  cert_no      TEXT,                            -- 성적서/밀시트 번호
  note         TEXT,
  created_by   TEXT,                            -- 세션 강제(STAMP)
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
, capture_id INTEGER REFERENCES raw_captures(id), receipt_class TEXT, canceled_at TEXT, cancel_reason TEXT, canceled_by TEXT);

CREATE TABLE mat_input (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  input_date   TEXT NOT NULL,
  prod_lot_no  TEXT NOT NULL,                   -- 생산 LOT
  material_lot TEXT NOT NULL,                   -- 투입 자재 LOT (mat_receipt.internal_lot)
  item_code    TEXT,                            -- 자재 품목
  qty          REAL,
  created_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE insp_record (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  insp_date   TEXT NOT NULL,
  insp_kind   TEXT NOT NULL CHECK (insp_kind IN ('수입','공정','자주','패트롤','출하')),
  item_code   TEXT NOT NULL,
  lot_no      TEXT,
  proc_code   TEXT,
  inspector   TEXT,                             -- 세션 강제(STAMP)
  judgment    TEXT,                             -- 합격/불합격/보류
  defect_code TEXT,                             -- defect_type 느슨 참조
  defect_qty  INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
, spec_revision INTEGER, sample_phase TEXT CHECK (sample_phase IN ('초품','중품','종품')), confirmer TEXT, confirmed_at TEXT, canceled_at TEXT, cancel_reason TEXT, canceled_by TEXT);

CREATE TABLE insp_record_value (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id  INTEGER NOT NULL REFERENCES insp_record(id),
  spec_id    INTEGER,                           -- insp_spec 느슨 참조
  insp_item  TEXT,
  sample_no  INTEGER NOT NULL DEFAULT 1,        -- 시료 번호 (tspmes SUBSEQ 계약)
  value      REAL,
  value_text TEXT,                              -- 비수치 판정값
  judgment   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lot_registry (
  lot_no     TEXT PRIMARY KEY,
  item_code  TEXT NOT NULL,
  lot_date   TEXT NOT NULL,                     -- YYYY-MM-DD
  seq        INTEGER NOT NULL,                  -- 당일 차수
  source     TEXT NOT NULL DEFAULT '자체발번' CHECK (source IN ('자체발번','업체승계','tspmes')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, lot_date, seq)
);

CREATE TABLE bom_import_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at      TEXT NOT NULL DEFAULT (datetime('now')),
  source      TEXT NOT NULL,                    -- 'popbom-csv' | '2021-seed' | …
  file_name   TEXT,
  added       INTEGER NOT NULL DEFAULT 0,       -- 신규 간선
  updated     INTEGER NOT NULL DEFAULT 0,       -- 수량 등 변경
  deactivated INTEGER NOT NULL DEFAULT 0,       -- 소멸 간선(active=0)
  unchanged   INTEGER NOT NULL DEFAULT 0,
  items_new   INTEGER NOT NULL DEFAULT 0,       -- 신규 품목
  note        TEXT
);

CREATE TABLE obligation_triggers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_kind TEXT NOT NULL CHECK (trigger_kind IN ('insp_due','mold_count','nonconform','audit_gap')),
  title        TEXT NOT NULL,
  entity_kind  TEXT,                            -- 'item' | 'mold' | 'proc' …
  entity_key   TEXT,                            -- 대상 엔티티 키 (품번·금형코드 등, NULL=전체
  config_json  TEXT,                            -- 임계값·주기 등 트리거별 설정
  team         TEXT,                            -- 배정 기본 = 팀 (개인 자동 지정 금지, §3-4)
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE obligation_trigger_issues (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id    INTEGER NOT NULL REFERENCES obligation_triggers(id),
  entity_key    TEXT NOT NULL,
  due_bucket    TEXT NOT NULL,                  -- 기한 버킷 (YYYY-MM-DD 또는 주기 키)
  status        TEXT NOT NULL DEFAULT '발행' CHECK (status IN ('발행','해소표시','완료','취소')),
  issued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_mark_at TEXT,                        -- 데이터 해소 "표시만" — 자동 완료 금지 (§3-2)
  completed_at  TEXT,
  completed_by  TEXT,                           -- ✓는 사람만 (세션 강제)
  canceled_at   TEXT,
  cancel_reason TEXT,                           -- 취소 로그 필수 (§3-3)
  UNIQUE (trigger_id, entity_key, due_bucket)
);

CREATE TABLE form_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code TEXT NOT NULL,
  changed_on TEXT NOT NULL,          -- 변경일(YYYY-MM-DD)
  change_type TEXT NOT NULL,         -- rename | template_adopt | template_correct | ...
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  migration TEXT                     -- 적용 마이그레이션(추적)
);

CREATE TABLE pack_forms (
  pack_code    TEXT NOT NULL,                -- 'sq-minimal' 등
  form_code    TEXT NOT NULL,                -- forms.code 느슨 참조
  sq_item_code TEXT NOT NULL DEFAULT '',     -- sq_guide_items.item_code 역산 근거('2_7' 등, 없으면 '')
  required     INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0, iatf_clause TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (pack_code, form_code, sq_item_code)
);

CREATE TABLE "insp_spec" (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code  TEXT NOT NULL,
  insp_kind  TEXT NOT NULL CHECK (insp_kind IN ('수입','공정','자주','패트롤','출하')),
  insp_item  TEXT NOT NULL,                     -- 검사항목명
  instrument TEXT,                              -- 측정기
  unit       TEXT,
  su REAL, sl REAL,                             -- 규격 상/하한
  mu REAL, ml REAL,                             -- 관리 상/하한
  nominal    REAL,                              -- 표준값
  sample_cnt INTEGER,                           -- 시료수
  revision   INTEGER NOT NULL DEFAULT 0,        -- 개정 번호 (개정 = 신규 행 — UPDATE 금지)
  rev_date   TEXT,                              -- REVISION 일자 각인(3차 노트 §4-1)
  active     INTEGER NOT NULL DEFAULT 1,        -- 최신판 = active 1, 구판 = 0 (불변 보존)
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), created_by TEXT,
  UNIQUE (item_code, insp_kind, insp_item, revision)
);

CREATE TABLE work_calendar (
  ymd         TEXT PRIMARY KEY,                        -- YYYY-MM-DD (KST 축)
  work_type   TEXT NOT NULL CHECK (work_type IN ('조업', '휴무')),
  note        TEXT,                                    -- 휴무 사유·특근 메모 등(자유)
  updated_by  TEXT,                                    -- 세션 강제(STAMP)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE equipment_master (
  equip_code   TEXT PRIMARY KEY,                -- 설비코드(사람 채번)
  name         TEXT NOT NULL,                   -- 설비명
  equip_type   TEXT,                            -- 유형(프레스·사출 등 — 자유)
  line_no      TEXT,                            -- MES 라인/워크센터 연결(선택 — 관측치 참조)
  location     TEXT,                            -- 위치
  install_date TEXT,                            -- 설치일(YYYY-MM-DD)
  note         TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  updated_by   TEXT,                            -- 정비 주체(STAMP)
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE mold_master (
  mold_code       TEXT PRIMARY KEY,             -- 금형코드(사람 채번)
  name            TEXT NOT NULL,                -- 금형명
  item_code       TEXT,                         -- 연결 품번(타발수 연동 축 — 품목 마스터 실존 강제는 채널)
  cavity          INTEGER,                      -- 캐비티 수(미기입 = 타발수 산출 불가 '—')
  guarantee_shots INTEGER,                      -- 보증 타발수(미기입 = 잔여 수명 '—')
  location        TEXT,                         -- 보관 위치
  install_date    TEXT,
  note            TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  updated_by      TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE screen_permission (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('team','user')),
  -- team: app_users.team_dept 문자열(부서 = 권한그룹) | user: app_users.id (개인 오버라이드)
  subject_key  TEXT NOT NULL,
  page_id      TEXT NOT NULL,               -- uiStore PageId ('work-order' 등)
  can_read     INTEGER NOT NULL DEFAULT 1 CHECK(can_read   IN (0,1)),
  can_write    INTEGER NOT NULL DEFAULT 0 CHECK(can_write  IN (0,1)),
  can_edit     INTEGER NOT NULL DEFAULT 0 CHECK(can_edit   IN (0,1)),
  can_delete   INTEGER NOT NULL DEFAULT 0 CHECK(can_delete IN (0,1)),
  can_excel    INTEGER NOT NULL DEFAULT 0 CHECK(can_excel  IN (0,1)),
  can_print    INTEGER NOT NULL DEFAULT 0 CHECK(can_print  IN (0,1)),
  -- 단가 — 37호 ③ 전원 잠금: 1 은 스키마가 거부(자리만 확보). 개방 = 후속 마이그.
  can_price    INTEGER NOT NULL DEFAULT 0 CHECK(can_price = 0),
  updated_by   TEXT,                        -- 세션 강제(STAMP)
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subject_kind, subject_key, page_id)
);

CREATE INDEX idx_clauses_parent ON clauses(parent_id);

CREATE INDEX idx_documents_clause ON documents(clause_id);

CREATE INDEX idx_tasks_clause ON tasks(clause_id);

CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

CREATE INDEX idx_tasks_team ON tasks(team_id);

CREATE INDEX idx_tasks_status ON tasks(status);

CREATE INDEX idx_tasks_deadline ON tasks(deadline);

CREATE INDEX idx_task_history_task ON task_pdca_history(task_id);

CREATE INDEX idx_findings_audit ON findings(audit_id);

CREATE INDEX idx_findings_clause ON findings(clause_id);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

CREATE INDEX idx_documents_team ON documents(team_id);

CREATE INDEX idx_documents_code ON documents(doc_code);

CREATE INDEX idx_regsec_code ON regulation_sections(reg_code);

CREATE INDEX idx_field_form ON form_fields(form_code, sort_order);

CREATE INDEX idx_sub_form ON form_submissions(form_code, updated_at DESC);

CREATE INDEX idx_page_proc ON process_pages(process_code, page_no);

CREATE INDEX idx_pf_proc ON process_forms(process_code, sort_order);

CREATE INDEX idx_bomdoc_cat ON bom_documents(category, sort_order);

CREATE INDEX idx_bomdoc_status ON bom_documents(status);

CREATE INDEX idx_bomref_doc ON bom_form_refs(doc_no_norm, sort_order);

CREATE INDEX idx_bomref_formno ON bom_form_refs(form_no_norm);

CREATE INDEX idx_form_scores_form ON form_scores(form_code);

CREATE INDEX idx_form_scores_submission ON form_scores(submission_id);

CREATE INDEX idx_form_scores_scored_at ON form_scores(scored_at);

CREATE INDEX idx_schedule_status ON schedule_items(status, sort_order);

CREATE INDEX idx_schedule_due ON schedule_items(due_date);

CREATE INDEX idx_sqitem_cat ON sq_items(category_id, sort_order);

CREATE INDEX idx_sqregmap_reg ON sq_reg_map(reg_code);

CREATE INDEX idx_sqitemdoc_item ON sq_item_docs(item_code);

CREATE INDEX idx_sqitemft_item ON sq_item_form_types(item_code);

CREATE INDEX idx_cases_status ON cases(status, due_date);

CREATE INDEX idx_screening_case ON case_screening(case_id);

CREATE INDEX idx_sub_case ON form_submissions(case_id);

CREATE INDEX idx_proc_rev ON process_revisions(process_code, sort_order);

CREATE INDEX idx_form_cell_map_form ON form_cell_map(form_code);

CREATE INDEX idx_rev_submission
  ON form_submission_revisions(submission_id, rev_no DESC);

CREATE INDEX idx_ai_drafts_status ON ai_drafts(status, created_at DESC);

CREATE INDEX idx_ai_drafts_target ON ai_drafts(target_kind, target_key);

CREATE INDEX idx_ai_actions_ts ON ai_actions(ts DESC);

CREATE INDEX idx_ai_actions_draft ON ai_actions(draft_id);

CREATE INDEX idx_kb_chunks_ref ON kb_chunks(kind, ref_key);

CREATE INDEX idx_raw_captures_status ON raw_captures(status, created_at DESC);

CREATE INDEX idx_isir_part ON isir_packages(part_no);

CREATE INDEX idx_isir_doc_pkg ON isir_documents(isir_id);

CREATE INDEX idx_cp_isir ON control_plan_items(isir_id);

CREATE UNIQUE INDEX idx_isir_pkg_natkey ON isir_packages(part_no, rev_code);

CREATE INDEX idx_obligation_due ON recurring_obligations(active, next_due_date);

CREATE INDEX idx_obligation_cadence ON recurring_obligations(cadence, sort_order);

CREATE INDEX idx_ppap_elem_sub ON ppap_elements(submission_id, seq);

CREATE INDEX idx_fmea_row_doc ON fmea_rows(doc_id, seq);

CREATE INDEX idx_msa_result ON msa_studies(result, sort_order);

CREATE INDEX idx_apqp_elem_phase ON apqp_elements(phase_id, seq);

CREATE INDEX idx_apqp_elem_status ON apqp_elements(status);

CREATE INDEX idx_form_approvals_submission ON form_approvals(submission_id);

CREATE INDEX idx_oblig_comp_date ON obligation_completions(done_date);

CREATE INDEX idx_oblig_comp_ob ON obligation_completions(obligation_id, done_date);

CREATE INDEX idx_sq_guides_item ON sq_guides(item_code, section, sort_order);

CREATE INDEX idx_sq_checkpoints_item ON sq_checkpoints(item_code);

CREATE INDEX idx_kpi_meas ON kpi_measurements(indicator_id, period);

CREATE INDEX idx_sqtrack_items_part ON sqtrack_items(part_no, phase, seq);

CREATE INDEX idx_mes_files_date ON mes_import_files(drop_date, record_type);

CREATE INDEX idx_mes_records_date ON mes_records(record_date, record_type, part_no);

CREATE INDEX idx_mes_records_proc ON mes_records(part_no, process, record_date);

CREATE INDEX idx_mes_codes_group ON mes_codes(main_code, use_gbn);

CREATE INDEX idx_item_master_type ON item_master(item_type, active);

CREATE INDEX idx_bom_edge_parent ON bom_edge(parent_code, active);

CREATE INDEX idx_bom_edge_child ON bom_edge(child_code, active);

CREATE INDEX idx_routing_item ON routing_step(item_code, active, seq);

CREATE INDEX idx_work_order_status ON work_order(status, start_date);

CREATE INDEX idx_prod_record_date ON prod_record(record_date);

CREATE INDEX idx_prod_record_lot ON prod_record(lot_no);

CREATE INDEX idx_mat_receipt_lot ON mat_receipt(internal_lot);

CREATE INDEX idx_mat_input_prodlot ON mat_input(prod_lot_no);

CREATE INDEX idx_mat_input_matlot ON mat_input(material_lot);

CREATE INDEX idx_insp_record_lot ON insp_record(lot_no);

CREATE INDEX idx_insp_record_item ON insp_record(item_code, insp_date);

CREATE INDEX idx_insp_value_record ON insp_record_value(record_id);

CREATE INDEX idx_mat_receipt_capture ON mat_receipt(capture_id);

CREATE UNIQUE INDEX idx_form_submissions_serial_unique
  ON form_submissions(form_code, serial_no)
  WHERE serial_no IS NOT NULL AND serial_no <> '';

CREATE INDEX idx_pack_forms_pack ON pack_forms(pack_code, form_code);

CREATE INDEX idx_insp_spec_item ON insp_spec(item_code, insp_kind, active);

CREATE INDEX idx_work_calendar_month ON work_calendar (substr(ymd, 1, 7));

CREATE INDEX idx_mold_master_item ON mold_master (item_code);

CREATE INDEX idx_screen_permission_page ON screen_permission(page_id);
