-- ============================================================
-- Migration 0010: 양식 레이아웃(설계도) + B1100-01 실양식 정합
--
-- "양식 그리는 기계 + 설계도" 구조의 데이터 기반.
--   forms.layout_json = 블록 배열(section/grid/full)로 표현한 양식 배치 설계도.
--   범용 렌더러(FormDocument)가 이 설계도를 읽어 실제 종이 양식처럼 그린다.
--   향후 405개 양식은 AI가 이 layout_json을 생성 → 같은 렌더러가 모두 그림.
-- ============================================================

-- 1) forms에 레이아웃 설계도 컬럼(없으면 auto-layout 폴백)
ALTER TABLE forms ADD COLUMN layout_json TEXT;

-- 2) B1100-01 부적합품 발생 통보서: 실양식에 있으나 누락됐던 하단 선택 항목 추가
INSERT OR IGNORE INTO form_fields
  (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order)
VALUES
  ('B1100-01','p1','통보 방법','radio','조치 및 요구사항',NULL,'["전화","우편","FAX","E-Mail"]',NULL,0,NULL,30),
  ('B1100-01','p3','공제 여부','radio','조치 및 요구사항',NULL,'["공제","비공제","보류","소재대체"]',NULL,0,NULL,32);

-- 3) 기존 c4 처리방법 → 실양식의 '부적합 처리'로 정합(섹션/라벨/선택지/순서)
UPDATE form_fields
SET label = '부적합 처리',
    section = '조치 및 요구사항',
    options_json = '["특채","선별","수리","재작업","폐기"]',
    sort_order = 31
WHERE form_code = 'B1100-01' AND field_key = 'c4';

-- 4) B1100-01 레이아웃 설계도(엑셀 양식 기준: 발행번호 전폭 → 3열 그리드 ×3 → 섹션별 전폭/선택행렬)
UPDATE forms SET layout_json = '{
  "blocks": [
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "h1", "colSpan": 3 } ] },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "h2" }, { "fieldKey": "h3" }, { "fieldKey": "h4" } ] },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "i1" }, { "fieldKey": "i2" }, { "fieldKey": "i3" } ] },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "i4" }, { "fieldKey": "i5" }, { "fieldKey": "i6" } ] },
    { "type": "section", "title": "부적합 내용" },
    { "type": "full", "fieldKey": "c1" },
    { "type": "full", "fieldKey": "c2" },
    { "type": "section", "title": "조사 내용" },
    { "type": "full", "fieldKey": "c3" },
    { "type": "section", "title": "조치 및 요구사항" },
    { "type": "grid", "columns": 1, "cells": [ { "fieldKey": "p1" }, { "fieldKey": "c4" }, { "fieldKey": "p3" } ] }
  ]
}'
WHERE code = 'B1100-01';
