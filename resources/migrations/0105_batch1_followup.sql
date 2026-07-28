-- ============================================================
-- Migration 0105: 1배치 후속 — 코워크 판정 확정 2건 이행 (2026-07-28 오후)
--
-- 코워크 회신(1배치 서면 잠정 합격):
--  ⑴ 개명 2건 승인 — 조건: 개명 이력을 양식 개정 이력으로 남길 것(구명칭→신명칭, 사유).
--     → form_change_log 테이블 신설(양식 메타 변경 이력 — 작성본 개정 이력
--       form_submission_revisions 와 별개 축). 2배치부터 개명·교정마다 여기 기록.
--  ⑵ M1200-10 실물 교체 승인 — 조도 선례("실물 출현 시 교정") 일관 적용.
--     조건 ⓐ 차이 요약 = 검수요청 문서 §5(설계본에만 있던 필드 목록 포함)
--     조건 ⓑ 구 신규설계본(15_공정자주검사)은 삭제하지 않고 sq_gap_forms 참고 보관.
--
-- 안전: M1200-10 form_submissions 라이브 0건 실측 — fields 재정의(DELETE+INSERT) 무손실.
-- 멱등: CREATE IF NOT EXISTS + DELETE 후 INSERT — 재실행 = 동일 결과.
-- ============================================================

-- ── ① 양식 변경 이력 테이블 신설 ─────────────────────────────
CREATE TABLE IF NOT EXISTS form_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code TEXT NOT NULL,
  changed_on TEXT NOT NULL,          -- 변경일(YYYY-MM-DD)
  change_type TEXT NOT NULL,         -- rename | template_adopt | template_correct | ...
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  migration TEXT                     -- 적용 마이그레이션(추적)
);

DELETE FROM form_change_log WHERE migration IN ('0104','0105');
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('L2100-01','2026-07-28','rename','수입검사표준 (-인)','수입검사표준(-AM)',
  'AM 실사용 실측 — 마스터 -인 시트는 5행 스텁, AM 실사용 = MES 수입검사 엑셀양식(코워크 개명 승인)','0104'),
 ('L2100-01','2026-07-28','template_adopt',NULL,'templates/am_forms/L2100-01_수입검사표준_AM.xlsx',
  'AM 실사용 MES 수입검사 엑셀양식 ''양식'' 시트 추출 채택(1배치 실측 반전①)','0104'),
 ('L2100-05','2026-07-28','rename','조관공정 순회검사일지(-조)','공정 순회검사(패트롤) 시트(-AM)',
  'AM 실사용 실측 — 마스터 -조 일지는 조관공정(SKELP/ERW) 전용, AM 실사용 = MES 공정패트롤 엑셀양식(코워크 개명 승인)','0104'),
 ('L2100-05','2026-07-28','template_adopt',NULL,'templates/am_forms/L2100-05_공정순회_패트롤_AM.xlsx',
  'AM 실사용 MES 공정패트롤 엑셀양식 ''양식'' 시트 추출 채택(1배치 실측 반전①)','0104'),
 ('L2100-11','2026-07-28','template_correct','templates/sq_gap_forms/12_조도관리_측정기록_L2100-11.xlsx',
  'templates/am_forms/L2100-11_조도측정_기록일지_AM.xlsx',
  '도메인 오인 교정 — 구 설계본=조명 조도(lux), AM 실물=표면 거칠기 조도(A-2 "실물 출현 시 교정" 발동). 구 설계본 참고 보관','0104'),
 ('M1200-10','2026-07-28','template_correct','templates/sq_gap_forms/15_공정자주검사_CHECK_SHEET_M1200-10.xlsx',
  'templates/am_forms/M1200-10_공정자주검사_AM.xlsx',
  '실물 출현 교체(코워크 승인) — AM MES 자주검사체크시트 엑셀양식 실측(파일명 매칭 스캔이 놓침). 구 설계본 참고 보관','0105');

-- ── ② M1200-10 공정 자주검사 — AM 실물 채택(레이아웃 = MES 3종 공통 '양식') ──
UPDATE forms SET
  template_path='templates/am_forms/M1200-10_공정자주검사_AM.xlsx',
  description='AM 실사용 MES 자주검사 체크시트 양식 채택(1배치 후속 260728, 실물 출현 교체 — 코워크 승인). 품번별 자주검사 기준·항목 작성 → 엑셀 출력.'
WHERE code='M1200-10';

DELETE FROM form_fields WHERE form_code='M1200-10';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('M1200-10','차종','차종','text','기본 정보',NULL,1,'frame'),
 ('M1200-10','품번','품번','text','기본 정보',NULL,2,'frame'),
 ('M1200-10','품명','품명','text','기본 정보',NULL,3,'frame'),
 ('M1200-10','공정명','공정명','text','기본 정보',NULL,4,'frame'),
 ('M1200-10','설비명','설비명','text','기본 정보',NULL,5,'frame'),
 ('M1200-10','원소재lot','원소재 LOT 넘버','text','기본 정보',NULL,6,'frame'),
 ('M1200-10','적입용기','적입용기','text','기본 정보',NULL,7,'frame'),
 ('M1200-10','box수량','1BOX 수량','text','기본 정보',NULL,8,'frame'),
 ('M1200-10','items_l','검사항목 1~3','grid','검사항목',NULL,9,NULL),
 ('M1200-10','items_r','검사항목 4~5','grid','검사항목',NULL,10,NULL),
 ('M1200-10','비고','비고','text','확인',NULL,11,'frame'),
 ('M1200-10','작성자','작성자','auto','확인',NULL,12,'frame');

DELETE FROM form_cell_map WHERE form_code='M1200-10';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('M1200-10','차종','차종','C2','text',1),
 ('M1200-10','품번','품번','F2','text',2),
 ('M1200-10','품명','품명','F4','text',3),
 ('M1200-10','공정명','공정명','C4','text',4),
 ('M1200-10','설비명','설비명','I2','text',5),
 ('M1200-10','원소재lot','원소재 LOT 넘버','I4','text',6),
 ('M1200-10','적입용기','적입용기','K3','text',7),
 ('M1200-10','box수량','1BOX 수량','K5','text',8),
 ('M1200-10','비고','비고','G14','text',9),
 ('M1200-10','작성자','작성자','N3','text',10);

DELETE FROM form_grid_spec WHERE form_code='M1200-10';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('M1200-10','items_l',8,3,3),
 ('M1200-10','items_r',8,3,2);

DELETE FROM form_grid_columns WHERE form_code='M1200-10';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('M1200-10','items_l','no','순','C','text',1),
 ('M1200-10','items_l','검사부위','검사 부위','D','text',2),
 ('M1200-10','items_l','검사항목','검사항목','E','text',3),
 ('M1200-10','items_r','no','순','F','text',1),
 ('M1200-10','items_r','검사부위','검사 부위','G','text',2),
 ('M1200-10','items_r','검사항목','검사항목','H','text',3);
