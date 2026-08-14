-- ============================================================
-- Migration 0143: 비밀번호 재설정 감사 흔적 (8/13 전수 검수 C-1 곁가지) (2026-08-14)
-- [app_users 컬럼 2개 추가 — 데이터 변경 없음]
--
-- appUser:resetPassword 는 STAMP 도 감사 컬럼도 없어 "누가 누구 비번을 바꿨는지"
-- 흔적이 0 이었다(검수 C-1: 사장님 계정 비번을 바꿔도 무기록). 서버 디스패처가
-- 세션 주체(actorName)를 주입하고, 핸들러가 재설정 성공 시 여기 각인한다.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts / runServerMigrations 가 트랜잭션으로 감쌈).
-- ALTER ADD COLUMN 은 비멱등이나 _migrations 기록이 1회 적용을 보장한다.
-- ============================================================

ALTER TABLE app_users ADD COLUMN pw_reset_by TEXT;
ALTER TABLE app_users ADD COLUMN pw_reset_at TEXT;
