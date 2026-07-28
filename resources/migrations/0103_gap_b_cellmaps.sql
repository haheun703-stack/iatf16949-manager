-- ============================================================
-- Migration 0103: 양식 완성전 1배치 선두 — 갭B 5종 엑셀 좌표 완결 (2026-07-28)
--
-- 갭B = form_fields 는 있으나 엑셀 좌표(form_cell_map/form_grid_*)가 없어
-- "셀맵 정의 = 곧 엑셀 출력" 원칙이 깨져 있던 5종. 실측 반전(7/28):
--   · L4102-02 만 마스터 규정집에 시트 실존(계산기형 — 비수식 헤더 셀만 매핑)
--   · L2100-07 정본 = 0065 신규제작 템플릿(대장형 15열) → rows grid 재정의
--   · K1200-07·M1200-10·M1200-11 = 원본 부재 → 신규 설계본(코워크 A-2 승인,
--     문서번호·Rev.0·제정일 블록 포함, gen-gap-b-templates.mjs 산출)
-- 엔진: form-export-engine 에 template_path 폴백 + grid 전용 게이트 완화 동반(같은 커밋).
--
-- 안전: 5종 전부 form_submissions 0건 실측 — fields 재정의(DELETE+INSERT) 무손실.
-- 멱등: DELETE 후 INSERT + UPDATE — 재실행 = 동일 결과.
-- ============================================================

-- ── ① L2100-07 수입검사 관리대장 — 대장형 rows grid (0065 템플릿 15열 실측) ──
DELETE FROM form_fields WHERE form_code='L2100-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, sort_order)
VALUES ('L2100-07','rows','수입검사 기록','grid','기록',0);

DELETE FROM form_grid_spec WHERE form_code='L2100-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L2100-07','rows',4,1,34);

DELETE FROM form_grid_columns WHERE form_code='L2100-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-07','rows','no','No','A','text',1),
 ('L2100-07','rows','입고일','입고일','B','date',2),
 ('L2100-07','rows','품명','품명','C','text',3),
 ('L2100-07','rows','품번규격','품번/규격','D','text',4),
 ('L2100-07','rows','입고lot','입고 LOT','E','text',5),
 ('L2100-07','rows','입고수량','입고수량','F','text',6),
 ('L2100-07','rows','공급사','공급사','G','text',7),
 ('L2100-07','rows','출하성적서접수','출하성적서 접수(No.)','H','text',8),
 ('L2100-07','rows','성적서lot일치','성적서 LOT 일치(○/×)','I','text',9),
 ('L2100-07','rows','검사일','검사일','J','date',10),
 ('L2100-07','rows','검사성적서no','검사성적서 No.','K','text',11),
 ('L2100-07','rows','판정','판정','L','text',12),
 ('L2100-07','rows','합격식별','합격 식별','M','text',13),
 ('L2100-07','rows','검사자','검사자','N','text',14),
 ('L2100-07','rows','비고','비고','O','text',15);

-- ── ② K1200-07 외주 ISIR·검사협정 접수대장 — 신규 설계본(14) + rows grid ──
UPDATE forms SET template_path='templates/sq_gap_forms/14_외주ISIR·검사협정_접수대장_K1200-07.xlsx'
WHERE code='K1200-07';

DELETE FROM form_fields WHERE form_code='K1200-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, sort_order)
VALUES ('K1200-07','rows','접수 기록','grid','기록',0);

DELETE FROM form_grid_spec WHERE form_code='K1200-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('K1200-07','rows',4,1,30);

DELETE FROM form_grid_columns WHERE form_code='K1200-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-07','rows','no','No','A','text',1),
 ('K1200-07','rows','접수일자','접수일자','B','date',2),
 ('K1200-07','rows','외주사','외주사','C','text',3),
 ('K1200-07','rows','품번','품번','D','text',4),
 ('K1200-07','rows','isir번호','ISIR 번호','E','text',5),
 ('K1200-07','rows','접수유형','접수유형','F','text',6),
 ('K1200-07','rows','검토결과','검토결과','G','text',7),
 ('K1200-07','rows','담당자','담당자','H','text',8),
 ('K1200-07','rows','비고','비고','I','text',9);

-- ── ③ M1200-10 공정 자주검사 CHECK SHEET — 신규 설계본(15), 헤더 cell_map + 항목 grid ──
UPDATE forms SET template_path='templates/sq_gap_forms/15_공정자주검사_CHECK_SHEET_M1200-10.xlsx'
WHERE code='M1200-10';

DELETE FROM form_fields WHERE form_code='M1200-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-10','검사일자','검사일자','date','기본 정보',NULL,1,'fact'),
 ('M1200-10','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('M1200-10','설비명','설비명','text','기본 정보',NULL,3,'frame'),
 ('M1200-10','근무조','근무조','select','기본 정보','["주간","야간"]',4,'frame'),
 ('M1200-10','rows','검사항목 기록','grid','검사 · 측정',NULL,5,NULL),
 ('M1200-10','검사자','검사자','auto','확인',NULL,6,'frame'),
 ('M1200-10','특이사항','특이사항','text','확인',NULL,7,'frame');

DELETE FROM form_cell_map WHERE form_code='M1200-10';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-10','검사일자','검사일자','B3','date',1),
 ('M1200-10','품번','품번','D3','text',2),
 ('M1200-10','설비명','설비명','B4','text',3),
 ('M1200-10','근무조','근무조','D4','text',4),
 ('M1200-10','검사자','검사자','B18','text',5),
 ('M1200-10','특이사항','특이사항','D18','text',6);

DELETE FROM form_grid_spec WHERE form_code='M1200-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('M1200-10','rows',6,1,12);

DELETE FROM form_grid_columns WHERE form_code='M1200-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-10','rows','no','No','A','text',1),
 ('M1200-10','rows','검사항목','검사항목','B','text',2),
 ('M1200-10','rows','기준규격','기준규격','C','text',3),
 ('M1200-10','rows','측정치','측정치','D','text',4),
 ('M1200-10','rows','판정','판정(○/×)','E','text',5),
 ('M1200-10','rows','비고','비고','F','text',6);

-- ── ④ M1200-11 브레이징 조건관리 CHECK SHEET — 신규 설계본(16), 동일 문법 ──
UPDATE forms SET template_path='templates/sq_gap_forms/16_브레이징_조건관리_CHECK_SHEET_M1200-11.xlsx'
WHERE code='M1200-11';

DELETE FROM form_fields WHERE form_code='M1200-11';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-11','일자','일자','date','기본 정보',NULL,1,'fact'),
 ('M1200-11','설비명','설비명','text','기본 정보',NULL,2,'frame'),
 ('M1200-11','근무조','근무조','select','기본 정보','["주간","야간"]',3,'frame'),
 ('M1200-11','rows','조건항목 기록','grid','조건 · 측정',NULL,4,NULL),
 ('M1200-11','확인자','확인자','auto','확인',NULL,5,'frame'),
 ('M1200-11','특이사항','특이사항','text','확인',NULL,6,'frame');

DELETE FROM form_cell_map WHERE form_code='M1200-11';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-11','일자','일자','B3','date',1),
 ('M1200-11','설비명','설비명','D3','text',2),
 ('M1200-11','근무조','근무조','B4','text',3),
 ('M1200-11','확인자','확인자','B16','text',4),
 ('M1200-11','특이사항','특이사항','D16','text',5);

DELETE FROM form_grid_spec WHERE form_code='M1200-11';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('M1200-11','rows',6,1,10);

DELETE FROM form_grid_columns WHERE form_code='M1200-11';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-11','rows','no','No','A','text',1),
 ('M1200-11','rows','조건항목','조건항목','B','text',2),
 ('M1200-11','rows','설정값','설정값(기준)','C','text',3),
 ('M1200-11','rows','실측값','실측값','D','text',4),
 ('M1200-11','rows','판정','판정(○/×)','E','text',5),
 ('M1200-11','rows','비고','비고','F','text',6);

-- ── ⑤ L4102-02 양산단계 공정능력 산출 — 마스터 시트 실존(계산기형), 비수식 헤더만 매핑 ──
-- Cpk(O13)·작성자 칸은 시트 수식/결재 영역이라 의도적 미매핑(수식 보호 — export 시 unmapped 로 정직 보고).
DELETE FROM form_cell_map WHERE form_code='L4102-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L4102-02','측정일','측정일','N6','date',1),
 ('L4102-02','품번','품번','D6','text',2),
 ('L4102-02','특성','관리 특성','D7','text',3),
 ('L4102-02','USL','규격 USL','O25','text',4),
 ('L4102-02','LSL','규격 LSL','O26','text',5),
 ('L4102-02','판정','판정','K7','text',6);
