-- ============================================================
-- Migration 0145: 설치 정체성 키 백필 — 레거시 DB = TPC 설치 (39호 S2, 2026-08-19)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] · packs.json kind = core(전 설치 적용, 멱등)
--
-- 러너(server/migrate-core.cjs)는 app_config 'install.packs' 로 tpc/standard 데이터 마이그의 적용·스킵을
-- 가른다. 이 키가 없는 이력 있는 DB(라이브·복사본·기존 설치)는 전부 TPC 설치이므로 'standard,tpc' 를
-- 영속화한다. 클린 설치는 러너가 스냅샷 직후 사용자 지정 팩을 먼저 써 두므로 OR IGNORE 가 덮지 않는다.
-- ============================================================
INSERT OR IGNORE INTO app_config (key, value) VALUES ('install.packs', 'standard,tpc');
