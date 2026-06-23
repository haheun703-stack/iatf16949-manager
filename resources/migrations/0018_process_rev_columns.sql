-- ============================================================
-- Migration 0018: 개정이력 표를 공식 양식과 동일하게 8칸으로 확장
--
-- 0017의 process_revisions(번호/일자/사유/작성자)에
-- 프로세스 성과지표 / 산출식 / 측정주기 / 측정책임자 4칸 추가.
-- (공식 문서 표지의 개정이력 표를 데이터로 그대로 재현하기 위함)
-- ============================================================

ALTER TABLE process_revisions ADD COLUMN kpi TEXT;
ALTER TABLE process_revisions ADD COLUMN formula TEXT;
ALTER TABLE process_revisions ADD COLUMN cycle TEXT;
ALTER TABLE process_revisions ADD COLUMN owner TEXT;
