-- ============================================================
-- Migration 0049: 구판 J1101-01(공정 FMEA 4판 SHEET) 폐기 → 신판 모듈로 대체
--
-- 배경: 회사가 실제 고객사에 제출하는 공정 FMEA = 신판(AIAG-VDA 7-step).
--   신판 전용 모듈(0047_fmea, 사이드바 '공정 FMEA')이 구조→기능→고장→리스크(S·O·D·AP 자동)
--   →최적화 + 공식 xlsx(J-1101 REV.6 신판 시트) 출력까지 담당.
--   구판 J1101-01(0014/0027/0028, 셀맵 24·필드 17)은 옛 4판 포맷을 출력 → 실제 제출본과 불일치.
--   → 구판을 소프트 폐기(deprecated)로 표시하고, 작성/출력 진입 시 신판 모듈('fmea')로 안내.
--   레코드/셀맵은 이력 보존 위해 삭제하지 않음(되돌릴 수 있는 소프트 폐기).
--
-- deprecated: 1=폐기. replacement_page: 렌더러가 안내할 페이지 id(uiStore PageId).
-- 일반 컬럼이라 다른 양식의 향후 폐기에도 재사용 가능.
-- ============================================================

ALTER TABLE forms ADD COLUMN deprecated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE forms ADD COLUMN deprecated_note TEXT;
ALTER TABLE forms ADD COLUMN replacement_page TEXT;

UPDATE forms
   SET deprecated = 1,
       deprecated_note = '신판(AIAG-VDA 7-step) 공정 FMEA로 대체되었습니다. 좌측 ''공정 FMEA'' 메뉴에서 작성·출력하세요. (구판 4판 SHEET은 실제 제출본과 불일치)',
       replacement_page = 'fmea',
       name = '공정 FMEA (구판 4판 — 신판으로 대체됨)'
 WHERE code = 'J1101-01';
