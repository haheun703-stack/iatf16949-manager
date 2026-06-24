-- ============================================================
-- Migration 0020: B2100-03 「개선 대책서」 표준화 — 8D 분배 대상 확대
--
-- 8D 분배 체인: B1100-01(부적합 발생) → B2100-01(시정/예방조치 요구) → B2100-03(개선 대책서).
--   B2100-03 은 체인의 마지막 고리였으나 form_fields/layout_json 이 전무한 빈 껍데기 →
--   분배엔진이 작성본을 만들 수 없었음. 본 마이그레이션으로 표준화하여 케이스 → B2100-03
--   작성본 자동생성이 가능해진다(case-handlers DISTRIBUTION 에 B2100-03 엔트리 동시 추가).
--
-- 원본: 「B-2100 시정조치 규정」 별지 '개선 대책서 (B2100-03)' 시트(92행×47열, 풀 8D 보고서).
--   현 렌더러(FormDocument: grid/section/full)는 2D 매트릭스·사진 전후·월별 그리드를
--   픽셀충실 재현 불가 → 분배에 의미있는 8D 핵심 항목만 선형 필드셋으로 정의(실용형).
--
-- 멱등: form_fields 는 재실행 안전을 위해 DELETE 후 INSERT(현재 B2100-03 필드 0건).
-- ============================================================

-- 기존 필드 제거(멱등) 후 재시드
DELETE FROM form_fields WHERE form_code = 'B2100-03';

INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
-- 기본정보
('B2100-03','a1','발행번호','auto','기본정보','IMP-2026-XXXX (자동부여)',NULL,NULL,0,NULL,1),
('B2100-03','a2','작성일자','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('B2100-03','a3','보고자','auto','기본정보','로그인 사용자',NULL,NULL,0,NULL,3),
('B2100-03','a4','차종(기종)','text','기본정보','적용 차종/기종',NULL,NULL,0,NULL,4),
('B2100-03','a5','품 명','text','기본정보','제품명',NULL,NULL,0,NULL,5),
('B2100-03','a6','품 번','text','기본정보','품번',NULL,NULL,0,NULL,6),
('B2100-03','a7','개선 TFT','text','기본정보','TFT 구성원',NULL,NULL,0,NULL,7),
-- 문제 정의
('B2100-03','p1','문제부위 및 불량현상','textarea','문제 정의','문제부위와 불량현상을 구체적으로 기술',NULL,NULL,1,
 '연결된 부적합/케이스 정보를 바탕으로 문제부위와 불량현상을 구체적으로 기술. 차종/품명/품번 맥락 반영.',10),
('B2100-03','p2','발생처/발생공장','text','문제 정의','예: 본사 2공장(AM) 용접라인',NULL,NULL,0,NULL,11),
('B2100-03','p3','발생일자','date','문제 정의',NULL,NULL,NULL,0,NULL,12),
('B2100-03','p4','과거이력(발생건수)','textarea','문제 정의','전년도/금년도, 월별 발생건수',NULL,NULL,0,NULL,13),
('B2100-03','p5','발생원인(고품분석)','textarea','문제 정의','5-Why 등으로 근본 발생원인 도출',NULL,NULL,1,
 '5-Why로 발생원인(고객품질분석)을 단계별 추적해 근본원인 도출. 인발/가공/용접 공정 컨텍스트 반영.',14),
('B2100-03','p6','유출원인','textarea','문제 정의','왜 후공정/출하검사에서 걸러지지 못했는지',NULL,NULL,1,
 '검출 실패(유출) 원인 분석. 후공정/출하검사가 불량을 걸러내지 못한 이유를 단계별로 기술.',15),
-- 개선 대책 (8D)
('B2100-03','d1','봉쇄(단기) 대책','textarea','개선 대책','즉시 시행 봉쇄/선별/격리 등',NULL,NULL,1,
 '즉시 시행할 봉쇄/단기 대책(선별, 격리, 재검사, 고객통보 등)을 구체적으로 기술.',20),
('B2100-03','d2','발생원 장기대책','textarea','개선 대책','발생원인 제거 근본 재발방지 대책',NULL,NULL,1,
 '발생원인 제거를 위한 근본 재발방지 대책. 표준/FMEA/관리계획서 개정 항목 명시.',21),
('B2100-03','d3','유출원 장기대책','textarea','개선 대책','검출력 강화 장기 대책',NULL,NULL,1,
 '검출력 강화 장기 대책(검사방법 개선, 포카요케, 자동화 등)을 구체적으로 기술.',22),
-- 개선 내용 및 유효성 확인
('B2100-03','g1','발생원 개선내용(전·후)','textarea','개선 내용 및 유효성','개선 전/후 내용',NULL,NULL,0,NULL,30),
('B2100-03','g2','유출원 개선내용(전·후)','textarea','개선 내용 및 유효성','개선 전/후 내용',NULL,NULL,0,NULL,31),
('B2100-03','v1','개선효과 유효성','radio','개선 내용 및 유효성',NULL,'["YES","NO"]',NULL,0,NULL,32),
('B2100-03','v2','표준류 반영','checkbox','개선 내용 및 유효성',NULL,'["관리계획서","작업표준서","FMEA","검사기준서","작업요령서"]',NULL,0,NULL,33),
('B2100-03','v3','수평전개(라인/일정)','text','개선 내용 및 유효성','수평전개 대상 라인 / 완료 일정',NULL,NULL,0,NULL,34);

-- 레이아웃(배치 설계도) — grid/section/full 블록
UPDATE forms SET layout_json = '{
  "blocks": [
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "a1" }, { "fieldKey": "a2" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "a3" }, { "fieldKey": "a4" } ] },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "a5" }, { "fieldKey": "a6" }, { "fieldKey": "a7" } ] },
    { "type": "section", "title": "문제 정의" },
    { "type": "full", "fieldKey": "p1" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "p2" }, { "fieldKey": "p3" } ] },
    { "type": "full", "fieldKey": "p4" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "p5" }, { "fieldKey": "p6" } ] },
    { "type": "section", "title": "개선 대책 (8D)" },
    { "type": "full", "fieldKey": "d1" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "d2" }, { "fieldKey": "d3" } ] },
    { "type": "section", "title": "개선 내용 및 유효성 확인" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "g1" }, { "fieldKey": "g2" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "v1" }, { "fieldKey": "v3" } ] },
    { "type": "full", "fieldKey": "v2" }
  ]
}'
WHERE code = 'B2100-03';

-- 8D 체인 백링크 완성(B2100-01 → B2100-03 의 역방향)
UPDATE forms SET prev_form_code = 'B2100-01' WHERE code = 'B2100-03';
