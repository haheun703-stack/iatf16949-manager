-- 0032_inline_numbered_checkboxes.sql
-- (B)에서 미매칭된 라디오 필드 보강 — 번호매김 인라인형("1. 전 화  2. 우 편 …" 한 셀).
-- 엔진 markNumberedOption 이 선택 옵션의 번호를 ①로 마킹. field_key=라벨정규화(브리지 매칭).
-- migrate.ts 트랜잭션 래핑 → BEGIN/COMMIT 없음.
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
  ('B1100-01','통보방법','통보 방법','J35','radio',910),
  ('B1100-01','부적합처리','부적합 처리','J36','radio',911),
  ('B1100-01','공제여부','공제 여부','J37','radio',912);
