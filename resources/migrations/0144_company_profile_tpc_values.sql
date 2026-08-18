-- ============================================================
-- Migration 0144: 회사 프로파일 TPC 값 백필 (2026-08-18)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 39호 S1(회사 프로파일 외부화): 코드 하드코딩 10곳이 company_profile 을 읽도록
-- 배선되고, 시드(seed.ts)의 회사 문자열은 중립화된다. 따라서 라이브와 현행
-- 설치본의 TPC 값은 이 파일이 공급한다(마이그레이션이 시드보다 먼저 — 0046 참조).
--
-- S2(신규 설치 경로 분기)에서 이 파일이 [TPC팩 후보] 태그로 스킵되면
-- 판매판 클린 설치는 시드 중립값('')으로 수렴한다 — 코드 수정 불요.
--
-- 멱등: ON CONFLICT DO NOTHING — 기존 설치본의 사용자 편집값 불가침.
-- (BEGIN/COMMIT 없음 — migrate.ts / runServerMigrations 가 트랜잭션으로 감쌈)
-- ============================================================

INSERT INTO company_profile (key, value) VALUES
  ('companyName',      '주식회사 티피씨'),
  ('factoryName',      '2공장 AM사업부'),
  ('companyNameEn',    'TPC'),
  ('companyNameShort', '티피씨'),
  ('divisionLabel',    'AM사업부'),
  ('processes',        '인발/가공/조립/검사/포장'),
  ('products',         '인발, 자동차용 방진고무 INNER/OUTER PIPE류, 필라넥, 워터파이프, 쇼바파이프'),
  ('plant',            '2공장')
ON CONFLICT(key) DO NOTHING;
