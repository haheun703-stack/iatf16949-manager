-- ============================================================
-- Migration 0017: 프로세스 문서 구조화(표지 + 개정이력)
--
-- 캡쳐 이미지가 아니라 "데이터"로 프로세스 문서의 표지/개정이력/결재를 보관.
-- → 개정 추가 = 행 추가(재캡쳐 불필요). AI 비전 추출 결과를 여기에 저장.
-- 흐름도 그림은 기존 process_pages(이미지) 유지.
-- ============================================================

CREATE TABLE IF NOT EXISTS process_doc (
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

CREATE TABLE IF NOT EXISTS process_revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  process_code TEXT NOT NULL,
  rev_no       TEXT,
  rev_date     TEXT,
  reason       TEXT,
  author       TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (process_code) REFERENCES processes(code)
);
CREATE INDEX IF NOT EXISTS idx_proc_rev ON process_revisions(process_code, sort_order);
