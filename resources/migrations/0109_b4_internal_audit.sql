-- ============================================================
-- Migration 0109: ⓑ 4종 — 내부심사 AM용 빈 틀 신규 설계본 (2026-07-28 밤)
--
-- 코워크 판정2(7/28) 이행: A5100-03·A5100-04·A5200-03·A5200-04 = AM용 빈 틀.
-- 조건 이행: ① A-2 전부(Rev.0 마커 셀·sq_gap_forms 경로=audit 신규설계 표시·실물 대사 시 교정)
--            ② 문항·평가 구조 = 마스터 재사용(gen-b4-templates.mjs 구조 복제), 기록값만 클리어
--               (45·61·216·348셀 + A5200 계열 심사 기록 사진 24+24장 제거. 구조 보존 표본검증 50/50)
--
-- 매핑 원칙: 라벨-병합 구조라 값 셀이 없는 서술 행(갑지 개선권고·을지 감사대상 등)은 v1 미매핑
-- (캔버스 열람은 가능). 체크리스트 문항별 채점 매트릭스 = 시트 몫(F2100-10 선례).
-- 안전: 4종 전부 form_submissions 0건. 멱등: DELETE 후 INSERT.
-- ============================================================

-- ── ① A5100-03 내부심사(갑·을) 보고서 ────────────────────────
UPDATE forms SET
  template_path='templates/sq_gap_forms/17_내부심사_갑을_보고서_A5100-03.xlsx',
  description='AM용 빈 틀 신규 설계본(ⓑ 260728) — 구조=정본 재사용·기록값 클리어. 갑지(시스템 감사)+을지(공정·제품 감사) 보고서.'
WHERE code='A5100-03';

DELETE FROM form_fields WHERE form_code='A5100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5100-03','발행번호','발행 번호','text','기본 정보',NULL,1,'frame'),
 ('A5100-03','작성일자','작성 일자','date','기본 정보',NULL,2,'fact'),
 ('A5100-03','감사대상부서','감사 대상 부서','text','기본 정보',NULL,3,'frame'),
 ('A5100-03','심사일자','심사 일자','text','기본 정보',NULL,4,'frame'),
 ('A5100-03','부적합no','부적합 NO','text','기본 정보',NULL,5,'frame'),
 ('A5100-03','긍정적측면','2-1 긍정적인 측면','text','감사 결과(갑지)',NULL,6,'frame'),
 ('A5100-03','부적합내역','2-3 부적합사항 내역','text','감사 결과(갑지)',NULL,7,'frame'),
 ('A5100-03','공정감사지적_am','3. 공정감사 지적(A/M)','text','감사 결과(을지)',NULL,8,'frame'),
 ('A5100-03','제품심사결과','4. 제품심사 결과','text','감사 결과(을지)',NULL,9,'frame');

DELETE FROM form_cell_map WHERE form_code='A5100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5100-03','발행번호','발행 번호','G4','text',1),
 ('A5100-03','작성일자','작성 일자','S4','date',2),
 ('A5100-03','감사대상부서','감사 대상 부서','G5','text',3),
 ('A5100-03','심사일자','심사 일자','S5','text',4),
 ('A5100-03','부적합no','부적합 NO','S6','text',5),
 ('A5100-03','긍정적측면','2-1 긍정적인 측면','C17','text',6),
 ('A5100-03','부적합내역','2-3 부적합사항 내역','C27','text',7),
 ('A5100-03','공정감사지적_am','3. 공정감사 지적(A/M)','F58','text',8),
 ('A5100-03','제품심사결과','4. 제품심사 결과','A64','text',9);

DELETE FROM form_grid_spec WHERE form_code='A5100-03';
DELETE FROM form_grid_columns WHERE form_code='A5100-03';

-- ── ② A5100-04 내부심사(시스템) 체크리스트 ───────────────────
UPDATE forms SET
  template_path='templates/sq_gap_forms/18_내부심사_시스템_체크리스트_A5100-04.xlsx',
  description='AM용 빈 틀 신규 설계본(ⓑ 260728) — 문항 구조=정본 재사용·기록값 클리어. 상단 결과 매트릭스는 A/M행·지원부서만 앱 기입, 팀별 문항 채점은 시트 몫(매트릭스 선례).'
WHERE code='A5100-04';

DELETE FROM form_fields WHERE form_code='A5100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5100-04','심사원','심사원(팀)','text','기본 정보',NULL,1,'frame'),
 ('A5100-04','심사일자','심사 일자','date','기본 정보',NULL,2,'fact'),
 ('A5100-04','am영업평점','A/M 평점(영업팀)','text','결과 매트릭스(A/M)',NULL,3,'frame'),
 ('A5100-04','am생산평점','A/M 평점(생산팀)','text','결과 매트릭스(A/M)',NULL,4,'frame'),
 ('A5100-04','am영업지적','A/M 지적사항(영업팀)','text','결과 매트릭스(A/M)',NULL,5,'frame'),
 ('A5100-04','am생산지적','A/M 지적사항(생산팀)','text','결과 매트릭스(A/M)',NULL,6,'frame'),
 ('A5100-04','지원부서지적1','지원부서 지적(총무·구매)','text','결과 매트릭스(지원부서)',NULL,7,'frame'),
 ('A5100-04','지원부서지적2','지원부서 지적(품질)','text','결과 매트릭스(지원부서)',NULL,8,'frame');

DELETE FROM form_cell_map WHERE form_code='A5100-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5100-04','심사원','심사원(팀)','E54','text',1),
 ('A5100-04','심사일자','심사 일자','E72','date',2),
 ('A5100-04','am영업평점','A/M 평점(영업팀)','I19','text',3),
 ('A5100-04','am생산평점','A/M 평점(생산팀)','U19','text',4),
 ('A5100-04','am영업지적','A/M 지적사항(영업팀)','I20','text',5),
 ('A5100-04','am생산지적','A/M 지적사항(생산팀)','U20','text',6),
 ('A5100-04','지원부서지적1','지원부서 지적(총무·구매)','I30','text',7),
 ('A5100-04','지원부서지적2','지원부서 지적(품질)','U30','text',8);

DELETE FROM form_grid_spec WHERE form_code='A5100-04';
DELETE FROM form_grid_columns WHERE form_code='A5100-04';

-- ── ③ A5200-03 내부심사(제조) 체크리스트 ─────────────────────
UPDATE forms SET
  template_path='templates/sq_gap_forms/19_내부심사_제조_체크리스트_A5200-03.xlsx',
  description='AM용 빈 틀 신규 설계본(ⓑ 260728) — 공정 항목 구조=정본 재사용·기록값·심사 사진 클리어. 첫 블록(갑지) 앱 기입, 후속 블록은 시트 몫.'
WHERE code='A5200-03';

DELETE FROM form_fields WHERE form_code='A5200-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5200-03','평가대상명','평가 대상명','text','기본 정보',NULL,1,'frame'),
 ('A5200-03','평가일','평가일','date','기본 정보',NULL,2,'fact'),
 ('A5200-03','평가팀','평가팀','text','기본 정보',NULL,3,'frame'),
 ('A5200-03','평가자','평가자','text','기본 정보',NULL,4,'frame'),
 ('A5200-03','품명','품명','text','기본 정보',NULL,5,'frame'),
 ('A5200-03','제품규격','제품 규격','text','기본 정보',NULL,6,'frame'),
 ('A5200-03','평가요약','평가 요약','text','평가',NULL,7,'frame'),
 ('A5200-03','지적1','지적사항 1(인발공정 행)','text','공정별 지적',NULL,8,'frame'),
 ('A5200-03','지적2','지적사항 2(교정·탈지 행)','text','공정별 지적',NULL,9,'frame'),
 ('A5200-03','지적3','지적사항 3(절단·출하 행)','text','공정별 지적',NULL,10,'frame'),
 ('A5200-03','지적4','지적사항 4(이상처리 행)','text','공정별 지적',NULL,11,'frame');

DELETE FROM form_cell_map WHERE form_code='A5200-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5200-03','평가대상명','평가 대상명','F4','text',1),
 ('A5200-03','평가일','평가일','Q4','date',2),
 ('A5200-03','평가팀','평가팀','F5','text',3),
 ('A5200-03','평가자','평가자','Q5','text',4),
 ('A5200-03','품명','품명','F6','text',5),
 ('A5200-03','제품규격','제품 규격','Q6','text',6),
 ('A5200-03','평가요약','평가 요약','A8','text',7),
 ('A5200-03','지적1','지적사항 1(인발공정 행)','AA15','text',8),
 ('A5200-03','지적2','지적사항 2(교정·탈지 행)','AA17','text',9),
 ('A5200-03','지적3','지적사항 3(절단·출하 행)','AA19','text',10),
 ('A5200-03','지적4','지적사항 4(이상처리 행)','AA21','text',11);

DELETE FROM form_grid_spec WHERE form_code='A5200-03';
DELETE FROM form_grid_columns WHERE form_code='A5200-03';

-- ── ④ A5200-04 내부심사(제품) 체크리스트 ─────────────────────
UPDATE forms SET
  template_path='templates/sq_gap_forms/20_내부심사_제품_체크리스트_A5200-04.xlsx',
  description='AM용 빈 틀 신규 설계본(ⓑ 260728) — 문항·배점 구조=정본 재사용·기록값·심사 사진 클리어. 헤더+중요 Dim''s 기록 grid 앱 기입, 문항별 채점은 시트 몫.'
WHERE code='A5200-04';

DELETE FROM form_fields WHERE form_code='A5200-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5200-04','거래처','거래처','text','기본 정보',NULL,1,'frame'),
 ('A5200-04','평가대상','평가 대상(공정)','text','기본 정보',NULL,2,'frame'),
 ('A5200-04','고객사명','고객사명(주간조)','text','기본 정보',NULL,3,'frame'),
 ('A5200-04','제품규격','제품 규격(주간조)','text','기본 정보',NULL,4,'frame'),
 ('A5200-04','품명','품명(주간조)','text','기본 정보',NULL,5,'frame'),
 ('A5200-04','생산일자','생산일자(주간조)','date','기본 정보',NULL,6,'fact'),
 ('A5200-04','납품수량','납품(출하) 수량','text','기본 정보',NULL,7,'frame'),
 ('A5200-04','포장수량','1차 포장 수량','text','기본 정보',NULL,8,'frame'),
 ('A5200-04','dims','중요 Dim''s 기록','grid','중요 Dim''s',NULL,9,NULL);

DELETE FROM form_cell_map WHERE form_code='A5200-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5200-04','거래처','거래처','G4','text',1),
 ('A5200-04','평가대상','평가 대상(공정)','W4','text',2),
 ('A5200-04','고객사명','고객사명(주간조)','M6','text',3),
 ('A5200-04','제품규격','제품 규격(주간조)','M7','text',4),
 ('A5200-04','품명','품명(주간조)','M8','text',5),
 ('A5200-04','생산일자','생산일자(주간조)','M9','date',6),
 ('A5200-04','납품수량','납품(출하) 수량','M10','text',7),
 ('A5200-04','포장수량','1차 포장 수량','M11','text',8);

DELETE FROM form_grid_spec WHERE form_code='A5200-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('A5200-04','dims',28,2,6);

DELETE FROM form_grid_columns WHERE form_code='A5200-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A5200-04','dims','설비명','설비명','G','text',1),
 ('A5200-04','dims','고객사','고객사','K','text',2),
 ('A5200-04','dims','규격','제품 규격','N','text',3),
 ('A5200-04','dims','특이사항','특이사항','T','text',4),
 ('A5200-04','dims','평가점수','Dim''s 평가(점)','AD','text',5);

-- ── ⑤ 변경 이력(ⓑ 채택 4건) ─────────────────────────────────
DELETE FROM form_change_log WHERE migration='0109';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('A5100-03','2026-07-28','template_adopt','마스터 시트(과거 심사 실데이터 시드)','templates/sq_gap_forms/17_내부심사_갑을_보고서_A5100-03.xlsx',
  'ⓑ 판정(코워크 7/28) — AM용 빈 틀: 구조 재사용·기록값 45셀 클리어. 실물 대사 시 교정','0109'),
 ('A5100-04','2026-07-28','template_adopt','마스터 시트(실평점 매트릭스 시드)','templates/sq_gap_forms/18_내부심사_시스템_체크리스트_A5100-04.xlsx',
  'ⓑ 판정 — AM용 빈 틀: 문항 구조 재사용·기록값 61셀 클리어','0109'),
 ('A5200-03','2026-07-28','template_adopt','마스터 시트(실데이터+심사 사진 24장 시드)','templates/sq_gap_forms/19_내부심사_제조_체크리스트_A5200-03.xlsx',
  'ⓑ 판정 — AM용 빈 틀: 공정 항목 구조 재사용·기록값 216셀+사진 24장 클리어','0109'),
 ('A5200-04','2026-07-28','template_adopt','마스터 시트(실데이터+심사 사진 24장 시드)','templates/sq_gap_forms/20_내부심사_제품_체크리스트_A5200-04.xlsx',
  'ⓑ 판정 — AM용 빈 틀: 문항·배점 구조 재사용·기록값 348셀+사진 24장 클리어','0109');
