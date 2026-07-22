-- ============================================================
-- Migration 0094: P9 — 연결 양식 모범예시 초안 + fact 오분류 교정 (2026-07-22)
-- [예시 시드 + 분류 교정] — 12번 지시서 P9. 0093 연결 양식 우선.
--
-- (A) fact 오분류 교정: 부서명·문서명·사업부부서명 등이 '서명' substring 으로 fact 오판(0085 휴리스틱) → text 라 정상 입력이 오차단됨. frame 으로 교정.
-- (B) form_examples 초안: 0093 으로 연결된 양식 중 form_fields 보유분에 모범예시 추가.
--     예시값=봇 초안(§0.7 '내용 검수는 사람'). date=과거·fact 는 ※예시 경고·판정류 select 는 차단 제외.
--     ⚠️ 검수 체크리스트: docs/p9-example-review-2026-07-22.md (사람 확인 요망).
-- 멱등: 교정=조건 UPDATE(재적용 0행), 예시=INSERT OR IGNORE(form_code+field_key UNIQUE). BEGIN/COMMIT 없음.
-- ============================================================

-- ── (A) fact 오분류 교정: '서명' substring 오판(부서명/문서명/사업부부서명) → frame ──
UPDATE form_fields SET field_class='frame'
WHERE field_class='fact' AND label LIKE '%서명%' AND TRIM(label) NOT IN ('서명','서 명');

-- ── (B) form_examples 초안 ──
-- B1100-01 — 부적합품 발생 통보서
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('B1100-01','h2','2026-07-01','작성일 ※예시는 과거 — 실제 작성일'),
('B1100-01','h4','생산팀',NULL),
('B1100-01','i1','2026-06-30','발생일 ※예시는 과거 — 실제 발생일'),
('B1100-01','i2','8','불량 수량 ※예시 — 실제 수량(예시 그대로 저장 시 차단)'),
('B1100-01','i3','브라켓 ASSY',NULL),
('B1100-01','i4','LOT-260630-02','불량 LOT ※예시 — 실제 LOT(추적성 핵심, 예시 복제 금지)'),
('B1100-01','i5','84610-2S000 / t2.0',NULL),
('B1100-01','i6','본사 1공장',NULL),
('B1100-01','c1','스폿 용접부 크랙 3건 발견(육안 전수)',NULL),
('B1100-01','c3','용접 전류 설정값이 관리 상한 초과 — 자주검사 주기 사이 발생 추정',NULL),
('B1100-01','p1','E-Mail',NULL),
('B1100-01','c4','선별',NULL),
('B1100-01','p3','비공제',NULL);

-- D1100-03 — 제품 안전교육 보고서()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('D1100-03','훈련구분','정기 (제품안전)',NULL),
('D1100-03','목적','제품안전특성 인식 제고 및 안전 관련 부적합 예방',NULL),
('D1100-03','참석대상','생산·품질 전 작업자',NULL),
('D1100-03','참석자','별첨 명단 32명',NULL),
('D1100-03','참석인원','32',NULL),
('D1100-03','내용','안전특성(S/C) 식별 · 안전 부적합 대응 절차 · 최근 리콜 사례 공유',NULL),
('D1100-03','훈련걀과효과성파악','이해도 평가 평균 86점 (합격 기준 80점)',NULL),
('D1100-03','주관부서','품질팀',NULL),
('D1100-03','훈련일자','2026-07-01','교육 실시일 ※예시는 과거 — 실제 실시일');

-- L3101-01 — 측정시스템 분석 계획서()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('L3101-01','대상계측기','버니어 캘리퍼스 0~300mm',NULL),
('L3101-01','NO','1',NULL),
('L3101-01','차종','CN7',NULL),
('L3101-01','품번','84610-2S000',NULL),
('L3101-01','품명','브라켓 ASSY',NULL),
('L3101-01','측정대상자','작업자 3명 (A·B·C)',NULL),
('L3101-01','측정항목','취부부 위치도',NULL),
('L3101-01','규격','10 ± 0.1',NULL),
('L3101-01','평가절차','Gage R&R — 10 샘플 × 3 측정자 × 2 반복',NULL),
('L3101-01','작성','류형석',NULL),
('L3101-01','검토','임하수',NULL);

-- A8101-02 — 비상사태 대비 훈련결과 보고서()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('A8101-02','시나리오','도장 부스 화재 발생 대응',NULL),
('A8101-02','주요훈련내용','초기 소화기 진화 · 비상 대피 유도 · 소방서 신고 · 비상연락망 가동 · 부상자 응급조치',NULL),
('A8101-02','참석자명단','생산 전 인원 + 안전관리자 (별첨)',NULL);

-- K1200-03 — ③협력업체 사후 평가 계획서 ()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('K1200-03','평가업체','(주)대성정밀',NULL),
('K1200-03','평가기간','2026년 상반기 (1~6월)',NULL),
('K1200-03','부서명','구매팀',NULL),
('K1200-03','평가자','서명진',NULL),
('K1200-03','등급','B (예시)',NULL),
('K1200-03','평가주기','반기 1회',NULL);

-- K1200-05 — ⑤협력업체 체제 평가표 ()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('K1200-05','평가업체명','(주)대성정밀',NULL),
('K1200-05','평가일자','2026-07-01','평가일 ※예시는 과거 — 실제 평가일'),
('K1200-05','소속','구매팀',NULL),
('K1200-05','직위','과장',NULL),
('K1200-05','성명','서명진',NULL);

-- L1100-07 — 설비 일상 점검표 ()
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('L1100-07','설비명','스폿 용접기 #2',NULL),
('L1100-07','설비번호','SW-002',NULL),
('L1100-07','설비일상점검표년월','2026년 7월',NULL),
('L1100-07','육안','이상 없음 (청결·누유·이상소음 확인)',NULL),
('L1100-07','판단기준','누유 없을 것 · 이상 소음 없을 것',NULL),
('L1100-07','점검항목별상세도식화','(점검 부위 표시 — 양식 도식 참조)',NULL);

