-- ============================================================
-- Migration 0048: MSA(측정시스템분석) 모듈 — Core Tool #3
--
-- 측정 시스템 변동(Gage R&R 등) 평가. %GRR<10 양호·10~30 조건부·>30 부적합.
-- 명세 §4.3. clause 7.1.5.1.1, team-qc. (Control Plan=ISIR 중복/SPC=보류 → MSA 선택)
-- result 는 grr_percent 에서 핸들러가 자동 판정.
-- ============================================================

CREATE TABLE IF NOT EXISTS msa_studies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gage_name     TEXT NOT NULL,
  gage_no       TEXT,
  characteristic TEXT,                          -- 측정 대상 특성
  method        TEXT NOT NULL DEFAULT 'gage_rr'
                  CHECK(method IN ('gage_rr','bias','linearity','stability')),
  grr_percent   REAL,                           -- %GRR
  ndc           INTEGER,                         -- 구별 범주 수(ndc)
  result        TEXT NOT NULL DEFAULT 'pending'
                  CHECK(result IN ('acceptable','marginal','unacceptable','pending')),
  clause_id     TEXT REFERENCES clauses(id),
  team_id       TEXT REFERENCES teams(id),
  study_date    TEXT,                            -- YYYY-MM-DD
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_msa_result ON msa_studies(result, sort_order);

-- ── 데모 게이지 4건 (빈 화면 방지, clause/team FK 검증값) ──
INSERT INTO msa_studies (gage_name, gage_no, characteristic, method, grr_percent, ndc, result, clause_id, team_id, study_date, sort_order)
SELECT s.column1, s.column2, s.column3, s.column4, s.column5, s.column6, s.column7, '7.1.5.1.1', 'team-qc', s.column8, s.column9
FROM (VALUES
  ('버니어 캘리퍼스', 'GAGE-001', '외경 Ø',     'gage_rr', 8.5,  6, 'acceptable',   '2026-05-10', 10),
  ('마이크로미터',     'GAGE-002', '두께',        'gage_rr', 18.2, 4, 'marginal',     '2026-05-12', 20),
  ('하이트 게이지',    'GAGE-003', '높이',        'gage_rr', 33.7, 2, 'unacceptable', '2026-05-15', 30),
  ('토크 렌치',        'GAGE-004', '체결 토크',   'gage_rr', NULL, NULL, 'pending',    NULL,         40)
) AS s
WHERE NOT EXISTS (SELECT 1 FROM msa_studies);
