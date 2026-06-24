-- ============================================================
-- Migration 0022: H3200-02 「고객불만 대응 조치 결과 보고서」 표준화 — 고객불만 분배 대상
--
-- 고객불만(VOC) 대응의 단일 결과 보고서. form_fields/layout 전무한 빈 껍데기였음 →
-- 표준화하여 고객 귀책 케이스 → H3200-02 작성본 자동생성. H-3200 → 6_7(품질실적/개선) 점등 기여.
--
-- 원본: 「H-3200 고객 불만처리 규정」 별지 '고객불만 대응 조치 결과 보고서(갑지/을지)'(76×58).
--   6개 섹션(접수이력/조치/대응결과/조사결과/협의/결론) 단일레코드 → 실용 선형 필드셋.
--   불량 LOT 칸 존재 → 0021/분배의 case_facts.lot 가 i3 으로 흐름(LOT 입력 경로 시너지).
--   ※ H3200-01(접수 대응 현황 보고서)은 다행 관리대장(register)이라 단일레코드 폼 모델
--      부적합 → 표준화 제외(강제 시 양식 성격 왜곡).
--
-- 멱등: form_fields DELETE 후 INSERT(현재 H3200-02 필드 0건).
-- ============================================================

DELETE FROM form_fields WHERE form_code = 'H3200-02';

INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
-- 기본정보
('H3200-02','a1','문서번호','auto','기본정보','CCR-2026-XXXX (자동부여)',NULL,NULL,0,NULL,1),
('H3200-02','a2','작성일','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('H3200-02','a3','작성자','auto','기본정보','로그인 사용자',NULL,NULL,0,NULL,3),
-- 1. 고객불만 접수 이력
('H3200-02','r1','고객불만 접수일자','date','1. 고객불만 접수 이력',NULL,NULL,NULL,0,NULL,10),
('H3200-02','r2','접수유형','radio','1. 고객불만 접수 이력',NULL,'["유선","이메일","FAX","기타"]',NULL,0,NULL,11),
('H3200-02','r3','대응일자','date','1. 고객불만 접수 이력',NULL,NULL,NULL,0,NULL,12),
('H3200-02','r4','대응장소(선별/협의)','text','1. 고객불만 접수 이력','선별 및 협의 장소',NULL,NULL,0,NULL,13),
('H3200-02','r5','고객불만 제기처','text','1. 고객불만 접수 이력','고객사명',NULL,NULL,0,NULL,14),
('H3200-02','r6','고객 담당자','text','1. 고객불만 접수 이력','담당자명',NULL,NULL,0,NULL,15),
-- 2. 고객불만 내용
('H3200-02','m1','고객불만 내용(부적합 내용)','textarea','2. 고객불만 내용','고객이 제기한 불만/부적합 현상',NULL,NULL,0,NULL,20),
-- 3. 고객불만 대응 결과
('H3200-02','g1','선별 수량','number','3. 고객불만 대응 결과',NULL,NULL,'EA',0,NULL,30),
('H3200-02','g2','불량 발생수량','number','3. 고객불만 대응 결과',NULL,NULL,'EA',0,NULL,31),
('H3200-02','g3','불량 발생률(PPM)','text','3. 고객불만 대응 결과','PPM',NULL,NULL,0,NULL,32),
('H3200-02','g4','대응 상세 내용','textarea','3. 고객불만 대응 결과','선별/대응 경과를 구체적으로',NULL,NULL,1,
 '고객불만 대응 경과(선별 진행, 고객 협의, 임시조치 등)를 시간순으로 구체적으로 정리.',33),
-- 4. 고객불만 대응 조사 결과
('H3200-02','i1','불량발생 귀책처','text','4. 고객불만 대응 조사 결과','귀책 업체/공장',NULL,NULL,0,NULL,40),
('H3200-02','i2','불량발생 공정','text','4. 고객불만 대응 조사 결과','발생 공정',NULL,NULL,0,NULL,41),
('H3200-02','i3','불량 LOT','text','4. 고객불만 대응 조사 결과','불량 LOT NO',NULL,NULL,0,NULL,42),
('H3200-02','i4','불량유출 작업자','text','4. 고객불만 대응 조사 결과','유출 작업자',NULL,NULL,0,NULL,43),
('H3200-02','i5','불량 발생 원인','textarea','4. 고객불만 대응 조사 결과','5-Why 등 근본 발생원인',NULL,NULL,1,
 '5-Why로 불량 발생 근본원인을 도출. 고객불만 내용/귀책 공정 맥락 반영.',44),
('H3200-02','i6','불량 유출 원인','textarea','4. 고객불만 대응 조사 결과','검출 실패(유출) 원인',NULL,NULL,1,
 '왜 사내 검사/출하검사에서 걸러지지 못하고 고객까지 유출됐는지 검출 실패 원인을 분석.',45),
-- 5. 협의 · 최종 결론
('H3200-02','c1','고객사 요청사항','textarea','5. 협의 · 최종 결론','고객 요청/합의 사항',NULL,NULL,0,NULL,50),
('H3200-02','c2','고객사 대책제출 일정','date','5. 협의 · 최종 결론',NULL,NULL,NULL,0,NULL,51),
('H3200-02','c3','고객불만 개선방안','textarea','5. 협의 · 최종 결론','재발방지 개선방안',NULL,NULL,1,
 '고객불만 재발방지를 위한 개선방안(발생/유출 양면). 표준/검사/공정 개정 항목 명시.',52);

-- 레이아웃(배치 설계도)
UPDATE forms SET layout_json = '{
  "blocks": [
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "a1" }, { "fieldKey": "a2" }, { "fieldKey": "a3" } ] },
    { "type": "section", "title": "1. 고객불만 접수 이력" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "r1" }, { "fieldKey": "r2" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "r3" }, { "fieldKey": "r4" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "r5" }, { "fieldKey": "r6" } ] },
    { "type": "section", "title": "2. 고객불만 내용" },
    { "type": "full", "fieldKey": "m1" },
    { "type": "section", "title": "3. 고객불만 대응 결과" },
    { "type": "grid", "columns": 3, "cells": [ { "fieldKey": "g1" }, { "fieldKey": "g2" }, { "fieldKey": "g3" } ] },
    { "type": "full", "fieldKey": "g4" },
    { "type": "section", "title": "4. 고객불만 대응 조사 결과" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "i1" }, { "fieldKey": "i2" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "i3" }, { "fieldKey": "i4" } ] },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "i5" }, { "fieldKey": "i6" } ] },
    { "type": "section", "title": "5. 협의 · 최종 결론" },
    { "type": "full", "fieldKey": "c1" },
    { "type": "grid", "columns": 2, "cells": [ { "fieldKey": "c2" } ] },
    { "type": "full", "fieldKey": "c3" }
  ]
}'
WHERE code = 'H3200-02';
