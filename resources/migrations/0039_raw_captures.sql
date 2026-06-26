-- 0039_raw_captures.sql
-- AI 레이어 Phase D — 캡처 인박스. "서류 말고 일을 캡처하라"(시크릿 #1).
-- 사용자가 자유 메모/붙여넣기를 던지면 raw_captures 에 저장 → AI가 구조화해 ai_drafts 초안 제안.
-- migrate.ts 트랜잭션 래핑(BEGIN/COMMIT 없음).

CREATE TABLE IF NOT EXISTS raw_captures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL DEFAULT 'memo',   -- memo|paste|photo(후속)
  content       TEXT NOT NULL,                   -- 원문(메모/붙여넣기 텍스트)
  attached_path TEXT,                            -- 첨부(후속)
  form_code     TEXT,                            -- 대상 양식(있으면)
  status        TEXT NOT NULL DEFAULT 'new',     -- new|drafted|done
  created_by    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_captures_status ON raw_captures(status, created_at DESC);
