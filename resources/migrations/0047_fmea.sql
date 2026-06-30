-- ============================================================
-- Migration 0047: 공정 FMEA(신판 AIAG-VDA 7-step) 모듈 — Core Tool #2
--
-- 회사 실제 제출 포맷 = 신판(사용자 확정). 마스터 J-1101 지침 REV.6 메인시트
-- '공정 FMEA 4판 SHEET (J1101-01)'(구조는 신판, B1:AD21)를 데이터모델화.
-- 구조분석→기능분석→고장분석(FE/FM/FC,S)→리스크분석(예방/O,검출/D,AP)→최적화(재평가).
-- 앱 기존 J1101-01(구식 4판 셀맵)과 별개 — 신판 구조화 추적. 공식 시트 출력은 phase2.
-- ============================================================

CREATE TABLE IF NOT EXISTS fmea_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fmea_no       TEXT NOT NULL,
  part_name     TEXT,                          -- 품명
  part_no       TEXT,                          -- 품번
  proc_owner    TEXT,                          -- 공정 책임자
  model         TEXT,                          -- 적용차종
  author        TEXT,                          -- 작성
  reviewer      TEXT,                          -- 검토
  approver      TEXT,                          -- 승인
  due_date      TEXT,                          -- 완료 예정일
  mp_date       TEXT,                          -- 양산 적용일
  team_members  TEXT,                          -- 상호 기능팀원
  revision_note TEXT,                          -- 주요 개정내용
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK(status IN ('draft','in_review','approved')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fmea_rows (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id           INTEGER NOT NULL REFERENCES fmea_documents(id) ON DELETE CASCADE,
  seq              INTEGER NOT NULL DEFAULT 0,
  -- 구조분석 (B/C/D)
  proc_item        TEXT,                        -- 1.공정 항목
  proc_step        TEXT,                        -- 2.공정 단계
  proc_element     TEXT,                        -- 3.공정 작업요소
  -- 기능분석 (E/F/G)
  func_item        TEXT,                        -- 공정 항목의 기능
  func_step        TEXT,                        -- 공정단계 및 기능
  func_element     TEXT,                        -- 작업요소 기능
  -- 고장분석 (H/I/J/K)
  failure_effect   TEXT,                        -- FE(고장영향, 상위)
  severity         INTEGER CHECK(severity IS NULL OR severity BETWEEN 1 AND 10),  -- 심각도 S
  failure_mode     TEXT,                        -- FM(고장형태)
  failure_cause    TEXT,                        -- FC(고장원인)
  -- 리스크분석 (L/M/N/O/P/Q)
  prevention_ctrl  TEXT,                        -- 현재 예방관리
  occurrence       INTEGER CHECK(occurrence IS NULL OR occurrence BETWEEN 1 AND 10),  -- 발생도 O
  detection_ctrl   TEXT,                        -- 현재 검출관리
  detection        INTEGER CHECK(detection IS NULL OR detection BETWEEN 1 AND 10),  -- 검출도 D
  action_priority  TEXT CHECK(action_priority IS NULL OR action_priority IN ('H','M','L')),  -- AP
  special_char     TEXT,                        -- 특별공정특성
  -- 최적화 (R~AD)
  prevention_action TEXT,                       -- 예방조치
  detection_action  TEXT,                       -- 검출조치
  responsible       TEXT,                       -- 책임자
  due_date          TEXT,                       -- 목표 완료일
  action_status     TEXT,                       -- 상태
  evidence          TEXT,                       -- 증거 포인터
  completed_date    TEXT,                       -- 완료일
  re_severity       INTEGER CHECK(re_severity IS NULL OR re_severity BETWEEN 1 AND 10),
  re_occurrence     INTEGER CHECK(re_occurrence IS NULL OR re_occurrence BETWEEN 1 AND 10),
  re_detection      INTEGER CHECK(re_detection IS NULL OR re_detection BETWEEN 1 AND 10),
  special_prod_char TEXT,                        -- 특별제품특성
  re_action_priority TEXT CHECK(re_action_priority IS NULL OR re_action_priority IN ('H','M','L')),
  note              TEXT,                        -- 비고
  sort_order        INTEGER NOT NULL DEFAULT 0,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fmea_row_doc ON fmea_rows(doc_id, seq);

-- ── 데모 FMEA 1건 + 예시 3행 (빈 화면 방지) ──
INSERT INTO fmea_documents (fmea_no, part_name, part_no, proc_owner, model, author, team_members, revision_note, status)
SELECT 'PFMEA-DEMO-001', '브래킷 ASSY (데모)', '28237-2MAA1', '홍길동 부장', 'XX차종', '품질개발팀', '개발·생산·품질·구매', '신판(AIAG-VDA) 전환 데모', 'draft'
WHERE NOT EXISTS (SELECT 1 FROM fmea_documents);

INSERT INTO fmea_rows
  (doc_id, seq, proc_item, proc_step, proc_element, func_item, func_step, func_element,
   failure_effect, severity, failure_mode, failure_cause,
   prevention_ctrl, occurrence, detection_ctrl, detection, action_priority, special_char, sort_order)
SELECT d.id, x.column1, x.column2, x.column3, x.column4, x.column5, x.column6, x.column7,
       x.column8, x.column9, x.column10, x.column11,
       x.column12, x.column13, x.column14, x.column15, x.column16, x.column17, x.column1 * 10
FROM (SELECT id FROM fmea_documents WHERE fmea_no='PFMEA-DEMO-001') d,
(VALUES
  (1, '브래킷 용접', '아크 용접', '용접 와이어',
      '브래킷 강성 확보', '지정 위치 용접', '와이어 송급',
      '조립부 강도 부족 → 고객 라인 탈락', 8, '용접 미용착(공동)', '전류 설정 부적정',
      '용접조건표 관리 + 작업표준', 4, '외관검사 + 단면 매크로', 5, 'M', '강도(중요)'),
  (2, '브래킷 용접', '아크 용접', '지그 셋업',
      '정위치 용접', '지그 클램핑', '클램프 고정',
      '용접 위치 이탈 → 치수 불량', 7, '위치 틀어짐', '지그 마모/유격',
      '지그 일상점검', 3, '초중종물 치수검사', 4, 'L', NULL),
  (3, '표면 처리', '도장', '도료 분사',
      '방청 성능 확보', '균일 도막', '스프레이 분사',
      '방청 불량 → 부식 클레임', 6, '도막두께 미달', '분사압/속도 변동',
      '도장조건 관리', 5, '도막두께 측정', 6, 'M', '방청')
) x
WHERE NOT EXISTS (SELECT 1 FROM fmea_rows);
