-- ============================================================
-- Migration 0111: 양식 완성전 4배치 — 우선순위 상위 17종 (2026-07-29)
--
-- 대상 = audit_20260729.json 갭A 양식형 우선순위순 상위 17종:
--  L1200 지그 4(우선순위 321) · B1100 부적합 4(193·60·60·55) · B2100 시정조치 2(60) ·
--  J1102 관리계획서 2(102) · K1200-04-01(94) · H3200-01(65) · F1100-04(63) · F2100-05 2안(63)
--  ※ B2300 정성품질 7종은 응집 클러스터라 5배치 선두로 분리(조사서 4배치+ 첫머리 명기분).
--
-- 실측(7/29, 마스터 워크북 직접 스캔 — 3배치 반전① 접근) 정직 3분류:
--  ⓐ 진행 13종 — 마스터 시트 직접 8(L1200-07/10·J1102-02/03·K1200-04-01·H3200-01·F2100-05-01/02)
--     + 마스터 추출 템플릿 3(B2100-04/05·F1100-04 — 시트에 실기록 보유라 직접 주입 시 기록 훼손,
--       1배치 am_forms 추출 선례로 헤더+빈 블록 추출·기록 클리어)
--     + 0065 설계본 2(B1100-12/13 — 코드충돌 재부여 잔재 정비: 예시행 클리어·양식번호 정정)
--  ⓑ 열람형 전환 4종(M1100-05 판정3 선례 재적용 — 검수요청 명기, 이의 시 반전):
--     L1200-08/09(계약서 조문 전문 — 체결은 서면·인감 동선), B1100-07(계통도 이미지 3+실명 연락망),
--     B1100-08(전면 이미지 도해 — 가로/세로 2시트 동일 문서)
--  ⓒ 원본 부재 실측 0종 — 17종 전부 원본 확보(마스터 15 + 0065 설계본 2). 신규 창작 0.
--
-- 안전: 17종 전부 form_submissions 0건 실측(검증 DB 7/29) — DELETE+INSERT 무손실.
-- 멱등: DELETE 후 INSERT + UPDATE — 재실행 = 동일 결과.
-- 수식 보존(계산기형 선례 L4102-02): H3200-01 대응시간(L짝수행)·PPM(S)·경비 합산(AG~AM)·
--  B1100-13 수량대사(N) = 의도적 미매핑.
-- 직접 필드 라벨 일치 규칙(3배치 반전③): 비grid 필드 form_fields.label = form_cell_map.label
--  문자열 동일 유지(예시 괄호 금지 — 안내는 description/section 으로).
-- ============================================================

-- ════════════════ ⓐ 진행 13종 ════════════════

-- ── ① L1200-07 CF 점검 시트 — 분기 점검 grid(본행+특이사항행, M1200-06 선례) ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: C/F(체크 픽스처) 분기 점검(연 4회, 행 순서 = 1~4분기). 점검 기준행·분기 라벨은 시트 프리셋. 점검 담당 = 품질보증팀.'
WHERE code='L1200-07';

DELETE FROM form_fields WHERE form_code='L1200-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-07','rows','분기 점검 결과','grid','분기 점검(행=1~4분기 순)',NULL,1,NULL),
 ('L1200-07','details','분기 특이사항(행 순서 대응)','grid','분기 점검(행=1~4분기 순)',NULL,2,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-07';

DELETE FROM form_grid_spec WHERE form_code='L1200-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-07','rows',8,2,4),
 ('L1200-07','details',9,2,4);

DELETE FROM form_grid_columns WHERE form_code='L1200-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-07','rows','마운트','마운트 브라켓 규제 장치','B','text',1),
 ('L1200-07','rows','블록볼트','블록 고정 볼트','C','text',2),
 ('L1200-07','rows','고정핀','고정핀','D','text',3),
 ('L1200-07','rows','외관','외관','E','text',4),
 ('L1200-07','rows','비고','비고','F','text',5),
 ('L1200-07','details','특이사항','특이사항','B','text',1);

-- ── ② L1200-10 대여자산 관리대장 — 대장형 grid(21열) ──────────
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 협력회사 대여자산(설비·금형·치공구) 관리대장. Set 단위 작성. 활용여부 관리기호(A양산/B A/S용/C불용)는 시트 상단 프리셋.'
WHERE code='L1200-10';

DELETE FROM form_fields WHERE form_code='L1200-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-10','rows','대여자산 목록','grid','대여자산 목록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-10';

DELETE FROM form_grid_spec WHERE form_code='L1200-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-10','rows',6,1,20);

DELETE FROM form_grid_columns WHERE form_code='L1200-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-10','rows','no','NO','A','text',1),
 ('L1200-10','rows','담당','담당','B','text',2),
 ('L1200-10','rows','업체명','업체명','C','text',3),
 ('L1200-10','rows','활용여부','활용여부(A/B/C)','D','text',4),
 ('L1200-10','rows','차종','차종','E','text',5),
 ('L1200-10','rows','자산관리no','자산관리NO','F','text',6),
 ('L1200-10','rows','assy품번','ASS''Y 부품번호','G','text',7),
 ('L1200-10','rows','단품품번','단품 부품번호','H','text',8),
 ('L1200-10','rows','eo_no','EO/NO','I','text',9),
 ('L1200-10','rows','품명','품명','J','text',10),
 ('L1200-10','rows','설비명','설비명','K','text',11),
 ('L1200-10','rows','공정명','공정명','L','text',12),
 ('L1200-10','rows','set수','SET수','M','text',13),
 ('L1200-10','rows','재질','재질','N','text',14),
 ('L1200-10','rows','중량','중량(Kg)','O','text',15),
 ('L1200-10','rows','size','SIZE(장x폭x고)','P','text',16),
 ('L1200-10','rows','시행일','시행일(취득일)','Q','text',17),
 ('L1200-10','rows','제작처','제작처','R','text',18),
 ('L1200-10','rows','현보관처','현보관처(자작/외주)','S','text',19),
 ('L1200-10','rows','이전보관처','이전 보관처','T','text',20),
 ('L1200-10','rows','비고','비고(이관시점)','U','text',21);

-- ── ③ J1102-02 관리계획서 특별특성 — 특성 목록 grid(최소 매핑) ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 특별특성 목록(AIAG 서식 — 번호·근거·시방/공차·분류·공정/제품). 상단 승인 블록은 병합 구조 부재로 시트 수기(한계 명기), 삽화 열은 이미지라 시트 몫.'
WHERE code='J1102-02';

DELETE FROM form_fields WHERE form_code='J1102-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J1102-02','rows','특별특성 목록','grid','특별특성 목록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='J1102-02';

DELETE FROM form_grid_spec WHERE form_code='J1102-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('J1102-02','rows',12,1,15);

DELETE FROM form_grid_columns WHERE form_code='J1102-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('J1102-02','rows','no','번호','A','text',1),
 ('J1102-02','rows','근거','기술/이론적 근거','B','text',2),
 ('J1102-02','rows','시방','시방(규격)/공차','E','text',3),
 ('J1102-02','rows','분류','분류','G','text',4),
 ('J1102-02','rows','공정제품','공정/제품','H','text',5);

-- ── ④ J1102-03 관리계획서 체크리스트 — 21문항 grid + 헤더 4 ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: AIAG 관리계획서 체크리스트 21문항(예/아니오/N.A + 코멘트·책임자·기한, 행 순서 = 문항 1~21). 단계 체크(시작품~양산)는 시트 수기.'
WHERE code='J1102-03';

DELETE FROM form_fields WHERE form_code='J1102-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J1102-03','부품번호','고객 또는 내부 부품 번호','text','기본 정보',NULL,1,'frame'),
 ('J1102-03','개정수준','개정 수준','text','기본 정보',NULL,2,'frame'),
 ('J1102-03','rows','체크리스트 응답','grid','체크리스트(행=문항 1~21 순)',NULL,3,NULL),
 ('J1102-03','개정일자','개정 일자','date','확인',NULL,4,'fact'),
 ('J1102-03','작성자','작성자','auto','확인',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code='J1102-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('J1102-03','부품번호','고객 또는 내부 부품 번호','E8','text',1),
 ('J1102-03','개정수준','개정 수준','S8','text',2),
 ('J1102-03','개정일자','개정 일자','R34','text',3),
 ('J1102-03','작성자','작성자','R37','text',4);

DELETE FROM form_grid_spec WHERE form_code='J1102-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('J1102-03','rows',11,1,21);

DELETE FROM form_grid_columns WHERE form_code='J1102-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('J1102-03','rows','예','예','N','text',1),
 ('J1102-03','rows','아니오','아니오','O','text',2),
 ('J1102-03','rows','na','N/A','P','text',3),
 ('J1102-03','rows','코멘트','요구되는 코멘트/조치','Q','text',4),
 ('J1102-03','rows','책임자','책임자','R','text',5),
 ('J1102-03','rows','기한','기한','S','text',6);

-- ── ⑤ K1200-04-01 타사업부 실적,체제 평가 계획서 — 평가 블록(A5200-04-01 유형) ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 타 사업부 실적·체제 평가표(납기20·품질30·환경10·공정/품질리스크40 배점, 평가등급 A/B/C). 평가 항목·배점·기준은 시트 프리셋. 검토/승인 결재는 시트 수기.'
WHERE code='K1200-04-01';

DELETE FROM form_fields WHERE form_code='K1200-04-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-04-01','평가사업부','평가 사업부','text','평가 개요',NULL,1,'frame'),
 ('K1200-04-01','대상기간','대상 기간','text','평가 개요',NULL,2,'frame'),
 ('K1200-04-01','평가일자','평가 일자','date','평가 개요',NULL,3,'fact'),
 ('K1200-04-01','평가자','평 가 자','text','평가 개요',NULL,4,'frame'),
 ('K1200-04-01','납기준수','납기준수 평점','text','평점(배점은 시트 기준)',NULL,5,'frame'),
 ('K1200-04-01','수량착오','수량착오 평점','text','평점(배점은 시트 기준)',NULL,6,'frame'),
 ('K1200-04-01','수입검사결과','수입검사 결과 평점','text','평점(배점은 시트 기준)',NULL,7,'frame'),
 ('K1200-04-01','부적합건수','부적합발생 건수 평점','text','평점(배점은 시트 기준)',NULL,8,'frame'),
 ('K1200-04-01','claim건수','Claim 건수 평점','text','평점(배점은 시트 기준)',NULL,9,'frame'),
 ('K1200-04-01','환경인증','환경관련 인증서 보유 평점','text','평점(배점은 시트 기준)',NULL,10,'frame'),
 ('K1200-04-01','안전보호구','안전보호구 착용 평점','text','평점(배점은 시트 기준)',NULL,11,'frame'),
 ('K1200-04-01','작업장환경','분리수거등 작업장 환경 평점','text','평점(배점은 시트 기준)',NULL,12,'frame'),
 ('K1200-04-01','리스크평가','공정/품질리스크 평가 평점','text','평점(배점은 시트 기준)',NULL,13,'frame'),
 ('K1200-04-01','총평점','총 평점','text','종합',NULL,14,'frame'),
 ('K1200-04-01','평가자의견','평가자 의견','textarea','종합',NULL,15,'frame'),
 ('K1200-04-01','비고','비 고','textarea','종합',NULL,16,'frame'),
 ('K1200-04-01','작성자','작성자','auto','결재',NULL,17,'frame');

DELETE FROM form_cell_map WHERE form_code='K1200-04-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-04-01','평가사업부','평가 사업부','B5','text',1),
 ('K1200-04-01','대상기간','대상 기간','G5','text',2),
 ('K1200-04-01','평가일자','평가 일자','B6','text',3),
 ('K1200-04-01','평가자','평 가 자','G6','text',4),
 ('K1200-04-01','납기준수','납기준수 평점','K8','text',5),
 ('K1200-04-01','수량착오','수량착오 평점','K9','text',6),
 ('K1200-04-01','수입검사결과','수입검사 결과 평점','K10','text',7),
 ('K1200-04-01','부적합건수','부적합발생 건수 평점','K11','text',8),
 ('K1200-04-01','claim건수','Claim 건수 평점','K12','text',9),
 ('K1200-04-01','환경인증','환경관련 인증서 보유 평점','K13','text',10),
 ('K1200-04-01','안전보호구','안전보호구 착용 평점','K14','text',11),
 ('K1200-04-01','작업장환경','분리수거등 작업장 환경 평점','K15','text',12),
 ('K1200-04-01','리스크평가','공정/품질리스크 평가 평점','K16','text',13),
 ('K1200-04-01','총평점','총 평점','K20','text',14),
 ('K1200-04-01','평가자의견','평가자 의견','B23','text',15),
 ('K1200-04-01','비고','비 고','B28','text',16),
 ('K1200-04-01','작성자','작성자','G2','text',17);

DELETE FROM form_grid_spec WHERE form_code='K1200-04-01';
DELETE FROM form_grid_columns WHERE form_code='K1200-04-01';

-- ── ⑥ H3200-01 고객불만 접수 대응 현황 보고서 — 2행 병합 grid(M1200-06 선례) ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 고객 불만 접수~대응~결론 현황 대장(2행 블록 18건 — 본행 + 불량수량/기타경비 상세행). 대응시간·PPM·경비 합산은 시트 수식 보존(의도적 미매핑). 표제 년/월은 시트 수기.'
WHERE code='H3200-01';

DELETE FROM form_fields WHERE form_code='H3200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H3200-01','rows','고객불만 대응 기록','grid','고객불만 대응 기록',NULL,1,NULL),
 ('H3200-01','details','상세(행 순서 대응 — 불량수량·기타경비)','grid','고객불만 대응 기록',NULL,2,NULL);

DELETE FROM form_cell_map WHERE form_code='H3200-01';

DELETE FROM form_grid_spec WHERE form_code='H3200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('H3200-01','rows',5,2,18),
 ('H3200-01','details',6,2,18);

DELETE FROM form_grid_columns WHERE form_code='H3200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('H3200-01','rows','no','순','A','text',1),
 ('H3200-01','rows','대응자','고객 대응자','B','text',2),
 ('H3200-01','rows','접수일자','접수일자','C','text',3),
 ('H3200-01','rows','접수유형','접수유형','D','text',4),
 ('H3200-01','rows','고객사명','고객사명','E','text',5),
 ('H3200-01','rows','고객담당자','고객 담당자','F','text',6),
 ('H3200-01','rows','불만내용','불만내용','G','text',7),
 ('H3200-01','rows','대응일자','대응일자','H','text',8),
 ('H3200-01','rows','대응지','대응지','I','text',9),
 ('H3200-01','rows','귀책처지원','귀책처 지원','J','text',10),
 ('H3200-01','rows','투입인원','당팀 총투입인원','K','text',11),
 ('H3200-01','rows','시작시각','대응 시작(시)','L','text',12),
 ('H3200-01','rows','종료시각','대응 종료(시)','O','text',13),
 ('H3200-01','rows','선별수량','선별수량','R','text',14),
 ('H3200-01','rows','귀책처','귀책처','U','text',15),
 ('H3200-01','rows','귀책공정','귀책공정','V','text',16),
 ('H3200-01','rows','귀책작업자','귀책 작업자','W','text',17),
 ('H3200-01','rows','불량lot','불량LOT','X','text',18),
 ('H3200-01','rows','불량원인','불량원인','Y','text',19),
 ('H3200-01','rows','고객요청','고객 요청사항','AA','text',20),
 ('H3200-01','rows','귀책통보','귀책처 부적합 통보','AB','text',21),
 ('H3200-01','rows','개선방안','고객불만 개선방안','AD','text',22),
 ('H3200-01','rows','차량유지비','차량유지비','AF','text',23),
 ('H3200-01','details','불량수량','불량수량','R','text',1),
 ('H3200-01','details','기타경비','기타경비','AF','text',2);

-- ── ⑦ F2100-05-01 공정면허 이론평가서 1안 — 최소 매핑(문항·정답 = 시트 몫) ──
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 공정면허 이론 평가서(갑지+을지, 10문항 프리셋). 최소 매핑(F2100-10 선례) — 응시 정보·점수만. 문항별 답안 기입·자격구분 체크(□)는 시트 수기.'
WHERE code='F2100-05-01';

DELETE FROM form_fields WHERE form_code='F2100-05-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-05-01','공정명','공정명','text','응시 정보',NULL,1,'frame'),
 ('F2100-05-01','작업자명','작업자명','text','응시 정보',NULL,2,'frame'),
 ('F2100-05-01','평가자','평가자','text','응시 정보',NULL,3,'frame'),
 ('F2100-05-01','평가일자','평가일자','date','응시 정보',NULL,4,'fact'),
 ('F2100-05-01','점수','점 수','text','평가 결과',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code='F2100-05-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-05-01','공정명','공정명','F4','text',1),
 ('F2100-05-01','작업자명','작업자명','F5','text',2),
 ('F2100-05-01','평가자','평가자','F6','text',3),
 ('F2100-05-01','평가일자','평가일자','V5','text',4),
 ('F2100-05-01','점수','점 수','V6','text',5);

DELETE FROM form_grid_spec WHERE form_code='F2100-05-01';
DELETE FROM form_grid_columns WHERE form_code='F2100-05-01';

-- ── ⑧ F2100-05-02 공정면허 이론평가서 2안 — 최소 매핑 ──────────
UPDATE forms SET
  description='마스터 정본 — 4배치(260729) 필드 완결: 자격인증 이론평가 2안(10문항+정답란 프리셋). 최소 매핑 — 응시 정보만. 문항별 답안 기입은 시트 수기(정답열 AF는 채점용 프리셋).'
WHERE code='F2100-05-02';

DELETE FROM form_fields WHERE form_code='F2100-05-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-05-02','평가일자','평가일자','date','응시 정보',NULL,1,'fact'),
 ('F2100-05-02','소속','소 속','text','응시 정보',NULL,2,'frame'),
 ('F2100-05-02','성명','성 명','text','응시 정보',NULL,3,'frame');

DELETE FROM form_cell_map WHERE form_code='F2100-05-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-05-02','평가일자','평가일자','F6','text',1),
 ('F2100-05-02','소속','소 속','P6','text',2),
 ('F2100-05-02','성명','성 명','Z6','text',3);

DELETE FROM form_grid_spec WHERE form_code='F2100-05-02';
DELETE FROM form_grid_columns WHERE form_code='F2100-05-02';

-- ── ⑨ B2100-04 장기테마 — 추출 템플릿 + 4행 블록 grid(최소 매핑) ──
UPDATE forms SET
  description='추출 정본 — 4배치(260729) 필드 완결: 장기테마 개선 추진 일정 관리표(4행 블록 10건). 마스터 시트는 19년~ 실기록 보유라 헤더+빈 블록 추출본을 정본으로(1배치 AM 추출 선례). 월별 진행상태 매트릭스(R~AB)·EXIT CRITERIA 키는 시트 몫.',
  template_path='templates/batch4/B2100-04_장기테마_추출.xlsx'
WHERE code='B2100-04';

DELETE FROM form_fields WHERE form_code='B2100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2100-04','rows','장기테마 목록','grid','장기테마 목록(블록당 1건)',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='B2100-04';

DELETE FROM form_grid_spec WHERE form_code='B2100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B2100-04','rows',12,4,10);

DELETE FROM form_grid_columns WHERE form_code='B2100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B2100-04','rows','등록일','등록일','B','text',1),
 ('B2100-04','rows','업체구분','업체구분','C','text',2),
 ('B2100-04','rows','차종','차종','D','text',3),
 ('B2100-04','rows','품명품번','품명(품번)','F','text',4),
 ('B2100-04','rows','발생날짜','발생날짜','G','text',5),
 ('B2100-04','rows','문제유형','문제유형&발생공정','H','text',6),
 ('B2100-04','rows','담당자','품질팀 담당자','J','text',7),
 ('B2100-04','rows','문제내용','문제 내용 설명','K','text',8),
 ('B2100-04','rows','대책내용','대책 내용(8D PSR)','L','text',9),
 ('B2100-04','rows','review','Review 내용','M','text',10),
 ('B2100-04','rows','목표일','개선완료목표일','N','text',11),
 ('B2100-04','rows','완료일','개선완료일','O','text',12),
 ('B2100-04','rows','추진담당','해결 추진 담당','P','text',13);

-- ── ⑩ B2100-05 즉실천항목 — 추출 템플릿 + 4행 블록 grid(최소 매핑) ──
UPDATE forms SET
  description='추출 정본 — 4배치(260729) 필드 완결: 일일 품질(신속대응)회의 즉실천 항목 관리표(4행 블록 10건). 마스터 시트는 실기록 4,443행 보유(살아있는 대장)라 헤더+빈 블록 추출본을 정본으로. 주차 라벨·즉실천 구분·진행상태 서브블록은 시트 몫.',
  template_path='templates/batch4/B2100-05_즉실천항목_추출.xlsx'
WHERE code='B2100-05';

DELETE FROM form_fields WHERE form_code='B2100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B2100-05','rows','즉실천 항목','grid','즉실천 항목(블록당 1건)',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='B2100-05';

DELETE FROM form_grid_spec WHERE form_code='B2100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B2100-05','rows',10,4,10);

DELETE FROM form_grid_columns WHERE form_code='B2100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B2100-05','rows','등록일','등록일','B','text',1),
 ('B2100-05','rows','업체구분','업체구분','C','text',2),
 ('B2100-05','rows','차종','차종','D','text',3),
 ('B2100-05','rows','품번','품번(사번)','F','text',4),
 ('B2100-05','rows','발생날짜','발생날짜','G','text',5),
 ('B2100-05','rows','문제유형','문제유형&발생공정','H','text',6),
 ('B2100-05','rows','담당자','품질팀 담당자','J','text',7),
 ('B2100-05','rows','문제내용','문제 내용 설명','K','text',8),
 ('B2100-05','rows','대책내용','대책 내용(8D PSR)','L','text',9),
 ('B2100-05','rows','공장장지시','공장장 지시사항','M','text',10),
 ('B2100-05','rows','review','Review 내용','N','text',11),
 ('B2100-05','rows','선별결과','선별결과','O','text',12),
 ('B2100-05','rows','완료일','개선완료일','Q','text',13),
 ('B2100-05','rows','추진담당','해결 추진 담당','R','text',14);

-- ── ⑪ F1100-04 지식 관리표 — 추출 템플릿 + 대장 grid ──────────
UPDATE forms SET
  description='추출 정본 — 4배치(260729) 필드 완결: 조직 지식 관리표(프로세스별 지식 목록). 마스터 시트는 기록 144행 보유라 헤더+빈 30행 추출본을 정본으로. 연번(B열)은 원본 수식이 기록행 소속이라 클리어 — 수기 기입(한계 명기).',
  template_path='templates/batch4/F1100-04_지식관리표_추출.xlsx'
WHERE code='F1100-04';

DELETE FROM form_fields WHERE form_code='F1100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1100-04','rows','지식 목록','grid','지식 목록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='F1100-04';

DELETE FROM form_grid_spec WHERE form_code='F1100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F1100-04','rows',6,1,30);

DELETE FROM form_grid_columns WHERE form_code='F1100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F1100-04','rows','프로세스','프로세스','A','text',1),
 ('F1100-04','rows','표준번호','표준번호/Rev','C','text',2),
 ('F1100-04','rows','개정일','개정일&발행일','D','text',3),
 ('F1100-04','rows','문서명','문서명','E','text',4),
 ('F1100-04','rows','출처','출처','F','text',5),
 ('F1100-04','rows','입수유형','입수 유형','G','text',6),
 ('F1100-04','rows','매체','매체','H','text',7),
 ('F1100-04','rows','사업부명','사업부명','I','text',8),
 ('F1100-04','rows','부서명','부서명','J','text',9),
 ('F1100-04','rows','등록일자','등록일자','K','text',10),
 ('F1100-04','rows','사용팀','사용팀','L','text',11);

-- ── ⑫ B1100-12 리크·리워크 이력대장 — 0065 설계본 정비 + 대장 grid ──
UPDATE forms SET
  description='0065 신규 설계본 — 4배치(260729) 필드 완결: 리크·리워크 이력대장(발생~리워크~재검사~판정 추적, 리워크 LOT 식별 -R). 예시행 클리어·내부 양식번호 정정(B1100-10→12, 코드충돌 재부여 잔재) 동반. 실물 출현 시 교정(A-2).'
WHERE code='B1100-12';

DELETE FROM form_fields WHERE form_code='B1100-12';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B1100-12','rows','리크·리워크 이력','grid','리크·리워크 이력',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='B1100-12';

DELETE FROM form_grid_spec WHERE form_code='B1100-12';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B1100-12','rows',4,1,30);

DELETE FROM form_grid_columns WHERE form_code='B1100-12';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B1100-12','rows','no','No','A','text',1),
 ('B1100-12','rows','발생일','발생일','B','text',2),
 ('B1100-12','rows','품번','품번','C','text',3),
 ('B1100-12','rows','lot','LOT','D','text',4),
 ('B1100-12','rows','발생공정','발생공정','E','text',5),
 ('B1100-12','rows','불량내용','불량내용(측정값)','F','text',6),
 ('B1100-12','rows','발생수량','발생수량','G','text',7),
 ('B1100-12','rows','가능여부','리워크 가능여부(기준표 근거)','H','text',8),
 ('B1100-12','rows','리워크방법','리워크 방법','I','text',9),
 ('B1100-12','rows','리워크자','리워크자','J','text',10),
 ('B1100-12','rows','재검사일','재검사일','K','text',11),
 ('B1100-12','rows','재검결과','재검사 결과(측정값)','L','text',12),
 ('B1100-12','rows','재검사자','재검사자','M','text',13),
 ('B1100-12','rows','판정','판정(복귀/폐기)','N','text',14),
 ('B1100-12','rows','폐기수량','폐기수량','O','text',15),
 ('B1100-12','rows','리워크lot','리워크 LOT 식별','P','text',16),
 ('B1100-12','rows','비고','비고','Q','text',17);

-- ── ⑬ B1100-13 부적합품 처리대장 — 0065 설계본 정비 + 대장 grid ──
UPDATE forms SET
  description='0065 신규 설계본 — 4배치(260729) 필드 완결: 부적합(추정)품 처리대장(격리~재검사~폐기/리워크/복귀 수량 대사). 수량 대사(N열)는 자동판정 수식 보존(의도적 미매핑). 예시행 클리어·내부 양식번호 정정(B1100-11→13) 동반. 실물 출현 시 교정(A-2).'
WHERE code='B1100-13';

DELETE FROM form_fields WHERE form_code='B1100-13';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('B1100-13','rows','부적합품 처리 이력','grid','부적합품 처리 이력',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='B1100-13';

DELETE FROM form_grid_spec WHERE form_code='B1100-13';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('B1100-13','rows',4,1,30);

DELETE FROM form_grid_columns WHERE form_code='B1100-13';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('B1100-13','rows','no','No','A','text',1),
 ('B1100-13','rows','발생일','발생일','B','text',2),
 ('B1100-13','rows','발생공정','발생공정','C','text',3),
 ('B1100-13','rows','품번','품번','D','text',4),
 ('B1100-13','rows','lot','LOT','E','text',5),
 ('B1100-13','rows','불량내용','불량내용','F','text',6),
 ('B1100-13','rows','발생수량','발생수량','G','text',7),
 ('B1100-13','rows','격리확인','RED BOX 격리확인','H','text',8),
 ('B1100-13','rows','재검사','2차 재검사(일자/검사자)','I','text',9),
 ('B1100-13','rows','재검결과','재검사 결과','J','text',10),
 ('B1100-13','rows','폐기수량','폐기수량','K','text',11),
 ('B1100-13','rows','리워크수량','리워크수량','L','text',12),
 ('B1100-13','rows','복귀수량','복귀수량','M','text',13),
 ('B1100-13','rows','처리완료일','처리완료일','O','text',14),
 ('B1100-13','rows','담당','담당','P','text',15),
 ('B1100-13','rows','비고','비고','Q','text',16);

-- ════════════════ ⓑ 열람형 전환 4종 (M1100-05 판정3 선례 재적용) ════════════════

UPDATE forms SET
  description='📖 열람형(참조 문서) — 검사구·물품납입 계약서 조문 전문(제1~n조·계약금액·지불조건·지체상금, 갑을 인적사항·인감 날인). 작성 양식 아님: 계약 체결은 서면·인감 동선이고 기록 주입 시 조문 정본을 덮어씀. M1100-05 선례 적용(4배치 260729).'
WHERE code='L1200-08';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 지그 사용대차 계약서 조문 전문(Ⅰ장 총칙~관리의무, 자산보호·소유권 확인 목적). 작성 양식 아님: 동일 사유. 대여자산 기록은 L1200-10 대여자산 관리대장으로. M1100-05 선례 적용(4배치 260729).'
WHERE code='L1200-09';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 품질문제 발생 신속 대응 계통도(도해 이미지 3장) + 신속대응 조직 연락망(실명·연락처 기정의). 작성 양식 아님: 기록 주입 시 계통도 정본을 덮어씀. 개정은 규정 개정 절차로. M1100-05 선례 적용(4배치 260729).'
WHERE code='B1100-07';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 부적합품 처리 기준 도해(전면 이미지 — 가로/세로 2시트 동일 문서). 작성 양식 아님. 처리 기록은 B1100-13 부적합품 처리대장으로. M1100-05 선례 적용(4배치 260729).'
WHERE code='B1100-08';

-- 열람형 4종은 fields 미정의 유지가 정의 — 잔재 셀맵(0019 자동추출)만 정리
DELETE FROM form_fields WHERE form_code IN ('L1200-08','L1200-09','B1100-07','B1100-08');
DELETE FROM form_cell_map WHERE form_code IN ('L1200-08','L1200-09','B1100-07','B1100-08');
DELETE FROM form_grid_spec WHERE form_code IN ('L1200-08','L1200-09','B1100-07','B1100-08');
DELETE FROM form_grid_columns WHERE form_code IN ('L1200-08','L1200-09','B1100-07','B1100-08');

-- ════════════════ 변경 이력(form_change_log) ════════════════
DELETE FROM form_change_log WHERE migration='0111';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('L1200-08','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(계약서 조문 전문)',
  '실측 — 조문·인감 날인 동선의 법률 문서라 기록 주입 시 정본을 덮어씀. M1100-05 판정3 선례 재적용(검수요청 명기, 이의 시 반전)','0111'),
 ('L1200-09','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(사용대차 계약서 조문 전문)',
  '실측 — 동일 사유. M1100-05 선례 재적용','0111'),
 ('B1100-07','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(계통도 이미지 3+연락망 기정의)',
  '실측 — 도해·실명 연락망 기정의 문서. M1100-05 선례 재적용','0111'),
 ('B1100-08','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(전면 이미지 도해, 가로/세로 2시트)',
  '실측 — 전 내용이 이미지. M1100-05 선례 재적용','0111'),
 ('B2100-04','2026-07-29','template_adopt',NULL,'templates/batch4/B2100-04_장기테마_추출.xlsx',
  '마스터 시트 19년~ 실기록 보유 실측 — 직접 주입 시 기록 훼손이라 헤더+빈 블록 10개 추출본 채택(1배치 AM 추출·"빈칸이 가짜보다 낫다" 선례)','0111'),
 ('B2100-05','2026-07-29','template_adopt',NULL,'templates/batch4/B2100-05_즉실천항목_추출.xlsx',
  '마스터 시트 실기록 4,443행 보유(살아있는 대장) 실측 — 동일 사유로 추출본 채택','0111'),
 ('F1100-04','2026-07-29','template_adopt',NULL,'templates/batch4/F1100-04_지식관리표_추출.xlsx',
  '마스터 시트 기록 144행 보유 실측 — 동일 사유로 추출본 채택(연번 수식은 기록행 소속이라 클리어, 수기 한계 명기)','0111'),
 ('B1100-12','2026-07-29','template_correct','템플릿 내부 양식번호 B1100-10(제안) + 예시행 시드','B1100-12 + 예시행 클리어',
  '0065 코드충돌 재부여 잔재 정정(파일명·template_path 는 유지 — 05_금형·M1200-09 선례). 예시행 클리어 동반','0111'),
 ('B1100-13','2026-07-29','template_correct','템플릿 내부 양식번호 B1100-11(제안) + 예시행 시드','B1100-13 + 예시행 클리어(N열 수량대사 수식 보존)',
  '동일 사유','0111');
