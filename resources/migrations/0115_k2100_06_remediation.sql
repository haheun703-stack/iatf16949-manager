-- ============================================================
-- Migration 0115: K2100-06 선입선출 관리 기준서 — 레거시 셀맵 교정 (7차 트랙 1호, 2026-07-30)
--
-- 발단: 사장님 화면 표본 지적 → 코워크 진단(legacy_cellmap_sweep_260730.md §1) = 0019
-- 자동추출 잔재 실증 6번째. 기존 6필드가 표 헤더 라벨(순·시기·장소·관리기준·담당부서·
-- 도식화)을 1행 오인 매핑 + 설명 "자동 추출됨" 잔재.
--
-- 실측(마스터 "선입선출 관리 기준서 (K2100-06)" 단일 시트 — 변형·AM 없음, 25행×AV):
--   갑지형 상단(로고 A1:D3·제목 E1:AK3·결재란 담당 AN2/팀장 AQ2/사업부장 AT2 = M4200-01
--   동일 패턴) + 빈 병합 블록 A4:AV14(개요/도식 영역 — 라벨 부재라 매핑 제외·시트 몫) +
--   기준 테이블(헤더 15행: 순 A|시기 C|장소 I|관리기준 O|담당부서 AQ, 데이터 = 3행 병합
--   2블록 16:18·19:21 → grid stride 3·max 2) + 도식화 라벨 A22:B25·영역 C22:AV25(대형
--   병합 텍스트 영역 — textarea 매핑, 그림·사진은 시트 수기).
--
-- 안전: K2100-06 form_submissions 라이브 0건 — fields 재정의 무손실. 멱등: DELETE+INSERT.
-- ============================================================

UPDATE forms SET
  description='정본 완결 — 7차 트랙 1호(0115, 260730): 선입선출 관리 기준서. 레거시 자동추출 잔재(표 헤더 라벨 1행 오인 6필드) 교정 — 기준 테이블 grid(순·시기·장소·관리기준·담당부서, 3행 병합 2블록) + 도식화(textarea) + 작성자(결재 담당). 상단 개요 블록(A4:AV14)·도해 그림은 시트 수기.'
WHERE code='K2100-06';

DELETE FROM form_fields WHERE form_code='K2100-06';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('K2100-06','rows','선입선출 기준','grid','선입선출 관리 기준',NULL,1,NULL),
 ('K2100-06','도식화','도식화(서술)','textarea','도식화',NULL,2,NULL),
 ('K2100-06','작성자','작성자','auto','결재',NULL,3,'frame');

DELETE FROM form_cell_map WHERE form_code='K2100-06';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('K2100-06','도식화','도식화(서술)','C22','text',1),
 ('K2100-06','작성자','작성자','AN2','text',2);

DELETE FROM form_grid_spec WHERE form_code='K2100-06';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('K2100-06','rows',16,3,2);
DELETE FROM form_grid_columns WHERE form_code='K2100-06';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('K2100-06','rows','순','순','A','text',1),
 ('K2100-06','rows','시기','시기','C','text',2),
 ('K2100-06','rows','장소','장소','I','text',3),
 ('K2100-06','rows','관리기준','선입선출 관리기준','O','text',4),
 ('K2100-06','rows','담당부서','담당 부서','AQ','text',5);

DELETE FROM form_change_log WHERE migration='0115';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('K2100-06','2026-07-30','cellmap_redesign','0019 자동추출 잔재 — 표 헤더 라벨 1행 오인 6필드','grid(순·시기·장소·관리기준·담당부서) + 도식화 textarea + 작성자 AN2',
  '레거시 셀맵 스윕(legacy_cellmap_sweep_260730) §1 결함 실증 → 7차 트랙 1호 즉시 교정. 마스터 재실측(3행 병합 2블록·갑지 결재란) 기반 재설계','0115');
