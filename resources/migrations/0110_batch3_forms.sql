-- ============================================================
-- Migration 0110: 양식 완성전 3배치 — 공정·물류·식별 19종 (2026-07-29)
--
-- 대상(조사서 3배치): M1200 8종 · M2100 5종 · M3100-01/06 · K2100-01/07/10 · K1200-06
-- (조사서 표기 "20종"은 기완료 M1200-08/10/11 포함 집계 — 갭A 실모수 = 19종)
--
-- 실측(7/29 오전) 정직 3분류:
--  ⓐ 진행 13종 — 마스터 시트 9(전부 실존 — 갭B "원본 부재" 반전과 반대) + 0065 설계본 4.
--  ⓑ 열람형 전환 6종(M1100-05 판정3 선례 적용) — 기정의 본문·이미지 문서라 기록 주입 시
--     정본을 덮어씀: M1200-05·07(절차서 본문+PROCESS FLOW/현장사진), M2100-02(FIFO 규칙
--     완성문), M2100-03-01/02(타사업부 전용 이미지 문서 r268), K2100-07(기준 본문+기준표).
--     선례 재적용 이행 — 검수요청에 명기, 이의 시 반전.
--  ⓒ 전용 서식 2종(M1200-01/02 = 인발사업부 전용, AM 실물 부재 실측) — A5200-04-01
--     선례 '정본 완결(SQ 증거 목적)': 빈 틀 신설 없이 마스터 첫 시트(-인) 최소 매핑.
--
-- 안전: 19종 전부 form_submissions 0건 실측(복사본 7/29) — DELETE+INSERT 무손실.
-- 멱등: DELETE 후 INSERT + UPDATE — 재실행 = 동일 결과.
-- 수식 보존(계산기형 선례 L4102-02): K2100-01 중량(G)·K1200-06 년누적/달성율(S/T)·
-- M1200-09 부자재대사(F/I/J) = 의도적 미매핑.
-- ============================================================

-- ════════════════ ⓐ 진행 13종 ════════════════

-- ── ① M3100-01 출하관리대장 — 대장형 grid ──────────────────
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: 출하 기록 대장(차종·품번·수량·LOT·출하일자·출하 점검 4항목 ○/×). 출하검사 성적서(M3100-05)와 세트.'
WHERE code='M3100-01';

DELETE FROM form_fields WHERE form_code='M3100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M3100-01','rows','출하 기록','grid','출하 기록',NULL,1,NULL),
 ('M3100-01','작성자','작성자','auto','확인',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='M3100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M3100-01','작성자','작성자','AP2','text',1);

DELETE FROM form_grid_spec WHERE form_code='M3100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M3100-01','rows',6,1,20);

DELETE FROM form_grid_columns WHERE form_code='M3100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M3100-01','rows','no','순','A','text',1),
 ('M3100-01','rows','차종','차종','B','text',2),
 ('M3100-01','rows','사양','사양','E','text',3),
 ('M3100-01','rows','구분','구분','H','text',4),
 ('M3100-01','rows','품번','품번','L','text',5),
 ('M3100-01','rows','출하수량','출하수량(개)','S','text',6),
 ('M3100-01','rows','lot_no','LOT NO(각인NO)','V','text',7),
 ('M3100-01','rows','출하일자','출하일자','Y','text',8),
 ('M3100-01','rows','용기상태','용기 상태(○/×)','AB','text',9),
 ('M3100-01','rows','장입수량','제품 장입수량(○/×)','AF','text',10),
 ('M3100-01','rows','식별표','식별표 일치성(○/×)','AJ','text',11),
 ('M3100-01','rows','출하검사','출하검사 여부(○/×)','AN','text',12),
 ('M3100-01','rows','비고','비고','AR','text',13);

-- ── ② M1200-03 주,야 인수인계 일지 — 문서형(주/야 대칭 18칸) ──
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: 주간↔야간 교대 인수인계(설비·품질·안전·자재·기타 이슈 5구분 × 양방향).'
WHERE code='M1200-03';

DELETE FROM form_fields WHERE form_code='M1200-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-03','작성일자_주간','작성일자(주간조)','date','주간조 → 야간조',NULL,1,'fact'),
 ('M1200-03','작성자_주간','작성자(주간조)','text','주간조 → 야간조',NULL,2,'frame'),
 ('M1200-03','설비공정_주간','설비&공정명(주간조)','text','주간조 → 야간조',NULL,3,'frame'),
 ('M1200-03','품번품명_주간','품번&품명(주간조)','text','주간조 → 야간조',NULL,4,'frame'),
 ('M1200-03','설비이슈_주간','설비관련 이슈(주간조)','text','주간조 → 야간조',NULL,5,'frame'),
 ('M1200-03','품질이슈_주간','품질관련 이슈(주간조)','text','주간조 → 야간조',NULL,6,'frame'),
 ('M1200-03','안전이슈_주간','안전관련 이슈(주간조)','text','주간조 → 야간조',NULL,7,'frame'),
 ('M1200-03','자재이슈_주간','자재관련 이슈(주간조)','text','주간조 → 야간조',NULL,8,'frame'),
 ('M1200-03','기타이슈_주간','기타 이슈(주간조)','text','주간조 → 야간조',NULL,9,'frame'),
 ('M1200-03','작성일자_야간','작성일자(야간조)','date','야간조 → 주간조',NULL,10,'fact'),
 ('M1200-03','작성자_야간','작성자(야간조)','text','야간조 → 주간조',NULL,11,'frame'),
 ('M1200-03','설비공정_야간','설비&공정명(야간조)','text','야간조 → 주간조',NULL,12,'frame'),
 ('M1200-03','품번품명_야간','품번&품명(야간조)','text','야간조 → 주간조',NULL,13,'frame'),
 ('M1200-03','설비이슈_야간','설비관련 이슈(야간조)','text','야간조 → 주간조',NULL,14,'frame'),
 ('M1200-03','품질이슈_야간','품질관련 이슈(야간조)','text','야간조 → 주간조',NULL,15,'frame'),
 ('M1200-03','안전이슈_야간','안전관련 이슈(야간조)','text','야간조 → 주간조',NULL,16,'frame'),
 ('M1200-03','자재이슈_야간','자재관련 이슈(야간조)','text','야간조 → 주간조',NULL,17,'frame'),
 ('M1200-03','기타이슈_야간','기타 이슈(야간조)','text','야간조 → 주간조',NULL,18,'frame'),
 ('M1200-03','작성자','작성자','auto','확인',NULL,19,'frame');

DELETE FROM form_cell_map WHERE form_code='M1200-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-03','작성일자_주간','작성일자(주간조)','J4','date',1),
 ('M1200-03','작성자_주간','작성자(주간조)','U4','text',2),
 ('M1200-03','설비공정_주간','설비&공정명(주간조)','J5','text',3),
 ('M1200-03','품번품명_주간','품번&품명(주간조)','U5','text',4),
 ('M1200-03','설비이슈_주간','설비관련 이슈(주간조)','F7','text',5),
 ('M1200-03','품질이슈_주간','품질관련 이슈(주간조)','F8','text',6),
 ('M1200-03','안전이슈_주간','안전관련 이슈(주간조)','F9','text',7),
 ('M1200-03','자재이슈_주간','자재관련 이슈(주간조)','F10','text',8),
 ('M1200-03','기타이슈_주간','기타 이슈(주간조)','F11','text',9),
 ('M1200-03','작성일자_야간','작성일자(야간조)','AE4','date',10),
 ('M1200-03','작성자_야간','작성자(야간조)','AP4','text',11),
 ('M1200-03','설비공정_야간','설비&공정명(야간조)','AE5','text',12),
 ('M1200-03','품번품명_야간','품번&품명(야간조)','AP5','text',13),
 ('M1200-03','설비이슈_야간','설비관련 이슈(야간조)','AA7','text',14),
 ('M1200-03','품질이슈_야간','품질관련 이슈(야간조)','AA8','text',15),
 ('M1200-03','안전이슈_야간','안전관련 이슈(야간조)','AA9','text',16),
 ('M1200-03','자재이슈_야간','자재관련 이슈(야간조)','AA10','text',17),
 ('M1200-03','기타이슈_야간','기타 이슈(야간조)','AA11','text',18),
 ('M1200-03','작성자','작성자','AM2','text',19);

DELETE FROM form_grid_spec WHERE form_code='M1200-03';
DELETE FROM form_grid_columns WHERE form_code='M1200-03';

-- ── ③ M1200-04 공정,납입용기 관리기준 및 수리이력 — 하단 수리이력 grid ──
-- 상단 관리기준 4블록(공정명·용기 사진 포함) = 고정 기준표(의도적 미매핑).
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: 하단 수리이력 관리대장(6블록 — 용기명·규격·조치상세·금액·조치자·일자, 조치항목 4행은 시트 프리셋). 상단 용기 관리기준표(사진 포함)는 고정 기준 — 미매핑.'
WHERE code='M1200-04';

DELETE FROM form_fields WHERE form_code='M1200-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-04','repairs','수리이력 기록(블록당 1건)','grid','수리이력 관리대장',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='M1200-04';

DELETE FROM form_grid_spec WHERE form_code='M1200-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M1200-04','repairs',27,4,6);

DELETE FROM form_grid_columns WHERE form_code='M1200-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-04','repairs','용기명','용기명','C','text',1),
 ('M1200-04','repairs','용기규격','용기 규격','G','text',2),
 ('M1200-04','repairs','조치상세','조치 상세 내용(조치항목 명시: 청정도/파손/변형/폐기)','S','text',3),
 ('M1200-04','repairs','조치금액','조치금액(원)','AG','text',4),
 ('M1200-04','repairs','조치자','조치자','AK','text',5),
 ('M1200-04','repairs','조치일자','조치일자','AO','text',6);

-- ── ④ M1200-06 낙하품 처리 관리대장 — 2행 병합 grid(본행+상세행) ──
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: 낙하품 발생·조치 대장(2행 블록 8건 — 본행 + 조치 상세행. 폐기/수정 □체크는 시트 수기, 상세에 조치구분 명기).'
WHERE code='M1200-06';

DELETE FROM form_fields WHERE form_code='M1200-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-06','rows','낙하품 기록','grid','낙하품 기록',NULL,1,NULL),
 ('M1200-06','details','조치 상세(행 순서 대응)','grid','낙하품 기록',NULL,2,NULL);

DELETE FROM form_cell_map WHERE form_code='M1200-06';

DELETE FROM form_grid_spec WHERE form_code='M1200-06';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M1200-06','rows',5,2,8),
 ('M1200-06','details',6,2,8);

DELETE FROM form_grid_columns WHERE form_code='M1200-06';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-06','rows','no','순','A','text',1),
 ('M1200-06','rows','발생일자','발생일자','C','text',2),
 ('M1200-06','rows','차종','차종','G','text',3),
 ('M1200-06','rows','품번','품번','J','text',4),
 ('M1200-06','rows','발생공정','발생공정','P','text',5),
 ('M1200-06','rows','작업자','작업자','S','text',6),
 ('M1200-06','rows','발생수량','발생수량(개)','V','text',7),
 ('M1200-06','rows','현상','현상','Y','text',8),
 ('M1200-06','rows','확인','확인','AP','text',9),
 ('M1200-06','rows','비고','비고','AT','text',10),
 ('M1200-06','details','조치상세','조치 상세내용(폐기/수정 구분 명기)','AH','text',1);

-- ── ⑤ M1200-01 작업지시서(-인) — 인발 전용 정본 완결(A5200-04-01 유형) ──
UPDATE forms SET
  description='마스터 정본(-인 시트) — 인발사업부 전용 서식(AM 실물 부재 실측 — AM 작업지시는 MES 소관). SQ 증거 목적 정본 완결(A5200-04-01 유형): 호기 구분(1·2·신규·3호기)은 시트 프리셋, 행 순서대로 기입.'
WHERE code='M1200-01';

DELETE FROM form_fields WHERE form_code='M1200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-01','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('M1200-01','rows','지시 내역(호기 구분은 시트 프리셋 — 1호기 6행·2호기 6행·신규 5행·3호기 5행 순)','grid','지시 내역',NULL,2,NULL);

DELETE FROM form_cell_map WHERE form_code='M1200-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-01','작성일','작성일','I5','date',1);

DELETE FROM form_grid_spec WHERE form_code='M1200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M1200-01','rows',8,1,22);

DELETE FROM form_grid_columns WHERE form_code='M1200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-01','rows','od','제품규격 O.D','B','text',1),
 ('M1200-01','rows','id','제품규격 I.D','C','text',2),
 ('M1200-01','rows','소재규격','소재규격','D','text',3),
 ('M1200-01','rows','본수','본수','E','text',4),
 ('M1200-01','rows','공차외경','공차(외경)','F','text',5),
 ('M1200-01','rows','공차내경','공차(내경)','G','text',6),
 ('M1200-01','rows','작업방법','작업방법(E/P)','H','text',7),
 ('M1200-01','rows','생산본수','생산본수','I','text',8),
 ('M1200-01','rows','납품처','납품처','J','text',9),
 ('M1200-01','rows','납기일','납기일','K','text',10),
 ('M1200-01','rows','비고','비고','L','text',11);

-- ── ⑥ M1200-02 열처리작업일보(-인) — 인발 전용 정본 완결(블록1 최소 매핑) ──
UPDATE forms SET
  description='마스터 정본(-인 시트) — 인발사업부 전용 서식(AM 열처리 공정 없음 — AM은 브레이징 M1200-11). SQ 증거 목적 정본 완결: 순서 블록1(5행)만 매핑, 블록 2~14·가열조건 SV/PV 매트릭스는 시트 몫.'
WHERE code='M1200-02';

DELETE FROM form_fields WHERE form_code='M1200-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-02','작업일','작업일','date','기본 정보',NULL,1,'fact'),
 ('M1200-02','작업자','작업자명','text','기본 정보',NULL,2,'frame'),
 ('M1200-02','선단부확인','선단부 확인(O/X)','text','순서 1 기록',NULL,3,'frame'),
 ('M1200-02','입고lot','입고 LOT','text','순서 1 기록',NULL,4,'frame'),
 ('M1200-02','투입시각','투입 시각','text','순서 1 기록',NULL,5,'frame'),
 ('M1200-02','투입수량','투입수량(본수)','text','순서 1 기록',NULL,6,'frame'),
 ('M1200-02','측정_비드부','외경 측정값(비드부)','text','순서 1 외경 측정',NULL,7,'frame'),
 ('M1200-02','측정_3시','외경 측정값(3시)','text','순서 1 외경 측정',NULL,8,'frame'),
 ('M1200-02','측정_6시','외경 측정값(6시)','text','순서 1 외경 측정',NULL,9,'frame'),
 ('M1200-02','측정_9시','외경 측정값(9시)','text','순서 1 외경 측정',NULL,10,'frame'),
 ('M1200-02','측정_편차','외경 측정값(편차)','text','순서 1 외경 측정',NULL,11,'frame');

DELETE FROM form_cell_map WHERE form_code='M1200-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-02','작업일','작업일','E3','date',1),
 ('M1200-02','작업자','작업자명','R3','text',2),
 ('M1200-02','선단부확인','선단부 확인(O/X)','B9','text',3),
 ('M1200-02','입고lot','입고 LOT','C9','text',4),
 ('M1200-02','투입시각','투입 시각','D9','text',5),
 ('M1200-02','투입수량','투입수량(본수)','L9','text',6),
 ('M1200-02','측정_비드부','외경 측정값(비드부)','I9','text',7),
 ('M1200-02','측정_3시','외경 측정값(3시)','I10','text',8),
 ('M1200-02','측정_6시','외경 측정값(6시)','I11','text',9),
 ('M1200-02','측정_9시','외경 측정값(9시)','I12','text',10),
 ('M1200-02','측정_편차','외경 측정값(편차)','I13','text',11);

DELETE FROM form_grid_spec WHERE form_code='M1200-02';
DELETE FROM form_grid_columns WHERE form_code='M1200-02';

-- ── ⑦ M2100-01 LOT관리 기준서 — 헤더 + 규칙표 grid(반-MES lot_registry 접점) ──
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: LOT 기록 규칙표(시기·장소·기록방법·담당부서 10행) 작성형. 상단 LOT 구성 다이어그램은 고정 — 미매핑. 반-MES lot_registry 와 접점.'
WHERE code='M2100-01';

DELETE FROM form_fields WHERE form_code='M2100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M2100-01','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('M2100-01','작성자','작성자','auto','기본 정보',NULL,2,'frame'),
 ('M2100-01','rules','LOT 기록 규칙','grid','LOT 기록 규칙',NULL,3,NULL);

DELETE FROM form_cell_map WHERE form_code='M2100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M2100-01','작성일','작성일','E4','date',1),
 ('M2100-01','작성자','작성자','U4','text',2);

DELETE FROM form_grid_spec WHERE form_code='M2100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M2100-01','rules',19,1,10);

DELETE FROM form_grid_columns WHERE form_code='M2100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M2100-01','rules','시기','시기','C','text',1),
 ('M2100-01','rules','장소','장소','H','text',2),
 ('M2100-01','rules','기록방법','LOT 기록 방법','M','text',3),
 ('M2100-01','rules','담당부서','담당 부서','AQ','text',4);

-- ── ⑧ K2100-01 장기재고관리 현황 — 대장형 grid(중량 수식 보존) ──
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 필드 완결: 장기재고 현황 대장(강종·재질·규격·수량·용도·관리방안·상태). 중량(G열)은 시트 자동계산 수식 — 의도적 미매핑(L4102-02 선례).'
WHERE code='K2100-01';

DELETE FROM form_fields WHERE form_code='K2100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-01','관리자','관리자','text','기본 정보',NULL,1,'frame'),
 ('K2100-01','rows','장기재고 현황','grid','장기재고 현황',NULL,2,NULL);

DELETE FROM form_cell_map WHERE form_code='K2100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K2100-01','관리자','관리자','J4','text',1);

DELETE FROM form_grid_spec WHERE form_code='K2100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-01','rows',7,1,17);

DELETE FROM form_grid_columns WHERE form_code='K2100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-01','rows','강종','강종','A','text',1),
 ('K2100-01','rows','재질','재질','B','text',2),
 ('K2100-01','rows','od','규격 O.D','C','text',3),
 ('K2100-01','rows','두께','규격 T','D','text',4),
 ('K2100-01','rows','길이','규격 길이','E','text',5),
 ('K2100-01','rows','수량','수량(本)','F','text',6),
 ('K2100-01','rows','구매용도','구매용도','H','text',7),
 ('K2100-01','rows','관리방안','관리 방안','I','text',8),
 ('K2100-01','rows','관리상태','관리상태','J','text',9);

-- ── ⑨ K1200-06 협력사 월별 모니터링 — 매트릭스 최소 매핑(F2100-10 선례) ──
UPDATE forms SET
  description='마스터 정본 — 3배치(260729) 최소 매핑(F2100-10 매트릭스 선례): 연도 표기·업체명 3. 지표 8종 × 월 12열 실적값·년누적/달성율 수식은 시트 몫(수식 보존).'
WHERE code='K1200-06';

DELETE FROM form_fields WHERE form_code='K1200-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-06','연도표기','제목 연도 표기','text','기본 정보',NULL,1,'frame'),
 ('K1200-06','업체명1','업체명 1','text','대상 업체',NULL,2,'frame'),
 ('K1200-06','업체명2','업체명 2','text','대상 업체',NULL,3,'frame'),
 ('K1200-06','업체명3','업체명 3','text','대상 업체',NULL,4,'frame');

DELETE FROM form_cell_map WHERE form_code='K1200-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-06','연도표기','제목 연도 표기','A1','text',1),
 ('K1200-06','업체명1','업체명 1','B5','text',2),
 ('K1200-06','업체명2','업체명 2','B13','text',3),
 ('K1200-06','업체명3','업체명 3','B21','text',4);

DELETE FROM form_grid_spec WHERE form_code='K1200-06';
DELETE FROM form_grid_columns WHERE form_code='K1200-06';

-- ── ⑩ M2100-10 LOT 추적성 대장(0065 설계본) — 대장형 grid ──
UPDATE forms SET
  description='신규 설계본(0065, 예시행 클리어 260729) — 3배치 필드 완결: 원자재↔완제품 LOT 추적 대장. 반-MES lot_registry 역추적과 접점.'
WHERE code='M2100-10';

DELETE FROM form_fields WHERE form_code='M2100-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M2100-10','rows','LOT 추적 기록','grid','LOT 추적 기록',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='M2100-10';

DELETE FROM form_grid_spec WHERE form_code='M2100-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M2100-10','rows',4,1,36);

DELETE FROM form_grid_columns WHERE form_code='M2100-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M2100-10','rows','no','No','A','text',1),
 ('M2100-10','rows','생산일','생산일','B','text',2),
 ('M2100-10','rows','완제품품번','완제품 품번','C','text',3),
 ('M2100-10','rows','완제품lot','완제품 LOT','D','text',4),
 ('M2100-10','rows','공정설비','공정/설비','E','text',5),
 ('M2100-10','rows','작업자','작업자','F','text',6),
 ('M2100-10','rows','원자재1','원자재1 품명/LOT','G','text',7),
 ('M2100-10','rows','원자재2','원자재2 품명/LOT','H','text',8),
 ('M2100-10','rows','부자재','부자재(동링 등) 품명/LOT','I','text',9),
 ('M2100-10','rows','성적서no','수입검사 성적서 No.','J','text',10),
 ('M2100-10','rows','생산수량','생산수량','K','text',11),
 ('M2100-10','rows','출하일','출하일','L','text',12),
 ('M2100-10','rows','출하처','출하처','M','text',13),
 ('M2100-10','rows','선입선출','선입선출 확인(○/×)','N','text',14),
 ('M2100-10','rows','비고','비고','O','text',15);

-- ── ⑪ K2100-10 자재 보관장 점검표(0065 설계본) — 월간점검 grid ──
UPDATE forms SET
  description='신규 설계본(0065, 예시행 클리어 260729) — 3배치 필드 완결: 월간점검 시트 대장형. 창고 Lay-Out 등록표 시트는 시트 몫(export = 첫 시트 한정).'
WHERE code='K2100-10';

DELETE FROM form_fields WHERE form_code='K2100-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-10','rows','월간 점검 기록','grid','월간 점검',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='K2100-10';

DELETE FROM form_grid_spec WHERE form_code='K2100-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-10','rows',4,1,22);

DELETE FROM form_grid_columns WHERE form_code='K2100-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-10','rows','점검일','점검일','A','text',1),
 ('K2100-10','rows','구역','구역(번지)','B','text',2),
 ('K2100-10','rows','발청손상','발청·손상(○양호/×)','C','text',3),
 ('K2100-10','rows','이물오염','이물 오염','D','text',4),
 ('K2100-10','rows','식별상태','식별상태(라벨)','E','text',5),
 ('K2100-10','rows','선입선출','선입선출 준수','F','text',6),
 ('K2100-10','rows','장기재고','장기재고(6개월↑)','G','text',7),
 ('K2100-10','rows','항온항습','항온항습(해당 시)','H','text',8),
 ('K2100-10','rows','지적조치','지적/조치사항','I','text',9),
 ('K2100-10','rows','조치완료일','조치완료일','J','text',10),
 ('K2100-10','rows','점검자','점검자','K','text',11);

-- ── ⑫ M3100-06 용기·적재 표준화 기준표(0065 설계본) — 기준표 grid ──
UPDATE forms SET
  description='신규 설계본(0065, 예시행 클리어 260729) — 3배치 필드 완결: 품번별 용기·적재 표준 기준표(장입수·단수·식별·청정도·라벨).'
WHERE code='M3100-06';

DELETE FROM form_fields WHERE form_code='M3100-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M3100-06','rows','용기·적재 기준','grid','용기·적재 기준',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='M3100-06';

DELETE FROM form_grid_spec WHERE form_code='M3100-06';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M3100-06','rows',4,1,23);

DELETE FROM form_grid_columns WHERE form_code='M3100-06';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M3100-06','rows','no','No','A','text',1),
 ('M3100-06','rows','품번','품번','B','text',2),
 ('M3100-06','rows','품명','품명','C','text',3),
 ('M3100-06','rows','공정','공정','D','text',4),
 ('M3100-06','rows','용기종류','용기 종류','E','text',5),
 ('M3100-06','rows','장입수','장입수(EA/단)','F','text',6),
 ('M3100-06','rows','최대단수','최대 단수','G','text',7),
 ('M3100-06','rows','식별','처리 전/후 식별(색표 등)','H','text',8),
 ('M3100-06','rows','청정도','청정도 관리(세척/커버)','I','text',9),
 ('M3100-06','rows','라벨','용기 라벨 실물표기','J','text',10),
 ('M3100-06','rows','제정일','제정일','K','text',11),
 ('M3100-06','rows','비고','비고','L','text',12);

-- ── ⑬ M1200-09 공정이동 전표·부자재 대사표(0065 설계본) — 전표 grid ──
UPDATE forms SET
  description='신규 설계본(0065, 예시행 클리어·양식번호 정정 260729) — 3배치 필드 완결: 공정이동 전표(공정 누락 방지 — 확인란 공란 통과 금지). 부자재 수불 대사 시트(월간·수식 자동계산)는 시트 몫(export = 첫 시트 한정).'
WHERE code='M1200-09';

DELETE FROM form_fields WHERE form_code='M1200-09';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-09','품번','품번','text','기본 정보',NULL,1,'frame'),
 ('M1200-09','품명','품명','text','기본 정보',NULL,2,'frame'),
 ('M1200-09','lot_no','LOT No.','text','기본 정보',NULL,3,'frame'),
 ('M1200-09','수량','수량','text','기본 정보',NULL,4,'frame'),
 ('M1200-09','moves','공정 이동 기록(공정순서 1~6 = 시트 프리셋)','grid','공정 이동',NULL,5,NULL);

DELETE FROM form_cell_map WHERE form_code='M1200-09';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-09','품번','품번','B3','text',1),
 ('M1200-09','품명','품명','D3','text',2),
 ('M1200-09','lot_no','LOT No.','F3','text',3),
 ('M1200-09','수량','수량','H3','text',4);

DELETE FROM form_grid_spec WHERE form_code='M1200-09';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M1200-09','moves',5,1,6);

DELETE FROM form_grid_columns WHERE form_code='M1200-09';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-09','moves','공정명','공정명','B','text',1),
 ('M1200-09','moves','완료일시','완료일시','C','text',2),
 ('M1200-09','moves','작업자확인','작업자 확인(서명)','D','text',3),
 ('M1200-09','moves','검사확인','검사 확인(초/종품)','E','text',4),
 ('M1200-09','moves','양품수량','수량(양품)','F','text',5),
 ('M1200-09','moves','불량수량','수량(불량)','G','text',6),
 ('M1200-09','moves','비고','비고','H','text',7);

-- ════════════════ ⓑ 열람형 전환 6종(M1100-05 선례) ════════════════
-- 기정의 본문·이미지 문서 — 기록 주입 시 정본을 덮어씀. fields 미정의 유지.

UPDATE forms SET
  description='📖 열람형(참조 문서) — 낙하품 처리 절차 본문 + PROCESS FLOW 도해(이미지)·처리 주의사항·제개정 이력 기정의. 작성 양식 아님(발생 기록은 M1200-06 낙하품 처리 관리대장으로). M1100-05 선례 적용(3배치 260729).'
WHERE code='M1200-05';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 셋업품 처리 절차 본문 + 현장 사진 4(셋업품 식별표·식별 관리·성적서/보관장) 기정의. 작성 양식 아님. M1100-05 선례 적용(3배치 260729).'
WHERE code='M1200-07';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 원소재·완제품 선입선출(FIFO) 규칙 기정의 완성문(적재/출하 순서도·LOT 식별표 해석방법 포함). 작성 양식 아님(점검 기록은 K2100-10 자재 보관장 점검표로). M1100-05 선례 적용(3배치 260729).'
WHERE code='M2100-02';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 필라네크사업부 전용 LOT 추적성 흐름 이미지 문서(도해 19장, r268). 작성 양식 아님 + 타사업부 전용. AM LOT 추적 기록은 M2100-10 LOT 추적성 대장으로. M1100-05 선례 적용(3배치 260729).'
WHERE code='M2100-03-01';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 쇼바용접사업부 전용 LOT 추적성 흐름 이미지 문서(도해 15장, r268). 작성 양식 아님 + 타사업부 전용. AM LOT 추적 기록은 M2100-10 LOT 추적성 대장으로. M1100-05 선례 적용(3배치 260729).'
WHERE code='M2100-03-02';

UPDATE forms SET
  description='📖 열람형(참조 문서) — 장기 재고 관리 기준(목적·정의·3개월 선정 기준) 본문 + 기준표 기정의. 작성 양식 아님(현황 기록은 K2100-01 장기재고관리 현황으로). M1100-05 선례 적용(3배치 260729).'
WHERE code='K2100-07';

-- 열람형 6종은 fields 미정의 유지가 정의 — 잔재 셀맵(0019 자동추출)만 정리
DELETE FROM form_fields WHERE form_code IN ('M1200-05','M1200-07','M2100-02','M2100-03-01','M2100-03-02','K2100-07');
DELETE FROM form_cell_map WHERE form_code IN ('M1200-05','M1200-07','M2100-02','M2100-03-01','M2100-03-02','K2100-07');
DELETE FROM form_grid_spec WHERE form_code IN ('M1200-05','M1200-07','M2100-02','M2100-03-01','M2100-03-02','K2100-07');
DELETE FROM form_grid_columns WHERE form_code IN ('M1200-05','M1200-07','M2100-02','M2100-03-01','M2100-03-02','K2100-07');

-- ════════════════ 변경 이력(form_change_log) ════════════════
DELETE FROM form_change_log WHERE migration='0110';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('M1200-05','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(절차 본문+FLOW 도해)',
  '실측 — 기정의 본문·이미지 문서라 기록 주입 시 정본을 덮어씀. M1100-05 판정3 선례 재적용(검수요청 명기, 이의 시 반전)','0110'),
 ('M1200-07','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(절차 본문+현장 사진 4)',
  '실측 — 동일 사유. M1100-05 선례 재적용','0110'),
 ('M2100-02','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(FIFO 규칙 완성문)',
  '실측 — 전 셀 기정의(규칙 서술·순서도·식별표 해석). M1100-05 선례 재적용','0110'),
 ('M2100-03-01','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(필라네크 전용 이미지 문서)',
  '실측 — 이미지 19장 흐름도 문서 + 타사업부 전용. M1100-05 선례 재적용','0110'),
 ('M2100-03-02','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(쇼바용접 전용 이미지 문서)',
  '실측 — 이미지 15장 흐름도 문서 + 타사업부 전용. M1100-05 선례 재적용','0110'),
 ('K2100-07','2026-07-29','reclassify','작성 양식(갭A 집계 대상)','문서 열람형(장기재고 기준 본문+기준표)',
  '실측 — 기정의 기준 문서. M1100-05 선례 재적용','0110'),
 ('M1200-09','2026-07-29','template_correct','템플릿 내부 양식번호 M1200-05(제안)','M1200-09',
  '0065 코드충돌 재부여 잔재 정정(파일명·template_path 는 유지 — 05_금형 선례). 예시행 클리어 동반','0110'),
 ('M2100-10','2026-07-29','template_correct','양식번호 M2100-10(제안) + 예시행 시드','양식번호 M2100-10 + 예시행 클리어',
  '(제안) 꼬리표 제거(0104 선례) + 설계본 예시 시드 클리어("빈칸이 가짜보다 낫다")','0110'),
 ('K2100-10','2026-07-29','template_correct','양식번호 K2100-10(제안) + 예시행 시드','양식번호 K2100-10 + 예시행 클리어(월간점검·Lay-Out 2시트)',
  '동일 사유','0110'),
 ('M3100-06','2026-07-29','template_correct','양식번호 M3100-06(제안) + 예시행 시드','양식번호 M3100-06 + 예시행 클리어',
  '동일 사유','0110');
