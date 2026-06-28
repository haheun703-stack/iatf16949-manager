-- 0040_isir_spine.sql
-- ISIR/관리계획서(Control Plan) 척추 — 부품 단위 통제 모델.
-- 도메인: ISIR 서류 = 고객과 "이렇게 관리하겠다" 협의한 문서묶음(근간). SQ 공정감사가 이걸로 진행.
--   parts(품번) → isir_packages(부품×사양 제출본) → isir_documents(26종 제출 체크리스트)
--                                                 + control_plan_items(관리계획서 을 라인아이템=심장)
-- 비파괴: 기존 SQ/forms 미변경. part_no/reg(J-1102)로 느슨히 연결. migrate.ts 트랜잭션 래핑(BEGIN 없음).

-- 품번 레지스트리 — "품번 통합 뷰"의 앵커(ISIR·정기검사·불량 이력을 한 품번으로 모음).
CREATE TABLE IF NOT EXISTS parts (
  part_no    TEXT PRIMARY KEY,                  -- 28237-2MAA1
  part_name  TEXT,                              -- PIPE ASSY B-T/C WATER,OUT
  customer   TEXT,                              -- 현대위아 / 삼보모터스(폴더 귀속 고객)
  model      TEXT,                              -- 감마2-ENG (차종)
  plant      TEXT,                              -- 2공장
  created_at TEXT
);

-- ISIR 제출본 — 부품 × 사양(개정). 한 부품에 사양별로 여러 제출본이 쌓임.
CREATE TABLE IF NOT EXISTS isir_packages (
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

CREATE INDEX IF NOT EXISTS idx_isir_part ON isir_packages(part_no);

-- 26종 제출 체크리스트(표지) — 제출유형별 필수(○=1) 매트릭스 + 실제 보유(present).
-- F1 ISIR 부재감지의 expected-set: submit_type 기준 필수인데 present=0 = 누락.
CREATE TABLE IF NOT EXISTS isir_documents (
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

CREATE INDEX IF NOT EXISTS idx_isir_doc_pkg ON isir_documents(isir_id);

-- 관리계획서(을) 라인아이템 = 통제의 심장. 한 행 = 1개 관리항목.
--   공정 × 관리항목(특성) × 규격 × 확인방법 × 주기 × 관리방안 × 분담 × 조치.
--   SQ 공정감사가 점검하는 대상 그 자체.
CREATE TABLE IF NOT EXISTS control_plan_items (
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

CREATE INDEX IF NOT EXISTS idx_cp_isir ON control_plan_items(isir_id);
