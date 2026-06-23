-- ============================================================
-- Migration 0015: 작성자 기본값(defaultAuthor) 갱신 — 하헌 → 홍길동
--
-- 양식/사건 작성자 자동주입 값(company_profile.defaultAuthor)을 갱신한다.
-- 로그인 도입 전 stub 값이며 1회성 데이터 갱신(이후 설정 UI에서 변경 가능).
-- seed.ts 의 신규 설치 기본값도 '홍길동' 으로 동기화됨.
-- (company_profile 행이 없으면 no-op → seed 가 신규 기본값으로 채움)
-- ============================================================

UPDATE company_profile SET value = '홍길동' WHERE key = 'defaultAuthor';
