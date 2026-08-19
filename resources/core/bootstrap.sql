-- ============================================================
-- resources/core/bootstrap.sql — 클린 설치 코어 부트스트랩 데이터 (39호 S2, 2026-08-19)
--
-- 러너(server/migrate-core.cjs)가 스키마 스냅샷 직후 같은 트랜잭션에서 1회 실행한다.
-- 내용 = 모든 설치가 공통으로 필요한 최소 행 — 회사 프로파일 키(빈 값). 실명·회사명·실주소 금지.
-- seed.ts(일렉트론)의 profileDefaults 16키와 동형(INSERT OR IGNORE — 먼저 쓴 쪽이 이김). 웹 서버 경로는
-- seed.ts 를 타지 않으므로 이 파일이 프로파일 키의 유일 공급원이다.
-- ============================================================
INSERT OR IGNORE INTO company_profile (key, value) VALUES
  ('companyName', ''),
  ('ceoName', ''),
  ('address', ''),
  ('phone', ''),
  ('fax', ''),
  ('factoryName', ''),
  ('companyNameEn', ''),
  ('companyNameShort', ''),
  ('divisionLabel', ''),
  ('processes', ''),
  ('products', ''),
  ('plant', ''),
  ('revisionNumber', 'REV.8'),
  ('revisionDate', date('now')),
  ('defaultAuthor', ''),
  ('auditDate', date('now', '+180 day'));
