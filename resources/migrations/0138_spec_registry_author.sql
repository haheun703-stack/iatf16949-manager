-- 0138 — 검사기준(SPEC)등록 화면(34호 2차분 배치⑴ #7) 동반:
-- 개정 주체 각인(created_by) — §10-1 정신(누가 개정했는지). 구판 행 불변 원칙 그대로(UPDATE는 active 강하만).
ALTER TABLE insp_spec ADD COLUMN created_by TEXT;
