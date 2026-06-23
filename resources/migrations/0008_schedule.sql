-- ============================================================
-- Migration 0008: 일정표 (노션형 스케줄 DB)
--
-- Stage 4 of v5: 심사/내부심사/교육/문서/시정조치 일정을
-- 보드(칸반)·캘린더·타임라인 3가지 뷰로 관리.
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '기타',   -- 심사준비|내부심사|교육훈련|문서/양식|시정조치|기타
  status      TEXT NOT NULL DEFAULT '예정',   -- 예정|진행|완료|보류
  priority    TEXT NOT NULL DEFAULT '보통',   -- 높음|보통|낮음
  owner       TEXT,
  start_date  TEXT,                            -- YYYY-MM-DD
  due_date    TEXT,                            -- YYYY-MM-DD
  note        TEXT,
  form_code   TEXT,                            -- 연결 양식(선택)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule_items(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_due ON schedule_items(due_date);

-- 데모용 시드 (2026 정기 인증심사 D-15=2026-06-15 기준 일정)
-- 멱등: 테이블이 비어있을 때만 삽입 (마이그레이션 재실행/비정상 종료 시 중복 방지)
INSERT INTO schedule_items (title, category, status, priority, owner, start_date, due_date, note, sort_order)
SELECT * FROM (VALUES
  ('인증심사 D-90 사전점검 회의', '심사준비', '완료', '높음', '홍길동 부장', '2026-03-10', '2026-03-17', '심사 범위·일정 확정', 10),
  ('FMEA 4판 갱신 (인발 공정)', '문서/양식', '진행', '높음', '품질개발팀', '2026-05-10', '2026-05-28', '인발 공정 PFMEA 개정', 20),
  ('내부심사 실시 (QMS·공정·제품)', '내부심사', '진행', '높음', '홍길동 부장', '2026-05-18', '2026-05-25', '전 부서 내부심사', 30),
  ('NCR-2026-0042 시정조치 효과성 검증', '시정조치', '진행', '높음', '품질보증팀', '2026-05-20', '2026-05-30', '유효성 검증 체크시트', 40),
  ('전 직원 IATF 16949 교육', '교육훈련', '예정', '보통', '경영지원팀', '2026-06-01', '2026-06-05', '핵심도구·고객특별요구 교육', 50),
  ('경영검토 회의', '심사준비', '예정', '높음', '서상규 전무', '2026-06-08', '2026-06-10', '품질목표 달성률·고객만족 리뷰', 60),
  ('SWOT/리스크 분석표 갱신', '문서/양식', '보류', '보통', '품질개발팀', '2026-06-01', '2026-06-09', '6.1 리스크 기회 갱신', 70),
  ('정기 인증심사 (본심사)', '심사준비', '예정', '높음', 'AM사업부', '2026-06-15', '2026-06-17', 'IATF 16949 3rd party 심사', 80)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM schedule_items);
