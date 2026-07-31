-- ============================================================
-- Migration 0121: 7차 1차 배치 2일차 — 점수순 15종 (로스터 완주, 2026-07-31)
--
-- 근거: 수식충돌_스캔보고 §3 상위 20 잔여 15종(검수회신 track7_b1d1 §5-2 승인).
-- 제출 실측: L1100-07 1건 = values_json 빈 객체({}) — 실질 데이터 0, 키 호환 제약 없음
-- (검수요청 정직 기록). 나머지 14종 제출 0 — 전량 무손실.
--
-- 분류: ★L1100-15 = 경보강(판정 1-⑵ 코워크 지목 — 실측 확정: 기존 grid 8열은 실구조
-- 정확 일치, 결함은 stride뿐[데이터 = 2행 병합 블록인데 stride 1 → 비앵커 70건 신호의
-- 정체]. 파괴 없이 스펙 정정 + 영선/명일 섹션 보강 + 날짜 매핑 추가). 나머지 14종 = 재설계.
--
-- 실측 요지(2026-07-31 사무실, 전 양식 병합 실측):
--   L1100-15 업무일지: 3섹션 전부 2행 병합 블록 — 영선(7:8~13:14 4블록)·명일(18:19~24:25
--     4블록)·보전(29:30~47:48 10블록, 49행 단독 여유). 50행 = 연속 페이지 2 헤더(51~95
--     연장 = 시트 몫). 결재 5단 서명 몫.
--   L1100-07 일상 점검표: 점검항목 4블록(6:7~12:13) — 항목 B·판단기준 G(행별 병합 홀수행
--     앵커)·점검방법 '육안' 기정의. 일별 결과 31열(N~AR)은 현장 수기 = 시트 몫(표본실측
--     진단 그대로 — 종전 잔재가 '육안'을 일별 결과로 오인).
--   L1100-12 월간 점검 계획서: 항목 5행 병합 4블록(5:9~20:24). 참고사진 C열 = 이미지
--     시트 몫. 블록 대표 1행 매핑(방법·기준·조치 상세 다행 기재는 시트 보완).
--   L1200-02 치공구 이력카드: 카드 헤더 7 + 사용장비 3행(6~8) + 파손·변경 이력 16행
--     (12~27, NO 병합 실측 연속).
--   L1200-03 지그 관리대장: 2단 헤더 × 2행 블록 9개(6:7~22:23) — 상단행(자산관리번호·
--     차종·ASSY·EO/NO·종류·공정명·규격·사용기계·대여일·비고) + 하단행(단품·부품명·재질·
--     보유장소·중량·제작처).
--   L1200-05 검사성적서: 헤더 9 + 검사 grid(22~32 11행). 개략도(도면 대체 가능 문구
--     기정의)·결재 서명 몫.
--   L1200-06 CF 점검기준서: 점검 4행 + 개정란 4행 + 비고·제정일자. C/F 사진 = 시트 몫.
--   L1200-11 보관 위치 식별표: 슬롯 6(3열×2단) × 위치번호/관리번호/품명 = 18칸.
--     관리기준 본문 기정의.
--   L1100-02 설비제작 진행 체크리스트: 헤더 8칸 — 본문 = "제작진행 리스트 첨부할것"
--     안내 병합(첨부 동선).
--   L1100-03 입회검수 체크시트: 지적/대책 grid(5~30 26행). 결재 서명 몫.
--   L1100-04 TRY-OUT 결과 보고서: 헤더 6(작성자 auto P4) + 문제점/조치 grid(6~17 12행).
--   L1100-06 설비고장 조치 보고서: 헤더 8 + 현상 3(무엇이 G8·어떻게 G11·결과는 G14) +
--     조치내용 C17 + 원인 C23 + 재발방지 3조(설비면 G28·관리면 G31·수평전개 G34 ×
--     누가 Z·언제 AC·완료유무 AE).
--   L1100-08 설비 리스트 / L1100-10 관리대장(갑지): 동형 대장 — 제목(사업부)·작성 부서 +
--     설비 grid(4~22 19행 9열, 열 좌표만 상이). L1100-10 을지(개별 카드)는 시트 몫.
--   L1100-11 년간 예방보전 계획서: 설비 3행 병합 10블록(6:8~33:35) — 계획(O)행/실시(A)행
--     stride 3 grid 2종 + 제목·범례/작성일자.
--
-- 멱등: DELETE+INSERT.
-- ============================================================

-- ── L1100-15 업무일지 (★경보강 — 기존 rows grid 스펙 정정 + 섹션 보강) ──
UPDATE forms SET
  description='경보강 — 7차 트랙(0121, 260731): 업무일지. 기존 보전활동 grid 8열은 실구조 정확 일치(판정 1-⑵ 파괴 금지 준수) — 결함은 stride뿐(데이터 = 2행 병합 블록, stride 1→2·max 21→10 정정 = 병합 비앵커 70건 신호 해소). 보강 = 영선활동·명일 예정업무 grid(각 4블록) + 일자 매핑. 연속 페이지(50행~)·결재 5단은 시트 몫.'
WHERE code='L1100-15';

DELETE FROM form_fields WHERE form_code='L1100-15';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-15','일자','일자(년 월 일 요일)','text','기본 정보',NULL,1,'frame'),
 ('L1100-15','yeongseon','영선활동(4블록)','grid','1. 영선활동',NULL,10,NULL),
 ('L1100-15','myeongil','명일 예정업무(4블록)','grid','2. 명일 예정업무',NULL,20,NULL),
 ('L1100-15','rows','설비 보전활동(10블록)','grid','3. 설비 보전활동',NULL,30,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-15';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-15','일자','일자(년 월 일 요일)','A3','text',1);

DELETE FROM form_grid_spec WHERE form_code='L1100-15';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-15','yeongseon',7,2,4),
 ('L1100-15','myeongil',18,2,4),
 ('L1100-15','rows',29,2,10);

DELETE FROM form_grid_columns WHERE form_code='L1100-15';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-15','yeongseon','발생처','발생처','A','text',1),
 ('L1100-15','yeongseon','활동내용','활동 내용','B','text',2),
 ('L1100-15','yeongseon','비고','비고','M','text',3),
 ('L1100-15','myeongil','발생처','발생처','A','text',1),
 ('L1100-15','myeongil','활동내용','활동 내용','B','text',2),
 ('L1100-15','myeongil','비고','비고','M','text',3),
 ('L1100-15','rows','발생처','발생처','A','text',1),
 ('L1100-15','rows','설비명','설비명','B','text',2),
 ('L1100-15','rows','설비번호','설비번호','C','text',3),
 ('L1100-15','rows','활동내용','활동 내용','D','text',4),
 ('L1100-15','rows','소요시간','소요시간','I','text',5),
 ('L1100-15','rows','소요자재','소요자재','J','text',6),
 ('L1100-15','rows','구분','구분(PM/BM/ET)','L','text',7),
 ('L1100-15','rows','비고','비고','M','text',8);

-- ── L1100-07 설비 일상 점검표 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 헤더(설비명·설비번호·년월) + 점검항목 grid(2행 병합 4블록: 점검항목·판단기준). 점검방법(육안 기정의)·일별 결과 31열(N~AR)은 현장 수기 = 시트 몫·범례/점검시간/확인란 서명 몫. 종전 잔재는 육안 프리셋을 일별 결과 칸으로 오인(표본실측 진단). 제출 #14 = 빈 값({}) 실측 — 키 호환 제약 없음.'
WHERE code='L1100-07';

DELETE FROM form_fields WHERE form_code='L1100-07';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-07','설비명','설비명','text','설비 식별',NULL,1,'frame'),
 ('L1100-07','설비번호','설비번호','text','설비 식별',NULL,2,'frame'),
 ('L1100-07','년월','점검 년월','text','설비 식별',NULL,3,'frame'),
 ('L1100-07','items','점검항목(4블록)','grid','점검항목',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-07';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-07','설비명','설비명','E1','text',1),
 ('L1100-07','설비번호','설비번호','E2','text',2),
 ('L1100-07','년월','점검 년월','AG1','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-07';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-07','items',6,2,4);

DELETE FROM form_grid_columns WHERE form_code='L1100-07';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-07','items','점검항목','점검항목','B','text',1),
 ('L1100-07','items','판단기준','판단기준','G','text',2);

-- ── L1100-12 월간설비 정기 점검 계획서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 제목(월 기입)·작성 부서 + 점검항목 grid(5행 병합 4블록: 점검항목·점검방법·판단기준·이상발생 및 조치사항·비고 — 블록 대표 1행 매핑, 상세 다행 기재는 시트 보완). 참고사진(C열 이미지)·결재 4단은 시트 몫.'
WHERE code='L1100-12';

DELETE FROM form_fields WHERE form_code='L1100-12';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-12','제목','제목(월 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-12','작성부서','작성자(부서)','text','기본 정보',NULL,2,'frame'),
 ('L1100-12','items','점검항목(4블록)','grid','점검항목',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-12';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-12','제목','제목(월 기입)','A1','text',1),
 ('L1100-12','작성부서','작성자(부서)','A3','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1100-12';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-12','items',5,5,4);

DELETE FROM form_grid_columns WHERE form_code='L1100-12';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-12','items','점검항목','점검항목','B','text',1),
 ('L1100-12','items','점검방법','점검방법','D','text',2),
 ('L1100-12','items','판단기준','판단기준','E','text',3),
 ('L1100-12','items','조치사항','이상발생 및 조치사항','F','text',4),
 ('L1100-12','items','비고','비고','L','text',5);

-- ── L1200-02 치공구 이력카드 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 금형·치공구 카드 헤더 7(MODEL·공정명·사용장비·규격·재질·제작처·금형구분) + 사용장비 목록 grid(6~8행: 생산업체·이관일·비고) + 파손·변경 이력 grid(12~27행 16행: 날짜·이력·수량). 금형 약도는 시트 몫.'
WHERE code='L1200-02';

DELETE FROM form_fields WHERE form_code='L1200-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-02','model','MODEL','text','카드 정보',NULL,1,'frame'),
 ('L1200-02','공정명','공정명','text','카드 정보',NULL,2,'frame'),
 ('L1200-02','사용장비','사용장비','text','카드 정보',NULL,3,'frame'),
 ('L1200-02','규격','규격','text','카드 정보',NULL,4,'frame'),
 ('L1200-02','재질','재질','text','카드 정보',NULL,5,'frame'),
 ('L1200-02','제작처','제작처','text','카드 정보',NULL,6,'frame'),
 ('L1200-02','금형구분','금형구분(주물/STEEL)','text','카드 정보',NULL,7,'frame'),
 ('L1200-02','jangbi','사용장비 목록(3행)','grid','사용장비 목록',NULL,10,NULL),
 ('L1200-02','history','파손 및 변경 이력(16행)','grid','파손·변경 이력',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-02','model','MODEL','G4','text',1),
 ('L1200-02','공정명','공정명','Y4','text',2),
 ('L1200-02','사용장비','사용장비','AM4','text',3),
 ('L1200-02','규격','규격','Y5','text',4),
 ('L1200-02','재질','재질','G7','text',5),
 ('L1200-02','제작처','제작처','Y7','text',6),
 ('L1200-02','금형구분','금형구분(주물/STEEL)','G8','text',7);

DELETE FROM form_grid_spec WHERE form_code='L1200-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-02','jangbi',6,1,3),
 ('L1200-02','history',12,1,16);

DELETE FROM form_grid_columns WHERE form_code='L1200-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-02','jangbi','생산업체','생산업체','AI','text',1),
 ('L1200-02','jangbi','이관일','이관일','AP','text',2),
 ('L1200-02','jangbi','비고','비고','AU','text',3),
 ('L1200-02','history','날짜','날짜','AI','date',1),
 ('L1200-02','history','이력','이력(파손/교환)','AP','text',2),
 ('L1200-02','history','수량','수량','AY','text',3);

-- ── L1200-03 지그 관리대장 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 작성일·작성 부서·작성자 + 지그 2행 블록 grid 9개 — 상단행(자산관리번호·차종·ASSY 부품번호·EO/NO·치형구 종류·공정명·규격·사용기계·대여/공증일·비고) + 하단행(단품 부품번호·부품명·재질·현 보유장소·중량·제작처). 순번은 시트 기정의.'
WHERE code='L1200-03';

DELETE FROM form_fields WHERE form_code='L1200-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-03','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('L1200-03','작성부서','작성 부서','text','기본 정보',NULL,2,'frame'),
 ('L1200-03','작성자','작성자','auto','기본 정보',NULL,3,'frame'),
 ('L1200-03','main','지그 목록(상단행)','grid','지그 목록',NULL,10,NULL),
 ('L1200-03','sub','지그 상세(하단행 — 같은 순서)','grid','지그 상세',NULL,11,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-03','작성일','작성일','K1','date',1),
 ('L1200-03','작성부서','작성 부서','K2','text',2),
 ('L1200-03','작성자','작성자','K3','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1200-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-03','main',6,2,9),
 ('L1200-03','sub',7,2,9);

DELETE FROM form_grid_columns WHERE form_code='L1200-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-03','main','자산관리번호','자산관리번호','B','text',1),
 ('L1200-03','main','차종','차종','C','text',2),
 ('L1200-03','main','assy','ASSY 부품번호','D','text',3),
 ('L1200-03','main','eono','EO/NO','E','text',4),
 ('L1200-03','main','종류','치형구 종류','F','text',5),
 ('L1200-03','main','공정명','공정명','G','text',6),
 ('L1200-03','main','규격','규격','H','text',7),
 ('L1200-03','main','사용기계','사용기계','I','text',8),
 ('L1200-03','main','대여일','대여/공증일','J','text',9),
 ('L1200-03','main','비고','비고','K','text',10),
 ('L1200-03','sub','단품','단품 부품번호','D','text',1),
 ('L1200-03','sub','부품명','부품명','E','text',2),
 ('L1200-03','sub','재질','재질','F','text',3),
 ('L1200-03','sub','보유장소','현 보유장소','G','text',4),
 ('L1200-03','sub','중량','중량','H','text',5),
 ('L1200-03','sub','제작처','제작처','I','text',6);

-- ── L1200-05 지그 및 치공구 검사 성적서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 헤더 9(품명·적용공정명·규격·제작처·측정의뢰일·측정의뢰자·관리번호·측정일·측정자) + 검사 grid(22~32행 11행: 검사항목·검사기준·측정치·판정) + 비고. 개략도(도면 대체 문구 기정의)·결재 4단은 시트 몫.'
WHERE code='L1200-05';

DELETE FROM form_fields WHERE form_code='L1200-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-05','품명','품명','text','기본 정보',NULL,1,'frame'),
 ('L1200-05','적용공정명','적용공정명','text','기본 정보',NULL,2,'frame'),
 ('L1200-05','규격','규격','text','기본 정보',NULL,3,'frame'),
 ('L1200-05','제작처','제작처','text','기본 정보',NULL,4,'frame'),
 ('L1200-05','측정의뢰일','측정의뢰일','date','측정 정보',NULL,10,NULL),
 ('L1200-05','측정의뢰자','측정의뢰자','text','측정 정보',NULL,11,'frame'),
 ('L1200-05','관리번호','관리번호','text','측정 정보',NULL,12,'frame'),
 ('L1200-05','측정일','측정일','date','측정 정보',NULL,13,'fact'),
 ('L1200-05','측정자','측정자','text','측정 정보',NULL,14,'frame'),
 ('L1200-05','insp','검사 기록(11행)','grid','검사',NULL,20,NULL),
 ('L1200-05','비고','비고','textarea','확인',NULL,30,'frame');

DELETE FROM form_cell_map WHERE form_code='L1200-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-05','품명','품명','E4','text',1),
 ('L1200-05','적용공정명','적용공정명','P4','text',2),
 ('L1200-05','규격','규격','AA4','text',3),
 ('L1200-05','제작처','제작처','E5','text',4),
 ('L1200-05','측정의뢰일','측정의뢰일','P5','date',5),
 ('L1200-05','측정의뢰자','측정의뢰자','AA5','text',6),
 ('L1200-05','관리번호','관리번호','E6','text',7),
 ('L1200-05','측정일','측정일','P6','date',8),
 ('L1200-05','측정자','측정자','AA6','text',9),
 ('L1200-05','비고','비고','C33','text',10);

DELETE FROM form_grid_spec WHERE form_code='L1200-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-05','insp',22,1,11);

DELETE FROM form_grid_columns WHERE form_code='L1200-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-05','insp','검사항목','검사항목','C','text',1),
 ('L1200-05','insp','검사기준','검사기준','M','text',2),
 ('L1200-05','insp','측정치','측정치','W','text',3),
 ('L1200-05','insp','판정','판정','AC','text',4);

-- ── L1200-06 CF 점검기준서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 점검 grid(5~8행 4행: 항목·규격·확인방법·주기) + 비고·제정일자 + 개정란 grid(11~14행: 개정일자·개정사유·작성·검토·승인). C/F 사진(점검 POINT 표기)·결재는 시트 몫.'
WHERE code='L1200-06';

DELETE FROM form_fields WHERE form_code='L1200-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-06','items','점검 항목(4행)','grid','점검 기준',NULL,1,NULL),
 ('L1200-06','비고','비고','text','문서 정보',NULL,10,'frame'),
 ('L1200-06','제정일자','제정 일자','text','문서 정보',NULL,11,'frame'),
 ('L1200-06','revs','개정란(4행)','grid','개정 이력',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='L1200-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-06','비고','비고','D10','text',1),
 ('L1200-06','제정일자','제정 일자','O10','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1200-06';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1200-06','items',5,1,4),
 ('L1200-06','revs',11,1,4);

DELETE FROM form_grid_columns WHERE form_code='L1200-06';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1200-06','items','항목','항목','B','text',1),
 ('L1200-06','items','규격','규격','C','text',2),
 ('L1200-06','items','확인방법','확인방법','D','text',3),
 ('L1200-06','items','주기','주기','G','text',4),
 ('L1200-06','revs','개정일자','개정 일자','G','text',1),
 ('L1200-06','revs','개정사유','개정 사유','H','text',2),
 ('L1200-06','revs','작성','작성','I','text',3),
 ('L1200-06','revs','검토','검토','J','text',4),
 ('L1200-06','revs','승인','승인','K','text',5);

-- ── L1200-11 지그 및 금형 보관 위치 식별표 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 제목(구역 기입) + 보관 슬롯 6개(3열×2단) × 위치번호/관리번호/품명 = 18칸. 관리기준 본문(4개조)·지그 보관대 표기·결재는 시트 몫.'
WHERE code='L1200-11';

DELETE FROM form_fields WHERE form_code='L1200-11';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1200-11','제목','제목(구역 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1200-11','위치1','슬롯1 위치번호','text','슬롯 1',NULL,10,'frame'),
 ('L1200-11','관리1','슬롯1 관리번호','text','슬롯 1',NULL,11,'frame'),
 ('L1200-11','품명1','슬롯1 품명','text','슬롯 1',NULL,12,'frame'),
 ('L1200-11','위치2','슬롯2 위치번호','text','슬롯 2',NULL,13,'frame'),
 ('L1200-11','관리2','슬롯2 관리번호','text','슬롯 2',NULL,14,'frame'),
 ('L1200-11','품명2','슬롯2 품명','text','슬롯 2',NULL,15,'frame'),
 ('L1200-11','위치3','슬롯3 위치번호','text','슬롯 3',NULL,16,'frame'),
 ('L1200-11','관리3','슬롯3 관리번호','text','슬롯 3',NULL,17,'frame'),
 ('L1200-11','품명3','슬롯3 품명','text','슬롯 3',NULL,18,'frame'),
 ('L1200-11','위치4','슬롯4 위치번호','text','슬롯 4',NULL,19,'frame'),
 ('L1200-11','관리4','슬롯4 관리번호','text','슬롯 4',NULL,20,'frame'),
 ('L1200-11','품명4','슬롯4 품명','text','슬롯 4',NULL,21,'frame'),
 ('L1200-11','위치5','슬롯5 위치번호','text','슬롯 5',NULL,22,'frame'),
 ('L1200-11','관리5','슬롯5 관리번호','text','슬롯 5',NULL,23,'frame'),
 ('L1200-11','품명5','슬롯5 품명','text','슬롯 5',NULL,24,'frame'),
 ('L1200-11','위치6','슬롯6 위치번호','text','슬롯 6',NULL,25,'frame'),
 ('L1200-11','관리6','슬롯6 관리번호','text','슬롯 6',NULL,26,'frame'),
 ('L1200-11','품명6','슬롯6 품명','text','슬롯 6',NULL,27,'frame');

DELETE FROM form_cell_map WHERE form_code='L1200-11';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1200-11','제목','제목(구역 기입)','D1','text',1),
 ('L1200-11','위치1','슬롯1 위치번호','H11','text',2),
 ('L1200-11','관리1','슬롯1 관리번호','K13','text',3),
 ('L1200-11','품명1','슬롯1 품명','K16','text',4),
 ('L1200-11','위치2','슬롯2 위치번호','W11','text',5),
 ('L1200-11','관리2','슬롯2 관리번호','Z13','text',6),
 ('L1200-11','품명2','슬롯2 품명','Z16','text',7),
 ('L1200-11','위치3','슬롯3 위치번호','AL11','text',8),
 ('L1200-11','관리3','슬롯3 관리번호','AO13','text',9),
 ('L1200-11','품명3','슬롯3 품명','AO16','text',10),
 ('L1200-11','위치4','슬롯4 위치번호','H19','text',11),
 ('L1200-11','관리4','슬롯4 관리번호','K21','text',12),
 ('L1200-11','품명4','슬롯4 품명','K24','text',13),
 ('L1200-11','위치5','슬롯5 위치번호','W19','text',14),
 ('L1200-11','관리5','슬롯5 관리번호','Z21','text',15),
 ('L1200-11','품명5','슬롯5 품명','Z24','text',16),
 ('L1200-11','위치6','슬롯6 위치번호','AL19','text',17),
 ('L1200-11','관리6','슬롯6 관리번호','AO21','text',18),
 ('L1200-11','품명6','슬롯6 품명','AO24','text',19);

DELETE FROM form_grid_spec WHERE form_code='L1200-11';
DELETE FROM form_grid_columns WHERE form_code='L1200-11';

-- ── L1100-02 설비제작 진행 체크리스트 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 계약 헤더 8(계약명·제작기간·제조사·대표자·연락처·발주처·담당자·주소). 본문 = "장비제작업체 제작진행 리스트 첨부할것" 기정의 — 진행 리스트는 첨부 동선(시트 몫).'
WHERE code='L1100-02';

DELETE FROM form_fields WHERE form_code='L1100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-02','계약명','계약명','text','계약 정보',NULL,1,'frame'),
 ('L1100-02','제작기간','제작기간','text','계약 정보',NULL,2,'frame'),
 ('L1100-02','제조사','제조사','text','계약 정보',NULL,3,'frame'),
 ('L1100-02','대표자','대표자','text','계약 정보',NULL,4,'frame'),
 ('L1100-02','연락처','연락처','text','계약 정보',NULL,5,'frame'),
 ('L1100-02','발주처','발주처','text','계약 정보',NULL,6,'frame'),
 ('L1100-02','담당자','담당자','text','계약 정보',NULL,7,'frame'),
 ('L1100-02','주소','주소','text','계약 정보',NULL,8,'frame');

DELETE FROM form_cell_map WHERE form_code='L1100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-02','계약명','계약명','D3','text',1),
 ('L1100-02','제작기간','제작기간','T3','text',2),
 ('L1100-02','제조사','제조사','D4','text',3),
 ('L1100-02','대표자','대표자','J4','text',4),
 ('L1100-02','연락처','연락처','T4','text',5),
 ('L1100-02','발주처','발주처','D5','text',6),
 ('L1100-02','담당자','담당자','J5','text',7),
 ('L1100-02','주소','주소','T5','text',8);

DELETE FROM form_grid_spec WHERE form_code='L1100-02';
DELETE FROM form_grid_columns WHERE form_code='L1100-02';

-- ── L1100-03 입회검수 체크시트 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 지적사항 grid(5~30행 26행: 지적사항·대책·개선완료일·비고). NO는 수기·결재 4단 서명 몫.'
WHERE code='L1100-03';

DELETE FROM form_fields WHERE form_code='L1100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-03','rows','지적사항/대책(26행)','grid','입회검수',NULL,1,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-03';

DELETE FROM form_grid_spec WHERE form_code='L1100-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-03','rows',5,1,26);

DELETE FROM form_grid_columns WHERE form_code='L1100-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-03','rows','지적사항','지적사항','C','text',1),
 ('L1100-03','rows','대책','대책','N','text',2),
 ('L1100-03','rows','개선완료일','개선완료일','Z','date',3),
 ('L1100-03','rows','비고','비고','AD','text',4);

-- ── L1100-04 설비 TRY-OUT 결과 보고서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 헤더 6(장비명·제작처·설치장소·일시·작성자[자동]·작업자) + 문제점/조치 grid(6~17행 12행: 문제점 및 현상·조치내용·일정·비고/결과).'
WHERE code='L1100-04';

DELETE FROM form_fields WHERE form_code='L1100-04';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-04','장비명','장비명','text','기본 정보',NULL,1,'frame'),
 ('L1100-04','제작처','제작처','text','기본 정보',NULL,2,'frame'),
 ('L1100-04','설치장소','설치장소','text','기본 정보',NULL,3,'frame'),
 ('L1100-04','일시','일시','date','기본 정보',NULL,4,'fact'),
 ('L1100-04','작성자','작성자','auto','기본 정보',NULL,5,'frame'),
 ('L1100-04','작업자','작업자','text','기본 정보',NULL,6,'frame'),
 ('L1100-04','rows','문제점/조치(12행)','grid','TRY-OUT 결과',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-04';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-04','장비명','장비명','B3','text',1),
 ('L1100-04','제작처','제작처','P3','text',2),
 ('L1100-04','설치장소','설치장소','X3','text',3),
 ('L1100-04','일시','일시','B4','date',4),
 ('L1100-04','작성자','작성자','P4','text',5),
 ('L1100-04','작업자','작업자','X4','text',6);

DELETE FROM form_grid_spec WHERE form_code='L1100-04';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-04','rows',6,1,12);

DELETE FROM form_grid_columns WHERE form_code='L1100-04';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-04','rows','문제점','문제점 및 현상','B','text',1),
 ('L1100-04','rows','조치내용','조치내용','M','text',2),
 ('L1100-04','rows','일정','일정','X','text',3),
 ('L1100-04','rows','비고','비고(결과)','AA','text',4);

-- ── L1100-06 설비고장 조치 보고서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 헤더 8(설비명·해당사업부·설비번호·부품명·발생일·조치자·조치일·조치업체·D/T) + 현상 3(무엇이/어떻게/결과는) + 조치내용 + 원인(왜-왜) + 재발방지대책 3조(설비면/관리면/유사설비 수평전개 × 내용·누가·언제·완료유무). 현상도/스케치는 시트 몫.'
WHERE code='L1100-06';

DELETE FROM form_fields WHERE form_code='L1100-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-06','설비명','설비명','text','기본 정보',NULL,1,'frame'),
 ('L1100-06','해당사업부','해당사업부','text','기본 정보',NULL,2,'frame'),
 ('L1100-06','설비번호','설비번호','text','기본 정보',NULL,3,'frame'),
 ('L1100-06','부품명','부품명','text','기본 정보',NULL,4,'frame'),
 ('L1100-06','발생일','발생일','date','기본 정보',NULL,5,'fact'),
 ('L1100-06','조치자','조치자','text','기본 정보',NULL,6,'frame'),
 ('L1100-06','조치일','조치일','date','기본 정보',NULL,7,NULL),
 ('L1100-06','조치업체','조치업체','text','기본 정보',NULL,8,'frame'),
 ('L1100-06','dt','D/T(비가동 시간)','text','기본 정보',NULL,9,NULL),
 ('L1100-06','현상무엇','현상 — 무엇이','textarea','현상',NULL,10,NULL),
 ('L1100-06','현상어떻게','현상 — 어떻게','textarea','현상',NULL,11,NULL),
 ('L1100-06','현상결과','현상 — 결과는','textarea','현상',NULL,12,NULL),
 ('L1100-06','조치내용','조치내용','textarea','조치',NULL,20,NULL),
 ('L1100-06','원인','원인(왜-왜 분석)','textarea','원인',NULL,30,NULL),
 ('L1100-06','대책설비','재발방지 — 설비면','textarea','재발방지대책',NULL,40,NULL),
 ('L1100-06','대책설비누가','설비면 — 누가','text','재발방지대책',NULL,41,'frame'),
 ('L1100-06','대책설비언제','설비면 — 언제','text','재발방지대책',NULL,42,NULL),
 ('L1100-06','대책설비완료','설비면 — 완료유무','text','재발방지대책',NULL,43,NULL),
 ('L1100-06','대책관리','재발방지 — 관리면','textarea','재발방지대책',NULL,44,NULL),
 ('L1100-06','대책관리누가','관리면 — 누가','text','재발방지대책',NULL,45,'frame'),
 ('L1100-06','대책관리언제','관리면 — 언제','text','재발방지대책',NULL,46,NULL),
 ('L1100-06','대책관리완료','관리면 — 완료유무','text','재발방지대책',NULL,47,NULL),
 ('L1100-06','대책수평','재발방지 — 유사설비 수평전개','textarea','재발방지대책',NULL,48,NULL),
 ('L1100-06','대책수평누가','수평전개 — 누가','text','재발방지대책',NULL,49,'frame'),
 ('L1100-06','대책수평언제','수평전개 — 언제','text','재발방지대책',NULL,50,NULL),
 ('L1100-06','대책수평완료','수평전개 — 완료유무','text','재발방지대책',NULL,51,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-06','설비명','설비명','G3','text',1),
 ('L1100-06','해당사업부','해당사업부','U3','text',2),
 ('L1100-06','설비번호','설비번호','G4','text',3),
 ('L1100-06','부품명','부품명','U4','text',4),
 ('L1100-06','발생일','발생일','G5','date',5),
 ('L1100-06','조치자','조치자','U5','text',6),
 ('L1100-06','조치일','조치일','G6','date',7),
 ('L1100-06','조치업체','조치업체','U6','text',8),
 ('L1100-06','dt','D/T(비가동 시간)','G7','text',9),
 ('L1100-06','현상무엇','현상 — 무엇이','G8','text',10),
 ('L1100-06','현상어떻게','현상 — 어떻게','G11','text',11),
 ('L1100-06','현상결과','현상 — 결과는','G14','text',12),
 ('L1100-06','조치내용','조치내용','C17','text',13),
 ('L1100-06','원인','원인(왜-왜 분석)','C23','text',14),
 ('L1100-06','대책설비','재발방지 — 설비면','G28','text',15),
 ('L1100-06','대책설비누가','설비면 — 누가','Z28','text',16),
 ('L1100-06','대책설비언제','설비면 — 언제','AC28','text',17),
 ('L1100-06','대책설비완료','설비면 — 완료유무','AE28','text',18),
 ('L1100-06','대책관리','재발방지 — 관리면','G31','text',19),
 ('L1100-06','대책관리누가','관리면 — 누가','Z31','text',20),
 ('L1100-06','대책관리언제','관리면 — 언제','AC31','text',21),
 ('L1100-06','대책관리완료','관리면 — 완료유무','AE31','text',22),
 ('L1100-06','대책수평','재발방지 — 유사설비 수평전개','G34','text',23),
 ('L1100-06','대책수평누가','수평전개 — 누가','Z34','text',24),
 ('L1100-06','대책수평언제','수평전개 — 언제','AC34','text',25),
 ('L1100-06','대책수평완료','수평전개 — 완료유무','AE34','text',26);

DELETE FROM form_grid_spec WHERE form_code='L1100-06';
DELETE FROM form_grid_columns WHERE form_code='L1100-06';

-- ── L1100-08 설비 리스트 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 제목(사업부 기입)·작성 부서 + 설비 grid(4~22행 19행: 공정·설비번호·설비명·구입가격·제작/구입일자·제조사·전기용량·설비개조이력·비고). NO는 수기.'
WHERE code='L1100-08';

DELETE FROM form_fields WHERE form_code='L1100-08';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-08','제목','제목(사업부 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-08','작성부서','작성자(부서)','text','기본 정보',NULL,2,'frame'),
 ('L1100-08','rows','설비 목록(19행)','grid','설비 목록',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-08';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-08','제목','제목(사업부 기입)','E1','text',1),
 ('L1100-08','작성부서','작성자(부서)','A2','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1100-08';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-08','rows',4,1,19);

DELETE FROM form_grid_columns WHERE form_code='L1100-08';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-08','rows','공정','공정','C','text',1),
 ('L1100-08','rows','설비번호','설비번호','E','text',2),
 ('L1100-08','rows','설비명','설비명','J','text',3),
 ('L1100-08','rows','구입가격','구입가격','U','text',4),
 ('L1100-08','rows','구입일자','제작/구입일자','Z','text',5),
 ('L1100-08','rows','제조사','제조사','AF','text',6),
 ('L1100-08','rows','전기용량','전기용량','AK','text',7),
 ('L1100-08','rows','개조이력','설비개조이력','AO','text',8),
 ('L1100-08','rows','비고','비고','AT','text',9);

-- ── L1100-10 제조설비 관리대장(갑지) ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 갑지(리스트) 매핑 — 제목(사업부)·작성 부서 + 설비 grid(4~22행 19행, L1100-08 동형·열 좌표 상이). 을지(설비별 카드)는 시트 몫.'
WHERE code='L1100-10';

DELETE FROM form_fields WHERE form_code='L1100-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-10','제목','제목(사업부 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-10','작성부서','작성자(부서)','text','기본 정보',NULL,2,'frame'),
 ('L1100-10','rows','설비 목록(19행)','grid','설비 목록',NULL,10,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-10';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-10','제목','제목(사업부 기입)','E1','text',1),
 ('L1100-10','작성부서','작성자(부서)','A2','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1100-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-10','rows',4,1,19);

DELETE FROM form_grid_columns WHERE form_code='L1100-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-10','rows','공정','공정','C','text',1),
 ('L1100-10','rows','설비번호','설비번호','E','text',2),
 ('L1100-10','rows','설비명','설비명','J','text',3),
 ('L1100-10','rows','구입가격','구입가격','T','text',4),
 ('L1100-10','rows','구입일자','제작/구입일자','Y','text',5),
 ('L1100-10','rows','제조사','제조사','AE','text',6),
 ('L1100-10','rows','전기용량','전기용량','AJ','text',7),
 ('L1100-10','rows','개조이력','설비개조이력','AN','text',8),
 ('L1100-10','rows','비고','비고','AS','text',9);

-- ── L1100-11 년간 예방보전 계획서 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0121, 260731): 제목(연도)·범례/작성일자 + 설비 3행 병합 10블록(6:8~33:35) — 계획(○)행 grid(설비명·설비번호·점검주기·1~12월·비고) + 실시(●)행 grid(1~12월, stride 3). NO·정/일 구분 라벨은 시트 기정의.'
WHERE code='L1100-11';

DELETE FROM form_fields WHERE form_code='L1100-11';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-11','제목','제목(연도 기입)','text','기본 정보',NULL,1,'frame'),
 ('L1100-11','작성일자','범례·작성일자','text','기본 정보',NULL,2,'frame'),
 ('L1100-11','plan','설비별 계획 ○(10블록)','grid','예방보전 계획',NULL,10,NULL),
 ('L1100-11','actual','설비별 실시 ●(계획과 같은 순서)','grid','예방보전 실시',NULL,11,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-11';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-11','제목','제목(연도 기입)','C1','text',1),
 ('L1100-11','작성일자','범례·작성일자','C3','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1100-11';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L1100-11','plan',6,3,10),
 ('L1100-11','actual',7,3,10);

DELETE FROM form_grid_columns WHERE form_code='L1100-11';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-11','plan','설비명','설비명','B','text',1),
 ('L1100-11','plan','설비번호','설비번호','C','text',2),
 ('L1100-11','plan','점검주기','점검주기','D','text',3),
 ('L1100-11','plan','월1','1월','F','text',4),
 ('L1100-11','plan','월2','2월','G','text',5),
 ('L1100-11','plan','월3','3월','H','text',6),
 ('L1100-11','plan','월4','4월','I','text',7),
 ('L1100-11','plan','월5','5월','J','text',8),
 ('L1100-11','plan','월6','6월','K','text',9),
 ('L1100-11','plan','월7','7월','L','text',10),
 ('L1100-11','plan','월8','8월','M','text',11),
 ('L1100-11','plan','월9','9월','N','text',12),
 ('L1100-11','plan','월10','10월','O','text',13),
 ('L1100-11','plan','월11','11월','P','text',14),
 ('L1100-11','plan','월12','12월','Q','text',15),
 ('L1100-11','plan','비고','비고','R','text',16),
 ('L1100-11','actual','월1','1월','F','text',1),
 ('L1100-11','actual','월2','2월','G','text',2),
 ('L1100-11','actual','월3','3월','H','text',3),
 ('L1100-11','actual','월4','4월','I','text',4),
 ('L1100-11','actual','월5','5월','J','text',5),
 ('L1100-11','actual','월6','6월','K','text',6),
 ('L1100-11','actual','월7','7월','L','text',7),
 ('L1100-11','actual','월8','8월','M','text',8),
 ('L1100-11','actual','월9','9월','N','text',9),
 ('L1100-11','actual','월10','10월','O','text',10),
 ('L1100-11','actual','월11','11월','P','text',11),
 ('L1100-11','actual','월12','12월','Q','text',12);

DELETE FROM form_change_log WHERE migration='0121';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('L1100-15','2026-07-31','grid_spec_fix','rows stride 1·max 21(비앵커 70건 신호)','stride 2·max 10 + 영선/명일 grid 보강 + 일자 A3','★경보강(판정 1-⑵) — 실측: 3섹션 전부 2행 병합 블록. 파괴 없이 스펙 정정·섹션 보강','0121'),
 ('L1100-07','2026-07-31','cellmap_redesign','0019 잔재 6필드(육안 프리셋을 일별 결과 오인)','헤더 3 + 점검항목 grid(2행 병합 4블록)','일별 31열 = 현장 수기(시트 몫). 제출 #14 = 빈 값({}) 실측 — 키 제약 없음','0121'),
 ('L1100-12','2026-07-31','cellmap_redesign','0019 잔재 1필드','제목·작성 부서 + 점검항목 grid(5행 병합 4블록)','블록 대표 1행 매핑·참고사진 시트 몫','0121'),
 ('L1200-02','2026-07-31','cellmap_redesign','0019 잔재 12필드·31셀맵','카드 헤더 7 + 사용장비 grid(3행) + 이력 grid(16행)','금형 약도 시트 몫','0121'),
 ('L1200-03','2026-07-31','cellmap_redesign','0019 잔재 5필드','작성 3 + 2단 2행 블록 grid 2종(main/sub 9블록)','2단 헤더 구조 실측(상단/하단행 열 의미 상이)','0121'),
 ('L1200-05','2026-07-31','cellmap_redesign','0019 잔재 15필드','헤더 9 + 검사 grid(11행) + 비고','개략도(도면 대체 문구)·결재 시트 몫','0121'),
 ('L1200-06','2026-07-31','cellmap_redesign','0019 잔재 3필드','점검 grid(4행) + 비고·제정일자 + 개정란 grid(4행)','C/F 사진 시트 몫','0121'),
 ('L1200-11','2026-07-31','cellmap_redesign','0019 잔재 4필드·25셀맵','제목 + 슬롯 6×3 = 18칸 개별 매핑','3열×2단 슬롯 구조 실측·관리기준 본문 기정의','0121'),
 ('L1100-02','2026-07-31','cellmap_redesign','0019 잔재 8필드','계약 헤더 8칸','본문 = 진행 리스트 첨부 안내 기정의','0121'),
 ('L1100-03','2026-07-31','cellmap_redesign','0019 잔재 3필드','지적/대책 grid(26행)','결재 4단 서명 몫','0121'),
 ('L1100-04','2026-07-31','cellmap_redesign','0019 잔재 4필드','헤더 6(작성자 auto) + 문제점/조치 grid(12행)','','0121'),
 ('L1100-06','2026-07-31','cellmap_redesign','0019 잔재 21필드','헤더 9 + 현상 3 + 조치·원인 + 재발방지 3조(내용·누가·언제·완료)','현상도/스케치 시트 몫','0121'),
 ('L1100-08','2026-07-31','cellmap_redesign','0019 잔재 10필드','제목·작성 부서 + 설비 grid(19행 9열)','','0121'),
 ('L1100-10','2026-07-31','cellmap_redesign','0019 잔재 23필드·27셀맵','갑지 매핑 — 제목·작성 부서 + 설비 grid(19행 9열)','을지(설비별 카드)는 시트 몫','0121'),
 ('L1100-11','2026-07-31','cellmap_redesign','0019 잔재 4필드','제목·범례/작성일 + 계획/실시 grid(3행 병합 10블록 stride 3)','○● 기입 관례·NO/정·일 라벨 기정의','0121');
