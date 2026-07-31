-- ============================================================
-- Migration 0120: 7차 1차 배치 2일차 — 충돌 잔여 8양식 재설계 = 수식 충돌 0 달성 (2026-07-31)
--
-- 근거: 수식충돌_스캔보고_260730.md §1 잔존 10건/8양식(1일차 후) 전량 소거.
-- 8종 전부 0019 자동추출 잔재·form_submissions 0건 — DELETE+INSERT 무손실.
-- 검수회신 track7_b1d1 §5-1 승인분("충돌 잔여 8양식 10건 → 0 달성").
--
-- 실측(2026-07-31 사무실, 전 양식 마스터 병합·수식 전수 확인):
--   ① F2100-11 자격 인증 교육 및 평가서: 인적 헤더 9 + 교육과정 grid(12~14행, 교육처/강사는
--      3행 통합 병합 단일 칸) + 시간표 grid(16~23행 2행 병합 4블록×3열) + 이론 Y26/실기 Y31
--      점수 → 소계 Y36=Y26+Y31 수식 보존(원 충돌). 근무경력 Y7=DATEDIF 수식 — 입사일자
--      Y6이 원 입력. 경력 기준일(AJ2~4)·인증 기준·결재(팀장/사장)는 시트 몫.
--   ② F2100-13 공정면허 자격인증 평가서(종합): 명부 grid(6~14행 9명 — 소속·성명·평가 4종·
--      근무년수·판정 LEVEL·비고). 합계 AG=SUM(M:AF) 수식 보존(원 충돌). 결재 담당 AJ2:AL3
--      → 작성자 auto.
--   ③ H3100-01 년 고객만족도 모니터링: 고객사 3블록×지표 10행 고정(지표·주기·단위·주관
--      부서 = 시트 기정의). 고객사명 B6/B16/B26(10행 세로 병합 앵커) + 월별 grid(6~35행:
--      목표 F·1~12월 G~R·문제점·개선만족도·미결/종결·비고). 년누적 S열 SUM/AVERAGE 수식
--      보존(원 충돌 S6).
--   ④ K1200-03 협력업체 사후 평가 계획서: 업체 2행(계획/실적) 블록 13개(6:7~30:31,
--      순번 A열 자동 수식). 월 헤더 G5~R5 연쇄 수식 보존(원 충돌 H5×2 = 중복 셀맵 잔재).
--      계획 grid(업체명 B6:C7 앵커·등급 D·주기 E·월 12) + 실적 grid(월 12). 결재 작성
--      O2:P2 → 작성자 auto.
--   ⑤ K2100-08 소모품 월소요량 및 안전재고: 월 4행 블록 12개(7:10~51:54 — 생산수량
--      E:H 4행 병합·소모품 소요 I:M 4행 병합·실사재고 4종[알곤/질소/와이어/용접팁 AC
--      기정의 — 재고 AF:AH 행별]·판정 AI:AJ 4행 병합). stride 4 grid 4개(행 오프셋
--      0~3 = 재고 4종). 소계 I55=SUM(I7:M54) 수식 보존(원 충돌).
--   ⑥ L1100-05 납품 및 시운전(검수) 확인서: 공급자 5칸 + 품목 2행 병합 2블록(13:14·
--      15:16) grid. 계(V.A.T미포함) H17=H15+H13 수식 보존(원 충돌). 사진 영역·하단은
--      시트 몫.
--   ⑦ L1100-14 중요설비 체크리스트: 상단 평가기준표 기정의 + 설비 평가 grid(19~30행:
--      설비번호·장비명·평가 1~10[R~AA]·판정·비고). 합계 AB=SUM(R:AA) 수식 보존(원 충돌
--      AB21·AB25). 부서 B열 = 세로 병합(B19:C27) + 기정의 — 시트 몫. ⚠️마스터에 실기록
--      12행 잔존(자동절단 1호기 등) — 대장형 갱신 양식이라 재평가 시 덮어씀이 운영 동선.
--   ⑧ L2300-05 치구 자체 검교정 계획 및 실적: 치구 2행(계획/실적) 블록, 월별 ○●
--      기입(범례 기정의). ⚠️마스터 결함 기록: 15번 블록 품명 B35 = 외부 워크북 참조
--      수식 잔재([5]JIG관리대장!E14 — 원 충돌) → grid 14블록(7:8~33:34)으로 제한,
--      15번째 블록은 시트 수기(정본 교정 시 외부 링크 제거 필요). 하단(37행~) 각주.
--
-- 멱등: DELETE+INSERT.
-- ============================================================

-- ── ① F2100-11 자격 인증 교육 및 평가서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 인적 정보 9(성명·사업부·직책·학력·전공·입사일자·현직무·교육명·교육기간) + 교육과정 grid(12~14행: 과정명·기간, 교육처/강사는 통합 1칸) + 시간표 grid(2행 병합 4블록×3열) + 평가 점수(이론 Y26·실기 Y31 — 소계 Y36 수식은 시트 몫) + 교육자료. 근무경력(Y7 DATEDIF)·경력 기준일·인증 기준·결재(팀장/사장)는 시트 몫.'
WHERE code='F2100-11';

DELETE FROM form_fields WHERE form_code='F2100-11';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-11','성명','성명','text','인적 정보',NULL,1,'frame'),
 ('F2100-11','사업부명','사업부명','text','인적 정보',NULL,2,'frame'),
 ('F2100-11','직책','직책','text','인적 정보',NULL,3,'frame'),
 ('F2100-11','최종학력','최종 학력','text','인적 정보',NULL,4,'frame'),
 ('F2100-11','전공','전공','text','인적 정보',NULL,5,'frame'),
 ('F2100-11','입사일자','입사일자','date','인적 정보',NULL,6,'frame'),
 ('F2100-11','현직무','현 직무','text','인적 정보',NULL,7,'frame'),
 ('F2100-11','교육명','교육명','text','교육 개요',NULL,10,'frame'),
 ('F2100-11','교육기간','교육기간','text','교육 개요',NULL,11,'frame'),
 ('F2100-11','courses','교육훈련 과정(최대 3)','grid','교육 과정',NULL,20,NULL),
 ('F2100-11','교육처강사','교육처/강사','text','교육 과정',NULL,21,'frame'),
 ('F2100-11','timetable','교육 시간표(2행 블록×3열)','grid','교육 시간표',NULL,30,NULL),
 ('F2100-11','시간표비고','시간표 비고','text','교육 시간표',NULL,31,'frame'),
 ('F2100-11','이론점수','이론(이해도) 점수','text','결과 평가',NULL,40,NULL),
 ('F2100-11','실기점수','실기(활용도) 점수','text','결과 평가',NULL,41,NULL),
 ('F2100-11','교육자료','교육 자료','text','결과 평가',NULL,42,'frame');

DELETE FROM form_cell_map WHERE form_code='F2100-11';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-11','성명','성명','E5','text',1),
 ('F2100-11','사업부명','사업부명','O5','text',2),
 ('F2100-11','직책','직책','Y5','text',3),
 ('F2100-11','최종학력','최종 학력','E6','text',4),
 ('F2100-11','전공','전공','O6','text',5),
 ('F2100-11','입사일자','입사일자','Y6','date',6),
 ('F2100-11','현직무','현 직무','E7','text',7),
 ('F2100-11','교육명','교육명','E8','text',8),
 ('F2100-11','교육기간','교육기간','E10','text',9),
 ('F2100-11','교육처강사','교육처/강사','Y12','text',10),
 ('F2100-11','시간표비고','시간표 비고','AC16','text',11),
 ('F2100-11','이론점수','이론(이해도) 점수','Y26','text',12),
 ('F2100-11','실기점수','실기(활용도) 점수','Y31','text',13),
 ('F2100-11','교육자료','교육 자료','E37','text',14);

DELETE FROM form_grid_spec WHERE form_code='F2100-11';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F2100-11','courses',12,1,3),
 ('F2100-11','timetable',16,2,4);

DELETE FROM form_grid_columns WHERE form_code='F2100-11';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F2100-11','courses','과정명','교육훈련 과정명','B','text',1),
 ('F2100-11','courses','기간','교육 기간','T','text',2),
 ('F2100-11','timetable','일자1','1일차(월일·내용)','B','text',1),
 ('F2100-11','timetable','일자2','2일차(월일·내용)','K','text',2),
 ('F2100-11','timetable','일자3','3일차(월일·내용)','T','text',3);

-- ── ② F2100-13 공정면허 자격인증 평가서(종합) ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 사내 자격인증 평가 명부 grid(6~14행 9명: 소속·성명·계수형 R&R·계량형 R&R·실기·이론·근무년수·판정 LEVEL·비고) + 작성자(결재 담당 AJ2). 합계(AG SUM 수식)·평가 주기/방법 각주는 시트 몫. 평가자=품질보증팀장(각주 기정의).'
WHERE code='F2100-13';

DELETE FROM form_fields WHERE form_code='F2100-13';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-13','roster','자격인증 평가 명부','grid','평가 명부',NULL,1,NULL),
 ('F2100-13','작성자','작성자','auto','결재',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='F2100-13';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-13','작성자','작성자','AJ2','text',1);

DELETE FROM form_grid_spec WHERE form_code='F2100-13';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F2100-13','roster',6,1,9);

DELETE FROM form_grid_columns WHERE form_code='F2100-13';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F2100-13','roster','소속','소속','C','text',1),
 ('F2100-13','roster','성명','성명','H','text',2),
 ('F2100-13','roster','계수rr','계수형 R&R','M','text',3),
 ('F2100-13','roster','계량rr','계량형 R&R','Q','text',4),
 ('F2100-13','roster','실기','실기 평가','U','text',5),
 ('F2100-13','roster','이론','이론 평가','Y','text',6),
 ('F2100-13','roster','근무년수','근무 년수','AC','text',7),
 ('F2100-13','roster','판정','판정 LEVEL','AL','text',8),
 ('F2100-13','roster','비고','비고','AP','text',9);

-- ── ③ H3100-01 년 고객만족도 모니터링 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 제목(연도)·적용기간 + 고객사명 3(10행 블록 세로 병합 앵커 B6/B16/B26) + 월별 실적 grid(6~35행 30행: 목표·1~12월·문제점·개선만족도·사후관리 미결/종결·비고). 지표 10종·주기·단위·주관부서 = 시트 기정의(블록당 10행 고정 — 1~10행=고객사1·11~20=고객사2·21~30=고객사3), 년누적(S열 SUM/AVERAGE 수식)은 시트 몫.'
WHERE code='H3100-01';

DELETE FROM form_fields WHERE form_code='H3100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('H3100-01','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('H3100-01','적용기간','적용기간','text','기본 정보',NULL,2,'frame'),
 ('H3100-01','고객사1','고객사명 1','text','고객사',NULL,10,'frame'),
 ('H3100-01','고객사2','고객사명 2','text','고객사',NULL,11,'frame'),
 ('H3100-01','고객사3','고객사명 3','text','고객사',NULL,12,'frame'),
 ('H3100-01','rows','월별 실적(고객사당 10행)','grid','월별 실적',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='H3100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('H3100-01','제목','제목(연도 기입)','C1','text',1),
 ('H3100-01','적용기간','적용기간','S1','text',2),
 ('H3100-01','고객사1','고객사명 1','B6','text',3),
 ('H3100-01','고객사2','고객사명 2','B16','text',4),
 ('H3100-01','고객사3','고객사명 3','B26','text',5);

DELETE FROM form_grid_spec WHERE form_code='H3100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('H3100-01','rows',6,1,30);

DELETE FROM form_grid_columns WHERE form_code='H3100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('H3100-01','rows','목표','연도 목표','F','text',1),
 ('H3100-01','rows','월1','1월','G','text',2),
 ('H3100-01','rows','월2','2월','H','text',3),
 ('H3100-01','rows','월3','3월','I','text',4),
 ('H3100-01','rows','월4','4월','J','text',5),
 ('H3100-01','rows','월5','5월','K','text',6),
 ('H3100-01','rows','월6','6월','L','text',7),
 ('H3100-01','rows','월7','7월','M','text',8),
 ('H3100-01','rows','월8','8월','N','text',9),
 ('H3100-01','rows','월9','9월','O','text',10),
 ('H3100-01','rows','월10','10월','P','text',11),
 ('H3100-01','rows','월11','11월','Q','text',12),
 ('H3100-01','rows','월12','12월','R','text',13),
 ('H3100-01','rows','문제점','문제점','U','text',14),
 ('H3100-01','rows','개선만족도','개선 만족도','V','text',15),
 ('H3100-01','rows','미결','사후관리 미결','W','text',16),
 ('H3100-01','rows','종결','사후관리 종결','X','text',17),
 ('H3100-01','rows','비고','비고(근거자료)','Y','text',18);

-- ── ④ K1200-03 협력업체 사후 평가 계획서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 제목(연도) + 업체 계획 grid(계획행 13블록: 업체명·등급·평가주기·1~12월 일정·비고) + 실적 grid(실적행: 1~12월) + 작성자(결재 작성 O2). 업체 블록 = 2행(계획/실적) 병합·순번 A열 자동 수식, 월 헤더(G5~R5) 연쇄 수식·검토/승인 결재는 시트 몫. 범례: 일정 칸에 ○ 계획 ● 실적 관례.'
WHERE code='K1200-03';

DELETE FROM form_fields WHERE form_code='K1200-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-03','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('K1200-03','plan','업체별 평가 계획(13개 블록)','grid','일정 계획',NULL,10,NULL),
 ('K1200-03','actual','업체별 평가 실적(계획과 같은 순서)','grid','일정 실적',NULL,11,NULL),
 ('K1200-03','작성자','작성자','auto','결재',NULL,20,'frame');

DELETE FROM form_cell_map WHERE form_code='K1200-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-03','제목','제목(연도 기입)','C1','text',1),
 ('K1200-03','작성자','작성자','O2','text',2);

DELETE FROM form_grid_spec WHERE form_code='K1200-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K1200-03','plan',6,2,13),
 ('K1200-03','actual',7,2,13);

DELETE FROM form_grid_columns WHERE form_code='K1200-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-03','plan','업체명','업체명','B','text',1),
 ('K1200-03','plan','등급','등급','D','text',2),
 ('K1200-03','plan','평가주기','평가주기','E','text',3),
 ('K1200-03','plan','월1','1월','G','text',4),
 ('K1200-03','plan','월2','2월','H','text',5),
 ('K1200-03','plan','월3','3월','I','text',6),
 ('K1200-03','plan','월4','4월','J','text',7),
 ('K1200-03','plan','월5','5월','K','text',8),
 ('K1200-03','plan','월6','6월','L','text',9),
 ('K1200-03','plan','월7','7월','M','text',10),
 ('K1200-03','plan','월8','8월','N','text',11),
 ('K1200-03','plan','월9','9월','O','text',12),
 ('K1200-03','plan','월10','10월','P','text',13),
 ('K1200-03','plan','월11','11월','Q','text',14),
 ('K1200-03','plan','월12','12월','R','text',15),
 ('K1200-03','plan','비고','비고','S','text',16),
 ('K1200-03','actual','월1','1월','G','text',1),
 ('K1200-03','actual','월2','2월','H','text',2),
 ('K1200-03','actual','월3','3월','I','text',3),
 ('K1200-03','actual','월4','4월','J','text',4),
 ('K1200-03','actual','월5','5월','K','text',5),
 ('K1200-03','actual','월6','6월','L','text',6),
 ('K1200-03','actual','월7','7월','M','text',7),
 ('K1200-03','actual','월8','8월','N','text',8),
 ('K1200-03','actual','월9','9월','O','text',9),
 ('K1200-03','actual','월10','10월','P','text',10),
 ('K1200-03','actual','월11','11월','Q','text',11),
 ('K1200-03','actual','월12','12월','R','text',12);

-- ── ⑤ K2100-08 소모품 월소요량 및 안전재고 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 월 4행 블록 12개(1~12월) — 생산수량(4행 병합)·소모품 소요 기재(4행 병합)·월말 실사재고 4종(알곤/질소/와이어/용접팁 — 유형 라벨 시트 기정의)·판정(4행 병합). stride 4 grid 4개(블록 내 행 오프셋 = 재고 4종). 소계(I55 SUM 수식)·월 라벨·결재(담당/팀장)는 시트 몫.'
WHERE code='K2100-08';

DELETE FROM form_fields WHERE form_code='K2100-08';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-08','ms1','월별 기록(생산수량·소요·알곤 재고·판정)','grid','월별 기록',NULL,1,NULL),
 ('K2100-08','ms2','월별 질소 재고','grid','월별 기록',NULL,2,NULL),
 ('K2100-08','ms3','월별 와이어 재고','grid','월별 기록',NULL,3,NULL),
 ('K2100-08','ms4','월별 용접팁 재고','grid','월별 기록',NULL,4,NULL);

DELETE FROM form_cell_map WHERE form_code='K2100-08';

DELETE FROM form_grid_spec WHERE form_code='K2100-08';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-08','ms1',7,4,12),
 ('K2100-08','ms2',8,4,12),
 ('K2100-08','ms3',9,4,12),
 ('K2100-08','ms4',10,4,12);

DELETE FROM form_grid_columns WHERE form_code='K2100-08';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-08','ms1','생산수량','생산수량(개)','E','text',1),
 ('K2100-08','ms1','소요','소모품 소요(유형 기재)','I','text',2),
 ('K2100-08','ms1','알곤재고','알곤 재고(병)','AF','text',3),
 ('K2100-08','ms1','판정','판정','AI','text',4),
 ('K2100-08','ms2','질소재고','질소 재고(병)','AF','text',1),
 ('K2100-08','ms3','와이어재고','와이어 재고(통)','AF','text',1),
 ('K2100-08','ms4','용접팁재고','용접팁 재고(개)','AF','text',1);

-- ── ⑥ L1100-05 납품 및 시운전(검수) 확인서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 공급자 정보 5(상호·사업자등록번호·대표 성명·전화번호·소재지) + 품목 grid(2행 병합 2블록: 공급일자·품목·규격·수량·금액). 계 V.A.T미포함(H17=H15+H13 수식)·사진 영역·하단 확인 블록은 시트 몫.'
WHERE code='L1100-05';

DELETE FROM form_fields WHERE form_code='L1100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-05','상호','상호(법인명)','text','공급자',NULL,1,'frame'),
 ('L1100-05','사업자등록번호','사업자등록번호','text','공급자',NULL,2,'frame'),
 ('L1100-05','대표성명','성명(대표이사)','text','공급자',NULL,3,'frame'),
 ('L1100-05','전화번호','전화번호','text','공급자',NULL,4,'frame'),
 ('L1100-05','소재지','사업장 소재지','text','공급자',NULL,5,'frame'),
 ('L1100-05','items','납품 품목(2블록)','grid','품목',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-05','상호','상호(법인명)','D5','text',1),
 ('L1100-05','사업자등록번호','사업자등록번호','H5','text',2),
 ('L1100-05','대표성명','성명(대표이사)','D7','text',3),
 ('L1100-05','전화번호','전화번호','H7','text',4),
 ('L1100-05','소재지','사업장 소재지','D9','text',5);

DELETE FROM form_grid_spec WHERE form_code='L1100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-05','items',13,2,2);

DELETE FROM form_grid_columns WHERE form_code='L1100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-05','items','공급일자','공급일자','A','date',1),
 ('L1100-05','items','품목','품목','C','text',2),
 ('L1100-05','items','규격','규격','E','text',3),
 ('L1100-05','items','수량','수량','G','text',4),
 ('L1100-05','items','금액','금액','H','text',5);

-- ── ⑦ L1100-14 중요설비 체크리스트 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 작성 부서 + 설비 평가 grid(19~30행 12행: 설비번호·장비명·평가항목 1~10·판정·비고). 상단 평가기준표·범례(A~D등급)·부서 열(세로 병합 기정의)·합계(AB SUM 수식)는 시트 몫. ⚠️대장형 갱신 양식 — 마스터에 기존 평가 기록 잔존, 재평가 작성 시 덮어씀이 운영 동선.'
WHERE code='L1100-14';

DELETE FROM form_fields WHERE form_code='L1100-14';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-14','작성부서','작성자(부서)','text','기본 정보',NULL,1,'frame'),
 ('L1100-14','equip','설비 평가(12행)','grid','설비 평가',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-14';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-14','작성부서','작성자(부서)','W2','text',1);

DELETE FROM form_grid_spec WHERE form_code='L1100-14';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-14','equip',19,1,12);

DELETE FROM form_grid_columns WHERE form_code='L1100-14';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-14','equip','설비번호','설비번호','D','text',1),
 ('L1100-14','equip','장비명','장비명','M','text',2),
 ('L1100-14','equip','평가1','1.고객 영향','R','text',3),
 ('L1100-14','equip','평가2','2.대체성','S','text',4),
 ('L1100-14','equip','평가3','3.타설비 영향','T','text',5),
 ('L1100-14','equip','평가4','4.품질 영향','U','text',6),
 ('L1100-14','equip','평가5','5.수리 난이도','V','text',7),
 ('L1100-14','equip','평가6','6.MTTR','W','text',8),
 ('L1100-14','equip','평가7','7.고장 빈도','X','text',9),
 ('L1100-14','equip','평가8','8.부품 수급','Y','text',10),
 ('L1100-14','equip','평가9','9.환경 영향','Z','text',11),
 ('L1100-14','equip','평가10','10.경과 년수','AA','text',12),
 ('L1100-14','equip','판정','판정(등급)','AD','text',13),
 ('L1100-14','equip','비고','비고','AF','text',14);

-- ── ⑧ L2300-05 치구 자체 검교정 계획 및 실적 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0120, 260731): 제목(연도)·작성일 + 치구 계획 grid(계획행 14블록: 품명·관리번호·규격·1~12월·비고) + 실적 grid(실적행: 1~12월). 범례(○ 계획 ● 실적)·순번은 시트 기정의. ⚠️마스터 결함 기록: 15번 블록 품명(B35) = 외부 워크북 참조 수식 잔재([5]JIG관리대장!E14) — grid 14블록 제한, 15번째는 시트 수기(정본 교정 시 외부 링크 제거 필요).'
WHERE code='L2300-05';

DELETE FROM form_fields WHERE form_code='L2300-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2300-05','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L2300-05','작성일','작성일','text','기본 정보',NULL,2,'frame'),
 ('L2300-05','plan','치구별 검교정 계획(14블록)','grid','검교정 계획',NULL,10,NULL),
 ('L2300-05','actual','치구별 검교정 실적(계획과 같은 순서)','grid','검교정 실적',NULL,11,NULL);

DELETE FROM form_cell_map WHERE form_code='L2300-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2300-05','제목','제목(연도 기입)','E1','text',1),
 ('L2300-05','작성일','작성일','U4','text',2);

DELETE FROM form_grid_spec WHERE form_code='L2300-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2300-05','plan',7,2,14),
 ('L2300-05','actual',8,2,14);

DELETE FROM form_grid_columns WHERE form_code='L2300-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2300-05','plan','품명','품명','B','text',1),
 ('L2300-05','plan','관리번호','관리번호','I','text',2),
 ('L2300-05','plan','규격','규격','K','text',3),
 ('L2300-05','plan','월1','1월','M','text',4),
 ('L2300-05','plan','월2','2월','N','text',5),
 ('L2300-05','plan','월3','3월','O','text',6),
 ('L2300-05','plan','월4','4월','P','text',7),
 ('L2300-05','plan','월5','5월','Q','text',8),
 ('L2300-05','plan','월6','6월','R','text',9),
 ('L2300-05','plan','월7','7월','S','text',10),
 ('L2300-05','plan','월8','8월','T','text',11),
 ('L2300-05','plan','월9','9월','U','text',12),
 ('L2300-05','plan','월10','10월','V','text',13),
 ('L2300-05','plan','월11','11월','W','text',14),
 ('L2300-05','plan','월12','12월','X','text',15),
 ('L2300-05','plan','비고','비고','Y','text',16),
 ('L2300-05','actual','월1','1월','M','text',1),
 ('L2300-05','actual','월2','2월','N','text',2),
 ('L2300-05','actual','월3','3월','O','text',3),
 ('L2300-05','actual','월4','4월','P','text',4),
 ('L2300-05','actual','월5','5월','Q','text',5),
 ('L2300-05','actual','월6','6월','R','text',6),
 ('L2300-05','actual','월7','7월','S','text',7),
 ('L2300-05','actual','월8','8월','T','text',8),
 ('L2300-05','actual','월9','9월','U','text',9),
 ('L2300-05','actual','월10','10월','V','text',10),
 ('L2300-05','actual','월11','11월','W','text',11),
 ('L2300-05','actual','월12','12월','X','text',12);

DELETE FROM form_change_log WHERE migration='0120';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('F2100-11','2026-07-31','cellmap_redesign','0019 잔재 21필드·26셀맵(소계→Y36 수식 충돌)','인적 9 + 과정 grid(3행) + 시간표 grid(2행 블록×3열) + 평가 점수 2 + 교육자료','수식 충돌 소거 재설계. 소계 Y36=Y26+Y31·근무경력 Y7 DATEDIF 수식 보존','0120'),
 ('F2100-13','2026-07-31','cellmap_redesign','0019 잔재 8필드·17셀맵(합계→AG6 SUM 수식 충돌)','명부 grid(9명×9열) + 작성자 AJ2','합계 AG 수식 보존. 판정 LEVEL 스텁 덮어씀 = 운영 동선','0120'),
 ('H3100-01','2026-07-31','cellmap_redesign','0019 잔재 8필드·36셀맵(6월→S6 년누적 수식 충돌)','제목·적용기간 + 고객사 3(세로 병합 앵커) + 월별 grid(30행×18열)','년누적 S열 SUM/AVERAGE 수식 보존. 지표 10종 = 시트 기정의','0120'),
 ('K1200-03','2026-07-31','cellmap_redesign','0019 잔재 9필드·26셀맵(평가기간→H5 ×2 = 월 헤더 수식 충돌·중복 셀맵)','제목 + 계획/실적 grid(13블록 stride 2) + 작성자 O2','월 헤더 G5~R5 연쇄 수식·순번 자동 수식 보존','0120'),
 ('K2100-08','2026-07-31','cellmap_redesign','0019 잔재 8필드·67셀맵(소계→I55 SUM 수식 충돌)','stride 4 grid 4개(월 12블록 — 생산·소요·재고 4종·판정)','소계 I55 수식 보존. 재고 유형 라벨 = 시트 기정의','0120'),
 ('L1100-05','2026-07-31','cellmap_redesign','0019 잔재 14필드(계VAT미포함→H17 수식 충돌)','공급자 5 + 품목 grid(2행 병합 2블록)','계 H17=H15+H13 수식 보존. 사진·하단 = 시트 몫','0120'),
 ('L1100-14','2026-07-31','cellmap_redesign','0019 잔재 3필드·17셀맵(30→AB25·31→AB21 합계 수식 충돌)','작성 부서 + 설비 평가 grid(12행×14열)','합계 AB 수식 보존. 대장형 갱신(기존 기록 덮어씀 = 운영 동선) 명기','0120'),
 ('L2300-05','2026-07-31','cellmap_redesign','0019 잔재 4필드·19셀맵(15→B35 = 외부 참조 수식 충돌)','제목·작성일 + 계획/실적 grid(14블록 stride 2)','★마스터 결함: B35 = [5]JIG관리대장!E14 외부 링크 잔재 → 14블록 제한·시트 수기 명기(정본 교정 시 링크 제거 필요)','0120');
