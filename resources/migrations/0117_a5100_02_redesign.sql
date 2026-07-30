-- ============================================================
-- Migration 0117: A5100-02 내부심사 실시 계획서 — 재설계 (7차 1차 배치 선두, 2026-07-31)
--
-- 근거: 수식충돌_스캔보고_260730.md §1 ★최우선(충돌 13건 = BB11~BB19·BI12~BI15 소계/배점
-- 수식셀 + 유일한 제출 보유). 셀맵이 0019 자동추출 잔재(등급 문자 C/B/A→AD열 비고칸,
-- 점수 숫자 5/4/0→BB/BI 수식셀, AF41/45/48 을지 일정 밖 잔재, 사장 AC2 결재 서명칸) 33건.
--
-- 기록 보전(판정 1-⑶): form_submissions 1건(#1, values=a2·a5·a7) 실재 확인 —
-- 필드 키 a1~a7·라벨·타입 전량 보존(радио/checkbox options 동일)이라 열람 역호환 무손상.
-- 유일 변경 = a1 관리번호 type auto→text (auto는 0097 규약상 활성사용자 자동채움이라
-- 관리번호 의미와 어긋남 · 제출 #1에 a1 값 없음 = 호환 영향 0).
--
-- 실측(마스터 "내부심사(품질,환경,안전) 실시 계획서(A5100-02)", 57행×65열):
--   갑지(1~29): 관리번호 E4·관련근거 O4(정적)·심사구분 Y4·심사항목 E5·우선순위 E6·
--     피심사부서 E7·심사팀장 X7 + 점수표(시스템 9~19행 11행 = 영업/개발/생산/경영/리스크/
--     인적자원/구매/검사시험/지속개선/안전/환경 · 공정 20~26행 7행 = 본사 인발/용접/도금·
--     2공장 조관/용접·3공장 절단/용접). 입력 열 = E 세부항목·I 리스크·M 성과경향·
--     Q 중대성·U 우선순위·X CSR·AA 심사등급(전부 병합 앵커 실측 확인).
--     우측 배점(AJ~BA)·소계(BB=SUM 수식)·배점순위(BF·BI 수식)는 시트 몫(A5200-04
--     "채점은 시트 몫" 선례). 공장 구분 C열(3/2/2행 비균등 병합)·심사종류 A열 = 정적 라벨.
--   을지(30~57): 헤더(33~36행)는 갑지 미러 수식(E33=E4 등) — 매핑 금지.
--     일정표(37~57행, 2일×4팀 시간표)는 시트 수기 → a6 심사일정은 의도적 unmapped
--     (계산기형 Cpk 의도적 unmapped 선례).
--
-- 멱등: DELETE+INSERT.
-- ============================================================

UPDATE forms SET
  description='재설계 — 7차 트랙(0117, 260731): 갑지 헤더(관리번호·심사구분·심사항목·피심사부서·심사팀장·심사 우선순위 설정) + 심사 점수표 grid 2종(시스템 심사 11행·공정 심사 7행 — 등급 문자 입력 열만, 우측 배점·소계 수식은 시트 몫). 심사일정(a6)은 앱 기록용 — 을지 일정표는 시트 수기(을지 헤더 = 갑지 미러 수식). 0019 잔재 셀맵 33건(수식 충돌 13건 포함) 제거 · 제출 기록 키 a1~a7 보존. IATF §9.2 내부심사.'
WHERE code='A5100-02';

DELETE FROM form_fields WHERE form_code='A5100-02';
INSERT INTO form_fields (form_code, field_key, label, type, section, options_json, sort_order, field_class) VALUES
 ('A5100-02','a1','관리번호','text','기본정보',NULL,1,'frame'),
 ('A5100-02','a2','심사구분','radio','기본정보','["정기","비정기"]',2,'frame'),
 ('A5100-02','a3','심사항목','checkbox','기본정보','["품질 시스템","제조공정","제품","환경 시스템","안전 시스템"]',3,'frame'),
 ('A5100-02','a4','피심사부서','text','심사 정보',NULL,10,'frame'),
 ('A5100-02','a5','심사팀장','text','심사 정보',NULL,11,'frame'),
 ('A5100-02','a6','심사일정','text','심사 정보',NULL,12,'frame'),
 ('A5100-02','a7','심사 우선순위 설정','textarea','심사 계획',NULL,20,'frame'),
 ('A5100-02','sys','시스템 심사 점수표','grid','심사 점수표',NULL,30,NULL),
 ('A5100-02','proc','공정 심사 점수표','grid','심사 점수표',NULL,31,NULL);

DELETE FROM form_cell_map WHERE form_code='A5100-02';
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
 ('A5100-02','a1','관리번호','E4','text',1),
 ('A5100-02','a2','심사구분','Y4','radio',2),
 ('A5100-02','a3','심사항목','E5','checkbox',3),
 ('A5100-02','a4','피심사부서','E7','text',4),
 ('A5100-02','a5','심사팀장','X7','text',5),
 ('A5100-02','a7','심사 우선순위 설정','E6','text',6);

DELETE FROM form_grid_spec WHERE form_code='A5100-02';
INSERT INTO form_grid_spec (form_code, grid_key, data_start_row, stride, max_rows) VALUES
 ('A5100-02','sys',9,1,11),
 ('A5100-02','proc',20,1,7);

DELETE FROM form_grid_columns WHERE form_code='A5100-02';
INSERT INTO form_grid_columns (form_code, grid_key, col_key, label, sheet_col, type, sort_order) VALUES
 ('A5100-02','sys','세부항목','세부항목(프로세스)','E','text',1),
 ('A5100-02','sys','리스크','리스크(상/중/하)','I','text',2),
 ('A5100-02','sys','성과경향','P성과경향(달성 여부)','M','text',3),
 ('A5100-02','sys','중대성','P중대성(상/중/하)','Q','text',4),
 ('A5100-02','sys','우선순위','우선순위','U','text',5),
 ('A5100-02','sys','csr','CSR 유무(有/無)','X','text',6),
 ('A5100-02','sys','심사등급','심사등급(A/B/C)','AA','text',7),
 ('A5100-02','proc','공정','공정','E','text',1),
 ('A5100-02','proc','리스크','리스크(상/중/하)','I','text',2),
 ('A5100-02','proc','성과경향','P성과경향(달성 여부)','M','text',3),
 ('A5100-02','proc','중대성','P중대성(상/중/하)','Q','text',4),
 ('A5100-02','proc','우선순위','우선순위','U','text',5),
 ('A5100-02','proc','csr','CSR 유무(有/無)','X','text',6),
 ('A5100-02','proc','심사등급','심사등급(A/B/C)','AA','text',7);

DELETE FROM form_change_log WHERE migration='0117';
INSERT INTO form_change_log (form_code, changed_on, change_type, old_value, new_value, reason, migration) VALUES
 ('A5100-02','2026-07-31','cellmap_redesign','0019 잔재 셀맵 33건 — 등급 문자(AD열 비고칸)·점수 숫자(BB/BI 소계·배점 수식셀 13건)·AF열 잔재·사장 결재칸','갑지 헤더 6매핑(a1 E4·a2 Y4·a3 E5·a4 E7·a5 X7·a7 E6) + 점수표 grid 2종(sys 9~19·proc 20~26, 입력 열 E/I/M/Q/U/X/AA)',
  '수식 충돌 전수 스캔 ★최우선(충돌 13 + 유일 제출 보유). 필드 키 a1~a7 보존 = 제출 #1 열람 역호환(판정 1-⑶) · a6 의도적 unmapped(을지 일정표 시트 수기) · 배점·소계는 시트 몫','0117');
