-- ============================================================
-- Migration 0107: 양식 완성전 2배치 — 진행 8종 fields/grid/셀맵 완결 (2026-07-28 저녁)
--
-- 코워크 조건부 출발 승인(7/28 저녁). 조건 ② 적용 = '한계 수용' 판정 전이므로 그 한계
-- 유형(시드 실데이터·사진·타사업부 전용)에 걸리는 양식은 뒤로 미룸:
--   · 보류 5종(마이그 제외): A5100-03(과거 심사 실데이터 TPC24-0723), A5100-04(실평점
--     매트릭스), A5200-03(실데이터+사진 24·인발), A5200-04(실데이터·인발), A5200-04-01(필라넥 전용)
--   · 제외 상신 1종(마이그 제외): M1100-05 = 고정 코드 정의표(참조 문서 — 작성 양식 아님, 실측 반전)
-- 진행 8종 = A2200-03 · F1100-01 · F2100-10 · L1100-01 · L1100-09 · L1100-24 · M1100-02 · M1100-03
-- 전부 마스터 규정집 시트 실존(빈 틀 확인) — 신규 템플릿 0, template_path 없음(마스터 경로).
--
-- 유형별 처리(1배치 선례 그대로):
--   · L1100-24 = 계산기형(Cmk 자동서식) → L4102-02(0103 ⑤) 선례: 비수식 헤더만 매핑, 수식 보호
--   · F2100-10 = 매트릭스 채점형(SUM 수식) → 최소 매핑(이름·특이사항·작성자), 점수 매트릭스=시트 수식 보존
--   · L1100-01 = 문서형 대작(226행 사양서) → 식별 헤더 3만 매핑(상세 본문=사람 몫)
--   · 라벨 병합형 값 셀(F1100-01 B3/E3·L1100-09 A3) = 라벨 포함 셀 덮어쓰기 수용(L2100-04 K3 선례)
--
-- 안전: 8종 전부 form_submissions 0건(audit 실측) — DELETE+INSERT 무손실.
--       M1100-02(9행)·M1100-03(16행) 기존 cell_map = 자동추출 잔재 → 교체.
-- 멱등: DELETE 후 INSERT — 재실행 = 동일 결과.
-- ============================================================

-- ── ① A2200-03 (    )년 경영검토 보고서 — 빈 틀 실측(시드 없음) ──
DELETE FROM form_fields WHERE form_code='A2200-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A2200-03','작성일','작성일','date','기본 정보',NULL,1,'fact'),
 ('A2200-03','수신처','수신처','text','기본 정보',NULL,2,'frame'),
 ('A2200-03','검토일시','검토일시','text','기본 정보',NULL,3,'frame'),
 ('A2200-03','참석대상','참석대상','text','기본 정보',NULL,4,'frame'),
 ('A2200-03','items','경영검토 항목별 지적사항','grid','검토 항목(1~14)',NULL,5,NULL),
 ('A2200-03','검토내용','검토 내용(요약)','text','종합',NULL,6,'frame'),
 ('A2200-03','특기사항','특기 사항','text','종합',NULL,7,'frame'),
 ('A2200-03','작성자','작성자','auto','종합',NULL,8,'frame');

DELETE FROM form_cell_map WHERE form_code='A2200-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A2200-03','작성일','작성일','P4','date',1),
 ('A2200-03','수신처','수신처','F5','text',2),
 ('A2200-03','검토일시','검토일시','P5','text',3),
 ('A2200-03','참석대상','참석대상','F6','text',4),
 ('A2200-03','검토내용','검토 내용(요약)','F698','text',5),
 ('A2200-03','특기사항','특기 사항','F706','text',6),
 ('A2200-03','작성자','작성자','W2','text',7);

DELETE FROM form_grid_spec WHERE form_code='A2200-03';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('A2200-03','items',8,3,14);

DELETE FROM form_grid_columns WHERE form_code='A2200-03';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A2200-03','items','항목','경영검토 항목','C','text',1),
 ('A2200-03','items','지적사항','지적사항','M','text',2),
 ('A2200-03','items','비고','비고/조치','AA','text',3);

-- ── ② F1100-01 년 사내외 교육훈련 계획서 ──────────────────────
DELETE FROM form_fields WHERE form_code='F1100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F1100-01','작성일자','작성일자','date','기본 정보',NULL,1,'fact'),
 ('F1100-01','작성자','작성자','auto','기본 정보',NULL,2,'frame'),
 ('F1100-01','rows','교육훈련 계획','grid','계획',NULL,3,NULL);

DELETE FROM form_cell_map WHERE form_code='F1100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F1100-01','작성일자','작성일자','B3','date',1),
 ('F1100-01','작성자','작성자','E3','text',2);

DELETE FROM form_grid_spec WHERE form_code='F1100-01';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('F1100-01','rows',7,1,25);

DELETE FROM form_grid_columns WHERE form_code='F1100-01';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('F1100-01','rows','구분','구분(사내/사외)','A','text',1),
 ('F1100-01','rows','과정명','교육/과정명','B','text',2),
 ('F1100-01','rows','내용','교육 내용','C','text',3),
 ('F1100-01','rows','시간','교육시간/일정','D','text',4),
 ('F1100-01','rows','대상','교육대상','E','text',5),
 ('F1100-01','rows','기관','교육기관','F','text',6),
 ('F1100-01','rows','월1','1월','G','text',7),
 ('F1100-01','rows','월2','2월','H','text',8),
 ('F1100-01','rows','월3','3월','I','text',9),
 ('F1100-01','rows','월4','4월','J','text',10),
 ('F1100-01','rows','월5','5월','K','text',11),
 ('F1100-01','rows','월6','6월','L','text',12),
 ('F1100-01','rows','월7','7월','M','text',13),
 ('F1100-01','rows','월8','8월','N','text',14),
 ('F1100-01','rows','월9','9월','O','text',15),
 ('F1100-01','rows','월10','10월','P','text',16),
 ('F1100-01','rows','월11','11월','Q','text',17),
 ('F1100-01','rows','월12','12월','R','text',18),
 ('F1100-01','rows','비용','교육비용','S','text',19),
 ('F1100-01','rows','비고','비고','T','text',20);

-- ── ③ F2100-10 작업자 숙련도 CHECK SHEET — 매트릭스 채점형(최소 매핑) ──
DELETE FROM form_fields WHERE form_code='F2100-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('F2100-10','이름1','평가 대상자 1','text','대상자',NULL,1,'frame'),
 ('F2100-10','이름2','평가 대상자 2','text','대상자',NULL,2,'frame'),
 ('F2100-10','이름3','평가 대상자 3','text','대상자',NULL,3,'frame'),
 ('F2100-10','특이사항','특이사항','text','확인',NULL,4,'frame'),
 ('F2100-10','작성자','작성자','auto','확인',NULL,5,'frame');

DELETE FROM form_cell_map WHERE form_code='F2100-10';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('F2100-10','이름1','평가 대상자 1','L7','text',1),
 ('F2100-10','이름2','평가 대상자 2','M7','text',2),
 ('F2100-10','이름3','평가 대상자 3','N7','text',3),
 ('F2100-10','특이사항','특이사항','V8','text',4),
 ('F2100-10','작성자','작성자','W2','text',5);

-- ── ④ L1100-01 설비제작 사양서 — 문서형 대작(식별 헤더만) ─────
DELETE FROM form_fields WHERE form_code='L1100-01';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-01','품명','품명','text','기본 정보',NULL,1,'frame'),
 ('L1100-01','차종','차종','text','기본 정보',NULL,2,'frame'),
 ('L1100-01','목적','목적','text','기본 정보',NULL,3,'frame');

DELETE FROM form_cell_map WHERE form_code='L1100-01';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-01','품명','품명','H5','text',1),
 ('L1100-01','차종','차종','H7','text',2),
 ('L1100-01','목적','목적','H9','text',3);

DELETE FROM form_grid_spec WHERE form_code='L1100-01';
DELETE FROM form_grid_columns WHERE form_code='L1100-01';

-- ── ⑤ L1100-09 설비 이력카드 ─────────────────────────────────
DELETE FROM form_fields WHERE form_code='L1100-09';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-09','설비번호','설비 번호(TC-)','text','기본 정보',NULL,1,'frame'),
 ('L1100-09','설비명','설비명','text','기본 정보',NULL,2,'frame'),
 ('L1100-09','rows','수리/보전 이력','grid','이력',NULL,3,NULL);

DELETE FROM form_cell_map WHERE form_code='L1100-09';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-09','설비번호','설비 번호(TC-)','E2','text',1),
 ('L1100-09','설비명','설비명','A3','text',2);

DELETE FROM form_grid_spec WHERE form_code='L1100-09';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('L1100-09','rows',5,1,30);

DELETE FROM form_grid_columns WHERE form_code='L1100-09';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('L1100-09','rows','no','No','A','text',1),
 ('L1100-09','rows','일자','일자','B','date',2),
 ('L1100-09','rows','구분','구분(PM/BM 등)','C','text',3),
 ('L1100-09','rows','원인','원인','D','text',4),
 ('L1100-09','rows','수리내용','수리 내용','E','text',5),
 ('L1100-09','rows','소요부품','소요 부품','F','text',6),
 ('L1100-09','rows','수량','수량','G','text',7),
 ('L1100-09','rows','단가','단가','H','text',8),
 ('L1100-09','rows','비고','비고','I','text',9);

-- ── ⑥ L1100-24 설비능력 지수표 — 계산기형(L4102-02 선례: 비수식 헤더만) ──
DELETE FROM form_fields WHERE form_code='L1100-24';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('L1100-24','업체명','업체명','text','기본 정보',NULL,1,'frame'),
 ('L1100-24','model','MODEL','text','기본 정보',NULL,2,'frame'),
 ('L1100-24','공정명','공정명','text','기본 정보',NULL,3,'frame'),
 ('L1100-24','품명','품명(번)','text','기본 정보',NULL,4,'frame'),
 ('L1100-24','usl','USL(규격상한)','text','규격',NULL,5,'frame'),
 ('L1100-24','lsl','LSL(규격하한)','text','규격',NULL,6,'frame'),
 ('L1100-24','측정자','측정자','text','측정',NULL,7,'frame'),
 ('L1100-24','측정일','측정일','date','측정',NULL,8,'fact'),
 ('L1100-24','단위','단위','text','측정',NULL,9,'frame'),
 ('L1100-24','계측기','계측기','text','측정',NULL,10,'frame');

DELETE FROM form_cell_map WHERE form_code='L1100-24';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('L1100-24','업체명','업체명','B7','text',1),
 ('L1100-24','model','MODEL','B8','text',2),
 ('L1100-24','공정명','공정명','B9','text',3),
 ('L1100-24','품명','품명(번)','B10','text',4),
 ('L1100-24','usl','USL(규격상한)','J8','text',5),
 ('L1100-24','lsl','LSL(규격하한)','J9','text',6),
 ('L1100-24','측정자','측정자','M8','text',7),
 ('L1100-24','측정일','측정일','M9','date',8),
 ('L1100-24','단위','단위','M10','text',9),
 ('L1100-24','계측기','계측기','M11','text',10);

DELETE FROM form_grid_spec WHERE form_code='L1100-24';
DELETE FROM form_grid_columns WHERE form_code='L1100-24';

-- ── ⑦ M1100-02 설비 비가동시간 관리 대장 — 3행 블록 grid ──────
DELETE FROM form_fields WHERE form_code='M1100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1100-02','rows','비가동 기록','grid','대장',NULL,1,NULL),
 ('M1100-02','작성자','작성자','auto','확인',NULL,2,'frame');

DELETE FROM form_cell_map WHERE form_code='M1100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1100-02','작성자','작성자','AN2','text',1);

DELETE FROM form_grid_spec WHERE form_code='M1100-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows)
VALUES ('M1100-02','rows',6,3,6);

DELETE FROM form_grid_columns WHERE form_code='M1100-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1100-02','rows','no','순','A','text',1),
 ('M1100-02','rows','일자','일자','C','date',2),
 ('M1100-02','rows','라인명','라인명','G','text',3),
 ('M1100-02','rows','비가동시간','비가동 시간','K','text',4),
 ('M1100-02','rows','사유','비가동 사유','O','text',5),
 ('M1100-02','rows','조치이력','조치 이력(개선 현황)','W','text',6),
 ('M1100-02','rows','전판정','비가동 전 제품 검사 판정','AE','text',7),
 ('M1100-02','rows','후판정','조치 후 초품 검사 판정','AL','text',8),
 ('M1100-02','rows','비고','비고','AS','text',9);

-- ── ⑧ M1100-03 설비 비가동시간 이력관리 대장 — 카드형 ─────────
DELETE FROM form_fields WHERE form_code='M1100-03';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1100-03','품명','품명','text','기본 정보',NULL,1,'frame'),
 ('M1100-03','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('M1100-03','차종','차종','text','기본 정보',NULL,3,'frame'),
 ('M1100-03','전lot','비가동 전 LOT NO','text','LOT',NULL,4,'frame'),
 ('M1100-03','후lot','조치 후 LOT NO','text','LOT',NULL,5,'frame'),
 ('M1100-03','일자','일자','date','비가동 현황',NULL,6,'fact'),
 ('M1100-03','정지시간','① 정지 시간','text','비가동 현황',NULL,7,'frame'),
 ('M1100-03','가동시간','② 가동 시간','text','비가동 현황',NULL,8,'frame'),
 ('M1100-03','비가동시간','③ 비가동 시간','text','비가동 현황',NULL,9,'frame'),
 ('M1100-03','중단코드','설비중단코드','text','비가동 현황',NULL,10,'frame'),
 ('M1100-03','작성자','작성자','auto','확인',NULL,11,'frame');

DELETE FROM form_cell_map WHERE form_code='M1100-03';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1100-03','품명','품명','F4','text',1),
 ('M1100-03','품번','품번','R4','text',2),
 ('M1100-03','차종','차종','AD4','text',3),
 ('M1100-03','전lot','비가동 전 LOT NO','F5','text',4),
 ('M1100-03','후lot','조치 후 LOT NO','AD5','text',5),
 ('M1100-03','일자','일자','A8','date',6),
 ('M1100-03','정지시간','① 정지 시간','K8','text',7),
 ('M1100-03','가동시간','② 가동 시간','K9','text',8),
 ('M1100-03','비가동시간','③ 비가동 시간','K10','text',9),
 ('M1100-03','중단코드','설비중단코드','K11','text',10),
 ('M1100-03','작성자','작성자','R8','text',11);

DELETE FROM form_grid_spec WHERE form_code='M1100-03';
DELETE FROM form_grid_columns WHERE form_code='M1100-03';

-- ── ⑨ 낡은 설명 정리(작성 화면 부제 노출분) ───────────────────
UPDATE forms SET description='마스터 정본(빈 틀 실측) — 2배치(260728) 필드 완결: 헤더+검토항목 14블록 grid+검토내용·특기사항.' WHERE code='A2200-03';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 필드 완결: 연간 교육훈련 계획 대장(월별 일정 12열). 의무 연결.' WHERE code='F1100-01';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 최소 매핑: 매트릭스 채점형(점수·소계=시트 수식 보존, 계산기형 선례). 대상자·특이사항·작성자만 앱 기입.' WHERE code='F2100-10';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 최소 매핑: 문서형 대작(226행 사양서) — 식별 헤더 3(품명·차종·목적)만, 상세 본문은 사람 몫.' WHERE code='L1100-01';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 필드 완결: 설비 카드 + 수리/보전 이력 대장.' WHERE code='L1100-09';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 계산기형(Cmk 자동서식, L4102-02 선례): 비수식 헤더 10만 매핑, 측정값·수식은 시트 보호.' WHERE code='L1100-24';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 필드 완결: 비가동 기록 6블록(3행 병합) grid + 전/후 검사 판정.' WHERE code='M1100-02';
UPDATE forms SET description='마스터 정본 — 2배치(260728) 필드 완결: 비가동 1건 카드형(품번·LOT 전후·시간 3종·중단코드).' WHERE code='M1100-03';
