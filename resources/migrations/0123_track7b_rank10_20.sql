-- ============================================================
-- Migration 0123: 레거시 2차 배치 2일차 — 점수순 10~20위 11종 (2026-07-31)
--
-- 근거: 착수 지시(260731) §1 로스터 10~20위. 11종 전부 0019 잔재·제출 0 무손실.
-- 규정군 8권 분산 구간(D-1100·K-2100·F-2100·L-3101·L-3100·A-5100·A-8101·K-1200·J-1102).
--
-- 실측 요지(2026-07-31 사무실, 병합·수식 전수):
--   D1100-03: 문서형 보고서 — 헤더 5 + 목적/내용/훈련결과/참석자 대형 병합 textarea 4.
--   K2100-04: 재고 실사 grid(7~33행 27행) — 합계(34행 SUM 3식) 보존 + 실사중량.
--   F2100-07: 평가항목 4행 × 월 12칸(2열 병합) + 달성율. 연도 = 제목 병합 값(F1).
--   K2100-09: 소모품 4행 grid(사진 열 = 시트 몫).
--   L3101-01: 계획/실시 2행 블록 12개(6:7~28:29, NO 자동 수식 A열 보존) — 월 12칸 ○●.
--   L3100-03: ★자동조회 계열 — B7~G29 = IF($A=0,"",VLOOKUP($A,#REF!,n,0)) 수식.
--      L3100-02와 동일한 #REF! 참조 테이블 소실 실측(정본정비_동선목록 5건째 등재).
--      매핑 = 관리번호(A열 = 조회 키 입력)·검교정 계획 월 12·비고만, B~G 수식 보존.
--   A5100-01: 3개년×분기 4 매트릭스 — 공정심사(12:16 병합 블록) 분기 12칸 개별 +
--      시스템심사 grid(17:18~33:34 2행 블록 9 프로세스) + 연도 3·작성일. 심사구분·CSR·
--      프로세스명 기정의, 하단(35~42행 3번 구분) = 시트 수기.
--   A8101-02: 좌/우 2벌(좌 = 빈 틀, 우 = E-7 팬더믹 작성례) — ★좌측만 매핑(우측 작성례
--      보존 = 모범 예시 성격). 제목·목적·목표·훈련형태·일시 3·장비·인원·참관·상황전파·
--      시나리오·주요 훈련내용·참석자 명단.
--   A8101-04: 헤더 4(작성자 auto) + 참석자 grid(7~10행 좌/우 2열) + 회의명·회의내용.
--   K1200-05: 평가업체·평가일자 + 평가자 grid(7~10행) + 득점 grid(13~31행 19행 — 항목·
--      기준·배점 기정의, 득점 AF만) + 부서별 평가의견 3(품질보증 E34·개발 E37·구매 E40).
--   J1102-01: 관리계획서 갑지 — 업체명·차종·부품명·부번·상호기능팀원·업체코드·제정일자 +
--      개정 1행(개정일자·사유·작성·검토·승인). 단계 체크·고객 승인 3·공정도(12행~) 시트 몫.
--
-- 멱등: DELETE+INSERT. P1 예약 마이그 = 0124+ 순연.
-- ============================================================

-- ── D1100-03 제품 안전교육 보고서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 훈련 헤더 5(훈련일자·주관부서·참석인원·참석대상·훈련구분) + 목적·내용·훈련결과(효과성)·참석자 대형 textarea 4. 결재 3단 서명 몫. 제품 안전(PSCR) 교육 증빙 — 심사 갭 이력 연계.'
WHERE code='D1100-03';

DELETE FROM form_fields WHERE form_code='D1100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-03','훈련일자','훈련 일자','date','훈련 정보',NULL,1,'fact'),
 ('D1100-03','주관부서','주관 부서','text','훈련 정보',NULL,2,'frame'),
 ('D1100-03','참석인원','참석 인원','text','훈련 정보',NULL,3,'frame'),
 ('D1100-03','참석대상','참석 대상','text','훈련 정보',NULL,4,'frame'),
 ('D1100-03','훈련구분','훈련 구분','text','훈련 정보',NULL,5,'frame'),
 ('D1100-03','목적','목적','textarea','내용',NULL,10,NULL),
 ('D1100-03','내용','내용','textarea','내용',NULL,11,NULL),
 ('D1100-03','훈련결과','훈련 결과(효과성 파악)','textarea','내용',NULL,12,NULL),
 ('D1100-03','참석자','참석자','textarea','내용',NULL,13,NULL);

DELETE FROM form_cell_map WHERE form_code='D1100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-03','훈련일자','훈련 일자','F4','date',1),
 ('D1100-03','주관부서','주관 부서','V4','text',2),
 ('D1100-03','참석인원','참석 인원','F5','text',3),
 ('D1100-03','참석대상','참석 대상','F6','text',4),
 ('D1100-03','훈련구분','훈련 구분','F7','text',5),
 ('D1100-03','목적','목적','F8','text',6),
 ('D1100-03','내용','내용','F13','text',7),
 ('D1100-03','훈련결과','훈련 결과(효과성 파악)','F27','text',8),
 ('D1100-03','참석자','참석자','F32','text',9);

DELETE FROM form_grid_spec WHERE form_code='D1100-03';
DELETE FROM form_grid_columns WHERE form_code='D1100-03';

-- ── K2100-04 재고조사표 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 작성기준일·부서명·작성자 + 재고 실사 grid(7~33행 27행: 구분·강종·제품규격 O.D/T/길이·재고·중량·단가·금액·보관장소) + 실사중량. 합계(34행 SUM 3식)는 시트 몫.'
WHERE code='K2100-04';

DELETE FROM form_fields WHERE form_code='K2100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-04','작성기준일','작성기준일','date','기본 정보',NULL,1,'fact'),
 ('K2100-04','부서명','부서명','text','기본 정보',NULL,2,'frame'),
 ('K2100-04','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('K2100-04','rows','재고 실사(27행)','grid','재고 실사',NULL,10,NULL),
 ('K2100-04','실사중량','실사중량(월일 기재)','text','확인',NULL,20,'frame');

DELETE FROM form_cell_map WHERE form_code='K2100-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K2100-04','작성기준일','작성기준일','C4','date',1),
 ('K2100-04','부서명','부서명','F4','text',2),
 ('K2100-04','작성자','작성자','I4','text',3),
 ('K2100-04','실사중량','실사중량(월일 기재)','J35','text',4);

DELETE FROM form_grid_spec WHERE form_code='K2100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-04','rows',7,1,27);

DELETE FROM form_grid_columns WHERE form_code='K2100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-04','rows','구분','구분','B','text',1),
 ('K2100-04','rows','강종','강종','C','text',2),
 ('K2100-04','rows','od','O.D','D','text',3),
 ('K2100-04','rows','t','T','E','text',4),
 ('K2100-04','rows','길이','길이','F','text',5),
 ('K2100-04','rows','재고','재고(본)','G','text',6),
 ('K2100-04','rows','중량','중량(kg)','H','text',7),
 ('K2100-04','rows','단가','단가(원/kg)','I','text',8),
 ('K2100-04','rows','금액','금액(원)','J','text',9),
 ('K2100-04','rows','보관장소','보관장소','K','text',10);

-- ── F2100-07 숙련도/다기능 평가 계획 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 연도(제목 병합) + 평가 계획 grid(6~9행 4항목: 평가항목·주기·1~12월[계획○/실적● 병기 칸]·달성율). 범례·점수 등급·평가기준 각주 기정의. 결재 3단 서명 몫.'
WHERE code='F2100-07';

DELETE FROM form_fields WHERE form_code='F2100-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-07','연도','연도(제목)','text','기본 정보',NULL,1,'frame'),
 ('F2100-07','rows','평가 계획(4항목)','grid','평가 계획',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='F2100-07';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-07','연도','연도(제목)','F1','text',1);

DELETE FROM form_grid_spec WHERE form_code='F2100-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F2100-07','rows',6,1,4);

DELETE FROM form_grid_columns WHERE form_code='F2100-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F2100-07','rows','평가항목','평가 항목','C','text',1),
 ('F2100-07','rows','주기','주기','R','text',2),
 ('F2100-07','rows','월1','1월','V','text',3),
 ('F2100-07','rows','월2','2월','X','text',4),
 ('F2100-07','rows','월3','3월','Z','text',5),
 ('F2100-07','rows','월4','4월','AB','text',6),
 ('F2100-07','rows','월5','5월','AD','text',7),
 ('F2100-07','rows','월6','6월','AF','text',8),
 ('F2100-07','rows','월7','7월','AH','text',9),
 ('F2100-07','rows','월8','8월','AJ','text',10),
 ('F2100-07','rows','월9','9월','AL','text',11),
 ('F2100-07','rows','월10','10월','AN','text',12),
 ('F2100-07','rows','월11','11월','AP','text',13),
 ('F2100-07','rows','월12','12월','AR','text',14),
 ('F2100-07','rows','달성율','달성율','AT','text',15);

-- ── K2100-09 소모품 사양 및 공급처 지정 현황 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 소모품 grid(5~8행 4행: 구분·사양·공급사 및 연락처·공급 소요일·비고). 소모품 사진 열·변경 절차 각주 기정의·결재는 시트 몫.'
WHERE code='K2100-09';

DELETE FROM form_fields WHERE form_code='K2100-09';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-09','rows','소모품 현황(4행)','grid','소모품',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='K2100-09';

DELETE FROM form_grid_spec WHERE form_code='K2100-09';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-09','rows',5,1,4);

DELETE FROM form_grid_columns WHERE form_code='K2100-09';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-09','rows','구분','구분','B','text',1),
 ('K2100-09','rows','사양','사양','P','text',2),
 ('K2100-09','rows','공급사','공급사 및 연락처','Y','text',3),
 ('K2100-09','rows','소요일','공급 소요일','AH','text',4),
 ('K2100-09','rows','비고','비고','AQ','text',5);

-- ── L3101-01 측정시스템 분석 계획서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 부서명·작성일자·연도 + 계획/실시 2행 블록 grid 12개(6:7~28:29 — 차종·품번·품명·대상 계측기·측정 대상자·측정항목·규격 + 1~12월 ○●). NO 자동 수식(A열) 보존·범례 기정의·결재 서명 몫. MSA 연간 계획 — L-3101 측정시스템 평가 지침 연계.'
WHERE code='L3101-01';

DELETE FROM form_fields WHERE form_code='L3101-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L3101-01','부서명','부서명','text','기본 정보',NULL,1,'frame'),
 ('L3101-01','작성일자','작성일자','date','기본 정보',NULL,2,'fact'),
 ('L3101-01','연도','연도(표기)','text','기본 정보',NULL,3,'frame'),
 ('L3101-01','plan','대상별 계획 ○(12블록)','grid','분석 계획',NULL,10,NULL),
 ('L3101-01','actual','대상별 실시 ●(계획과 같은 순서)','grid','분석 실시',NULL,11,NULL);

DELETE FROM form_cell_map WHERE form_code='L3101-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L3101-01','부서명','부서명','D3','text',1),
 ('L3101-01','작성일자','작성일자','F3','date',2),
 ('L3101-01','연도','연도(표기)','J4','text',3);

DELETE FROM form_grid_spec WHERE form_code='L3101-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L3101-01','plan',6,2,12),
 ('L3101-01','actual',7,2,12);

DELETE FROM form_grid_columns WHERE form_code='L3101-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L3101-01','plan','차종','차종','C','text',1),
 ('L3101-01','plan','품번','품번','D','text',2),
 ('L3101-01','plan','품명','품명','E','text',3),
 ('L3101-01','plan','계측기','대상 계측기','F','text',4),
 ('L3101-01','plan','대상자','측정 대상자','G','text',5),
 ('L3101-01','plan','항목','측정 항목','H','text',6),
 ('L3101-01','plan','규격','규격','I','text',7),
 ('L3101-01','plan','월1','1월','J','text',8),
 ('L3101-01','plan','월2','2월','K','text',9),
 ('L3101-01','plan','월3','3월','L','text',10),
 ('L3101-01','plan','월4','4월','M','text',11),
 ('L3101-01','plan','월5','5월','N','text',12),
 ('L3101-01','plan','월6','6월','O','text',13),
 ('L3101-01','plan','월7','7월','P','text',14),
 ('L3101-01','plan','월8','8월','Q','text',15),
 ('L3101-01','plan','월9','9월','R','text',16),
 ('L3101-01','plan','월10','10월','S','text',17),
 ('L3101-01','plan','월11','11월','T','text',18),
 ('L3101-01','plan','월12','12월','U','text',19),
 ('L3101-01','actual','월1','1월','J','text',1),
 ('L3101-01','actual','월2','2월','K','text',2),
 ('L3101-01','actual','월3','3월','L','text',3),
 ('L3101-01','actual','월4','4월','M','text',4),
 ('L3101-01','actual','월5','5월','N','text',5),
 ('L3101-01','actual','월6','6월','O','text',6),
 ('L3101-01','actual','월7','7월','P','text',7),
 ('L3101-01','actual','월8','8월','Q','text',8),
 ('L3101-01','actual','월9','9월','R','text',9),
 ('L3101-01','actual','월10','10월','S','text',10),
 ('L3101-01','actual','월11','11월','T','text',11),
 ('L3101-01','actual','월12','12월','U','text',12);

-- ── L3100-03 계측기 검교정 계획서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 제목(연도)·작성일자·작성자 + 검교정 grid(7~29행 23행: 관리번호[A열 = 자동조회 키 입력]·검교정 계획 1~12월 ○●·비고). ⚠️마스터 결함 기록(L3100-02 계열): 계측기 정보 B~G열 = IF($A=0,"",VLOOKUP($A,#REF!,n,0)) — 참조 테이블 #REF! 소실(정본정비_동선목록 §5). 관리번호 입력 시 자동조회는 정본 교정 후 작동 — B~G 수식 보존(매핑 금지). 범례(○●)·결재 서명 몫.'
WHERE code='L3100-03';

DELETE FROM form_fields WHERE form_code='L3100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L3100-03','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L3100-03','작성일자','작성일자','date','기본 정보',NULL,2,'fact'),
 ('L3100-03','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('L3100-03','rows','검교정 계획(23행)','grid','검교정 계획',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L3100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L3100-03','제목','제목(연도 기입)','C1','text',1),
 ('L3100-03','작성일자','작성일자','C4','date',2),
 ('L3100-03','작성자','작성자','F4','text',3);

DELETE FROM form_grid_spec WHERE form_code='L3100-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L3100-03','rows',7,1,23);

DELETE FROM form_grid_columns WHERE form_code='L3100-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L3100-03','rows','관리번호','관리번호(자동조회 키)','A','text',1),
 ('L3100-03','rows','월1','1월','H','text',2),
 ('L3100-03','rows','월2','2월','I','text',3),
 ('L3100-03','rows','월3','3월','J','text',4),
 ('L3100-03','rows','월4','4월','K','text',5),
 ('L3100-03','rows','월5','5월','L','text',6),
 ('L3100-03','rows','월6','6월','M','text',7),
 ('L3100-03','rows','월7','7월','N','text',8),
 ('L3100-03','rows','월8','8월','O','text',9),
 ('L3100-03','rows','월9','9월','P','text',10),
 ('L3100-03','rows','월10','10월','Q','text',11),
 ('L3100-03','rows','월11','11월','R','text',12),
 ('L3100-03','rows','월12','12월','S','text',13),
 ('L3100-03','rows','비고','비고','T','text',14);

-- ── A5100-01 내부심사 년간 계획 및 실적 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 작성일·연도 3(3개년 헤더) + 공정심사 분기 12칸(개별) + 시스템심사 grid(17~34행 2행 블록 9 프로세스: 3개년×분기 4 = 12칸 + 피심사부서). 심사구분·CSR·프로세스명 기정의(경영관리~구매업무 P — 9개), 범례(○◐●)·하단 3번 구분(35행~)·결재는 시트 몫. IATF §9.2 3년 주기 전 프로세스 커버.'
WHERE code='A5100-01';

DELETE FROM form_fields WHERE form_code='A5100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5100-01','작성일','작성일(표기)','text','기본 정보',NULL,1,'frame'),
 ('A5100-01','연도1','1차년(헤더)','text','기본 정보',NULL,2,'frame'),
 ('A5100-01','연도2','2차년(헤더)','text','기본 정보',NULL,3,'frame'),
 ('A5100-01','연도3','3차년(헤더)','text','기본 정보',NULL,4,'frame'),
 ('A5100-01','공정q1','공정심사 1년차 1/4','text','공정심사',NULL,10,NULL),
 ('A5100-01','공정q2','공정심사 1년차 2/4','text','공정심사',NULL,11,NULL),
 ('A5100-01','공정q3','공정심사 1년차 3/4','text','공정심사',NULL,12,NULL),
 ('A5100-01','공정q4','공정심사 1년차 4/4','text','공정심사',NULL,13,NULL),
 ('A5100-01','공정q5','공정심사 2년차 1/4','text','공정심사',NULL,14,NULL),
 ('A5100-01','공정q6','공정심사 2년차 2/4','text','공정심사',NULL,15,NULL),
 ('A5100-01','공정q7','공정심사 2년차 3/4','text','공정심사',NULL,16,NULL),
 ('A5100-01','공정q8','공정심사 2년차 4/4','text','공정심사',NULL,17,NULL),
 ('A5100-01','공정q9','공정심사 3년차 1/4','text','공정심사',NULL,18,NULL),
 ('A5100-01','공정q10','공정심사 3년차 2/4','text','공정심사',NULL,19,NULL),
 ('A5100-01','공정q11','공정심사 3년차 3/4','text','공정심사',NULL,20,NULL),
 ('A5100-01','공정q12','공정심사 3년차 4/4','text','공정심사',NULL,21,NULL),
 ('A5100-01','sys','시스템심사(9 프로세스×분기 12)','grid','시스템심사',NULL,30,NULL);

DELETE FROM form_cell_map WHERE form_code='A5100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5100-01','작성일','작성일(표기)','A6','text',1),
 ('A5100-01','연도1','1차년(헤더)','O8','text',2),
 ('A5100-01','연도2','2차년(헤더)','W8','text',3),
 ('A5100-01','연도3','3차년(헤더)','AE8','text',4),
 ('A5100-01','공정q1','공정심사 1년차 1/4','O12','text',5),
 ('A5100-01','공정q2','공정심사 1년차 2/4','Q12','text',6),
 ('A5100-01','공정q3','공정심사 1년차 3/4','S12','text',7),
 ('A5100-01','공정q4','공정심사 1년차 4/4','U12','text',8),
 ('A5100-01','공정q5','공정심사 2년차 1/4','W12','text',9),
 ('A5100-01','공정q6','공정심사 2년차 2/4','Y12','text',10),
 ('A5100-01','공정q7','공정심사 2년차 3/4','AA12','text',11),
 ('A5100-01','공정q8','공정심사 2년차 4/4','AC12','text',12),
 ('A5100-01','공정q9','공정심사 3년차 1/4','AE12','text',13),
 ('A5100-01','공정q10','공정심사 3년차 2/4','AG12','text',14),
 ('A5100-01','공정q11','공정심사 3년차 3/4','AI12','text',15),
 ('A5100-01','공정q12','공정심사 3년차 4/4','AK12','text',16);

DELETE FROM form_grid_spec WHERE form_code='A5100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('A5100-01','sys',17,2,9);

DELETE FROM form_grid_columns WHERE form_code='A5100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A5100-01','sys','q1','1년차 1/4','O','text',1),
 ('A5100-01','sys','q2','1년차 2/4','Q','text',2),
 ('A5100-01','sys','q3','1년차 3/4','S','text',3),
 ('A5100-01','sys','q4','1년차 4/4','U','text',4),
 ('A5100-01','sys','q5','2년차 1/4','W','text',5),
 ('A5100-01','sys','q6','2년차 2/4','Y','text',6),
 ('A5100-01','sys','q7','2년차 3/4','AA','text',7),
 ('A5100-01','sys','q8','2년차 4/4','AC','text',8),
 ('A5100-01','sys','q9','3년차 1/4','AE','text',9),
 ('A5100-01','sys','q10','3년차 2/4','AG','text',10),
 ('A5100-01','sys','q11','3년차 3/4','AI','text',11),
 ('A5100-01','sys','q12','3년차 4/4','AK','text',12),
 ('A5100-01','sys','부서','피심사부서','AM','text',13);

-- ── A8101-02 비상사태 대비 훈련결과 보고서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 좌/우 2벌 중 ★좌측(빈 틀)만 매핑 — 제목·목적·목표·훈련형태(체크 표기)·실시일자·주관팀·장소·동원장비·참석인원·참관감독·상황전파·시나리오·주요 훈련내용·참석자 명단. 우측 = E-7 팬더믹 작성례(모범 예시 성격 — 보존). 사진·상세 양식은 시트 몫.'
WHERE code='A8101-02';

DELETE FROM form_fields WHERE form_code='A8101-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A8101-02','제목','제목(비상사태명)','text','기본 정보',NULL,1,'frame'),
 ('A8101-02','목적','목적','text','기본 정보',NULL,2,NULL),
 ('A8101-02','목표','목표','text','기본 정보',NULL,3,NULL),
 ('A8101-02','훈련형태','훈련형태(해당 칸 ■ 표기)','text','훈련 정보',NULL,10,'frame'),
 ('A8101-02','실시일자','실시일자','date','훈련 정보',NULL,11,'fact'),
 ('A8101-02','주관팀','주관팀','text','훈련 정보',NULL,12,'frame'),
 ('A8101-02','장소','장소','text','훈련 정보',NULL,13,'frame'),
 ('A8101-02','동원장비','동원장비','text','훈련 정보',NULL,14,'frame'),
 ('A8101-02','참석인원','참석인원','text','훈련 정보',NULL,15,'frame'),
 ('A8101-02','참관감독','참관/감독','text','훈련 정보',NULL,16,'frame'),
 ('A8101-02','상황전파','상황 및 전파','text','훈련 내용',NULL,20,NULL),
 ('A8101-02','시나리오','시나리오','textarea','훈련 내용',NULL,21,NULL),
 ('A8101-02','훈련내용','주요 훈련내용','textarea','훈련 내용',NULL,22,NULL),
 ('A8101-02','참석자명단','참석자 명단','textarea','훈련 내용',NULL,23,NULL);

DELETE FROM form_cell_map WHERE form_code='A8101-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A8101-02','제목','제목(비상사태명)','B1','text',1),
 ('A8101-02','목적','목적','B3','text',2),
 ('A8101-02','목표','목표','B4','text',3),
 ('A8101-02','훈련형태','훈련형태(해당 칸 ■ 표기)','B5','text',4),
 ('A8101-02','실시일자','실시일자','C6','date',5),
 ('A8101-02','주관팀','주관팀','E6','text',6),
 ('A8101-02','장소','장소','G6','text',7),
 ('A8101-02','동원장비','동원장비','C7','text',8),
 ('A8101-02','참석인원','참석인원','C8','text',9),
 ('A8101-02','참관감독','참관/감독','C9','text',10),
 ('A8101-02','상황전파','상황 및 전파','B10','text',11),
 ('A8101-02','시나리오','시나리오','B11','text',12),
 ('A8101-02','훈련내용','주요 훈련내용','B16','text',13),
 ('A8101-02','참석자명단','참석자 명단','B18','text',14);

DELETE FROM form_grid_spec WHERE form_code='A8101-02';
DELETE FROM form_grid_columns WHERE form_code='A8101-02';

-- ── A8101-04 비상사태 검토 보고서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 헤더 4(문서번호·작성일자·주관부서·작성자[자동]) + 참석자 grid(7~10행, 좌/우 2열 — 확인란 서명 몫) + 회의명·회의내용. 구분(비상계획검토) 기정의·사진 3장·결재는 시트 몫.'
WHERE code='A8101-04';

DELETE FROM form_fields WHERE form_code='A8101-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A8101-04','문서번호','문서번호','text','기본 정보',NULL,1,'frame'),
 ('A8101-04','작성일자','작성일자','date','기본 정보',NULL,2,'fact'),
 ('A8101-04','주관부서','주관부서','text','기본 정보',NULL,3,'frame'),
 ('A8101-04','작성자','작성자','auto','기본 정보',NULL,4,'frame'),
 ('A8101-04','참석자','참석자(좌/우 2열)','grid','참석자',NULL,10,NULL),
 ('A8101-04','회의명','회의명','text','회의',NULL,20,NULL),
 ('A8101-04','회의내용','회의 내용','textarea','회의',NULL,21,NULL);

DELETE FROM form_cell_map WHERE form_code='A8101-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A8101-04','문서번호','문서번호','E4','text',1),
 ('A8101-04','작성일자','작성일자','P4','date',2),
 ('A8101-04','주관부서','주관부서','E5','text',3),
 ('A8101-04','작성자','작성자','P5','text',4),
 ('A8101-04','회의명','회의명','A11','text',5),
 ('A8101-04','회의내용','회의 내용','A13','text',6);

DELETE FROM form_grid_spec WHERE form_code='A8101-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('A8101-04','참석자',7,1,4);

DELETE FROM form_grid_columns WHERE form_code='A8101-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A8101-04','참석자','소속1','소속(좌)','D','text',1),
 ('A8101-04','참석자','직급1','직급(좌)','I','text',2),
 ('A8101-04','참석자','성명1','성명(좌)','L','text',3),
 ('A8101-04','참석자','소속2','소속(우)','S','text',4),
 ('A8101-04','참석자','직급2','직급(우)','X','text',5),
 ('A8101-04','참석자','성명2','성명(우)','AA','text',6);

-- ── K1200-05 협력업체 체제 평가표 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): 평가업체명·평가일자 + 평가자 grid(7~10행: 소속·직위·성명 — 서명란 몫) + 득점 grid(13~31행 19행: 품질 9·기술 4·회사관리 4·납기 2 — 항목·기준·배점·평가부서 기정의, 득점만 기입) + 부서별 평가의견 3(품질보증·개발·구매). 결재 3단 서명 몫.'
WHERE code='K1200-05';

DELETE FROM form_fields WHERE form_code='K1200-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-05','평가업체명','평가 업체명','text','기본 정보',NULL,1,'frame'),
 ('K1200-05','평가일자','평가 일자','date','기본 정보',NULL,2,'fact'),
 ('K1200-05','평가자','평가자(소속·직위·성명)','grid','평가자',NULL,10,NULL),
 ('K1200-05','scores','득점(19항목)','grid','평가 득점',NULL,20,NULL),
 ('K1200-05','의견품질','평가의견 — 품질보증','textarea','평가 의견',NULL,30,NULL),
 ('K1200-05','의견개발','평가의견 — 개발','textarea','평가 의견',NULL,31,NULL),
 ('K1200-05','의견구매','평가의견 — 구매','textarea','평가 의견',NULL,32,NULL);

DELETE FROM form_cell_map WHERE form_code='K1200-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-05','평가업체명','평가 업체명','E5','text',1),
 ('K1200-05','평가일자','평가 일자','W5','date',2),
 ('K1200-05','의견품질','평가의견 — 품질보증','E34','text',3),
 ('K1200-05','의견개발','평가의견 — 개발','E37','text',4),
 ('K1200-05','의견구매','평가의견 — 구매','E40','text',5);

DELETE FROM form_grid_spec WHERE form_code='K1200-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K1200-05','평가자',7,1,4),
 ('K1200-05','scores',13,1,19);

DELETE FROM form_grid_columns WHERE form_code='K1200-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-05','평가자','소속','소속','E','text',1),
 ('K1200-05','평가자','직위','직위','L','text',2),
 ('K1200-05','평가자','성명','성명','S','text',3),
 ('K1200-05','scores','득점','득점','AF','text',1);

-- ── J1102-01 관리계획서 1판 표지(갑) ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0123, 260731): Control Plan 갑지 표지 — 업체명·차종·부품명/품명·부번/품번·상호기능팀원·업체코드·제정일자 + 개정 1행(개정일자·개정사유·작성·검토·승인). 단계 체크(시작/양산)·고객 승인 3(서명 동선)·공정도/LAYOUT(12행~)은 시트 몫.'
WHERE code='J1102-01';

DELETE FROM form_fields WHERE form_code='J1102-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J1102-01','업체명','업체명','text','기본 정보',NULL,1,'frame'),
 ('J1102-01','차종','차종','text','기본 정보',NULL,2,'frame'),
 ('J1102-01','부품명','부품명/품명','text','기본 정보',NULL,3,'frame'),
 ('J1102-01','부번','부번/품번','text','기본 정보',NULL,4,'frame'),
 ('J1102-01','팀원','상호기능팀원','text','기본 정보',NULL,5,'frame'),
 ('J1102-01','업체코드','업체코드','text','기본 정보',NULL,6,'frame'),
 ('J1102-01','제정일자','제정일자','text','문서 정보',NULL,10,'frame'),
 ('J1102-01','개정일자','개정일자','text','문서 정보',NULL,11,'frame'),
 ('J1102-01','개정사유','개정사유','text','문서 정보',NULL,12,'frame'),
 ('J1102-01','개정작성','개정 작성','text','문서 정보',NULL,13,'frame'),
 ('J1102-01','개정검토','개정 검토','text','문서 정보',NULL,14,'frame'),
 ('J1102-01','개정승인','개정 승인','text','문서 정보',NULL,15,'frame');

DELETE FROM form_cell_map WHERE form_code='J1102-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('J1102-01','업체명','업체명','D2','text',1),
 ('J1102-01','차종','차종','G3','text',2),
 ('J1102-01','부품명','부품명/품명','G5','text',3),
 ('J1102-01','부번','부번/품번','G7','text',4),
 ('J1102-01','팀원','상호기능팀원','G9','text',5),
 ('J1102-01','업체코드','업체코드','D11','text',6),
 ('J1102-01','제정일자','제정일자','T3','text',7),
 ('J1102-01','개정일자','개정일자','L4','text',8),
 ('J1102-01','개정사유','개정사유','M4','text',9),
 ('J1102-01','개정작성','개정 작성','O4','text',10),
 ('J1102-01','개정검토','개정 검토','P4','text',11),
 ('J1102-01','개정승인','개정 승인','Q4','text',12);

DELETE FROM form_grid_spec WHERE form_code='J1102-01';
DELETE FROM form_grid_columns WHERE form_code='J1102-01';

DELETE FROM form_change_log WHERE migration='0123';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('D1100-03','2026-07-31','cellmap_redesign','0019 잔재 9필드','헤더 5 + 대형 textarea 4','제품 안전교육 증빙(심사 갭 연계)','0123'),
 ('K2100-04','2026-07-31','cellmap_redesign','0019 잔재 1필드','작성 3 + 재고 grid(27행) + 실사중량','합계(34행 SUM 3식) 보존','0123'),
 ('F2100-07','2026-07-31','cellmap_redesign','0019 잔재 1필드·18셀맵','연도 + 평가 grid(4항목×월 12+달성율)','계획○/실적● 병기 칸(월 2열 병합)','0123'),
 ('K2100-09','2026-07-31','cellmap_redesign','0019 잔재 6필드','소모품 grid(4행)','사진 열 시트 몫','0123'),
 ('L3101-01','2026-07-31','cellmap_redesign','0019 잔재 11필드','헤더 3 + 계획/실시 2행 블록 grid 12개','NO 자동 수식(A열) 보존','0123'),
 ('L3100-03','2026-07-31','cellmap_redesign','0019 잔재 3필드','헤더 3 + 검교정 grid(관리번호+월 12+비고)','★마스터 결함(L3100-02 계열): B~G = VLOOKUP #REF! 소실 — 정본정비_동선목록 5건째 등재·수식 보존','0123'),
 ('A5100-01','2026-07-31','cellmap_redesign','0019 잔재 4필드·70셀맵','작성일·연도 3 + 공정 분기 12칸 + 시스템 grid(2행 블록 9)','3개년×분기 매트릭스. 하단 3번 구분(35행~) 시트 수기','0123'),
 ('A8101-02','2026-07-31','cellmap_redesign','0019 잔재 3필드','좌측(빈 틀) 14칸 매핑','우측 = E-7 팬더믹 작성례 보존(모범 예시 성격)','0123'),
 ('A8101-04','2026-07-31','cellmap_redesign','0019 잔재 11필드','헤더 4 + 참석자 grid(좌/우) + 회의명·내용','','0123'),
 ('K1200-05','2026-07-31','cellmap_redesign','0019 잔재 11필드·30셀맵','업체·일자 + 평가자 grid + 득점 grid(19행) + 의견 3','항목·기준·배점 기정의 — 득점만 기입','0123'),
 ('J1102-01','2026-07-31','cellmap_redesign','0019 잔재 14필드','표지 12칸(업체·차종·부번·팀원·개정 1행)','단계 체크·고객 승인·공정도 시트 몫','0123');
