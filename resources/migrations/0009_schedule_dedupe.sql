-- ============================================================
-- Migration 0009: schedule_items 중복 시드 정리
--
-- 0008 시드가 비정상 종료(WAL 미커밋)로 여러 번 재실행되며 생긴
-- 동일 일정 중복 행을 제거. 제목별 최소 id 한 건만 남긴다.
-- 멱등: 중복이 없으면 아무것도 삭제하지 않음(재실행 안전).
-- ============================================================

DELETE FROM schedule_items
WHERE id NOT IN (
  SELECT MIN(id) FROM schedule_items GROUP BY title
);
