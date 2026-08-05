-- ============================================================
-- Migration 0136: G1 착수 — §10-1 기록 스키마 선반영 (2026-08-05)
-- [스키마 전용 마이그레이션 — 데이터/시드 없음]
--
-- 근거 = 29번 지시서 §8-⑥ 도장(8/4) + §10-1(코워크 8/4 재지적:
-- "쓰기 경로 스키마가 처음 굳는 배치 = G1 에 REVISION 스냅샷·확인자·초중종 반영").
-- 수집함 자체의 B-1 스키마(mat_receipt.capture_id·receipt_class + raw_captures 값 규약)는
-- **0106 에서 기적용**(7/28 선행분) — 본 마이그는 §10-1 몫만 더한다.
--
-- ① §10-1 ⓐ insp_spec revision 축: 현행 UNIQUE(item_code,insp_kind,insp_item) 는
--    개정 = 제자리 UPDATE 를 강제 → 과거 기록의 spec_id 가 조용히 새 기준을 가리키는
--    소급 오염 구조(8/4 실측). 개정 = 신규 행(구판 불변)이 되도록 UNIQUE 에 revision 포함.
--    SQLite 는 테이블 제약 변경 불가 → 재생성. insp_spec 은 현재 어떤 코드도 참조하지
--    않음(0101 이후 미사용 실측 — 기록 0행 시점의 마지막 안전 창).
--
-- ② §10-1 ⓑ insp_record 3필드: spec_revision(기록 시점 스냅샷 — 참조 금지),
--    초중종(sample_phase — 자주검사 초품/중품/종품 3회 문법, 3차 노트 §4-2),
--    확인자(confirmer — 검사자+확인자 2단 서명, 3차 노트 §4-3. ✓는 사람: 서버 세션 주입만).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 트랜잭션 래핑). ADD COLUMN 은 1회 적용.
-- ============================================================

-- ── ① insp_spec 재생성: revision 축 (개정 = 신규 행, 구판 불변) ──
CREATE TABLE insp_spec_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code  TEXT NOT NULL,
  insp_kind  TEXT NOT NULL CHECK (insp_kind IN ('수입','공정','자주','패트롤','출하')),
  insp_item  TEXT NOT NULL,                     -- 검사항목명
  instrument TEXT,                              -- 측정기
  unit       TEXT,
  su REAL, sl REAL,                             -- 규격 상/하한
  mu REAL, ml REAL,                             -- 관리 상/하한
  nominal    REAL,                              -- 표준값
  sample_cnt INTEGER,                           -- 시료수
  revision   INTEGER NOT NULL DEFAULT 0,        -- 개정 번호 (개정 = 신규 행 — UPDATE 금지)
  rev_date   TEXT,                              -- REVISION 일자 각인(3차 노트 §4-1)
  active     INTEGER NOT NULL DEFAULT 1,        -- 최신판 = active 1, 구판 = 0 (불변 보존)
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, insp_kind, insp_item, revision)
);
INSERT INTO insp_spec_new
  (id, item_code, insp_kind, insp_item, instrument, unit, su, sl, mu, ml, nominal, sample_cnt,
   revision, rev_date, active, source, created_at)
  SELECT id, item_code, insp_kind, insp_item, instrument, unit, su, sl, mu, ml, nominal, sample_cnt,
         0, NULL, active, source, created_at
  FROM insp_spec;
DROP TABLE insp_spec;
ALTER TABLE insp_spec_new RENAME TO insp_spec;
CREATE INDEX IF NOT EXISTS idx_insp_spec_item ON insp_spec(item_code, insp_kind, active);

-- ── ② insp_record: §10-1 3필드 (기존 행 NULL = 선-리비전 시대 — 정직, 소급 기입 금지) ──
ALTER TABLE insp_record ADD COLUMN spec_revision INTEGER;  -- 기록 시점 insp_spec.revision 스냅샷
ALTER TABLE insp_record ADD COLUMN sample_phase TEXT CHECK (sample_phase IN ('초품','중품','종품'));
ALTER TABLE insp_record ADD COLUMN confirmer TEXT;         -- 확인자(2단 서명) — 세션 주입, 대필 금지
ALTER TABLE insp_record ADD COLUMN confirmed_at TEXT;      -- 확인 시각 (확인 액션 시 서버가 기록)
