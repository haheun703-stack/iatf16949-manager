-- ============================================================
-- Migration 0055: APQP(사전 제품 품질 계획) 모듈 — Core Tool 여정의 척추
--
-- 코워크 명세(core-tools-design-spec.md, 레퍼런스 커밋 916e44d)의 APQP를
-- v5 아키텍처로 네이티브 이식. 5단계(계획→제품설계→공정설계→검증→피드백)
-- × 43 산출물. core_tool 태그(FMEA/CP/MSA/SPC/PPAP)로 기존 v5 모듈과 딥링크.
-- clause_id/team_id 는 v5 clauses/teams FK 검증됨(0046 PPAP 동일 방식).
-- WHERE NOT EXISTS 멱등. migrate.ts 가 트랜잭션 래핑(BEGIN/COMMIT 없음).
-- ============================================================

CREATE TABLE IF NOT EXISTS apqp_phases (
  id          TEXT PRIMARY KEY,
  phase_no    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  title_en    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS apqp_elements (
  id          TEXT PRIMARY KEY,
  phase_id    TEXT NOT NULL REFERENCES apqp_phases(id),
  seq         INTEGER NOT NULL,
  name        TEXT NOT NULL,
  name_en     TEXT,
  io          TEXT NOT NULL DEFAULT 'output' CHECK(io IN ('input','output')),
  core_tool   TEXT,                            -- FMEA|CP|MSA|SPC|PPAP (딥링크 태그)
  clause_id   TEXT REFERENCES clauses(id),
  team_id     TEXT REFERENCES teams(id),
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK(status IN ('not_started','in_progress','completed','na')),
  target_date TEXT,                            -- YYYY-MM-DD
  actual_date TEXT,
  note        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_apqp_elem_phase ON apqp_elements(phase_id, seq);
CREATE INDEX IF NOT EXISTS idx_apqp_elem_status ON apqp_elements(status);

-- ── 5 단계 (개별 INSERT, 멱등) ──
INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order)
SELECT 'phase-1', 1, '계획 및 정의', 'Plan and Define Program', '고객의 소리를 바탕으로 제품 프로그램을 계획하고 설계·품질 목표를 정의한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM apqp_phases WHERE id='phase-1');
INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order)
SELECT 'phase-2', 2, '제품 설계 및 개발', 'Product Design and Development', '설계 특성과 기술 요구사항을 구체화하고 설계 타당성을 검증한다.', 2
WHERE NOT EXISTS (SELECT 1 FROM apqp_phases WHERE id='phase-2');
INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order)
SELECT 'phase-3', 3, '공정 설계 및 개발', 'Process Design and Development', '양산 공정 시스템과 관리 방법을 개발하고 양산전 관리계획서를 수립한다.', 3
WHERE NOT EXISTS (SELECT 1 FROM apqp_phases WHERE id='phase-3');
INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order)
SELECT 'phase-4', 4, '제품 및 공정 검증', 'Product and Process Validation', '양산 시험가동을 통해 제품과 공정을 검증하고 양산부품승인(PPAP)을 완료한다.', 4
WHERE NOT EXISTS (SELECT 1 FROM apqp_phases WHERE id='phase-4');
INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order)
SELECT 'phase-5', 5, '피드백, 평가 및 시정조치', 'Feedback, Assessment and Corrective Action', '변동을 감소시키고 고객만족·교훈을 반영하여 지속적으로 개선한다.', 5
WHERE NOT EXISTS (SELECT 1 FROM apqp_phases WHERE id='phase-5');

-- ── 43 산출물 (전량 멱등: 테이블이 비어있을 때만) ──
INSERT INTO apqp_elements (id, phase_id, seq, name, name_en, io, core_tool, clause_id, team_id, sort_order)
SELECT x.column1, x.column2, x.column3, x.column4, x.column5, x.column6, x.column7, x.column8, x.column9, x.column10
FROM (VALUES
  ('apqp-1-01','phase-1',1,'고객의 소리(VOC) 수집','Voice of the Customer','input',NULL,'8.2.1','team-mg',1),
  ('apqp-1-02','phase-1',2,'설계 목표','Design Goals','output',NULL,'8.3.3','team-de',2),
  ('apqp-1-03','phase-1',3,'신뢰성 및 품질 목표','Reliability and Quality Goals','output',NULL,'8.3.3','team-qc',3),
  ('apqp-1-04','phase-1',4,'예비 자재 명세서(BOM)','Preliminary Bill of Material','output',NULL,'8.3.3','team-de',4),
  ('apqp-1-05','phase-1',5,'예비 공정 흐름도','Preliminary Process Flow Chart','output',NULL,'8.3.3','team-pr',5),
  ('apqp-1-06','phase-1',6,'예비 특별특성 목록','Preliminary Listing of Special Characteristics','output',NULL,'8.3.3.3','team-qc',6),
  ('apqp-1-07','phase-1',7,'제품보증계획','Product Assurance Plan','output',NULL,'8.3.2','team-qc',7),
  ('apqp-1-08','phase-1',8,'경영자 지원','Management Support','output',NULL,'5.1','team-mg',8),
  ('apqp-2-01','phase-2',1,'설계 FMEA (DFMEA)','Design FMEA','output','FMEA','8.3.5','team-de',9),
  ('apqp-2-02','phase-2',2,'설계 검증(DV)','Design Verification','output',NULL,'8.3.4','team-de',10),
  ('apqp-2-03','phase-2',3,'설계 검토','Design Reviews','output',NULL,'8.3.4','team-de',11),
  ('apqp-2-04','phase-2',4,'시작품 관리계획서','Prototype Build Control Plan','output','CP','8.3.5','team-qc',12),
  ('apqp-2-05','phase-2',5,'엔지니어링 도면','Engineering Drawings','output',NULL,'8.3.5','team-de',13),
  ('apqp-2-06','phase-2',6,'엔지니어링 사양','Engineering Specifications','output',NULL,'8.3.5','team-de',14),
  ('apqp-2-07','phase-2',7,'자재 사양','Material Specifications','output',NULL,'8.3.5','team-de',15),
  ('apqp-2-08','phase-2',8,'신규 장비·금형·설비 요구사항','New Equipment, Tooling and Facilities Requirements','output',NULL,'8.3.5','team-pr',16),
  ('apqp-2-09','phase-2',9,'제품·공정 특별특성','Special Product and Process Characteristics','output',NULL,'8.3.3.3','team-qc',17),
  ('apqp-2-10','phase-2',10,'게이지·시험장비 요구사항','Gages / Testing Equipment Requirements','output',NULL,'7.1.5','team-qc',18),
  ('apqp-2-11','phase-2',11,'팀 타당성 확약','Team Feasibility Commitment','output',NULL,'8.3.4','team-de',19),
  ('apqp-3-01','phase-3',1,'포장 표준','Packaging Standards','output',NULL,'8.5.4','team-pu',20),
  ('apqp-3-02','phase-3',2,'제품·공정 품질시스템 검토','Product / Process Quality System Review','output',NULL,'8.5.1','team-qc',21),
  ('apqp-3-03','phase-3',3,'공정 흐름도','Process Flow Chart','output',NULL,'8.5.1','team-pr',22),
  ('apqp-3-04','phase-3',4,'공장 배치도(Floor Plan)','Floor Plan Layout','output',NULL,'8.5.1','team-pr',23),
  ('apqp-3-05','phase-3',5,'특성 매트릭스','Characteristics Matrix','output',NULL,'8.5.1','team-qc',24),
  ('apqp-3-06','phase-3',6,'공정 FMEA (PFMEA)','Process FMEA','output','FMEA','8.5.1','team-qc',25),
  ('apqp-3-07','phase-3',7,'양산전 관리계획서(Pre-Launch CP)','Pre-Launch Control Plan','output','CP','8.5.1','team-qc',26),
  ('apqp-3-08','phase-3',8,'작업표준서·공정지침서','Process Instructions','output',NULL,'8.5.1','team-pr',27),
  ('apqp-3-09','phase-3',9,'측정시스템분석(MSA) 계획','Measurement Systems Analysis Plan','output','MSA','7.1.5.1.1','team-qc',28),
  ('apqp-3-10','phase-3',10,'초기 공정능력 연구 계획','Preliminary Process Capability Study Plan','output','SPC','9.1.1','team-qc',29),
  ('apqp-3-11','phase-3',11,'경영자 지원','Management Support','output',NULL,'5.1','team-mg',30),
  ('apqp-4-01','phase-4',1,'양산 시험가동(Production Trial Run)','Production Trial Run','output',NULL,'8.5.1','team-pr',31),
  ('apqp-4-02','phase-4',2,'측정시스템분석(MSA)','Measurement Systems Analysis','output','MSA','7.1.5.1.1','team-qc',32),
  ('apqp-4-03','phase-4',3,'초기 공정능력 연구','Preliminary Process Capability Study','output','SPC','9.1.1','team-qc',33),
  ('apqp-4-04','phase-4',4,'양산부품승인(PPAP)','Production Part Approval Process','output','PPAP','8.3.4.4','team-qc',34),
  ('apqp-4-05','phase-4',5,'양산 검증 시험','Production Validation Testing','output',NULL,'8.6','team-qc',35),
  ('apqp-4-06','phase-4',6,'포장 평가','Packaging Evaluation','output',NULL,'8.5.4','team-pu',36),
  ('apqp-4-07','phase-4',7,'양산 관리계획서(Production CP)','Production Control Plan','output','CP','8.5.1','team-qc',37),
  ('apqp-4-08','phase-4',8,'품질계획 승인(Sign-Off)','Quality Planning Sign-Off','output',NULL,'8.3.4','team-qc',38),
  ('apqp-4-09','phase-4',9,'경영자 지원','Management Support','output',NULL,'5.1','team-mg',39),
  ('apqp-5-01','phase-5',1,'변동 감소','Reduced Variation','output','SPC','10.2','team-qc',40),
  ('apqp-5-02','phase-5',2,'고객 만족','Customer Satisfaction','output',NULL,'9.1.2','team-mg',41),
  ('apqp-5-03','phase-5',3,'인도 및 서비스','Delivery and Service','output',NULL,'8.5.5','team-pu',42),
  ('apqp-5-04','phase-5',4,'교훈(Lessons Learned)·모범사례','Lessons Learned / Best Practices','output',NULL,'10.3','team-qc',43)
) x
WHERE NOT EXISTS (SELECT 1 FROM apqp_elements);
