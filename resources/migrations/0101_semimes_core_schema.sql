-- ============================================================
-- Migration 0101: 반(半)-MES 공통기초 코어스키마 (2026-07-24)
-- [스키마 전용 — 시드 없음] [코어스키마: 고객 무관 범용]
--
-- 원천 = 15_반MES_공통기초_개발지시서_260724.md §2(마스터 6종+기록 5종+LOT)
--        + §3(트리거 정의 스키마만 — 엔진은 M3) + §0.5 코드 대조(2026-07-24).
-- 시드는 마이그에 인라인 금지(15번 §5) → scripts/semimes-seed.cjs (TPC팩) 별도.
--
-- §0.5 코드 대조 결정:
--  · parts(0040, 심사층 품번 등록부: ISIR·SQ트랙)는 불변 유지. item_master 가 반-MES
--    제조품목 정본(원자재·반제품 포함 전량). 완제품은 동일 키(part_no=item_code)로 느슨 연결.
--  · processes(업무 프로세스 CP/SP/MP)와 process_master(제조 공정)는 무관 — 이름 주의.
--  · bom_documents/bom_form_refs(0006)는 문서BOM — 제품BOM(bom_edge)과 무관.
--  · 의무 확장은 recurring_obligations ADD trigger_type — 별도 엔진 금지(15번 §1-3).
--  · 신규 기록의 기록주체 컬럼은 created_by/worker/inspector — 값은 서버 세션 강제
--    (W3 STAMP_FIELDS, payload 키 createdBy)로 주입되는 것을 재사용.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 트랜잭션 래핑). ADD COLUMN 은 1회 적용.
-- ============================================================

-- ───────────────────── 마스터 6종 ─────────────────────

-- ① 공정 마스터 (제조 공정 — 업무프로세스 'processes'와 무관)
CREATE TABLE IF NOT EXISTS process_master (
  proc_code      TEXT PRIMARY KEY,              -- C10, P10, K10 …
  proc_name      TEXT NOT NULL,                 -- 절단, 포밍, 코킹 …
  proc_type      TEXT NOT NULL DEFAULT '사내' CHECK (proc_type IN ('사내','외주')),
  insp_form_code TEXT,                          -- 공정↔검사양식 연계 (forms.code 느슨)
  active         INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  source         TEXT,                          -- '2021' | 'manual' | …
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ② 품목 마스터 (반-MES 제조품목 정본: 원자재·반제품·완제품 전량)
CREATE TABLE IF NOT EXISTS item_master (
  item_code   TEXT PRIMARY KEY,                 -- 28235-2B740 / 28235-2B740-K1 / STKM11A-0845-07
  item_name   TEXT,
  item_type   TEXT NOT NULL DEFAULT '완제품/조립' CHECK (item_type IN ('원자재/기타','반제품','완제품/조립')),
  spec        TEXT,                             -- 규격
  cust_pno1   TEXT, cust_pno2 TEXT, cust_pno3 TEXT,  -- 고객품번 ≤3 (pop_item CUST_PNO 계약)
  car_type    TEXT,                             -- 차종
  trace_gbn   INTEGER NOT NULL DEFAULT 0,       -- LOT 추적 opt-in (품목별, pop_item.TRACE_GBN)
  inlotuse    INTEGER NOT NULL DEFAULT 0,       -- 입고 시 업체LOT→내부LOT 승계 (INLOTUSE)
  insp_skip   INTEGER NOT NULL DEFAULT 0,       -- 수입검사 생략 (INSP_SKIP)
  qc_gbn_o    TEXT,                             -- 출하검사 구분 (QC_GBN_O)
  out_yn      INTEGER NOT NULL DEFAULT 0,       -- 외주 품목 (OUT_YN)
  active      INTEGER NOT NULL DEFAULT 1,
  source      TEXT,                             -- '2021' | 'popbom' | 'manual'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_master_type ON item_master(item_type, active);

-- ③ 제품 BOM 간선 (문서BOM(0006)과 무관). 정적 시드 아님 — 갱신 파이프라인이 upsert/deactivate.
CREATE TABLE IF NOT EXISTS bom_edge (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_code  TEXT NOT NULL,                   -- item_master 느슨 참조
  child_code   TEXT NOT NULL,
  qty          REAL NOT NULL DEFAULT 1,
  active       INTEGER NOT NULL DEFAULT 1,      -- 파이프라인이 소멸 간선을 0으로 (삭제 금지)
  source       TEXT,                            -- '2021' | 'popbom' | 'manual'
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (parent_code, child_code)
);
CREATE INDEX IF NOT EXISTS idx_bom_edge_parent ON bom_edge(parent_code, active);
CREATE INDEX IF NOT EXISTS idx_bom_edge_child ON bom_edge(child_code, active);

-- ④ 라우팅 (품목→공정 순서 — 공정↔검사양식 연결의 척추)
CREATE TABLE IF NOT EXISTS routing_step (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code  TEXT NOT NULL,
  seq        INTEGER NOT NULL,                  -- 10, 20, 30 …
  proc_code  TEXT NOT NULL,                     -- process_master 느슨 참조 ('0'=입고/무공정)
  out_yn     INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, seq, proc_code)
);
CREATE INDEX IF NOT EXISTS idx_routing_item ON routing_step(item_code, active, seq);

-- ⑤ 거래처 마스터 (고객/외주처/자재공급처 — 수입검사·성적서·출하 연결)
CREATE TABLE IF NOT EXISTS partner (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code TEXT UNIQUE,                     -- POP_CUST.CUST_NO 등
  name         TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT '기타' CHECK (partner_type IN ('고객','외주처','자재공급처','기타')),
  biz_no       TEXT,
  ceo          TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ⑥ 불량유형 마스터 (검사 합부와 별개 축 — 기록의 불량 필드가 참조)
CREATE TABLE IF NOT EXISTS defect_type (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,              -- mes_codes ROUTEBAD 계열 호환
  name       TEXT NOT NULL,
  proc_code  TEXT,                              -- 공정별 불량이면 지정
  active     INTEGER NOT NULL DEFAULT 1,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ───────────────────── 기록 5종 ─────────────────────

-- ① 작업지시 — 경량. 실적의 앵커일 뿐(수주·납기 최적화 확장 금지, 15번 §2).
CREATE TABLE IF NOT EXISTS work_order (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no   TEXT NOT NULL UNIQUE,              -- WO-YYMMDD-nn (핸들러 발번)
  item_code  TEXT NOT NULL,
  order_qty  REAL,
  line_no    TEXT,
  start_date TEXT,                              -- YYYY-MM-DD
  end_date   TEXT,
  status     TEXT NOT NULL DEFAULT '대기' CHECK (status IN ('대기','진행','완료','취소')),
  batch_id   TEXT,                              -- 월 단위 일괄 등록 묶음 (VOC ③)
  note       TEXT,
  created_by TEXT,                              -- 세션 강제(STAMP)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status, start_date);

-- ② 생산실적
CREATE TABLE IF NOT EXISTS prod_record (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date   TEXT NOT NULL,                  -- YYYY-MM-DD
  work_order_id INTEGER REFERENCES work_order(id),
  seq           INTEGER NOT NULL DEFAULT 1,     -- 일자+지시 내 순번 (pop_sil 계약)
  item_code     TEXT NOT NULL,
  lot_no        TEXT,                           -- lot_registry 느슨 참조
  line_no       TEXT,
  ok_qty        INTEGER NOT NULL DEFAULT 0,
  ng_qty        INTEGER NOT NULL DEFAULT 0,
  defect_code   TEXT,                           -- defect_type 느슨 참조 (ng_qty>0 시)
  shift         TEXT,                           -- 주/야
  start_time    TEXT,                           -- ISO
  end_time      TEXT,
  worker        TEXT,                           -- 세션 강제(STAMP) — defaultAuthor 폴백 금지
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prod_record_date ON prod_record(record_date);
CREATE INDEX IF NOT EXISTS idx_prod_record_lot ON prod_record(lot_no);

-- ③a 자재 입고 (업체LOT 승계 = LOT 체인의 시작점. 창고·로케이션·수불부 금지)
CREATE TABLE IF NOT EXISTS mat_receipt (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_date TEXT NOT NULL,
  item_code    TEXT NOT NULL,                   -- 원자재 품목
  vendor_lot   TEXT,                            -- 업체(밀시트) LOT
  internal_lot TEXT,                            -- 내부 LOT (INLOTUSE 승계 시 = vendor_lot)
  partner_code TEXT,                            -- 자재공급처
  qty          REAL,
  cert_no      TEXT,                            -- 성적서/밀시트 번호
  note         TEXT,
  created_by   TEXT,                            -- 세션 강제(STAMP)
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mat_receipt_lot ON mat_receipt(internal_lot);

-- ③b 자재 투입 (자재 LOT → 생산 LOT 연결)
CREATE TABLE IF NOT EXISTS mat_input (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  input_date   TEXT NOT NULL,
  prod_lot_no  TEXT NOT NULL,                   -- 생산 LOT
  material_lot TEXT NOT NULL,                   -- 투입 자재 LOT (mat_receipt.internal_lot)
  item_code    TEXT,                            -- 자재 품목
  qty          REAL,
  created_by   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mat_input_prodlot ON mat_input(prod_lot_no);
CREATE INDEX IF NOT EXISTS idx_mat_input_matlot ON mat_input(material_lot);

-- ④ 검사스펙 (tspmes pop_spec 동일 구조 = 즉시 호환)
CREATE TABLE IF NOT EXISTS insp_spec (
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
  active     INTEGER NOT NULL DEFAULT 1,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, insp_kind, insp_item)
);
CREATE INDEX IF NOT EXISTS idx_insp_spec_item ON insp_spec(item_code, insp_kind, active);

-- ⑤ 검사기록: 헤더 + 시료별 측정값 상세 (CP/CPK 원천, 사진 우선→AI 판독 승격 경로)
CREATE TABLE IF NOT EXISTS insp_record (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  insp_date   TEXT NOT NULL,
  insp_kind   TEXT NOT NULL CHECK (insp_kind IN ('수입','공정','자주','패트롤','출하')),
  item_code   TEXT NOT NULL,
  lot_no      TEXT,
  proc_code   TEXT,
  inspector   TEXT,                             -- 세션 강제(STAMP)
  judgment    TEXT,                             -- 합격/불합격/보류
  defect_code TEXT,                             -- defect_type 느슨 참조
  defect_qty  INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_insp_record_lot ON insp_record(lot_no);
CREATE INDEX IF NOT EXISTS idx_insp_record_item ON insp_record(item_code, insp_date);

CREATE TABLE IF NOT EXISTS insp_record_value (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id  INTEGER NOT NULL REFERENCES insp_record(id),
  spec_id    INTEGER,                           -- insp_spec 느슨 참조
  insp_item  TEXT,
  sample_no  INTEGER NOT NULL DEFAULT 1,        -- 시료 번호 (tspmes SUBSEQ 계약)
  value      REAL,
  value_text TEXT,                              -- 비수치 판정값
  judgment   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_insp_value_record ON insp_record_value(record_id);

-- ───────────────────── LOT ─────────────────────

-- 발번 대장: 품번-YYMMDD-차수 (시스템만 발번). TPC 모드=tspmes 연동, 범용=앱 발번.
CREATE TABLE IF NOT EXISTS lot_registry (
  lot_no     TEXT PRIMARY KEY,
  item_code  TEXT NOT NULL,
  lot_date   TEXT NOT NULL,                     -- YYYY-MM-DD
  seq        INTEGER NOT NULL,                  -- 당일 차수
  source     TEXT NOT NULL DEFAULT '자체발번' CHECK (source IN ('자체발번','업체승계','tspmes')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_code, lot_date, seq)
);

-- ───────────────────── 갱신 파이프라인 이력 ─────────────────────

CREATE TABLE IF NOT EXISTS bom_import_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at      TEXT NOT NULL DEFAULT (datetime('now')),
  source      TEXT NOT NULL,                    -- 'popbom-csv' | '2021-seed' | …
  file_name   TEXT,
  added       INTEGER NOT NULL DEFAULT 0,       -- 신규 간선
  updated     INTEGER NOT NULL DEFAULT 0,       -- 수량 등 변경
  deactivated INTEGER NOT NULL DEFAULT 0,       -- 소멸 간선(active=0)
  unchanged   INTEGER NOT NULL DEFAULT 0,
  items_new   INTEGER NOT NULL DEFAULT 0,       -- 신규 품목
  note        TEXT
);

-- ───────────────────── 데이터→할 일 (트리거 정의 — 엔진은 M3) ─────────────────────

-- 의무 체계 확장: periodic(기존 주기 의무) | data(데이터 트리거 의무)
ALTER TABLE recurring_obligations ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'periodic';

-- 트리거 정의 (1차 4종: 검사도래/금형타발한계/부적합조치/심사갭)
CREATE TABLE IF NOT EXISTS obligation_triggers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_kind TEXT NOT NULL CHECK (trigger_kind IN ('insp_due','mold_count','nonconform','audit_gap')),
  title        TEXT NOT NULL,
  entity_kind  TEXT,                            -- 'item' | 'mold' | 'proc' …
  entity_key   TEXT,                            -- 대상 엔티티 키 (품번·금형코드 등, NULL=전체
  config_json  TEXT,                            -- 임계값·주기 등 트리거별 설정
  team         TEXT,                            -- 배정 기본 = 팀 (개인 자동 지정 금지, §3-4)
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 발행 대장: 중복 방지 키 = (트리거, 대상 엔티티, 기한 버킷) — §3-1
CREATE TABLE IF NOT EXISTS obligation_trigger_issues (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id    INTEGER NOT NULL REFERENCES obligation_triggers(id),
  entity_key    TEXT NOT NULL,
  due_bucket    TEXT NOT NULL,                  -- 기한 버킷 (YYYY-MM-DD 또는 주기 키)
  status        TEXT NOT NULL DEFAULT '발행' CHECK (status IN ('발행','해소표시','완료','취소')),
  issued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_mark_at TEXT,                        -- 데이터 해소 "표시만" — 자동 완료 금지 (§3-2)
  completed_at  TEXT,
  completed_by  TEXT,                           -- ✓는 사람만 (세션 강제)
  canceled_at   TEXT,
  cancel_reason TEXT,                           -- 취소 로그 필수 (§3-3)
  UNIQUE (trigger_id, entity_key, due_bucket)
);
