-- ============================================================
-- Migration 0007: AI 작성가이드 + AI 채점 결과
--
-- Stage 2 of v5: 양식별 AI 작성 가이드(캐시) + IATF 16949 기준 AI 채점 결과 저장
-- Idempotent: IF NOT EXISTS only (데이터 보존)
-- ============================================================

-- 양식별 AI 작성 가이드 (양식당 1건, 재생성 시 덮어씀)
CREATE TABLE IF NOT EXISTS form_guides (
  form_code     TEXT PRIMARY KEY,
  guide_json    TEXT NOT NULL,        -- { purpose, mustInclude[], auditPoints[], commonFindings[], tips[] }
  provider      TEXT,
  model         TEXT,
  generated_at  TEXT NOT NULL
);

-- AI 채점 결과 (양식/제출본별 이력 누적)
CREATE TABLE IF NOT EXISTS form_scores (
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
CREATE INDEX IF NOT EXISTS idx_form_scores_form ON form_scores(form_code);
CREATE INDEX IF NOT EXISTS idx_form_scores_submission ON form_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_scores_scored_at ON form_scores(scored_at);
