-- ============================================================
-- Migration 0104: 양식 완성전 1배치 본체 10종 — fields/grid/셀맵 완결 (2026-07-28)
--
-- 대상(승인 순서): 수입검사 L2100-01·04·05·11 → 금형 L1100-25 → 지그 L1200-01·04·12
--                  → 계측기 L3100-01 → 출하성적서 M3100-05
--
-- 실측 반전 3건(7/28 오후 사무실, 조사서 추기 예정):
--  ⑴ L2100 사업부별 변형: 마스터 L2100-01-인 = 5행 스텁, -조 순회일지 = 조관사업부 전용.
--     AM사업부 실사용 = MES 엑셀양식('양식' 시트, 25450-07870 세트 240313) → 실물 채택
--     (templates/am_forms/, 신규 설계본 아님). L2100-01·05 이름의 사업부 접미사도 실사용에 맞춰 정정.
--  ⑵ L2100-11 조도: 기존 신규 설계본은 조명 조도(lux)로 도메인 오인. AM 실물(조도측정 일지)은
--     표면 거칠기 조도(조도팁 스타일러스) → 실물 출현 시 교정 조건(코워크 A-2) 발동, 실물 채택.
--  ⑶ L2100-04 초품검사: AM 자체 변형 없음 실측 → 마스터 -조6 정본 유지(참고용 명시).
--
-- 안전: 10종 전부 form_submissions 0건 실측(audit_20260728) — DELETE+INSERT 무손실.
-- 멱등: DELETE 후 INSERT + UPDATE — 재실행 = 동일 결과.
-- L2100-01 기존 cell_map 1행(-인 스텁 추출 잔재)·L2100-05 기존 149행(-조 시트 좌표)은
-- 채택 템플릿과 좌표계가 다르므로 삭제. L2100-04 의 391행(마스터 -조6 캔버스 오버레이)은 보존.
-- ============================================================

-- ── ① L2100-01 수입검사표준 — AM 실사용 채택 ──────────────────
UPDATE forms SET
  name='수입검사표준(-AM)',
  template_path='templates/am_forms/L2100-01_수입검사표준_AM.xlsx'
WHERE code='L2100-01';

DELETE FROM form_fields WHERE form_code='L2100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-01','차종','차종','text','기본 정보',NULL,1,'frame'),
 ('L2100-01','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('L2100-01','품명','품명','text','기본 정보',NULL,3,'frame'),
 ('L2100-01','공정명','공정명','text','기본 정보',NULL,4,'frame'),
 ('L2100-01','설비명','설비명','text','기본 정보',NULL,5,'frame'),
 ('L2100-01','원소재lot','원소재 LOT 넘버','text','기본 정보',NULL,6,'frame'),
 ('L2100-01','적입용기','적입용기','text','기본 정보',NULL,7,'frame'),
 ('L2100-01','box수량','1BOX 수량','text','기본 정보',NULL,8,'frame'),
 ('L2100-01','items_l','검사항목 1~3','grid','검사항목',NULL,9,NULL),
 ('L2100-01','items_r','검사항목 4~5','grid','검사항목',NULL,10,NULL),
 ('L2100-01','비고','비고','text','확인',NULL,11,'frame'),
 ('L2100-01','작성자','작성자','auto','확인',NULL,12,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-01','차종','차종','C2','text',1),
 ('L2100-01','품번','품번','F2','text',2),
 ('L2100-01','품명','품명','F4','text',3),
 ('L2100-01','공정명','공정명','C4','text',4),
 ('L2100-01','설비명','설비명','I2','text',5),
 ('L2100-01','원소재lot','원소재 LOT 넘버','I4','text',6),
 ('L2100-01','적입용기','적입용기','K3','text',7),
 ('L2100-01','box수량','1BOX 수량','K5','text',8),
 ('L2100-01','비고','비고','G14','text',9),
 ('L2100-01','작성자','작성자','N3','text',10);

DELETE FROM form_grid_spec WHERE form_code='L2100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2100-01','items_l',8,3,3),
 ('L2100-01','items_r',8,3,2);

DELETE FROM form_grid_columns WHERE form_code='L2100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-01','items_l','no','순','C','text',1),
 ('L2100-01','items_l','검사부위','검사 부위','D','text',2),
 ('L2100-01','items_l','검사항목','검사항목','E','text',3),
 ('L2100-01','items_r','no','순','F','text',1),
 ('L2100-01','items_r','검사부위','검사 부위','G','text',2),
 ('L2100-01','items_r','검사항목','검사항목','H','text',3);

-- ── ② L2100-04 초품검사 및 불량폐기내역(-조6) — 마스터 정본 유지 ──
DELETE FROM form_fields WHERE form_code='L2100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-04','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('L2100-04','작성자','작성자','auto','기본 정보',NULL,2,'frame'),
 ('L2100-04','choum','초품검사 기록','grid','1. 초품검사',NULL,3,NULL),
 ('L2100-04','특기사항_초품','특기사항(초품검사)','text','1. 초품검사',NULL,4,'frame'),
 ('L2100-04','scrap','불량폐기 기록','grid','2. 불량폐기내역',NULL,5,NULL),
 ('L2100-04','특기사항_폐기','특기사항(불량폐기)','text','2. 불량폐기내역',NULL,6,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-04'
 AND field_key IN ('작성일','작성자','특기사항_초품','특기사항_폐기');
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-04','작성일','작성일','J5','date',1001),
 ('L2100-04','작성자','작성자','K3','text',1002),
 ('L2100-04','특기사항_초품','특기사항(초품검사)','B19','text',1003),
 ('L2100-04','특기사항_폐기','특기사항(불량폐기)','B37','text',1004);

DELETE FROM form_grid_spec WHERE form_code='L2100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2100-04','choum',9,1,10),
 ('L2100-04','scrap',27,1,10);

DELETE FROM form_grid_columns WHERE form_code='L2100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-04','choum','시간','시간','B','text',1),
 ('L2100-04','choum','외경','외경','C','text',2),
 ('L2100-04','choum','두께','두께','D','text',3),
 ('L2100-04','choum','길이','길이','E','text',4),
 ('L2100-04','choum','폐기본수','폐기본수(예: 2본폐기)','F','text',5),
 ('L2100-04','choum','확관시험','확관시험(예: 3번째이상무)','G','text',6),
 ('L2100-04','choum','압착시험','압착시험','H','text',7),
 ('L2100-04','choum','양품시작','양품 시작(예: 4번째 pipe양품)','I','text',8),
 ('L2100-04','choum','판정','판정','P','text',9),
 ('L2100-04','scrap','재질','재질','B','text',1),
 ('L2100-04','scrap','lot_no','LOT NO','C','text',2),
 ('L2100-04','scrap','외경','외경','D','text',3),
 ('L2100-04','scrap','두께','두께','E','text',4),
 ('L2100-04','scrap','길이','길이','F','text',5),
 ('L2100-04','scrap','스크라치_외경','스크라치(외경)','G','text',6),
 ('L2100-04','scrap','스크라치_내경','스크라치(내경)','H','text',7),
 ('L2100-04','scrap','코일연결부','코일연결부','I','text',8),
 ('L2100-04','scrap','초품폐기','초품폐기(1항 합계)','K','text',9),
 ('L2100-04','scrap','기타','기타','M','text',10),
 ('L2100-04','scrap','합계','합계','O','text',11);

-- ── ③ L2100-05 공정 순회검사 — AM 실사용(공정패트롤) 채택 ──────
UPDATE forms SET
  name='공정 순회검사(패트롤) 시트(-AM)',
  template_path='templates/am_forms/L2100-05_공정순회_패트롤_AM.xlsx'
WHERE code='L2100-05';

DELETE FROM form_fields WHERE form_code='L2100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-05','차종','차종','text','기본 정보',NULL,1,'frame'),
 ('L2100-05','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('L2100-05','품명','품명','text','기본 정보',NULL,3,'frame'),
 ('L2100-05','공정명','공정명','text','기본 정보',NULL,4,'frame'),
 ('L2100-05','설비명','설비명','text','기본 정보',NULL,5,'frame'),
 ('L2100-05','원소재lot','원소재 LOT 넘버','text','기본 정보',NULL,6,'frame'),
 ('L2100-05','적입용기','적입용기','text','기본 정보',NULL,7,'frame'),
 ('L2100-05','box수량','1BOX 수량','text','기본 정보',NULL,8,'frame'),
 ('L2100-05','items_l','검사항목 1~3','grid','검사항목',NULL,9,NULL),
 ('L2100-05','items_r','검사항목 4~5','grid','검사항목',NULL,10,NULL),
 ('L2100-05','비고','비고','text','확인',NULL,11,'frame'),
 ('L2100-05','작성자','작성자','auto','확인',NULL,12,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-05','차종','차종','C2','text',1),
 ('L2100-05','품번','품번','F2','text',2),
 ('L2100-05','품명','품명','F4','text',3),
 ('L2100-05','공정명','공정명','C4','text',4),
 ('L2100-05','설비명','설비명','I2','text',5),
 ('L2100-05','원소재lot','원소재 LOT 넘버','I4','text',6),
 ('L2100-05','적입용기','적입용기','K3','text',7),
 ('L2100-05','box수량','1BOX 수량','K5','text',8),
 ('L2100-05','비고','비고','G14','text',9),
 ('L2100-05','작성자','작성자','N3','text',10);

DELETE FROM form_grid_spec WHERE form_code='L2100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2100-05','items_l',8,3,3),
 ('L2100-05','items_r',8,3,2);

DELETE FROM form_grid_columns WHERE form_code='L2100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-05','items_l','no','순','C','text',1),
 ('L2100-05','items_l','검사부위','점검 부위','D','text',2),
 ('L2100-05','items_l','검사항목','점검항목','E','text',3),
 ('L2100-05','items_r','no','순','F','text',1),
 ('L2100-05','items_r','검사부위','점검 부위','G','text',2),
 ('L2100-05','items_r','검사항목','점검항목','H','text',3);

-- ── ④ L2100-11 조도관리 측정기록 — AM 실물(표면 조도) 채택 ─────
UPDATE forms SET
  template_path='templates/am_forms/L2100-11_조도측정_기록일지_AM.xlsx'
WHERE code='L2100-11';

DELETE FROM form_fields WHERE form_code='L2100-11';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-11','rows','측정 기록','grid','기록',NULL,1,NULL),
 ('L2100-11','작성자','작성자','auto','확인',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-11';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-11','작성자','작성자','I3','text',1);

DELETE FROM form_grid_spec WHERE form_code='L2100-11';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L2100-11','rows',7,1,15);

DELETE FROM form_grid_columns WHERE form_code='L2100-11';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-11','rows','no','No','B','text',1),
 ('L2100-11','rows','일자','일자','C','date',2),
 ('L2100-11','rows','프로젝트명','프로젝트 명(개발/양산)','D','text',3),
 ('L2100-11','rows','품번','품번','E','text',4),
 ('L2100-11','rows','측정포인트','측정 포인트','F','text',5),
 ('L2100-11','rows','조도값기준','조도값(도면기준)','G','text',6),
 ('L2100-11','rows','실측값1','실측값#1','H','text',7),
 ('L2100-11','rows','실측값2','실측값#2','I','text',8),
 ('L2100-11','rows','실측값3','실측값#3','J','text',9),
 ('L2100-11','rows','측정자','측정자','K','text',10);

-- ── ⑤ L1100-25 금형 점검 체크시트 — 신규 설계본 Rev.1(일자-행 전개) ──
DELETE FROM form_fields WHERE form_code='L1100-25';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-25','금형번호','금형 번호','text','기본 정보',NULL,1,'frame'),
 ('L1100-25','등급','등급','text','기본 정보',NULL,2,'frame'),
 ('L1100-25','년월','년/월','text','기본 정보',NULL,3,'frame'),
 ('L1100-25','rows','일상점검 기록','grid','점검 기록(○/×/△)',NULL,4,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-25';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-25','금형번호','금형 번호','B3','text',1),
 ('L1100-25','등급','등급','E3','text',2),
 ('L1100-25','년월','년/월','G3','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-25';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L1100-25','rows',5,1,31);

DELETE FROM form_grid_columns WHERE form_code='L1100-25';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-25','rows','일자','일자','A','date',1),
 ('L1100-25','rows','이물질','이물질 없음(상/하부)','B','text',2),
 ('L1100-25','rows','손상크랙','손상·크랙 없음','C','text',3),
 ('L1100-25','rows','볼트풀림','볼트 풀림 없음','D','text',4),
 ('L1100-25','rows','도금상태','도금상태 양호','E','text',5),
 ('L1100-25','rows','마모상태','마모 상태 확인','F','text',6),
 ('L1100-25','rows','핀유격','핀 유격 없음','G','text',7),
 ('L1100-25','rows','스크랩취출','스크랩 취출상태','H','text',8),
 ('L1100-25','rows','점검자','점검자','I','text',9),
 ('L1100-25','rows','비고','비고','J','text',10);

-- ── ⑥ L1200-01 치공구 관리대장 — 마스터 시트 ──────────────────
DELETE FROM form_fields WHERE form_code='L1200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-01','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('L1200-01','작성부서','작성부서','text','기본 정보',NULL,2,'frame'),
 ('L1200-01','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('L1200-01','rows','치공구 목록','grid','대장',NULL,4,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-01','작성일','작성일','K1','date',1),
 ('L1200-01','작성부서','작성부서','K2','text',2),
 ('L1200-01','작성자','작성자','K3','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L1200-01','rows',5,1,30);

DELETE FROM form_grid_columns WHERE form_code='L1200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-01','rows','no','순','A','text',1),
 ('L1200-01','rows','모델명','모델명','B','text',2),
 ('L1200-01','rows','공정명','공정명','C','text',3),
 ('L1200-01','rows','규격','규격','D','text',4),
 ('L1200-01','rows','재질','재질','E','text',5),
 ('L1200-01','rows','금형구분','금형구분','F','text',6),
 ('L1200-01','rows','사용장비','사용장비','G','text',7),
 ('L1200-01','rows','제작처','제작처','H','text',8),
 ('L1200-01','rows','제작일자','제작일자','I','date',9),
 ('L1200-01','rows','대여공증일','대여/공증일','J','text',10),
 ('L1200-01','rows','비고','비고','K','text',11);

-- ── ⑦ L1200-04 지그 이력카드 — 마스터 시트(카드형+이력 grid) ────
DELETE FROM form_fields WHERE form_code='L1200-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-04','자산관리번호','자산관리번호','text','기본 정보',NULL,1,'frame'),
 ('L1200-04','차종','차종','text','기본 정보',NULL,2,'frame'),
 ('L1200-04','assy부품번호','ASS''Y 부품번호','text','기본 정보',NULL,3,'frame'),
 ('L1200-04','단품부품번호','단품 부품번호','text','기본 정보',NULL,4,'frame'),
 ('L1200-04','eo_no','EO/NO','text','기본 정보',NULL,5,'frame'),
 ('L1200-04','부품명','부품명','text','기본 정보',NULL,6,'frame'),
 ('L1200-04','치형구종류','치형구 종류','select','사양','["금형","검사구","JIG"]',7,'frame'),
 ('L1200-04','공정명','공정명','text','사양',NULL,8,'frame'),
 ('L1200-04','재질','재질','text','사양',NULL,9,'frame'),
 ('L1200-04','중량','중량','text','사양',NULL,10,'frame'),
 ('L1200-04','규격','규격(mm, 장×폭×고)','text','사양',NULL,11,'frame'),
 ('L1200-04','사용기계','사용 기계','text','사양',NULL,12,'frame'),
 ('L1200-04','제작처','제작처','text','관리',NULL,13,'frame'),
 ('L1200-04','현보유장소','현 보유장소','text','관리',NULL,14,'frame'),
 ('L1200-04','대여공증일','대여/공증일','text','관리',NULL,15,'frame'),
 ('L1200-04','특기사항','특기사항','text','관리',NULL,16,'frame'),
 ('L1200-04','history','주요 변동/수정 이력','grid','이력',NULL,17,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-04','자산관리번호','자산관리번호','B3','text',1),
 ('L1200-04','차종','차종','B4','text',2),
 ('L1200-04','assy부품번호','ASS''Y 부품번호','B5','text',3),
 ('L1200-04','단품부품번호','단품 부품번호','B6','text',4),
 ('L1200-04','eo_no','EO/NO','B7','text',5),
 ('L1200-04','부품명','부품명','B8','text',6),
 ('L1200-04','치형구종류','치형구 종류','B9','text',7),
 ('L1200-04','공정명','공정명','B10','text',8),
 ('L1200-04','재질','재질','B11','text',9),
 ('L1200-04','중량','중량','B12','text',10),
 ('L1200-04','규격','규격(mm, 장×폭×고)','B13','text',11),
 ('L1200-04','사용기계','사용 기계','B14','text',12),
 ('L1200-04','제작처','제작처','B15','text',13),
 ('L1200-04','현보유장소','현 보유장소','B16','text',14),
 ('L1200-04','대여공증일','대여/공증일','B17','text',15),
 ('L1200-04','특기사항','특기사항','B18','text',16);

DELETE FROM form_grid_spec WHERE form_code='L1200-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L1200-04','history',5,1,6);

DELETE FROM form_grid_columns WHERE form_code='L1200-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-04','history','일자','년/월/일','C','date',1),
 ('L1200-04','history','내용','주요 내용','D','text',2);

-- ── ⑧ L1200-12 지그·치공구 점검 체크시트 — 신규 설계본 Rev.1 ────
DELETE FROM form_fields WHERE form_code='L1200-12';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-12','지그번호','지그 번호','text','기본 정보',NULL,1,'frame'),
 ('L1200-12','년월','년/월','text','기본 정보',NULL,2,'frame'),
 ('L1200-12','rows','일상점검 기록','grid','점검 기록(○/×)',NULL,3,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-12';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-12','지그번호','지그 번호','B3','text',1),
 ('L1200-12','년월','년/월','E3','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1200-12';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L1200-12','rows',5,1,31);

DELETE FROM form_grid_columns WHERE form_code='L1200-12';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-12','rows','일자','일자','A','date',1),
 ('L1200-12','rows','안착센서','안착센서 F/P 테스트','B','text',2),
 ('L1200-12','rows','기준핀','기준핀 마모·유격','C','text',3),
 ('L1200-12','rows','스패터','스패터 제거','D','text',4),
 ('L1200-12','rows','클램프','클램프 작동상태','E','text',5),
 ('L1200-12','rows','센서류','센서류 작동·고정','F','text',6),
 ('L1200-12','rows','에어누기','에어 누기 없음','G','text',7),
 ('L1200-12','rows','배선피복','배선·피복 상태','H','text',8),
 ('L1200-12','rows','점검자','점검자','I','text',9),
 ('L1200-12','rows','비고','비고','J','text',10);

-- ── ⑨ L3100-01 계측기 관리대장 — 마스터 시트(대장형, grid 전용) ──
DELETE FROM form_fields WHERE form_code='L3100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class)
VALUES ('L3100-01','rows','검교정 리스트','grid','대장',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='L3100-01';

DELETE FROM form_grid_spec WHERE form_code='L3100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L3100-01','rows',4,1,40);

DELETE FROM form_grid_columns WHERE form_code='L3100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L3100-01','rows','계측기명','계측기명[규격]','A','text',1),
 ('L3100-01','rows','관리번호','관리번호','C','text',2),
 ('L3100-01','rows','제조사','제조사','D','text',3),
 ('L3100-01','rows','모델명','C/NO[모델명]','E','text',4),
 ('L3100-01','rows','관리사업부','관리 사업부','F','text',5),
 ('L3100-01','rows','관리부서','관리 부서','G','text',6),
 ('L3100-01','rows','관리자','관리자','H','text',7),
 ('L3100-01','rows','보관장소','보관 장소','I','text',8),
 ('L3100-01','rows','검교정주기','검교정 주기','J','text',9),
 ('L3100-01','rows','전회검교정일','전회 검교정 일자','K','date',10),
 ('L3100-01','rows','금회검교정일','금회 검교정 일자','L','date',11),
 ('L3100-01','rows','차기검교정일','차기 검교정 일자','M','date',12),
 ('L3100-01','rows','검교정기관','검교정 기관','N','text',13),
 ('L3100-01','rows','검교정관리자','검교정 관리자','O','text',14),
 ('L3100-01','rows','구입일자','구입 일자','P','date',15),
 ('L3100-01','rows','합부판정','합부 판정','AI','text',16),
 ('L3100-01','rows','비고','비고','AK','text',17);

-- ── ⑩ M3100-05 완성품·출하검사 성적서 — 신규 설계본(02) ────────
DELETE FROM form_fields WHERE form_code='M3100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M3100-05','품명','품명','text','기본 정보',NULL,1,'frame'),
 ('M3100-05','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('M3100-05','lot_no','LOT No.','text','기본 정보',NULL,3,'frame'),
 ('M3100-05','생산일','생산일','date','기본 정보',NULL,4,'fact'),
 ('M3100-05','검사일','검사일','date','기본 정보',NULL,5,'fact'),
 ('M3100-05','검사수량','검사수량','text','기본 정보',NULL,6,'frame'),
 ('M3100-05','rows','검사항목 기록','grid','검사 · 측정',NULL,7,NULL),
 ('M3100-05','작성자','작성자','auto','확인',NULL,8,'frame');

DELETE FROM form_cell_map WHERE form_code='M3100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M3100-05','품명','품명','B3','text',1),
 ('M3100-05','품번','품번','D3','text',2),
 ('M3100-05','lot_no','LOT No.','F3','text',3),
 ('M3100-05','생산일','생산일','H3','date',4),
 ('M3100-05','검사일','검사일','J3','date',5),
 ('M3100-05','검사수량','검사수량','L3','text',6),
 ('M3100-05','작성자','작성자','G23','text',7);

DELETE FROM form_grid_spec WHERE form_code='M3100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('M3100-05','rows',5,1,14);

DELETE FROM form_grid_columns WHERE form_code='M3100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M3100-05','rows','no','No','A','text',1),
 ('M3100-05','rows','검사항목','검사항목','B','text',2),
 ('M3100-05','rows','규격','규격(기준)','C','text',3),
 ('M3100-05','rows','측정기기','측정기기(관리번호)','D','text',4),
 ('M3100-05','rows','시료1','시료1','E','text',5),
 ('M3100-05','rows','시료2','시료2','F','text',6),
 ('M3100-05','rows','시료3','시료3','G','text',7),
 ('M3100-05','rows','시료4','시료4','H','text',8),
 ('M3100-05','rows','시료5','시료5','I','text',9),
 ('M3100-05','rows','판정','판정','J','text',10),
 ('M3100-05','rows','검사자','검사자','K','text',11),
 ('M3100-05','rows','비고','비고','L','text',12);

-- ── ⑪ 낡은 설명 정리 — "필드 미정의" 문구가 작성 화면 부제로 노출되던 것 교체 ──
UPDATE forms SET description='AM 실사용 MES 수입검사 양식 채택(1배치 260728). 품번별 검사 기준·항목 작성 → 엑셀 출력.' WHERE code='L2100-01';
UPDATE forms SET description='마스터 정본(-조6, 조관공정 전용 — AM 자체 변형 없음 실측). 1배치(260728) 필드 완결: 초품검사·불량폐기 기록.' WHERE code='L2100-04';
UPDATE forms SET description='AM 실사용 MES 공정패트롤 양식 채택(1배치 260728). 공정 순회검사(패트롤) 항목 작성 → 엑셀 출력.' WHERE code='L2100-05';
UPDATE forms SET description='AM 실물 조도측정 일지(표면 거칠기 조도) 채택 — 구 신규설계본(조명 lux)은 도메인 오인으로 교정(1배치 260728).' WHERE code='L2100-11';
UPDATE forms SET description='코워크 갭양식 신규제작(260716, 원제안코드 L1100-20) → 1배치(260728) Rev.1 일자-행 전개·필드 완결. 의무 #73 연결.' WHERE code='L1100-25';
UPDATE forms SET description='마스터 시트 기반 1배치(260728) 필드 완결 — 치공구 목록 대장.' WHERE code='L1200-01';
UPDATE forms SET description='마스터 시트 기반 1배치(260728) 필드 완결 — 지그 카드 정보 + 변동 이력.' WHERE code='L1200-04';
UPDATE forms SET description='코워크 갭양식 신규제작(260716, 원제안코드 L1200-03) → 1배치(260728) Rev.1 일자-행 전개·필드 완결.' WHERE code='L1200-12';
UPDATE forms SET description='마스터 시트 기반 1배치(260728) 필드 완결 — 검교정 리스트 대장.' WHERE code='L3100-01';
UPDATE forms SET description='코워크 갭양식 신규제작(260716) → 1배치(260728) 필드 완결. 검사 업무 책임=품질보증팀. 의무 #47 연결.' WHERE code='M3100-05';
