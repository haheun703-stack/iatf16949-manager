-- ============================================================
-- Migration 0075: ISIR 3+1 품번 척추 시드 (2026-07-17)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 원천 = SQ 레벨업 스캔 354p 전수 판독(docs/sq-levelup-2026-10/ 문서대장).
-- 0041(28237-2MAA1) 선례 — isir_packages + 26종 체크리스트(present=판독 확인)
-- + control_plan_items(공정 단위 요약 — 원본 을지 세부행은 스캔 참조, evidence_path에 페이지).
-- present=0 중 근거 있는 것은 evidence_path에 사유 기입(예: 25460 공정능력 목록 X).
-- 완비도 엔진(req vs present)이 판독 리스크(R1~R16)와 자동 정합.
-- 멱등: 패키지 존재 시 전체 스킵(재실행 안전). ⚠️BEGIN/COMMIT 없음.
-- ============================================================

-- ── 25460-2T500 (C2TPE030, isir_new) ──
INSERT INTO isir_packages (part_no, rev_code, rev_date, submit_type, customer_recipient, qa_manager, submitted_at, approved, source_path, created_at)
SELECT '25460-2T500', 'C2TPE030', '23.02.07', 'isir_new', '현대위아', '하헌', '2023.05', 0, 'D:\IATF16949,SQ 자동작성 봇\SQ 레벨업-심사 3종 아이템 ISIR,스캔본 모음\25460-2T500_02.pdf', datetime('now')
 WHERE NOT EXISTS (SELECT 1 FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030');
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 1, '사양변경서', 0, 0, 1, 0, '신규개발 — 해당무'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=1);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 2, '초도품 보증서', 0, 1, 1, 1, '2권 p003(수요자 판정 공란 R1)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=2);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 3, '검사 협정서', 1, 1, 1, 1, '2권 p004(체결일 공란 R11)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=3);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 4, '검사 기준서', 1, 1, 1, 1, '2권 p006~009'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=4);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 5, '검사 성적서', 0, 1, 1, 1, '2권 p010~012'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=5);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 6, 'INSPECTION REPORT', 0, 1, 1, 1, '2권 p013~019 형상(Mahr)·p054~057 CMM'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=6);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 7, '부품용접 검사 기준서(해당시)', 0, 1, 1, 1, '2권 p020 용접(로브레이징) 성적서로 갈음'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=7);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 8, '신뢰성 시험 성적서(재질시험포함)', 0, 1, 1, 1, '2권 p021~026'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=8);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 9, 'MILL SHEET', 0, 1, 1, 1, '2권 p027~028'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=9);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 10, '중금속 검사 성적서', 0, 1, 1, 1, '2권 p029~044 KTR 2건'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=10);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 11, 'IMDS 입력자료', 0, 1, 1, 1, '2권 p045~049(Il-Shin 명의 R4)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=11);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 12, '검사구/측정 보조구 검사 성적서', 0, 1, 1, 1, '2권 p050~053 CHECK FIXTURE'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=12);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 13, '관리계획서', 1, 1, 1, 1, '2권 p058~062(18공정)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=13);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 14, '공정 흐름도', 0, 1, 1, 0, 'CP 갑지 LAYOUT로 갈음(별도 미편철)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=14);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 15, '공정 FMEA', 1, 1, 1, 1, '2권 p063~064(품명 오기 R12)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=15);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 16, '검사구/측정 보조구 LIST', 0, 1, 1, 1, '2권 p051~053 검사구 도면'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=16);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 17, '신뢰성 시험 계획서', 1, 1, 1, 1, '2권 p066'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=17);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 18, '시험기/계측기 보유 현황', 0, 1, 1, 1, '2권 p067~068(30종)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=18);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 19, '2,3차 공급자 현황', 1, 1, 1, 1, '2권 p065(6개사)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=19);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 20, '공정감사 평가표 및 결과보고서', 0, 0, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=20);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 21, '공정능력 평가결과', 0, 0, 1, 0, '제출목록 X 명기(R2)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=21);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 22, '4M변경 신고서(해당시)', 0, 0, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=22);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 23, '조직도(품질보증책임자 선정)', 0, 1, 1, 1, '2권 p069(2공장 71명)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=23);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 24, '인증서 사본', 0, 1, 1, 1, '2권 p070 SQ인증서(2023.11 만료 R3)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=24);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 25, '부품 도면', 1, 1, 1, 1, '2권 p071~072'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=25);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 26, 'SAMPLE', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND doc_no=26);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 1, '10', '단품입고 PIPE', '수입검사', NULL, '외관·치수·재질·중금속', NULL, 'Ø37/Ø39±0.3, STKM11A Ø35×1.2T, MS201-02', '육안/V·C/M-SHEET', '5EA/LOT·재질 1회/3개월·중금속 1회/6개월', '수입검사 이력카드', 0, 1, '가공업체 통보·조치', '가공-TPC가공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=1);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 2, '20', '단품입고 NIPPLE', '수입검사', NULL, '외관·치수·재질·중금속', NULL, 'Ø9/Ø12±0.3, STKM11A Ø8×1.0T', '육안/V·C/M-SHEET', '5EA/LOT 외 상동', '수입검사 이력카드', 0, 1, '가공업체 통보·조치', '가공-휴먼테크'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=2);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 3, '30', '단품입고 BRACKET1', '수입검사', NULL, '외관·HOLE·재질', NULL, 'HOLE Ø7±0.2, SPCC 3.2T', '육안/V·C', '5EA/LOT 외 상동', '수입검사 이력카드', 0, 1, '가공업체 통보·조치', '가공-대웅산업사·원소재 삼보사급'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=3);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 4, '40', '단품입고 BRACKET2', '수입검사', NULL, '외관·치수·재질', NULL, 'SPCC 3.2T', '육안/V·C', '상동', '수입검사 이력카드', 0, 1, '상동', '상동'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=4);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 5, '50', '단품입고 BRACKET3', '수입검사', NULL, '외관·치수·재질', NULL, 'SPCC 1.6T', '육안/V·C', '상동', '수입검사 이력카드', 0, 1, '상동', '상동'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=5);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 6, '60', '단품입고 HOSE-WATER OUTLET', '수입검사', NULL, '외관·클립 2EA 누락·내경·재질', NULL, '내경 Ø33.7~34.7, EPDM MS263-19B', '육안/V·C', '5EA/LOT·M/SHEET 1회/3개월', '수입검사 이력카드', 0, 1, '통보·조치', '삼보사급(세명기업)'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=6);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 7, '70', '단품입고 HOSE-AIR VENR LWR', '수입검사', NULL, '외관·클립·HOLE·재질', NULL, 'HOLE Ø7±0.3, EPDM MS263-07', '육안/V·C', '상동', '수입검사 이력카드', 0, 1, '통보·조치', '삼보사급(세명기업)'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=7);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 8, '80', '1차 스포트용접 NIPPLE', '스포트 용접기', NULL, '용접부 외관·장착성·용접조건', NULL, '전류 3~7kA·통전 3~8CYC·가압 0.2~0.4MPa·팁연마 50,000타', 'C/F·카운터', '초/중/종품·조건 시업전', '자주검사 C/SHEET·설비일상점검표', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=8);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 9, '90', '2차 스포트용접 ASSY', '스포트 용접기', NULL, '상동', NULL, '상동', 'C/F·카운터', '상동', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=9);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 10, '100', '로브레이징', '로브레이징 M/C', NULL, '작업조건·외관·절단 용입', '◆', '1가열 700~850·2/3가열 1,065~1,100·냉각 25~45도, LPG 2.8~3.6·AIR 40~56N㎥/H', '온도계/압력게이지/육안/절단시험', '조건 초/중/종품·용입 초품 1EA', '조건관리 C/SHEET·ITEM LIST', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=10);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 11, '110', 'L/TEST', 'L/TEST M/C(공압)', NULL, '기밀성·타각·조건·마스터', '◆', '3kg/cm2 리크무, 메인 0.5~0.8MPa·TEST 0.3MPa·25초', '모니터/육안', '전수·마스터 시업전', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=11);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 12, '120', '표면처리(외주)', '수입검사', NULL, '외관·도금두께·내식성·중금속', NULL, 'PFZnNi8-B 8µm 이상, MS611-15, MS201-02', '도금두께측정기/성적서', '5EA/LOT·두께 1EA/LOT·성적서 1회/6개월', '수입검사 이력카드', 0, 1, '표면처리업체 통보·조치', '영남금속'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=12);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 13, '130', '1차 호스 조립', '호스 조립기', NULL, '공정누락·삽입위치', NULL, '이상 무', '육안', '전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=13);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 14, '140', '2차 호스 조립', '호스 조립기', NULL, '상동', NULL, '상동', '육안', '전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=14);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 15, '150', '장착 검사', '수작업', NULL, '끝단길이·간섭·클립위치·점마킹(노랑)·C/F', NULL, '체크지그 일치·마킹 확인', '육안/C/F', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=15);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 16, '160', 'L/TEST(2차)', 'L/TEST M/C(공압)', NULL, '기밀성 — 110과 동일', '◆', '3kg/cm2·마스터 시업전', '모니터/육안', '전수', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=16);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 17, '170', '외관 검사', '수작업', NULL, '찍힘·미도금·오조립·타각·마킹·이종혼입', NULL, '이상 무', '육안', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=17);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030'), 18, '180', '포장', '수작업', NULL, '이종혼입·포장상태·식별표', NULL, '이상 무', '육안', '전수', NULL, 1, 0, '영업담당자 통보·조치', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='25460-2T500' AND rev_code='C2TPE030') AND seq=18);

-- ── 28236-2MAA0 (C2MSE481, isir_change) ──
INSERT INTO isir_packages (part_no, rev_code, rev_date, submit_type, customer_recipient, qa_manager, submitted_at, approved, source_path, created_at)
SELECT '28236-2MAA0', 'C2MSE481', '25.08.21', 'isir_change', '삼보모터스', '김기범', '2025.09.22', 1, 'D:\IATF16949,SQ 자동작성 봇\SQ 레벨업-심사 3종 아이템 ISIR,스캔본 모음\28236-2MAA0_02.pdf', datetime('now')
 WHERE NOT EXISTS (SELECT 1 FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481');
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 1, '사양변경서', 0, 0, 1, 1, '2권 p001 승인사유서(치수오기 정정)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=1);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 2, '초도품 보증서', 0, 1, 1, 1, '2권 p003(수요자 승인 25.09.30 완결)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=2);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 3, '검사 협정서', 1, 1, 1, 1, '2권 p004(체결 25.09.30)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=3);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 4, '검사 기준서', 1, 1, 1, 1, '2권 p005~007'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=4);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 5, '검사 성적서', 0, 1, 1, 1, '2권 p008~009'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=5);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 6, 'INSPECTION REPORT', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=6);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 7, '부품용접 검사 기준서(해당시)', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=7);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 8, '신뢰성 시험 성적서(재질시험포함)', 0, 1, 1, 1, '2권 p010~014'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=8);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 9, 'MILL SHEET', 0, 1, 1, 1, '2권 p015(세종에스피 명의 R8)·p024'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=9);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 10, '중금속 검사 성적서', 0, 1, 1, 1, '2권 p016~037 KTR·SGS'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=10);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 11, 'IMDS 입력자료', 0, 1, 1, 1, '2권 p038~042(Il-Shin 명의 R4)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=11);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 12, '검사구/측정 보조구 검사 성적서', 0, 1, 1, 1, '2권 p043~045 CHECK FIXTURE'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=12);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 13, '관리계획서', 1, 1, 1, 1, '2권 p046~050(12공정 ◆3)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=13);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 14, '공정 흐름도', 0, 1, 1, 0, 'CP 갑지 LAYOUT로 갈음'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=14);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 15, '공정 FMEA', 1, 1, 1, 1, '2권 p051~052(b개정 미반영 R12)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=15);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 16, '검사구/측정 보조구 LIST', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=16);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 17, '신뢰성 시험 계획서', 1, 1, 1, 1, '2권 p054'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=17);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 18, '시험기/계측기 보유 현황', 0, 1, 1, 1, '2권 p053 측정설비 현황'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=18);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 19, '2,3차 공급자 현황', 1, 1, 1, 1, '2권 p055(6개사)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=19);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 20, '공정감사 평가표 및 결과보고서', 0, 0, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=20);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 21, '공정능력 평가결과', 0, 0, 1, 1, '2권 p056~058 Cp/Cpk 3건(상한 오기 1건 R15)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=21);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 22, '4M변경 신고서(해당시)', 0, 0, 1, 0, '해당무'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=22);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 23, '조직도(품질보증책임자 선정)', 0, 1, 1, 1, '2권 p059'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=23);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 24, '인증서 사본', 0, 1, 1, 1, '2권 p060(SQ·IATF·ISO)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=24);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 25, '부품 도면', 1, 1, 1, 1, '2권 p061'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=25);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 26, 'SAMPLE', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND doc_no=26);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 1, '10', '단품입고 EYE-JOINT', '수입검사', NULL, '외관·정밀치수·조도·장착성·재질·중금속', NULL, 'Φ12.1 -0.1/+0.3, 조도 12.5RT 이하, SWCH10A', '육안/V·C/조도계/C/F', '5EA/LOT·재질 1회/3개월·중금속 1회/6개월', '수입검사 이력카드', 0, 1, '가공업체 통보', '가공-휴먼테크'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=1);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 2, '20', '단품입고 PIPE', '수입검사', NULL, '외관·포밍Φ14/스풀Φ15·내경·재질', NULL, 'STKM11A Φ12.0×1.0t', '육안/V·C/C/F', '상동', '수입검사 이력카드', 0, 1, '통보', '가공-SW테크'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=2);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 3, '30', '단품입고 BRKT A', '수입검사', NULL, '외관·홀Φ7±0.2·폭 22±0.3·재질', NULL, 'SPHC-P 2.0T', '육안/V·C', '상동', '수입검사 이력카드', 0, 1, '통보', '원소재-삼보사급·가공-우신정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=3);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 4, '40', '단품입고 BRKT B', '수입검사', NULL, '외관·홀 9.5/8±0.2·재질', NULL, 'SPHC-P 2.0T', '육안/V·C', '상동', '수입검사 이력카드', 0, 1, '통보', '상동'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=4);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 5, '50', 'SPOT용접(PIPE+BRKT)', 'SPOT 용접기', NULL, '용접부 기공·장착성·용접누락·조건·팁주기', NULL, '전류 5-8KA·통전 4-6CYC·가압 1.0~4.0kgf/cm2·팁 연마 5,000EA/교체 20,000EA', 'C/F·카운터', '초/중/종품·점검 1회/일', '자주검사 C/SHEET·교체주기 관리대장', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=5);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 6, '60', '로브레이징', '로브레이징 M/C(연속로)', NULL, '작업조건(냉각 ZONE 특별특성)·외관·절단용입', '◆', '1가열 700~850·2/3가열 1,065~1,100, 냉각 25~45도, LPG 2.8~3.6·AIR 40~56', '온도계/압력게이지/절단시험', '조건 초/중/종·용입 초품 1EA', '조건관리 C/SHEET', 1, 1, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=6);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 7, '70', 'L/TEST 1차', 'L/TEST M/C(공압)', NULL, '기밀성·타각·조건·마스터·SPC', '◆', 'TEST압력 5Kg/cm2 이상·19초(가압5/평정7/검출7)', '모니터', '전수·마스터 시업전·SPC(Cp/Cpk·관리도)', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=7);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 8, '80', '표면처리(외주)', '수입검사', NULL, '외관·도금두께·내식성·중금속', NULL, 'PFZnNi8-B 8µm 이상, MS611-15', '도막측정기/성적서', '5EA/LOT·두께 1EA/LOT·내식 1회/6개월', '수입검사 이력카드', 0, 1, '표면처리업체 통보', '영남금속'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=8);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 9, '90', 'L/TEST 2차(도금후)', 'L/TEST M/C(공압)', NULL, '70공정과 동일', '◆', 'TEST압력 5Kg/cm2 이상·19초', '모니터', '전수·시업전 마스터·SPC', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=9);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 10, '100', '장착검사(마킹·교정)', '수작업', NULL, '검사핀 간섭·끝단길이·일자마킹(흰색 8mm)·C/F', NULL, '체크지그 일치', '육안/C/F', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=10);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 11, '110', '외관검사·캡조립', '수작업', NULL, '스크래치·용접누락·타각·미도금·이종혼입·식별표', NULL, '이상 무', '육안', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=11);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481'), 12, '120', '포장', '수작업', NULL, '포장상태', NULL, '이상 무', '육안', '전수', NULL, 1, 0, '영업담당', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28236-2MAA0' AND rev_code='C2MSE481') AND seq=12);

-- ── 28350-2M100 (C2MPE167, isir_change) ──
INSERT INTO isir_packages (part_no, rev_code, rev_date, submit_type, customer_recipient, qa_manager, submitted_at, approved, source_path, created_at)
SELECT '28350-2M100', 'C2MPE167', '23.03.29', 'isir_change', '삼보모터스', '하헌', '2024.08.07', 1, 'D:\IATF16949,SQ 자동작성 봇\SQ 레벨업-심사 3종 아이템 ISIR,스캔본 모음\28350-2M100_02.pdf', datetime('now')
 WHERE NOT EXISTS (SELECT 1 FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167');
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 1, '사양변경서', 0, 0, 1, 1, '2권 p004 사양변경서(도금업체·색상)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=1);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 2, '초도품 보증서', 0, 1, 1, 1, '2권 p005(공급자 검토 서명 누락 R1)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=2);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 3, '검사 협정서', 1, 1, 1, 1, '2권 p006'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=3);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 4, '검사 기준서', 1, 1, 1, 1, '2권 p007~013(84항목)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=4);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 5, '검사 성적서', 0, 1, 1, 1, '2권 p014~019'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=5);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 6, 'INSPECTION REPORT', 0, 1, 1, 1, '2권 p019 형상측정차트'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=6);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 7, '부품용접 검사 기준서(해당시)', 0, 1, 1, 1, '2권 p022 용접 성적서로 갈음'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=7);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 8, '신뢰성 시험 성적서(재질시험포함)', 0, 1, 1, 1, '2권 p023~027(염수분무 LOT 상이)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=8);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 9, 'MILL SHEET', 0, 1, 1, 1, '2권 p028 제일스틸·p037 POSCO'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=9);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 10, '중금속 검사 성적서', 0, 1, 1, 1, '2권 p029~049 KTR·SGS'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=10);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 11, 'IMDS 입력자료', 0, 1, 1, 1, '2권 p050~054(2017 미갱신 의심 R4)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=11);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 12, '검사구/측정 보조구 검사 성적서', 0, 1, 1, 1, '2권 p057~058 CMM(2022 시효 R16)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=12);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 13, '관리계획서', 1, 1, 1, 1, '2권 p059~063(17공정 ◈2, 고객승인 서명)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=13);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 14, '공정 흐름도', 0, 1, 1, 0, 'CP 갑지 LAYOUT로 갈음(별도 미편철 명기)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=14);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 15, '공정 FMEA', 1, 1, 1, 1, '2권 p064~065'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=15);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 16, '검사구/측정 보조구 LIST', 0, 1, 1, 1, '2권 p055~056 JIG 도면(2017)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=16);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 17, '신뢰성 시험 계획서', 1, 1, 1, 1, '2권 p067'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=17);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 18, '시험기/계측기 보유 현황', 0, 1, 1, 1, '2권 p066'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=18);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 19, '2,3차 공급자 현황', 1, 1, 1, 1, '2권 p068'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=19);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 20, '공정감사 평가표 및 결과보고서', 0, 0, 1, 0, '목록 X ↔ 4M 회신 공정감사 필요 표시 상충(R)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=20);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 21, '공정능력 평가결과', 0, 0, 1, 1, '2권 p069(포밍 HOLE Cp2.97/Cpk2.60)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=21);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 22, '4M변경 신고서(해당시)', 0, 0, 1, 1, '2권 p001 4M 의뢰·회신(날짜역전 R7)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=22);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 23, '조직도(품질보증책임자 선정)', 0, 1, 1, 1, '2권 p070(2공장 71명)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=23);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 24, '인증서 사본', 0, 1, 1, 1, '2권 p071~073(SQ 2025.4 만료 R3)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=24);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 25, '부품 도면', 1, 1, 1, 1, '2권 p074~075'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=25);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 26, 'SAMPLE', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND doc_no=26);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 1, '10', '단품입고 BRKT A(28353-2M100-3)', '수입검사', NULL, '외관·Φ7±0.3·재질·중금속', NULL, 'SPHC-P 2.0t, MS201-02', '육안/V·C/M-SHEET', '5EA/LOT·1회/3개월·1회/6개월', '수입검사 이력카드', 0, 1, '가공업체 통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=1);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 2, '20', '단품입고 BRKT B(-4)', '수입검사', NULL, '외관·Φ8.0±0.3·재질', NULL, 'SPHC-P 2.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=2);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 3, '30', '단품입고 BRKT C(-5)', '수입검사', NULL, '외관·20.0±0.3·재질', NULL, 'SPHC-P 2.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=3);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 4, '40', '단품입고 WIRING BRKT(91931-M6050)', '수입검사', NULL, '외관·Φ8.0±0.3·재질', NULL, 'SPHC-P 2.0t(MS121-05)', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=4);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 5, '50', '단품입고 PIPE-VACUUM 원소재(-1)', '수입검사', NULL, '외관·비드부 크랙·Φ11.3±0.3·279±1·재질', NULL, 'STKM11A Φ10×1.0t', '육안/V·C/검사구/M-SHEET', '5EA/LOT 외', '수입검사 이력카드', 0, 1, '구매 통보', 'D.H ENG'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=5);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 6, '60', 'PIPE-VACUUM 벤딩', '파워 벤딩기', NULL, '벤딩부·장착성·길이센서 MASTER·에어압력', NULL, '벤딩 4개소·MASTER 검출·5.0~8.0kgf/cm2', '육안/C/F/압력게이지', '전수+초/중/종·MASTER 시업전', '자주검사 C/SHEET·설비일상점검표', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=6);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 7, '70', '단품입고 PIPE-BREATHER 원소재(-2)', '수입검사', NULL, '외관·Φ11.3±0.3·265±1·재질', NULL, 'STKM11A Φ10×1.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', 'D.H ENG'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=7);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 8, '80', 'PIPE-BREATHER 벤딩', '파워 벤딩기', NULL, '공정60과 동일(벤딩 5개소)', NULL, '동일', '동일', '동일', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=8);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 9, '90', '스포트용접', '스포트 용접기', NULL, '외관·장착성·용접 8개소·조건·냉각수온도', NULL, '6-10KA·6-15CY·0.2-0.4MPa·18-25도', 'C/F/메인콘트롤박스', '초/중/종·1회/일', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=9);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 10, '100', '로브레이징', '로브레이징 M/C', NULL, '작업조건·외관·절단용입', '◈', '750~850·1,065~1,100도, 냉각 25~45, LPG 2.8~3.6·AIR 40~56, MESH LIST', '컨트롤박스/온도계/절단시험', '조건 3회/1일·외관 초/중/종 3EA·절단 초품 1EA', '조건 자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=10);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 11, '110', '표면처리(외주)', '수입검사', NULL, '외관·도금두께·내식성·중금속', NULL, 'PFZnNi8-B 8µm 이상, MS611-15', '도금두께측정기/성적서', '5EA/LOT·두께 1EA/LOT·1회/6개월', '수입검사 이력카드', 0, 1, '표면처리업체 통보', '영남금속'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=11);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 12, '120', 'LEAK TEST', '공압 LEAK TEST M/C', NULL, '기밀성·타각·조건·마스터', '◈', '0.5~0.8MPa·19초(가압5/평정8/검출6)', '육안/모니터', '전수·마스터 1회/일', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=12);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 13, '130', 'HOSE 조립', '호스 조립 지그', NULL, '공정누락·장착성', NULL, '체크지그 일치', '육안/C/F', '전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=13);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 14, '140', '교정', '수작업', NULL, '외관·장착성', NULL, '교정작업 발생시 전수검사', '육안/C/F', '발생시 전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=14);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 15, '150', '장착검사', '수작업', NULL, '외관·용접 8개소·타각·C/F', NULL, '체크지그 일치', '육안/C/F', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=15);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 16, '160', '외관검사', '수작업', NULL, '마킹 2개소·크랙·클립위치·용접누락 6Point·동액뭉침', NULL, '이상 무', '육안', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=16);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167'), 17, '170', '포장', '수작업', NULL, '이종혼입·식별표', NULL, '이상 무', '육안', '전수', NULL, 1, 0, '영업담당 통보', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M100' AND rev_code='C2MPE167') AND seq=17);

-- ── 28350-2M110 (C2MTE252, isir_change) ──
INSERT INTO isir_packages (part_no, rev_code, rev_date, submit_type, customer_recipient, qa_manager, submitted_at, approved, source_path, created_at)
SELECT '28350-2M110', 'C2MTE252', '26.04.09', 'isir_change', '삼보모터스', '김기범', '2026.05.13', 0, 'D:\IATF16949,SQ 자동작성 봇\SQ 레벨업-심사 3종 아이템 ISIR,스캔본 모음\28350-2M110_02.pdf', datetime('now')
 WHERE NOT EXISTS (SELECT 1 FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252');
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 1, '사양변경서', 0, 0, 1, 1, '2권 p002 사양변경서(스티커 삭제)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=1);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 2, '초도품 보증서', 0, 1, 1, 1, '2권 p003(수요자 판정·승인번호 공란 R1)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=2);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 3, '검사 협정서', 1, 1, 1, 1, '2권 p004(체결일 공란 R11)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=3);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 4, '검사 기준서', 1, 1, 1, 1, '2권 p005~011(1~85부위)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=4);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 5, '검사 성적서', 0, 1, 1, 1, '2권 p012~016'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=5);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 6, 'INSPECTION REPORT', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=6);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 7, '부품용접 검사 기준서(해당시)', 0, 1, 1, 1, '2권 p017 용접(로브레이징 파괴시험 용입 100%)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=7);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 8, '신뢰성 시험 성적서(재질시험포함)', 0, 1, 1, 1, '2권 p037~041(⚠️2M100 명의 4건 R5)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=8);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 9, 'MILL SHEET', 0, 1, 1, 1, '2권 p018~019 강관·POSCO'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=9);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 10, '중금속 검사 성적서', 0, 1, 1, 1, '2권 p020~035 KTR 2건'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=10);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 11, 'IMDS 입력자료', 0, 1, 1, 1, '2권 p042~046(미개봉·중량 불일치 R4)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=11);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 12, '검사구/측정 보조구 검사 성적서', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=12);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 13, '관리계획서', 1, 1, 1, 1, '2권 p047~052(공정 10~190 ◈2)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=13);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 14, '공정 흐름도', 0, 1, 1, 0, 'CP 갑지 LAYOUT로 갈음'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=14);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 15, '공정 FMEA', 1, 1, 1, 1, '2권 p053~054(RPN 최대 48)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=15);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 16, '검사구/측정 보조구 LIST', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=16);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 17, '신뢰성 시험 계획서', 1, 1, 1, 1, '2권 p056'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=17);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 18, '시험기/계측기 보유 현황', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=18);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 19, '2,3차 공급자 현황', 1, 1, 1, 1, '2권 p055(7개사·대양금속만 SQ O)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=19);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 20, '공정감사 평가표 및 결과보고서', 0, 0, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=20);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 21, '공정능력 평가결과', 0, 0, 1, 1, '2권 p036(포밍 HOLE Cp2.97/Cpk2.60)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=21);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 22, '4M변경 신고서(해당시)', 0, 0, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=22);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 23, '조직도(품질보증책임자 선정)', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=23);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 24, '인증서 사본', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=24);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 25, '부품 도면', 1, 1, 1, 1, '2권 p057(A1, C2MTE252 반영)'
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=25);
INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present, evidence_path)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 26, 'SAMPLE', 0, 1, 1, 0, NULL
 WHERE NOT EXISTS (SELECT 1 FROM isir_documents WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND doc_no=26);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 1, '10', '단품입고 BRKT A(28353-2M100-3)', '수입검사', NULL, '외관·Φ7±0.3·11.5±0.3·재질·중금속', NULL, 'SPHC-P 2.0t', '육안/V·C/M-SHEET', '5EA/LOT·1회/3개월·1회/6개월', '수입검사 이력카드', 0, 1, '통보', '프레스 대철정공·원소재 삼보사급'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=1);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 2, '20', '단품입고 BRKT B(-4)', '수입검사', NULL, '외관·Φ8.0±0.3·재질', NULL, 'SPHC-P 2.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=2);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 3, '30', '단품입고 BRKT C(-5)', '수입검사', NULL, '외관·20.0±0.3·재질', NULL, 'SPHC-P 2.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=3);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 4, '40', '단품입고 CONT WIRG MTG-BRKT(28353-2M110-6)', '수입검사', NULL, '외관·Φ8.0±0.3·재질', NULL, 'SPHC-P 2.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', '대철정공'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=4);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 5, '50', '단품입고 HOSE ASSY-HEATER(26710-2M000A)', '수입검사', NULL, '외관·클립 1EA 누락·내경·미성형·중금속', NULL, '이상 무', '육안', '5EA/LOT', '수입검사 이력카드', 0, 1, '통보', '삼보사급'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=5);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 6, '60', '단품입고 PIPE-VACUUM(-P1)', '수입검사', NULL, '외관·비드부 크랙·Φ11.3±0.3·279±1·재질', NULL, 'STKM11A Φ10×1.0t', '육안/V·C/검사구/M-SHEET', '5EA/LOT·1회/3개월·1회/6개월', '수입검사 이력카드', 0, 1, '통보', '가공 D.H ENG·원소재 TPC'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=6);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 7, '70', 'PIPE-VACUUM 벤딩(-B1)', '파워 벤딩기', NULL, '벤딩 4개소·장착성·길이센서 MASTER·에어압력', NULL, 'MASTER(짧은/긴제품) 검출·5.0~8.0kgf/cm2', '육안/C/F/센서', '전수+초/중/종·MASTER 시업전', '설비일상점검표·자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=7);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 8, '80', '단품입고 PIPE-BREATHER(-P2)', '수입검사', NULL, '외관·Φ11.3±0.3·265±1·재질', NULL, 'STKM11A Φ10×1.0t', '동일', '동일', '수입검사 이력카드', 0, 1, '통보', 'D.H ENG/TPC'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=8);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 9, '90', 'PIPE-BREATHER 벤딩(-B2)', '파워 벤딩기', NULL, '벤딩 5개소·C/F·MASTER·에어압력', NULL, '동일', '동일', '동일', '자주검사 C/SHEET·설비일상점검표', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=9);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 10, '100', '스포트용접(-S1)', '스포트 용접기', NULL, '용접부 떨어짐·용접 8개소·조건', NULL, '6-8KA·4-6CY·0.2-0.4MPa·18-25도 1회/일', 'C/F/컨트롤박스', '전수(외관)·초/중/종(장착성)', '자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=10);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 11, '110', '로브레이징(-R1)', '로브레이징 M/C', NULL, '작업조건·외관(동링 누락 등)', '◈', '700~800·1,065~1,100×2, 냉각수 25~45, 가스 2.8~3.6/40~56', '컨트롤박스/온도계/압력게이지', '3회/1일·외관 초/중/종 3EA', 'ITEM LIST·조건 자주검사 C/SHEET', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=11);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 12, '120', '표면처리(-D1, 외주)', '수입검사', NULL, '외관·도금두께·내식성·중금속', NULL, 'PFZnNi8-B 8µm 이상, MS611-15', '측정기/성적서', '5EA/LOT·두께 1EA/LOT·1회/6개월', '수입검사 이력카드', 0, 1, '표면처리업체 통보', '대양금속'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=12);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 13, '130', 'LEAK TEST(-L1)', '공압 LEAK TEST M/C', NULL, '기밀성·타각·조건·마스터', '◈', '0.5~0.8MPa·19초(가압5/평정8/검출6)', '육안/모니터', '전수·마스터 1회/일', '자주검사 C/SHEET', 1, 0, 'MIP', '공정 140 결번(갑지 LAYOUT 대응 확인)'
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=13);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 14, '150', 'HOSE 조립', '수작업', NULL, '공정누락·장착성', NULL, '체크지그 일치', '육안/C/F', '전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=14);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 15, '160', '교정', '수작업', NULL, '외관·장착성', NULL, '교정작업 발생시 전수검사', '육안/C/F', '발생시 전수', NULL, 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=15);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 16, '170', '장착 검사', '수작업', NULL, '용접부·동액누락(8개소)·타각·C/F', NULL, '체크지그 일치', '육안/C/F', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=16);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 17, '180', '외관 검사', '수작업', NULL, '마킹 2개소·크랙·클립위치·용접누락 6Point·동액뭉침', NULL, '이상 무', '육안', '전수', '완성품 검사일지', 1, 0, 'MIP', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=17);
INSERT INTO control_plan_items (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
SELECT (SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252'), 18, '190', '포장', '수작업', NULL, '이종혼입·식별표', NULL, '이상 무', '육안', '전수', NULL, 1, 0, '영업담당', NULL
 WHERE NOT EXISTS (SELECT 1 FROM control_plan_items WHERE isir_id=(SELECT id FROM isir_packages WHERE part_no='28350-2M110' AND rev_code='C2MTE252') AND seq=18);

