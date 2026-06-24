-- ============================================================
-- Migration 0024: forms.scope 를 사업부 라벨로 전환 — 공통/조관/인발/필라넥/AM/쇼바
--
-- 0023의 binary scope('common'/'division')는 "겹침/별개"만 구분 → 어느 사업부인지 표현 못 함.
-- 사장님 피드백: 배지를 실제 사업부 명칭으로, 공통은 '공통'으로 표시.
-- TPC 사업부(공장): 1공장=인발·쇼바 / 2공장=조관·AM / 3공장=쇼바.
--   → scope 값 도메인을 {'공통','조관','인발','필라넥','AM','쇼바'} 로 재정의(컬럼 재활용).
--
-- 기존값 정리: 'common'/'division'/NULL → '공통'. (binary 시절 임시 분류는 리셋, picker로 재지정)
-- 자동 감지: 양식명에 사업부 표식이 박힌 4건만 시드(나머지 214건은 표식 없는 공통 QMS 양식 →
--   '공통' 유지, UI picker 로 사장님이 직접 지정).
-- ============================================================

UPDATE forms SET scope = '공통' WHERE scope IN ('common', 'division') OR scope IS NULL;

-- 양식명에 사업부 표식이 명시된 건만 자동 시드 (오탐 AML→AM 제외)
UPDATE forms SET scope = '조관'   WHERE code = 'L2100-05';  -- 환경측정...(-조관)
UPDATE forms SET scope = '필라넥' WHERE code = 'J1103-01';  -- 작업표준서 (-필라넥)
UPDATE forms SET scope = '쇼바'   WHERE code IN ('L2100-06', 'L2100-10');  -- 출하/수입검사(-쇼바)
