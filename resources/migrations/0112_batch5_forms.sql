-- ============================================================
-- Migration 0112: 양식 완성전 5배치 — 정성품질 클러스터 + 잔여 상위 12종 (2026-07-29)
--
-- 대상 = 잔여 양식형 37 의 선두(4배치 검수요청 §5 예고분):
--  B2300 정성품질 7종(01~07) · L2300-04 · L4101-01 · B2200-05 · F1101-03/04
--
-- 실측(7/29, 마스터 워크북 직접 스캔) 정직 3분류:
--  ⓐ 진행 11종
--   · 추출 6(B2300-02~07) — 마스터 시트 실존하나 시트명이 한 자리 코드("B2300-2")라
--     resolveSheet(name.includes) 매칭 불가 → 시트 추출 + 시트명 2자리 정정(마스터 무변경).
--   · 마스터 직접 2(L2300-04·L4101-01) — L4101-01 은 계산기형(L4102-02 선례): 수식·
--     측정 매트릭스 미매핑, 헤더만.
--   · 0065 설계본 1(B2200-05) — 예시행 클리어(수식 보존)·(제안) 꼬리표 정정.
--   · 신규 설계 2(F1101-03/04) — 원본 부재 실측(F-1101 은 01/02 뿐). A-2 조건.
--     체크 항목 콘텐츠 = 관리팀 몫(봇 창작 0 — 항목 열도 입력 가능한 빈 틀).
--  ⓑ 열람형 전환 1종(B2300-01 CFT 업무 분장) — 사업부×역할 실명 조직표 기정의
--     (류덕환·이선구 등 전 칸 완성) → 기록 주입 시 조직 정본 덮어씀. M1100-05 선례.
--  ⓒ 데이터 발견 2건(수정 보류 — 검수요청 기록): ① 마스터에 "정성품질 순회 점검
--     시트(B2300-3)" = B2300-03 과 코드 중복(별개 양식, forms 미등록) ② L-4101-01
--     'SPC 평가표' = 독립 .xls 파일 실측 — L4101-01 과 이중 등록 아님(별개 실체).
--
-- 안전: 12종 전부 form_submissions 0건 실측 — DELETE+INSERT 무손실. 멱등: 재실행 동일.
-- ============================================================

-- ════════════════ ⓐ 진행 11종 ════════════════

-- ── ① B2300-02 정성품질 취합 대장 — 추출 템플릿 + 대장 grid ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: 정성품질 점검 의견 취합 대장. 마스터 시트명 한 자리 코드 정정 추출본(B2300-2→02). 순번 열은 시트 프리셋.',
  template_path='templates/batch5/B2300-02_취합대장.xlsx'
WHERE code='B2300-02';

DELETE FROM form_fields WHERE form_code='B2300-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-02','rows','취합 기록','grid','취합 기록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='B2300-02';
DELETE FROM form_grid_spec WHERE form_code='B2300-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B2300-02','rows',5,1,14);

DELETE FROM form_grid_columns WHERE form_code='B2300-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B2300-02','rows','점검일자','점검일자/의견일자','C','text',1),
 ('B2300-02','rows','점검의견','점검자 의견','H','text',2),
 ('B2300-02','rows','점검장소','점검장소/개선장소','O','text',3),
 ('B2300-02','rows','문제점','문 제 점','T','text',4),
 ('B2300-02','rows','개선담당','개선 담당자','AU','text',5);

-- ── ② B2300-03 정성품질 점검 체크시트 — 추출 템플릿 + 현황 블록 최소 매핑 ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: HKMC 정성작업 유도방안 점검 체크시트(갑지). 최소 매핑 — 현황 블록 7필드. 점검 매트릭스(불량현황·항목별 점검)는 시트 몫. 시트명 정정 추출본(B2300-3→03).',
  template_path='templates/batch5/B2300-03_점검체크시트.xlsx'
WHERE code='B2300-03';

DELETE FROM form_fields WHERE form_code='B2300-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-03','사업부명','사업부명','text','현황',NULL,1,'frame'),
 ('B2300-03','품목','품 목','text','현황',NULL,2,'frame'),
 ('B2300-03','점검일자','점검일자','date','현황',NULL,3,'fact'),
 ('B2300-03','점검자','점검자','text','현황',NULL,4,'frame'),
 ('B2300-03','점검품목','점검품목','text','현황',NULL,5,'frame'),
 ('B2300-03','점검대응자','점검 대응자','text','현황',NULL,6,'frame'),
 ('B2300-03','특이사항','특이사항','textarea','현황',NULL,7,'frame');

DELETE FROM form_cell_map WHERE form_code='B2300-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-03','사업부명','사업부명','G7','text',1),
 ('B2300-03','품목','품 목','R7','text',2),
 ('B2300-03','점검일자','점검일자','AC7','text',3),
 ('B2300-03','점검자','점검자','AN7','text',4),
 ('B2300-03','점검품목','점검품목','G8','text',5),
 ('B2300-03','점검대응자','점검 대응자','AN8','text',6),
 ('B2300-03','특이사항','특이사항','G9','text',7);

DELETE FROM form_grid_spec WHERE form_code='B2300-03';
DELETE FROM form_grid_columns WHERE form_code='B2300-03';

-- ── ③ B2300-04 문제점 및 개선 제안서 — 추출 템플릿 + 문서형 5필드 ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: 문제점·개선 제안서. 분류 체크(□ 설비~기타)·사진/도식화는 시트 수기. 시트명 정정 추출본(B2300-4→04).',
  template_path='templates/batch5/B2300-04_개선제안서.xlsx'
WHERE code='B2300-04';

DELETE FROM form_fields WHERE form_code='B2300-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-04','제안일자','제안 일자','date','제안 개요',NULL,1,'fact'),
 ('B2300-04','제안부서','제안 부서','text','제안 개요',NULL,2,'frame'),
 ('B2300-04','제안자','제안자','text','제안 개요',NULL,3,'frame'),
 ('B2300-04','문제점내용','문제점 내용','textarea','내용',NULL,4,'frame'),
 ('B2300-04','개선내용','개선 제안 내용','textarea','내용',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code='B2300-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-04','제안일자','제안 일자','F4','text',1),
 ('B2300-04','제안부서','제안 부서','W4','text',2),
 ('B2300-04','제안자','제안자','AN4','text',3),
 ('B2300-04','문제점내용','문제점 내용','D9','text',4),
 ('B2300-04','개선내용','개선 제안 내용','AB9','text',5);

DELETE FROM form_grid_spec WHERE form_code='B2300-04';
DELETE FROM form_grid_columns WHERE form_code='B2300-04';

-- ── ④ B2300-05 정성품질 개선 타당성 검토 — 추출 템플릿 + 문서형 7필드 ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: 개선 타당성 검토 회의록. 검토 문항 YES/NO 체크는 시트 수기(F2100-05 답안 선례). 시트명 정정 추출본(B2300-5→05).',
  template_path='templates/batch5/B2300-05_타당성검토.xlsx'
WHERE code='B2300-05';

DELETE FROM form_fields WHERE form_code='B2300-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-05','작성일자','작성 일자','date','회의 개요',NULL,1,'fact'),
 ('B2300-05','작성자','작성자','text','회의 개요',NULL,2,'frame'),
 ('B2300-05','회의일시','회의 일시','text','회의 개요',NULL,3,'frame'),
 ('B2300-05','회의장소','회의 장소','text','회의 개요',NULL,4,'frame'),
 ('B2300-05','제안부서','제안 부서','text','회의 개요',NULL,5,'frame'),
 ('B2300-05','제안자','제안자','text','회의 개요',NULL,6,'frame'),
 ('B2300-05','개선내용','개 선 내 용','textarea','내용',NULL,7,'frame');

DELETE FROM form_cell_map WHERE form_code='B2300-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-05','작성일자','작성 일자','F4','text',1),
 ('B2300-05','작성자','작성자','AE4','text',2),
 ('B2300-05','회의일시','회의 일시','F5','text',3),
 ('B2300-05','회의장소','회의 장소','AE5','text',4),
 ('B2300-05','제안부서','제안 부서','F6','text',5),
 ('B2300-05','제안자','제안자','AE6','text',6),
 ('B2300-05','개선내용','개 선 내 용','A8','text',7);

DELETE FROM form_grid_spec WHERE form_code='B2300-05';
DELETE FROM form_grid_columns WHERE form_code='B2300-05';

-- ── ⑤ B2300-06 유효성 평가 보고서 — 추출 템플릿 + 문서형 10필드 ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: 개선 유효성 평가 보고서. 합격/불합격 체크(□)·개선 추이도 그래프·개선 전후 사진은 시트 수기. 시트명 정정 추출본(B2300-6→06).',
  template_path='templates/batch5/B2300-06_유효성평가.xlsx'
WHERE code='B2300-06';

DELETE FROM form_fields WHERE form_code='B2300-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-06','품번','품 번','text','대상',NULL,1,'frame'),
 ('B2300-06','품명','품 명','text','대상',NULL,2,'frame'),
 ('B2300-06','문제확인일자','문제 확인 일자','date','대상',NULL,3,'fact'),
 ('B2300-06','개선일자','개선 일자','text','대상',NULL,4,'frame'),
 ('B2300-06','평가일자','평가 일자','text','대상',NULL,5,'frame'),
 ('B2300-06','문제내용','문제 내용','textarea','내용',NULL,6,'frame'),
 ('B2300-06','문제점설명','문제점 설명','textarea','내용',NULL,7,'frame'),
 ('B2300-06','생산일자','생산 일자','text','평가 실적',NULL,8,'frame'),
 ('B2300-06','생산수량','생산 수량','text','평가 실적',NULL,9,'frame'),
 ('B2300-06','불량수량','불량 수량','text','평가 실적',NULL,10,'frame');

DELETE FROM form_cell_map WHERE form_code='B2300-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-06','품번','품 번','A5','text',1),
 ('B2300-06','품명','품 명','I5','text',2),
 ('B2300-06','문제확인일자','문제 확인 일자','Q5','text',3),
 ('B2300-06','개선일자','개선 일자','Y5','text',4),
 ('B2300-06','평가일자','평가 일자','AG5','text',5),
 ('B2300-06','문제내용','문제 내용','A7','text',6),
 ('B2300-06','문제점설명','문제점 설명','A15','text',7),
 ('B2300-06','생산일자','생산 일자','AN20','text',8),
 ('B2300-06','생산수량','생산 수량','AR20','text',9),
 ('B2300-06','불량수량','불량 수량','AV20','text',10);

DELETE FROM form_grid_spec WHERE form_code='B2300-06';
DELETE FROM form_grid_columns WHERE form_code='B2300-06';

-- ── ⑥ B2300-07 인라인 공정불량 사례 시트 — 추출 템플릿 + 문서형 5필드 ──
UPDATE forms SET
  description='추출 정본 — 5배치(260729) 필드 완결: 관리부실 공정불량 사례(1건 서술형 — 병합 블록 실측). 시트명 정정 추출본(B2300-7→07).',
  template_path='templates/batch5/B2300-07_공정불량사례.xlsx'
WHERE code='B2300-07';

DELETE FROM form_fields WHERE form_code='B2300-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2300-07','발생원인','발생원인','text','사례',NULL,1,'frame'),
 ('B2300-07','원인유형','원인유형','text','사례',NULL,2,'frame'),
 ('B2300-07','개선전','개선전','textarea','사례',NULL,3,'frame'),
 ('B2300-07','개선후','개선후','textarea','사례',NULL,4,'frame'),
 ('B2300-07','비고','비 고','text','사례',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code='B2300-07';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2300-07','발생원인','발생원인','C6','text',1),
 ('B2300-07','원인유형','원인유형','G6','text',2),
 ('B2300-07','개선전','개선전','K6','text',3),
 ('B2300-07','개선후','개선후','AB6','text',4),
 ('B2300-07','비고','비 고','AS6','text',5);

DELETE FROM form_grid_spec WHERE form_code='B2300-07';
DELETE FROM form_grid_columns WHERE form_code='B2300-07';

-- ── ⑦ L2300-04 OK_NG MASTER 관리대장 — 마스터 직접 + 대장 grid ──
UPDATE forms SET
  description='마스터 정본 — 5배치(260729) 필드 완결: OK/NG 마스터 샘플 관리대장(등록번호·유효성관리). 순번=시트 프리셋, 사진 열=시트 수기.'
WHERE code='L2300-04';

DELETE FROM form_fields WHERE form_code='L2300-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2300-04','rows','마스터 샘플 목록','grid','마스터 샘플 목록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='L2300-04';
DELETE FROM form_grid_spec WHERE form_code='L2300-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2300-04','rows',6,1,16);

DELETE FROM form_grid_columns WHERE form_code='L2300-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2300-04','rows','등록번호','등록번호','B','text',1),
 ('L2300-04','rows','ok','OK','C','text',2),
 ('L2300-04','rows','ng','NG','D','text',3),
 ('L2300-04','rows','내용','내용','F','text',4),
 ('L2300-04','rows','검출내용','검출내용','G','text',5),
 ('L2300-04','rows','라인','라인','H','text',6),
 ('L2300-04','rows','공정','공정','I','text',7),
 ('L2300-04','rows','제작일자','제작일자','J','text',8),
 ('L2300-04','rows','유효기간','유효기간','K','text',9),
 ('L2300-04','rows','차기제작','차기제작','L','text',10),
 ('L2300-04','rows','비고','비고','M','text',11);

-- ── ⑧ L4101-01 Xbar-R 관리도 — 마스터 직접, 계산기형 최소 매핑(L4102-02 선례) ──
UPDATE forms SET
  description='마스터 정본 — 5배치(260729) 필드 완결: Xbar-R 관리도(계산기형). 최소 매핑 — 헤더 9필드만. X바/UCL/LCL 수식·측정 데이터 매트릭스·차트 = 시트 몫(수식 보존). 마스터 예시값(11월 등)은 미입력 시 잔존 — 한계 명기.'
WHERE code='L4101-01';

DELETE FROM form_fields WHERE form_code='L4101-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L4101-01','장비명','장비명','text','관리도 헤더',NULL,1,'frame'),
 ('L4101-01','관리항목','관리항목','text','관리도 헤더',NULL,2,'frame'),
 ('L4101-01','측정기','측정기','text','관리도 헤더',NULL,3,'frame'),
 ('L4101-01','공정명','공정명','text','관리도 헤더',NULL,4,'frame'),
 ('L4101-01','시료수','n=(시료수)','text','관리도 헤더',NULL,5,'frame'),
 ('L4101-01','기간','기간','text','관리도 헤더',NULL,6,'frame'),
 ('L4101-01','스펙하한','관리SPEC 하한','text','규격',NULL,7,'fact'),
 ('L4101-01','스펙상한','관리SPEC 상한','text','규격',NULL,8,'fact'),
 ('L4101-01','측정자','측정자','text','규격',NULL,9,'frame');

DELETE FROM form_cell_map WHERE form_code='L4101-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L4101-01','장비명','장비명','E4','text',1),
 ('L4101-01','관리항목','관리항목','M4','text',2),
 ('L4101-01','측정기','측정기','U4','text',3),
 ('L4101-01','공정명','공정명','E5','text',4),
 ('L4101-01','시료수','n=(시료수)','M5','text',5),
 ('L4101-01','기간','기간','U5','text',6),
 ('L4101-01','스펙하한','관리SPEC 하한','AK4','text',7),
 ('L4101-01','스펙상한','관리SPEC 상한','AL4','text',8),
 ('L4101-01','측정자','측정자','AK5','text',9);

DELETE FROM form_grid_spec WHERE form_code='L4101-01';
DELETE FROM form_grid_columns WHERE form_code='L4101-01';

-- ── ⑨ B2200-05 품질실적 월보 — 0065 설계본(월별 12행 grid + 헤더) ──
UPDATE forms SET
  description='0065 신규 설계본 — 5배치(260729) 필드 완결: 품질실적 월보(공정/고객/외주 PPM). PPM·목표달성 수식 보존(의도적 미매핑). 예시행 클리어·(제안) 꼬리표 정정 동반. 실물 출현 시 교정(A-2).'
WHERE code='B2200-05';

DELETE FROM form_fields WHERE form_code='B2200-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2200-05','대상연도','대상연도','text','기본',NULL,1,'fact'),
 ('B2200-05','공정목표','연간 목표 PPM(공정)','text','기본',NULL,2,'fact'),
 ('B2200-05','고객목표','연간 목표 PPM(고객)','text','기본',NULL,3,'fact'),
 ('B2200-05','외주목표','연간 목표 PPM(외주)','text','기본',NULL,4,'fact'),
 ('B2200-05','rows','월별 실적(행=1~12월 순)','grid','월별 실적',NULL,5,NULL);

DELETE FROM form_cell_map WHERE form_code='B2200-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('B2200-05','대상연도','대상연도','B3','text',1),
 ('B2200-05','공정목표','연간 목표 PPM(공정)','G3','text',2),
 ('B2200-05','고객목표','연간 목표 PPM(고객)','H3','text',3),
 ('B2200-05','외주목표','연간 목표 PPM(외주)','I3','text',4);

DELETE FROM form_grid_spec WHERE form_code='B2200-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B2200-05','rows',5,1,12);

DELETE FROM form_grid_columns WHERE form_code='B2200-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B2200-05','rows','공정생산','공정 생산수량','B','text',1),
 ('B2200-05','rows','공정불량','공정 불량수(재작업 포함)','C','text',2),
 ('B2200-05','rows','납품수량','납품수량','E','text',3),
 ('B2200-05','rows','고객불량','고객 불량수','F','text',4),
 ('B2200-05','rows','외주입고','외주 입고수량','H','text',5),
 ('B2200-05','rows','외주불량','외주 불량수','I','text',6),
 ('B2200-05','rows','워스트','워스트 항목','L','text',7),
 ('B2200-05','rows','대책no','개선대책 No.','M','text',8),
 ('B2200-05','rows','경영보고','경영보고','N','text',9);

-- ── ⑩⑪ F1101-03/04 신규입사자 온보딩 체크리스트 — 신규 설계본(A-2) ──
UPDATE forms SET
  description='신규 설계본(A-2) — 5배치(260729) 필드 완결: 오퍼레이터 온보딩 체크리스트. 원본 부재 실측(F-1101 은 01/02 뿐). 확인 항목 콘텐츠 = 관리팀 확정 몫(봇 창작 0 — 항목 열도 입력형 빈 틀). 실물 출현 시 교정.',
  template_path='templates/sq_gap_forms/21_온보딩체크_오퍼레이터_F1101-03.xlsx'
WHERE code='F1101-03';

UPDATE forms SET
  description='신규 설계본(A-2) — 5배치(260729) 필드 완결: 관리자 온보딩 체크리스트. 동일 설계(F1101-03 참조).',
  template_path='templates/sq_gap_forms/22_온보딩체크_관리자_F1101-04.xlsx'
WHERE code='F1101-04';

DELETE FROM form_fields WHERE form_code IN ('F1101-03','F1101-04');
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1101-03','성명','성명','text','대상자',NULL,1,'frame'),
 ('F1101-03','입사일','입사일','date','대상자',NULL,2,'fact'),
 ('F1101-03','배치부서','배치 부서','text','대상자',NULL,3,'frame'),
 ('F1101-03','멘토','멘토(담당 선임)','text','대상자',NULL,4,'frame'),
 ('F1101-03','rows','확인 항목','grid','온보딩 확인(항목은 관리팀 표준 목록 기준)',NULL,5,NULL),
 ('F1101-04','성명','성명','text','대상자',NULL,1,'frame'),
 ('F1101-04','입사일','입사일','date','대상자',NULL,2,'fact'),
 ('F1101-04','배치부서','배치 부서','text','대상자',NULL,3,'frame'),
 ('F1101-04','멘토','멘토(담당 선임)','text','대상자',NULL,4,'frame'),
 ('F1101-04','rows','확인 항목','grid','온보딩 확인(항목은 관리팀 표준 목록 기준)',NULL,5,NULL);

DELETE FROM form_cell_map WHERE form_code IN ('F1101-03','F1101-04');
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F1101-03','성명','성명','B3','text',1),
 ('F1101-03','입사일','입사일','D3','text',2),
 ('F1101-03','배치부서','배치 부서','F3','text',3),
 ('F1101-03','멘토','멘토(담당 선임)','B4','text',4),
 ('F1101-04','성명','성명','B3','text',1),
 ('F1101-04','입사일','입사일','D3','text',2),
 ('F1101-04','배치부서','배치 부서','F3','text',3),
 ('F1101-04','멘토','멘토(담당 선임)','B4','text',4);

DELETE FROM form_grid_spec WHERE form_code IN ('F1101-03','F1101-04');
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F1101-03','rows',6,1,30),
 ('F1101-04','rows',6,1,30);

DELETE FROM form_grid_columns WHERE form_code IN ('F1101-03','F1101-04');
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F1101-03','rows','no','순','A','text',1),
 ('F1101-03','rows','구분','구분','B','text',2),
 ('F1101-03','rows','항목','확인 항목','C','text',3),
 ('F1101-03','rows','확인일','확인일','D','text',4),
 ('F1101-03','rows','확인자','확인자','E','text',5),
 ('F1101-03','rows','비고','비고','F','text',6),
 ('F1101-04','rows','no','순','A','text',1),
 ('F1101-04','rows','구분','구분','B','text',2),
 ('F1101-04','rows','항목','확인 항목','C','text',3),
 ('F1101-04','rows','확인일','확인일','D','text',4),
 ('F1101-04','rows','확인자','확인자','E','text',5),
 ('F1101-04','rows','비고','비고','F','text',6);

-- ════════════════ ⓑ 열람형 전환 1종 ════════════════

UPDATE forms SET
  description='📖 열람형(참조 문서) — 정성품질 CFT 업무 분장표: 사업부×역할(교육/점검·개선/유효성) 실명 조직표 전 칸 기정의. 작성 양식 아님: 기록 주입 시 조직 정본을 덮어씀. 분장 개정은 지침 개정 절차로. M1100-05 선례 적용(5배치 260729).'
WHERE code='B2300-01';

DELETE FROM form_fields WHERE form_code='B2300-01';
DELETE FROM form_cell_map WHERE form_code='B2300-01';
DELETE FROM form_grid_spec WHERE form_code='B2300-01';
DELETE FROM form_grid_columns WHERE form_code='B2300-01';

-- ════════════════ 변경 이력(form_change_log) ════════════════
DELETE FROM form_change_log WHERE migration='0112';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('B2300-01','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(CFT 실명 분장표)',
  '실측 — 사업부×역할 실명 조직표 전 칸 기정의. M1100-05 판정3 선례 재적용(검수요청 명기, 이의 시 반전)','0112'),
 ('B2300-02','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-02_취합대장.xlsx',
  '마스터 시트명 한 자리 코드("B2300-2") 실측 — resolveSheet 매칭 불가라 시트명 2자리 정정 추출본 채택(마스터 무변경). B2300-03~07 동일','0112'),
 ('B2300-03','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-03_점검체크시트.xlsx','동일 사유','0112'),
 ('B2300-04','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-04_개선제안서.xlsx','동일 사유','0112'),
 ('B2300-05','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-05_타당성검토.xlsx','동일 사유','0112'),
 ('B2300-06','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-06_유효성평가.xlsx','동일 사유','0112'),
 ('B2300-07','2026-07-29','template_adopt',NULL,'templates/batch5/B2300-07_공정불량사례.xlsx','동일 사유','0112'),
 ('B2200-05','2026-07-29','template_correct','양식번호 B2200-05(제안) + 예시행 시드(1월)','B2200-05 + 예시행 클리어(PPM·목표달성 수식 보존)',
  '(제안) 꼬리표 제거 + 예시 시드 클리어("빈칸이 가짜보다 낫다" — 0110 선례)','0112'),
 ('L1100-25','2026-07-29','template_correct','보조 시트(정기점검·타발수/보관 현황판) A2 = L1100-20(제안)','보조 시트 A2 = L1100-25',
  '1배치 검수 표본 점검 발견(검수회신 260729 §1) — 주 시트만 정정되고 보조 시트 누락분 편승 정정','0112'),
 ('L1200-12','2026-07-29','template_correct','보조 시트(정기점검(기준핀)) A2 = L1200-03(제안)','보조 시트 A2 = L1200-12',
  '동일 사유','0112');
