-- ============================================================
-- Migration 0124: 레거시 2차 배치 3일차 — 점수순 21~35위 15종 = ★2차 로스터 완주 (2026-07-31)
--
-- 근거: 착수 지시(260731) §1 로스터 21~35위. 15종 전부 0019 잔재·제출 0 무손실.
-- 특기: J1103-01 = 필라넥 변형 채택(J-1103 마스터 변형 4시트 중 AM 변형 무 — 필라넥/
-- 인발,조관/쇼바용접 1·2. 현행 form명 "-필라넥" 유지·빈 틀 실측 확인. 타 변형은 시트 몫).
-- K1200-04 = 갑지 매핑(을지 32행~ = 첨부 자료 영역 — 시트 몫).
--
-- 멱등: DELETE+INSERT. P1 예약 마이그 = 0125+ 순연.
-- ============================================================

-- ── K1200-01 협력업체 등록대장 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 업체 2행 블록 grid 10개(상단행: 등록일자·업체명·사업자번호·주소·연락책임자·생산/거래품목·인증 4[IATF/9001/14001/45001 — 유효기간 기록 칸] / 하단행: 대표자·업종/업태·연락처 2).' WHERE code='K1200-01';
DELETE FROM form_fields WHERE form_code='K1200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-01','main','업체 목록(상단행)','grid','등록대장',NULL,1,NULL),
 ('K1200-01','sub','업체 상세(하단행 — 같은 순서)','grid','등록대장',NULL,2,NULL);
DELETE FROM form_cell_map WHERE form_code='K1200-01';
DELETE FROM form_grid_spec WHERE form_code='K1200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K1200-01','main',6,2,10),('K1200-01','sub',7,2,10);
DELETE FROM form_grid_columns WHERE form_code='K1200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-01','main','등록일자','등록일자','B','text',1),
 ('K1200-01','main','업체명','업체명','C','text',2),
 ('K1200-01','main','사업자번호','사업자 등록번호','D','text',3),
 ('K1200-01','main','주소','주소','E','text',4),
 ('K1200-01','main','연락책임자','연락책임자','F','text',5),
 ('K1200-01','main','품목','생산/거래품목','G','text',6),
 ('K1200-01','main','iatf','IATF16949(유효기간)','H','text',7),
 ('K1200-01','main','iso9001','ISO 9001(유효기간)','I','text',8),
 ('K1200-01','main','iso14001','ISO 14001(유효기간)','J','text',9),
 ('K1200-01','main','iso45001','ISO 45001(유효기간)','K','text',10),
 ('K1200-01','sub','대표자','대표자','C','text',1),
 ('K1200-01','sub','업종업태','업종/업태','D','text',2),
 ('K1200-01','sub','연락처','연락처(주소란)','E','text',3),
 ('K1200-01','sub','연락처2','연락처(책임자)','F','text',4);

-- ── K1200-02 승인 자재 목록(AVL/AML) ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 작성일자·작성자 + 자재 grid(7~24행 18행: 분류·업체명·공급 제품명·품번·품질/납기 리스크·QMS 인증·정기 평가 3개년·실적 품질/납기 3개년). 결재 3단 서명 몫.' WHERE code='K1200-02';
DELETE FROM form_fields WHERE form_code='K1200-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-02','작성일자','작성일자(표기)','text','기본 정보',NULL,1,'frame'),
 ('K1200-02','작성자','작성자(표기)','text','기본 정보',NULL,2,'frame'),
 ('K1200-02','rows','승인 자재 목록(18행)','grid','자재 목록',NULL,10,NULL);
DELETE FROM form_cell_map WHERE form_code='K1200-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-02','작성일자','작성일자(표기)','E3','text',1),
 ('K1200-02','작성자','작성자(표기)','V3','text',2);
DELETE FROM form_grid_spec WHERE form_code='K1200-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K1200-02','rows',7,1,18);
DELETE FROM form_grid_columns WHERE form_code='K1200-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-02','rows','분류','분류','A','text',1),
 ('K1200-02','rows','업체명','업체명','E','text',2),
 ('K1200-02','rows','제품명','공급 제품명','J','text',3),
 ('K1200-02','rows','품번','품번','O','text',4),
 ('K1200-02','rows','품질리스크','품질 리스크','T','text',5),
 ('K1200-02','rows','납기리스크','납기 리스크','W','text',6),
 ('K1200-02','rows','qms','QMS 인증','Z','text',7),
 ('K1200-02','rows','평가y1','정기평가 1차년','AE','text',8),
 ('K1200-02','rows','평가y2','정기평가 2차년','AG','text',9),
 ('K1200-02','rows','평가y3','정기평가 3차년','AI','text',10),
 ('K1200-02','rows','실적q1','실적 품질 1차년','AK','text',11),
 ('K1200-02','rows','실적d1','실적 납기 1차년','AM','text',12),
 ('K1200-02','rows','실적q2','실적 품질 2차년','AO','text',13),
 ('K1200-02','rows','실적d2','실적 납기 2차년','AQ','text',14),
 ('K1200-02','rows','실적q3','실적 품질 3차년','AS','text',15),
 ('K1200-02','rows','실적d3','실적 납기 3차년','AU','text',16);

-- ── K1200-04 업체 실태 조사서(갑지) ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 갑지 매핑 — 회사 정보 10(회사명·사업자번호·대표자·업종/업태·소재지 3·설립일자·기업형태 3칸 체크·자본금) + 거래처 grid(11~16행) + 면적 2·종업원 4 + 기업특색 3(경영방침·품질방침·전문기술력) + 기타사항·조사결과. 을지(32행~ 첨부 자료)·조사자 3(인)은 시트 몫.' WHERE code='K1200-04';
DELETE FROM form_fields WHERE form_code='K1200-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K1200-04','회사명','회사명','text','회사 정보',NULL,1,'frame'),
 ('K1200-04','사업자번호','사업자등록번호','text','회사 정보',NULL,2,'frame'),
 ('K1200-04','대표자','대표자','text','회사 정보',NULL,3,'frame'),
 ('K1200-04','업종업태','업종/업태','text','회사 정보',NULL,4,'frame'),
 ('K1200-04','소재지본사','소재지 — 본사','text','회사 정보',NULL,5,'frame'),
 ('K1200-04','소재지공장','소재지 — 공장','text','회사 정보',NULL,6,'frame'),
 ('K1200-04','소재지사무실','소재지 — 사무실','text','회사 정보',NULL,7,'frame'),
 ('K1200-04','설립일자','설립일자(년 월 일)','text','회사 정보',NULL,8,'frame'),
 ('K1200-04','형태개인','기업형태 — 개인(√ 표기)','text','회사 정보',NULL,9,'frame'),
 ('K1200-04','형태법인','기업형태 — 법인(√ 표기)','text','회사 정보',NULL,10,'frame'),
 ('K1200-04','형태기타','기업형태 — 기타(√ 표기)','text','회사 정보',NULL,11,'frame'),
 ('K1200-04','자본금','자본금(만원)','text','회사 정보',NULL,12,'frame'),
 ('K1200-04','거래처','거래처 현황(6행)','grid','거래처',NULL,20,NULL),
 ('K1200-04','대지','공장 면적 — 대지(평)','text','규모',NULL,30,'frame'),
 ('K1200-04','건물','공장 면적 — 건물(평)','text','규모',NULL,31,'frame'),
 ('K1200-04','사무직','종업원 — 사무직(명)','text','규모',NULL,32,'frame'),
 ('K1200-04','현장직','종업원 — 현장직(명)','text','규모',NULL,33,'frame'),
 ('K1200-04','품질관리','종업원 — 품질관리(명)','text','규모',NULL,34,'frame'),
 ('K1200-04','총원','종업원 — 총원(명)','text','규모',NULL,35,'frame'),
 ('K1200-04','경영방침','기업 특색 — 경영방침','textarea','기업 특색',NULL,40,NULL),
 ('K1200-04','품질방침','기업 특색 — 품질방침','textarea','기업 특색',NULL,41,NULL),
 ('K1200-04','전문기술력','기업 특색 — 전문기술력','textarea','기업 특색',NULL,42,NULL),
 ('K1200-04','기타사항','기타 사항(납기·단가)','textarea','조사 결과',NULL,50,NULL),
 ('K1200-04','조사결과','조사 결과','textarea','조사 결과',NULL,51,NULL);
DELETE FROM form_cell_map WHERE form_code='K1200-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K1200-04','회사명','회사명','F4','text',1),
 ('K1200-04','사업자번호','사업자등록번호','V4','text',2),
 ('K1200-04','대표자','대표자','F5','text',3),
 ('K1200-04','업종업태','업종/업태','V5','text',4),
 ('K1200-04','소재지본사','소재지 — 본사','F6','text',5),
 ('K1200-04','소재지공장','소재지 — 공장','F7','text',6),
 ('K1200-04','소재지사무실','소재지 — 사무실','F8','text',7),
 ('K1200-04','설립일자','설립일자(년 월 일)','F9','text',8),
 ('K1200-04','형태개인','기업형태 — 개인(√ 표기)','U9','text',9),
 ('K1200-04','형태법인','기업형태 — 법인(√ 표기)','Y9','text',10),
 ('K1200-04','형태기타','기업형태 — 기타(√ 표기)','AC9','text',11),
 ('K1200-04','자본금','자본금(만원)','F10','text',12),
 ('K1200-04','대지','공장 면적 — 대지(평)','J11','text',13),
 ('K1200-04','건물','공장 면적 — 건물(평)','J12','text',14),
 ('K1200-04','사무직','종업원 — 사무직(명)','J13','text',15),
 ('K1200-04','현장직','종업원 — 현장직(명)','J14','text',16),
 ('K1200-04','품질관리','종업원 — 품질관리(명)','J15','text',17),
 ('K1200-04','총원','종업원 — 총원(명)','J16','text',18),
 ('K1200-04','경영방침','기업 특색 — 경영방침','J17','text',19),
 ('K1200-04','품질방침','기업 특색 — 품질방침','J20','text',20),
 ('K1200-04','전문기술력','기업 특색 — 전문기술력','J23','text',21),
 ('K1200-04','기타사항','기타 사항(납기·단가)','F26','text',22),
 ('K1200-04','조사결과','조사 결과','F29','text',23);
DELETE FROM form_grid_spec WHERE form_code='K1200-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K1200-04','거래처',11,1,6);
DELETE FROM form_grid_columns WHERE form_code='K1200-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K1200-04','거래처','거래처','거래처','Q','text',1),
 ('K1200-04','거래처','의존율','의존율','U','text',2),
 ('K1200-04','거래처','품목','거래 품목','Y','text',3);

-- ── J1103-01 작업표준서(-필라넥) ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 필라넥 변형 채택(J-1103 변형 4시트 중 AM 변형 무 — 빈 틀 실측). 적용 헤더 6(품번·품명·차종·공정명·설비명·작성일) + 조건 관리 grid(7~11행) + 자주검사 grid(7~11행) + 서술 4(작업순서·안전·부적합 및 이상조치 절차·중요 부적합 유형) + 금형·공구 grid(33~34행) + 개정이력 grid(33~34행). 도식화 2면·결재 4단은 시트 몫. 타 변형(인발,조관·쇼바용접)은 시트 몫.' WHERE code='J1103-01';
DELETE FROM form_fields WHERE form_code='J1103-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J1103-01','품번','적용 품번','text','적용 정보',NULL,1,'frame'),
 ('J1103-01','품명','적용 품명','text','적용 정보',NULL,2,'frame'),
 ('J1103-01','차종','적용 차종','text','적용 정보',NULL,3,'frame'),
 ('J1103-01','공정명','공정명','text','적용 정보',NULL,4,'frame'),
 ('J1103-01','설비명','설비명','text','적용 정보',NULL,5,'frame'),
 ('J1103-01','작성일','작성일','date','적용 정보',NULL,6,'fact'),
 ('J1103-01','cond','조건 관리 항목(5행)','grid','조건 관리',NULL,10,NULL),
 ('J1103-01','insp','자주검사 항목(5행)','grid','자주검사',NULL,11,NULL),
 ('J1103-01','작업순서','작업 순서','textarea','작업 표준',NULL,20,NULL),
 ('J1103-01','안전','안전','textarea','작업 표준',NULL,21,NULL),
 ('J1103-01','부적합절차','부적합 및 이상조치 절차','textarea','작업 표준',NULL,22,NULL),
 ('J1103-01','부적합유형','중요 부적합 유형','textarea','작업 표준',NULL,23,NULL),
 ('J1103-01','tools','금형 및 공구 관리(2행)','grid','금형·공구',NULL,30,NULL),
 ('J1103-01','revs','개정 이력(2행)','grid','개정 이력',NULL,31,NULL);
DELETE FROM form_cell_map WHERE form_code='J1103-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('J1103-01','품번','적용 품번','R1','text',1),
 ('J1103-01','품명','적용 품명','R2','text',2),
 ('J1103-01','차종','적용 차종','R3','text',3),
 ('J1103-01','공정명','공정명','AC1','text',4),
 ('J1103-01','설비명','설비명','AC2','text',5),
 ('J1103-01','작성일','작성일','AC3','date',6),
 ('J1103-01','작업순서','작업 순서','A18','text',7),
 ('J1103-01','안전','안전','M18','text',8),
 ('J1103-01','부적합절차','부적합 및 이상조치 절차','Y18','text',9),
 ('J1103-01','부적합유형','중요 부적합 유형','AK18','text',10);
DELETE FROM form_grid_spec WHERE form_code='J1103-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('J1103-01','cond',7,1,5),('J1103-01','insp',7,1,5),
 ('J1103-01','tools',33,1,2),('J1103-01','revs',33,1,2);
DELETE FROM form_grid_columns WHERE form_code='J1103-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('J1103-01','cond','관리항목','관리항목','C','text',1),
 ('J1103-01','cond','조건','조건','G','text',2),
 ('J1103-01','cond','확인방법','확인방법','K','text',3),
 ('J1103-01','cond','주기','관리주기','N','text',4),
 ('J1103-01','cond','도구','관리도구','Q','text',5),
 ('J1103-01','cond','담당','담당','U','text',6),
 ('J1103-01','insp','검사항목','검사항목','AA','text',1),
 ('J1103-01','insp','판단기준','판단기준','AE','text',2),
 ('J1103-01','insp','확인방법','확인방법','AI','text',3),
 ('J1103-01','insp','주기','관리주기','AL','text',4),
 ('J1103-01','insp','도구','관리도구','AO','text',5),
 ('J1103-01','insp','담당','담당','AS','text',6),
 ('J1103-01','tools','공구명','금형 및 공구명','C','text',1),
 ('J1103-01','tools','규격','관리규격','I','text',2),
 ('J1103-01','tools','확인방법','확인방법','N','text',3),
 ('J1103-01','tools','주기','주기','Q','text',4),
 ('J1103-01','tools','도구','관리 도구','T','text',5),
 ('J1103-01','revs','개정일','개정일','AA','text',1),
 ('J1103-01','revs','내용','개정 내용','AG','text',2),
 ('J1103-01','revs','확인','확인','AS','text',3);

-- ── D1100-01 안전사고 발생보고서 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 사고 헤더 8(사고일시·소속·상해부위·성명·사고장소·입사일자·작업명·목격자) + 발생경위(6하원칙)·원인분석·조치사항(팀장 기재) textarea 3. 결재 서명 몫.' WHERE code='D1100-01';
DELETE FROM form_fields WHERE form_code='D1100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-01','사고일시','사고 일시','date','사고 정보',NULL,1,'fact'),
 ('D1100-01','소속','소속','text','사고 정보',NULL,2,'frame'),
 ('D1100-01','상해부위','상해 부위','text','사고 정보',NULL,3,NULL),
 ('D1100-01','성명','성명','text','사고 정보',NULL,4,'frame'),
 ('D1100-01','사고장소','사고 장소','text','사고 정보',NULL,5,NULL),
 ('D1100-01','입사일자','입사 일자','date','사고 정보',NULL,6,NULL),
 ('D1100-01','작업명','작업명','text','사고 정보',NULL,7,'frame'),
 ('D1100-01','목격자','목격자','text','사고 정보',NULL,8,'frame'),
 ('D1100-01','발생경위','발생경위(6하원칙 상세)','textarea','내용',NULL,10,NULL),
 ('D1100-01','원인분석','원인분석','textarea','내용',NULL,11,NULL),
 ('D1100-01','조치사항','조치사항(소속 팀장 기재)','textarea','내용',NULL,12,NULL);
DELETE FROM form_cell_map WHERE form_code='D1100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-01','사고일시','사고 일시','E5','date',1),
 ('D1100-01','소속','소속','R5','text',2),
 ('D1100-01','상해부위','상해 부위','E6','text',3),
 ('D1100-01','성명','성명','R6','text',4),
 ('D1100-01','사고장소','사고 장소','E7','text',5),
 ('D1100-01','입사일자','입사 일자','R7','date',6),
 ('D1100-01','작업명','작업명','E8','text',7),
 ('D1100-01','목격자','목격자','R8','text',8),
 ('D1100-01','발생경위','발생경위(6하원칙 상세)','A10','text',9),
 ('D1100-01','원인분석','원인분석','A24','text',10),
 ('D1100-01','조치사항','조치사항(소속 팀장 기재)','A34','text',11);
DELETE FROM form_grid_spec WHERE form_code='D1100-01';
DELETE FROM form_grid_columns WHERE form_code='D1100-01';

-- ── D1100-02 연간 제품안전교육 계획서 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 제목(연도)·작성일·작성부서·연도 표기 + 월별 계획/실적 각 12칸(3열 병합 개별 매핑) + 특기사항. 범례(○◐●)·교육 대상 각주 기정의·결재 6단 서명 몫.' WHERE code='D1100-02';
DELETE FROM form_fields WHERE form_code='D1100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-02','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('D1100-02','작성일','작성일','text','기본 정보',NULL,2,'frame'),
 ('D1100-02','작성부서','작성부서','text','기본 정보',NULL,3,'frame'),
 ('D1100-02','연도','연도 표기','text','기본 정보',NULL,4,'frame'),
 ('D1100-02','계획1','계획 1월','text','계획',NULL,10,NULL),('D1100-02','계획2','계획 2월','text','계획',NULL,11,NULL),
 ('D1100-02','계획3','계획 3월','text','계획',NULL,12,NULL),('D1100-02','계획4','계획 4월','text','계획',NULL,13,NULL),
 ('D1100-02','계획5','계획 5월','text','계획',NULL,14,NULL),('D1100-02','계획6','계획 6월','text','계획',NULL,15,NULL),
 ('D1100-02','계획7','계획 7월','text','계획',NULL,16,NULL),('D1100-02','계획8','계획 8월','text','계획',NULL,17,NULL),
 ('D1100-02','계획9','계획 9월','text','계획',NULL,18,NULL),('D1100-02','계획10','계획 10월','text','계획',NULL,19,NULL),
 ('D1100-02','계획11','계획 11월','text','계획',NULL,20,NULL),('D1100-02','계획12','계획 12월','text','계획',NULL,21,NULL),
 ('D1100-02','실적1','실적 1월','text','실적',NULL,30,NULL),('D1100-02','실적2','실적 2월','text','실적',NULL,31,NULL),
 ('D1100-02','실적3','실적 3월','text','실적',NULL,32,NULL),('D1100-02','실적4','실적 4월','text','실적',NULL,33,NULL),
 ('D1100-02','실적5','실적 5월','text','실적',NULL,34,NULL),('D1100-02','실적6','실적 6월','text','실적',NULL,35,NULL),
 ('D1100-02','실적7','실적 7월','text','실적',NULL,36,NULL),('D1100-02','실적8','실적 8월','text','실적',NULL,37,NULL),
 ('D1100-02','실적9','실적 9월','text','실적',NULL,38,NULL),('D1100-02','실적10','실적 10월','text','실적',NULL,39,NULL),
 ('D1100-02','실적11','실적 11월','text','실적',NULL,40,NULL),('D1100-02','실적12','실적 12월','text','실적',NULL,41,NULL),
 ('D1100-02','특기사항','특기사항','textarea','특기',NULL,50,NULL);
DELETE FROM form_cell_map WHERE form_code='D1100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-02','제목','제목(연도 기입)','E1','text',1),
 ('D1100-02','작성일','작성일','I3','text',2),
 ('D1100-02','작성부서','작성부서','W3','text',3),
 ('D1100-02','연도','연도 표기','M5','text',4),
 ('D1100-02','계획1','계획 1월','M7','text',5),('D1100-02','계획2','계획 2월','P7','text',6),
 ('D1100-02','계획3','계획 3월','S7','text',7),('D1100-02','계획4','계획 4월','V7','text',8),
 ('D1100-02','계획5','계획 5월','Y7','text',9),('D1100-02','계획6','계획 6월','AB7','text',10),
 ('D1100-02','계획7','계획 7월','AE7','text',11),('D1100-02','계획8','계획 8월','AH7','text',12),
 ('D1100-02','계획9','계획 9월','AK7','text',13),('D1100-02','계획10','계획 10월','AN7','text',14),
 ('D1100-02','계획11','계획 11월','AQ7','text',15),('D1100-02','계획12','계획 12월','AT7','text',16),
 ('D1100-02','실적1','실적 1월','M8','text',17),('D1100-02','실적2','실적 2월','P8','text',18),
 ('D1100-02','실적3','실적 3월','S8','text',19),('D1100-02','실적4','실적 4월','V8','text',20),
 ('D1100-02','실적5','실적 5월','Y8','text',21),('D1100-02','실적6','실적 6월','AB8','text',22),
 ('D1100-02','실적7','실적 7월','AE8','text',23),('D1100-02','실적8','실적 8월','AH8','text',24),
 ('D1100-02','실적9','실적 9월','AK8','text',25),('D1100-02','실적10','실적 10월','AN8','text',26),
 ('D1100-02','실적11','실적 11월','AQ8','text',27),('D1100-02','실적12','실적 12월','AT8','text',28),
 ('D1100-02','특기사항','특기사항','E9','text',29);
DELETE FROM form_grid_spec WHERE form_code='D1100-02';
DELETE FROM form_grid_columns WHERE form_code='D1100-02';

-- ── D1100-04 공정 안전점검 연간 계획/실적 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 제목(사업부)·연도 + 5행 grid(계획·실적·지적 건수·개선 완료·유효성 점검 — 행 라벨 기정의 × 월 12 + 비고). 절차 안내(11행~) 기정의·결재 서명 몫.' WHERE code='D1100-04';
DELETE FROM form_fields WHERE form_code='D1100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-04','제목','제목(사업부 기입)','text','기본 정보',NULL,1,'frame'),
 ('D1100-04','연도','연도(헤더)','text','기본 정보',NULL,2,'frame'),
 ('D1100-04','rows','월별 기록(계획/실적/지적/개선/유효성 5행)','grid','연간 계획·실적',NULL,10,NULL);
DELETE FROM form_cell_map WHERE form_code='D1100-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-04','제목','제목(사업부 기입)','E1','text',1),
 ('D1100-04','연도','연도(헤더)','H4','text',2);
DELETE FROM form_grid_spec WHERE form_code='D1100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('D1100-04','rows',6,1,5);
DELETE FROM form_grid_columns WHERE form_code='D1100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('D1100-04','rows','월1','1월','H','text',1),
 ('D1100-04','rows','월2','2월','K','text',2),
 ('D1100-04','rows','월3','3월','N','text',3),
 ('D1100-04','rows','월4','4월','Q','text',4),
 ('D1100-04','rows','월5','5월','T','text',5),
 ('D1100-04','rows','월6','6월','W','text',6),
 ('D1100-04','rows','월7','7월','Z','text',7),
 ('D1100-04','rows','월8','8월','AC','text',8),
 ('D1100-04','rows','월9','9월','AF','text',9),
 ('D1100-04','rows','월10','10월','AI','text',10),
 ('D1100-04','rows','월11','11월','AL','text',11),
 ('D1100-04','rows','월12','12월','AO','text',12),
 ('D1100-04','rows','비고','비고','AR','text',13);

-- ── D1100-05 공정 안전점검 체크시트 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 제목(사업부)·점검일·점검자 + 점검 grid(5~34행 30행 — 구분·점검항목 기정의[가스/전기 시설물 등], 점검 결과·유효성점검만 기입) + 특기사항. 결재 서명 몫.' WHERE code='D1100-05';
DELETE FROM form_fields WHERE form_code='D1100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-05','제목','제목(사업부 기입)','text','기본 정보',NULL,1,'frame'),
 ('D1100-05','점검일','점검일','text','기본 정보',NULL,2,'frame'),
 ('D1100-05','점검자','점검자','text','기본 정보',NULL,3,'frame'),
 ('D1100-05','rows','점검 결과(30행 — 항목 기정의)','grid','점검',NULL,10,NULL),
 ('D1100-05','특기사항','특이사항','textarea','확인',NULL,20,NULL);
DELETE FROM form_cell_map WHERE form_code='D1100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-05','제목','제목(사업부 기입)','D1','text',1),
 ('D1100-05','점검일','점검일','G3','text',2),
 ('D1100-05','점검자','점검자','O3','text',3),
 ('D1100-05','특기사항','특이사항','B37','text',4);
DELETE FROM form_grid_spec WHERE form_code='D1100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('D1100-05','rows',5,1,30);
DELETE FROM form_grid_columns WHERE form_code='D1100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('D1100-05','rows','결과','점검 결과','Q','text',1),
 ('D1100-05','rows','유효성','유효성점검','Y','text',2);

-- ── D1100-06 공정 안전점검 개선대책 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 제목(사업부)·개선부서·개선담당(정/부) + 지적사항·개선방안 + 점검일자·개선완료일. 개선 전/후 사진(6~20행)은 시트 몫.' WHERE code='D1100-06';
DELETE FROM form_fields WHERE form_code='D1100-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('D1100-06','제목','제목(사업부 기입)','text','기본 정보',NULL,1,'frame'),
 ('D1100-06','개선부서','개선 부서','text','기본 정보',NULL,2,'frame'),
 ('D1100-06','담당정','개선 담당자(정)','text','기본 정보',NULL,3,'frame'),
 ('D1100-06','담당부','개선 담당자(부)','text','기본 정보',NULL,4,'frame'),
 ('D1100-06','지적사항','지적사항','textarea','개선',NULL,10,NULL),
 ('D1100-06','개선방안','개선방안','textarea','개선',NULL,11,NULL),
 ('D1100-06','점검일자','점검일자','date','개선',NULL,12,'fact'),
 ('D1100-06','개선완료일','개선완료일','date','개선',NULL,13,NULL);
DELETE FROM form_cell_map WHERE form_code='D1100-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('D1100-06','제목','제목(사업부 기입)','A1','text',1),
 ('D1100-06','개선부서','개선 부서','AN1','text',2),
 ('D1100-06','담당정','개선 담당자(정)','AO2','text',3),
 ('D1100-06','담당부','개선 담당자(부)','AO3','text',4),
 ('D1100-06','지적사항','지적사항','A24','text',5),
 ('D1100-06','개선방안','개선방안','X24','text',6),
 ('D1100-06','점검일자','점검일자','F23','date',7),
 ('D1100-06','개선완료일','개선완료일','AB23','date',8);
DELETE FROM form_grid_spec WHERE form_code='D1100-06';
DELETE FROM form_grid_columns WHERE form_code='D1100-06';

-- ── L2200-01 년 신뢰성 시험 계획서 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 제목(연도)·작성일자·작성자 + 시험 grid(8~25행 18행: 품번·품명·시험주기·시험구분[자체/외주]·검사항목·월별 계획 12·비고). 범례(외부 ○●/자체 □■) 기정의·결재 서명 몫.' WHERE code='L2200-01';
DELETE FROM form_fields WHERE form_code='L2200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2200-01','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L2200-01','작성일자','작성 일자','date','기본 정보',NULL,2,'fact'),
 ('L2200-01','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('L2200-01','rows','시험 계획(18행)','grid','시험 계획',NULL,10,NULL);
DELETE FROM form_cell_map WHERE form_code='L2200-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L2200-01','제목','제목(연도 기입)','C1','text',1),
 ('L2200-01','작성일자','작성 일자','C5','date',2),
 ('L2200-01','작성자','작성자','G5','text',3);
DELETE FROM form_grid_spec WHERE form_code='L2200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2200-01','rows',8,1,18);
DELETE FROM form_grid_columns WHERE form_code='L2200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2200-01','rows','품번','품번','B','text',1),
 ('L2200-01','rows','품명','품명','D','text',2),
 ('L2200-01','rows','시험주기','시험주기','E','text',3),
 ('L2200-01','rows','시험구분','시험구분(자체/외주)','F','text',4),
 ('L2200-01','rows','검사항목','검사항목','G','text',5),
 ('L2200-01','rows','월1','1월','H','text',6),
 ('L2200-01','rows','월2','2월','I','text',7),
 ('L2200-01','rows','월3','3월','J','text',8),
 ('L2200-01','rows','월4','4월','K','text',9),
 ('L2200-01','rows','월5','5월','L','text',10),
 ('L2200-01','rows','월6','6월','M','text',11),
 ('L2200-01','rows','월7','7월','N','text',12),
 ('L2200-01','rows','월8','8월','O','text',13),
 ('L2200-01','rows','월9','9월','P','text',14),
 ('L2200-01','rows','월10','10월','Q','text',15),
 ('L2200-01','rows','월11','11월','R','text',16),
 ('L2200-01','rows','월12','12월','S','text',17),
 ('L2200-01','rows','비고','비고','T','text',18);

-- ── L2300-01 한도견본 관리대장 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 견본 3행 블록 grid 5개(8:10~20:22) — 본체(관리번호·차종/모델·품명/품번·품질특성·교체주기·등록/1회 연장/2회 연장 일자) + 승인행(등록/연장 승인) + 폐기행(폐기일자·폐기사유). 결재 서명 몫.' WHERE code='L2300-01';
DELETE FROM form_fields WHERE form_code='L2300-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L2300-01','main','견본 목록(본체행)','grid','한도견본',NULL,1,NULL),
 ('L2300-01','appr','승인(둘째 행 — 같은 순서)','grid','한도견본',NULL,2,NULL),
 ('L2300-01','disp','폐기(셋째 행 — 같은 순서)','grid','한도견본',NULL,3,NULL);
DELETE FROM form_cell_map WHERE form_code='L2300-01';
DELETE FROM form_grid_spec WHERE form_code='L2300-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L2300-01','main',8,3,5),('L2300-01','appr',9,3,5),('L2300-01','disp',10,3,5);
DELETE FROM form_grid_columns WHERE form_code='L2300-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L2300-01','main','관리번호','관리번호','C','text',1),
 ('L2300-01','main','차종','차종 및 모델','H','text',2),
 ('L2300-01','main','품명','품명 및 품번','L','text',3),
 ('L2300-01','main','품질특성','품질특성','P','text',4),
 ('L2300-01','main','교체주기','교체주기','X','text',5),
 ('L2300-01','main','등록일자','등록 일자','AB','text',6),
 ('L2300-01','main','연장1일자','1회 연장 일자','AI','text',7),
 ('L2300-01','main','연장2일자','2회 연장 일자','AP','text',8),
 ('L2300-01','appr','등록승인','등록 승인','AB','text',1),
 ('L2300-01','appr','연장1승인','1회 연장 승인','AI','text',2),
 ('L2300-01','appr','연장2승인','2회 연장 승인','AP','text',3),
 ('L2300-01','disp','폐기일자','폐기일자','AB','text',1),
 ('L2300-01','disp','폐기사유','폐기사유','AI','text',2);

-- ── J3100-03 4M 변경 관리대장(신양식) ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 4M 변경 관리대장(신양식) grid(6~17행 12행 × 25열 — 변경 신고 내용 10·표준 문서류 개정 4·승인 처리 3조·적용 시점 2·초도검증 4·판정·비고). 결재 서명 몫.' WHERE code='J3100-03';
DELETE FROM form_fields WHERE form_code='J3100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('J3100-03','rows','4M 변경 기록(12행)','grid','변경 관리',NULL,1,NULL);
DELETE FROM form_cell_map WHERE form_code='J3100-03';
DELETE FROM form_grid_spec WHERE form_code='J3100-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('J3100-03','rows',6,1,12);
DELETE FROM form_grid_columns WHERE form_code='J3100-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('J3100-03','rows','요청자','요청자','B','text',1),
 ('J3100-03','rows','의뢰일자','의뢰 일자','C','date',2),
 ('J3100-03','rows','차종','차종','D','text',3),
 ('J3100-03','rows','품번','품번','E','text',4),
 ('J3100-03','rows','품명','품명','F','text',5),
 ('J3100-03','rows','개정일자','개정 일자','G','text',6),
 ('J3100-03','rows','변경유형','변경 유형','H','text',7),
 ('J3100-03','rows','변경내용','변경내용','I','text',8),
 ('J3100-03','rows','변경사유','변경 사유','J','text',9),
 ('J3100-03','rows','공정명','공정명','K','text',10),
 ('J3100-03','rows','작업표준서','작업표준서','L','text',11),
 ('J3100-03','rows','fmea','공정 FMEA','M','text',12),
 ('J3100-03','rows','관리계획서','관리계획서','N','text',13),
 ('J3100-03','rows','검사기준서','검사기준서','O','text',14),
 ('J3100-03','rows','신고처리일','신고 처리일자','P','text',15),
 ('J3100-03','rows','내부승인일','내부승인 일자','Q','text',16),
 ('J3100-03','rows','내부승인번호','내부승인 번호','R','text',17),
 ('J3100-03','rows','고객승인일','고객승인 일자','S','text',18),
 ('J3100-03','rows','고객승인번호','고객승인 번호','T','text',19),
 ('J3100-03','rows','공정적용','협력사 공정 적용','U','text',20),
 ('J3100-03','rows','공정작업','협력사 공정 작업','V','text',21),
 ('J3100-03','rows','초도납품','초도 납품','W','text',22),
 ('J3100-03','rows','검증1개월','1개월','X','text',23),
 ('J3100-03','rows','검증2개월','2개월','Y','text',24),
 ('J3100-03','rows','검증3개월','3개월','Z','text',25),
 ('J3100-03','rows','판정','판정','AA','text',26),
 ('J3100-03','rows','비고','비고','AB','text',27);

-- ── F1100-02 교육 이수 보고서 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 작성일자 + 이수 헤더 9(과정명·소속/직위·성명·교육장소·교육기관·교육비·교육기간·이수시간·교육구분) + 교육명·교육 목적 + 교육결과 체크 2(적용성·도입 여부 — 해당 칸 ■ 표기) + 전달교육(실시일자·대상). 보고서 확인란 서명 몫.' WHERE code='F1100-02';
DELETE FROM form_fields WHERE form_code='F1100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1100-02','작성일자','작성일자(표기)','text','기본 정보',NULL,1,'frame'),
 ('F1100-02','과정명','과정명','text','이수 정보',NULL,10,'frame'),
 ('F1100-02','소속직위','소속/직위','text','이수 정보',NULL,11,'frame'),
 ('F1100-02','성명','성명','text','이수 정보',NULL,12,'frame'),
 ('F1100-02','교육장소','교육장소','text','이수 정보',NULL,13,'frame'),
 ('F1100-02','교육기관','교육기관','text','이수 정보',NULL,14,'frame'),
 ('F1100-02','교육비','교육비','text','이수 정보',NULL,15,'frame'),
 ('F1100-02','교육기간','교육기간','text','이수 정보',NULL,16,'frame'),
 ('F1100-02','이수시간','이수시간','text','이수 정보',NULL,17,'frame'),
 ('F1100-02','교육구분','교육구분(합숙/비합숙)','text','이수 정보',NULL,18,'frame'),
 ('F1100-02','교육명','교육명','text','교육 내용',NULL,20,NULL),
 ('F1100-02','교육목적','교육 목적','textarea','교육 내용',NULL,21,NULL),
 ('F1100-02','적용성','교육결과 — 업무 적용성(■ 표기)','text','교육 결과',NULL,30,NULL),
 ('F1100-02','도입여부','교육결과 — 사내교육 도입(■ 표기)','text','교육 결과',NULL,31,NULL),
 ('F1100-02','전달일자','전달교육 실시일자','text','전달교육',NULL,40,NULL),
 ('F1100-02','전달대상','전달교육 대상','text','전달교육',NULL,41,'frame');
DELETE FROM form_cell_map WHERE form_code='F1100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F1100-02','작성일자','작성일자(표기)','A3','text',1),
 ('F1100-02','과정명','과정명','E4','text',2),
 ('F1100-02','소속직위','소속/직위','P4','text',3),
 ('F1100-02','성명','성명','AA4','text',4),
 ('F1100-02','교육장소','교육장소','E5','text',5),
 ('F1100-02','교육기관','교육기관','P5','text',6),
 ('F1100-02','교육비','교육비','AA5','text',7),
 ('F1100-02','교육기간','교육기간','E6','text',8),
 ('F1100-02','이수시간','이수시간','P6','text',9),
 ('F1100-02','교육구분','교육구분(합숙/비합숙)','AA6','text',10),
 ('F1100-02','교육명','교육명','A8','text',11),
 ('F1100-02','교육목적','교육 목적','A10','text',12),
 ('F1100-02','적용성','교육결과 — 업무 적용성(■ 표기)','D30','text',13),
 ('F1100-02','도입여부','교육결과 — 사내교육 도입(■ 표기)','P30','text',14),
 ('F1100-02','전달일자','전달교육 실시일자','I32','text',15),
 ('F1100-02','전달대상','전달교육 대상','I33','text',16);
DELETE FROM form_grid_spec WHERE form_code='F1100-02';
DELETE FROM form_grid_columns WHERE form_code='F1100-02';

-- ── F1100-05 사내교육 관리대장 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 교육 grid(8~24행 17행: 교육일자·교육명·관리자·작업자). 순번 자동 수식(A열) 보존·결재 서명 몫.' WHERE code='F1100-05';
DELETE FROM form_fields WHERE form_code='F1100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1100-05','rows','교육 기록(17행)','grid','관리대장',NULL,1,NULL);
DELETE FROM form_cell_map WHERE form_code='F1100-05';
DELETE FROM form_grid_spec WHERE form_code='F1100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('F1100-05','rows',8,1,17);
DELETE FROM form_grid_columns WHERE form_code='F1100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F1100-05','rows','교육일자','교육 일자','B','date',1),
 ('F1100-05','rows','교육명','교육명','E','text',2),
 ('F1100-05','rows','관리자','관리자(성명·직급·업무)','N','text',3),
 ('F1100-05','rows','작업자','작업자','Z','text',4);

-- ── F1100-06 사내 교육 보고서 ──
UPDATE forms SET description='재설계 — 레거시 2차(0124, 260731): 작성일자·작성자(표기) + 교육 헤더 7(교육명·구분[■사내/□사외 표기]·교육강사·교육일자·교육장소·교육대상·교육인원) + 교육내용. 교육 사진(워터마크 필수)·교육 자료 첨부 영역은 시트 몫.' WHERE code='F1100-06';
DELETE FROM form_fields WHERE form_code='F1100-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1100-06','작성일자','작성일자(표기)','text','기본 정보',NULL,1,'frame'),
 ('F1100-06','작성자','작성자(표기)','text','기본 정보',NULL,2,'frame'),
 ('F1100-06','교육명','교육명','text','교육 정보',NULL,10,'frame'),
 ('F1100-06','구분','구분(■사내/□사외 표기)','text','교육 정보',NULL,11,'frame'),
 ('F1100-06','교육강사','교육 강사','text','교육 정보',NULL,12,'frame'),
 ('F1100-06','교육일자','교육 일자','text','교육 정보',NULL,13,'frame'),
 ('F1100-06','교육장소','교육 장소','text','교육 정보',NULL,14,'frame'),
 ('F1100-06','교육대상','교육 대상','text','교육 정보',NULL,15,'frame'),
 ('F1100-06','교육인원','교육 인원','text','교육 정보',NULL,16,'frame'),
 ('F1100-06','교육내용','교육 내용','textarea','교육 내용',NULL,20,NULL);
DELETE FROM form_cell_map WHERE form_code='F1100-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F1100-06','작성일자','작성일자(표기)','A3','text',1),
 ('F1100-06','작성자','작성자(표기)','O3','text',2),
 ('F1100-06','교육명','교육명','F4','text',3),
 ('F1100-06','구분','구분(■사내/□사외 표기)','X4','text',4),
 ('F1100-06','교육강사','교육 강사','X5','text',5),
 ('F1100-06','교육일자','교육 일자','F6','text',6),
 ('F1100-06','교육장소','교육 장소','X6','text',7),
 ('F1100-06','교육대상','교육 대상','F7','text',8),
 ('F1100-06','교육인원','교육 인원','X7','text',9),
 ('F1100-06','교육내용','교육 내용','A9','text',10);
DELETE FROM form_grid_spec WHERE form_code='F1100-06';
DELETE FROM form_grid_columns WHERE form_code='F1100-06';

DELETE FROM form_change_log WHERE migration='0124';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('K1200-01','2026-07-31','cellmap_redesign','0019 잔재 4필드','업체 2행 블록 grid 10개(main/sub)','인증 4열 = 유효기간 기록 칸','0124'),
 ('K1200-02','2026-07-31','cellmap_redesign','0019 잔재 12필드','작성 2 + 자재 grid(18행×16열)','','0124'),
 ('K1200-04','2026-07-31','cellmap_redesign','0019 잔재 32필드·55셀맵','갑지 — 회사 정보 12+거래처 grid+규모 6+특색 3+결과 2','을지(첨부 자료) 시트 몫','0124'),
 ('J1103-01','2026-07-31','cellmap_redesign','0019 잔재 40필드·91셀맵','필라넥 변형 — 헤더 6+조건/자주검사 grid+서술 4+금형/개정 grid','AM 변형 무 실측(변형 4시트) — 필라넥 채택 유지·빈 틀 확인','0124'),
 ('D1100-01','2026-07-31','cellmap_redesign','0019 잔재 14필드','사고 헤더 8 + 경위/원인/조치 textarea 3','','0124'),
 ('D1100-02','2026-07-31','cellmap_redesign','0019 잔재 3필드','헤더 4 + 계획/실적 각 12칸 + 특기사항','','0124'),
 ('D1100-04','2026-07-31','cellmap_redesign','0019 잔재 5필드','제목·연도 + 5행 grid(월 12+비고)','행 라벨(계획~유효성) 기정의','0124'),
 ('D1100-05','2026-07-31','cellmap_redesign','0019 잔재 17필드','헤더 3 + 점검 grid(30행 — 결과·유효성만)','점검항목 기정의','0124'),
 ('D1100-06','2026-07-31','cellmap_redesign','0019 잔재 3필드','헤더 4 + 지적/방안 + 일자 2','개선 전/후 사진 시트 몫','0124'),
 ('L2200-01','2026-07-31','cellmap_redesign','0019 잔재 5필드','헤더 3 + 시험 grid(18행×18열)','','0124'),
 ('L2300-01','2026-07-31','cellmap_redesign','0019 잔재 10필드·54셀맵','견본 3행 블록 grid 5개(main/appr/disp)','등록·연장 2회·폐기 3행 구조','0124'),
 ('J3100-03','2026-07-31','cellmap_redesign','0019 잔재 1필드·19셀맵','신양식 grid(12행×27열)','','0124'),
 ('F1100-02','2026-07-31','cellmap_redesign','0019 잔재 15필드','이수 헤더 10 + 교육명/목적 + 결과 체크 2 + 전달교육 2','','0124'),
 ('F1100-05','2026-07-31','cellmap_redesign','0019 잔재 6필드','교육 grid(17행×4열)','순번 자동 수식 보존','0124'),
 ('F1100-06','2026-07-31','cellmap_redesign','0019 잔재 11필드','작성 2 + 교육 헤더 7 + 교육내용','사진(워터마크)·자료 첨부 시트 몫','0124');
