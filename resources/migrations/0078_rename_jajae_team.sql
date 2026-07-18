-- ============================================================
-- Migration 0078: 팀 표시명 교정 — '자재/출하팀' → '영업/자재팀' (2026-07-19 사장님 확정)
-- [데이터 전용] 0077 시드 문구 교정은 새 마이그레이션의 UPDATE로(0071 §3 선례).
-- team-theme deptKeys 는 두 표기 모두 흡수하므로 기능 영향 없음 — 표시 일관성 목적.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

UPDATE recurring_obligations
SET title = '일일 마감보고 — 영업/자재팀', updated_at = datetime('now')
WHERE title = '일일 마감보고 — 자재/출하팀';

UPDATE recurring_obligations
SET owner = '영업/자재팀', updated_at = datetime('now')
WHERE owner = '자재/출하팀';
