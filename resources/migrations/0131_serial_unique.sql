-- ============================================================
-- Migration 0131: 발행번호 유일성 백스톱 (2026-08-04)
--
-- 근거 = 검수 7/30 M-발행번호: serial_no 가 클라 미리보기 값 그대로 저장되고 UNIQUE 가
-- 없어 동시 사용자 2명이 같은 번호를 발행할 수 있었다(웹 다중 사용자 전환 이후 실위험).
--
-- 1차 방어 = form-handlers 가 충돌 시 서버 재채번(nextFormSerial). 이 인덱스는 최종 백스톱.
-- serial_no NULL/'' 는 미발행 초안이라 유일성 대상에서 제외(부분 인덱스).
-- 라이브 실측(8/4) = 중복 0건이라 안전 적용.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_serial_unique
  ON form_submissions(form_code, serial_no)
  WHERE serial_no IS NOT NULL AND serial_no <> '';
