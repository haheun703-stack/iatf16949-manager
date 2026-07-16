-- ============================================================
-- Migration 0063: 정기 의무 이행 이력 (관제탑 홈 — 포털 1단계)
--
-- recurring_obligations 는 last_done_date 1칸만 보존해 과거 이행 기록이
-- 남지 않음 → 관제탑 홈의 "주간 이행 추이"와 팀별 이행률 근거를 위해
-- 완료 이벤트를 행 단위로 적재. OBLIGATION_COMPLETE 시 INSERT.
-- source: manual=완료 버튼 / form=연결 양식 작성본 감지(자동 판정 표시용).
-- 과거 데이터는 없으므로 추이는 오늘부터 쌓인다(정직 — 소급 생성 금지).
-- ============================================================

CREATE TABLE IF NOT EXISTS obligation_completions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation_id INTEGER NOT NULL,
  done_date     TEXT NOT NULL,                       -- YYYY-MM-DD (이행일, 로컬)
  done_by       TEXT,                                -- 완료 처리자(선택)
  source        TEXT NOT NULL DEFAULT 'manual',      -- manual | form
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oblig_comp_date ON obligation_completions(done_date);
CREATE INDEX IF NOT EXISTS idx_oblig_comp_ob ON obligation_completions(obligation_id, done_date);
