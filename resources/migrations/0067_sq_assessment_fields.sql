-- ============================================================
-- Migration 0067: 자체평가 헤더 필드 확장 (코워크 07 Phase B / 08 표지 셀맵)
--
-- 표지 시트 기입 항목(평가자 C10 · 입회 C11 · 종합의견 B20 · 차기예정 F11)을
-- sq_assessments(0064)에 보존. 결재(approved_by/at)는 0064에 이미 있음.
-- ============================================================

ALTER TABLE sq_assessments ADD COLUMN assessor TEXT;
ALTER TABLE sq_assessments ADD COLUMN witness TEXT;
ALTER TABLE sq_assessments ADD COLUMN summary_opinion TEXT;
ALTER TABLE sq_assessments ADD COLUMN next_due TEXT;
