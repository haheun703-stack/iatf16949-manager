-- ============================================================
-- Migration 0090: P7 셀맵 나머지 5종 (2026-07-21)
-- [셀맵(form_fields) + field_class + form_examples 시드] [TPC팩 후보]
--
-- 12번 지시서 P7: 정기 의무 연결됐으나 셀맵(field)=0 이던 6종 중 자주검사(0089) 제외 5종:
--   L2100-07 수입검사 관리대장 · M1200-11 브레이징 조건관리 · M1200-08 팁 교환 주기 평가
--   · K1200-07 외주 ISIR 접수대장 · L4102-02 양산단계 공정능력 산출
-- ⚠️설비일상점검은 정기 의무에 form_code 미연결(양식 코드 미부여) → 셀맵 대상 아님(연결 확충 백로그).
--
-- ■ field_class 규칙(코워크 §0.7 일관 적용):
--   실측값·측정치·LOT·수량·타수·Cpk·ISIR번호 = fact(차단 대상, 자유값)
--   일자 = fact date(완전일치 제외) · 판정·검토결과 = select(완전일치 제외)
--   검사자·작성자·담당자·확인자·작업자 = auto(자동=활성 사용자, frame) · 항목·규격·품번·설비 = frame
-- 멱등: INSERT OR IGNORE. BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

-- ── L2100-07 수입검사 관리대장 ──
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, field_class, sort_order) VALUES
('L2100-07','입고일자','입고일자','date','기본 정보',NULL,NULL,'fact',1),
('L2100-07','품번','품번','text','기본 정보','입고 품번',NULL,'frame',2),
('L2100-07','공급자','공급자','text','기본 정보',NULL,NULL,'frame',3),
('L2100-07','입고LOT','입고 LOT','text','기본 정보','입고 라벨의 실제 LOT',NULL,'fact',4),
('L2100-07','입고수량','입고 수량','text','기본 정보','송장 수량',NULL,'fact',5),
('L2100-07','검사항목','검사항목','text','검사 · 측정',NULL,NULL,'frame',6),
('L2100-07','규격','규격','text','검사 · 측정',NULL,NULL,'frame',7),
('L2100-07','측정치','측정치','text','검사 · 측정','본인이 잰 실측값',NULL,'fact',8),
('L2100-07','판정','판정','select','검사 · 측정',NULL,'["합격","불합격"]','fact',9),
('L2100-07','검사자','검사자','auto','확인',NULL,NULL,'frame',10);
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('L2100-07','입고일자','2026-07-01','입고일 ※예시는 과거'),
('L2100-07','품번','냉연강판 SGCC 1.6t',NULL),
('L2100-07','공급자','(주)포스코',NULL),
('L2100-07','입고LOT','IN-260701-05','입고 LOT ※예시 — 실제 입고 라벨 번호'),
('L2100-07','입고수량','2000','수량 ※예시 — 실제 송장 수량'),
('L2100-07','검사항목','두께 / 외관',NULL),
('L2100-07','규격','1.6 ±0.05 mm',NULL),
('L2100-07','측정치','1.61 / 1.59 / 1.60','측정치 ※예시 — 반드시 본인 실측값'),
('L2100-07','판정','합격',NULL),
('L2100-07','검사자','(저장 시 작성자 자동)',NULL);

-- ── M1200-11 브레이징 조건관리 CHECK SHEET ──
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, field_class, sort_order) VALUES
('M1200-11','일자','일자','date','기본 정보',NULL,NULL,'fact',1),
('M1200-11','설비명','설비명','text','기본 정보',NULL,NULL,'frame',2),
('M1200-11','근무조','근무조','select','기본 정보',NULL,'["주간","야간"]','frame',3),
('M1200-11','조건항목','조건항목','text','조건 · 측정',NULL,NULL,'frame',4),
('M1200-11','설정값','설정값(기준)','text','조건 · 측정',NULL,NULL,'frame',5),
('M1200-11','실측값','실측값','text','조건 · 측정','계기 실측값',NULL,'fact',6),
('M1200-11','판정','판정','select','조건 · 측정',NULL,'["적합","부적합"]','fact',7),
('M1200-11','확인자','확인자','auto','확인',NULL,NULL,'frame',8);
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('M1200-11','일자','2026-07-01','조건 기록일 ※예시는 과거(1일 3회 기록)'),
('M1200-11','설비명','브레이징로 #1',NULL),
('M1200-11','근무조','주간',NULL),
('M1200-11','조건항목','로 온도 / 이송속도',NULL),
('M1200-11','설정값','1120±20℃ / 8.0 m/min','기준(관리범위)'),
('M1200-11','실측값','1118℃ / 8.1 m/min','실측 ※예시 — 계기 실제 값'),
('M1200-11','판정','적합',NULL),
('M1200-11','확인자','(저장 시 작성자 자동)',NULL);

-- ── M1200-08 팁 교환 주기 평가서 ──
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, field_class, sort_order) VALUES
('M1200-08','일자','일자','date','기본 정보',NULL,NULL,'fact',1),
('M1200-08','설비명','설비명','text','기본 정보',NULL,NULL,'frame',2),
('M1200-08','팁규격','팁 규격','text','기본 정보',NULL,NULL,'frame',3),
('M1200-08','관리주기','관리주기(타수)','text','평가',NULL,NULL,'frame',4),
('M1200-08','현재타수','현재 타수','text','평가','카운터 실제 타수',NULL,'fact',5),
('M1200-08','판정','교환 판정','select','평가',NULL,'["정상","교환"]','fact',6),
('M1200-08','작업자','작업자','auto','확인',NULL,NULL,'frame',7);
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('M1200-08','일자','2026-07-01','점검일 ※예시는 과거'),
('M1200-08','설비명','스폿 용접기 #3',NULL),
('M1200-08','팁규격','Φ16 CuCrZr',NULL),
('M1200-08','관리주기','5000타','교환 관리 기준 타수'),
('M1200-08','현재타수','4820','현재 타수 ※예시 — 카운터 실제 값'),
('M1200-08','판정','정상',NULL),
('M1200-08','작업자','(저장 시 작성자 자동)',NULL);

-- ── K1200-07 외주 ISIR·검사협정 접수대장 ──
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, field_class, sort_order) VALUES
('K1200-07','접수일자','접수일자','date','기본 정보',NULL,NULL,'fact',1),
('K1200-07','외주사','외주사','text','기본 정보',NULL,NULL,'frame',2),
('K1200-07','품번','품번','text','기본 정보',NULL,NULL,'frame',3),
('K1200-07','ISIR번호','ISIR 번호','text','접수','제출 ISIR 문서번호',NULL,'fact',4),
('K1200-07','접수유형','접수유형','select','접수',NULL,'["신규","변경","정기"]','frame',5),
('K1200-07','검토결과','검토결과','select','접수',NULL,'["승인","조건부","반려"]','fact',6),
('K1200-07','담당자','담당자','auto','확인',NULL,NULL,'frame',7);
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('K1200-07','접수일자','2026-07-01','접수일 ※예시는 과거'),
('K1200-07','외주사','(주)대한정밀',NULL),
('K1200-07','품번','84610-2S000',NULL),
('K1200-07','ISIR번호','ISIR-DH-26-014','ISIR 번호 ※예시 — 실제 제출 문서번호'),
('K1200-07','접수유형','변경',NULL),
('K1200-07','검토결과','승인',NULL),
('K1200-07','담당자','(저장 시 작성자 자동)',NULL);

-- ── L4102-02 양산단계 공정능력 산출 ──
INSERT OR IGNORE INTO form_fields (form_code, field_key, label, type, section, placeholder, options_json, field_class, sort_order) VALUES
('L4102-02','측정일','측정일','date','기본 정보',NULL,NULL,'fact',1),
('L4102-02','품번','품번','text','기본 정보',NULL,NULL,'frame',2),
('L4102-02','특성','관리 특성','text','기본 정보',NULL,NULL,'frame',3),
('L4102-02','USL','규격 USL','text','규격',NULL,NULL,'frame',4),
('L4102-02','LSL','규격 LSL','text','규격',NULL,NULL,'frame',5),
('L4102-02','Cpk','산출 Cpk','text','산출','실측 데이터로 산출한 Cpk',NULL,'fact',6),
('L4102-02','판정','판정','select','산출',NULL,'["양호(≥1.33)","관리(1.0~1.33)","부족(<1.0)"]','fact',7),
('L4102-02','작성자','작성자','auto','확인',NULL,NULL,'frame',8);
INSERT OR IGNORE INTO form_examples (form_code, field_key, example_value, why_note) VALUES
('L4102-02','측정일','2026-07-01','산출 기준일 ※예시는 과거'),
('L4102-02','품번','28236-2MAA0',NULL),
('L4102-02','특성','용접 인장강도',NULL),
('L4102-02','USL','270',NULL),
('L4102-02','LSL','230',NULL),
('L4102-02','Cpk','1.45','산출 Cpk ※예시 — 실측 데이터로 산출한 실제 값'),
('L4102-02','판정','양호(≥1.33)',NULL),
('L4102-02','작성자','(저장 시 작성자 자동)',NULL);
