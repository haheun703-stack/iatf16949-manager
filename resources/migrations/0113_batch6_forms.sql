-- ============================================================
-- Migration 0113: 양식 완성전 6배치 — 잔여 양식형 25 + 편승 2 (2026-07-29 사무실)
--
-- 대상 = 5배치 검수요청 §5 예고분(잔여 양식형 25) + 검수회신_4_5배치 편승 확정 2
--  (①B2300-08 순회 점검 시트 신규 등록 ②L-4101-01 SPC 평가표 xlsx 변환 정본 완결).
--
-- 실측(7/29 사무실, 마스터 워크북 직접 스캔) 정직 3분류:
--  ⓐ 진행 17종
--   · 추출 4 — A8100-01(시트명 한 자리 코드 "A8100-1_" 정정 + 예시 클리어, B2300 선례)
--     · B2300-08(코드 중복 별개 양식 신규 등록분 — 시트명 정정) · J1100-14(★실측 반전:
--     좌면 A~AV=빈 양식 틀·우면 AZ~CU=작성 예시 기록의 2면 배치 → 좌면만 추출)
--     · A1100-01(첫 블록 1~26행=빈 틀·27행~=실기록 사례 → 첫 블록 추출)
--   · 정비 2 — J3100-08(0065 설계본 파일명 구코드 09_..._J3100-05 = 코드충돌 재부여
--     잔재, B1100-12/13 선례: 양식번호 정정+예시행 클리어) · L-4101-01(.xls 엔진 판독
--     불가 → LibreOffice 변환본 채택·원본 무변경·기록 클리어·수식 보존. ⚠️Excel COM
--     저장 불가 실측이라 LibreOffice 경로 — 차트/개체 표현 차이 가능)
--   · 마스터 직접 11 — M4200-01(8사업부 변형 중 resolveSheet 첫 시트=정밀인발(인발)
--     기준 최소 매핑 — 타 사업부 시트는 시트 수기, 한계 명기) · M4100-01/02(진단 grid)
--     · M4100-03/04(문서형) · H2100-01(-필라 대장 grid 전열) · H2100-02(최소 매핑 —
--     매트릭스·제목 (00월)은 시트 몫, H3200-01 선례) · H3100-05(문서형 최소 —
--     배포/회수 라벨내장 셀은 시트 수기) · H3100-06/07(grid — 비고 G열은 4행 병합이라
--     미매핑, 병합 비앵커 함정 회피) · K1100-01(발주 헤더 7 — 자재 카탈로그·수량·수식
--     은 시트 몫)
--  ⓑ 열람형 전환 10종(M1100-05 선례 재적용 — 이의 시 반전):
--     J3100-04(판단기준 기정의표) · M1100-06(이미지 75장 절차도) · L3100-05(관리번호
--     코드표) · L3100-06(합부판정 기준표) · M4100-05(구역도 이미지 6면) ·
--     A8101-01(674행 책자형 문서) · K1100-07/08/09(계약서·협정서 조문 전문 —
--     검수회신_4_5배치 §1 계약서 열람형 사용자 확정 선례 직적용) ·
--     A7100-01(서약서 — 계약서 하위유형의 첫 '서약서' 변형: 서명·인감 동선.
--     사후 확인형 판정 동반, 검수요청 §3)
--  ⓒ 발견 1건(수정 보류 — 검수요청 기록): H-3100 마스터에 "고객만족도 평가서
--     (실   적) (H3100-05)" = 종업원 만족도 보고서와 코드 중복 별개 양식(B2300-3 유형).
--
-- 안전: 대상 전 종 form_submissions 0건 실측(사무실 7/29) — DELETE+INSERT 무손실.
-- 멱등: 재실행 동일. ⚠️W4 설치판 재빌드 범위 0113+.
-- ============================================================

-- ════════════════ ⓐ 진행 17종 ════════════════

-- ── ① J1100-14 고객 접수 도면 검토서 — 좌면 추출 템플릿 + 문서형 ──
UPDATE forms SET
  description='추출 정본 — 6배치(260729) 필드 완결: 5페이지 도면 검토서. 실측 반전 — 마스터 시트가 좌면(빈 틀)+우면(작성 예시 기록) 2면 배치라 좌면만 추출(예시·도면 이미지 자연 분리). 치수 검토표(4·5면)·도면 첨부는 시트 몫.',
  template_path='templates/batch6/J1100-14_도면검토서.xlsx'
WHERE code='J1100-14';

DELETE FROM form_fields WHERE form_code='J1100-14';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J1100-14','도면번호','Drawing No.','text','도면 정보',NULL,1,'frame'),
 ('J1100-14','부품번호','Part No','text','도면 정보',NULL,2,'frame'),
 ('J1100-14','부품명','Part Name','text','도면 정보',NULL,3,'frame'),
 ('J1100-14','PO번호','PO No','text','도면 정보',NULL,4,'frame'),
 ('J1100-14','EO번호','EO No','text','도면 정보',NULL,5,'frame'),
 ('J1100-14','EO일자','EO DATE','date','도면 정보',NULL,6,'fact'),
 ('J1100-14','고객사','Customer','text','도면 정보',NULL,7,'frame'),
 ('J1100-14','최종검토결과','최종 검토 결과','textarea','검토 (1면)',NULL,8,NULL),
 ('J1100-14','명시내용2면','도면 내 명시 내용 (2면)','textarea','검토 (2면)',NULL,9,NULL),
 ('J1100-14','검토결과2면','검토 결과 (2면)','textarea','검토 (2면)',NULL,10,NULL),
 ('J1100-14','개선방안2면','검토 문제점 개선 방안 (2면)','textarea','검토 (2면)',NULL,11,NULL),
 ('J1100-14','명시내용3면','도면 내 명시 내용 (3면)','textarea','검토 (3면)',NULL,12,NULL),
 ('J1100-14','작성자','작성자','auto','결재',NULL,13,'frame');

DELETE FROM form_cell_map WHERE form_code='J1100-14';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('J1100-14','도면번호','Drawing No.','AM5','text',1),
 ('J1100-14','부품번호','Part No','AM7','text',2),
 ('J1100-14','부품명','Part Name','AM9','text',3),
 ('J1100-14','PO번호','PO No','AM11','text',4),
 ('J1100-14','EO번호','EO No','AM13','text',5),
 ('J1100-14','EO일자','EO DATE','AM15','date',6),
 ('J1100-14','고객사','Customer','AM17','text',7),
 ('J1100-14','최종검토결과','최종 검토 결과','A19','textarea',8),
 ('J1100-14','명시내용2면','도면 내 명시 내용 (2면)','A28','textarea',9),
 ('J1100-14','검토결과2면','검토 결과 (2면)','A37','textarea',10),
 ('J1100-14','개선방안2면','검토 문제점 개선 방안 (2면)','A44','textarea',11),
 ('J1100-14','명시내용3면','도면 내 명시 내용 (3면)','A53','textarea',12),
 ('J1100-14','작성자','작성자','AN2','text',13);
DELETE FROM form_grid_spec WHERE form_code='J1100-14';
DELETE FROM form_grid_columns WHERE form_code='J1100-14';

-- ── ② J3100-08 4M 변경 마스터리스트 — 0065 설계본 정비 + 대장 grid ──
UPDATE forms SET
  description='설계 정본 — 6배치(260729) 필드 완결: 4M·설계변경 마스터리스트(0065 설계본, 파일명 구코드 09_..._J3100-05 = 코드충돌 재부여 잔재). 양식번호 J3100-08 정정·예시행 클리어(gen-batch6).'
WHERE code='J3100-08';

DELETE FROM form_fields WHERE form_code='J3100-08';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J3100-08','rows','변경 이력','grid','변경 이력',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='J3100-08';
DELETE FROM form_grid_spec WHERE form_code='J3100-08';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('J3100-08','rows',4,1,26);
DELETE FROM form_grid_columns WHERE form_code='J3100-08';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('J3100-08','rows','관리번호','No','A','text',1),
 ('J3100-08','rows','발생일','발생일','B','date',2),
 ('J3100-08','rows','구분4M','구분(4M)','C','text',3),
 ('J3100-08','rows','변경내용','변경 내용','D','text',4),
 ('J3100-08','rows','발생원','발생원(부서/기록)','E','text',5),
 ('J3100-08','rows','유형분류','유형분류(판단표 코드)','F','text',6),
 ('J3100-08','rows','고객통보필요','고객통보 필요여부','G','text',7),
 ('J3100-08','rows','고객통보일','고객 통보일','H','text',8),
 ('J3100-08','rows','고객승인일','고객 승인일(승인 No.)','I','text',9),
 ('J3100-08','rows','초기유동관리','초기유동관리(기간/결과)','J','text',10),
 ('J3100-08','rows','종결일','종결일','K','text',11),
 ('J3100-08','rows','담당','담당','L','text',12),
 ('J3100-08','rows','비고','비고','M','text',13);

-- ── ③ A8100-01 RISK 분석표 — 시트명 정정 추출 + 분석 grid(위험지수 수식 보존) ──
UPDATE forms SET
  description='추출 정본 — 6배치(260729) 필드 완결: 프로세스 리스크 분석표. 마스터 시트명 한 자리 코드("A8100-1"+"_") 정정 추출본 + 예시 기록 클리어. 위험지수(J·Q열) 수식 보존 미매핑.',
  template_path='templates/batch6/A8100-01_RISK분석표.xlsx'
WHERE code='A8100-01';

DELETE FROM form_fields WHERE form_code='A8100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A8100-01','부서명','부서명','text','대상',NULL,1,'frame'),
 ('A8100-01','프로세스명','프로세스명','text','대상',NULL,2,'frame'),
 ('A8100-01','작성일자','작성 일자','date','대상',NULL,3,'fact'),
 ('A8100-01','rows','리스크 분석','grid','리스크 분석',NULL,4,NULL);

DELETE FROM form_cell_map WHERE form_code='A8100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A8100-01','부서명','부서명','C2','text',1),
 ('A8100-01','프로세스명','프로세스명','G2','text',2),
 ('A8100-01','작성일자','작성 일자','M2','date',3);
DELETE FROM form_grid_spec WHERE form_code='A8100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('A8100-01','rows',5,1,19);
DELETE FROM form_grid_columns WHERE form_code='A8100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A8100-01','rows','NO','NO','A','text',1),
 ('A8100-01','rows','분야','분야또는 활동','B','text',2),
 ('A8100-01','rows','예상리스크','예상되는 리스크','C','text',3),
 ('A8100-01','rows','영향','리스크의 영향','D','text',4),
 ('A8100-01','rows','심각도','심각도','E','number',5),
 ('A8100-01','rows','발생원인','리스크 발생 원인','F','text',6),
 ('A8100-01','rows','발생도','발생도','G','number',7),
 ('A8100-01','rows','현재관리','현재의 관리','H','text',8),
 ('A8100-01','rows','긴급도','긴급도','I','number',9),
 ('A8100-01','rows','대응방안','대응 방안','K','text',10),
 ('A8100-01','rows','추가조치','추가로 필요한 조치','L','text',11),
 ('A8100-01','rows','조치내용','조치내용','M','text',12),
 ('A8100-01','rows','조치후심각도','조치후 심각도','N','number',13),
 ('A8100-01','rows','조치후발생도','조치후 발생도','O','number',14),
 ('A8100-01','rows','조치후긴급도','조치후 긴급도','P','number',15);

-- ── ④ M4200-01 조도측정 체크시트 — 마스터 직접(정밀인발 인발반 시트) 최소 매핑 ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 조도 측정 체크시트. 8사업부 변형 시트 중 resolveSheet 첫 시트(정밀인발(인발)) 기준 측정값 14공정 매핑 — 타 사업부 시트는 시트 수기(한계 명기). 조도 기준(최저/표준/최대)은 시트 프리셋.'
WHERE code='M4200-01';

DELETE FROM form_fields WHERE form_code='M4200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M4200-01','측정값01','측정값(화성처리)','number','측정값 — 정밀인발(인발반)',NULL,1,'fact'),
 ('M4200-01','측정값02','측정값(구부 1호기)','number','측정값 — 정밀인발(인발반)',NULL,2,'fact'),
 ('M4200-01','측정값03','측정값(구부 4호기)','number','측정값 — 정밀인발(인발반)',NULL,3,'fact'),
 ('M4200-01','측정값04','측정값(스웨이징기)','number','측정값 — 정밀인발(인발반)',NULL,4,'fact'),
 ('M4200-01','측정값05','측정값(인발 3호기)','number','측정값 — 정밀인발(인발반)',NULL,5,'fact'),
 ('M4200-01','측정값06','측정값(인발 1호기)','number','측정값 — 정밀인발(인발반)',NULL,6,'fact'),
 ('M4200-01','측정값07','측정값(인발 2호기)','number','측정값 — 정밀인발(인발반)',NULL,7,'fact'),
 ('M4200-01','측정값08','측정값(인발 5호기)','number','측정값 — 정밀인발(인발반)',NULL,8,'fact'),
 ('M4200-01','측정값09','측정값(교정 1호기)','number','측정값 — 정밀인발(인발반)',NULL,9,'fact'),
 ('M4200-01','측정값10','측정값(교정 2호기)','number','측정값 — 정밀인발(인발반)',NULL,10,'fact'),
 ('M4200-01','측정값11','측정값(교정 3호기)','number','측정값 — 정밀인발(인발반)',NULL,11,'fact'),
 ('M4200-01','측정값12','측정값(절단 2호기)','number','측정값 — 정밀인발(인발반)',NULL,12,'fact'),
 ('M4200-01','측정값13','측정값(절단 1호기)','number','측정값 — 정밀인발(인발반)',NULL,13,'fact'),
 ('M4200-01','측정값14','측정값(탈지)','number','측정값 — 정밀인발(인발반)',NULL,14,'fact'),
 ('M4200-01','작성자','작성자','auto','결재',NULL,15,'frame');

DELETE FROM form_cell_map WHERE form_code='M4200-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M4200-01','측정값01','측정값(화성처리)','O23','text',1),
 ('M4200-01','측정값02','측정값(구부 1호기)','O25','text',2),
 ('M4200-01','측정값03','측정값(구부 4호기)','O27','text',3),
 ('M4200-01','측정값04','측정값(스웨이징기)','O29','text',4),
 ('M4200-01','측정값05','측정값(인발 3호기)','O31','text',5),
 ('M4200-01','측정값06','측정값(인발 1호기)','O33','text',6),
 ('M4200-01','측정값07','측정값(인발 2호기)','O35','text',7),
 ('M4200-01','측정값08','측정값(인발 5호기)','AF23','text',8),
 ('M4200-01','측정값09','측정값(교정 1호기)','AF25','text',9),
 ('M4200-01','측정값10','측정값(교정 2호기)','AF27','text',10),
 ('M4200-01','측정값11','측정값(교정 3호기)','AF29','text',11),
 ('M4200-01','측정값12','측정값(절단 2호기)','AF31','text',12),
 ('M4200-01','측정값13','측정값(절단 1호기)','AF33','text',13),
 ('M4200-01','측정값14','측정값(탈지)','AF35','text',14),
 ('M4200-01','작성자','작성자','Y2','text',15);
DELETE FROM form_grid_spec WHERE form_code='M4200-01';
DELETE FROM form_grid_columns WHERE form_code='M4200-01';

-- ── ⑤⑥ M4100-01/02 3정 5S 진단 SHEET — 마스터 직접 + 진단 grid(25항목, 소계 수식 보존) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 사무용 3정 5S 진단 SHEET. 점수·점검결과 25항목 grid(평가 항목·배점 시트 프리셋, 미입력 항목은 프리셋 0 잔존 — 한계 명기). 소계(T33) 수식 보존.'
WHERE code='M4100-01';
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 현장용 3정 5S 진단 SHEET. M4100-01 동형(앵커 동일 실측).'
WHERE code='M4100-02';

DELETE FROM form_fields WHERE form_code IN ('M4100-01','M4100-02');
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M4100-01','점검일자','점검 일자','date','점검 개요',NULL,1,'fact'),
 ('M4100-01','사업부명','사업부명','text','점검 개요',NULL,2,'frame'),
 ('M4100-01','점검자','점검자','text','점검 개요',NULL,3,'frame'),
 ('M4100-01','rows','진단 항목','grid','진단',NULL,4,NULL),
 ('M4100-01','작성자','작성자','auto','결재',NULL,5,'frame'),
 ('M4100-02','점검일자','점검 일자','date','점검 개요',NULL,1,'fact'),
 ('M4100-02','사업부명','사업부/조명','text','점검 개요',NULL,2,'frame'),
 ('M4100-02','점검자','점검자','text','점검 개요',NULL,3,'frame'),
 ('M4100-02','rows','진단 항목','grid','진단',NULL,4,NULL),
 ('M4100-02','작성자','작성자','auto','결재',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code IN ('M4100-01','M4100-02');
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M4100-01','점검일자','점검 일자','E4','date',1),
 ('M4100-01','사업부명','사업부명','E5','text',2),
 ('M4100-01','점검자','점검자','U5','text',3),
 ('M4100-01','작성자','작성자','Y2','text',4),
 ('M4100-02','점검일자','점검 일자','E4','date',1),
 ('M4100-02','사업부명','사업부/조명','E5','text',2),
 ('M4100-02','점검자','점검자','U5','text',3),
 ('M4100-02','작성자','작성자','Y2','text',4);
DELETE FROM form_grid_spec WHERE form_code IN ('M4100-01','M4100-02');
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M4100-01','rows',8,1,25),
 ('M4100-02','rows',8,1,25);
DELETE FROM form_grid_columns WHERE form_code IN ('M4100-01','M4100-02');
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M4100-01','rows','점수','점 수','T','number',1),
 ('M4100-01','rows','점검결과','점검결과(미흡/우수사항)','V','text',2),
 ('M4100-02','rows','점수','점 수','T','number',1),
 ('M4100-02','rows','점검결과','점검결과(미흡/우수사항)','V','text',2);

-- ── ⑦ M4100-03 3정 5S 평가 보고서 — 마스터 직접 문서형(평가요소 5블록+종합) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 3정 5S 평가 보고서. 평가요소 5블록(정리·정돈·청소·청결·습관화) 시정및건의/비고 + 종합의견 문서형 매핑.'
WHERE code='M4100-03';

DELETE FROM form_fields WHERE form_code='M4100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M4100-03','평가일자','평가 일자','date','개요',NULL,1,'fact'),
 ('M4100-03','작성일자','작성 일자','date','개요',NULL,2,'fact'),
 ('M4100-03','사업부','사업부/조명','text','개요',NULL,3,'frame'),
 ('M4100-03','점검자','점검자','text','개요',NULL,4,'frame'),
 ('M4100-03','시정건의1','시정 및 건의(정리)','textarea','평가요소',NULL,5,NULL),
 ('M4100-03','비고1','비고(정리)','text','평가요소',NULL,6,NULL),
 ('M4100-03','시정건의2','시정 및 건의(정돈)','textarea','평가요소',NULL,7,NULL),
 ('M4100-03','비고2','비고(정돈)','text','평가요소',NULL,8,NULL),
 ('M4100-03','시정건의3','시정 및 건의(청소)','textarea','평가요소',NULL,9,NULL),
 ('M4100-03','비고3','비고(청소)','text','평가요소',NULL,10,NULL),
 ('M4100-03','시정건의4','시정 및 건의(청결)','textarea','평가요소',NULL,11,NULL),
 ('M4100-03','비고4','비고(청결)','text','평가요소',NULL,12,NULL),
 ('M4100-03','시정건의5','시정 및 건의(습관화)','textarea','평가요소',NULL,13,NULL),
 ('M4100-03','비고5','비고(습관화)','text','평가요소',NULL,14,NULL),
 ('M4100-03','종합의견','종합의견(평점포함)','textarea','종합',NULL,15,NULL),
 ('M4100-03','종합비고','비고(종합)','text','종합',NULL,16,NULL),
 ('M4100-03','작성자','작성자','auto','결재',NULL,17,'frame');

DELETE FROM form_cell_map WHERE form_code='M4100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M4100-03','평가일자','평가 일자','I4','date',1),
 ('M4100-03','작성일자','작성 일자','V4','date',2),
 ('M4100-03','사업부','사업부/조명','I5','text',3),
 ('M4100-03','점검자','점검자','V5','text',4),
 ('M4100-03','시정건의1','시정 및 건의(정리)','I7','textarea',5),
 ('M4100-03','비고1','비고(정리)','AA7','text',6),
 ('M4100-03','시정건의2','시정 및 건의(정돈)','I11','textarea',7),
 ('M4100-03','비고2','비고(정돈)','AA11','text',8),
 ('M4100-03','시정건의3','시정 및 건의(청소)','I15','textarea',9),
 ('M4100-03','비고3','비고(청소)','AA15','text',10),
 ('M4100-03','시정건의4','시정 및 건의(청결)','I19','textarea',11),
 ('M4100-03','비고4','비고(청결)','AA19','text',12),
 ('M4100-03','시정건의5','시정 및 건의(습관화)','I23','textarea',13),
 ('M4100-03','비고5','비고(습관화)','AA23','text',14),
 ('M4100-03','종합의견','종합의견(평점포함)','I27','textarea',15),
 ('M4100-03','종합비고','비고(종합)','AA27','text',16),
 ('M4100-03','작성자','작성자','X2','text',17);
DELETE FROM form_grid_spec WHERE form_code='M4100-03';
DELETE FROM form_grid_columns WHERE form_code='M4100-03';

-- ── ⑧ M4100-04 3정 5S 평가지적 및 시정대책서 — 마스터 직접 문서형 ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 3정 5S 지적 및 시정 대책서. 지적사항/개선전·시정대책/개선후 문서형 매핑. 본문 인사말(7~8행)은 시트 프리셋.'
WHERE code='M4100-04';

DELETE FROM form_fields WHERE form_code='M4100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M4100-04','평가일자','평가 일자','date','개요',NULL,1,'fact'),
 ('M4100-04','작성일자','작성 일자','date','개요',NULL,2,'fact'),
 ('M4100-04','사업부','사업부/조명','text','개요',NULL,3,'frame'),
 ('M4100-04','점검자','점검자','text','개요',NULL,4,'frame'),
 ('M4100-04','접수번호','접수 번호','text','개요',NULL,5,'frame'),
 ('M4100-04','접수자','접수자','text','개요',NULL,6,'frame'),
 ('M4100-04','청정요소','청정요소','text','지적',NULL,7,NULL),
 ('M4100-04','지적사항','지적 사항','textarea','지적',NULL,8,NULL),
 ('M4100-04','개선전','개선 전','textarea','지적',NULL,9,NULL),
 ('M4100-04','시정대책','시정 및 대책','textarea','대책',NULL,10,NULL),
 ('M4100-04','개선후','개선 후','textarea','대책',NULL,11,NULL),
 ('M4100-04','시정일자','시정일자','date','대책',NULL,12,'fact'),
 ('M4100-04','작성자','작성자','auto','결재',NULL,13,'frame');

DELETE FROM form_cell_map WHERE form_code='M4100-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M4100-04','평가일자','평가 일자','I4','date',1),
 ('M4100-04','작성일자','작성 일자','V4','date',2),
 ('M4100-04','사업부','사업부/조명','I5','text',3),
 ('M4100-04','점검자','점검자','V5','text',4),
 ('M4100-04','접수번호','접수 번호','I6','text',5),
 ('M4100-04','접수자','접수자','V6','text',6),
 ('M4100-04','청정요소','청정요소','G10','text',7),
 ('M4100-04','지적사항','지적 사항','B11','textarea',8),
 ('M4100-04','개선전','개선 전','M10','textarea',9),
 ('M4100-04','시정대책','시정 및 대책','B25','textarea',10),
 ('M4100-04','개선후','개선 후','M24','textarea',11),
 ('M4100-04','시정일자','시정일자','G24','date',12),
 ('M4100-04','작성자','작성자','X2','text',13);
DELETE FROM form_grid_spec WHERE form_code='M4100-04';
DELETE FROM form_grid_columns WHERE form_code='M4100-04';

-- ── ⑨ A1100-01 개인별 업무 분장표 — 첫 블록 추출 + 담당 12블록 문서형 ──
UPDATE forms SET
  description='추출 정본 — 6배치(260729) 필드 완결: 사업부 개인별 업무 분장표. 첫 블록(빈 틀)만 추출(27행~ 실기록 사례 분리, B2100-04 선례). 담당 12블록(담당자명+주요업무). 제목·작성자/작성일(라벨 내장 병합)·인원현황 표는 시트 수기.',
  template_path='templates/batch6/A1100-01_업무분장표.xlsx'
WHERE code='A1100-01';

DELETE FROM form_fields WHERE form_code='A1100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A1100-01','부서명','부서명','text','부서',NULL,1,'frame'),
 ('A1100-01','사업부장','사업부장','text','부서',NULL,2,'frame'),
 ('A1100-01','담당자1','담당자(1)','text','담당 1~6',NULL,3,'frame'),
 ('A1100-01','주업무1','주요 업무(1)','textarea','담당 1~6',NULL,4,NULL),
 ('A1100-01','담당자2','담당자(2)','text','담당 1~6',NULL,5,'frame'),
 ('A1100-01','주업무2','주요 업무(2)','textarea','담당 1~6',NULL,6,NULL),
 ('A1100-01','담당자3','담당자(3)','text','담당 1~6',NULL,7,'frame'),
 ('A1100-01','주업무3','주요 업무(3)','textarea','담당 1~6',NULL,8,NULL),
 ('A1100-01','담당자4','담당자(4)','text','담당 1~6',NULL,9,'frame'),
 ('A1100-01','주업무4','주요 업무(4)','textarea','담당 1~6',NULL,10,NULL),
 ('A1100-01','담당자5','담당자(5)','text','담당 1~6',NULL,11,'frame'),
 ('A1100-01','주업무5','주요 업무(5)','textarea','담당 1~6',NULL,12,NULL),
 ('A1100-01','담당자6','담당자(6)','text','담당 1~6',NULL,13,'frame'),
 ('A1100-01','주업무6','주요 업무(6)','textarea','담당 1~6',NULL,14,NULL),
 ('A1100-01','담당자7','담당자(7)','text','담당 7~12',NULL,15,'frame'),
 ('A1100-01','주업무7','주요 업무(7)','textarea','담당 7~12',NULL,16,NULL),
 ('A1100-01','담당자8','담당자(8)','text','담당 7~12',NULL,17,'frame'),
 ('A1100-01','주업무8','주요 업무(8)','textarea','담당 7~12',NULL,18,NULL),
 ('A1100-01','담당자9','담당자(9)','text','담당 7~12',NULL,19,'frame'),
 ('A1100-01','주업무9','주요 업무(9)','textarea','담당 7~12',NULL,20,NULL),
 ('A1100-01','담당자10','담당자(10)','text','담당 7~12',NULL,21,'frame'),
 ('A1100-01','주업무10','주요 업무(10)','textarea','담당 7~12',NULL,22,NULL),
 ('A1100-01','담당자11','담당자(11)','text','담당 7~12',NULL,23,'frame'),
 ('A1100-01','주업무11','주요 업무(11)','textarea','담당 7~12',NULL,24,NULL),
 ('A1100-01','담당자12','담당자(12)','text','담당 7~12',NULL,25,'frame'),
 ('A1100-01','주업무12','주요 업무(12)','textarea','담당 7~12',NULL,26,NULL),
 ('A1100-01','작성자','작성자','auto','결재',NULL,27,'frame');

DELETE FROM form_cell_map WHERE form_code='A1100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A1100-01','부서명','부서명','F13','text',1),
 ('A1100-01','사업부장','사업부장','S11','text',2),
 ('A1100-01','담당자1','담당자(1)','B15','text',3),
 ('A1100-01','주업무1','주요 업무(1)','C16','textarea',4),
 ('A1100-01','담당자2','담당자(2)','I15','text',5),
 ('A1100-01','주업무2','주요 업무(2)','J16','textarea',6),
 ('A1100-01','담당자3','담당자(3)','Q15','text',7),
 ('A1100-01','주업무3','주요 업무(3)','R16','textarea',8),
 ('A1100-01','담당자4','담당자(4)','X15','text',9),
 ('A1100-01','주업무4','주요 업무(4)','Y16','textarea',10),
 ('A1100-01','담당자5','담당자(5)','AF15','text',11),
 ('A1100-01','주업무5','주요 업무(5)','AG16','textarea',12),
 ('A1100-01','담당자6','담당자(6)','AM15','text',13),
 ('A1100-01','주업무6','주요 업무(6)','AN16','textarea',14),
 ('A1100-01','담당자7','담당자(7)','B21','text',15),
 ('A1100-01','주업무7','주요 업무(7)','C22','textarea',16),
 ('A1100-01','담당자8','담당자(8)','I21','text',17),
 ('A1100-01','주업무8','주요 업무(8)','J22','textarea',18),
 ('A1100-01','담당자9','담당자(9)','Q21','text',19),
 ('A1100-01','주업무9','주요 업무(9)','R22','textarea',20),
 ('A1100-01','담당자10','담당자(10)','X21','text',21),
 ('A1100-01','주업무10','주요 업무(10)','Y22','textarea',22),
 ('A1100-01','담당자11','담당자(11)','AF21','text',23),
 ('A1100-01','주업무11','주요 업무(11)','AG22','textarea',24),
 ('A1100-01','담당자12','담당자(12)','AM21','text',25),
 ('A1100-01','주업무12','주요 업무(12)','AN22','textarea',26),
 ('A1100-01','작성자','작성자','AG2','text',27);
DELETE FROM form_grid_spec WHERE form_code='A1100-01';
DELETE FROM form_grid_columns WHERE form_code='A1100-01';

-- ── ⑩ H2100-01 일일 출고 계획서(-필라) — 마스터 직접 대장 grid 전열(L1200-10 선례) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 일일 출고 계획서(필라 시트 — resolveSheet 첫 매치). 대장 13열 전열 grid. PART/납품처/일자(라벨 내장 병합)는 시트 수기(한계 명기). 인발_강관 변형 시트는 별도 form 없음.'
WHERE code='H2100-01';

DELETE FROM form_fields WHERE form_code='H2100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H2100-01','rows','출고 계획','grid','출고 계획',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='H2100-01';
DELETE FROM form_grid_spec WHERE form_code='H2100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('H2100-01','rows',5,1,20);
DELETE FROM form_grid_columns WHERE form_code='H2100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('H2100-01','rows','NO','NO','A','text',1),
 ('H2100-01','rows','구분','구분','B','text',2),
 ('H2100-01','rows','차종','차종','C','text',3),
 ('H2100-01','rows','품번','품번','D','text',4),
 ('H2100-01','rows','규격','규격','E','text',5),
 ('H2100-01','rows','단가','단가','F','text',6),
 ('H2100-01','rows','Pallet','Pallet','G','text',7),
 ('H2100-01','rows','발주량','발주량','H','text',8),
 ('H2100-01','rows','LOT','LOT','I','text',9),
 ('H2100-01','rows','납품1차','1차납품','J','text',10),
 ('H2100-01','rows','납품2차','2차납품','K','text',11),
 ('H2100-01','rows','납품3차','3차납품','L','text',12),
 ('H2100-01','rows','비고','비고','M','text',13);

-- ── ⑪ H2100-02 월 납품량 분석 보고서 — 최소 매핑(H3200-01 선례) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 월 납품량 분석 보고서. 최소 매핑 2(목표금액·작성자) — 일자별 수주/출고/납입율 매트릭스(수식 다수)·표제 (00월)은 시트 몫.'
WHERE code='H2100-02';

DELETE FROM form_fields WHERE form_code='H2100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H2100-02','목표금액','목표 금액','text','개요',NULL,1,'fact'),
 ('H2100-02','작성자','작성자','auto','결재',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='H2100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('H2100-02','목표금액','목표 금액','I5','text',1),
 ('H2100-02','작성자','작성자','CV4','text',2);
DELETE FROM form_grid_spec WHERE form_code='H2100-02';
DELETE FROM form_grid_columns WHERE form_code='H2100-02';

-- ── ⑫ H3100-05 종업원 만족도 조사결과 보고서 — 마스터 직접 문서형 최소 매핑 ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 종업원 만족도 조사결과 보고서(시트 "1" — resolveSheet 첫 매치, 시트 "2"·"3"은 수식 연동 자동). 배포/회수(라벨 내장 셀)·집계 매트릭스는 시트 몫. 값 앵커는 라벨 오버플로 회피(J1102-03 선례).'
WHERE code='H3100-05';

DELETE FROM form_fields WHERE form_code='H3100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H3100-05','조사일자','조사일자','date','조사 개요',NULL,1,'fact'),
 ('H3100-05','작성일자','작성일자','date','조사 개요',NULL,2,'fact'),
 ('H3100-05','조사대상','조사대상','text','조사 개요',NULL,3,'frame'),
 ('H3100-05','주관부서','주관부서','text','조사 개요',NULL,4,'frame'),
 ('H3100-05','총원','총원(명)','number','회수 현황',NULL,5,'fact'),
 ('H3100-05','평가인원','평가인원(명)','number','회수 현황',NULL,6,'fact'),
 ('H3100-05','참여율','평가 참여율(%)','text','회수 현황',NULL,7,'fact'),
 ('H3100-05','작성자','작성자','auto','결재',NULL,8,'frame');

DELETE FROM form_cell_map WHERE form_code='H3100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('H3100-05','조사일자','조사일자','E7','date',1),
 ('H3100-05','작성일자','작성일자','L7','date',2),
 ('H3100-05','조사대상','조사대상','E8','text',3),
 ('H3100-05','주관부서','주관부서','E10','text',4),
 ('H3100-05','총원','총원(명)','K23','text',5),
 ('H3100-05','평가인원','평가인원(명)','K24','text',6),
 ('H3100-05','참여율','평가 참여율(%)','K25','text',7),
 ('H3100-05','작성자','작성자','L8','text',8);
DELETE FROM form_grid_spec WHERE form_code='H3100-05';
DELETE FROM form_grid_columns WHERE form_code='H3100-05';

-- ── ⑬⑭ H3100-06/07 종업원 동기부여 계획서/실적평가서 — grid(비고 G열=4행 병합 미매핑) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 종업원 동기부여 계획서. 항목(지원금·사내행사·복지시설·작업환경개선)은 시트 프리셋. 비고열(G)은 4행 병합 — 병합 비앵커 함정 회피로 미매핑(시트 수기).'
WHERE code='H3100-06';
UPDATE forms SET
  description='정본 완결 — 6배치(260729): 종업원 동기부여 실적평가서. H3100-06 동형(추진결과/조치계획 열).'
WHERE code='H3100-07';

DELETE FROM form_fields WHERE form_code IN ('H3100-06','H3100-07');
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H3100-06','작성일자','작성일자','date','개요',NULL,1,'fact'),
 ('H3100-06','rows','추진 항목','grid','추진 계획',NULL,2,NULL),
 ('H3100-06','작성자','작성자','auto','결재',NULL,3,'frame'),
 ('H3100-07','작성일자','작성일자','date','개요',NULL,1,'fact'),
 ('H3100-07','rows','추진 항목','grid','추진 실적',NULL,2,NULL),
 ('H3100-07','작성자','작성자','auto','결재',NULL,3,'frame');

DELETE FROM form_cell_map WHERE form_code IN ('H3100-06','H3100-07');
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('H3100-06','작성일자','작성일자','D3','date',1),
 ('H3100-06','작성자','작성자','I23','text',2),
 ('H3100-07','작성일자','작성일자','D3','date',1),
 ('H3100-07','작성자','작성자','I23','text',2);
DELETE FROM form_grid_spec WHERE form_code IN ('H3100-06','H3100-07');
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('H3100-06','rows',5,1,16),
 ('H3100-07','rows',5,1,16);
DELETE FROM form_grid_columns WHERE form_code IN ('H3100-06','H3100-07');
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('H3100-06','rows','세부추진항목','세부 추진항목','D','text',1),
 ('H3100-06','rows','추진일정','추진일정','E','text',2),
 ('H3100-06','rows','소요비용','소요비용 현황','F','text',3),
 ('H3100-07','rows','세부추진항목','세부추진 항목','D','text',1),
 ('H3100-07','rows','추진결과','추진 결과','E','text',2),
 ('H3100-07','rows','조치계획','조치 계획','F','text',3);

-- ── ⑮ K1100-01 원자재 입고 요청서 — 발주 헤더 최소 매핑(카탈로그·수량은 시트 몫) ──
UPDATE forms SET
  description='정본 완결 — 6배치(260729): PURCHASE ORDER 원자재 입고 요청서. 발주 헤더 7필드 — 자재 카탈로그(강종/재종/규격 프리셋)·발주량·중량/금액 수식은 시트 몫(맹목 grid 매핑 회피). 값 앵커는 라벨 오버플로 회피(J1102-03 선례). 당사 정보(상호~담당자)는 시트 프리셋.'
WHERE code='K1100-01';

DELETE FROM form_fields WHERE form_code='K1100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1100-01','업체명','업체명','text','발주 개요',NULL,1,'frame'),
 ('K1100-01','주소','주소','text','발주 개요',NULL,2,'frame'),
 ('K1100-01','전화','TEL','text','발주 개요',NULL,3,'frame'),
 ('K1100-01','팩스','FAX','text','발주 개요',NULL,4,'frame'),
 ('K1100-01','담당자','담당자','text','발주 개요',NULL,5,'frame'),
 ('K1100-01','작성일자','작성일자','date','발주 개요',NULL,6,'fact'),
 ('K1100-01','납기','납기','text','발주 개요',NULL,7,'fact');

DELETE FROM form_cell_map WHERE form_code='K1100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1100-01','업체명','업체명','D5','text',1),
 ('K1100-01','주소','주소','D6','text',2),
 ('K1100-01','전화','TEL','D7','text',3),
 ('K1100-01','팩스','FAX','D8','text',4),
 ('K1100-01','담당자','담당자','D9','text',5),
 ('K1100-01','작성일자','작성일자','D10','date',6),
 ('K1100-01','납기','납기','D11','text',7);
DELETE FROM form_grid_spec WHERE form_code='K1100-01';
DELETE FROM form_grid_columns WHERE form_code='K1100-01';

-- ── ⑯ B2300-08 정성품질 순회 점검 시트 — ★신규 등록(사용자 결정 ⓐ, 검수회신_4_5배치 §4) ──
DELETE FROM form_fields WHERE form_code='B2300-08';
DELETE FROM form_cell_map WHERE form_code='B2300-08';
DELETE FROM form_grid_spec WHERE form_code='B2300-08';
DELETE FROM form_grid_columns WHERE form_code='B2300-08';
DELETE FROM forms WHERE code='B2300-08';
INSERT INTO forms (code, name, reg_code, description, approvals_json, scope, resp_dept, iatf_clause, template_path) VALUES
 ('B2300-08','정성품질 순회 점검 시트','B-2300',
  '신규 등록 — 6배치(260729): 5배치 발견 코드 중복 별개 양식(마스터 시트명 "B2300-3")의 재부여 등록분(사용자 결정 ⓐ). 점검 항목 16(작업환경~재발방지) 시트 프리셋, 라인별(TSW01~03) 점검결과 grid. 점검일/점검자(라벨 내장 병합)는 시트 수기.',
  '["담당","사업부장","대표이사"]','공통','품질보증팀','10','templates/batch6/B2300-08_순회점검시트.xlsx');
INSERT OR IGNORE INTO process_forms (process_code, form_code, sort_order) VALUES ('SP-03','B2300-08',0);

INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-08','rows','점검 결과','grid','점검 결과',NULL,1,NULL),
 ('B2300-08','작성자','작성자','auto','결재',NULL,2,'frame');

INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-08','작성자','작성자','AQ2','text',1);
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B2300-08','rows',7,1,17);
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B2300-08','rows','결과TSW01','점검결과(TSW01)','AB','text',1),
 ('B2300-08','rows','결과TSW02','점검결과(TSW02)','AH','text',2),
 ('B2300-08','rows','결과TSW03','점검결과(TSW03)','AN','text',3),
 ('B2300-08','rows','결과예비','점검결과(예비란)','AT','text',4);

-- ── ⑰ L-4101-01 SPC 평가표 — 변환본 정본 완결(사용자 결정, 계산기형 L4102-02 선례) ──
UPDATE forms SET
  description='변환 정본 — 6배치(260729) 필드 완결: SPC 평가표(Xbar-R·Cpk 계산기). .xls 원본은 엔진 판독 불가 → LibreOffice 변환본 채택(원본 무변경·기록 클리어·통계/판정 수식 전 보존). 측정 데이터 매트릭스·통계치/판정은 시트 몫. ⚠️변환본 차트/개체 표현 차이 가능.',
  template_path='templates/batch6/L-4101-01_SPC평가표.xlsx'
WHERE code='L-4101-01';

DELETE FROM form_fields WHERE form_code='L-4101-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L-4101-01','고객사','고객사','text','대상',NULL,1,'frame'),
 ('L-4101-01','공정명','공정명','text','대상',NULL,2,'frame'),
 ('L-4101-01','부품명','부품명','text','대상',NULL,3,'frame'),
 ('L-4101-01','품번','품번','text','대상',NULL,4,'frame'),
 ('L-4101-01','측정POINT','측정 POINT','text','측정 조건',NULL,5,'frame'),
 ('L-4101-01','품질특성','품질특성','text','측정 조건',NULL,6,'frame'),
 ('L-4101-01','규격','규격(기준치)','number','측정 조건',NULL,7,'fact'),
 ('L-4101-01','공차상한','공차(+)','number','측정 조건',NULL,8,'fact'),
 ('L-4101-01','공차하한','공차(-)','number','측정 조건',NULL,9,'fact'),
 ('L-4101-01','시료수','시료수(n)','text','측정 조건',NULL,10,'frame'),
 ('L-4101-01','측정기기','측정기기','text','측정 조건',NULL,11,'frame'),
 ('L-4101-01','측정자','측정자','text','측정 조건',NULL,12,'frame'),
 ('L-4101-01','측정단위','측정단위','text','측정 조건',NULL,13,'frame'),
 ('L-4101-01','작성기간','작성기간','text','작성',NULL,14,'frame'),
 ('L-4101-01','작성부서','작성부서','text','작성',NULL,15,'frame'),
 ('L-4101-01','작성자','작성자','auto','작성',NULL,16,'frame');

DELETE FROM form_cell_map WHERE form_code='L-4101-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L-4101-01','고객사','고객사','C2','text',1),
 ('L-4101-01','공정명','공정명','C3','text',2),
 ('L-4101-01','부품명','부품명','C4','text',3),
 ('L-4101-01','품번','품번','C5','text',4),
 ('L-4101-01','측정POINT','측정 POINT','C6','text',5),
 ('L-4101-01','품질특성','품질특성','C7','text',6),
 ('L-4101-01','규격','규격(기준치)','C8','text',7),
 ('L-4101-01','공차상한','공차(+)','C9','text',8),
 ('L-4101-01','공차하한','공차(-)','C10','text',9),
 ('L-4101-01','시료수','시료수(n)','C11','text',10),
 ('L-4101-01','측정기기','측정기기','C12','text',11),
 ('L-4101-01','측정자','측정자','C13','text',12),
 ('L-4101-01','측정단위','측정단위','C14','text',13),
 ('L-4101-01','작성기간','작성기간','C15','text',14),
 ('L-4101-01','작성부서','작성부서','C16','text',15),
 ('L-4101-01','작성자','작성자','C17','text',16);
DELETE FROM form_grid_spec WHERE form_code='L-4101-01';
DELETE FROM form_grid_columns WHERE form_code='L-4101-01';

-- ════════════════ ⓑ 열람형 전환 10종 (M1100-05 선례 재적용 — 이의 시 반전) ════════════════

UPDATE forms SET description='📖 열람형(참조 문서) — 4M 변경 판단기준표: 구분(사람·설비·재료·방법)×세부내용×처리구분(●) 전 칸 기정의 기준 문서. 작성 양식 아님 — 판단 기록은 J3100-01 의뢰서·J3100-08 마스터리스트로. K2100-07 선례(6배치 260729).' WHERE code='J3100-04';
UPDATE forms SET description='📖 열람형(참조 문서) — 우발사고·이상발생 처리 절차서: 절차 도해 이미지 75장 문서(텍스트 4행뿐). 기록 동선은 부적합품 대장(B1100-13)·통보서(B1100-01)로. M2100-03-01 선례(6배치 260729).' WHERE code='M1100-06';
UPDATE forms SET description='📖 열람형(참조 문서) — 계측기 관리번호 부여 기준: 사업부 CODE·계측기 CODE 전 칸 기정의 코드표. 기록 동선은 계측기 관리대장(L3100-01)·이력카드(L3100-02)로. K2100-07 선례(6배치 260729).' WHERE code='L3100-05';
UPDATE forms SET description='📖 열람형(참조 문서) — 검교정 합부판정 기준: 계측기명×관리 최소공차×측정불확도 판정 기준 전 칸 기정의 기준표. 기록 동선은 검교정 계획서(L3100-03)로. K2100-07 선례(6배치 260729).' WHERE code='L3100-06';
UPDATE forms SET description='📖 열람형(참조 문서) — 3정5S 관리 구역도: 사업부별 구역도 이미지 6면 문서. 기록 동선은 진단 SHEET(M4100-01/02)·평가 보고서(M4100-03)로. B1100-08 선례(6배치 260729).' WHERE code='M4100-05';
UPDATE forms SET description='📖 열람형(참조 문서) — 윤리경영 행동 지침(서약서): 지침 본문 10개조 기정의 + 서약(소속/서약자/서명) — 체결은 서면·서명 동선. 계약서 열람형(L1200-08/09 사용자 확정 260729)의 서약서 하위유형 — 판정 동반(검수요청 §3, 이의 시 반전). (6배치 260729)' WHERE code='A7100-01';
UPDATE forms SET description='📖 열람형(참조 문서) — 비상사태 발생시 대응 방안: 674행 책자형 문서(목차·기본대응 절차·비상 연락체계·상황별 방안, 이미지 40장) 기정의. 기록 동선은 훈련결과 보고서(A8101-02)·평가표(A8101-03)로. M1100-05 선례(6배치 260729).' WHERE code='A8101-01';
UPDATE forms SET description='📖 열람형(참조 문서) — 기본공급 계약서: 조문 전문(제1장~ 기본 합의·개별 약정·납품 등) 기정의 법률 문서. 체결은 서면·인감 동선. 계약서 열람형 확정 선례(L1200-08/09, 260729) 직적용. (6배치 260729)' WHERE code='K1100-07';
UPDATE forms SET description='📖 열람형(참조 문서) — 클레임 보상협정서: CLAIM 정의·보상책임·인정 조문 전문 기정의 법률 문서. 체결은 서면·인감 동선. 계약서 열람형 확정 선례 직적용. (6배치 260729)' WHERE code='K1100-08';
UPDATE forms SET description='📖 열람형(참조 문서) — 품질 보증 협정서: 품질 보증 업무·실시사항·사양 확인 조문 전문 기정의 법률 문서. 체결은 서면·인감 동선. 계약서 열람형 확정 선례 직적용. (6배치 260729)' WHERE code='K1100-09';

DELETE FROM form_fields WHERE form_code IN ('J3100-04','M1100-06','L3100-05','L3100-06','M4100-05','A7100-01','A8101-01','K1100-07','K1100-08','K1100-09');
DELETE FROM form_cell_map WHERE form_code IN ('J3100-04','M1100-06','L3100-05','L3100-06','M4100-05','A7100-01','A8101-01','K1100-07','K1100-08','K1100-09');
DELETE FROM form_grid_spec WHERE form_code IN ('J3100-04','M1100-06','L3100-05','L3100-06','M4100-05','A7100-01','A8101-01','K1100-07','K1100-08','K1100-09');
DELETE FROM form_grid_columns WHERE form_code IN ('J3100-04','M1100-06','L3100-05','L3100-06','M4100-05','A7100-01','A8101-01','K1100-07','K1100-08','K1100-09');

-- ════════════════ 변경 이력(form_change_log) ════════════════
DELETE FROM form_change_log WHERE migration='0113';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('J3100-04','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(판단기준표)','실측 — 전 칸 기정의 기준 문서. K2100-07 선례 재적용(이의 시 반전)','0113'),
 ('M1100-06','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(이미지 절차도)','실측 — 이미지 75장·텍스트 4행. M2100-03-01 선례 재적용','0113'),
 ('L3100-05','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(코드표)','실측 — 사업부/계측기 CODE 전 칸 기정의. K2100-07 선례 재적용','0113'),
 ('L3100-06','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(판정 기준표)','실측 — 측정불확도 판정 기준 전 칸 기정의. K2100-07 선례 재적용','0113'),
 ('M4100-05','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(구역도 이미지)','실측 — 사업부별 구역도 이미지 6면. B1100-08 선례 재적용','0113'),
 ('A7100-01','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(서약서)','실측 — 지침 본문 기정의+서면 서명 동선. 계약서 열람형의 서약서 하위유형 — 판정 동반(이의 시 반전)','0113'),
 ('A8101-01','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(책자형 문서)','실측 — 674행·이미지 40장 대응 방안 책자. M1100-05 선례 재적용','0113'),
 ('K1100-07','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(계약서)','실측 — 조문 전문. 계약서 열람형 사용자 확정(검수회신_4_5배치 §1) 직적용','0113'),
 ('K1100-08','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(협정서)','동일 사유','0113'),
 ('K1100-09','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(협정서)','동일 사유','0113'),
 ('J1100-14','2026-07-29','template_adopt',NULL,'templates/batch6/J1100-14_도면검토서.xlsx','실측 반전 — 좌면(빈 틀)+우면(작성 예시) 2면 배치 → 좌면만 추출(예시·도면 이미지 분리)','0113'),
 ('A8100-01','2026-07-29','template_adopt',NULL,'templates/batch6/A8100-01_RISK분석표.xlsx','시트명 한 자리 코드("A8100-1_") — 정정 추출본 채택(B2300 선례) + 예시 기록 클리어','0113'),
 ('A1100-01','2026-07-29','template_adopt',NULL,'templates/batch6/A1100-01_업무분장표.xlsx','첫 블록(빈 틀)만 추출 — 27행~ 실기록 사례 분리(B2100-04 추출 선례 연장)','0113'),
 ('B2300-08','2026-07-29','register',NULL,'forms 신규 등록 + templates/batch6/B2300-08_순회점검시트.xlsx','5배치 발견 코드 중복 별개 양식 — 사용자 결정 ⓐ(B2300-08 재부여 신규 등록, 검수회신_4_5배치 §4)','0113'),
 ('J3100-08','2026-07-29','template_correct','양식번호 J3100-05(제안) + 예시행 시드 2행','J3100-08 + 예시행 클리어','0065 설계본 파일명 구코드 잔재(B1100-12/13 선례) — 양식번호 정정·예시 클리어(gen-batch6)','0113'),
 ('L-4101-01','2026-07-29','template_correct','.xls 원본(엔진 판독 불가 — 처리 보류)','LibreOffice 변환본 채택(기록 클리어·수식 보존)','사용자 결정(검수회신_4_5배치 §5) — 원본 무변경·변환본 별도 파일. Excel COM 저장 불가 실측이라 LibreOffice 경로','0113');
