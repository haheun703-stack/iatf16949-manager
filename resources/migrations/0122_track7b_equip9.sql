-- ============================================================
-- Migration 0122: 레거시 2차 배치 1일차 — 설비군 9종 (L1100-13·16~23, 2026-07-31)
--
-- 근거: 착수 지시(260731, 사장님 결정 ①) §1 — 2차 로스터 1~9위(각 310점, 핵심의무 연계
-- 설비군 일괄). 같은 L-1100 마스터 연속 시트 묶음 처리. 9종 전부 0019 잔재·제출 0 무손실.
-- AM 변형 우선 탐색 체크 이행 — L-1100 마스터 내 사업부 변형 시트 없음(단일 시트 실측,
-- L1100-13만 갑지/을지 2면 · L1100-10 선례로 갑지 채택).
--
-- 실측 요지(2026-07-31 사무실, 병합 전수):
--   L1100-13 갑지: 연간 테마 계획 — 월별 테마 12칸(6행, 6~8월 가로 병합) + 주차별 점검
--     grid(9~13행 5행) + 비고. 을지(월별 실기록 블록 누적 문서)는 시트 몫(갑지 채택).
--   L1100-16: 2부 — SPARE PARTS 대장 grid(4~23행 20행, 주차별 재고 4열) + 구매 업체
--     연락처 2행 블록 10개(27:28~45:46, 2단 헤더 — main/sub 분리). 47행 = 각주.
--   L1100-17: 폐기 자산 grid(6~9행 4행) + 사유(11행)·첨부(14행)·폐기내용(16행) textarea +
--     하단 설비 식별 3(38~40행). 사진 첨부(23~37)·결재 2벌은 시트 몫.
--   L1100-18: 2부 — F/P 설비 현황 리스트 grid(5~19행 15행, 점검주기 '월1회' 병합 기정의
--     제외) + 하단 점검일지(년월 + 점검항목 2행 블록 5개 27:28~35:36 — 기준/방법 기정의,
--     작동여부·비고만 기입). 하단 사업부/라인명 라벨은 값칸 불명(라벨 연속 배치) —
--     설비명 H23만 매핑, 나머지 식별은 시트 수기.
--   L1100-19: 전달 교육 보고서 — 헤더 8(작성자 auto T4) + 참석자 grid(9~12행, 좌/우
--     2열) + 교육내용 textarea(A14). 교육 사진은 시트 몫.
--   L1100-20: F/P 이상발생 체크시트 — 제목(월) + 점검일 2(좌 G27·우 AJ27 통합 라벨) +
--     상단 점검 grid(29~33행 5항목 — 좌/우 회차별 조건 변경 값·작동상태 4열). 기준값
--     표(16~20)·점검 순서 안내 기정의. 하단 2차 표(36~41)는 시트 수기(회차 연장).
--   L1100-21: 빽업 기준서 — 설비별 빽업 내역 grid(23~34행 12행, 좌/우 2열 = 6열 통합).
--     설비 LAY-OUT 이미지·빽업 기준 4개조 기정의는 시트 몫.
--   L1100-22: 빽업 관리대장(반기 1면) — 행렬 전치형(설비 A-1~A-11 열 × 일자/빽업자/차기
--     행)이라 grid 불가 → 개별 25칸(제목·상단 6열×3행·특이사항·하단 5열×2행·특이사항).
--   L1100-23: 설비관리 기준서 카드 — 설비 식별 3(V3·AA3·AD3) + 점검항목 grid(5~23행
--     2행 병합 10블록: 항목·규격·점검방법) + 재개정 이력 grid(26~29행). 주기/담당자/기록
--     열(5블록 대형 병합)·도식화·범례·결재는 시트 몫.
--
-- 멱등: DELETE+INSERT. P1 예약 마이그 = 0123+ 순연(견적갱신 §1-2 유동 예약 그대로).
-- ============================================================

-- ── L1100-13 테마별 설비점기점검 계획서(갑지) ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 갑지(연간 계획) 매핑 — 제목(연도)·작성 부서·작성일자 + 월별 중점 점검 테마 12칸 + 주차별 점검 grid(1~5주차: 부서·내역/테마/테마별 내역) + 비고. 을지(월별 중점점검 실기록 블록 누적)는 시트 몫(L1100-10 갑지 선례). 결재 5단 서명 몫.'
WHERE code='L1100-13';

DELETE FROM form_fields WHERE form_code='L1100-13';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-13','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-13','작성부서','작성자(부서)','text','기본 정보',NULL,2,'frame'),
 ('L1100-13','작성일자','작성일자','text','기본 정보',NULL,3,'frame'),
 ('L1100-13','테마1','1월 테마','text','월별 테마',NULL,10,'frame'),
 ('L1100-13','테마2','2월 테마','text','월별 테마',NULL,11,'frame'),
 ('L1100-13','테마3','3월 테마','text','월별 테마',NULL,12,'frame'),
 ('L1100-13','테마4','4월 테마','text','월별 테마',NULL,13,'frame'),
 ('L1100-13','테마5','5월 테마','text','월별 테마',NULL,14,'frame'),
 ('L1100-13','테마6','6월 테마','text','월별 테마',NULL,15,'frame'),
 ('L1100-13','테마7','7월 테마','text','월별 테마',NULL,16,'frame'),
 ('L1100-13','테마8','8월 테마','text','월별 테마',NULL,17,'frame'),
 ('L1100-13','테마9','9월 테마','text','월별 테마',NULL,18,'frame'),
 ('L1100-13','테마10','10월 테마','text','월별 테마',NULL,19,'frame'),
 ('L1100-13','테마11','11월 테마','text','월별 테마',NULL,20,'frame'),
 ('L1100-13','테마12','12월 테마','text','월별 테마',NULL,21,'frame'),
 ('L1100-13','weeks','주차별 점검(1~5주차)','grid','주차별 점검',NULL,30,NULL),
 ('L1100-13','비고','비고','text','비고',NULL,40,'frame');

DELETE FROM form_cell_map WHERE form_code='L1100-13';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-13','제목','제목(연도 기입)','B1','text',1),
 ('L1100-13','작성부서','작성자(부서)','A3','text',2),
 ('L1100-13','작성일자','작성일자','O3','text',3),
 ('L1100-13','테마1','1월 테마','A6','text',4),
 ('L1100-13','테마2','2월 테마','B6','text',5),
 ('L1100-13','테마3','3월 테마','C6','text',6),
 ('L1100-13','테마4','4월 테마','D6','text',7),
 ('L1100-13','테마5','5월 테마','E6','text',8),
 ('L1100-13','테마6','6월 테마','F6','text',9),
 ('L1100-13','테마7','7월 테마','H6','text',10),
 ('L1100-13','테마8','8월 테마','J6','text',11),
 ('L1100-13','테마9','9월 테마','M6','text',12),
 ('L1100-13','테마10','10월 테마','N6','text',13),
 ('L1100-13','테마11','11월 테마','O6','text',14),
 ('L1100-13','테마12','12월 테마','P6','text',15),
 ('L1100-13','비고','비고','B14','text',16);

DELETE FROM form_grid_spec WHERE form_code='L1100-13';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-13','weeks',9,1,5);

DELETE FROM form_grid_columns WHERE form_code='L1100-13';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-13','weeks','부서내역','점검 부서 및 내역','B','text',1),
 ('L1100-13','weeks','테마','테마','I','text',2),
 ('L1100-13','weeks','테마내역','테마별 점검내역','K','text',3);

-- ── L1100-16 스페어파트 관리대장 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 제목(년월) + SPARE PARTS 대장 grid(4~23행 20행: 부품명·규격·적정재고·현재재고 1~4주·메이커·구매처·구입 소요시간·보관위치·비고) + 구매 업체 연락처 2행 블록 grid 10개(상단행: 업체명·취급품목·대표/담당자[★2행 통합 병합 실측 — 병기 칸]·전화·홈페이지·비고 / 하단행: 담당자 연락처·메일).'
WHERE code='L1100-16';

DELETE FROM form_fields WHERE form_code='L1100-16';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-16','제목','제목(년월 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-16','parts','SPARE PARTS 대장(20행)','grid','파트 대장',NULL,10,NULL),
 ('L1100-16','vendors','구매 업체(상단행)','grid','업체 연락처',NULL,20,NULL),
 ('L1100-16','vendors2','구매 업체 담당자(하단행 — 같은 순서)','grid','업체 연락처',NULL,21,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-16';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-16','제목','제목(년월 기입)','A1','text',1);

DELETE FROM form_grid_spec WHERE form_code='L1100-16';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-16','parts',4,1,20),
 ('L1100-16','vendors',27,2,10),
 ('L1100-16','vendors2',28,2,10);

DELETE FROM form_grid_columns WHERE form_code='L1100-16';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-16','parts','부품명','부품명','B','text',1),
 ('L1100-16','parts','규격','규격','C','text',2),
 ('L1100-16','parts','적정재고','적정재고','D','text',3),
 ('L1100-16','parts','재고1주','현재재고 1주','E','text',4),
 ('L1100-16','parts','재고2주','현재재고 2주','F','text',5),
 ('L1100-16','parts','재고3주','현재재고 3주','G','text',6),
 ('L1100-16','parts','재고4주','현재재고 4주','H','text',7),
 ('L1100-16','parts','메이커','메이커','I','text',8),
 ('L1100-16','parts','구매처','구매처','J','text',9),
 ('L1100-16','parts','소요시간','구입 소요시간','K','text',10),
 ('L1100-16','parts','보관위치','보관 위치','L','text',11),
 ('L1100-16','parts','비고','비고','M','text',12),
 ('L1100-16','vendors','업체명','업체명','B','text',1),
 ('L1100-16','vendors','취급품목','취급품목','C','text',2),
 ('L1100-16','vendors','대표담당','대표/담당자(통합 칸 — 병기)','D','text',3),
 ('L1100-16','vendors','전화','전화','I','text',4),
 ('L1100-16','vendors','홈페이지','홈페이지','K','text',5),
 ('L1100-16','vendors','비고','비고','N','text',6),
 ('L1100-16','vendors2','연락처','담당자 연락처','I','text',1),
 ('L1100-16','vendors2','메일','담당자 메일','K','text',2);

-- ── L1100-17 고정자산 폐기 품의서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 작성일자·작성자 + 폐기 자산 grid(6~9행 4행: 입고일자·제조회사·자산명·형식·설비번호·단위·수량·처리방법·잔존가·비고) + 사유·첨부·폐기내용 + 하단 설비 식별 3(설비명·설비번호·부서/공정명). 폐기 설비 사진(23~37행)·결재 2벌(폐기부서/결재)은 시트 몫.'
WHERE code='L1100-17';

DELETE FROM form_fields WHERE form_code='L1100-17';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-17','작성일자','작성일자','text','기본 정보',NULL,1,'frame'),
 ('L1100-17','작성자','작성자(부서)','text','기본 정보',NULL,2,'frame'),
 ('L1100-17','assets','폐기 자산(4행)','grid','폐기 자산',NULL,10,NULL),
 ('L1100-17','사유','폐기 사유','textarea','사유·내용',NULL,20,NULL),
 ('L1100-17','첨부','첨부','text','사유·내용',NULL,21,'frame'),
 ('L1100-17','폐기내용','폐기 내용','textarea','사유·내용',NULL,22,NULL),
 ('L1100-17','설비명','설비명(사진 대상)','text','폐기 설비 식별',NULL,30,'frame'),
 ('L1100-17','설비번호','설비번호','text','폐기 설비 식별',NULL,31,'frame'),
 ('L1100-17','부서공정','부서 및 공정명','text','폐기 설비 식별',NULL,32,'frame');

DELETE FROM form_cell_map WHERE form_code='L1100-17';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-17','작성일자','작성일자','A3','text',1),
 ('L1100-17','작성자','작성자(부서)','N3','text',2),
 ('L1100-17','사유','폐기 사유','A11','text',3),
 ('L1100-17','첨부','첨부','A14','text',4),
 ('L1100-17','폐기내용','폐기 내용','A16','text',5),
 ('L1100-17','설비명','설비명(사진 대상)','E38','text',6),
 ('L1100-17','설비번호','설비번호','E39','text',7),
 ('L1100-17','부서공정','부서 및 공정명','E40','text',8);

DELETE FROM form_grid_spec WHERE form_code='L1100-17';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-17','assets',6,1,4);

DELETE FROM form_grid_columns WHERE form_code='L1100-17';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-17','assets','입고일자','최초 입고일자','B','text',1),
 ('L1100-17','assets','제조회사','제조회사','D','text',2),
 ('L1100-17','assets','자산명','고정자산명','E','text',3),
 ('L1100-17','assets','형식','형식','F','text',4),
 ('L1100-17','assets','설비번호','설비번호','G','text',5),
 ('L1100-17','assets','단위','단위','H','text',6),
 ('L1100-17','assets','수량','수량','I','text',7),
 ('L1100-17','assets','처리방법','처리방법','J','text',8),
 ('L1100-17','assets','잔존가','현 잔존가','L','text',9),
 ('L1100-17','assets','비고','비고','O','text',10);

-- ── L1100-18 풀프로프 설비 점검 일지 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 2부 — ①F/P 설비 현황 리스트 grid(5~19행 15행: 라인명·설비번호·설비명·측정항목·비고 — 점검주기 월1회 병합 기정의) ②하단 점검일지(년월 + 설비명 + 점검항목 2행 블록 5개[기준/방법 기정의]: 작동여부·비고). 하단 사업부/라인명 라벨은 값칸 불명(라벨 연속 배치) — 시트 수기. 결재 4단 서명 몫.'
WHERE code='L1100-18';

DELETE FROM form_fields WHERE form_code='L1100-18';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-18','작성부서','작성자(부서)','text','기본 정보',NULL,1,'frame'),
 ('L1100-18','list','F/P 설비 현황(15행)','grid','설비 현황',NULL,10,NULL),
 ('L1100-18','점검년월','점검 년월','text','점검 일지',NULL,20,'frame'),
 ('L1100-18','설비명','설비명(점검 대상)','text','점검 일지',NULL,21,'frame'),
 ('L1100-18','checks','점검항목(5블록: 작동여부·비고)','grid','점검 일지',NULL,22,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-18';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-18','작성부서','작성자(부서)','A3','text',1),
 ('L1100-18','점검년월','점검 년월','A20','text',2),
 ('L1100-18','설비명','설비명(점검 대상)','H23','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-18';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-18','list',5,1,15),
 ('L1100-18','checks',27,2,5);

DELETE FROM form_grid_columns WHERE form_code='L1100-18';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-18','list','라인명','라인명','B','text',1),
 ('L1100-18','list','설비번호','설비번호','C','text',2),
 ('L1100-18','list','설비명','설비명','E','text',3),
 ('L1100-18','list','측정항목','측정항목','G','text',4),
 ('L1100-18','list','비고','비고','K','text',5),
 ('L1100-18','checks','작동여부','작동여부(○/×)','H','text',1),
 ('L1100-18','checks','비고','비고','I','text',2);

-- ── L1100-19 설비 이관 교육결과 보고서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 전달 교육 보고서 — 헤더 8(소속·직위·작성자[자동]·교육장소·교육일자·강사명·교육목적·교육명) + 참석자 grid(9~12행, 좌/우 2열 — 소속·직위·성명) + 교육내용 textarea. 교육 사진(27행~)·결재 4단은 시트 몫.'
WHERE code='L1100-19';

DELETE FROM form_fields WHERE form_code='L1100-19';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-19','소속','소속','text','기본 정보',NULL,1,'frame'),
 ('L1100-19','직위','직위','text','기본 정보',NULL,2,'frame'),
 ('L1100-19','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('L1100-19','교육장소','교육장소','text','교육 정보',NULL,10,'frame'),
 ('L1100-19','교육일자','교육일자','date','교육 정보',NULL,11,'fact'),
 ('L1100-19','강사명','강사명','text','교육 정보',NULL,12,'frame'),
 ('L1100-19','교육목적','교육목적','text','교육 정보',NULL,13,'frame'),
 ('L1100-19','교육명','교육명','text','교육 정보',NULL,14,'frame'),
 ('L1100-19','참석자','참석자(좌/우 2열)','grid','참석자',NULL,20,NULL),
 ('L1100-19','교육내용','교육내용','textarea','교육 내용',NULL,30,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-19';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-19','소속','소속','D4','text',1),
 ('L1100-19','직위','직위','L4','text',2),
 ('L1100-19','작성자','작성자','T4','text',3),
 ('L1100-19','교육장소','교육장소','D5','text',4),
 ('L1100-19','교육일자','교육일자','L5','date',5),
 ('L1100-19','강사명','강사명','T5','text',6),
 ('L1100-19','교육목적','교육목적','D6','text',7),
 ('L1100-19','교육명','교육명','D7','text',8),
 ('L1100-19','교육내용','교육내용','A14','text',9);

DELETE FROM form_grid_spec WHERE form_code='L1100-19';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-19','참석자',9,1,4);

DELETE FROM form_grid_columns WHERE form_code='L1100-19';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-19','참석자','소속1','소속(좌)','D','text',1),
 ('L1100-19','참석자','직위1','직위(좌)','H','text',2),
 ('L1100-19','참석자','성명1','성명(좌)','K','text',3),
 ('L1100-19','참석자','소속2','소속(우)','N','text',4),
 ('L1100-19','참석자','직위2','직위(우)','R','text',5),
 ('L1100-19','참석자','성명2','성명(우)','U','text',6);

-- ── L1100-20 F/P 이상발생 점검 체크시트 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 제목(월) + 점검일 2(좌/우 회차) + 점검 grid(29~33행 5항목[전압·전류·유량·Tip·원점 기정의]: 좌/우 조건 변경 값·작동상태). 기준값 표(16~20)·점검 순서 안내·기록방법(○/×) 기정의, 하단 2차 표(36~41행 회차 연장)·비고 영역·결재는 시트 몫. 주 1회(금) 작성.'
WHERE code='L1100-20';

DELETE FROM form_fields WHERE form_code='L1100-20';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-20','제목','제목(월 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-20','점검일1','점검일(1회차)','text','점검',NULL,10,'frame'),
 ('L1100-20','점검일2','점검일(2회차)','text','점검',NULL,11,'frame'),
 ('L1100-20','checks','점검 기록(5항목×좌우 회차)','grid','점검',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-20';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-20','제목','제목(월 기입)','E1','text',1),
 ('L1100-20','점검일1','점검일(1회차)','G27','text',2),
 ('L1100-20','점검일2','점검일(2회차)','U27','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-20';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-20','checks',29,1,5);

DELETE FROM form_grid_columns WHERE form_code='L1100-20';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-20','checks','조건1','조건 변경 값(1회차)','G','text',1),
 ('L1100-20','checks','작동1','작동상태(1회차)','N','text',2),
 ('L1100-20','checks','조건2','조건 변경 값(2회차)','U','text',3),
 ('L1100-20','checks','작동2','작동상태(2회차)','AC','text',4);

-- ── L1100-21 설비 데이터 빽업 기준서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 설비별 빽업 내역 grid(23~34행 12행, 좌/우 2열 통합 — 구분·설비명·빽업 항목 ×2). 설비 LAY-OUT 이미지(4~20행)·빽업 기준 4개조(35~39행 기정의)는 시트 몫.'
WHERE code='L1100-21';

DELETE FROM form_fields WHERE form_code='L1100-21';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-21','rows','설비별 빽업 내역(12행×좌우 2열)','grid','빽업 내역',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-21';

DELETE FROM form_grid_spec WHERE form_code='L1100-21';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-21','rows',23,1,12);

DELETE FROM form_grid_columns WHERE form_code='L1100-21';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-21','rows','구분1','구분(좌)','A','text',1),
 ('L1100-21','rows','설비명1','설비명(좌)','C','text',2),
 ('L1100-21','rows','빽업항목1','빽업 항목(좌)','H','text',3),
 ('L1100-21','rows','구분2','구분(우)','P','text',4),
 ('L1100-21','rows','설비명2','설비명(우)','R','text',5),
 ('L1100-21','rows','빽업항목2','빽업 항목(우)','W','text',6);

-- ── L1100-22 설비 데이터 빽업 관리대장 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 반기 1면 — 행렬 전치형(설비 A-1~A-11 열 × 일자/빽업자/차기 행)이라 grid 불가 → 개별 매핑: 제목(연도) + 상단 6열(빽업 일자·빽업자·차기 계획) + 하단 5열(빽업 일자·빽업자) + 특이사항 2. 설비 라벨(A-1~A-11) 기정의·결재는 시트 몫.'
WHERE code='L1100-22';

DELETE FROM form_fields WHERE form_code='L1100-22';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-22','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-22','일자a1','A-1 빽업일자','text','상단(A-1~A-6)',NULL,10,NULL),
 ('L1100-22','일자a2','A-2 빽업일자','text','상단(A-1~A-6)',NULL,11,NULL),
 ('L1100-22','일자a3','A-3 빽업일자','text','상단(A-1~A-6)',NULL,12,NULL),
 ('L1100-22','일자a4','A-4 빽업일자','text','상단(A-1~A-6)',NULL,13,NULL),
 ('L1100-22','일자a5','A-5 빽업일자','text','상단(A-1~A-6)',NULL,14,NULL),
 ('L1100-22','일자a6','A-6 빽업일자','text','상단(A-1~A-6)',NULL,15,NULL),
 ('L1100-22','자a1','A-1 빽업자','text','상단(A-1~A-6)',NULL,16,'frame'),
 ('L1100-22','자a2','A-2 빽업자','text','상단(A-1~A-6)',NULL,17,'frame'),
 ('L1100-22','자a3','A-3 빽업자','text','상단(A-1~A-6)',NULL,18,'frame'),
 ('L1100-22','자a4','A-4 빽업자','text','상단(A-1~A-6)',NULL,19,'frame'),
 ('L1100-22','자a5','A-5 빽업자','text','상단(A-1~A-6)',NULL,20,'frame'),
 ('L1100-22','자a6','A-6 빽업자','text','상단(A-1~A-6)',NULL,21,'frame'),
 ('L1100-22','특이상','특이사항(상단)','textarea','상단(A-1~A-6)',NULL,22,NULL),
 ('L1100-22','차기a1','A-1 차기계획','text','상단(A-1~A-6)',NULL,23,NULL),
 ('L1100-22','차기a2','A-2 차기계획','text','상단(A-1~A-6)',NULL,24,NULL),
 ('L1100-22','차기a3','A-3 차기계획','text','상단(A-1~A-6)',NULL,25,NULL),
 ('L1100-22','차기a4','A-4 차기계획','text','상단(A-1~A-6)',NULL,26,NULL),
 ('L1100-22','차기a5','A-5 차기계획','text','상단(A-1~A-6)',NULL,27,NULL),
 ('L1100-22','차기a6','A-6 차기계획','text','상단(A-1~A-6)',NULL,28,NULL),
 ('L1100-22','일자a7','A-7 빽업일자','text','하단(A-7~A-11)',NULL,30,NULL),
 ('L1100-22','일자a8','A-8 빽업일자','text','하단(A-7~A-11)',NULL,31,NULL),
 ('L1100-22','일자a9','A-9 빽업일자','text','하단(A-7~A-11)',NULL,32,NULL),
 ('L1100-22','일자a10','A-10 빽업일자','text','하단(A-7~A-11)',NULL,33,NULL),
 ('L1100-22','일자a11','A-11 빽업일자','text','하단(A-7~A-11)',NULL,34,NULL),
 ('L1100-22','자a7','A-7 빽업자','text','하단(A-7~A-11)',NULL,35,'frame'),
 ('L1100-22','자a8','A-8 빽업자','text','하단(A-7~A-11)',NULL,36,'frame'),
 ('L1100-22','자a9','A-9 빽업자','text','하단(A-7~A-11)',NULL,37,'frame'),
 ('L1100-22','자a10','A-10 빽업자','text','하단(A-7~A-11)',NULL,38,'frame'),
 ('L1100-22','자a11','A-11 빽업자','text','하단(A-7~A-11)',NULL,39,'frame'),
 ('L1100-22','특이하','특이사항(하단)','textarea','하단(A-7~A-11)',NULL,40,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-22';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-22','제목','제목(연도 기입)','D1','text',1),
 ('L1100-22','일자a1','A-1 빽업일자','F6','text',2),
 ('L1100-22','일자a2','A-2 빽업일자','J6','text',3),
 ('L1100-22','일자a3','A-3 빽업일자','N6','text',4),
 ('L1100-22','일자a4','A-4 빽업일자','R6','text',5),
 ('L1100-22','일자a5','A-5 빽업일자','V6','text',6),
 ('L1100-22','일자a6','A-6 빽업일자','Z6','text',7),
 ('L1100-22','자a1','A-1 빽업자','F7','text',8),
 ('L1100-22','자a2','A-2 빽업자','J7','text',9),
 ('L1100-22','자a3','A-3 빽업자','N7','text',10),
 ('L1100-22','자a4','A-4 빽업자','R7','text',11),
 ('L1100-22','자a5','A-5 빽업자','V7','text',12),
 ('L1100-22','자a6','A-6 빽업자','Z7','text',13),
 ('L1100-22','특이상','특이사항(상단)','F8','text',14),
 ('L1100-22','차기a1','A-1 차기계획','F11','text',15),
 ('L1100-22','차기a2','A-2 차기계획','J11','text',16),
 ('L1100-22','차기a3','A-3 차기계획','N11','text',17),
 ('L1100-22','차기a4','A-4 차기계획','R11','text',18),
 ('L1100-22','차기a5','A-5 차기계획','V11','text',19),
 ('L1100-22','차기a6','A-6 차기계획','Z11','text',20),
 ('L1100-22','일자a7','A-7 빽업일자','F13','text',21),
 ('L1100-22','일자a8','A-8 빽업일자','J13','text',22),
 ('L1100-22','일자a9','A-9 빽업일자','N13','text',23),
 ('L1100-22','일자a10','A-10 빽업일자','R13','text',24),
 ('L1100-22','일자a11','A-11 빽업일자','V13','text',25),
 ('L1100-22','자a7','A-7 빽업자','F14','text',26),
 ('L1100-22','자a8','A-8 빽업자','J14','text',27),
 ('L1100-22','자a9','A-9 빽업자','N14','text',28),
 ('L1100-22','자a10','A-10 빽업자','R14','text',29),
 ('L1100-22','자a11','A-11 빽업자','V14','text',30),
 ('L1100-22','특이하','특이사항(하단)','F15','text',31);

DELETE FROM form_grid_spec WHERE form_code='L1100-22';
DELETE FROM form_grid_columns WHERE form_code='L1100-22';

-- ── L1100-23 설비관리 기준서 ──
UPDATE forms SET
  description='재설계 — 레거시 2차(0122, 260731): 설비 식별 3(설비명·설비등급·설비업체) + 점검항목 grid(5~23행 2행 병합 10블록: 점검항목·규격·점검방법) + 재개정 이력 grid(26~29행: 개정일자·개정 사유·작성·검토·승인). 주기/담당자/기록 열(5블록 대형 병합 기정의)·설비 도식화·범례·상단 결재는 시트 몫.'
WHERE code='L1100-23';

DELETE FROM form_fields WHERE form_code='L1100-23';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-23','설비명','설비명','text','설비 식별',NULL,1,'frame'),
 ('L1100-23','설비등급','설비등급','text','설비 식별',NULL,2,'frame'),
 ('L1100-23','설비업체','설비업체','text','설비 식별',NULL,3,'frame'),
 ('L1100-23','items','점검항목(10블록)','grid','점검 기준',NULL,10,NULL),
 ('L1100-23','revs','재개정 이력(4행)','grid','재개정 이력',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-23';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-23','설비명','설비명','V3','text',1),
 ('L1100-23','설비등급','설비등급','AA3','text',2),
 ('L1100-23','설비업체','설비업체','AD3','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-23';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-23','items',5,2,10),
 ('L1100-23','revs',26,1,4);

DELETE FROM form_grid_columns WHERE form_code='L1100-23';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-23','items','점검항목','점검 항목','T','text',1),
 ('L1100-23','items','규격','규격','Z','text',2),
 ('L1100-23','items','점검방법','점검방법','AH','text',3),
 ('L1100-23','revs','개정일자','개정일자','V','text',1),
 ('L1100-23','revs','개정사유','개정 사유','AA','text',2),
 ('L1100-23','revs','작성','작성','AN','text',3),
 ('L1100-23','revs','검토','검토','AQ','text',4),
 ('L1100-23','revs','승인','승인','AT','text',5);

DELETE FROM form_change_log WHERE migration='0122';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('L1100-13','2026-07-31','cellmap_redesign','0019 잔재 2필드','갑지 — 헤더 3 + 월테마 12칸 + 주차 grid(5행) + 비고','레거시 2차 1~9위 설비군. 을지(월별 실기록 누적)는 시트 몫','0122'),
 ('L1100-16','2026-07-31','cellmap_redesign','0019 잔재 11필드','파트 대장 grid(20행) + 업체 2행 블록 grid 10개(main/sub)','실측 반전 소견: 대표/담당자 칸 = 2행 통합 병합(D27:H28) — 헤더는 2단이나 데이터는 병기 칸(E2E가 리다이렉트 검출 → 통합 칸으로 정정)','0122'),
 ('L1100-17','2026-07-31','cellmap_redesign','0019 잔재 8필드','작성 2 + 자산 grid(4행) + 사유·첨부·내용 + 식별 3','사진·결재 2벌 시트 몫','0122'),
 ('L1100-18','2026-07-31','cellmap_redesign','0019 잔재 10필드','현황 grid(15행) + 점검일지(년월·설비명 + 2행 블록 5)','하단 사업부/라인명 = 값칸 불명(라벨 연속) — 시트 수기 명기','0122'),
 ('L1100-19','2026-07-31','cellmap_redesign','0019 잔재 11필드','헤더 8(작성자 auto) + 참석자 grid(좌/우) + 교육내용','','0122'),
 ('L1100-20','2026-07-31','cellmap_redesign','0019 잔재 7필드·18셀맵','제목·점검일 2 + 점검 grid(5항목×좌우 회차 4열)','하단 2차 표(36~41) = 회차 연장 시트 수기','0122'),
 ('L1100-21','2026-07-31','cellmap_redesign','0019 잔재 4필드','빽업 내역 grid(12행×좌우 6열)','LAY-OUT·기준 4개조 시트 몫','0122'),
 ('L1100-22','2026-07-31','cellmap_redesign','0019 잔재 3필드·32셀맵','행렬 전치형 — 개별 31칸(상단 6열×3행·하단 5열×2행·특이 2)','grid 불가 구조 — 설비 라벨 A-1~A-11 기정의','0122'),
 ('L1100-23','2026-07-31','cellmap_redesign','0019 잔재 15필드·28셀맵','식별 3 + 점검 grid(2행 병합 10블록) + 재개정 grid(4행)','주기/담당/기록(대형 병합)·도식화 시트 몫','0122');
