-- 0035_form_submission_revisions.sql
-- (g) 신뢰성 레이어 — 개정관리. 작성본 저장 시점의 values_json 스냅샷을 개정으로 적재.
-- IATF 문서관리: 개정 이력(변경사유·작성자·일시·당시 상태)을 추적. 기존 values_json 덮어쓰기의 공백 해소.
-- migrate.ts 가 db.transaction() 으로 감싸므로 BEGIN/COMMIT 없음.
CREATE TABLE IF NOT EXISTS form_submission_revisions (
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

CREATE INDEX IF NOT EXISTS idx_rev_submission
  ON form_submission_revisions(submission_id, rev_no DESC);
