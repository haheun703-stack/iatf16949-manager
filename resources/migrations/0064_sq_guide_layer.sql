-- ============================================================
-- Migration 0064: SQ 작성 가이드층 (코워크 07/08번 지시서, 2026-07-16)
--
-- 원천 = sq_write_guide_seed.json (Ver4 · 42항목 · 1000점 검증됨).
-- 생성기 = scratchpad gen_0064.py (JSON 재시드 시 재생성).
-- 원칙(07번 1절): SQ 항목은 기존 sq_items(0012)가 마스터 — 여기선
-- 가이드 속성만 별도 테이블로 얹는다(spine 불변). 가이드 텍스트는
-- 읽기 전용 마스터(앱에서 수정 금지, 개정=JSON 교체 후 재시드).
-- 채점 계수·등급컷은 하드코딩 금지 → app_config 키-값.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 항목별 가이드 헤더 (sq_items.code 1:1)
CREATE TABLE IF NOT EXISTS sq_guide_items (
  item_code        TEXT PRIMARY KEY,   -- sq_items.code ('1_1'~'6_12')
  area             TEXT NOT NULL,
  high_value       INTEGER NOT NULL DEFAULT 0,  -- 50점급 ★
  regulations_text TEXT,               -- 지배규정 원문 문자열(파싱은 뷰에서)
  forms_text       TEXT,               -- 필요양식 원문 문자열
  cycle_retention  TEXT,               -- 주기/보존
  guide_version    TEXT NOT NULL
);

-- 가이드 상세 불릿 (섹션 4종) — id는 생성기가 부여(체크포인트 FK 결정성)
CREATE TABLE IF NOT EXISTS sq_guides (
  id         INTEGER PRIMARY KEY,
  item_code  TEXT NOT NULL,
  section    TEXT NOT NULL CHECK(section IN ('evidence','how_to_write','examples','penalty_patterns')),
  sort_order INTEGER NOT NULL,
  content    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sq_guides_item ON sq_guides(item_code, section, sort_order);

-- 세부 점검포인트 체크 상태 (evidence 불릿 1:1, 이행상태 자동 제안의 원천)
CREATE TABLE IF NOT EXISTS sq_checkpoints (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code     TEXT NOT NULL,
  guide_id      INTEGER,              -- sq_guides(evidence 불릿)와 1:1
  status        TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('met','partial','missing','na')),
  evidence_note TEXT,
  updated_by    TEXT,
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sq_checkpoints_item ON sq_checkpoints(item_code);

-- 자체평가 실행 이력 (6_4 증빙) + 42항목 라인
CREATE TABLE IF NOT EXISTS sq_assessments (
  id          TEXT PRIMARY KEY,       -- 'SA-2026-H1'
  assessed_at TEXT NOT NULL,
  total_score REAL,
  grade       TEXT,                   -- S/G/불합격
  report_path TEXT,
  approved_by TEXT,
  approved_at TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sq_assessment_lines (
  assessment_id   TEXT NOT NULL,
  item_code       TEXT NOT NULL,
  suggested_state TEXT,               -- 자동 제안값(감사 추적 보존)
  final_state     TEXT,               -- 사람 확정: 우수/양호/보완/일부미흡/다수미흡/미관리/미해당
  observation     TEXT,
  extra_finding   TEXT,
  PRIMARY KEY (assessment_id, item_code)
);

-- 채점 계수·등급컷·특수규칙 (07번 3절: 하드코딩 금지)
INSERT INTO app_config (key, value) VALUES ('sq.guide_version', 'Ver4') ON CONFLICT(key) DO UPDATE SET value = excluded.value;
INSERT INTO app_config (key, value) VALUES ('sq.state_coefficients', '{"우수": 1.0, "양호": 0.8, "보완": 0.6, "일부미흡": 0.5, "다수미흡": 0.25, "미관리": 0.0}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;
INSERT INTO app_config (key, value) VALUES ('sq.grade_rule', '{"S": 900, "G": 600, "fail_below": 600}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;
INSERT INTO app_config (key, value) VALUES ('sq.special_rules', '["6_5 중요/특별공정 자격인증 미실시·허위 = 0점", "4_x 자체 프레스 공정 없으면 미해당(총점 환산 xlsm 확인 필요)", "4_1 출하수량 기준 타발수 관리 = 감점", "5_2 입고품 손상 발견 = 감점", "6_2 변경점 마스터리스트 누락 = 감점"]') ON CONFLICT(key) DO UPDATE SET value = excluded.value;
INSERT INTO app_config (key, value) VALUES ('sq.common_principles', '["**실측값을 수치로 기록하라.** OK/NG, ○/× 결론만 기록하면 \"기록 불명확\"으로 **보완(×0.6)** 처리됨. 반드시 측정값 + 관리기준(상하한)을 함께 기재. 예: `로내 2구간 온도 748℃ (기준 750±10℃) 적합`", "**누락 없이 기록하라.** 간헐적 누락 = 일부미흡(×0.5), 동일항목 연속 누락·다수 누락 = 다수미흡(×0.25). 빈칸이 생기면 사유를 기재하고 대체 검증 기록을 남길 것.", "**허위기재는 절대 금지.** 심사 전 몰아쓰기·소급작성이 확인되면 다수미흡, 자격인증 허위는 0점. 필기구·필적·날짜 일관성으로 적발됨.", "**판정 근거를 남겨라.** 최종 데이터만 있고 판정 근거자료(원본 측정기록, 사진)가 없으면 신뢰성 미확보로 보완 처리.", "**기준과 현장이 일치해야 한다.** 문서에 쓴 주기/방법/담당과 실제 현장 운영이 다르면 일부미흡. 기준 개정 없이 현장만 바꾸지 말 것.", "**관리기준에는 설정근거를 달아라.** 점검주기·판정기준을 정할 때 \"왜 이 주기인가\"(설비사 매뉴얼, 과거 T/O 이력, 안전율 80% 등)를 기준서에 명시.", "**표기 통일.** 날짜는 YYYY-MM-DD, 담당자는 서명+실명, 수정 시 두 줄 긋고 정정서명(수정테이프 금지 — 데이터 신뢰성 지적 대상)."]') ON CONFLICT(key) DO UPDATE SET value = excluded.value;

-- 항목별 가이드 헤더 42행
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('1_1', '생산조건관리', 0, 'TPC-A-4100 문서및자료관리, TPC-A-4101 관리표준작성 지침, TPC-J-1101 공정FMEA 지침, TPC-J-1102 관리계획서 지침, TPC-J-1103 작업표준서 지침, TPC-M-1100 생산관리 규정', '관리계획서(Control Plan), 작업표준서, 공정FMEA, 공정흐름도, 설비일상점검표', '표준류 개정 시 즉시 갱신, 도면·4M 변경 시 연계 개정. 보존 3년 이상(차종 단산 후 1년).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('1_2', '생산조건관리', 0, 'TPC-M-1200 공정관리 규정', '설비 재가동 점검 체크시트, 비가동/이상발생 관리대장', '발생 시마다. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('1_3', '생산조건관리', 0, '(미지정 — TPC-J-1103 작업표준서 지침 + TPC-F-1100 교육훈련 규정 연계 권장)', '현지어 번역 작업표준서/점검표, 외국인 작업자 교육이력', '표준 개정 시·신규 외국인 투입 시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('1_4', '생산조건관리', 0, '(미지정 — TPC-M-1200 공정관리 + TPC-L-2100 검사업무 규정 연계 권장)', '교대 인수인계 일지, 야간/특근 초·종품 검사기록, 자주/순회검사 체크시트', '매 교대/특근 시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('1_5', '생산조건관리', 0, '(미지정 — TPC-M-1200 공정관리 + TPC-J-1102 관리계획서 지침 연계 권장)', '브레이징로 점검(일일초품 용입검사), 작업표준서(로브레이징), 온도 프로파일 기록', '조건 실측 매일(일상점검 연동), 프로파일 정기(월/분기, 자체 기준 근거 필요). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_1', '검사시험', 0, 'TPC-K-1200 협력업체관리, TPC-L-2100 검사업무 규정', '검사협정서, 수입검사 기준서, 수입검사 일지/이력', '입고 시마다, 협정서상 주기. 보존 3년(협정 요구 시 그 이상).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_2', '검사시험', 0, '(미지정 — TPC-K-2100 자재관리 + TPC-L-2100 연계 권장)', '수입검사 관리대장(마스터 LIST) ※보유 6건뿐, 표준양식 없음 — 갭', '입고 시마다 + 월 1회 대사. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_3', '검사시험', 0, 'TPC-L-2300 한도견본관리 규정', '한도견본 (한도견본 관리대장·식별 라벨)', '시업 시(마스터 검증), 견본 유효기간 관리. 보존: 견본 폐기 후 대장 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_4', '검사시험', 0, 'TPC-L-2200 신뢰성 시험업무 규정', '정기검사(신뢰성) 성적서, 시험성적서, 인장시험 성적서, 도금두께 측정', '검사협정 주기(통상 분기~년). 보존 3년+.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_5', '검사시험', 0, 'TPC-L-3100 계측기관리 규정', '계측기 관리대장, 검교정 성적서/태그', '계측기별 교정주기. 성적서 보존: 차차기 교정 시까지(최소 3년).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_6', '검사시험', 0, 'TPC-L-3101 측정시스템 평가 지침', '게이지 R&R (측정시스템분석 Gauge R&R 양식)', '신규 계측기 도입 시 + 정기(연 1회 권장, 자체 기준 근거). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_7', '검사시험', 0, 'TPC-L-2100 검사업무 규정', '자주/순회검사 체크시트 (보유 399건 — 표준양식 통일 필요)', '매 LOT 초/종품 + 순회 일 N회(기준 명시). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_8', '검사시험', 0, 'TPC-L-2100 검사업무, TPC-M-3100 완성품 관리 규정', '완성품/출하 검사 성적서 (표준양식 갭)', '출하검사는 LOT별, 종합 최종검사 1회/3개월 이상. 보존 3년+.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('2_9', '검사시험', 0, 'TPC-B-2100 시정조치 규정', '리크/리워크 기록 (보유 749건 — 표준양식 통일 필요)', '발생 시마다. 보존 3년+(필드클레임 대응 근거).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_1', '설비관리', 0, 'TPC-L-1100 설비관리 규정', '설비일상점검표', '매일 시업 전. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_2', '설비관리', 0, 'TPC-L-1100 설비관리 규정', '설비 정기점검 (협력사 정기점검 마스터 현황)', '설비별 계획 주기(최소 연 1회). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_3', '설비관리', 0, 'TPC-L-1200 지그관리 규정', '지그/치공구 점검 체크시트 (표준양식 갭)', '시업 시 매일. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_4', '설비관리', 0, '(미지정 — TPC-L-1100 설비관리 연계 권장)', '설비일상점검표 (용접기/로/로봇 특화 항목 포함)', '매일 시업 전. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_5', '설비관리', 0, '(미지정 — TPC-L-1100 설비관리 연계 권장)', '브레이징로 점검 (로브레이징 일일초품 용입검사)', '구간온도 매일, 프로파일 정기(자체 근거 주기). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_6', '설비관리', 0, '(미지정 — TPC-L-1100 설비관리 연계 권장)', '설비일상점검표 (해당 항목 포함)', '매일. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('3_7', '설비관리', 0, 'TPC-L-1200 지그관리 규정', '지그/치공구 정기점검표 (표준양식 갭)', '분기 1회 이상(자체 근거 시 조정). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('4_1', '금형관리', 0, '(미지정 — TPC-L-1100 설비관리 or 금형관리 규정 신설 검토)', '금형 일상/정기점검 체크시트 (라이브러리에 견적서 양식만 존재 — 점검 체크시트 갭)', '일상 매 사용일, 정기 타발수 도달 시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('4_2', '금형관리', 0, '', '', '', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('4_3', '금형관리', 0, '', '', '', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('4_4', '금형관리', 0, '', '', '', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('4_5', '금형관리', 0, '', '', '발생 시마다. 보존 3년(금형 폐기 시까지 권장).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('5_1', '자재관리', 0, 'TPC-K-2100 자재관리, TPC-M-2100 식별및추적성관리 규정', 'LOT 추적성/선입선출 관리대장 (표준양식 갭)', '생산 LOT별 상시. 보존 3년+(추적성은 필드클레임 대응 핵심).', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('5_2', '자재관리', 0, 'TPC-K-2100 자재관리 규정', '자재 보관관리 기준서·창고 Lay-Out (표준양식 갭)', '월 1회 점검 권장. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('5_3', '자재관리', 0, 'TPC-K-2100, TPC-M-2100', '식별관리 (포장용기별 사양식별표)', '상시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('5_4', '자재관리', 0, '(미지정 — TPC-M-3100 완성품관리 + TPC-K-2100 연계 권장)', '용기/적재 표준화 기준 (표준양식 갭)', '상시. 기준 개정 시 갱신. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_1', '품질경영체제', 0, 'TPC-D-1100 제품안전관리 규정 (+산안법 체계 연계)', '안전관리 점검 체크시트', '일상+정기(월). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_2', '품질경영체제', 0, 'TPC-J-1100 개발업무, TPC-J-2100 양산부품승인, TPC-J-3100 4M변경관리 규정', '4M/설계변경 관리대장·신고서, ISIR/PPAP 승인자료, 공정FMEA', '발생 시 + 월 1회 누락점검. 보존 3년+.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_3', '품질경영체제', 0, 'TPC-J-1102 관리계획서 지침, TPC-J-4100 도면관리 규정', '검사협정서, 도면, 관리계획서', '정기(반기 권장) + 도면 개정 시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_4', '품질경영체제', 0, 'TPC-A-5100 내부심사, TPC-A-5200 공정및제품심사, TPC-A-8100 리스크관리 규정', '품질매뉴얼/절차서, 내부심사 계획·보고서(A5100-01~04)', '연 1회 이상(반기 권장). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_5', '품질경영체제', 0, 'TPC-F-1100 교육훈련, TPC-F-1101 신규보직자 지침, TPC-F-2100 사내자격관리 규정', '자격인증/교육 기록 (배치표·인증평가서)', '인증 유효기간(통상 1년) + 신규/복귀 시. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_6', '품질경영체제', 0, 'TPC-B-1100 부적합품 관리 규정', '부적합/특채 처리 기록, 식별관리', '발생 시 + 월 대사. 보존 3년+.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_7', '품질경영체제', 0, 'TPC-B-2100 시정조치, TPC-B-2200 지속적개선, TPC-H-3200 고객불만처리, TPC-L-4100~4102 통계기법·관리도·공정능력', '품질실적/개선 보고서 (월간 품질실적 집계표)', '월 1회. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_8', '품질경영체제', 0, '(미지정 — TPC-L-2100 검사업무 연계 권장)', '조도관리 측정 기록', '정기(분기 권장). 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_9', '품질경영체제', 0, 'TPC-M-4100 3정5S활동 규정', '3정5행 점검 체크시트', '월 1회 권장. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_10', '품질경영체제', 0, '(미지정 — TPC-B-1100 부적합품관리 연계 권장)', '리워크 관리 기준서·이력 대장 (2_9와 연동)', '발생 시. 보존 3년+.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_11', '품질경영체제', 0, '(미지정 — TPC-M-1200 공정관리 연계 권장)', '공정이동 전표, 부자재 수불 대사 기록', '전표 상시, 대사 월 1회. 보존 3년.', 'Ver4');
INSERT OR REPLACE INTO sq_guide_items (item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version) VALUES ('6_12', '품질경영체제', 0, '(미지정 — TPC-B-2200 지속적개선 연계 권장)', '정성품질 활동 기록 (통신문 게시·개선이력·포상)', '월 활동 + 분기 보고 권장. 보존 3년.', 'Ver4');

-- 가이드 불릿 + 체크포인트(evidence 1:1, 초기 status=missing)
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (1, '1_1', 'evidence', 1, '품목별 공정흐름도 → 공정FMEA → 관리계획서 → 작업표준서 4종 세트 (개정번호·개정일 일치)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_1', 1);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (2, '1_1', 'evidence', 2, '검사협정서/검사기준서와 사내 표준류의 검사항목·주기 대조표');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_1', 2);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (3, '1_1', 'evidence', 3, '현장 게시된 작업표준서 (사무실 보관본과 동일 Rev.)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_1', 3);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (4, '1_1', 'evidence', 4, '중요공정/안전·보안공정 식별 표시 (관리계획서 內 ◆·안전마크 + 현장 표지)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_1', 4);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (5, '1_1', 'evidence', 5, '공정 투입 설비·부자재 사전 검증 기록 (승인된 설비/부자재 리스트)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_1', 5);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (6, '1_1', 'how_to_write', 1, '관리계획서의 관리항목·관리기준·주기·방법이 작업표준서/일상점검표에 그대로 내려가는지 3문서 교차 확인 후 작성. 불일치가 가장 흔한 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (7, '1_1', 'how_to_write', 2, '공정FMEA의 고위험(AP 높은) 항목이 관리계획서 특별특성으로 반영됐는지 연결 고리를 명시.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (8, '1_1', 'how_to_write', 3, '신규 설비·부자재(열풍기, 윤활재 등)를 쓰려면 먼저 검증기록을 만들고 표준류에 반영한 뒤 사용.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (9, '1_1', 'examples', 1, '대조표 기재 예: `용접부 리크 | 검사협정: 전수 리크시험 0.5cc/min↓ | 관리계획서 CP-08 동일 | 작업표준서 WS-12 동일 | 일치 ○ | 점검자 홍길동 2026-07-01`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (10, '1_1', 'penalty_patterns', 1, '관리계획서엔 있는데 작업표준서에 없는 관리항목 (문서간 불일치 → 일부미흡)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (11, '1_1', 'penalty_patterns', 2, '현장 게시본이 구버전 Rev. (표준 개정 후 현장 교체 누락)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (12, '1_1', 'penalty_patterns', 3, '미승인 열풍기·윤활재 등 현장 사용 (즉시 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (13, '1_2', 'evidence', 1, '계획 중단(주말·연휴·기간별) 시간별/사유별 점검절차 기준서');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_2', 13);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (14, '1_2', 'evidence', 2, '비계획 중단(고장·정전) 시 설비점검 지침 + 생산중 제품 품질보증 절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_2', 14);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (15, '1_2', 'evidence', 3, '중단 직전 생산품 이상유무 검사기록 + 조치 후 초품검사 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_2', 15);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (16, '1_2', 'evidence', 4, '조치 중 발생 불량품 폐기수량 이력');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_2', 16);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (17, '1_2', 'evidence', 5, '비계획 중단 전/후 LOT 구분·식별 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_2', 17);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (18, '1_2', 'how_to_write', 1, '재가동 체크시트에 반드시 4요소 기재: ①중단 일시/사유 ②직전품 검사결과(수치) ③재가동 초품 검사결과(수치) ④전/후 LOT 번호.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (19, '1_2', 'how_to_write', 2, '툴 교환도 "중단"에 포함됨 — 교환 전후 초품검사를 같은 양식으로 기록.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (20, '1_2', 'examples', 1, '`2026-07-14 10:20 콘베어 모터 트립(비계획 35분) | 직전품 LOT B0714-2 리크검사 5EA 적합 | 조치: 모터 재기동, 초품 3EA 용입검사 적합(용입률 92%, 기준 85%↑) | 재가동 LOT B0714-3부터 구분 | 조치자 김철수 / 확인 박반장`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (21, '1_2', 'penalty_patterns', 1, '재가동 기록은 있는데 직전 생산품 검사 기록이 없음 (절차 반쪽 이행)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (22, '1_2', 'penalty_patterns', 2, '중단시간별 차등 점검기준 없음 (30분과 3일 휴무가 동일 점검이면 근거 없음 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (23, '1_2', 'penalty_patterns', 3, '전/후 LOT 미구분 → 문제 발생 시 격리범위 산정 불가로 중지적');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (24, '1_3', 'evidence', 1, '외국인 배치공정 리스트 (공정×국적×언어)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_3', 24);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (25, '1_3', 'evidence', 2, '해당 공정 작업표준서·설비일상점검표·작업일보 현지어 번역본 게시');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_3', 25);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (26, '1_3', 'evidence', 3, '또는(대체) 외국인 작업자 표준류 교육·숙지 확인 기록 (현장 문답 확인 대비)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_3', 26);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (27, '1_3', 'evidence', 4, '우수 가점: 부적합 처리절차·품질문제 개선사례 번역 게시');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_3', 27);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (28, '1_3', 'how_to_write', 1, '번역 게시가 어려우면 교육으로 대체 가능하나, 심사원이 현장에서 외국인 작업자에게 직접 질문함 — 교육기록에 "표준 내용 문답 확인 결과"까지 남길 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (29, '1_3', 'how_to_write', 2, '번역본에는 원본 Rev.와 번역일을 병기해 개정 추적이 되게 함.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (30, '1_3', 'examples', 1, '교육기록: `2026-06-10 응웬반A(베트남) | WS-12 로브레이징 작업표준 교육(베트남어 통역) | 숙지확인: 이상 발생 시 정지→호출 절차 문답 OK | 교육자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (31, '1_3', 'penalty_patterns', 1, '번역본이 구버전 (원본 개정 후 번역 미갱신)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (32, '1_3', 'penalty_patterns', 2, '교육기록만 있고 숙지 확인(문답·평가) 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (33, '1_4', 'evidence', 1, '주간/야간·주말특근·비지정 작업자 투입 시 관리기준 (기준서 조항)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_4', 33);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (34, '1_4', 'evidence', 2, '교대 시 공정 Issue 인수인계 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_4', 34);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (35, '1_4', 'evidence', 3, '야간·특근 초/종품 검사 데이터 (중품은 선택, 장기 LOT는 1회/shift 이상)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_4', 35);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (36, '1_4', 'evidence', 4, '야간 검사요원 미투입 시 대체 검증 프로세스 (익일 주간 검사 등) 기준+실적');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_4', 36);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (37, '1_4', 'how_to_write', 1, '인수인계 일지에 "특이사항 없음"만 반복하지 말 것 — 설비 조건 변경, 자재 LOT 교체, 미결 이슈를 구체 기재. 전부 "없음"이면 형식적 운영으로 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (38, '1_4', 'how_to_write', 2, '야간 생산분 익일검사 대체 시: 야간 초·종품을 식별 보관하고 익일 검사기록에 야간 LOT번호를 명시해 연결.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (39, '1_4', 'examples', 1, '`주간→야간 인계 2026-07-14 18:00 | 로 3구간 온도 상향 조정(747→752℃, 기준내) | 동링 LOT 교체 CR-0712 | 미결: 지그 #3 클램프 유격 의심 → 야간 시업 전 점검 요망 | 인계 김주임/인수 이반장`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (40, '1_4', 'penalty_patterns', 1, '주말특근 생산기록은 있는데 해당일 초·종품 검사기록 없음 (실적 누락 → 일부미흡 이상)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (41, '1_4', 'penalty_patterns', 2, '비지정 작업자(대체 투입) 기록 부재 — 6_5 자격인증과 교차 지적됨');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (42, '1_5', 'evidence', 1, '(로 브레이징) 가용접 전류·전압·유량 기준표 / 사양별 소재 장입량·온도·콘베어속도·용재량(동링/솔더) 기준 / 로내 구간별 온도 실측기록 + 타점기록계 차트 / 온도 프로파일 정기 측정 성적서 / 질소가스 비율 기준·점검기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_5', 42);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (43, '1_5', 'evidence', 2, '(수동 브레이징) 용접표준서 현장 게시(온도·한도견본) / 작업자 인증 기록(6_5 연계) / 겹침 모재 틈새 기준·점검 / 가스유량 경보장치 or 대체 관리기준');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_5', 43);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (44, '1_5', 'evidence', 3, '표준 조건 vs 현장 실측 비교검증 기록 (이 항목의 핵심)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('1_5', 44);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (45, '1_5', 'how_to_write', 1, '"기준수립"과 "현장 비교검증"이 세트다. 조건표만 있으면 절반 — 정기적으로 현장 실측값을 표준값 옆에 나란히 적고 차이를 판정하는 비교검증 시트를 운영할 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (46, '1_5', 'how_to_write', 2, '온도 프로파일은 측정일·측정기기·차트 원본을 보존하고, 프로파일 변경 시 4M 변경(6_2)과 연결.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (47, '1_5', 'how_to_write', 3, '사양(품번)별로 조건이 다르면 품번별 조건표로 분리 — 공용 조건표 하나로 퉁치면 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (48, '1_5', 'examples', 1, '비교검증: `품번 25410-XXXXX | 표준: 2구간 750±10℃·콘베어 180±5mm/min·동링 CR-2.0 | 실측(07-14 09:30): 748℃·182mm/min·CR-2.0 | 판정 적합 | 검증자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (49, '1_5', 'examples', 2, '질소: `N₂ 유량 12㎥/h (기준 10~15) | 노점 -45℃ (기준 -40℃↓) 적합`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (50, '1_5', 'penalty_patterns', 1, '타점기록계 차트 미보존·용지 소진 방치 (실적 누락)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (51, '1_5', 'penalty_patterns', 2, '표준 조건표와 현장 설비 셋팅값 불일치 (일부미흡 대표 사례)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (52, '1_5', 'penalty_patterns', 3, '장갑 실오라기 등 오염 관리 미점검 → 리크 원인으로 연계 지적');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (53, '2_1', 'evidence', 1, '품목별 검사협정서(고객 승인본) — 사급품은 1차사 체결본 사본 + 동일 시료/주기 검사');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 53);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (54, '2_1', 'evidence', 2, '협정 체결 불가 품목(대기업 원재료 등)의 수입검사 기준서');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 54);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (55, '2_1', 'evidence', 3, '외주사 출하성적서 + 자체 수입검사 실측값 비교검증 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 55);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (56, '2_1', 'evidence', 4, '원재료 M/SHEET 합부 판정기준(물성·화학조성 상하한표) + 판정 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 56);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (57, '2_1', 'evidence', 5, '입고 LOT ↔ 출하성적서 LOT 일치 확인 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 57);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (58, '2_1', 'evidence', 6, '용기/포장 적정성 점검 기준·기록 (Ver4 추가: 제전비닐, 이물유입·간섭·오조립 방지, 좌면상태 등)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 58);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (59, '2_1', 'evidence', 7, '다 CAVITY품: CAVITY별 점검기준 (예: 10C↓ 전수, 11C↑ 홀짝일 교차 / 정기는 전 CAVITY)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_1', 59);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (60, '2_1', 'how_to_write', 1, '수입검사 일지에 "성적서 접수 ○"로 끝내지 말고, 성적서 값과 자체 실측값을 나란히 적어 비교판정. 이게 없으면 "성적서 의존 검사"로 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (61, '2_1', 'how_to_write', 2, 'M/SHEET는 접수만으론 부족 — C, Si, Mn 등 조성비를 자사 기준표와 대조해 합부 서명.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (62, '2_1', 'examples', 1, '`입고 07-15 동링 CR-2.0 LOT C25-0712 | 출하성적서 LOT 일치 ○ | 외경 실측 2.01/2.00/2.02mm (성적서 2.01, 기준 2.0±0.05) 적합 | M/SHEET Cu 99.9% 기준충족 | 판정 합격 도장 | 검사자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (63, '2_1', 'penalty_patterns', 1, '사급품을 "1차사가 검사했으니 무검사" 처리 (협정서 사본+동일 검사 필요)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (64, '2_1', 'penalty_patterns', 2, '입고 LOT와 성적서 LOT 불일치 방치');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (65, '2_1', 'penalty_patterns', 3, 'CAVITY 구분 없는 검사 기록');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (66, '2_2', 'evidence', 1, '전 품목 수입검사 마스터 대장 (입고일·품명·LOT·수량·검사여부·판정·검사자)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_2', 66);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (67, '2_2', 'evidence', 2, '검사 전 입고처리(창고입고/전산등록) 차단 프로세스 문서화');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_2', 67);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (68, '2_2', 'evidence', 3, '합격품 식별(합격도장·스티커) 기준 및 현물 식별 상태');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_2', 68);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (69, '2_2', 'how_to_write', 1, '대장의 생명은 "입고 전건 등재"다. 입고 전표수와 대장 행수가 일치해야 함 — 월말에 자체 대사(입고건수 vs 검사건수)를 하고 대장 하단에 대사결과를 기록하면 우수 요소.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (70, '2_2', 'how_to_write', 2, '검사 대기품/합격품/불합격품 구역을 창고 Lay-Out(5_2)과 연동해 표기.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (71, '2_2', 'examples', 1, '`No.482 | 07-15 | 파이프 Φ8 | LOT P-0715A | 2,000EA | 수입검사 07-15 완료 | 합격(성적서 #IR-482) | 합격스티커 부착 | 검사 김검사`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (72, '2_2', 'examples', 2, '월말 대사: `7월 입고 62건 / 대장 등재 62건 / 검사완료 62건 — 누락 0건, 확인자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (73, '2_2', 'penalty_patterns', 1, '입고품이 검사 전에 생산라인으로 직행 (프로세스 차단장치 없음 → 중지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (74, '2_2', 'penalty_patterns', 2, '대장에 일부 품목(부자재·포장재) 누락 — "검사 대상 분류기준"을 먼저 세울 것');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (75, '2_3', 'evidence', 1, '한도견본 등록대장 (견본번호·품번·결함유형·제정일·유효기간·승인)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_3', 75);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (76, '2_3', 'evidence', 2, '현장 비치 한도견본 (양품/한도/불량 구분, 품질특성 게시)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_3', 76);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (77, '2_3', 'evidence', 3, '설비 유효성 검증용 OK/NG 마스터 or 셋팅 마스터지그 + 시업 시 검증기록 (3_1 연계)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_3', 77);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (78, '2_3', 'evidence', 4, '견본 열화(변색·녹) 시 대체 외관검사기준서');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_3', 78);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (79, '2_3', 'evidence', 5, '목시검사(확대경) 견본 비치·이력 (Ver4 추가)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_3', 79);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (80, '2_3', 'how_to_write', 1, '한도견본에는 반드시 유효기간과 승인(고객 협의 필요 항목은 고객승인)을 부여 — 무기한 견본은 지적 대상.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (81, '2_3', 'how_to_write', 2, 'OK/NG 마스터는 "검사기가 NG를 NG로 잡는지" 확인용 — 시업 시 NG마스터 투입 결과(검출 ○)를 일상점검표에 기록.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (82, '2_3', 'examples', 1, '대장: `견본 LS-07 | 스패터 한도 | 25410-XXXXX | 제정 2026-01-10 | 유효 2027-01-09 | 승인 품질팀장 | 비치: 최종검사대`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (83, '2_3', 'examples', 2, '시업검증: `리크검사기 NG마스터 투입 → NG 검출 ○ (07-15 08:05, 작업자 서명)`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (84, '2_3', 'penalty_patterns', 1, '유효기간 경과 견본 사용 / 견본 변색 방치');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (85, '2_3', 'penalty_patterns', 2, 'NG마스터가 없어 검사기 오판정 여부를 검증 못함 (스패터·버 표면기준 미설정도 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (86, '2_4', 'evidence', 1, '연간 정기검사(신뢰성) 계획표 (품목×시험항목×주기 — 검사협정 기준)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_4', 86);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (87, '2_4', 'evidence', 2, '시험 성적서 + 시험 전/후 사진(사진 안에 날짜 표시) + 계측기 원본데이터');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_4', 87);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (88, '2_4', 'evidence', 3, '환경규제(중금속) 정기시험 성적서 (자체 장비 없으면 1차사/공인기관 성적서 접수)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_4', 88);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (89, '2_4', 'evidence', 4, '계획 대비 실적 대사표');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_4', 89);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (90, '2_4', 'how_to_write', 1, '성적서 신뢰도 3종 세트를 습관화: ①시험 전/후 시편 사진 ②사진 내 날짜(보드 or 타임스탬프) ③장비 원본데이터 저장 경로 기재. 이 중 하나라도 빠지면 "신뢰성 미확보" 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (91, '2_4', 'how_to_write', 2, '공인기관 의뢰 항목은 성적서 접수일과 이상여부 검토 서명을 남길 것 (접수만 하고 미검토가 흔한 지적).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (92, '2_4', 'examples', 1, '`07월 정기 리크시험 | 품번 25410-XXXXX LOT B0710-1 5EA | 0.2/0.3/0.2/0.25/0.3cc/min (기준 0.5↓) 적합 | 시험 전·후 사진 첨부(사진 내 2026-07-10 표시) | 원본: \\QC\leak\2026-07\ | 시험자/검토자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (93, '2_4', 'penalty_patterns', 1, '성적서에 사진 없음, 사진에 날짜 없음 (소급작성 의심 → 신뢰도 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (94, '2_4', 'penalty_patterns', 2, '계획표엔 분기 1회인데 실적이 반기 1회 (계획-실적 불일치)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (95, '2_5', 'evidence', 1, '계측기 등록대장 (관리번호·용도·교정주기·최근/차기 교정일)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_5', 95);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (96, '2_5', 'evidence', 2, '검사협정 시험항목별 지정 계측기 매핑표 (자체 불가 항목은 외부기관 지정 명기)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_5', 96);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (97, '2_5', 'evidence', 3, '검교정 성적서 + 계측기 부착 태그(차기 교정일)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_5', 97);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (98, '2_5', 'evidence', 4, '자체 검교정 시: 검교정 자격 인원 증빙 + 검증 근거');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_5', 98);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (99, '2_5', 'evidence', 5, '검사구(지그) 유효성 검증 데이터 (3차원 측정결과, 보증품 비교검증)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_5', 99);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (100, '2_5', 'how_to_write', 1, '대장과 현물 태그의 차기 교정일이 일치해야 함 — 심사 시 현물 대조가 기본 동선.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (101, '2_5', 'how_to_write', 2, '교정 성적서의 성적값이 사용 공차 대비 적절한지(불확도) 검토 서명을 남기면 우수 요소.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (102, '2_5', 'examples', 1, '`MG-021 버니어캘리퍼스 0-150 | 용도: 수입검사 치수 | 교정주기 12개월 | 최근 2026-03-12 (성적서 #C26-0312) | 차기 2027-03-11 | 태그 부착 ○`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (103, '2_5', 'penalty_patterns', 1, '교정 유효기간 경과 계측기 현장 사용 (즉시 지적, 해당 기간 검사 데이터 신뢰성 연쇄 문제)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (104, '2_5', 'penalty_patterns', 2, '검사구 유효성 검증 데이터 없음 (지그로 합부 판정하면서 지그 자체 검증 없음)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (105, '2_6', 'evidence', 1, '계측기 운영기준별 R&R 평가 계획 (자체제작 전용 계측기 필수 / 자동측정 장비 제외)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_6', 105);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (106, '2_6', 'evidence', 2, '계량형 R&R 실시 데이터 — **실제 사용 인력(작업자/검사원)** 이 측정자로 참여');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_6', 106);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (107, '2_6', 'evidence', 3, '결과 판정 (%GRR ≤10% 적합, 10~30% 조건부, >30% 부적합) 및 부적합 시 조치');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_6', 107);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (108, '2_6', 'how_to_write', 1, '측정자 이름이 핵심이다. R&R 측정자가 실제 그 계측기를 쓰는 사람과 다르면 무효 취급 — 자격인증(6_5) 배치표와 대조됨.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (109, '2_6', 'how_to_write', 2, '시료 10개×측정자 3명×2회 반복이 표준 구성. 시료는 공정 산포를 대표하도록 선정하고 선정 근거를 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (110, '2_6', 'examples', 1, '`리크검사기 LK-01 R&R (2026-05) | 측정자: 김검사·이검사·박작업(실사용자) | 시료 10EA(양산 산포 반영) | %GRR 8.2% 적합 | ndc 6 | 평가자/승인 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (111, '2_6', 'penalty_patterns', 1, '자체제작 검사지그 R&R 미실시 (필수 대상 누락)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (112, '2_6', 'penalty_patterns', 2, '측정자가 QC 사무직 등 비사용자로 구성');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (113, '2_7', 'evidence', 1, '품목별 자주검사 기준 (초/종품 외관·치수, 검사지그 활용)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_7', 113);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (114, '2_7', 'evidence', 2, '용접검사 기준: 외관·타격검사·절단검사·기밀(리크)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_7', 114);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (115, '2_7', 'evidence', 3, '자주검사 실측 기록 (작업자)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_7', 115);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (116, '2_7', 'evidence', 4, 'QC 순회검사 기록 — 작업자 자주검사 확인 + 주요 포인트 추가검사 + **확인 서명**');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_7', 116);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (117, '2_7', 'how_to_write', 1, '자주검사는 치수 실측값 기재가 원칙 (심사 시 심사원이 샘플 실측해 기록과 대조함 — "샘플 실측 요망" 명시 항목).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (118, '2_7', 'how_to_write', 2, '순회검사는 "작업자 기록을 확인했다"는 서명 + QC가 직접 잰 추가검사 값이 둘 다 있어야 함. 확인 서명만 있으면 절반.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (119, '2_7', 'examples', 1, '자주: `07-15 초품 | 외관 스패터無 | A치수 52.3(기준 52.5±0.5) | 리크 0.2cc/min 적합 | 작업자 서명 08:10`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (120, '2_7', 'examples', 2, '순회: `10:30 라인2 | 자주검사 기록 확인 ○ | 추가 실측 A치수 52.4 적합·타격검사 이상無 | QC 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (121, '2_7', 'penalty_patterns', 1, '초품만 있고 종품 기록 없음 / 특근일 누락 (1_4와 교차 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (122, '2_7', 'penalty_patterns', 2, '순회검사가 서명만 있고 실측값 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (123, '2_7', 'penalty_patterns', 3, '검사지그 쓰면서 지그 유효성 검증(2_5) 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (124, '2_8', 'evidence', 1, '완제품(최종) 검사 기준서 — 외관·치수·취약부 절단면·상대물 조립성');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_8', 124);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (125, '2_8', 'evidence', 2, '정기 최종검사 이력 (최소 1회/3개월)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_8', 125);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (126, '2_8', 'evidence', 3, '브레이징 특화: 용접부 용입성 절개평가 기록 + 크랙·LEAK 검사 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_8', 126);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (127, '2_8', 'evidence', 4, '검사 성적서와 출하 LOT 연결 (5_1 추적성 연계)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_8', 127);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (128, '2_8', 'how_to_write', 1, '절개(파괴)평가는 시편 사진 + 용입률 수치(예: 용입률 %, 기공 유무)로 기록하고 시편 실물 또는 사진을 보존. "절단검사 OK"만 쓰면 보완.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (129, '2_8', 'how_to_write', 2, '상대물 조립성은 검증용 상대물(마스터)을 지정하고 관리번호를 부여 (2_3 연계).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (130, '2_8', 'examples', 1, '`분기 최종검사 2026-07-10 | 품번 25410-XXXXX LOT B0710-1 | 외관·치수 적합(첨부 성적서) | 절개 2EA 용입률 91/93%(기준 85%↑) 기공無 — 시편사진 첨부 | 리크 전수 적합 | 상대물 M-JIG-02 조립성 ○ | 검사자/승인 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (131, '2_8', 'penalty_patterns', 1, '3개월 주기 초과 (분기 1회 미달)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (132, '2_8', 'penalty_patterns', 2, '절개평가 사진·수치 없음, 시편 미보존');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (133, '2_8', 'penalty_patterns', 3, '검사 성적서 LOT와 출하 LOT 연결 불가');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (134, '2_9', 'evidence', 1, '리워크 작업 기준서 (허용 리워크 범위·방법·재검사 항목) — 6_10과 연계');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_9', 134);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (135, '2_9', 'evidence', 2, '리워크 후 재검사(재 리크검사) 기록 + 이력 대장');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_9', 135);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (136, '2_9', 'evidence', 3, '후공정 검출불가 특성(리크·용접강도) 목록 + 공정 내 보증 점검기준·실행 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('2_9', 136);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (137, '2_9', 'how_to_write', 1, '리워크 1건마다 5요소: ①원 불량내용 ②리워크 방법 ③재검사 결과(수치) ④판정 ⑤LOT·수량. 리워크품은 반드시 재 리크검사 통과 기록이 있어야 출하 가능.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (138, '2_9', 'how_to_write', 2, '"후공정에서 못 잡는 항목"(리크·용입)은 공정 내 검사가 마지막 방어선임을 기준서에 명시하고 전수/샘플 근거를 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (139, '2_9', 'examples', 1, '`RW-0715-03 | 리크 NG 0.8cc/min 1EA (LOT B0715-1) | 재브레이징 후 재검사: 리크 0.3cc/min 적합 + 외관·용입 확인 | 판정 합격 | 리워크자/재검사자 서명 상이`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (140, '2_9', 'penalty_patterns', 1, '리워크품이 재검사 없이 양품 혼입 (발생수량-수거량 대사로 적발, 6_6 연계)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (141, '2_9', 'penalty_patterns', 2, '리워크 이력은 있는데 재검사 값 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (142, '2_9', 'penalty_patterns', 3, '작업자와 재검사자가 동일인 서명 (검증 독립성 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (143, '3_1', 'evidence', 1, '설비별 점검부위·방법 도식화(사진/그림 표시) 기준서');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_1', 143);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (144, '3_1', 'evidence', 2, '게이지류 상/하한 식별(라벨·마킹) + 실측값 기록 일상점검표');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_1', 144);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (145, '3_1', 'evidence', 3, 'F/P 경고등·알람 작동 확인 기록, 셋팅값-표준 공차 일치 확인');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_1', 145);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (146, '3_1', 'evidence', 4, '셋팅값 임의조작 방지 시건장치/KEY-LOCK 현황');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_1', 146);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (147, '3_1', 'evidence', 5, '시업 시 OK/NG 마스터 검증 기록 (2_3 연계), 캘리브레이션 장비 0점 조정 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_1', 147);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (148, '3_1', 'how_to_write', 1, '점검표는 "√" 대신 실측값 기재 항목을 늘릴 것 — 압력·온도·유량은 수치 필수. √ 항목은 판단기준(정상 상태 사진)을 도식화 기준서에 명시.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (149, '3_1', 'how_to_write', 2, '게이지 상하한 스티커(녹색 범위 표시)를 붙이고 점검표의 기준값과 일치시킬 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (150, '3_1', 'examples', 1, '`브레이징로 #1 일상점검 07-15 | 에어압 0.52MPa(0.4~0.6 녹색범위) | N₂유량 12㎥/h(10~15) | 알람 테스트 ○ | KEY-LOCK 시건 ○ | NG마스터 검출 ○ | 점검자 서명 08:00`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (151, '3_1', 'penalty_patterns', 1, '전 항목 √만 나열된 점검표 (기록 불명확 → 보완)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (152, '3_1', 'penalty_patterns', 2, '게이지 상하한 미식별 / 점검표 기준과 현물 라벨 불일치');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (153, '3_1', 'penalty_patterns', 3, '시건장치 없이 셋팅값 노출 (임의조작 가능 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (154, '3_2', 'evidence', 1, '핵심설비 연간 정기점검 계획 + 실적 (외주 정도점검 성적서 포함)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_2', 154);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (155, '3_2', 'evidence', 2, '소모성 부자재(메쉬벨트·히터·팁 등) 점검/교체주기표 + 설정근거(T/O 이력)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_2', 155);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (156, '3_2', 'evidence', 3, '압력계 정도보증: 검교정 마스터게이지 비교검증 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_2', 156);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (157, '3_2', 'evidence', 4, '중요 센서류(온도센서 등) 정기 정도보증 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_2', 157);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (158, '3_2', 'evidence', 5, '전동툴·너트런너 토크 정기검사 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_2', 158);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (159, '3_2', 'how_to_write', 1, '교체주기의 근거를 남겨라: "히터 수명 8,000h — 제조사 매뉴얼 + 2024~25 고장이력 평균 8,500h, 안전율 적용" 식으로 주기표 비고란에 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (160, '3_2', 'how_to_write', 2, '압력계는 연 1회 마스터게이지와 병렬 비교한 값(지시차)을 기록.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (161, '3_2', 'examples', 1, '`연간계획 대비 7월 실적: 로 온도센서 정도확인(마스터 대비 +1.2℃, 허용 ±3℃) 적합 | 콘베어 체인 장력 점검 완료 | 미실시 0건`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (162, '3_2', 'penalty_patterns', 1, '계획표만 있고 실적 공란 (이행 누락)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (163, '3_2', 'penalty_patterns', 2, '소모품 교체주기 설정근거 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (164, '3_2', 'penalty_patterns', 3, '센서 고장을 사후 교체만 하고 정기 정도보증 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (165, '3_3', 'evidence', 1, '제품 안착 F/PROOF(센서·근접스위치) 구축 현황 + 점검기준 / 미구축 공정 관리방안(육안확인 절차 등)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_3', 165);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (166, '3_3', 'evidence', 2, '기준핀 마모·유격, 스패터 제거 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_3', 166);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (167, '3_3', 'evidence', 3, '클램프 작동·센서 작동·에어 누기 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_3', 167);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (168, '3_3', 'how_to_write', 1, 'F/P 구축 공정은 "센서 차단 시 기동 불가" 테스트를 주기적으로 실시하고 기록 (F/P가 살아있음을 증명).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (169, '3_3', 'how_to_write', 2, '미구축 공정은 관리방안(작업자 2점 확인 등)을 표준서에 명시하고 그 이행 기록을 남길 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (170, '3_3', 'examples', 1, '`지그 #3 시업점검 07-15 | 안착센서 차단 테스트: 기동차단 ○ | 기준핀 유격無·스패터 제거 ○ | 클램프 3점 작동 ○ | 에어누기 無 | 점검자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (171, '3_3', 'penalty_patterns', 1, '스패터 누적 상태로 작업 (현장 확인 즉시 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (172, '3_3', 'penalty_patterns', 2, 'F/P 센서 바이패스(테이프 고정 등) 발견 — 중지적');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (173, '3_4', 'evidence', 1, '용접기: 팁 교환·노즐 청소·와이어 공급기·케이블·전류/전압 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_4', 173);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (174, '3_4', 'evidence', 2, '브레이징 로: 내부온도·콘베어 속도 실측·가스유량·메쉬망 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_4', 174);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (175, '3_4', 'evidence', 3, '로봇: 시업 전 원점 일치 확인(사진 전산관리 or 경보장치) + 궤적 확인 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_4', 175);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (176, '3_4', 'how_to_write', 1, '로봇 원점은 수치화가 어려우므로 둘 중 하나를 운영: ①시업 시 원점 위치 사진 촬영 → 전산 저장(파일명에 날짜) ②원점 이탈 경보장치. 기준서에 채택 방식을 명시.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (177, '3_4', 'how_to_write', 2, '콘베어 속도는 "설정값"이 아니라 "실측값"(스톱워치/타코미터) 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (178, '3_4', 'examples', 1, '`로봇 #2 07-15 시업 | 원점 확인 사진 R2_20260715.jpg 저장 | 궤적 티칭점 이상無 | 용접기 팁 교환(누적 4,800타, 기준 5,000) | 콘베어 실측 181mm/min(180±5)`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (179, '3_4', 'penalty_patterns', 1, '콘베어 속도를 설정 패널값으로만 기록 (실측 아님)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (180, '3_4', 'penalty_patterns', 2, '로봇 원점 확인 기록 없음 → 용접위치 불량 예방 불가 지적');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (181, '3_5', 'evidence', 1, '로내 온도 구간별 실측 점검 기록 (타점기록계 or 열전대 실측)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_5', 181);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (182, '3_5', 'evidence', 2, '온도 프로파일 정기 측정 차트 + 판정');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_5', 182);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (183, '3_5', 'evidence', 3, '콘베어 메쉬 속도 실측 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_5', 183);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (184, '3_5', 'how_to_write', 1, '구간별 온도는 "지시계 눈금"이 아닌 실측/기록계 기준으로, 구간번호별 기준값 대비 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (185, '3_5', 'how_to_write', 2, '프로파일 측정 시 사용 기기(프로파일러) 관리번호와 교정 유효성(2_5)을 함께 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (186, '3_5', 'examples', 1, '`로 #1 프로파일 (2026-07-01, 프로파일러 TP-03 교정有) | 예열 620℃/브레이징 752℃/냉각 320℃ — 기준곡선 대비 편차 ±5℃ 이내 적합 | 차트 첨부 | 측정자/검토자`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (187, '3_5', 'penalty_patterns', 1, '1_5와 동일 데이터인데 서로 값이 다름 (문서간 불일치)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (188, '3_5', 'penalty_patterns', 2, '프로파일 측정주기 근거 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (189, '3_6', 'evidence', 1, '전극(드레싱·교체주기, 용접타점 관리, 타점 도달 경보) 관리기준+기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_6', 189);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (190, '3_6', 'evidence', 2, '가스잔량: 탱크 잔량/압력 부족 경보 작동 확인 (개별 탱크는 F/P 불요, 2개 이상 병렬 시 관리방안 필수)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_6', 190);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (191, '3_6', 'evidence', 3, '냉각수 온도 관리기준+기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_6', 191);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (192, '3_6', 'evidence', 4, 'F/P 미구축 항목의 대체 관리기준 및 이행 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_6', 192);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (193, '3_6', 'how_to_write', 1, '타점 카운터 값을 일상점검표에 기재하고 교체 기준 타점 대비 잔여를 표기.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (194, '3_6', 'how_to_write', 2, '병렬 가스탱크는 절체(전환) 시점 기록과 잔량 확인 절차를 기준화.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (195, '3_6', 'examples', 1, '`용접기 #1 | 전극 누적 3,200타(교체기준 5,000, 경보 4,800 설정 ○) | N₂ 병렬탱크 A 65%→계속, B 대기 | 냉각수 24℃(기준 30↓)`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (196, '3_6', 'penalty_patterns', 1, '경보장치 미작동 상태 방치 (테스트 기록 없음)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (197, '3_6', 'penalty_patterns', 2, '병렬 탱크 절체 관리 없음 — 가스 끊김 중 생산분 보증 불가 지적');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (198, '3_7', 'evidence', 1, 'JIG 기준핀 외경 측정 기록 — 1회/분기 이상 권장, 자체주기 설정 시 근거(과거 마모 데이터, 안전율 80%)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_7', 198);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (199, '3_7', 'evidence', 2, '기준면 마모/유격 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_7', 199);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (200, '3_7', 'evidence', 3, '지그 안착상태 부품 유격 점검 (시업 전/지그 수리·보전 시)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_7', 200);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (201, '3_7', 'evidence', 4, '클램프 고정·센서 고정·배선 피복 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('3_7', 201);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (202, '3_7', 'how_to_write', 1, '기준핀은 측정값 추이관리가 핵심 — 지그별 핀 외경을 시계열로 기록해 마모 한계 도달 전 교체. 그래프/추이표가 있으면 우수 요소.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (203, '3_7', 'examples', 1, '`지그 #3 기준핀 P1 Φ9.98 (신품 10.00, 한계 9.95) | 분기점검 2026-07-01 | 전회 9.99 → 마모율 정상 | 차기 교체 예상 2027-01 | 측정: MG-021`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (204, '3_7', 'penalty_patterns', 1, '분기 1회 미달 / 측정 계측기 미표기');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (205, '3_7', 'penalty_patterns', 2, '핀 마모 한계값 미설정 (측정만 하고 판정 기준 없음)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (206, '4_1', 'evidence', 1, '일상점검 체크시트: 금형 상/하부 이물·손상·볼트풀림·도금상태·마모·핀 유격·스크랩 취출상태');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_1', 206);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (207, '4_1', 'evidence', 2, '정기점검 체크시트 + 금형별 타발수 기록 (설비 카운터 or 생산일보 기준 — **출하수량 기준 관리 시 감점**)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_1', 207);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (208, '4_1', 'evidence', 3, '금형 등급관리기준 + 등급별 정기점검 주기 준수 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_1', 208);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (209, '4_1', 'evidence', 4, '타발수 기준 오버홀 이력 (다이 평행도·평탄도 검사)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_1', 209);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (210, '4_1', 'evidence', 5, '생산계획이 연마·소모품교체·정기점검 주기를 침범하지 않는다는 운영기준');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_1', 210);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (211, '4_1', 'how_to_write', 1, '타발수는 반드시 생산실적(설비 카운터/생산일보)에서 집계 — 출하수량으로 역산하면 감점 명시 조항에 걸림.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (212, '4_1', 'how_to_write', 2, '등급(A/B/C)별로 점검 타발수를 달리 설정하고 등급 산정 근거(생산량·복잡도)를 기준서에 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (213, '4_1', 'examples', 1, '`금형 M-12 (B등급, 점검주기 50,000타) | 누적 47,200타(생산일보 집계) | 도달 예정 07-25 → 정기점검 계획 등록 | 최근 오버홀 2026-02 평행도 0.02mm 적합`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (214, '4_1', 'penalty_patterns', 1, '출하수량 기준 타발수 관리 (명시적 감점 조항)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (215, '4_1', 'penalty_patterns', 2, '점검 타발수 초과 상태로 생산 지속');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (216, '4_2', 'evidence', 1, '현장 게시 세척관리기준(절차·장비·인원) + 별도 세척 체크시트, 등급별 세척기준, 점검 타발수 도달 전 세척 가능한 업무절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_2', 216);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (217, '4_2', 'how_to_write', 1, '세척 실적을 타발수와 연동 기록 — "세척주기 20,000타, 현재 18,500타 → 세척 실시" 식으로 도달 전 세척했음을 데이터로 증명.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (218, '4_2', 'examples', 1, '`M-12 세척 07-14 (누적 18,500/기준 20,000타) | 초음파 세척 20분 | 이물 제거 확인 | 세척자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (219, '4_2', 'penalty_patterns', 1, '세척기준이 게시만 되고 체크시트 없음 / 세척주기 초과 후 세척.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (220, '4_3', 'evidence', 1, '금형 수리이력 관리대장(Shot수 병기), 금형제작사 정식 수정요청 공문/기록 (임의수정 금지), 수정 후 초품 검사 이력 (Ver4 추가)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_3', 220);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (221, '4_3', 'how_to_write', 1, '수리 1건마다 ①증상 ②Shot수 ③수리내용 ④수리처(제작사/자체 구분) ⑤수정 후 초품검사 결과를 대장에 기재. 형상 수정은 반드시 제작사 요청 문서를 첨부.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (222, '4_3', 'examples', 1, '`M-12 | 62,000샷 | 펀치 치핑 → 제작사 다인테크 수정요청(문서 QM-26-031) | 07-10 입고 | 초품 15EA 치수검사 적합(성적서 첨부)`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (223, '4_3', 'penalty_patterns', 1, '자체 임의 형상수정 흔적 / 수정 후 초품검사 기록 없음.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (224, '4_4', 'evidence', 1, '금형보관대 + 위치 현황판(주소화: 공정투입/대기/외주수리 LOCATION별), 식별표(양산/A/S 차종), 이물유입 방지(방청·커버) 및 세척상태 보관 기준');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_4', 224);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (225, '4_4', 'how_to_write', 1, '현황판은 금형 이동 시마다 즉시 갱신 — 심사 시 현황판 주소와 실물 위치를 대조함. 보관 전 세척·방청 확인란을 입고 절차에 포함.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (226, '4_4', 'examples', 1, '`현황판: M-12 → 보관대 B-3 (양산) / M-07 → 외주수리(다인테크, 07-20 회수예정)`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (227, '4_4', 'penalty_patterns', 1, '현황판과 실물 위치 불일치 / 방청 처리 없이 장기 보관.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (228, '4_5', 'evidence', 1, '신규제작·양산 금형 이관 시 T/OUT 성형 검증 기록 + 증빙 (검사성적서, 시타 샘플 평가)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('4_5', 228);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (229, '4_5', 'how_to_write', 1, '이관 검증 보고서에 T/OUT 차수·시타 수량·검사 결과(성적서 연결)·승인자를 명기하고 ISIR/PPAP(6_2 연계) 승인과 연결.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (230, '4_5', 'examples', 1, '`신규 금형 M-15 이관 (2026-06) | T/OUT 3차 | 시타 50EA 치수·외관 전수 적합 | ISIR 연계 승인 | 검증 보고서 첨부`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (231, '4_5', 'penalty_patterns', 1, '이관만 되고 T/OUT 검증 증빙 없음.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (232, '5_1', 'evidence', 1, '[CASE1 수작업] LOT 표기(타각/스티커) 기준, 선입선출 관리대장+레이아웃, LOT 마스터리스트(역추적용), 보안/안전부품 별도 식별');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_1', 232);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (233, '5_1', 'evidence', 2, '[CASE2 전산-파렛트] 파렛트 바코드 라벨(유실 방지 대책 포함), 이종 LOT 혼입방지 절차, 투입 시 바코드 리딩+미리딩 알람+선입선출 인터락, 전산 역추적 화면');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_1', 233);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (234, '5_1', 'evidence', 3, '[CASE3 전산-부품] 부품 바코드 라벨(부착위치 지정·간섭 없음), 리딩 인터락, 부품단위 전산 역추적');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_1', 234);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (235, '5_1', 'how_to_write', 1, '심사 단골 시나리오: "이 완제품 LOT의 원자재 LOT를 찾아보세요" — 완제품→공정→원자재로 역추적하는 체인이 대장/전산에서 10분 내 완성돼야 함. 사전에 모의 역추적을 1회 실시하고 그 기록을 남기면 강력한 증빙.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (236, '5_1', 'how_to_write', 2, '선입선출은 창고 실물 점검으로 확인됨 — 적재 제품의 생산일이 출고 순서와 맞는지 자체 샘플링 점검 기록을 남길 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (237, '5_1', 'examples', 1, '모의 역추적: `완제품 LOT B0710-1 → 브레이징 07-10 로#1 (작업일보) → 파이프 LOT P-0708A·동링 C25-0702 (투입기록) → 수입검사 성적서 #IR-471/468 — 역추적 소요 8분, 실시자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (238, '5_1', 'penalty_patterns', 1, '마스터리스트에 일부 공정 LOT 기록 끊김 (체인 단절 → 역추적 불가)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (239, '5_1', 'penalty_patterns', 2, '바코드 라벨 유실품 존재 + 유실 대책 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (240, '5_1', 'penalty_patterns', 3, '선입선출 위반 실물 적발 (뒤 LOT가 먼저 출고)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (241, '5_2', 'evidence', 1, '창고 Lay-Out 현황도 + 선입선출 구조(선입선출 다이 등)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_2', 241);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (242, '5_2', 'evidence', 2, '입고품 적재기준 (손상·발청·오염 방지 — 확인 시 감점 명시)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_2', 242);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (243, '5_2', 'evidence', 3, '원소재 보관기준 (포장·개봉 후 식별)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_2', 243);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (244, '5_2', 'evidence', 4, '장기보관 자재 처리기준+이행 / 설변 불용자재 식별·혼입방지');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_2', 244);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (245, '5_2', 'evidence', 5, '항온항습 대상 자재 보관기준 / 안전재고 기준 + **결품 시 유사사양 대체투입 금지** 조항');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_2', 245);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (246, '5_2', 'how_to_write', 1, 'Lay-Out 도면과 실물 배치가 일치해야 함 (구역 변경 시 도면 개정). 구역별 번지(A-1, A-2)를 랙에 실물 표기.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (247, '5_2', 'how_to_write', 2, '"유사사양 대체투입 금지"를 자재 불출 절차에 명문화 — 결품 시 대응 절차(생산정지·구매 긴급발주)를 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (248, '5_2', 'examples', 1, '`월 1회 창고점검 07-01 | 발청·손상 0건 | 장기재고(6개월↑) 2건 → 처리품의 QM-26-044 | Lay-Out 대비 배치 일치 | 점검자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (249, '5_2', 'penalty_patterns', 1, '입고품 찍힘/발청 현물 발견 (명시적 감점)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (250, '5_2', 'penalty_patterns', 2, '개봉 원소재 식별 없음 / 장기재고 방치');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (251, '5_3', 'evidence', 1, '검사 전/후 식별 + 미검사품 사용 방지 보증 방안 (Ver4 강조)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_3', 251);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (252, '5_3', 'evidence', 2, '소재사양·GRADE 식별절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_3', 252);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (253, '5_3', 'evidence', 3, '장기/불용/개발품 별도 구분·식별');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_3', 253);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (254, '5_3', 'evidence', 4, '공정 투입 후 잔량관리 (보관상태·식별·유효기간)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_3', 254);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (255, '5_3', 'evidence', 5, '다사양 동시생산 라인 SUB품 사양관리 (Barcode 인터락 or 보관박스 LABEL+작업일보 품번 기입, 시업 전 정사양 점검)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_3', 255);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (256, '5_3', 'how_to_write', 1, '식별표 3색 운영이 표준적: 검사대기(황)/합격(녹)/불합격(적). 색 기준을 기준서에 명시하고 현장 통일.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (257, '5_3', 'how_to_write', 2, '잔량 반납 시 원포장 식별 유지 — 개봉일·잔량·유효기간을 잔량표에 기재.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (258, '5_3', 'examples', 1, '`동링 잔량표 | LOT C25-0712 | 개봉 07-14 | 잔량 350EA | 유효기간 2026-12 | 보관 A-2 | 반납자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (259, '5_3', 'penalty_patterns', 1, '검사 전 자재가 식별 없이 라인 옆 대기 (미검사품 투입 가능 상태)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (260, '5_3', 'penalty_patterns', 2, 'SUB품 이사양 혼입 가능 구조 (인터락도 LABEL 구분도 없음)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (261, '5_4', 'evidence', 1, '품목별/공정별 장입(적재) 기준 + 과다적재 한계 기준');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_4', 261);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (262, '5_4', 'evidence', 2, '공정처리 전/후 재공품 용기 식별절차 (열처리·템퍼링 전/후 + 템퍼링 시간관리 — Ver4 추가)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_4', 262);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (263, '5_4', 'evidence', 3, '청정도 대상품 용기 세척·오염방지 커버 기준');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_4', 263);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (264, '5_4', 'evidence', 4, '다단적재 기준 (BOX 종류별 단수)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_4', 264);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (265, '5_4', 'evidence', 5, '완제품 보관기준 (별도공간·식별·청결·간지)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('5_4', 265);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (266, '5_4', 'how_to_write', 1, '장입 기준을 용기에 실물 표기: "최대 50EA / 3단 적재" 라벨. 기준서 수치와 일치시킬 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (267, '5_4', 'how_to_write', 2, '열처리 전/후처럼 외관 구분이 안 되는 재공품은 용기 색깔 또는 이동전표로 구분하는 규칙을 명문화.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (268, '5_4', 'examples', 1, '`장입기준표 | 품번 25410-XXXXX | 전용용기 T-BOX 50EA/단, 3단까지 | 열처리 前 청색표 / 後 백색표 + 템퍼링 완료시각 기입`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (269, '5_4', 'penalty_patterns', 1, '과다적재 실물 발견 (하단 제품 변형 우려 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (270, '5_4', 'penalty_patterns', 2, '열처리 전/후 재공품 구분 불가 상태');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (271, '6_1', 'evidence', 1, '핸드폰 보관대 + 시건장치 + 미반납 사용 시 조치방안 (Ver4 강화)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 271);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (272, '6_1', 'evidence', 2, '보호구(보안경·장갑 등) 착용기준 + 일상점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 272);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (273, '6_1', 'evidence', 3, '용접 특화: 스패터 비산 방지 보호막 설치 현황');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 273);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (274, '6_1', 'evidence', 4, '안전표지·수칙 게시 + 작업자 교육 이력');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 274);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (275, '6_1', 'evidence', 5, '소화·방재시설 위치 및 비상대피 동선 표기 표준류 게시 (식별표 2층 높이)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 275);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (276, '6_1', 'evidence', 6, '설비 정기 안전관리 + 설비 점검 시 2인 1조 운영 절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_1', 276);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (277, '6_1', 'how_to_write', 1, '안전점검을 일상점검표에 통합하되 별도 안전 항목 블록으로 구성 (보호구·보호막·소화기 압력).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (278, '6_1', 'how_to_write', 2, '핸드폰 보관은 "보관대 설치"만으로 부족 — 미반납 적발 시 조치기준과 점검 기록까지.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (279, '6_1', 'examples', 1, '`일상 안전점검 07-15 | 보호안경 착용 4/4명 | 스패터 보호막 파손無 | 소화기 #3 압력 녹색 | 핸드폰 보관 4/4 시건 ○ | 점검자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (280, '6_1', 'penalty_patterns', 1, '현장 작업자 핸드폰 소지 적발 (즉시 지적)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (281, '6_1', 'penalty_patterns', 2, '대피동선도가 현 배치와 불일치 (설비 이설 후 미갱신)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (282, '6_2', 'evidence', 1, '4M 변경 유형별 처리절차 (고객 ISIR 재승인 필요여부 판단표 포함)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_2', 282);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (283, '6_2', 'evidence', 2, '변경점 마스터리스트 (**누락 시 감점 명시**)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_2', 283);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (284, '6_2', 'evidence', 3, '정기 점검활동 기록 (담당자·주기 지정)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_2', 284);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (285, '6_2', 'evidence', 4, '4M 변경품 초기유동관리(초물관리) 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_2', 285);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (286, '6_2', 'evidence', 5, '고객사 승인본 접수 관리');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_2', 286);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (287, '6_2', 'how_to_write', 1, '마스터리스트에 "사소한" 변경(작업자 교체·설비 수리)도 유형 분류해 등재 — 누락이 가장 큰 감점 요인. 월 1회 변경 발생원(구매·생산·설비 기록)과 대사해 누락 점검한 기록을 남길 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (288, '6_2', 'how_to_write', 2, '변경 1건의 생애주기를 한 행에: 발생→신고→고객통보/승인→초기유동→종결.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (289, '6_2', 'examples', 1, '`4M-26-08 | Man: 로#1 야간 작업자 교체 07-01 | 사내승인(고객통보 불요 유형-판단표 C3) | 초기유동 3LOT 검사 강화 완료 07-04 | 종결`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (290, '6_2', 'penalty_patterns', 1, '설비 수리·금형 수정이 4M 리스트에 없음 (3_2, 4_3 기록과 교차 대조로 적발)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (291, '6_2', 'penalty_patterns', 2, '고객 승인 전 변경품 선출하');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (292, '6_3', 'evidence', 1, '품목별 검사협정서/기준서/초도품 보증서 고객 승인본');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_3', 292);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (293, '6_3', 'evidence', 2, '도면(최신 Rev.) ↔ 검사협정 ↔ 사내 검사기준 일치성 점검표 + 담당자 지정');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_3', 293);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (294, '6_3', 'evidence', 3, '정기 점검 이력 / 금형 마모 예상부 검사항목 추가 검토 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_3', 294);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (295, '6_3', 'evidence', 4, '협정 內 검사항목(정기신뢰성 포함) 주기 준수 실적 (2_4 연계)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_3', 295);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (296, '6_3', 'how_to_write', 1, '일치성 점검표는 도면 치수·주기와 협정·사내기준을 한 행씩 대조하고 불일치 발견 시 개정 이력까지 연결. "점검했음 ○"만으론 부족 — 대조 항목 수와 불일치 건수를 수치로.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (297, '6_3', 'examples', 1, '`도면일치성 점검 2026-06 (담당 김QC) | 품번 25410-XXXXX 도면 Rev.D | 대조 치수 27항목 중 불일치 1건(주기 상이) → 검사기준서 개정 QM-26-052 | 차기 점검 2026-12`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (298, '6_3', 'penalty_patterns', 1, '도면 개정 후 협정 미갱신 (Rev. 불일치)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (299, '6_3', 'penalty_patterns', 2, '점검 담당자 미지정·이력 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (300, '6_4', 'evidence', 1, '품질 매뉴얼·절차서·지침서 최신본 + 업무분장표');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_4', 300);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (301, '6_4', 'evidence', 2, '발췌 문제점 개선활동 + 경영자/임원 보고 이력 + 후속조치 증빙');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_4', 301);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (302, '6_4', 'how_to_write', 1, '자체 내부심사는 SQ 평가서 42항목 그대로 채점해 점수·지적사항·개선계획을 남기고, 결과를 경영진 보고(결재)까지 연결. 보고 결재라인이 없으면 "경영자 보고" 요건 미충족.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (303, '6_4', 'how_to_write', 2, '프로그램의 자체평가 리포트 출력 + 결재 이력이 곧 이 항목의 증빙이 된다.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (304, '6_4', 'examples', 1, '`2026 상반기 SQ 자체심사 (06-20) | 총점 812점(G) | 지적 7건 → 개선계획 수립(기한 08월) | 대표이사 보고 06-25 결재 | 후속조치 진행률 4/7`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (305, '6_4', 'penalty_patterns', 1, '자체심사를 ISO 내부심사로 갈음 (SQ 평가서 기준이 아님 → 요건 미충족)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (306, '6_4', 'penalty_patterns', 2, '심사 결과 보고·후속조치 증빙 없음');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (307, '6_5', 'evidence', 1, '공정별 작업자/검사자 배치기준 + 자격인증 평가 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 307);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (308, '6_5', 'evidence', 2, '부적합 판별 실기평가: 외관(결함유형별 검출능력 — 불량시료 사용), 치수(지정 계측기 사용능력)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 308);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (309, '6_5', 'evidence', 3, '평가 신뢰도 증빙: 수기 원본데이터 + 검증용 시료 실물 보유');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 309);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (310, '6_5', 'evidence', 4, '결원/휴가 시 대응인원(멀티스킬) 현황 + 대체투입 시 사전교육·품질보증 절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 310);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (311, '6_5', 'evidence', 5, '반복생산 산포 검증 기록 (생산작업자)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 311);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (312, '6_5', 'evidence', 6, '중요/특별공정 전문 검사원 인증 (**미실시/허위 = 0점**)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_5', 312);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (313, '6_5', 'how_to_write', 1, '실기평가는 반드시 실물 불량시료 세트로 진행하고 시료를 보관 — "시료 보여주세요"가 심사 단골. 평가지 원본(수기)을 보존하고 전산본과 병행.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (314, '6_5', 'how_to_write', 2, '배치표(누가 어느 공정에 인증됐나)와 실제 작업일보 작업자가 일치해야 함 — 1_4 특근기록과 교차 대조됨.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (315, '6_5', 'examples', 1, '`외관검사원 인증평가 (07-05, 이검사) | 불량시료 20EA(리크·크랙·스패터 혼합) 판별 19/20 (기준 90%↑) 합격 | 시료세트 QS-03 보관 | 유효 1년 | 평가자/승인`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (316, '6_5', 'penalty_patterns', 1, '인증 없는 작업자가 작업일보에 등장 (교차 대조 적발)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (317, '6_5', 'penalty_patterns', 2, '평가지 필적·날짜 동일 일괄작성 (허위 의심 → 0점 리스크)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (318, '6_6', 'evidence', 1, '부적합품 식별·격리 절차 + RED BOX 현장 비치');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_6', 318);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (319, '6_6', 'evidence', 2, '발생수량 vs 수거량 대사 점검 기록 (유출 여부 점검)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_6', 319);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (320, '6_6', 'evidence', 3, '시제품(개발품) 양산 혼입방지 식별·격리 절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_6', 320);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (321, '6_6', 'evidence', 4, '낙하품 처리기준 + 처리이력 (수량·폐기/리워크 결정)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_6', 321);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (322, '6_6', 'evidence', 5, 'Ver4 추가 — 재검사 절차: 1차 NG → 동일 검사장비 or 품질 전문검사원 2차 재검사 → 재검사 NG 시 폐기 + 이력(LOT·사유·결과·폐기수량). 고객 협의된 Rework 항목만 리워크 가능, 리워크 후 필히 재검사.');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_6', 322);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (323, '6_6', 'how_to_write', 1, '부적합 대장에 발생수량과 RED BOX 수거량, 폐기수량이 대차 균형을 이뤄야 함 (발생 10 = 수거 10 = 폐기 8 + 리워크 2 식). 주기적 대사 기록을 남길 것.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (324, '6_6', 'how_to_write', 2, '낙하품은 "주웠으니 다시 사용"이 금지 — 격리 후 판정 절차를 기준화.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (325, '6_6', 'examples', 1, '`07-15 리크 NG 3EA (LOT B0715-1) | RED BOX 격리 | 2차 재검사(전문검사원 박QC): 2EA 재현 NG → 폐기, 1EA 오판정 → 재검사 합격 복귀 | 대장 #NC-0715-02 | 발생3=폐기2+복귀1 대사 ○`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (326, '6_6', 'penalty_patterns', 1, 'RED BOX에 양품·부적합 혼재 / 식별표 없는 보류품');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (327, '6_6', 'penalty_patterns', 2, '발생-수거 수량 불일치 (유출 의심)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (328, '6_6', 'penalty_patterns', 3, '1차 NG품을 재검사 절차 없이 작업자가 임의 복귀');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (329, '6_7', 'evidence', 1, '전년 실적 대비 연간 목표 + 월 1회 실적 점검 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_7', 329);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (330, '6_7', 'evidence', 2, '3대 지표: 공정불량(생산수량·불량수·PPM), 고객불량(납품·불량·PPM), 외주불량(입고·불량·PPM)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_7', 330);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (331, '6_7', 'evidence', 3, 'Ver4 추가: 전체/공정별/품목별/불량유형별(필요시 장비별) 집계 + **공정불량률에 재작업 수량 포함**');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_7', 331);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (332, '6_7', 'evidence', 4, '목표 미달 워스트 항목 원인분석·개선대책 + 유효성 평가');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_7', 332);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (333, '6_7', 'evidence', 5, '필드클레임 고품분석·시정조치 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_7', 333);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (334, '6_7', 'how_to_write', 1, '재작업(리워크)을 불량률 분모·분자에서 빼면 지적 — 2_9 리워크 대장 수량과 월 실적의 재작업 수량이 일치해야 함.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (335, '6_7', 'how_to_write', 2, '미달 월엔 반드시 워스트 1~2개 항목의 5Why/특성요인도 분석과 대책, 다음 달 효과 확인까지 한 세트로.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (336, '6_7', 'examples', 1, '`6월 실적 | 공정 1,250PPM(목표 1,000 미달) — 리크불량 워스트 | 원인: 동링 안착 불균일(5Why 첨부) | 대책: 안착 F/P 센서 추가(07-10 완료) | 7월 효과확인 예정 | 경영진 월보고 결재`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (337, '6_7', 'penalty_patterns', 1, '재작업 수량 미포함 집계 (Ver4 명시 요건)');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (338, '6_7', 'penalty_patterns', 2, '목표 미달인데 원인분석 없이 다음 달로 넘어감');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (339, '6_8', 'evidence', 1, '조도 운영 프로세스 (측정장소 지정·측정시간·관리기준 lux)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_8', 339);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (340, '6_8', 'evidence', 2, '자주/순회검사 구간 조도 포인트 지정 (누락 없이)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_8', 340);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (341, '6_8', 'evidence', 3, 'Ver4 추가: 야간작업 고려 **일몰 후 측정**, 검사위치 지정·손 미거치 조건 측정');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_8', 341);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (342, '6_8', 'how_to_write', 1, '검사장별 기준(예: 정밀검사 750lux↑, 일반 500lux↑)을 정하고 측정 포인트를 도면에 번호로 지정. 주간+일몰 후 2회 측정 기록.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (343, '6_8', 'examples', 1, '`분기 조도측정 07-01 | P3 최종검사대: 주간 820lux / 일몰후 780lux (기준 750↑) 적합 | 조도계 LX-02(교정有) | 측정자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (344, '6_8', 'penalty_patterns', 1, '주간만 측정(야간작업장) / 측정 포인트가 검사위치와 다름.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (345, '6_9', 'evidence', 1, '정기 점검 체크시트(주기·업무분담 명시), 지적사항 개선 시정조치 완료 기록, 현장 관리실태(정위치·정품·정량 표시)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_9', 345);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (346, '6_9', 'how_to_write', 1, '점검→지적→개선 사진(Before/After)→완료확인의 사이클을 남길 것. 점검만 반복되고 개선완료 확인이 없으면 형식 운영 지적.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (347, '6_9', 'examples', 1, '`7월 3정5행 점검 | 지적 3건(공구 정위치 이탈 등) | 개선완료 3/3 (사진 첨부) | 확인자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (348, '6_9', 'penalty_patterns', 1, '지적사항 미조치 이월 반복 / 현장 정위치 표시 없음.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (349, '6_10', 'evidence', 1, '리워크 가능부품 선정기준 (고객 협의 항목) / 금지부품 폐기 처리+이력');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_10', 349);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (350, '6_10', 'evidence', 2, '리워크품 사양확인·LOT 추적·선입선출');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_10', 350);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (351, '6_10', 'evidence', 3, '리워크 전후 검사항목 설정 + 검사 이력');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_10', 351);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (352, '6_10', 'evidence', 4, '전/후 식별 기준 / 리워크품 출하절차');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_10', 352);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (353, '6_10', 'evidence', 5, '리워크 별도공간 운영 시 TOOL·자재 비치 상태');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_10', 353);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (354, '6_10', 'how_to_write', 1, '"무엇은 리워크 가능하고 무엇은 폐기인가" 목록이 출발점 — 고객 협의 근거(협정·회신 문서)를 목록에 연결.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (355, '6_10', 'how_to_write', 2, '리워크품 LOT는 원 LOT에 리워크 식별자를 붙여 추적 (예: B0715-1R).');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (356, '6_10', 'examples', 1, '`리워크 기준표 | 리크 미세누설: Rework 가능(고객협의 QM-25-112) — 재브레이징+재검사 | 크랙: 금지 → 폐기 | 치수 NG: 금지 → 폐기`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (357, '6_10', 'penalty_patterns', 1, '금지 항목 리워크 흔적 / 리워크 공간에 무관 자재 혼재');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (358, '6_10', 'penalty_patterns', 2, '리워크품 식별 없이 양품 파렛트 합류');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (359, '6_11', 'evidence', 1, '공정 누락 방지 장치: 공정이동 전표(공정별 확인란) or 전산 공정 인터락');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_11', 359);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (360, '6_11', 'evidence', 2, '부자재 소진 기반 누락 점검: 부자재 입고/소진량 vs 완제품 생산실적 정기 비교검증 기록');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_11', 360);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (361, '6_11', 'how_to_write', 1, '브레이징 예: 동링 사용량과 브레이징 완료 수량을 월 대사 — `동링 소진 10,250EA vs 생산 10,180EA, 차이 70EA(불량 폐기 65+낙하 5) 소명` 식으로 차이 원인까지 기재하면 우수 요소.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (362, '6_11', 'examples', 1, '`6월 부자재 대사 | 동링 투입 10,250 / 생산실적 10,180 / 차이 70 = 폐기 65 + 낙하 5 (이력 일치) | 공정누락 의심 0건 | 대사자 서명`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (363, '6_11', 'penalty_patterns', 1, '이동전표 확인란 공란 통과 / 대사 차이 원인 미소명');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (364, '6_12', 'evidence', 1, '정성품질 키맨 업무분장 (수평전개 교육/개선활동/고객사 협업 담당)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_12', 364);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (365, '6_12', 'evidence', 2, 'Ver4 추가: 정성품질 통신문 현황판 게시 + 임직원 전파교육 이력');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_12', 365);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (366, '6_12', 'evidence', 3, '예방활동(휴먼에러 예방점검 개선 이력) / 개선활동(휴먼에러 시정조치 — 세부 원인분류 포함)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_12', 366);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (367, '6_12', 'evidence', 4, '관리실태 정기점검 이력 + 경영진 보고 (표준 준수·작업공수 일치성·역조립 가능성 등)');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_12', 367);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (368, '6_12', 'evidence', 5, '포상제도 운영기준 + 포상 실적');
INSERT INTO sq_checkpoints (item_code, guide_id) VALUES ('6_12', 368);
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (369, '6_12', 'how_to_write', 1, '휴먼에러 개선은 "작업자 교육"으로 끝내지 말 것 — 원인을 세부 분류(착각/누락/미숙련)하고 구조적 대책(F/P·형상 구분·순서 고정)으로 연결하는 것이 정성품질 취지.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (370, '6_12', 'how_to_write', 2, '포상은 기준(선정주기·심사기준)과 실적(수상자·사례)을 세트로.');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (371, '6_12', 'examples', 1, '`정성품질 6월 | 통신문 #26-06 게시+전파교육 32명 | 예방: 지그 이사양 삽입 방지핀 추가(작업자 제안) | 포상: 김작업(예방 제안) 분기포상 | 경영진 보고 06-30`');
INSERT INTO sq_guides (id, item_code, section, sort_order, content) VALUES (372, '6_12', 'penalty_patterns', 1, '키맨 지정만 있고 활동 이력 없음 / 포상제도 기준 없이 임의 시행');
