-- ============================================================
-- Migration 0139: 조업달력 (34호 2차분 #18 — 배치⑶ 승격) (2026-08-12)
-- [스키마 전용 마이그레이션 — 데이터/시드 없음]
--
-- 근거 = 34호 대조표 §B #18 + 코워크 검토의견 조건1: "가동일 = 도넛 %·심사 뷰 판정·
-- 성과 지표 3곳이 공유하는 분모. 근사 분모로 이중 작업하지 말고 원천을 먼저 만든다."
--
-- 현행(대체 대상) = mes-records-handlers 의 **가동일 프록시**("창 안에서 어느 공정이든
-- 기록이 있던 날"). 기록이 없는 날은 쉰 날인지 빠뜨린 날인지 구분되지 않는다 —
-- 그 구분을 사람이 적는 자리가 이 표다.
--
-- 계약:
--  · 1일 1행(ymd PK) — 등록된 날만 행이 생긴다. **행이 없으면 '미등록'**(가짜 가동일 금지).
--    미등록 구간의 분모는 종전 프록시로 계산하고 화면이 그 사실을 정직 표기한다.
--  · work_type: '조업' | '휴무' — 계획 아닌 사실 축(사후 정정 허용 = 마스터 성격).
--  · 기입 주체 각인(updated_by) — STAMP 규약. 갱신은 같은 날짜 덮어쓰기(UPSERT).
--  · 돈·근태 열 없음(돈 경계 · 인사 정보 비수집).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 트랜잭션 래핑).
-- ============================================================

CREATE TABLE IF NOT EXISTS work_calendar (
  ymd         TEXT PRIMARY KEY,                        -- YYYY-MM-DD (KST 축)
  work_type   TEXT NOT NULL CHECK (work_type IN ('조업', '휴무')),
  note        TEXT,                                    -- 휴무 사유·특근 메모 등(자유)
  updated_by  TEXT,                                    -- 세션 강제(STAMP)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 월 단위 조회가 기본 동선(월 캘린더) — 접두 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_work_calendar_month ON work_calendar (substr(ymd, 1, 7));
