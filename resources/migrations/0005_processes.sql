-- ============================================================
-- Migration 0005: Processes (기본서) + Pages + Forms mapping
--
-- Purpose:
--   1. Store 9 process documents (CP-01~03, MP-01~03, SP-01~03)
--      as the "primary work units" — each represents a business
--      process that produces multiple form outputs.
--   2. Each process has 1..N pages (cover, flowchart 1, flowchart 2...)
--      stored as image files (path saved here, file in userData/process-images/)
--   3. Map each process to the forms it produces (M:N).
-- ============================================================

-- 1. Process master (9 processes)
CREATE TABLE IF NOT EXISTS processes (
  code        TEXT PRIMARY KEY,
  category    TEXT NOT NULL,           -- 'CP' | 'MP' | 'SP'
  name        TEXT NOT NULL,
  description TEXT,
  doc_no      TEXT,                    -- 'TPC-CP-01' 등
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- 2. Process pages (image-based, scanned/exported flowcharts)
CREATE TABLE IF NOT EXISTS process_pages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  page_no      INTEGER NOT NULL,        -- 1, 2, 3...
  page_label   TEXT,                    -- '표지', '흐름도 P/D', '흐름도 C/A' 등
  image_path   TEXT,                    -- 절대경로(or userData 기준 상대). NULL이면 미등록.
  created_at   TEXT,
  UNIQUE(process_code, page_no),
  FOREIGN KEY (process_code) REFERENCES processes(code)
);
CREATE INDEX IF NOT EXISTS idx_page_proc ON process_pages(process_code, page_no);

-- 3. Process ↔ Form mapping (M:N)
CREATE TABLE IF NOT EXISTS process_forms (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  form_code    TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(process_code, form_code),
  FOREIGN KEY (process_code) REFERENCES processes(code),
  FOREIGN KEY (form_code)    REFERENCES forms(code)
);
CREATE INDEX IF NOT EXISTS idx_pf_proc ON process_forms(process_code, sort_order);

-- ============================================================
-- SEED: 9 Processes
-- ============================================================
INSERT INTO processes (code, category, name, description, doc_no, sort_order) VALUES
('CP-01','CP','영업관리 프로세스','신규 개발/설계변경에 따른 접수부터 계약검토, 계약 및 계약변경 업무','TPC-CP-01',1),
('CP-02','CP','개발관리 프로세스','신제품 개발, 양산이관, 4M 변경 관리 업무','TPC-CP-02',2),
('CP-03','CP','생산관리 프로세스','생산 계획, 작업지시, 공정관리, 생산실적 업무','TPC-CP-03',3),
('MP-01','MP','경영관리 프로세스','경영방침, 품질목표, 경영검토, 조직관리 업무','TPC-MP-01',4),
('MP-02','MP','리스크관리 프로세스','SWOT 분석, 리스크/기회 평가 및 대응 업무','TPC-MP-02',5),
('MP-03','MP','인적자원관리 프로세스','채용, 교육훈련, 자격관리, 인사평가 업무','TPC-MP-03',6),
('SP-01','SP','구매관리 프로세스','외주처 등록/평가, 구매 발주, 수입검사 업무','TPC-SP-01',7),
('SP-02','SP','검사및시험 프로세스','수입/자주/순회/출하 검사, 측정장비 관리 업무','TPC-SP-02',8),
('SP-03','SP','지속적개선 프로세스','부적합/시정조치/예방조치, 내부심사, 개선 업무','TPC-SP-03',9);

-- ============================================================
-- SEED: Page placeholders for CP-01 (user will upload images)
-- 다른 프로세스는 사용자가 추가하면서 페이지 생성
-- ============================================================
INSERT INTO process_pages (process_code, page_no, page_label, image_path, created_at) VALUES
('CP-01', 1, '표지 / 개정이력 / 결재', NULL, datetime('now')),
('CP-01', 2, '업무 흐름도 (Plan-Do)',  NULL, datetime('now')),
('CP-01', 3, '업무 흐름도 (Check-Act)',NULL, datetime('now'));

-- ============================================================
-- SEED: Form mapping
-- SP-03 지속적개선 ← 우리가 이미 시드한 4개 양식
-- ============================================================
INSERT INTO process_forms (process_code, form_code, sort_order) VALUES
('SP-03', 'B1100-01', 1),
('SP-03', 'B1100-03', 2),
('SP-03', 'B2100-01', 3),
('SP-03', 'A5100-02', 4);
