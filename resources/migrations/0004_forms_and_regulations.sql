-- ============================================================
-- Migration 0004: Forms + Regulation Sections (v5 Soft Reset)
--
-- Purpose:
--   1. Store regulation full text (sections) per regulation code
--   2. Define form masters (B1100-01, B2100-01, A5100-02, B1100-03)
--   3. Define form fields per form (typed: text/date/textarea/photo/...)
--   4. Track form submissions (filled instances)
--   5. Link submissions across forms (B1100-01 → B2100-01 → ...)
-- ============================================================

-- 1. Regulation full text (split by section)
CREATE TABLE IF NOT EXISTS regulation_sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_code     TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_body TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_regsec_code ON regulation_sections(reg_code);

-- 2. Form masters
CREATE TABLE IF NOT EXISTS forms (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  reg_code        TEXT NOT NULL,
  description     TEXT,
  approvals_json  TEXT NOT NULL,
  next_form_code  TEXT,
  next_form_label TEXT,
  prev_form_code  TEXT
);

-- 3. Form fields
CREATE TABLE IF NOT EXISTS form_fields (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code          TEXT NOT NULL,
  field_key          TEXT NOT NULL,
  label              TEXT NOT NULL,
  type               TEXT NOT NULL,
  section            TEXT,
  placeholder        TEXT,
  options_json       TEXT,
  unit               TEXT,
  ai_enabled         INTEGER NOT NULL DEFAULT 0,
  ai_prompt_hint     TEXT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  UNIQUE(form_code, field_key),
  FOREIGN KEY (form_code) REFERENCES forms(code)
);
CREATE INDEX IF NOT EXISTS idx_field_form ON form_fields(form_code, sort_order);

-- 4. Form submissions (filled instances)
CREATE TABLE IF NOT EXISTS form_submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code   TEXT NOT NULL,
  serial_no   TEXT,
  values_json TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_by  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (form_code) REFERENCES forms(code)
);
CREATE INDEX IF NOT EXISTS idx_sub_form ON form_submissions(form_code, updated_at DESC);

-- 5. Submission-to-submission links (B1100-01 #42 → B2100-01 #17)
CREATE TABLE IF NOT EXISTS form_submission_links (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  from_submission_id INTEGER NOT NULL,
  to_submission_id   INTEGER NOT NULL,
  created_at         TEXT NOT NULL,
  UNIQUE(from_submission_id, to_submission_id),
  FOREIGN KEY (from_submission_id) REFERENCES form_submissions(id),
  FOREIGN KEY (to_submission_id)   REFERENCES form_submissions(id)
);

-- ============================================================
-- SEED: Regulation Sections (B-1100, B-2100, A-5100)
-- Extracted from v4 prototype REG_TEXT
-- ============================================================

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order) VALUES
('B-1100', '1. 적용범위',
 '이 규정은 당사 제품의 제조과정(자재수급, 제조, 검사, 취급, 보관)에서 발생된 부적합품 및 의심스러운 제품의 처리 및 관리방법에 대하여 적용한다.',
 1),
('B-1100', '2. 목적',
 '당사에서 생산되는 제품의 품질규격 또는 기술표준에 규정된 품질요건에 적합치 않는 부적합(품)을 식별, 격리, 조치, 문서화하여 부적합(품)이 부주의 또는 고의로 잘못 사용되는 것을 방지하는데 있다.',
 2),
('B-1100', '4. 책임과 권한',
 '(1) 품질보증팀장은 부적합품에 대한 처리방법을 결정하고, 부적합사항의 시정을 해당팀에 지시할 책임과 권한이 있다.' || char(10) ||
 '(2) 품질보증팀장은 부적합품에 대한 선적중단, 생산 중단에 대하여 해당팀에 지시할 책임과 권한이 있다.' || char(10) ||
 '(3) 품질보증팀장은 잠재적 부적합 파악 및 봉쇄에 대하여 해당팀에 지시할 책임과 권한이 있다.' || char(10) ||
 '(4) 생산관리팀장은 생산공정중에 발생하는 부적합품에 대해 조치할 책임이 있으며, 부적합품의 식별 및 분리를 위한 박스(BOX) 또는 장소를 준비하고 관리할 책임이 있다.',
 4),
('B-1100', '5.2 식별',
 '부적합품이 발생되면, 아래의 한가지 또는 그 이상의 방법으로 부적합품을 식별하여 오용을 방지해야 한다.' || char(10) ||
 '(1) 마킹(MARKING)  (2) 꼬리표(TAG)  (3) 스티커(STICKER)  (4) 스템핑(STAMPING)' || char(10) ||
 '(5) 검사필증  (6) 보관장소에 보관  (7) 검사 및 시험기록',
 5),
('B-1100', '13. 부적합품 발생 통보서에 의한 처리 절차',
 '13.1 ''부적합품 발생 통보서''의 발행은 품질보증팀장이 한다.' || char(10) ||
 '13.2 품질보증팀장은 발행시 ''부적합품 통보서 관리대장''에 기록후 배포하며, 이후의 진행관리를 해야한다.' || char(10) ||
 '※ 부적합품 발생 통보서 → 시정조치 요구서(B2100-01) → 개선대책서(B2100-03) → 유효성 검증(B2100-12) 순서로 진행',
 13);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order) VALUES
('B-2100', '1. 적용범위',
 '이 규정은 당사의 원부자재, 반제품, 완제품의 부적합, 공정트러블, 고객불만, 납기 미준수, 업무절차 불합리 등에 대한 시정/예방조치 절차에 대하여 규정한다.',
 1),
('B-2100', '2. 목적',
 '업무/작업중 발생/발견한 부적합에 대한 조사와 개선으로 재발이 방지되도록 함에 목적이 있다.',
 2),
('B-2100', '4.1.1 시정조치 대상',
 '수입검사 불합격 → 주관: 품질보증팀, 조치: 외주처' || char(10) ||
 '생산중 자재불량 → 주관: 품질보증팀, 조치: 외주처' || char(10) ||
 '자주검사 불량 → 주관: 생산팀, 조치: 원인제공팀' || char(10) ||
 '순회검사 불량 → 주관: 품질보증팀, 조치: 해당팀' || char(10) ||
 '고객 불만(클레임) → 주관: 품질보증팀, 조치: 해당팀' || char(10) ||
 '내부심사 지적 → 주관: 품질경영팀, 조치: 피심사팀',
 3),
('B-2100', '표준화 절차',
 '대책 실시 완료 후 효과 확인 → 표준화 시 관련 문서 개정:' || char(10) ||
 'FMEA(J-1101), 관리계획서(J-1102), 작업표준서(J-1103) 등 해당 문서를 반드시 개정하여야 한다.',
 10);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order) VALUES
('A-5100', '심사 유형',
 '■ 품질 시스템 심사 (IATF 16949 전 조항)' || char(10) ||
 '■ 제조공정 심사 (각 사업부별 제조라인)' || char(10) ||
 '■ 제품 심사 (완성품 치수/외관/기능)' || char(10) ||
 '■ 환경 시스템 심사 (ISO 14001)' || char(10) ||
 '■ 안전 시스템 심사',
 1),
('A-5100', '심사 우선순위 기준',
 '리스크(상/중/하) × 10점 + KPI 달성여부 × 40점 + 프로세스 중대성(상/중/하) × 10점 + 우선순위 × 35점 + CSR 유무 × 5점 = 총점 기준 등급 결정',
 2);

-- ============================================================
-- SEED: Forms (4개 양식)
-- ============================================================

INSERT INTO forms (code, name, reg_code, description, approvals_json, next_form_code, next_form_label, prev_form_code) VALUES
('B1100-01', '부적합품 발생 통보서', 'B-1100',
 '공정/수입검사에서 부적합품 발생 시 작성. IATF §10.2 부적합 및 시정조치.',
 '["담당","팀장","사업부장"]',
 'B2100-01', '이 부적합에 대한 시정조치를 요구합니다',
 NULL),
('B2100-01', '시정/예방조치 요구서', 'B-2100',
 '부적합 사항에 대한 시정 또는 예방조치를 요구. IATF §10.2.3~10.2.6.',
 '["담당","팀장","사업부장","부사장","대표이사"]',
 'B2100-03', '상세 개선 대책을 수립합니다',
 'B1100-01'),
('A5100-02', '내부심사 실시 계획서', 'A-5100',
 '품질/환경/안전 시스템 내부심사 실시 계획. IATF §9.2 내부심사.',
 '["팀장","사업부장","사장"]',
 NULL, NULL, NULL),
('B1100-03', '특채 의뢰서', 'B-1100',
 '부적합품에 대한 특별 채용(특채) 의뢰. 고객 승인 필요 여부 포함.',
 '["작성","검토","승인"]',
 NULL, NULL, NULL);

-- ============================================================
-- SEED: Form Fields
-- ============================================================

-- B1100-01 부적합품 발생 통보서
INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
('B1100-01','h1','발행번호','auto','기본정보','NCR-2026-XXXX (자동부여)',NULL,NULL,0,NULL,1),
('B1100-01','h2','작성일자','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('B1100-01','h3','작성자','auto','기본정보','로그인 사용자',NULL,NULL,0,NULL,3),
('B1100-01','h4','수신처','select','기본정보',NULL,'["생산팀","개발팀","품질보증팀","구매팀","외주업체"]',NULL,0,NULL,4),
('B1100-01','i1','발생일자','date','부적합 정보',NULL,NULL,NULL,0,NULL,10),
('B1100-01','i2','불량수량','number','부적합 정보','수량',NULL,'EA',0,NULL,11),
('B1100-01','i3','품 명','text','부적합 정보','제품명',NULL,NULL,0,NULL,12),
('B1100-01','i4','LOT NO','text','부적합 정보','LOT 번호',NULL,NULL,0,NULL,13),
('B1100-01','i5','품번 & 규격','text','부적합 정보','품번-규격',NULL,NULL,0,NULL,14),
('B1100-01','i6','발생장소','select','부적합 정보',NULL,'["본사 1공장","2공장(AM)","3공장(쇼바)","수입검사","출하검사"]',NULL,0,NULL,15),
('B1100-01','c1','부적합 내용','textarea','상세 내용','부적합 현상을 구체적으로 기술 (규격, 실측값, 불량유형 등)',NULL,NULL,1,
 '부적합 내용을 작성. 입력된 품명/LOT/품번/규격/불량수량을 활용해서 부적합 현상, 발생 공정/시점, 발견 방법, 불량 유형, 영향 범위를 구체적으로 기술.',20),
('B1100-01','c2','현품 사진','photo','상세 내용',NULL,NULL,NULL,0,NULL,21),
('B1100-01','c3','조사 내용','textarea','상세 내용','원인 조사 결과 (직접원인, 근본원인)',NULL,NULL,1,
 '직접원인과 근본원인 분석. 가능하면 5-Why 기법으로 단계별 원인 추적. TPC AM사업부 인발/가공 공정 컨텍스트 반영.',22),
('B1100-01','c4','처리 방법','radio','상세 내용',NULL,'["재작업","수정(수리)","선별","특채","폐기","반출(업체)"]',NULL,0,NULL,23);

-- B2100-01 시정/예방조치 요구서
INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
('B2100-01','s1','발행번호','auto','기본정보','CAR-2026-XXXX (자동부여)',NULL,NULL,0,NULL,1),
('B2100-01','s2','발행일자','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('B2100-01','s3','구분','radio','기본정보',NULL,'["시정","예방"]',NULL,0,NULL,3),
('B2100-01','s4','수신처','select','기본정보',NULL,'["생산팀","개발팀","구매팀","총무팀","영업팀","외주업체"]',NULL,0,NULL,4),
('B2100-01','s5','발행구분','checkbox','기본정보',NULL,'["2자심사","3자심사","품질 내부감사","환경 내부감사","경영검토","크레임&불만"]',NULL,0,NULL,5),
('B2100-01','s6','부적합 사항','textarea','부적합 내용','부적합 사항을 구체적으로 기술',NULL,NULL,1,
 '연결된 부적합품 통보서(B1100-01)의 내용을 요약하고, 관련 IATF 조항을 참조해서 시정조치 대상 사실을 정리.',10),
('B2100-01','s7','관련 규격/문서','text','부적합 내용','IATF 조항 또는 사내 규정번호',NULL,NULL,0,NULL,11),
('B2100-01','s8','회신 요구일','date','부적합 내용',NULL,NULL,NULL,0,NULL,12),
('B2100-01','s9','원인 분석','textarea','조치 내용 (수신처 작성)','근본원인 분석 (5-Why, 특성요인도 등 활용)',NULL,NULL,1,
 '5-Why 분석 기법으로 단계별 원인 추적 후 근본원인 도출. 부적합 사항 입력값 참조.',13),
('B2100-01','s10','재발방지 대책','textarea','조치 내용 (수신처 작성)','즉시조치 + 재발방지대책 + 유효성 검증 계획',NULL,NULL,1,
 '즉시 조치 / 재발방지 대책 / 유효성 검증 계획 3단으로 구성. 관련 표준 문서(FMEA, 관리계획서, 작업표준서) 개정 항목 명시.',14);

-- A5100-02 내부심사 실시 계획서
INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
('A5100-02','a1','관리번호','auto','기본정보','TPC-Q-260615 (자동부여)',NULL,NULL,0,NULL,1),
('A5100-02','a2','심사구분','radio','기본정보',NULL,'["정기","비정기"]',NULL,0,NULL,2),
('A5100-02','a3','심사항목','checkbox','기본정보',NULL,'["품질 시스템","제조공정","제품","환경 시스템","안전 시스템"]',NULL,0,NULL,3),
('A5100-02','a4','피심사부서','text','심사 정보','전 부서',NULL,NULL,0,NULL,10),
('A5100-02','a5','심사팀장','text','심사 정보','심사팀장명',NULL,NULL,0,NULL,11),
('A5100-02','a6','심사일정','text','심사 정보','2026.06.15 ~ 06.17',NULL,NULL,0,NULL,12),
('A5100-02','a7','심사 우선순위 설정','textarea','심사 계획','리스크, KPI 성과, 프로세스 중대성 기반 우선순위',NULL,NULL,1,
 '리스크(상/중/하)×10 + KPI달성×40 + 프로세스 중대성×10 + 우선순위×35 + CSR×5 점수표 기반으로 1~5순위 도출. 전년도 사업부별 점수(필라넥 92.3 최저, AM 95.5)를 반영하여 중점 심사 사업부 식별.',20);

-- B1100-03 특채 의뢰서
INSERT INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order) VALUES
('B1100-03','t1','의뢰부서','text','기본정보',NULL,NULL,NULL,0,NULL,1),
('B1100-03','t2','의뢰일','date','기본정보',NULL,NULL,NULL,0,NULL,2),
('B1100-03','t3','품명','text','제품 정보',NULL,NULL,NULL,0,NULL,10),
('B1100-03','t4','품번','text','제품 정보',NULL,NULL,NULL,0,NULL,11),
('B1100-03','t5','차종','text','제품 정보',NULL,NULL,NULL,0,NULL,12),
('B1100-03','t6','특채종류','radio','제품 정보',NULL,'["교환조건","그대로사용","수정사용","조립사용","기타"]',NULL,0,NULL,13),
('B1100-03','t7','부적합내용','textarea','상세 내용',NULL,NULL,NULL,1,
 '부적합 현상을 정량적으로 기술(규격 vs 실측값, 불량수량/생산량/불량률).',20),
('B1100-03','t8','특채내용','textarea','상세 내용',NULL,NULL,NULL,1,
 '특채 종류 선택에 따른 처리 방법, 수정 시 예상 결과, 고객 영향도를 정리.',21),
('B1100-03','t9','고객승인 필요성','radio','승인',NULL,'["필요","불필요"]',NULL,0,NULL,22),
('B1100-03','t10','결점분류','radio','승인',NULL,'["치명적 결함","중결함","경결함","결함없음"]',NULL,0,NULL,23);
