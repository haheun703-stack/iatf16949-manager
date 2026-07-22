-- ============================================================
-- Migration 0092: form_examples 판정/검토결과 6건 작성요령(why_note) 보정 (2026-07-22)
-- [예시 검수 후속] — 12번 지시서 P6/P7 form_examples 114건 fact 내용 검수 결과.
--
-- 감사 결과(라이브 DB 114건 전수): 구조는 클린(orphan 0·field_class NULL 0·미래날짜 0).
-- 유일 갭 = 판정/검토결과 fact 필드 6건이 why_note 미보유(5건 NULL + M1200-10 1건 '예시' 키워드
--   없음). 이 필드들은 select 타입이라 예시복제 차단은 면제(form-validation.ts)이지만,
--   AnswerPanel '작성 방법' 탭은 why_note 있는 필드만 표시(line 178) → 판정 근거 안내가 누락됐음.
--   형제 fact 필드(L2100-03 판정 등)와 동일하게 '※예시 — 실제 판정' 성격 요령을 채워 일관화.
--
-- ⚠️내용은 판정 도출 '방법' 안내(공정 무관 일반 요령)일 뿐 도메인 데이터 주장 아님 — §0.7 부합.
--   양식별 실제 판정기준·예시값 자체의 도메인 검수는 여전히 사람(품질/사장님) 몫.
-- 멱등: 조건 UPDATE(why_note NULL / '예시' 미포함만 대상 → 재적용 시 0행). BEGIN/COMMIT 없음.
-- ============================================================

-- K1200-07 외주 ISIR·검사협정 접수대장 — 검토결과(승인/조건부/반려)
UPDATE form_examples
SET why_note = 'ISIR 검토 결론 ※예시 — 서류·성적서 확인 후 승인/조건부/반려 중 실제 결과를 선택'
WHERE form_code='K1200-07' AND field_key='검토결과' AND (why_note IS NULL OR why_note='');

-- L2100-07 수입검사 관리대장 — 판정(합격/불합격)
UPDATE form_examples
SET why_note = '수입검사 판정 ※예시 — 측정치가 규격 내면 합격. 실제 검사 결과로 선택'
WHERE form_code='L2100-07' AND field_key='판정' AND (why_note IS NULL OR why_note='');

-- L4102-02 양산단계 공정능력 산출 — 판정(양호≥1.33 / 관리 / 부족)
UPDATE form_examples
SET why_note = 'Cpk 판정 ※예시 — 산출한 Cpk 값 구간으로 선택(≥1.33 양호). 실제 산출값 기준'
WHERE form_code='L4102-02' AND field_key='판정' AND (why_note IS NULL OR why_note='');

-- M1200-08 용접장 기준 팁 교환 주기 평가서 — 교환 판정(정상/교환)
UPDATE form_examples
SET why_note = '교환 판정 ※예시 — 현재 타수가 교환주기 도달 시 교환. 실제 타수로 판정'
WHERE form_code='M1200-08' AND field_key='판정' AND (why_note IS NULL OR why_note='');

-- M1200-11 브레이징 조건관리 CHECK SHEET — 판정(적합/부적합)
UPDATE form_examples
SET why_note = '조건 판정 ※예시 — 실측이 관리범위 내면 적합. 실제 기록으로 판정'
WHERE form_code='M1200-11' AND field_key='판정' AND (why_note IS NULL OR why_note='');

-- M1200-10 공정 자주검사 CHECK SHEET — 판정(합격/불합격), 기존 노트에 '예시' 성격 보강
UPDATE form_examples
SET why_note = '측정 결과 대비 판정(기준 내=합격) ※예시 — 실제 판정을 선택'
WHERE form_code='M1200-10' AND field_key='판정' AND why_note NOT LIKE '%예시%';
