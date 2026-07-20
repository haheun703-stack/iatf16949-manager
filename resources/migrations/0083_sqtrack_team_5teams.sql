-- ============================================================
-- Migration 0083: sqtrack_items.team 레거시 TeamId → 5팀 교정 (2026-07-20)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음]
--
-- 증상 = SQ 심사 트랙 화면 크래시(Cannot read properties of undefined 'tintBg',
-- 사장님 실사용 보고). 원인 = 0069 시드의 team 값이 7팀 시절 TeamId 로 남아
-- 5팀 재편(765d726) 때 이 테이블만 누락 — gumae 2건·saengki 1건이 렌더러
-- teamTheme() 미해석. 교정 매핑 = 재편 규칙 그대로: 구매→영업/자재(jajae),
-- 생산기술→생산(saengsan), (안전망) 영업→jajae·총무→gwanli.
-- 재발 방지 세트: 렌더러 teamTheme 레거시 흡수+중립 폴백, 정합성 점검에
-- 'sqtrack 팀 ID' 검사 추가(같은 커밋).
-- 멱등: 조건 UPDATE — 재적용 시 대상 0행.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ⚠️sqtrack_items.code/status 는 불변(함정 메모 ⑤) — team 컬럼만 갱신.
-- ============================================================

UPDATE sqtrack_items SET team = 'jajae'    WHERE team = 'gumae';
UPDATE sqtrack_items SET team = 'saengsan' WHERE team = 'saengki';
UPDATE sqtrack_items SET team = 'jajae'    WHERE team = 'yeongup';
UPDATE sqtrack_items SET team = 'gwanli'   WHERE team = 'chongmu';
