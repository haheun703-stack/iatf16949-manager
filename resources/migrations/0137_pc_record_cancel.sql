-- ============================================================
-- Migration 0137: PC 기록 쓰기 — append-only 정정(취소 마크) 컬럼 (2026-08-06)
-- [스키마 전용 마이그레이션 — 데이터/시드 없음]
--
-- 근거 = 29번 §4 "append-only 정정 규칙: 현장 기록 UPDATE 채널을 만들지 않는다.
-- 정정 = 사유 필수 취소 마크 + 재입력 — 종이 문법 '두 줄 긋고 정정 서명'의 전산 등가"
-- + PC 견적(dailyq-PC_기록쓰기_견적_260806.md). 취소 = 행 불변 + 마크만(삭제 금지).
-- mat_receipt 도 동일 규칙 편입(G1 태깅 정정 = 취소+재등록 — 검수요청 예고분).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 트랜잭션 래핑). ADD COLUMN 은 1회 적용.
-- ============================================================

ALTER TABLE prod_record ADD COLUMN canceled_at TEXT;
ALTER TABLE prod_record ADD COLUMN cancel_reason TEXT;   -- 취소 사유 필수(채널이 강제)
ALTER TABLE prod_record ADD COLUMN canceled_by TEXT;     -- 세션 강제(STAMP)

ALTER TABLE insp_record ADD COLUMN canceled_at TEXT;
ALTER TABLE insp_record ADD COLUMN cancel_reason TEXT;
ALTER TABLE insp_record ADD COLUMN canceled_by TEXT;

ALTER TABLE mat_receipt ADD COLUMN canceled_at TEXT;
ALTER TABLE mat_receipt ADD COLUMN cancel_reason TEXT;
ALTER TABLE mat_receipt ADD COLUMN canceled_by TEXT;
