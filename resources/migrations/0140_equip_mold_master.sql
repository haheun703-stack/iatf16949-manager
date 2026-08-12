-- ============================================================
-- Migration 0140: 설비·금형 마스터 (34호 2차분 배치⑷ — #9 설비등록·#11 금형 2종) (2026-08-12)
-- [스키마 전용 마이그레이션 — 데이터/시드 없음. 추정 기입 금지 — 행은 사람이 등록한다]
--
-- #9 설비등록(그림46·47 골격): 설비 마스터 원천 부재 — MES 덤프의 line_no(WRKCTR)는 관측치일
--   뿐 마스터가 아니다. line_no 열은 MES 기록(mac_daily·sqc_daily)과의 연결 고리(선택).
-- #11 금형마스터(그림51 골격): 26번 A4 계약 착지 — 타발수 = 연결 품번 생산실적(취소 제외)
--   연동 계산. cavity 미기입 시 타발수 산출 불가 = '—' 정직(테이블은 원천만 든다).
-- 마스터 성격 = UPSERT 정정 허용 · 정비 주체 각인(updated_by — 서버 STAMP).
-- 돈 경계: 단가·구매가 열 없음.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 트랜잭션 래핑).
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_master (
  equip_code   TEXT PRIMARY KEY,                -- 설비코드(사람 채번)
  name         TEXT NOT NULL,                   -- 설비명
  equip_type   TEXT,                            -- 유형(프레스·사출 등 — 자유)
  line_no      TEXT,                            -- MES 라인/워크센터 연결(선택 — 관측치 참조)
  location     TEXT,                            -- 위치
  install_date TEXT,                            -- 설치일(YYYY-MM-DD)
  note         TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  updated_by   TEXT,                            -- 정비 주체(STAMP)
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mold_master (
  mold_code       TEXT PRIMARY KEY,             -- 금형코드(사람 채번)
  name            TEXT NOT NULL,                -- 금형명
  item_code       TEXT,                         -- 연결 품번(타발수 연동 축 — 품목 마스터 실존 강제는 채널)
  cavity          INTEGER,                      -- 캐비티 수(미기입 = 타발수 산출 불가 '—')
  guarantee_shots INTEGER,                      -- 보증 타발수(미기입 = 잔여 수명 '—')
  location        TEXT,                         -- 보관 위치
  install_date    TEXT,
  note            TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  updated_by      TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mold_master_item ON mold_master (item_code);
