-- 0033_form_option_cells.sql
-- 옵션별 분리셀형 라디오/체크박스(H3200-02 접수유형: 유선/이메일/FAX/기타가 각각 별도 셀).
-- (field, option) → cell 매핑. 엔진이 선택 옵션의 셀을 【】로 표시.
-- migrate.ts 트랜잭션 래핑 → BEGIN/COMMIT 없음.
CREATE TABLE IF NOT EXISTS form_option_cells (
  form_code  TEXT NOT NULL,
  field_key  TEXT NOT NULL,
  option     TEXT NOT NULL,
  cell       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_code, field_key, option)
);

DELETE FROM form_option_cells WHERE form_code = 'H3200-02';
INSERT INTO form_option_cells (form_code, field_key, option, cell, sort_order) VALUES
  ('H3200-02','r2','유선','G6',0),
  ('H3200-02','r2','이메일','J6',1),
  ('H3200-02','r2','FAX','M6',2),
  ('H3200-02','r2','기타','P6',3);
