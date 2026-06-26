-- 0037_ai_drafts_actions.sql
-- AI 레이어 Phase A2 — draft→결재 척추 + 감사 추적.
-- 헌법: AI는 공식 테이블(form_submissions/cases 등)에 직접 쓰지 않고 ai_drafts 에 '제안'만 한다.
--       사람이 결재(approve)해야 트랜잭션으로 공식 테이블에 반영된다. 모든 행위는 ai_actions 에 남는다.
-- pack 스코핑 없음(단일사 내부툴). migrate.ts 트랜잭션 래핑(BEGIN/COMMIT 없음).

CREATE TABLE IF NOT EXISTS ai_drafts (
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

CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_drafts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_target ON ai_drafts(target_kind, target_key);

CREATE TABLE IF NOT EXISTS ai_actions (
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

CREATE INDEX IF NOT EXISTS idx_ai_actions_ts ON ai_actions(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_draft ON ai_actions(draft_id);
