-- ============================================================
-- Migration 0091: field_class auto 교정(M1) + executive team_dept 교정 (2026-07-21)
-- [분류 교정] — 코드 검수(4에이전트) 발견 수정
--
-- ■ M1(medium): 0085 fact 휴리스틱이 '작성자·검사자·확인자·서명' 라벨의 **auto 타입** 필드까지
--   fact 로 분류 → auto 는 시스템 자동채움(입력 불가 disabled)이라 fact 공란 차단에 걸리면
--   해결 불가(defaultAuthor 미설정 신규 설치에서 H3200-02·B1100-01 저장 불가). P7(0089/0090)은
--   auto 작성자를 frame 으로 했으므로 그 결정에 맞춰 전 양식 교정. auto = 절대 사람 입력 fact 아님.
-- ■ LOW(아바타): executive 'team_dept=경영지원'이 normalizeTeam 미매칭(deptKeys=경영지원팀) →
--   UserSwitcher 아바타 회색. '경영지원팀'으로 교정(gwanli 색 매칭).
-- 멱등: 조건 UPDATE(재적용 시 대상 0행). BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

UPDATE form_fields SET field_class='frame' WHERE type='auto' AND field_class='fact';

UPDATE app_users SET team_dept='경영지원팀' WHERE team_dept='경영지원';
