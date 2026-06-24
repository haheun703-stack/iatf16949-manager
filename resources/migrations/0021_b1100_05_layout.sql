-- ============================================================
-- Migration 0021: B1100-05 「불량유출 봉쇄 작업표」 표준화 — 8D 봉쇄(D3) 분배 대상
--
-- 8D 흐름에서 봉쇄(containment)는 B1100-01(부적합 발생) 직후 단계. 봉쇄 작업표가
-- form_fields/layout 전무한 빈 껍데기였음 → 표준화하여 케이스 → B1100-05 작성본
-- 자동생성(case-handlers DISTRIBUTION 에 B1100-05 엔트리 동시 추가).
--
-- 원본: 「B-1100 부적합품 관리 규정」 별지 '불량유출 봉쇄 작업표 (B1100-05)'(48×15).
--   봉쇄범위(9장소 × 수량/확인팀/담당/검증자) 2D 매트릭스는 현 렌더러 미지원 →
--   봉쇄 핵심을 선형 필드셋으로 정의(실용형). B-1100 → 6_6(격리/식별) 점등 기여.
--
-- 멱등: form_fields DELETE 후 INSERT(현재 B1100-05 필드 0건).
-- ============================================================

DELETE FROM form_fields WHERE form_code = 'B1100-05';

INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
-- 기본정보
('B1100-05','a1','작업번호','auto','기본정보','CTN-2026-XXXX (자동부여)',NULL,NULL,0,NULL,1),
('B1100-05','a4','일자','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('B1100-05','a2','팀명','text','기본정보','봉쇄 수행 팀',NULL,NULL,0,NULL,3),
('B1100-05','a3','봉쇄책임자','text','기본정보','책임자명',NULL,NULL,0,NULL,4),
('B1100-05','a5','모델명','text','기본정보','차종/모델',NULL,NULL,0,NULL,5),
('B1100-05','a6','품 번','text','기본정보','품번',NULL,NULL,0,NULL,6),
('B1100-05','a7','품 명','text','기본정보','제품명',NULL,NULL,0,NULL,7),
('B1100-05','a8','부적합 내용','textarea','기본정보','봉쇄 대상 부적합 현상',NULL,NULL,0,NULL,8),
-- 불량유출 봉쇄 범위
('B1100-05','b1','봉쇄 범위 및 발견수량','textarea','불량유출 봉쇄 범위',
 '장소별(입고자재창고/작업공정/조립공정/완성품보관/부적합품보관/협력업체/운송중/고객입고품/고객IN-LINE) 점검 결과·발견수량',NULL,NULL,1,
 '제품 불량유출 봉쇄범위를 장소별로 점검한 결과를 정리. 입고 자재창고/작업공정/조립공정/완성품 보관/부적합품 보관/협력업체/운송중/고객 입고품/고객 IN-LINE 각 위치의 예상 부적합 수량과 발견 수량, 확인팀/담당을 서술.',10),
('B1100-05','b2','총 발견 수량','number','불량유출 봉쇄 범위','전체 발견 부적합 수량',NULL,'EA',0,NULL,11),
-- 봉쇄 방법 (분류·식별)
('B1100-05','c1','의심자재 격리 위치','text','봉쇄 방법 (분류·식별)','격리 장소(가능한 경우 규정)',NULL,NULL,0,NULL,20),
('B1100-05','c2','부적합품 분류 방법','text','봉쇄 방법 (분류·식별)','예: 육안, 게이지, 결합 상대물',NULL,NULL,0,NULL,21),
('B1100-05','c3','부적합품 분류 기준','text','봉쇄 방법 (분류·식별)','표준 대비 명확한 합부판정 기준',NULL,NULL,0,NULL,22),
('B1100-05','c4','적합품 식별 방법','text','봉쇄 방법 (분류·식별)','예: 마킹, 태그, 식별표 부착',NULL,NULL,0,NULL,23),
('B1100-05','c5','부적합품 식별 방법','text','봉쇄 방법 (분류·식별)','예: 적색 페인트 표시, 불량통 보관',NULL,NULL,0,NULL,24);

-- 레이아웃(배치 설계도)
UPDATE forms SET layout_json = '{
  "blocks": [
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "a1" }, { "fieldKey": "a4" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "a2" }, { "fieldKey": "a3" } ] },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "a5" }, { "fieldKey": "a6" }, { "fieldKey": "a7" } ] },
    { "type": "full", "fieldKey": "a8" },
    { "type": "section", "title": "불량유출 봉쇄 범위" },
    { "type": "full", "fieldKey": "b1" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "b2" }, { "fieldKey": "c1" } ] },
    { "type": "section", "title": "봉쇄 방법 (분류·식별)" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "c2" }, { "fieldKey": "c3" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "c4" }, { "fieldKey": "c5" } ] }
  ]
}'
WHERE code = 'B1100-05';
