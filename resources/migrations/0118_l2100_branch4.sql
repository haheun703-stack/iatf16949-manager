-- ============================================================
-- Migration 0118: L2100-02/03/06/10 — 판정 2 실측 분기 이행 (7차 1차 배치, 2026-07-31)
--
-- 근거: review_reply_track7_260730.md 판정 2(코워크 사내자료 검색 = 파일명 매칭 하한) +
-- 사무실 실측(2026-07-31). 4종 전부 0019 자동추출 잔재("자동 추출됨 (필드 미정의)")·
-- form_submissions 0건 — DELETE+INSERT 무손실.
--
-- 실측 결과(코워크 판정과 일치 — 반전 없음):
--   ① L2100-02 코일인수 검사일지(-조): 조관 전용 정본 완결. 데이터 = 2행 병합 12블록
--      (9:10~31:32, B/R열 병합 전 계열 실측), 측정치 = 두께 R/S/T·폭 U/V/W 각 3회.
--      33행 = 각주(KS D 3517). 결재 담당 서명칸 AA4:AC5 → 작성자 auto.
--   ② L2100-03 인수검사성적서(-조): 조관 전용 정본 완결. 항목별 고정행 성적서 —
--      겉모양(11:12행 X1/X2/X3/판정) + 치수 grid(13~16행 = 두께/폭×2, 기준치·X1~X3·판정)
--      + ★기계적 성질·화학 성분 측정 영역은 AG17:AZ27 단일 대형 병합(Mill Sheet 기재
--      영역) → textarea 1매핑. 기계·화학 기준치(Q17~Q27 '이상' 스텁)는 강종별 표준값 =
--      시트 몫. 결재 담당 AS2:AV3 → 작성자 auto.
--   ③ L2100-06 출하 검사 절차서(-쇼바19): 열람형 전환 확정 — 시트 실측 = 절차 본문이
--      도해 이미지 1장 + 담당자 표 헤더(정/부 성명·직책·연락처)뿐. 타사업부 전용 절차서
--      M2100-03 선례 + 이미지 절차도 M1100-06 선례. 기존 4필드 = 담당자 표 라벨 오인 잔재.
--   ④ L2100-10 수입검사 기준서(-쇼바04): 열람형 전환 — 실물 실측 = 품번별 완성 문서 체계.
--      품질폴더/2. 품질문서/검사기준서/수입검사 기준서/ 66건(25410-2R000 등 품번별 파일,
--      부품별 시트[HOSE/BRKT/PIPE…]에 검사항목·규격·방법·시료수 전부 기입, 변경전·수정본
--      이력 동반). ★품번별 기준서는 문서관리 영역 — 앱 작성 양식 아님(판정 2 명기).
--      마스터 쇼바 시트 매핑은 기각. 기존 16필드 = 기준서 서식 라벨 오인 잔재.
--
-- 멱등: DELETE+INSERT.
-- ============================================================

-- ── ① L2100-02 코일인수 검사일지(-조) — 조관 전용 정본 완결 ──
UPDATE forms SET
  description='정본 완결 — 7차 트랙(0118, 260731): 코일인수 검사일지(조관 전용 — AM 실물 무[코일=조관 소재], 판정 2). 인수 기록 grid 12블록(2행 병합: 입고/검사일자·LOT·규격[강종/두께/폭/조수]·측정치[두께 3회·폭 3회]·판정·비고) + 작성자(결재 담당 AA4). 각주(KS D 3517 허용차)·팀장 결재는 시트 몫.'
WHERE code='L2100-02';

DELETE FROM form_fields WHERE form_code='L2100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-02','rows','인수 검사 기록','grid','인수 검사',NULL,1,NULL),
 ('L2100-02','작성자','작성자','auto','결재',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-02','작성자','작성자','AA4','text',1);

DELETE FROM form_grid_spec WHERE form_code='L2100-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2100-02','rows',9,2,12);

DELETE FROM form_grid_columns WHERE form_code='L2100-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-02','rows','입고일자','입고 일자','B','date',1),
 ('L2100-02','rows','검사일자','검사 일자','D','date',2),
 ('L2100-02','rows','lot','LOT NO.','F','text',3),
 ('L2100-02','rows','강종','강종(재질)','I','text',4),
 ('L2100-02','rows','두께','두께(mm)','L','text',5),
 ('L2100-02','rows','폭','폭(mm)','N','text',6),
 ('L2100-02','rows','조수','조수(Kg)','P','text',7),
 ('L2100-02','rows','측정두께1','측정 두께 1','R','text',8),
 ('L2100-02','rows','측정두께2','측정 두께 2','S','text',9),
 ('L2100-02','rows','측정두께3','측정 두께 3','T','text',10),
 ('L2100-02','rows','측정폭1','측정 폭 1','U','text',11),
 ('L2100-02','rows','측정폭2','측정 폭 2','V','text',12),
 ('L2100-02','rows','측정폭3','측정 폭 3','W','text',13),
 ('L2100-02','rows','판정','판정(O/X)','X','text',14),
 ('L2100-02','rows','비고','비고','AB','text',15);

-- ── ② L2100-03 인수검사성적서(-조) — 조관 전용 정본 완결 ──
UPDATE forms SET
  description='정본 완결 — 7차 트랙(0118, 260731): 인수검사성적서(조관 전용, 판정 2). 헤더(품명·코일 규격 2줄·TOTAL·검사원·입고/검사일자·로트번호) + 겉모양 측정 4셀(X1~X3·판정) + 치수 grid(13~16행: 기준치·X1~X3·판정) + 기계·화학 성분은 Mill Sheet 기재 영역(AG17 대형 병합) textarea + 종합판정·비고 + 작성자(결재 담당 AS2). 기계·화학 기준치(강종별 표준값)·팀장 결재는 시트 몫.'
WHERE code='L2100-03';

DELETE FROM form_fields WHERE form_code='L2100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2100-03','품명','품명','text','기본 정보',NULL,1,'frame'),
 ('L2100-03','로트번호','로트 번호','text','기본 정보',NULL,2,'frame'),
 ('L2100-03','입고일자','입고일자','date','기본 정보',NULL,3,'fact'),
 ('L2100-03','검사일자','검사일자','date','기본 정보',NULL,4,'fact'),
 ('L2100-03','검사원','검사원','text','기본 정보',NULL,5,'frame'),
 ('L2100-03','규격두께1','규격 두께 1(mm)','text','코일 규격',NULL,10,'frame'),
 ('L2100-03','규격폭1','규격 폭 1(mm)','text','코일 규격',NULL,11,'frame'),
 ('L2100-03','조수1','조수 1','text','코일 규격',NULL,12,'frame'),
 ('L2100-03','중량1','중량 1(㎏)','text','코일 규격',NULL,13,'frame'),
 ('L2100-03','규격두께2','규격 두께 2(mm)','text','코일 규격',NULL,14,'frame'),
 ('L2100-03','규격폭2','규격 폭 2(mm)','text','코일 규격',NULL,15,'frame'),
 ('L2100-03','조수2','조수 2','text','코일 규격',NULL,16,'frame'),
 ('L2100-03','중량2','중량 2(㎏)','text','코일 규격',NULL,17,'frame'),
 ('L2100-03','total','TOTAL(㎏)','text','코일 규격',NULL,18,'frame'),
 ('L2100-03','겉모양x1','겉모양 X1','text','겉모양(슬리팅)',NULL,20,NULL),
 ('L2100-03','겉모양x2','겉모양 X2','text','겉모양(슬리팅)',NULL,21,NULL),
 ('L2100-03','겉모양x3','겉모양 X3','text','겉모양(슬리팅)',NULL,22,NULL),
 ('L2100-03','겉모양판정','겉모양 판정','text','겉모양(슬리팅)',NULL,23,NULL),
 ('L2100-03','치수','치수 측정(두께/폭×2)','grid','치수(슬리팅)',NULL,30,NULL),
 ('L2100-03','밀시트','기계적 성질·화학 성분(Mill Sheet 기재)','textarea','기계·화학 성분',NULL,40,NULL),
 ('L2100-03','종합판정','종합 판정','text','판정',NULL,50,NULL),
 ('L2100-03','비고','비고','text','판정',NULL,51,'frame'),
 ('L2100-03','작성자','작성자','auto','결재',NULL,60,'frame');

DELETE FROM form_cell_map WHERE form_code='L2100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2100-03','품명','품명','G4','text',1),
 ('L2100-03','로트번호','로트 번호','AO7','text',2),
 ('L2100-03','입고일자','입고일자','AO5','date',3),
 ('L2100-03','검사일자','검사일자','AO6','date',4),
 ('L2100-03','검사원','검사원','AO4','text',5),
 ('L2100-03','규격두께1','규격 두께 1(mm)','G6','text',6),
 ('L2100-03','규격폭1','규격 폭 1(mm)','N6','text',7),
 ('L2100-03','조수1','조수 1','U6','text',8),
 ('L2100-03','중량1','중량 1(㎏)','Z6','text',9),
 ('L2100-03','규격두께2','규격 두께 2(mm)','G7','text',10),
 ('L2100-03','규격폭2','규격 폭 2(mm)','N7','text',11),
 ('L2100-03','조수2','조수 2','U7','text',12),
 ('L2100-03','중량2','중량 2(㎏)','Z7','text',13),
 ('L2100-03','total','TOTAL(㎏)','G8','text',14),
 ('L2100-03','겉모양x1','겉모양 X1','AG11','text',15),
 ('L2100-03','겉모양x2','겉모양 X2','AL11','text',16),
 ('L2100-03','겉모양x3','겉모양 X3','AQ11','text',17),
 ('L2100-03','겉모양판정','겉모양 판정','AV11','text',18),
 ('L2100-03','밀시트','기계적 성질·화학 성분(Mill Sheet 기재)','AG17','text',19),
 ('L2100-03','종합판정','종합 판정','AS29','text',20),
 ('L2100-03','비고','비고','C28','text',21),
 ('L2100-03','작성자','작성자','AS2','text',22);

DELETE FROM form_grid_spec WHERE form_code='L2100-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2100-03','치수',13,1,4);

DELETE FROM form_grid_columns WHERE form_code='L2100-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2100-03','치수','기준치','기준치','Q','text',1),
 ('L2100-03','치수','x1','X1','AG','text',2),
 ('L2100-03','치수','x2','X2','AL','text',3),
 ('L2100-03','치수','x3','X3','AQ','text',4),
 ('L2100-03','치수','판정','판정','AV','text',5);

-- ── ③ L2100-06 출하 검사 절차서(-쇼바19) — 열람형 전환 ──
UPDATE forms SET
  description='📖 열람형(참조 문서) — 출하 검사 절차서(쇼바용접사업부 전용): 절차 본문 = 도해 이미지 1장 + 담당자 표 헤더(정/부)뿐 — AM 실물 무. 타사업부 전용 절차서 M2100-03 선례 + 이미지 절차도 M1100-06 선례. 쇼바 출하검사 기록 동선은 마스터 출하검사 성적서(쇼바20)·이력 관리대장(쇼바21) 시트. (판정 2 실측 확정, 0118 260731)'
WHERE code='L2100-06';

-- ── ④ L2100-10 수입검사 기준서(-쇼바04) — 열람형 전환 ──
UPDATE forms SET
  description='📖 열람형(참조 문서) — 수입검사 기준서: 실물 운영 정본 = 품번별 완성 문서 체계(품질폴더/2. 품질문서/검사기준서/수입검사 기준서/ 66건 — 부품별 시트에 검사항목·규격·방법·시료수 기입, 변경전·수정본 이력). ★품번별 기준서는 문서관리 영역 — 앱 작성 양식 아님(판정 2 명기, 마스터 쇼바04 시트 매핑 기각). AM 수입검사 기록 동선은 수입검사 관리대장(L2100-07)로. (0118 260731)'
WHERE code='L2100-10';

DELETE FROM form_fields WHERE form_code IN ('L2100-06','L2100-10');
DELETE FROM form_cell_map WHERE form_code IN ('L2100-06','L2100-10');
DELETE FROM form_grid_spec WHERE form_code IN ('L2100-06','L2100-10');
DELETE FROM form_grid_columns WHERE form_code IN ('L2100-06','L2100-10');

DELETE FROM form_change_log WHERE migration='0118';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('L2100-02','2026-07-31','cellmap_redesign','0019 잔재 8필드(헤더 라벨 오인)','인수 기록 grid 12블록(2행 병합, 측정치 두께/폭 각 3회) + 작성자 AA4',
  '판정 2 — 조관 전용 정본 완결(L2100-04 선례). 마스터 실측: 2행 병합 12블록(9:10~31:32)·측정치 3열 구조','0118'),
 ('L2100-03','2026-07-31','cellmap_redesign','0019 잔재 18필드·45셀맵(서식 라벨 오인)','헤더 14 + 겉모양 4셀 + 치수 grid(13~16) + Mill Sheet textarea(AG17) + 종합판정·비고 + 작성자 AS2',
  '판정 2 — 조관 전용 정본 완결. 실측 반전 소견: 기계·화학 측정 영역 = AG17:AZ27 단일 대형 병합(개별 기입 칸 없음 → Mill Sheet 기재 영역 textarea 1매핑)','0118'),
 ('L2100-06','2026-07-31','reclassify','작성 양식(0019 잔재 4필드 = 담당자 표 라벨)','문서 열람형(타사업부 절차서)',
  '판정 2 열람형 조건 실측 확정 — 절차 본문 = 이미지 1장 + 담당자 표 헤더뿐. M2100-03·M1100-06 선례','0118'),
 ('L2100-10','2026-07-31','reclassify','작성 양식(0019 잔재 16필드 = 기준서 서식 라벨)','문서 열람형(품번별 기준서는 문서관리 영역)',
  '판정 2 실물 분기 — 품질폴더 66건 품번별 완성 문서 체계 실측(부품별 시트 전부 기입·개정 이력 동반) → 열람형 + 문서관리 영역 명기. 마스터 쇼바04 시트 매핑 기각','0118');
