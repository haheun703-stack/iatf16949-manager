-- ============================================================
-- Migration 0142: 화면별 권한 매트릭스 (37호 배치B — 34호 #19) (2026-08-13)
-- [스키마 + app_config 1행 — 권한 행 시드 없음]
--
-- 정본 = 그림33(TPC 3공장 33호 세트) 화면별 권한관리:
--   권한그룹(부서 = app_users.team_dept) + 개인(오버라이드) × 화면(uiStore PageId) ×
--   7종 체크(읽기·쓰기·수정·삭제·엑셀·프린트·단가).
-- 37호 도장 ②: 권한 축 = 팀(team_dept)+개인. ③: 단가 = 전원 잠금 시드(헌법 15번 —
--   자리만 확보·켜지 않음) → **스키마 CHECK(can_price=0) 하드락**. 단가 축을 여는 날 =
--   후속 마이그 1건으로 CHECK 완화(도장 관문 — 코드 레벨 돈 경계 유지).
-- 규칙 부재 = 현행 허용(role 가드 PROTECTED 만 적용) — 시드 0행이라 이 마이그 적용
--   직후 동작 변화 0. 매트릭스는 관리자 화면(그림33 골격)에서 채워질 때만 효력.
-- executive = 그림33 [그룹] 최종관리자 — 매트릭스 무시 전권(서버 디스패처에서 분기).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts / runServerMigrations 가 트랜잭션으로 감쌈).
-- 멱등: CREATE TABLE IF NOT EXISTS · INSERT ... DO NOTHING.
-- ============================================================

CREATE TABLE IF NOT EXISTS screen_permission (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_kind TEXT NOT NULL CHECK(subject_kind IN ('team','user')),
  -- team: app_users.team_dept 문자열(부서 = 권한그룹) | user: app_users.id (개인 오버라이드)
  subject_key  TEXT NOT NULL,
  page_id      TEXT NOT NULL,               -- uiStore PageId ('work-order' 등)
  can_read     INTEGER NOT NULL DEFAULT 1 CHECK(can_read   IN (0,1)),
  can_write    INTEGER NOT NULL DEFAULT 0 CHECK(can_write  IN (0,1)),
  can_edit     INTEGER NOT NULL DEFAULT 0 CHECK(can_edit   IN (0,1)),
  can_delete   INTEGER NOT NULL DEFAULT 0 CHECK(can_delete IN (0,1)),
  can_excel    INTEGER NOT NULL DEFAULT 0 CHECK(can_excel  IN (0,1)),
  can_print    INTEGER NOT NULL DEFAULT 0 CHECK(can_print  IN (0,1)),
  -- 단가 — 37호 ③ 전원 잠금: 1 은 스키마가 거부(자리만 확보). 개방 = 후속 마이그.
  can_price    INTEGER NOT NULL DEFAULT 0 CHECK(can_price = 0),
  updated_by   TEXT,                        -- 세션 강제(STAMP)
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subject_kind, subject_key, page_id)
);
CREATE INDEX IF NOT EXISTS idx_screen_permission_page ON screen_permission(page_id);

-- IATF 라이선스 플래그(32호 상품 구조 — 애드온 1키): 자리만. 뷰 언락 배선은 후속 배치.
INSERT INTO app_config (key, value) VALUES ('license.iatf_addon', 'off')
  ON CONFLICT(key) DO NOTHING;
