-- ============================================================
-- Migration 0095: P9 1차 검수 반영 4건 (2026-07-22 오후) — 코워크 회신
-- [분류/예시 교정] — 조작차단을 "강한데 억울한 사람 없는" 최종형으로.
--
-- 차단 규칙 재정정은 코드(shared/form-validation.ts)에서: fact 는 유지하되 완전일치 차단은
--   다중 측정값·LOT·시리얼 라벨만(품번·수량·품명은 실존값 우연일치 오차단 방지로 제외).
--   이 마이그는 그에 맞춘 데이터 교정.
--
-- ① B1100-01(부적합품 발생 통보서) 품명·품번&규격 = frame→fact
--    부적합 통보서에서 "어느 품목이 불량인가"는 건별 사실 → fact(단, 위 규칙상 차단은 제외).
-- ③ D1100-03(제품 안전교육 보고서) 참석인원 = frame→fact  (회차별 사실, 수량류라 차단 제외)
-- ② K1200-03·K1200-05 예시 부서명 '구매팀' → '영업/자재팀'  (구매팀=조직개편으로 흡수, 신 조직 정본)
-- ④ 작성자·평가자류 이름 예시 제거(이름을 예시로 학습시키지 않음). auto 통일은 체계적 후속 스윕.
-- (부수) D1100-03 라벨 오타 '훈련 걀과'→'훈련 결과' (form_fields 라벨만, 원본 시트 불변).
--
-- 멱등: 전부 조건 UPDATE/DELETE(재적용 시 0행). BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

-- ── ① B1100-01 품명·품번&규격 frame→fact (차단은 규칙상 제외) ──
UPDATE form_fields SET field_class='fact'
WHERE form_code='B1100-01' AND field_key IN ('i3','i5') AND field_class='frame';

-- ── ③ D1100-03 참석인원 frame→fact ──
UPDATE form_fields SET field_class='fact'
WHERE form_code='D1100-03' AND field_key='참석인원' AND field_class='frame';

-- 새 fact 필드의 예시 요령 보강(※예시 — 실제 값. 규칙상 차단 대상은 아님)
UPDATE form_examples SET why_note='이 건의 불량 품목 ※예시 — 실제 품명을 쓰세요'
WHERE form_code='B1100-01' AND field_key='i3';
UPDATE form_examples SET why_note='불량 품번·규격 ※예시 — 실제 품번을 쓰세요'
WHERE form_code='B1100-01' AND field_key='i5';
UPDATE form_examples SET why_note='참석 인원 ※예시 — 회차별 실제 인원'
WHERE form_code='D1100-03' AND field_key='참석인원';

-- ── ② 예시 부서명 '구매팀' → '영업/자재팀' (신 조직 정본) ──
UPDATE form_examples SET example_value='영업/자재팀'
WHERE form_code='K1200-03' AND field_key='부서명' AND example_value='구매팀';
UPDATE form_examples SET example_value='영업/자재팀'
WHERE form_code='K1200-05' AND field_key='소속' AND example_value='구매팀';

-- ── ④ 작성자·평가자류 이름 예시 제거(이름 학습 방지) ──
DELETE FROM form_examples WHERE form_code='L3101-01' AND field_key IN ('작성','검토');
DELETE FROM form_examples WHERE form_code='K1200-03' AND field_key='평가자';
DELETE FROM form_examples WHERE form_code='K1200-05' AND field_key='성명';

-- ── (부수) D1100-03 라벨 오타 교정: '걀과'→'결과' (form_fields 라벨만) ──
UPDATE form_fields SET label=REPLACE(label,'걀과','결과')
WHERE form_code='D1100-03' AND field_key='훈련걀과효과성파악' AND label LIKE '%걀과%';
