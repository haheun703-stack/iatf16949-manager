-- ============================================================
-- Migration 0086: 도래일 일괄 재설정(실사용 개시) 실행 이력 (2026-07-21)
-- [스키마 추가] [TPC팩 후보]
--
-- 12번 지시서 코워크 §0.7 추가건 ④: '가동 개시일 재설정' 유틸의 실행 이력.
-- 어느 회사든 이 프로그램을 처음 켜는 날 도래일을 '오늘부터'로 맞춰야 함(판매 후 셋업 절차).
-- 데이터 조작이 아니라 실사용 개시일 설정 — 누가·언제·몇 건을 리셋했는지 정직하게 남긴다.
-- 실제 리셋 동작(recurring_obligations.next_due_date/anchor_date=오늘)은 IPC(OBLIGATION_RESET_DUE).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================
CREATE TABLE IF NOT EXISTS obligation_reset_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reset_at       TEXT NOT NULL DEFAULT (datetime('now')),
  reset_by       TEXT,                          -- 실행자(활성 사용자 이름)
  affected_count INTEGER NOT NULL DEFAULT 0      -- 도래일이 재설정된 활성 의무 수
);
