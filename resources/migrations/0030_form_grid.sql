-- 0030_form_grid.sql
-- 격자/대장형 행반복 출력(갭1 D) 데이터모델 + J3100-03(4M 변경 관리대장) v1 적용.
-- form_grid_spec: 그리드 테이블 위치(데이터시작행/행간격/최대행). form_grid_columns: 컬럼↔시트열 매핑(+UI 라벨).
-- form_fields 에 type='grid' 필드 하나로 노출(값=values_json[grid_key]=레코드 배열).
-- migrate.ts 트랜잭션 래핑 → BEGIN/COMMIT 없음.

CREATE TABLE IF NOT EXISTS form_grid_spec (
  form_code      TEXT NOT NULL,
  grid_key       TEXT NOT NULL,
  data_start_row INTEGER NOT NULL,
  stride         INTEGER NOT NULL DEFAULT 1,
  max_rows       INTEGER NOT NULL,
  PRIMARY KEY (form_code, grid_key)
);

CREATE TABLE IF NOT EXISTS form_grid_columns (
  form_code  TEXT NOT NULL,
  grid_key   TEXT NOT NULL,
  col_key    TEXT NOT NULL,
  label      TEXT NOT NULL,
  sheet_col  TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_code, grid_key, col_key)
);

-- J3100-03: 자동시드된 노이즈 플랫필드 제거 → grid 필드 하나로
DELETE FROM form_fields WHERE form_code = 'J3100-03';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled)
VALUES ('J3100-03', 'rows', '4M 변경 이력', 'grid', '변경 이력', 0, 0);

DELETE FROM form_grid_spec WHERE form_code = 'J3100-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('J3100-03', 'rows', 6, 1, 12);

DELETE FROM form_grid_columns WHERE form_code = 'J3100-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('J3100-03','rows','no','NO','A','text',0),
  ('J3100-03','rows','요청자','요청자','B','text',1),
  ('J3100-03','rows','의뢰일자','의뢰일자','C','date',2),
  ('J3100-03','rows','차종','차종','D','text',3),
  ('J3100-03','rows','품번','품번','E','text',4),
  ('J3100-03','rows','품명','품명','F','text',5),
  ('J3100-03','rows','개정일자','개정일자','G','date',6),
  ('J3100-03','rows','변경유형','변경유형','H','text',7),
  ('J3100-03','rows','변경내용','변경내용','I','text',8),
  ('J3100-03','rows','변경사유','변경사유','J','text',9),
  ('J3100-03','rows','공정명','공정명','K','text',10);
