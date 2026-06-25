-- 0031_grid_specs_batch.sql (격자추출기 d2 → 고신뢰 7양식)
-- 자동추출(헤더행/데이터영역/컬럼) 후 육안검수로 깨끗한 7개만 시드. M2100-01(기준서오인)·L2100-04(시간슬롯) 제외.
-- 대상은 기존 form_fields 0·제출 0(big양식, 그간 입력불가). migrate.ts 트랜잭션 래핑 → BEGIN/COMMIT 없음.

-- B2100-11: 고객사 불량 유효성 검증 관리대장 (B2100-11)  (header R12, data R13, max 8, 24col)
DELETE FROM form_fields WHERE form_code='B2100-11';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-11','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-11';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-11','rows',13,1,8);
DELETE FROM form_grid_columns WHERE form_code='B2100-11';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-11','rows','no','NO','A','text',0),
  ('B2100-11','rows','일자','일자','B','date',1),
  ('B2100-11','rows','고객','고객','C','text',2),
  ('B2100-11','rows','품번명','품번/명','D','text',3),
  ('B2100-11','rows','불량수량','불량 수량','E','number',4),
  ('B2100-11','rows','불량','불량','F','text',5),
  ('B2100-11','rows','개선조치','개선조치','G','text',6),
  ('B2100-11','rows','담당자','담당자','H','text',7),
  ('B2100-11','rows','회신일','회신 일','I','text',8),
  ('B2100-11','rows','fmea','FM EA','J','text',9),
  ('B2100-11','rows','cp','C/P','K','text',10),
  ('B2100-11','rows','작업표준','작업 표준','L','text',11),
  ('B2100-11','rows','검사기준','검사 기준','M','text',12),
  ('B2100-11','rows','입고품','입 고품','N','text',13),
  ('B2100-11','rows','공정','공정','O','text',14),
  ('B2100-11','rows','적용시점','적용 시점','P','text',15),
  ('B2100-11','rows','1개월1lot','1개월(1LOT)','Q','text',16),
  ('B2100-11','rows','2개월2lot','2개월(2LOT)','R','text',17),
  ('B2100-11','rows','3개월3lot','3개월(3LOT)','S','text',18),
  ('B2100-11','rows','통보','통보','T','text',19),
  ('B2100-11','rows','o','O','U','text',20),
  ('B2100-11','rows','x','X','V','text',21),
  ('B2100-11','rows','품명','품명','W','text',22),
  ('B2100-11','rows','비고','비고','Y','text',23);

-- B2100-06: 금형 진행사항 점검 (B2100-06)_생산  (header R4, data R5, max 90, 12col)
DELETE FROM form_fields WHERE form_code='B2100-06';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-06','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-06';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-06','rows',5,1,90);
DELETE FROM form_grid_columns WHERE form_code='B2100-06';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-06','rows','no','No','B','text',0),
  ('B2100-06','rows','open일자','OPEN 일자','C','date',1),
  ('B2100-06','rows','고객사','고객사','D','text',2),
  ('B2100-06','rows','사번','사번','E','text',3),
  ('B2100-06','rows','금형번호','금형번호','F','text',4),
  ('B2100-06','rows','수정내용','수정내용','G','text',5),
  ('B2100-06','rows','진행사항','진행사항','H','text',6),
  ('B2100-06','rows','담당자','담당자','I','text',7),
  ('B2100-06','rows','완료여부','완료여부','J','text',8),
  ('B2100-06','rows','완료일자','완료일자','K','date',9),
  ('B2100-06','rows','유효성점검','유효성점검','L','text',10),
  ('B2100-06','rows','비고','비고','M','text',11);

-- B2100-07: 설비점검 진행사항 (B2100-07)_생산기술  (header R4, data R5, max 10, 14col)
DELETE FROM form_fields WHERE form_code='B2100-07';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-07','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-07','rows',5,1,10);
DELETE FROM form_grid_columns WHERE form_code='B2100-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-07','rows','no','No','B','text',0),
  ('B2100-07','rows','open일자','OPEN 일자','C','date',1),
  ('B2100-07','rows','고객사','고객사','D','text',2),
  ('B2100-07','rows','사번','사번','E','text',3),
  ('B2100-07','rows','설비호기','설비(호기)','F','text',4),
  ('B2100-07','rows','문제내용','문제내용','G','text',5),
  ('B2100-07','rows','점검결과','점검결과','H','text',6),
  ('B2100-07','rows','담당자','담당자','I','text',7),
  ('B2100-07','rows','완료여부','완료여부','J','text',8),
  ('B2100-07','rows','완료일자','완료일자','K','date',9),
  ('B2100-07','rows','유효성점검','유효성점검','L','text',10),
  ('B2100-07','rows','비고','비고','M','text',11),
  ('B2100-07','rows','일자','일자','N','date',12),
  ('B2100-07','rows','review내용','Review 내용','O','text',13);

-- B2100-08: 4M변경 내역 및 적용일자 관리 (B2100-08)_품질  (header R4, data R5, max 8, 13col)
DELETE FROM form_fields WHERE form_code='B2100-08';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-08','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-08';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-08','rows',5,1,8);
DELETE FROM form_grid_columns WHERE form_code='B2100-08';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-08','rows','no','No','B','text',0),
  ('B2100-08','rows','open일자','OPEN 일자','C','date',1),
  ('B2100-08','rows','고객사','고객사','D','text',2),
  ('B2100-08','rows','사번','사번','E','text',3),
  ('B2100-08','rows','설비호기','설비(호기)','F','text',4),
  ('B2100-08','rows','4m변경적용시점','4M변경 적용시점','G','text',5),
  ('B2100-08','rows','4m변경내용','4M변경내용','H','text',6),
  ('B2100-08','rows','추가내용','추가 내용','I','text',7),
  ('B2100-08','rows','점검결과','점검결과','J','text',8),
  ('B2100-08','rows','담당자','담당자','K','text',9),
  ('B2100-08','rows','완료여부','완료여부','L','text',10),
  ('B2100-08','rows','유효성점검','유효성점검','M','text',11),
  ('B2100-08','rows','비고','비고','N','text',12);

-- B2100-09: 공정개선 T O 진행사항 점검 (B2100-09)_생산  (header R4, data R5, max 5, 12col)
DELETE FROM form_fields WHERE form_code='B2100-09';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-09','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-09';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-09','rows',5,1,5);
DELETE FROM form_grid_columns WHERE form_code='B2100-09';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-09','rows','no','No','B','text',0),
  ('B2100-09','rows','open일자','OPEN 일자','C','date',1),
  ('B2100-09','rows','고객사','고객사','D','text',2),
  ('B2100-09','rows','사번','사번','E','text',3),
  ('B2100-09','rows','문제내용','문 제 내 용','F','text',4),
  ('B2100-09','rows','개선내용','개 선 내 용','G','text',5),
  ('B2100-09','rows','상세내용','상세내용','H','text',6),
  ('B2100-09','rows','주관팀','주관팀','I','text',7),
  ('B2100-09','rows','완료여부','완료여부','J','text',8),
  ('B2100-09','rows','완료일자','완료일자','K','date',9),
  ('B2100-09','rows','유효성점검','유효성점검','L','text',10),
  ('B2100-09','rows','비고','비고','M','text',11);

-- B2100-10: 용접 개선 T O 진행사항 점검 (B2100-10)_생기  (header R4, data R5, max 7, 13col)
DELETE FROM form_fields WHERE form_code='B2100-10';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('B2100-10','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='B2100-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('B2100-10','rows',5,1,7);
DELETE FROM form_grid_columns WHERE form_code='B2100-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('B2100-10','rows','no','No','B','text',0),
  ('B2100-10','rows','open일자','OPEN 일자','C','date',1),
  ('B2100-10','rows','고객사','고객사','D','text',2),
  ('B2100-10','rows','사번','사번','E','text',3),
  ('B2100-10','rows','문제내용','문 제 내 용','F','text',4),
  ('B2100-10','rows','개선내용','개 선 내 용','G','text',5),
  ('B2100-10','rows','상세내용','상세내용','H','text',6),
  ('B2100-10','rows','주관팀','주관팀','I','text',7),
  ('B2100-10','rows','담당자','담당자','J','text',8),
  ('B2100-10','rows','완료여부','완료여부','K','text',9),
  ('B2100-10','rows','완료일자','완료일자','L','date',10),
  ('B2100-10','rows','유효성점검','유효성점검','M','text',11),
  ('B2100-10','rows','비고','비고','N','text',12);

-- L1100-15: 업무 일지 (L1100-15)  (header R28, data R29, max 21, 8col)
DELETE FROM form_fields WHERE form_code='L1100-15';
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, sort_order, ai_enabled) VALUES ('L1100-15','rows','기록 항목','grid','대장',0,0);
DELETE FROM form_grid_spec WHERE form_code='L1100-15';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES ('L1100-15','rows',29,1,21);
DELETE FROM form_grid_columns WHERE form_code='L1100-15';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
  ('L1100-15','rows','발생처','발 생 처','A','text',0),
  ('L1100-15','rows','설비명','설 비 명','B','text',1),
  ('L1100-15','rows','설비번호','설비번호','C','text',2),
  ('L1100-15','rows','활동내용','활  동  내  용','D','text',3),
  ('L1100-15','rows','소요시간','소요시간','I','text',4),
  ('L1100-15','rows','소요자재','소요자재','J','text',5),
  ('L1100-15','rows','구분','구분','L','text',6),
  ('L1100-15','rows','비고','비  고','M','text',7);
