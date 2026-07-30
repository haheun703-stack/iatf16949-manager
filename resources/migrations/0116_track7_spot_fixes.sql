-- ============================================================
-- Migration 0116: 7차 1차 배치 선행 무해화 — 수식 충돌 스팟 정정 4종 (2026-07-31)
--
-- 근거: 수식충돌_스캔보고_260730.md §4-1 (244종 전수 스캔, 충돌 40건/16양식 중
-- 정품 4종은 재설계 없이 좌표만 정정). 4종 전부 form_submissions 라이브 0건 — 무손실.
--
-- 실측(2026-07-31 사무실 봇):
--   ① A5200-04 내부심사(제품): dims 데이터 = 2행 병합 4블록(28:29~34:35), 36행 = 합계
--      SUM(AD14:AH35). 종전 max_rows 6은 i=4가 합계행(36), i=5가 채점기준 병합영역(38)
--      까지 침범 — 보고서 "1행 침범"의 실측 정답은 2 감소(6→4).
--   ② F1100-01 교육훈련 계획서: 데이터 7~30행, 합계 S31=SUM(S7:S30) → max_rows 25→24.
--   ③ L2100-07 수입검사 관리대장: 4행 = 작성 예시행(기울임·연주황 FFF7E6, A2 공지 명기),
--      입력영역 = 5~34행(노랑 FFFDE7), 35행 = 월말대사 라벨, 36행 = COUNTA(B5:B34) 수식.
--      종전 start 4·max 34는 예시행 덮어씀 + 수식행(36)·범위밖(37) 침범 → start 5·max 30.
--   ④ L1100-24 설비능력 지수표(계산기형): 매핑 6셀(J8·J9·M8~M11)이 전부
--      IF(ISBLANK($B13..$B18)," ",..) 미러 수식 — 시트 자체가 B열을 입력 셀로 설계.
--      원 입력 셀로 재매핑: usl→B13(SPEC상한)·lsl→B14(SPEC하한)·측정자→B15·
--      측정일→B16(측정기간)·단위→C17(단위명 "mm", C15 프롬프트+N10 미러 —
--      B17은 최소단위 0.01로 별개 파라미터)·계측기→B18(M11 미러의 원천).
--      ⚠️마스터 자체 모순 기록: F13:J18 정규화 블록 30셀이 $B$18을 산술 참조하나
--      마스터 표본값이 이미 텍스트("V/C") — 캐시 결과는 $B$18=0 시절 값. 앱 매핑은
--      현행 사용 관행(계측기명 텍스트)을 그대로 따르며 악화 없음. 시트 교정은 정본
--      관리 영역이라 앱 범위 밖(스캔보고 후속 §4 소견 유지).
--
-- 멱등: UPDATE + change_log DELETE/INSERT.
-- ============================================================

-- ① A5200-04: dims 6→4 (합계행 36·채점기준 38 침범 해소)
UPDATE form_grid_spec SET max_rows=4
WHERE form_code='A5200-04' AND grid_key='dims';

-- ② F1100-01: rows 25→24 (합계 S31 침범 해소)
UPDATE form_grid_spec SET max_rows=24
WHERE form_code='F1100-01' AND grid_key='rows';

-- ③ L2100-07: 예시행 보존 + 월말대사 수식 정합 (5~34행 = COUNTA 집계 구간)
UPDATE form_grid_spec SET data_start_row=5, max_rows=30
WHERE form_code='L2100-07' AND grid_key='rows';

-- ④ L1100-24: 미러 수식 셀 → 원 입력 셀 재매핑 6건
UPDATE form_cell_map SET cell='B13' WHERE form_code='L1100-24' AND field_key='usl';
UPDATE form_cell_map SET cell='B14' WHERE form_code='L1100-24' AND field_key='lsl';
UPDATE form_cell_map SET cell='B15' WHERE form_code='L1100-24' AND field_key='측정자';
UPDATE form_cell_map SET cell='B16' WHERE form_code='L1100-24' AND field_key='측정일';
UPDATE form_cell_map SET cell='C17' WHERE form_code='L1100-24' AND field_key='단위';
UPDATE form_cell_map SET cell='B18' WHERE form_code='L1100-24' AND field_key='계측기';

UPDATE forms SET
  description='마스터 정본 — 2배치(260728) 계산기형(Cmk 자동서식, L4102-02 선례) + 0116 스팟 정정(260731): 헤더 입력 10을 원 입력 셀(B7~B10·B13~B18·C17)로 매핑 — 종전 J8/M8 등은 미러 수식 셀이라 수식 파괴 충돌. 측정값·수식은 시트 보호.'
WHERE code='L1100-24';

DELETE FROM form_change_log WHERE migration='0116';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('A5200-04','2026-07-31','grid_spec_fix','dims max_rows=6 (36행 합계·38행 채점기준 침범)','dims max_rows=4 (데이터 = 2행 병합 4블록 28~35)',
  '수식 충돌 전수 스캔(formula_scan_20260730) 정품 검출 — 합계 SUM(AD14:AH35) 파괴 차단. 7차 선행 무해화','0116'),
 ('F1100-01','2026-07-31','grid_spec_fix','rows max_rows=25 (31행 합계 침범)','rows max_rows=24 (데이터 7~30행)',
  '수식 충돌 전수 스캔 정품 검출 — 합계 S31=SUM(S7:S30) 파괴 차단. 7차 선행 무해화','0116'),
 ('L2100-07','2026-07-31','grid_spec_fix','rows start=4·max=34 (예시행 덮어씀 + 36행 월말대사 수식 침범)','rows start=5·max=30 (예시행 보존·COUNTA(B5:B34) 정합)',
  '수식 충돌 전수 스캔 정품 검출 — 월말대사 COUNTA/차감 수식 3셀 파괴 차단 + 예시행(기울임·연주황) 보존. 7차 선행 무해화','0116'),
 ('L1100-24','2026-07-31','cellmap_fix','usl=J8·lsl=J9·측정자=M8·측정일=M9·단위=M10·계측기=M11 (전부 IF(ISBLANK($B..)) 미러 수식 셀)','usl=B13·lsl=B14·측정자=B15·측정일=B16·단위=C17·계측기=B18 (시트 설계상 원 입력 셀)',
  '수식 충돌 전수 스캔 정품 검출 6건 — 시트 미러 구조 실측(J10 TOL·J11 규격중심 등 파생 수식 보존). 단위=C17은 단위명(mm) 입력 셀, B17 최소단위와 구분. 7차 선행 무해화','0116');
