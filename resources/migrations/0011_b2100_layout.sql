-- ============================================================
-- Migration 0011: B2100-01 시정/예방조치 요구서 레이아웃(설계도) 주입
--
-- 0010에서 만든 범용 렌더러(FormDocument)를 그대로 재사용해
-- 두 번째 실양식을 표준형으로 띄운다. form_fields는 이미 존재(seed),
-- 여기서는 layout_json(배치 설계도)만 채운다.
--   상단 2열 그리드(발행정보) → 발행구분(전폭 체크박스)
--   → §부적합 내용(부적합 사항 전폭 + 규격/회신일 2열)
--   → §조치 내용(원인분석·재발방지대책 전폭)
-- ============================================================

UPDATE forms SET layout_json = '{
  "blocks": [
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "s1" }, { "fieldKey": "s2" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "s3" }, { "fieldKey": "s4" } ] },
    { "type": "grid", "columns": 1, "cells": [ { "fieldKey": "s5" } ] },
    { "type": "section", "title": "부적합 내용" },
    { "type": "full", "fieldKey": "s6" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "s7" }, { "fieldKey": "s8" } ] },
    { "type": "section", "title": "조치 내용 (수신처 작성)" },
    { "type": "full", "fieldKey": "s9" },
    { "type": "full", "fieldKey": "s10" }
  ]
}'
WHERE code = 'B2100-01';
