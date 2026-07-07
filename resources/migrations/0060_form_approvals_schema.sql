-- ============================================================
-- Migration 0060: form_approvals 스키마 씨앗
--   [스키마 전용 마이그레이션 — 데이터 없음]
--
-- 제품화 로드맵 '지금 미리' ⓕ(7/6 감사): 결재 sign-off 상태머신의 저장 구조를
--   미리 확보해 두는 씨앗. UI/IPC 는 아직 미구현 — 향후 다중사용자+PIN 결재
--   도입 시 이 테이블을 사용(그때 스키마 재구성/데이터 이관을 피하기 위함).
-- forms.approvals_json(결재란 라벨 ["담당","팀장","사업부장"])과 대응:
--   작성본(form_submissions) 하나에 결재 단계별 행이 쌓이는 구조.
-- ============================================================

CREATE TABLE IF NOT EXISTS form_approvals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  step          INTEGER NOT NULL DEFAULT 1,       -- 결재 순번(1=담당 → 2=팀장 → 3=사업부장 …)
  role          TEXT,                             -- 결재란 라벨(forms.approvals_json 과 대응)
  approver      TEXT,                             -- 결재자(로그인 도입 전 = 이름 문자열)
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  acted_at      TEXT,                             -- 처리 시각(ISO8601)
  note          TEXT                              -- 반려 사유 등
);

CREATE INDEX IF NOT EXISTS idx_form_approvals_submission ON form_approvals(submission_id);
