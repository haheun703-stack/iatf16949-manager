-- ============================================================
-- Migration 0099: defaultAuthor stub '홍길동' 제거 (2026-07-23) — 사장님 실사용 피드백
-- [데이터 정리] — 작성자 자동채움 방침(0097)의 마무리.
--
-- company_profile.defaultAuthor='홍길동'(seed stub)이 작성자 auto 필드·엑셀 출력 폴백에 주입돼
-- 서류상 작성자에 가짜 이름이 박히던 문제. 0097 로 meta default 폴백은 제거했으나 stub 값 자체가
-- DB 에 남아 export 폴백(form-handlers FORM_EXPORT_XLSX: created_by || defaultAuthor)에서 재유출 소지.
-- → stub 을 빈값으로. 작성자는 활성 사용자(§4·created_by), 미선택/미기록이면 빈칸("가짜보다 빈칸").
--
-- 기존 작성본(form_submissions)의 과거 작성자 값은 기록 보존 원칙상 건드리지 않는다(이력 불변).
-- 멱등: value='홍길동' 조건(재적용 0행). BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

UPDATE company_profile SET value='' WHERE key='defaultAuthor' AND value='홍길동';
