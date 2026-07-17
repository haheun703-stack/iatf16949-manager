-- ============================================================
-- Migration 0072: MES 일일 기록 스키마 씨앗 (2026-07-17)
-- [스키마 전용 마이그레이션 — 데이터 없음]
--
-- MES 업체 API 불가 → 일일 엑셀 드롭 임포트(사람=다운로드 1클릭, 앱=파싱→적재
-- →관제탑 의무 auto-done + 결측 감지). 0060 form_approvals 선례처럼 저장구조
-- 선행 — 임포트 파이프라인/IPC는 7/20 실샘플 확인 후 구현.
-- 핵심 키(일자·종류·품번·공정)만 컬럼화하고 포맷 미확정분은 raw_json 에 통째 보존
-- → 샘플 포맷이 예상과 달라도 스키마 생존. UNIQUE 제약은 실포맷 확인 후(중복 기준 미정).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

-- 임포트 배치 (드롭 폴더의 파일 1개 = 1행)
CREATE TABLE IF NOT EXISTS mes_import_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  drop_date   TEXT NOT NULL,                -- 드롭 폴더 날짜 (YYYY-MM-DD)
  record_type TEXT NOT NULL CHECK (record_type IN ('자주검사','수입검사','공정패트롤','설비일상점검','기타')),
  file_name   TEXT NOT NULL,
  file_path   TEXT,
  imported_at TEXT DEFAULT (datetime('now')),
  row_count   INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_mes_files_date ON mes_import_files(drop_date, record_type);

-- 기록 행 (파싱 결과 — 결측 감지·의무 auto-done·심사 증빙의 원천)
CREATE TABLE IF NOT EXISTS mes_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER REFERENCES mes_import_files(id),
  record_date TEXT NOT NULL,                -- 실제 기록 일자 (YYYY-MM-DD)
  record_type TEXT NOT NULL,
  part_no     TEXT,                         -- 품번 (parts 와 느슨 연결, FK 아님)
  process     TEXT,                         -- 공정명 (예: 로브레이징, LEAK TEST)
  inspector   TEXT,                         -- 검사자/작업자
  judgment    TEXT,                         -- 판정 (합격/OK/NG 등 원문 그대로)
  qty         INTEGER,                      -- 수량 (있으면)
  raw_json    TEXT,                         -- 파싱 원본 행 전체 (포맷 미확정 대비)
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mes_records_date ON mes_records(record_date, record_type, part_no);
CREATE INDEX IF NOT EXISTS idx_mes_records_proc ON mes_records(part_no, process, record_date);
