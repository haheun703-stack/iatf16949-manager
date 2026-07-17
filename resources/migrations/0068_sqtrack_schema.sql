-- ============================================================
-- Migration 0068: SQ 심사 아이템 트랙 스키마 (2026-07-17)
-- [스키마 전용 마이그레이션 — 데이터 없음]
--
-- 10월 SQ LEVEL-UP 심사 대비 — 심사원의 실제 동선(품번→관리계획서→
-- 파생문서→현장검증→인터뷰)을 품번별 4단계 체크리스트로 관리.
-- 품번 앵커 = parts(0040). SQ spine(sq_items)은 불변 — 이 트랙은
-- 42항목 점등(sq_reg_map)에 절대 연결하지 않음(0019 false-green 함정).
-- 마스터(sqtrack_items, 재시드 가능)/사람 확정 상태(sqtrack_item_status,
-- 시드 금지·lazy UPSERT) 분리 = 0064 sq_guides/sq_checkpoints 선례.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

-- 심사 트랙 대상 품번 (parts 앵커 + 트랙 전용 메타)
CREATE TABLE IF NOT EXISTS sqtrack_parts (
  part_no     TEXT PRIMARY KEY REFERENCES parts(part_no),
  binder_info TEXT,                    -- '1권 정기검사 세트 / 2권 ISIR 풀세트(CP p058~062)'
  scan_ref    TEXT,                    -- 스캔 원본 파일 안내
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 체크리스트 마스터 (판독 대장 → 시드, 재시드 = INSERT OR REPLACE)
-- code 규칙 '{품번}:{phase}-{seq 2자리}' — 확정 후 불변(변경 시 status 고아)
CREATE TABLE IF NOT EXISTS sqtrack_items (
  code           TEXT PRIMARY KEY,     -- '25460-2T500:2-03'
  part_no        TEXT NOT NULL REFERENCES sqtrack_parts(part_no),
  phase          INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
                 -- 1=서류 확보 2=정합성 리스크 해소 3=현장검증 준비 4=인터뷰 대비
  seq            INTEGER NOT NULL DEFAULT 0,
  title          TEXT NOT NULL,
  detail         TEXT,                 -- 무엇이 왜 문제인지 + 조치 방향
  evidence_pages TEXT,                 -- 근거 스캔 페이지 '2권 p003' (UI 배지)
  severity       TEXT NOT NULL DEFAULT 'yellow' CHECK (severity IN ('red','orange','yellow')),
  team           TEXT,                 -- TeamId: chongmu|yeongup|gumae|saengsan|saengki|pumjil|gaebal
  form_code      TEXT,                 -- forms.code 바로가기 (느슨한 참조, FK 아님)
  sq_item_code   TEXT,                 -- sq_items.code 표시 전용 (sq_reg_map 연동 금지)
  tag            TEXT                  -- 인터뷰 토픽 등 자유 라벨
);
CREATE INDEX IF NOT EXISTS idx_sqtrack_items_part ON sqtrack_items(part_no, phase, seq);

-- 사람 확정 상태 (시드하지 않음 — 핸들러 lazy UPSERT, 재시드에도 불변)
CREATE TABLE IF NOT EXISTS sqtrack_item_status (
  item_code  TEXT PRIMARY KEY REFERENCES sqtrack_items(code),
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','na')),
  note       TEXT,
  updated_by TEXT,
  updated_at TEXT
);
