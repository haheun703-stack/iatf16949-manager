-- ============================================================
-- Migration 0119: 7차 1차 배치 — 충돌 재설계 3종 (K2100-05·L3100-02·A2200-01, 2026-07-31)
--
-- 근거: 수식충돌_스캔보고_260730.md §1 잔존분. 3종 전부 0019 잔재·form_submissions 0건.
--
-- 실측(2026-07-31):
--   ① K2100-05 장기 재고 점검대장(표본 실측 적중 건 — 원 발견): 점검 10항목 × 품목 4열
--      점수 블록(2행 병합 N8:R9~N26:R27, 열 N/S/X/AC), 28행 = 열별 소계 SUM 수식(원 충돌
--      평가결과→N28). 헤더(평가일자 AB1·평가팀 AB2·평가자 AB3) + 점검 대상 품명/품번
--      각 4(6~7행) + 전월점수 4(29행) + 하단 점검 4행(35~38: 품번 D·점검내용 3열 J/R/Z)
--      + 조치(시정조치일 E42·재평가일 E43·재평가자 E44·평가자의견 M42). 판정(□합격/
--      □시정조치)은 두 셀 분리 라디오 = 앱 기록·시트 체크 수기. 승인(AE43) 서명 몫.
--   ② L3100-02 계측기 이력카드: ★헤더 8칸(B4~B7·F4~F7) 전부 VLOOKUP($I$2) 자동조회
--      수식(원 충돌 4건 = 계측기명·교정주기·취득일자·구입금액 매핑) — 입력 아닌 조회 셀.
--      ⚠️마스터 자체 결함 기록: 조회키 $I$2가 제목 병합(B1:I2) 내부라 자동조회 미작동
--      상태 — 시트 교정은 정본 관리 영역. 앱 매핑 = 로그 2종 grid만(사용/불출 25~27 ·
--      교정/수리 이력 30~36) + 관리번호·계측기명은 앱 기록용(의도적 unmapped, 식별).
--   ③ A2200-01 회의록: 갑지 헤더 6칸(회의일자 E4·회의장소 R4·회의구분 AD4·주관부서 E5·
--      작성자 R5·회의안건 H12) + 참석자 grid(7~11행, 좌/우 2열 구조 — 확인란은 서명 몫)
--      + 회의내용(13~33행 자유 영역, 병합 없음 → A13 textarea). 을지(34~)는 갑지 미러
--      수식(H37=H12, 원 충돌) — 매핑 금지. 결재란 5단(담당~대표이사) 서명 몫.
--
-- 멱등: DELETE+INSERT.
-- ============================================================

-- ── ① K2100-05 장기 재고 점검대장 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0119, 260731): 장기재고 품질 열화 Check Sheet. 평가 정보(평가일자·평가팀·평가자) + 점검 대상(품명/품번 4열) + 점검 점수 grid(10항목×4품목, 2행 병합 블록) + 전월점수 4 + 하단 점검 grid(품번·재고일치·식별상태·유해결함 4행) + 조치(시정조치일·재평가일·재평가자·의견). 열별 소계(28행 SUM)·배점 기준표는 시트 몫, 판정(□합격/□시정조치)은 앱 기록·시트 체크 수기, 승인란 서명 몫.'
WHERE code='K2100-05';

DELETE FROM form_fields WHERE form_code='K2100-05';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-05','평가일자','평가일자','date','평가 정보',NULL,1,'fact'),
 ('K2100-05','평가팀','평가팀','text','평가 정보',NULL,2,'frame'),
 ('K2100-05','평가자','평가자','text','평가 정보',NULL,3,'frame'),
 ('K2100-05','품명1','품명 1','text','점검 대상',NULL,10,'frame'),
 ('K2100-05','품번1','품번 1','text','점검 대상',NULL,11,'frame'),
 ('K2100-05','품명2','품명 2','text','점검 대상',NULL,12,'frame'),
 ('K2100-05','품번2','품번 2','text','점검 대상',NULL,13,'frame'),
 ('K2100-05','품명3','품명 3','text','점검 대상',NULL,14,'frame'),
 ('K2100-05','품번3','품번 3','text','점검 대상',NULL,15,'frame'),
 ('K2100-05','품명4','품명 4','text','점검 대상',NULL,16,'frame'),
 ('K2100-05','품번4','품번 4','text','점검 대상',NULL,17,'frame'),
 ('K2100-05','scores','점검 점수(10항목×4품목)','grid','점검 점수',NULL,20,NULL),
 ('K2100-05','전월점수1','전월 점수 1','text','전월 점수',NULL,30,NULL),
 ('K2100-05','전월점수2','전월 점수 2','text','전월 점수',NULL,31,NULL),
 ('K2100-05','전월점수3','전월 점수 3','text','전월 점수',NULL,32,NULL),
 ('K2100-05','전월점수4','전월 점수 4','text','전월 점수',NULL,33,NULL),
 ('K2100-05','bottom','장기재고 점검(품번별)','grid','하단 점검',NULL,40,NULL),
 ('K2100-05','판정','판정','radio','판정·조치','["합격","시정조치 및 재평가 필요"]',50,NULL),
 ('K2100-05','시정조치일','시정조치일','date','판정·조치',NULL,51,NULL),
 ('K2100-05','재평가일','재평가일','date','판정·조치',NULL,52,NULL),
 ('K2100-05','재평가자','재평가자','text','판정·조치',NULL,53,'frame'),
 ('K2100-05','평가자의견','평가자 의견','textarea','판정·조치',NULL,54,NULL);

DELETE FROM form_cell_map WHERE form_code='K2100-05';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K2100-05','평가일자','평가일자','AB1','date',1),
 ('K2100-05','평가팀','평가팀','AB2','text',2),
 ('K2100-05','평가자','평가자','AB3','text',3),
 ('K2100-05','품명1','품명 1','N6','text',4),
 ('K2100-05','품번1','품번 1','N7','text',5),
 ('K2100-05','품명2','품명 2','S6','text',6),
 ('K2100-05','품번2','품번 2','S7','text',7),
 ('K2100-05','품명3','품명 3','X6','text',8),
 ('K2100-05','품번3','품번 3','X7','text',9),
 ('K2100-05','품명4','품명 4','AC6','text',10),
 ('K2100-05','품번4','품번 4','AC7','text',11),
 ('K2100-05','전월점수1','전월 점수 1','N29','text',12),
 ('K2100-05','전월점수2','전월 점수 2','S29','text',13),
 ('K2100-05','전월점수3','전월 점수 3','X29','text',14),
 ('K2100-05','전월점수4','전월 점수 4','AC29','text',15),
 ('K2100-05','시정조치일','시정조치일','E42','date',16),
 ('K2100-05','재평가일','재평가일','E43','date',17),
 ('K2100-05','재평가자','재평가자','E44','text',18),
 ('K2100-05','평가자의견','평가자 의견','M42','text',19);

DELETE FROM form_grid_spec WHERE form_code='K2100-05';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-05','scores',8,2,10),
 ('K2100-05','bottom',35,1,4);

DELETE FROM form_grid_columns WHERE form_code='K2100-05';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-05','scores','품목1','품목 1 점수','N','text',1),
 ('K2100-05','scores','품목2','품목 2 점수','S','text',2),
 ('K2100-05','scores','품목3','품목 3 점수','X','text',3),
 ('K2100-05','scores','품목4','품목 4 점수','AC','text',4),
 ('K2100-05','bottom','품번','점검 품번','D','text',1),
 ('K2100-05','bottom','재고일치','재고 목록 일치성','J','text',2),
 ('K2100-05','bottom','식별상태','별도 식별표식 상태','R','text',3),
 ('K2100-05','bottom','유해결함','사용/기능상 유해한 결함','Z','text',4);

-- ── ② L3100-02 계측기 이력카드 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0119, 260731): 계측기 이력카드. 사용/불출 현황 grid(25~27행: 일자·부서명·용도·비고) + 교정(점검)/수리 이력 grid(30~36행: 일자·이력사항·검교정결과·기관·차기교정일·담당확인·비고). 관리번호·계측기명은 앱 기록용(헤더 8칸은 VLOOKUP 자동조회 수식 — 매핑 금지). ⚠️마스터 결함 기록: 조회키 $I$2가 제목 병합(B1:I2) 내부라 자동조회 미작동 — 시트 교정은 정본 관리 영역. 사진·헤더는 시트 몫.'
WHERE code='L3100-02';

DELETE FROM form_fields WHERE form_code='L3100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L3100-02','관리번호','관리번호','text','계측기 식별',NULL,1,'frame'),
 ('L3100-02','계측기명','계측기명','text','계측기 식별',NULL,2,'frame'),
 ('L3100-02','usage','사용 및 불출 현황','grid','사용/불출',NULL,10,NULL),
 ('L3100-02','calib','교정(점검) 및 수리 이력','grid','교정/수리 이력',NULL,20,NULL);

DELETE FROM form_cell_map WHERE form_code='L3100-02';

DELETE FROM form_grid_spec WHERE form_code='L3100-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('L3100-02','usage',25,1,3),
 ('L3100-02','calib',30,1,7);

DELETE FROM form_grid_columns WHERE form_code='L3100-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L3100-02','usage','일자','일자','A','date',1),
 ('L3100-02','usage','부서명','부서명','B','text',2),
 ('L3100-02','usage','용도','용도','C','text',3),
 ('L3100-02','usage','비고','비고','G','text',4),
 ('L3100-02','calib','일자','일자','A','date',1),
 ('L3100-02','calib','이력사항','이력 사항','B','text',2),
 ('L3100-02','calib','검교정결과','검교정 결과','D','text',3),
 ('L3100-02','calib','검교정기관','검교정 기관','E','text',4),
 ('L3100-02','calib','차기교정일','차기 교정일','F','date',5),
 ('L3100-02','calib','담당확인','담당 확인','G','text',6),
 ('L3100-02','calib','비고','비고','H','text',7);

-- ── ③ A2200-01 회의록 ──
UPDATE forms SET
  description='재설계 — 7차 트랙(0119, 260731): 회의록(갑지). 헤더(회의일자·회의장소·회의구분·주관부서·작성자·회의안건) + 회의참석자 grid(7~11행, 좌/우 2열 — 소속·직급·성명, 확인란은 서명 몫) + 회의내용(13~33행 자유 영역 textarea). 을지(34행~)는 갑지 미러 수식(H37=H12) — 매핑 금지. 결재란 5단(담당~대표이사) 서명 몫. IATF §5.1 경영검토 연계.'
WHERE code='A2200-01';

DELETE FROM form_fields WHERE form_code='A2200-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A2200-01','회의일자','회의 일자','date','회의 정보',NULL,1,'fact'),
 ('A2200-01','회의장소','회의장소','text','회의 정보',NULL,2,'frame'),
 ('A2200-01','회의구분','회의 구분','text','회의 정보',NULL,3,'frame'),
 ('A2200-01','주관부서','주관부서','text','회의 정보',NULL,4,'frame'),
 ('A2200-01','작성자','작성자','auto','회의 정보',NULL,5,'frame'),
 ('A2200-01','참석자','회의참석자(좌/우 2열)','grid','참석자',NULL,10,NULL),
 ('A2200-01','회의안건','회의 안건','text','회의 내용',NULL,20,NULL),
 ('A2200-01','회의내용','회의 내용','textarea','회의 내용',NULL,21,NULL);

DELETE FROM form_cell_map WHERE form_code='A2200-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A2200-01','회의일자','회의 일자','E4','date',1),
 ('A2200-01','회의장소','회의장소','R4','text',2),
 ('A2200-01','회의구분','회의 구분','AD4','text',3),
 ('A2200-01','주관부서','주관부서','E5','text',4),
 ('A2200-01','작성자','작성자','R5','text',5),
 ('A2200-01','회의안건','회의 안건','H12','text',6),
 ('A2200-01','회의내용','회의 내용','A13','text',7);

DELETE FROM form_grid_spec WHERE form_code='A2200-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('A2200-01','참석자',7,1,5);

DELETE FROM form_grid_columns WHERE form_code='A2200-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A2200-01','참석자','소속1','소속(좌)','C','text',1),
 ('A2200-01','참석자','직급1','직급(좌)','H','text',2),
 ('A2200-01','참석자','성명1','성명(좌)','L','text',3),
 ('A2200-01','참석자','소속2','소속(우)','T','text',4),
 ('A2200-01','참석자','직급2','직급(우)','Y','text',5),
 ('A2200-01','참석자','성명2','성명(우)','AC','text',6);

DELETE FROM form_change_log WHERE migration='0119';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('K2100-05','2026-07-31','cellmap_redesign','0019 잔재 26필드·61셀맵(평가결과→N28 소계 SUM 수식 충돌 — 표본 실측 원 발견 건)','평가 정보 3 + 점검 대상 8 + 점수 grid(10×4, 2행 병합) + 전월 4 + 하단 grid(4행) + 조치 4',
  '수식 충돌 전수 스캔 잔존분 재설계. 소계 수식(28행)·배점 기준표 보존, 판정 라디오는 앱 기록(두 셀 분리 — 시트 체크 수기)','0119'),
 ('L3100-02','2026-07-31','cellmap_redesign','0019 잔재 7필드(충돌 4 = VLOOKUP 조회 셀 F4~F7 매핑)','로그 grid 2종(사용/불출 3행·교정/수리 7행) + 관리번호·계측기명 앱 기록(의도적 unmapped)',
  '헤더 8칸 = VLOOKUP($I$2) 자동조회 수식 — 입력 셀 아님. 마스터 결함(조회키가 제목 병합 내부) 기록·시트 교정은 정본 관리 영역','0119'),
 ('A2200-01','2026-07-31','cellmap_redesign','0019 잔재 10필드·15셀맵(회의안건→H37 을지 미러 수식 충돌)','갑지 헤더 6 + 참석자 grid(5행×좌우 2열) + 회의내용 textarea(A13)',
  '을지 = 갑지 미러 수식 — 갑지만 매핑. 참석자 확인란·결재란 5단은 서명 몫','0119');
