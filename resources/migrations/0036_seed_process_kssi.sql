-- 0036_seed_process_kssi.sql (scripts/seed-process-kssi.py 로 생성)
-- 정본 9개 프로세스 개정이력 + 성과지표(KSSI)를 process_revisions 에 시드.
-- 8개(CP-01/02·MP-01~03·SP-01~03) 개정이력 6행 INSERT + CP-03 기존행 KPI UPDATE.
-- migrate.ts 트랜잭션 래핑(BEGIN/COMMIT 없음). KSSI 는 개정이력 표 KPI 4칸 모델(0018).

-- [CP-01]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '정밀인발튜브 사업부 개발영업 이기식 과장', '매출계획달성율', '매출목표액/매출액', '매월', '영업 부서장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '정밀인발튜브 사업부 개발영업 이기식 차장', '고객모니터링지수(납기준수율·추가운임비·고객반송불량율·고객라인정지건수·고객불만건수)', '항목별 실적/항목별 목표', '매월', '영업 부서장', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-01', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 5);

-- [CP-02]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '정밀인발튜브 사업부 개발영업 이기식 과장', '개발수주건수 달성율', '신규 수주건수/신규 목표수주건수', '분기', '사업부 개발팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '정밀인발튜브 사업부 개발영업 이기식 차장', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '필라넥워터 사업부 이백범 대리', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '필라넥워터 사업부 이백범 과장', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('CP-02', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '필라넥워터 사업부 이백범 과장', '', '', '', '', 5);

-- [MP-01]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '경영관리실 총무 김병철 과장', '사업계획 달성율', '사업계획달성건수/사업계획건수', '매월', '전 팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '경영관리실 총무 김병철 차장', '조치율', '시정조치건수/시정조치요구건수', '매월', '전 팀장', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '경영관리실 총무 김병철 차장', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '경영관리실 총무 김병철 부장', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '경영관리실 총무 김병철 부장', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-01', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '경영관리실 총무 김병철 이사', '', '', '', '', 5);

-- [MP-02]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '기술연구소 품질보증팀 곽주섭', '', '', '', '', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '기술연구소 품질보증팀 백달현', '', '', '', '', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '기술연구소 품질보증팀 백달현', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '기술연구소 품질보증팀 김권표', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '기술연구소 품질보증팀 김권표', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-02', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '기술연구소 품질경영팀 김권표', '', '', '', '', 5);

-- [MP-03]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '경영관리실 총무 김병철 과장', '사업계획 달성율', '사업계획달성건수/사업계획건수', '매월', '전 팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '경영관리실 총무 김병철 차장', '조치율', '시정조치건수/시정조치요구건수', '매월', '전 팀장', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '경영관리실 총무 김병철 차장', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '경영관리실 총무 김병철 부장', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '경영관리실 총무 김병철 부장', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('MP-03', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '경영관리실 총무 김병철 이사', '', '', '', '', 5);

-- [SP-01]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '구매팀 김상수 과장', '공급자 평가실시율', '평가 실시건수/평가 계획건수', '매월', '구매팀장·생산팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '구매팀 사공호정 대리', '재고 회전율', '매출액/재고금액', '분기', '구매팀장', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '구매팀 사공호정 대리', '공급자모니터링지수(납기준수율·추가운임비·고객반송불량율·고객라인정지건수·고객불만건수)', '항목별 실적/항목별 목표', '매월', '영업부서장', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '구매팀 사공호정 과장', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '구매팀 사공호정 과장', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-01', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '구매팀 사공호정 차장', '', '', '', '', 5);

-- [SP-02]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '기술연구소 품질보증팀 곽주섭', '수입검사 불량율(입고불량율)', '입고불량수량(금액)/입고수량(금액)', '매월', '품질보증팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '기술연구소 품질보증팀 백달현', '완성품 불량율', '완성품 불량수량(금액)/생산수량(금액)', '매월', '품질보증팀장', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '기술연구소 품질보증팀 백달현', '검교정실시율', '검교정 실시건수/검교정 계획건수', '분기', '품질보증팀장', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '기술연구소 품질보증팀 김권표', '폐기금액 달성율', '폐기금액/폐기목표금액', '매월', '품질보증팀장', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '기술연구소 품질보증팀 김권표', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-02', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '기술연구소 품질경영팀 김권표', '', '', '', '', 5);

-- [SP-03]
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 0, '2004-08-30', 'ISO/TS 16949:2002 추진에 따른 전면 개정', '기술연구소 품질보증팀 곽주섭', '개선목표 달성율', '개선건수(금액)/개선목표건수(금액)', '매월', '품질보증팀장', 0);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 1, '2009-08-01', '조직개편(TPC+코디박)에 따른 개정 및 오기수정, ISO/TS 16949:2009 개정요건 반영', '기술연구소 품질보증팀 백달현', '', '', '', '', 1);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 2, '2010-04-01', '㈜TPC 윤리행동규범 제정·공포', '기술연구소 품질보증팀 백달현', '', '', '', '', 2);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 3, '2018-01-02', 'ISO/TS16949:2009 → IATF16949:2016 전환에 따른 전면 개정', '기술연구소 품질보증팀 김권표', '', '', '', '', 3);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 4, '2020-08-03', 'ISO14001 인증범위 변경에 따른 매뉴얼 갱신', '기술연구소 품질보증팀 김권표', '', '', '', '', 4);
INSERT INTO process_revisions (process_code, rev_no, rev_date, reason, author, kpi, formula, cycle, owner, sort_order) VALUES ('SP-03', 5, '2023-05-01', '2,3공장 양산이후 원격지원 기능 발생', '기술연구소 품질경영팀 김권표', '', '', '', '', 5);

-- [CP-03] 기존 개정행 KPI 채움
UPDATE process_revisions SET kpi='생산계획 달성율', formula='생산실적 금액/생산목표 금액', cycle='매월', owner='생산팀장' WHERE process_code='CP-03' AND rev_no=0;
UPDATE process_revisions SET kpi='설비가동율', formula='설비가동시간/부하시간', cycle='매월', owner='생산팀장' WHERE process_code='CP-03' AND rev_no=1;
UPDATE process_revisions SET kpi='공정불량율', formula='공정불량수량(금액)/생산수량(금액)', cycle='매월', owner='생산팀장' WHERE process_code='CP-03' AND rev_no=2;
