-- ============================================================
-- Migration 0100: app_users 로그인 컬럼 추가 (2026-07-24) — 웹전환 W3
-- [스키마] — 로그인·권한(사내 서버형). 마이그 체인 이어서(리셋 금지).
--
-- app_users 는 0085 에서 생성(id·name·team_dept·role·active·sort_order). role(member/manager/
-- executive)은 이미 존재+17명 시드 완료(§0.5 대조) → 로그인은 아래 2컬럼만 추가하면 된다.
--   · password_hash : bcrypt 해시(서버에서만 생성/검증). NULL = 비번 미설정(최초 로그인 시 설정 유도).
--   · must_change_pw: 최초/재설정 후 비번 변경 강제 플래그(기본 1). 변경 완료 시 0.
--
-- ⚠️ 초기 비밀번호 일괄 발급(실제 값)은 사장님 정책 결정 후 별도 — 이 마이그는 컬럼만 만든다.
--   로컬 검증용 임시 비번은 scripts/seed-local-passwords.mjs 로 세팅(로컬 전용, 배포본 미포함).
-- 멱등: ALTER ADD COLUMN 은 SQLite 에서 존재 시 에러 → 컬럼 존재 검사 후 조건 실행이 불가하므로
--   migrate.ts 의 per-마이그 트랜잭션(1회 적용 후 _migrations 기록)으로 재실행 안 됨을 보장한다.
-- ============================================================

ALTER TABLE app_users ADD COLUMN password_hash TEXT;
ALTER TABLE app_users ADD COLUMN must_change_pw INTEGER NOT NULL DEFAULT 1;
