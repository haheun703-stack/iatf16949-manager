-- ============================================================
-- Migration 0096: P9 경계 케이스 3건 fact→frame 교정 (2026-07-23) — 코워크 회신·사장님 확정
-- [분류 교정] — 12번 지시서 P9. 0094 (A) 오분류 교정의 후속(경계 케이스분).
--
-- 0085 휴리스틱이 '측정/실적/결과' 키워드로 fact 판정했으나, 아래 4개 필드(3개 라벨)는
-- 값(측정치·LOT·시리얼)이 아니라 제목·구획·서술 라벨 → frame 이 정확. 코워크 권고 '전부 frame',
-- 사장님 2026-07-23 확정.
--   · 측정시스템 평가          = J1100-01(E40)·J1100-06(E30) MSA 양식 구획 제목
--   · 연간설비 보전계획 및 실적표 = L1100-23(AT15) 양식 표제
--   · 결과는                  = L1100-06(G14) 서술 라벨(값 아님)
-- fact→frame 이므로 조작차단 대상에서 빠질 뿐(제목이라 애초에 오차단 위험만 있던 것) — 누락 위험 없음.
--
-- 멱등: field_class='fact' 조건 UPDATE(재적용 시 0행). BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

-- ── 측정시스템 평가 (MSA 구획 제목) ──
UPDATE form_fields SET field_class='frame'
WHERE form_code IN ('J1100-01','J1100-06') AND field_key='측정시스템평가' AND field_class='fact';

-- ── 연간설비 보전계획 및 실적표 (표제) ──
UPDATE form_fields SET field_class='frame'
WHERE form_code='L1100-23' AND field_key='연간설비보전계획및실적표' AND field_class='fact';

-- ── 결과는 (서술 라벨) ──
UPDATE form_fields SET field_class='frame'
WHERE form_code='L1100-06' AND field_key='결과는' AND field_class='fact';
