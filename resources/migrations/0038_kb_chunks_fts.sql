-- 0038_kb_chunks_fts.sql
-- AI 레이어 Phase B — 지식 인덱스(FTS5 전문검색). 벡터 임베딩 보류, 한국어는 trigram 토크나이저.
-- kb_chunks = 읽기용 원본(안정키 ref_key), kb_fts = 검색 인덱스. reindex(src/main/ai/kb.ts)가 채움.
-- 우리 데이터(조항·SQ항목·양식정의·케이스·프로세스) 안에서만 근거 검색 → search_knowledge 도구가 사용.
-- migrate.ts 트랜잭션 래핑(BEGIN/COMMIT 없음).

CREATE TABLE IF NOT EXISTS kb_chunks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,        -- clause|sq_item|form_def|case|process
  ref_key    TEXT NOT NULL,        -- 안정키(reg_code/sq_item code/form code/case_no/process_code)
  title      TEXT,
  text       TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_ref ON kb_chunks(kind, ref_key);

-- 한국어 부분매칭을 위해 trigram. kind/ref_key 는 저장만(검색 X).
CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(
  kind UNINDEXED,
  ref_key UNINDEXED,
  title,
  text,
  tokenize = 'trigram'
);
