-- ============================================================
-- Migration 0127: 규정 본문 재적재 배치 2/4 — 15종 · 155섹션
--
-- 사장님 지시(8/1): 0056 행단위 추출 결함 전면 교정.
-- 0056 은 시트를 행 단위로 읽어 좌·우 2단 조판이 한 줄에 섞였다(57종 중 53종 불량:
-- 제목병합 7건·머리글혼입 130섹션). 또 규정 파일의 '모든 시트'를 본문에 넣어
-- 양식 시트 텍스트까지 규정 본문으로 들어갔다(F-2100 = 18개 양식시트 17,436자).
--
-- 신본 = scripts/reg_extract.py — 페이지·단 인식으로 인쇄물 읽는 순서 복원,
-- 본문 시트(+부표/별표 시트)만 적재, 양식은 forms·셀맵 계층 소관으로 제외.
-- 검증: 원본 셀 12,613개 대조 커버리지 100.00%(미포함 0) · 제목/본문 중복 0 · 빈본문 0.
-- 대조 보고서 = docs/reg-bodies/재추출_대조보고서_260801.md
--
-- 대상: A-8101, B-1100, B-2100, B-2200, B-2300, D-1100, F-1100, F-1101, F-2100, H-1100, H-2100, H-3100, H-3200, J-1100, J-1101
-- regulation_sections 는 시드 전용(사용자 입력 없음) → DELETE+INSERT 무손실·재실행 멱등.
-- ============================================================

-- ── A-8101 (5p · REV.6 · 2025-06-25) 11섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'A-8101';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '(서두)', '비상상태 대비 및 대응 규정 · 문서번호 TPC - A - 8101 · 개정 REV.6 · 재·개정일 2025-06-25
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
6 | 2025년 6월 25일 | 비상사태별 주요책임자별 업무처리 FLOW 추가 개정
주관부서 | 경영관리실 총무팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 이 사 | 실 장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김병철 | 김광선 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25
작성 사업부 & 부서 & 작성자
작 성 자
총무 기획팀 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 연구소장
성 명 | 김영동 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '1. 적용범위', '본 규정은 회사의 품질경영체계가 적용되는 조직의 모든 부분에 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '2. 목 적', '본 규정은 잠재적인 비상사태를 파악하고, 대비하며, 문제발생시 신속하고 능동적으로 대응하여
인적, 재산적 손실을 최소화하는 것을 목적으로 한다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '3. 용어의 정의', '3.1 비상사태 : 인적, 재산적 손실이 발생할 수 있는 상태를 말한다.
3.2 대 비 : 비상사태 발생을 미연에 방지하기 위한 대응책을 말한다.
3.3 대 응 : 비상사태 발생시 조처하는 태도, 행동 등을 말한다.
3.4 예방조치 : 사고가 나기전에 미리 조치를 취하는 것을 말한다.
3.5 사 고 : 뜻밖에 일어나는 비상사태를 말한다.', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '4. 책임과 권한', '4.1 대책위원장
대표이사는 비상사태 대책위원장으로서 비상사태 발생시 중대한 문제를 결정, 승인, 조기,
응급 복구 할 책임이 있다.
4.2 대책위원회
대책위원회는 각 사업부 사업부장 및 각 부서 팀장들로 구성되며, 비상사태 예방 및 사태
수습을 위한 실무조직을 구성, 운영해야 한다.
4.3 총무팀장
(1) 비상사태의 전반적인 업무를 총괄 관리한다.
(2) 비상훈련 및 교육 계획을 수립한다.
(3) 비상사태 발생 방지활동을 전개하며, 대외 비상연락망을 비치해야 한다.
4.4 사업부장 및 해당팀장
(1) 비상사태 발생시는 총무팀에 유.무선으로 통보해야 한다.
(2) 사고 발생후 재발방지를 위해 정밀분석 검토하여 비상사태 조치결과 및 대책을 수립하여
총무팀에 통보해야 한다.
(3) 비상사태 발생 방지활동 전개 및 비상사태 연락망을 비치해야 한다.
(4) 가상 비상사태 발생에 대한 계획수립 및 훈련', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '5. 비상사태 발생시의 운영절차', '비상사태 발생시의 운영절차 및 내용은 아래와 같다.
5.1 예상되는 비상사태
(1) 주요설비 고장
(2) 유틸리티 고장 (에어, 전기 등)
(3) 화재 발생시
(4) 기반시설 붕괴
(5) 공급자 공급중단 (원/부자재)
(6) 천재지변 발생시
(7) 인원 부족시
(8) 정보 시스템에 대한 사이버 공격
(9) 가스 및 화학물 유출
(10)팬데믹(바이러스)
5.2 비상사태의 발생 통보
(1) 비상사태 발생팀은 긴급사항을 유,무선 또는 구두로 총무팀장에게 통보하여야 한다.
(2) 통보를 접수한 총무팀장은 비상사태라고 판단되는 경우 비상사태 대책위원회를 소집 운영한다.
(3) 총무팀장은 비상사태 발생 즉시 필요한 경우 비상연락망 및 사내방송등을 통하여 전 임직원에게
상황을 전파토록 한다.
(4) 회사의 중요 대외기관의 연락처는 부표 1과 같다.
5.3 비상사태 대책 위원회 운영
비상사태 대책위원회 조직은 부표 2와 같으며 그 역할은 아래와 같다.
5.3.1 대책위원회
비상사태 발생시 이의 수습을 위해 총괄 지휘 및 대외기관에 협조를 요청하며, 비상연락망,
무전기, 랜턴 등의 응급장구 및 안전보호 장비를 확보해야 한다.
5.3.2 대피/지원반
(1) 피해자 수송과 치료 전반의 의무활동
(2) 피해 우려지역 대피 및 방재활동 지원
(3) 피해자 조사, 보상협의 및 장례운영
5.3.3 방호복구반
(1) 사고현장 확인, 보존 및 증거기록 (증거가 필요한 부분에 한함)
(2) 추가 비상사태 발생 인자 차단
(3) 재해발생 상황별 대응
(4) 후속 사고예방 활동
(5) 현장 복구
5.3.4 사고 조사반
(1) 사고현장 기록 유지(사진, 동영상)
(2) 원인조사 및 재발방지 대책 수립
(3) 관계기관 섭외 및 정보수집
5.3.5 대외 홍보반
(1) 언론기관 섭외 및 통제
(2) 대외 발표자료 작성 배포
(3) 지역주민 홍보
(4) 본사 보고 및 연락창구 역할
5.3.6 일반지원반
사고발생 소속해당팀장 및 소속인원은 비상기획팀원으로 구성하며, 대비/지원반
및 방호복구반을 지원한다.
< 비상사태별 주요책임자별 업무처리 FLOW>
※상기 비상사태외 항목 유형 발생시 각 부서별 팀장간 협의 주요 책임바 지정 후 상기표에[ 기록
※ 특히, 외부 출입자가 예기치 못한 사고(실수)로 시설파손(누수,누유등)을 야기시켰을 경우
경비 또는 총무팀에 연락을 취하고 , 각 시설 책임자는 즉각 관련조치를 취한다.
5.4 비상사태 종료 및 결과보고
(1) 사고조사팀은 비상사태 원인조사 및 피해정도를 평가하여 대책위원회에 보고하고, 보고받은
대책위원회는 비상사태 복구과 완료되었을 경우 비상사태를 종료한다.
(2) 사고발생 팀장은 사고 재발방지를 위해 정밀분석 검토하여 비상사태 조치결과 및 재발방지
대책을 수립 보고하고 필요한 경우 조직 및 관련 규정 및 비상계획을 개정한다.
(사고조사반과 공동 작성 할 수 있음)
(3) 비상사태에 대한 내용은 재발방지를 위해 관련 임직원에게 원인 및 처리결과에 따라 교육을
실시하여야 한다.

[표]
종 류 | 장 소 | 책 임 자 | 처 리 절 차 | 비상사태 발효
주요설비 고장 | 제조 현장 | 생산기술팀 | 비상사태 발생시
대응 방안 참조
(A8101-01)
유틸리티 고장 | 제조 현장 | 생산기술팀
화재 발생시 | 전 공장 | 총무팀
기반시설 붕괴 | 전 공장 | 총무팀
공급자 공급중단 | 제조 현장 | 구매팀
천재지변 발생시 | 전 공장 | 총무팀
인원 부족 | 제조 현장 | 생산관리팀
사이버 공격 | 전 공장 | 총무팀
팬데믹(바이러스) | 전 공장 | 총무팀', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '6. 사후 예방관리', '6.1 총무팀장은 향후 발생할지도 모르는 사고나 비상사태를 미연에 방지하기 위하여 비상사태에
대한 교육/훈련을 실시하고 동종시설별로 특별점검을 실시하여 대책을 수립한다.
6.2 전 팀장은 팀내 발생가능한 비상사태에 대한 "가상 비상사태대책"을 수립 지속적인 교육
/ 훈련을 실시하여야 하며 가상비상사태대책에 포함될내용은 다음과 같다.
(1) 조직 / 책임

[표]
(2) 연락망 | (3) 형태별 조치방안 | (4) 조치 내역', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '7. 비상사태 훈련 및 교육', '(1) 해당 팀장은 시행 가능한 비상계획에 대해 유형별 년간 훈련계획을 1회이상 수립하여 총무팀장
에게 통보하여야 한다.
(2) 총무팀장은 비상사태 훈련에 대한 년간 계획을 수립 후 경영진에 보고 결재 승인을 받아야 한다
(3) 훈련은 년간계획에 의해 실시하며 훈련은 실제상황을 가정하여 실시한다.
(4) 해당 팀장은 훈련 및 교육결과를 "비상사태 훈련결과 보고서"에 작성하여 총무팀장에게
통보한다.
(5) 총무팀장은 각 사업부별 접수된 "비상사태 훈련결과 보고서"를 취합하여 경영진에 보고
결재 승인을 받아야 한다.
(6) 필요시 외부기관과 협의, 지원을 받아 훈련을 실시한다.
(7) 훈련 종료후 훈련내용의 개선 및 보완점은 가상 비상사태 대책서를 개정하고 다음
훈련시에 반영해야 하며, 해당부문의 예기치 않은 비상사태 발생시는 다음연도에
이를 대비시키기 위하여 훈련 및 교육을 실시해야 한다.
(8) 훈련시 총무팀장은 훈련장비 및 훈련에 대하여 적극 지원하여야 하며, 해당팀별
훈련결과에 따라 각 비상 대책서의 실효성을 확인하여야 한다.', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '8. 기록 및 보관', '본 규정의 이행에 따라 발생되는 기록은 『기록관리 규정』의 절차에 따라 보관,
관리되어야 한다.', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '9. 관련표준', '(1) 교육훈련 규정(F-1100)', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '10. 관련양식', '(1) 비상사태 발생시 대응방안(A8101-01)
(2) 비상사태 대비 훈련결과 보고서(A8101-02)
(3) 비상사태 대비 훈련 평가표(A8101-03)
(4) 비상사태 검토 보고서(A8101-04)', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-8101', '11. 부표', '(1) 대외기관 연락처
(2) 비상대책위 조직도
부표 1. 대외기관 연락처
부표 2. 비상대책위 조직도 : 비상사태 발생시 대응방안 내 조직도 참조', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-8101' AND sort_order = 11);

-- ── B-1100 (5p · REV.7 · 2025-06-25) 17섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'B-1100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '(서두)', '부적합품 관리 규정 · 문서번호 TPC - B - 1100 · 개정 REV.7 · 재·개정일 2025-06-25
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
6 | 2024년 5월 27일 | 12항 "수리 또는 재작업품의 처리" 내 "수리 또는 재작업 지침(작업표준서, 기준서등)을 작성하여 모든 재작업 공정에 게시"
항목 추가 개정
7 | 2025-06-25 | 4항. 책임과 권한 내 품질보증팀장의 책임과 권한에 대한 상세 및 부적합품 식별관리 기준 개정
주관부서 | 필라넥워터 사업부 품질보증팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 대 리 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김규윤 | 김상은 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25
작성 사업부 & 부서 & 작성자
작 성 자
기술연구소 품질보증팀 곽주섭
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 김권표
기술연구소 품질보증팀 김권표
필라넥워터 사업부 품질보증팀 손용수
필라넥워터 사업부 품질보증팀 손용수
필라넥워터 사업부 품질보증팀 김규윤
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25 | 2025-06-25', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '1. 적용범위', '이 규정은 당사 제품의 제조과정(자재수급,제조,검사,취급,보관)에서 발생된 부적합품 및
의심스러운 제품의 처리 및 관리방법에 대하여 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '2. 목적', '이 규정은 당사에서 생산되는 제품의 품질규격 또는 기술표준에 규정된 품질요건에
적합치 않는 부적합(품)을 식별, 격리, 조치, 문서화하여 부적합(품)이 부주의 또는 고의로
잘못 사용되는 것을 방지하는데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '3. 용어의 정의', '3.1 제품
본 규정에서의 제품은 부품, 재공품, 반제품, 완성품을 통칭하여 일겉는다.
3.2 부적합(품)
규정된 요건을 수행중이거나 완료된 상태에서 지정된 요구사항을 만족시키지 못하거나
못할것으로 예상되는 제품 및 기타 제반행위
3.3 의심스러운 제품
검사 결과가 명확히 구분되지 않은 제품, 부적합 계측기로 검사된 제품 및 규격은 만족
하나 규격의 상한치와 하한치에 가까워 시간의 경과에 의해 변화할 우려가 있는 제품을
말한다.
3.4 재작업(REWORK)
부적합품이 지정요구 사항에 만족되도록 규정된 요건의 작업절차를 다시 실시하는 행위
3.5 수정(REPAIR)
부적합요소의 교환 또는 수리하는 행위
3.6 선별
부적합품이 발견되었을 경우 해당로트나 동일 시간대에 생산된 제품을 검사하여
적합품만을 가려내는 행위
3.7 폐기
사용불가(파이프 폐기)한 상태로 만드는 것', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '4. 책임과 권한', '(1) 품질보증팀장은 부적합품에 대한 처리방법을 결정하고, 부적합사항의 시정을 해당팀에
지시할 책임과 권한이 있다.
(2) 품질보증팀장은 부적합품에 대한 선적중단, 생산 중단에 대하여 해당팀에 지시할 책임과
권한이 있다
(3) 품질보증팀장은 잠재적 부적합 파악 및 봉쇄에 대하여 해당팀에 지시할 책임과 권한이
있다.
(4) 생산관리팀장은 생산공정중에 발생하는 부적합품에 대해 조치할 책임이 있으며,
부적합품의 식별 및 분리를 위한 박스(BOX) 또는 장소를 준비하고 관리할 책임이 있다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '5. 제품부적합관리 공통사항', '5.1 일반사항
(1) 수입검사 부적합품은 업체로 반출함을 원칙으로 한다.
(2) 부적합품 처리결과 수정 또는 재작업된 제품은 반드시 재검사를 실시하여 합격된 후
사용하여야 한다.
(3) 품질보증팀장은 부적합제품의 처리 결과, 고객불만사항등 중요한 품질문제에 대한
제품이력을 관리하고 향후 부적합품 저감대책 수립, 신제품 개발시 보완 자료 및
검사원 교육자료로 활용한다.
5.2 식별
부적합품이 발생되면, 아래의 한가지 또는 그 이상의 방법으로 부적합품을 식별하여 오용을
방지해야 한다.
(1) 마킹(MARKING) (2) 꼬리표(TAG) (3) 스티커(STICKER) (4) 스템핑(STAMPING)
(5) 검사필증 (6) 보관장소에 보관 (7) 검사 및 시험기록
5.3 격리
(1) 구매담당은 입고된 부적합품이 업체로 즉시 반출이 이루어지지 않을 경우 지정된
부적합품 보관장소로 이동 격리시켜야 한다.
(2) 생산팀 작업자는 당일의 부적합품을 공정별 “작업일보”에 기록후 부적합품
보관장소로 격리시켜야 한다.', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '6. 수입검사 부적합품의 처리', '6.1 검사원은 부적합품이 발생되면 거래명세서에 불합격 스템핑하여 구매담당에게 통보하고
양품과 혼용되지 않도록 5.2항의 식별방법에 따라 식별한다.
※품질담당자는 공정순회검사시 격리 및 식별상태를 모니터링하고, 필요시 교육을 실시하여
누락없이 유지/관리 될 수 있도록 하여야 한다.
6.2 구매담당은 자재의 긴급성 여부를 확인하여 6.3항의 처리 방법중 한가지를 선택하여
처리한다.
6.3 수입검사 부적합품의 처리는 다음과 같다.
(1) 해당업체로 즉시 반출
(2) 협력업체의 요청시 선별 또는 수정등의 조치후, 재검사하여 사용한다.
(3) 특채 사용
6.4 특채할 경우는 구매담당이 “특별 의뢰서”를 작성하여 생산 및 품질보증팀의
협의를 거쳐 품질중역의 최종 승인으로 처리한다.
6.5 입고품이 중대 불량사항이거나 동일 불량이 지속적으로 발생되는 경우 『시정조치 규정』
의 절차에 따라 재발방지 대책을 요구한다.', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '7. 공정 및 완성품 부적합품의 처리', '7.1 자체 생산 부적합품
(1) 생산팀 작업자는 자주검사시 부적합품이 발생되면 즉시 수리가 가능한 경우는 수리하고,
즉시 처리가 불가능한 경우 5.2항의 식별방법에 따라 식별 후 격리시킨다.
(2) 작업자는 동일 불량이 다량 발생하는 경우 LOT가 혼입되지 않도록 5.2항의 식별방법에
따라 식별태그를 부착하여 현장관리자에게 보고하고, 현장관리자는 품질보증팀장에게
통보한다.
(3) 품질보증팀장은 관련팀과 협의하여 부적합품 대상 범위를 선정하고 "불량유출 봉쇄
작업표"를 작성하여 부적합품이 후공정 및 고객에게 유출되지 않도록 한 후 "부적합품
발생 보고서"로 귀책팀에 처리를 요청한다.
(4) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.
7.2 외주 입고 부적합품
(1) 작업자는 공정작업중 외주 입고품에서 불량이 발생된 경우 대상 LOT에 대해 "부적합품
식별표"를 부착하여 격리하고 현장관리자에게 보고한다.
(2) 현장관리자는 긴급 여부를 판단하여 긴급사항인 경우 선별 등 임시조치를 취하고 품질보증
팀장에게 구두로 통보한다.
(3) 품질보증팀장은 해당 협력업체에 유선으로 통보하여 선조치를 취하고, 부적합품 대상
범위를 선정하여 "불량유출 봉쇄 작업표"를 작성하고 부적합품이 후공정 및 고객에게
유출되지 않도록 대상 LOT에 대해 5.2항의 식별방법에 따라 식별태크를 부착한다.
(4) 품질보증팀장은 해당 외주업체에 "부적합품 발생 통보서"로 해당 협력업체에
부적합품에 대한 처리를 요청한다.
(5) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '8. 정기검사 및 신뢰성검사 부적합품의 처리', '(1) 품질보증팀장은 정기검사 및 신뢰성검사에서 부적합품이 발생되면 부적합품 대상범위를
선정하여 ''불량유출 봉쇄 작업표''를 작성하고 부적합품이 후공정 및 고객에게 유출되지
않도록 대상 LOT에 대해 5.2항의 식별방법에 따라 식별한다.
(2) 품질보증팀장은 해당팀에 ''부적합품 발생 통보서''로 부적합품에 대한 처리를 요청한다.
(3) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '9. 자재보관 및 취급상 발생된 부적합품의 처리', '(1) 자재관리팀장은 자재의 취급 및 보관중 부적합 사항이 발견되면 이를 식별(필요시
격리)한 후 품질보증팀장에게 제품 유효성 검토를 구두로 요청한다.
(2) 품질보증팀장은 대상 LOT를 확인하여 부적합품이 발생되면, LOT를 추적하여 ''불량유출
봉쇄 작업표''를 작성하고 해당에 ''부적합품 발생 통보서''로 부적합품에 대한 처리를
요청한다.
(3) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '10. 제품보관 및 취급상 발생된 부적합품의 처리', '(1) 영업팀장은 완성품의 취급 및 보관중 부적합 사항이 발견되면 이를 식별(필요시
격리)한 후 품질보증팀장에게 제품 유효성 검토를 구두로 요청한다.
(2) 품질보증팀장은 대상 LOT를 확인하여 부적합품이 발생되면, LOT를 추적하여 ''불량유출
봉쇄 작업표''를 작성하고 해당팀에 ''부적합품 발생 통보서''로 부적합품에 대한 처리를
요청한다.
(3) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '11. 부적합계측기에 의해 검사 및 시험한 제품의 유효성 검토 및 처리', '(1) 품질보증팀장은 계측기의 검.교정 과정의 초기검사에서 계측기 부적합(검․교정기간
이 경과한 계측기 포함)이 발견된 경우 해당 부적합 계측기로 검사한 제품을 추적하여
''불량유출 봉쇄 작업표''를 작성하고, 해당팀에 ''부적합품 발생 통보서''로 부적합품에
대한 처리를 요청한다.
(2) 부적합품 발생 통보서에 의한 처리 절차는 13항의 절차에 따른다.
(3) 품질보증팀장은 부적합 계측기는 수리 또는 폐기처리하고, 양호한 계측기를 신규
지급한다.', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 11);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '12. 수리 또는 재작업품의 처리', '(1) 현장관리자는 사내 부적합품 또는 고객반송 부적합품에 대해 수리 또는 재작업을 실시할
경우 수리 또는 재작업 지침(작업표준서, 기준서등)을 작성하여 모든 재작업 공정에 게시
하고, 수리 또는 재작업 결과는 "수리 작업 일지"에 기록한다.
(2) 현장책임자는 수리 또는 재작업품에 대해 품질보증담당에게 재검사를 의뢰하고,
품질보증담당은 의뢰받은 수리 또는 재작업품에 검사를 실시하여 검사 결과를
''수리 작업 일지''에 기록한다.
(3) 사내,외 부적합품 처리 결과 폐기로 판정된 경우 품질보증담당은 폐기 현황을 집계하고
"폐기보고서"에 사유을 기록하여 대표이사의 승인을 받아 폐기한다.', 12
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 12);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '13. 부적합품 발생 통보서에 의한 부적합품 처리 철차', '13.1 부적합품 발생 통보서의 발행
(1) ''부적합품 발생 통보서''의 발행은 품질보증팀장이 한다.
(2) 품질보증팀장은 “부적합품 발생 통보서” 발행시 ''부적합품 통보서 관리대장''에
기록후 배포하며, 이후의 진행관리를 해야한다.
13.2 부적합품 발생 통보서 NO 부여방법
(1)(2) : 연도구분(끝두자리)
(3)(4) : 월(두자리) (예:1월인 경우 → 01)
(4)(5)(6) : 일련번호
13.3 조치요구사항 검토
품질보증팀장은 ''부적합품 발생 통보서''의 내용을 검토하여 다음의 조치 방안중
하나를 결정한다.
(1) 재작업(REWORK)
(2) 수정(REPAIR)
(3) 특채검토(가능,불가능)
(4) 선별
(5) 반송
(6) 폐기
13.4 조치이행
(1) 조치팀 팀장은 ''부적합품 발생 통보서''의 조치요구사항을 검토하여 이행하여야
하며, 조치 요구서 사항에 이의가 있을때는 품질보증팀장과 협의하여 조정한다.
(2) 조치 팀장은 접수한 부적합보고서에 조치내용 또는 조치예정 내용을 승인한후 복사본을
보관, 원본을 발행팀으로 송부한다.
(3) 구매담당은 외주자재의 부적합사항에 대해 조치할 책임이 있다.
(4) 수정(REPAIR) 및 재작업(REWORK)된 제품은 검사기준에 따라 재검사 한다.
(5) 조치방안이 특채가능하여 특채의뢰 되었을 경우 관련팀과 협의하여 처리한다.
13.5 최종확인
품질보증팀장은 조치방안 이행결과를 확인하여 이행결과가 만족시 종결 처리한다.

[표]
(1) | (2) | (3) | (4) | (5) | (6) | (7)', 13
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 13);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '14. 부적합품의 고객통보', '품질보증팀장은 외관에 대한 재작업을 실시할 경우나 기타 계약에 요구된 경우
규정된 요구사항에 적합하지 않은 제품의 사용 또는 수정시 사전에 고객이나 그
대리인에게 보고, 승인후 사용한다.', 14
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 14);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '15. 사후관리', '15.1 재발 방지 대책
(1) 해당 팀장은 해당 부적합품의 재발 방지 대책 실시 일정 계획을 수립하여 대책을
실시한다.
(2) 품질보증팀장은 반기별 1회 이상 ''부적합품 발생 통보서'', 작업일보, ''폐기보고서"를 취합,
집계하여 분석하며, 우선 순위를 부여하여 감소계획을 수립하고 진도를 관리한다.
15.2 효과 파악 및 표준화
생산팀장 및 품질보증팀장은 재발 방지 효과를 파악하고 필요시 표준화 한다.', 15
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 15);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '16.관련표준', '(1) 검사업무규정 (L-2100)
(3) 완성품 관리 규정 (M-3100)
(5) 계측기 관리 규정 (L-3100)

[표]
(2) 자재관리 규정 (K-2100)
(4) 시정조치 규정 (B-2100)', 16
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 16);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-1100', '17. 관련양식', '(1) 부적합품 발생 통보서 (B1100-01)
(2) 부적합품 발생 통보서 관리대장 (B1100-02)
(3) 특채 의뢰서 (B1100-03)
(4) 수리 작업 일지 (B1100-04)
(5) 불량유출 봉쇄 작업표 (B1100-05)
(6) 폐기보고서(B1100-06)
(7) 품질문제 발생 신속 대응 계통도 (B1100-07) - 공정 게시용
(8) 부적합품 처리 기준 (B1100-08) - 공정 게시용
(9) 특채의뢰 관리대장 (B1100-09)
(10) 폐기보고 관리대장 (B1100-10)
(11) 부적합 보관장 관리 대장(B1100-11)', 17
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-1100' AND sort_order = 17);

-- ── B-2100 (5p · REV.6 · 2025-08-18) 7섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'B-2100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '(서두)', '시정조치 규정 · 문서번호 TPC - B - 2100 · 개정 REV.6 · 재·개정일 2025-08-18
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
6 | 2025-08-18 | 시정조치 활동중에서 재발 방지를 위해 개정해야 될 관련 문서의 종류에 대한 명확화 개정
주관부서 | 쇼바용접 사업부 품질보증팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 차 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이백범 | 김상은 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2025-08-18 | 2025-08-18 | 2025-08-18 | 2025-08-18
작성 사업부 & 부서 & 작성자
작 성 자
기술연구소 품질보증팀 곽주섭
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 김권표
기술연구소 품질보증팀 김권표
필라넥워터 사업부 품질보증팀 손용수
쇼바용접사업부 품질보증팀 이백범
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 필라넥 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-08-18 | 2025-08-18 | 2025-08-18 | 2025-08-18 | 2025-08-18 | 2025-08-18 | 2025-08-18', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '1. 적용범위', '이 규정은 당사의 원부자재, 반제품, 완제품의 부적합, 공정트러블, 고객불만, 납기
미준수, 업무절차 불합리 등에 대한 시정/예방조치 절차에 대하여 규정한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '2. 목 적', '업무/작업중 발생/발견한 부적합에 대한 조사와 개선으로 재발이 방지되도록 함에 목적
이 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '3. 업무 절차', '팀별 발생된 시정조치 업무의 주관은 각 팀의 팀장이 된다.
↓
↓
↓
↓
↓
↓
↓
4.1 시정 및 예방조치 대상
시정 및 예방조치는 현재의 부각된 부적합 원인이나 잠재적인 부적합을 제거하기 위한
대상이다.
4.1.1 시정조치의 대상
- 그대로둘 경우 불량
발생 우려가 있는 경우
- 지속적 불량(3회이상)
4.2 시정조치 필요성 검토
주관팀장은 다음사항을 고려하여 시정 및 예방조치 필요성 여부를 검토하여야 한다.
(1) 문제의 크기와 심각성 및 시급성
(2) 기술적 난이도
(3) 소요예산, 인력 및 자원
4.3 시정조치의 요구
(1) 시정조치가 필요하다고 판단된 주관팀은 조치내용에 대한 책임구분을 명확히 파악한다.
책임구분이 불명확 할 경우는 관련팀을 소집하여 대책을 수립한다.
(2) 고객의 Complain 사항중 제품 품질문제에 관련사항은 품질보증팀에서, 그외의 사안
은 영업팀에서 주관팀이 된다.
(3) 공정 Trouble은 품질보증팀 또는 생산팀이 주관팀이 된다.
(4) 부품 및 공정 시정요구시는 “부적합품 발생통보서”를 사용하고 그외의 경우는
“(시정․예방)조치 요구서” 또는 주관팀이 문서로 조치팀에 통보한다.
(5) 주관팀은 시정조치를 요구할 경우 회신 요구일을 지정하여 통보하며, 조치팀은
시정조치 요구일 까지 제출하여야 한다.
(6) 시정조치시 부서 자체적으로 해결이 어려운 사항인 경우 부서 발의로 대표이사의
승인을 받아 부표1 의 절차에 따라 TF팀을 구성하여 운영한다.
4.4 원인조사 및 대책수립
조치팀은 시정조치요구대상에 대한 근본원인을 규명하고, 규명된 원인을 해결하기
위해 문제의 크기와 당면한 위험에 상응하는 정도로 적절한 실수방지 방법을 사용하여
대책을 수립하고 추진하여야 하며, 수립된 대책은 해당 요구서 또는 보고서의 대책란에
기재하여 주관팀에 송부하여야 한다.
(1) 부적합 내용
(2) 원인분석 결과
(3) 시정조치 내용
(4) 담당 및 실시시기
4.5 대책 검토
(1) 주관팀은 시정조치가 요구일까지 회신이 없는 경우 이 사실을 해당팀에 통보하고
주관팀은 매월 월간 업무보고시 대표이사에게 보고한다.
(2) 시정조치 내용을 접수한 주관팀은 시정조치 내용을 검토하고 불충분한 경우는
관련팀에 재대책 수립을 요구한다.
4.6 시정조치 실시
조치팀은 시정조치 결정사항을 지체없이 실시하여야 한다.
4.7 결과 확인
(1) 주관팀은 조치팀이 시정/예방조치 결정사항을 실시하고 있는가를 확인하고 그 결과를
“(시정․예방)조치 요구서” 또는 “부적합품 발생 통보서”에 기록하고 필요한 경우 취해진
시정/예방조치와 실행한 관리방법을 다른 유사한 공정 및 제품에 적용될 수 있도록 한다.
(2) 외주품의 경우 출장확인 또는 정기 공정감사시 확인할 수 있으며, 이 경우 결과는
해당 요구서, 보고서 또는 대책서의 완료 확인란에 기록한다.
(3) 주관팀은 대책실시 후 3개월간 월1회 유효성을 평가하여 효과가 없는 경우 재 대책수립 및
실행을 요구하여야하며, 효과 검증이 완료 되었을시 사안을 종결하여야 한다.
(4) 대책을 실시하였으나 소요예산 또는 기술적 사유로 근본해결이 불가능한 경우에는
대표이사의 승인으로 해당 사안을 종결할 수 있다.
4.8 사후관리 및 표준화
(1) 주관팀은 시정조치의 진행이 관리되도록 “시정 및 예방조치 등록대장”을 작성하여 등록
관리하여야 한다.
(2) 주관팀은 시정조치의 결과로 업무수행절차나 방법에 변경이 발생된 경우는 이를 품질팀에
통보하여 FMEA, 관리계획서, 작업표준서에 반영이 될수 있도록 하고, 시정 / 예방조치 현황을
정리하여 경영검토 회의시 보고하여야 한다.

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 주관팀장 | 부적합 대상 확인 | (←) 품질정보
(●) 주관팀장 | 시정조치 필요성 검토
(●) 주관팀장
 (→) 조치팀장 | 시정조치 요구 | (→) 시정/예방조치요구서
 부적합품발생통보서
(●) 조치팀장 | 원인조사 및 대책수립
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 주관팀장 | 대책 검토
(●) 조치팀장 | 대책 실시
(●) 주관팀장 | 효과 확인
(●) 해당팀장 | 표 준 화 | (→) FMEA, 관리계획서
 , 작업표준서
시정조치 대상 | 주관팀 | 조치팀 | 조치기준 | 사용 양식
수입검사 불합격 | 품질보증팀 | 외주처 | - 중대불량 | 부적합품
발생통보서
생산중 자재불량 | 품질보증팀 | 외주처 | 이 발생하고 있는 경우
자주검사 불량 | 생산팀 | 원인제공팀 | - 자체 개선활동 실시
시정조치 대상 | 주관팀 | 조치팀 | 조치기준 | 사용 양식
공정/제품심사 불량 | 품질보증팀 | 원인제공팀 | 필연적인 경우 제외 | 부적합품
발생통보서
A/S불량, OEM 반송 | 품질보증팀 | 원인제공팀 | 당사 귀책 부분
고객 Complaint | 품질보증팀 | 원인제공팀 | 당사 귀책 부분
외주의 납기 미준수 | 구매팀/생산팀 | 협력업체 | 외주 귀책 부분 | 공 문
대고객 납기 미준수 | 영업팀 | 원인제공팀 | 당사 귀책 부분 | 시정/예방조치
요구서
업무절차 불합리 및
기타 시정조치 필요시 | 모든팀 | 해당팀 | 규정 제/개정 필요시
내부감사시 
지적사항 | 품질보증팀 | 원인제공팀 | 권고사항을 제외한 
부적합 사항
경영검토 결과 
지적사항 | 품질보증팀 | 해당팀 | 부적합 사항', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '6. 관련 양식', '(1) (시정․예방)조치 요구서 (B2100-01)
(2) 시정 및 예방조치 등록대장(B2100-02)
(3) 개선 대책서 (B2100-03)
(4) 장기 테마 개선 추진 일정 관리표 (B2100-04)
(5) 일일 품질(신속대응 )회의 즉실천 항목 일정 관리표 (B2100-05)
(6) 금형 진행사항 점검 (B2100-06)
(7) 설비점검 진행사항 (B2100-07)
(8) 4M변경 내역 및 적용일자 관리 (B2100-08)
(9) 공정개선 T/O 진행사항 점검 (B2100-09)
(10) 용접 개선 T/O 진행사항 점검 (B2100-10)
(11) 고객사 불량 유효성 검증 관리대장 (B2100-11)
(12) 유효성 점검 체크시트 (B2100-12)', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '7. 부표', '(1) TFT 운영 요령
부표1, TFT 운영 요령', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '[부표1, TFT 운영 요령] 1. TF팀의 구성', '(1) 회사내에 긴급 특정업무가 발생 하였거나, 비일상적인 과제의 해결 및 잠재적 부적합의
예방조치를 위하여 특별조직의 가동이 필요한 경우에는 TF팀을 구성한다.
(2) TF팀은 대표이사가 팀의 구성을 지시한다.
(3) TF팀장은 과업수행을 위한 계획수립 및 결과보고의 책임과 권한이 있으며, 팀 운영을
위한 예산을 회사에 요구할 수 있다.', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2100', '[부표1, TFT 운영 요령] 2. TF팀의 활동', 'TF팀의 활동은 다음의 단계에 준하여 시행한다.
팀조직 및 업무분담
활동계획서 작성
포함한 계획서를 작성하여 승인권자의 승인을
받는다.(단순한 과제일 경우 생략 가능)
현상파악 및 조사
대안수립 및 품의
품의한다.
실시 및 결과확인
효과가 없는 경우 원인조사 부터 재실시 한다.
YES
결과보고 및 표준화
하고, 필요시 관련표준의 제/개정을 실시한다.
팀 해 체
필요시 포상을 실시한다.

[표]
팀원을 확정하고 요원별 업무분야를 정한다.
추진단계, 개략일정, 관련인원, 주요내용을
NO | 과제에 관련된 구체사항을 파악한다.
목적달성을 위한 대책방안을 수립하고 승인권자에게
TF팀장은 대책을 실시하고 효과를 확인한다.
TF팀장은 팀활동의 과정 및 결과를 승인권자에게 보고
대표이사는 팀활동을 검토하고 팀해체를 승인하며,', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2100' AND sort_order = 7);

-- ── B-2200 (5p · REV.5 · 2023-05-01) 8섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'B-2200';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '(서두)', '지속적 개선업무 규정 · 문서번호 TPC - B - 2200 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 필라넥워터 사업부 품질보증팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 과 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 손용수 | 김상은 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
기술연구소 품질보증팀 곽주섭
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 김권표
기술연구소 품질보증팀 김권표
필라넥워터 사업부 품질보증팀 손용수
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '1. 적용범위', '회사의 제품 및 시스템 관련 업무의 변동과 낭비감소를 통한 질적향상을 도모하기 위한
지속적 개선 업무에 대하여 규정한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '2. 목 적', '끊임없는 개선과 혁신을 통하여 고객을 만족시키고 회사의 발전을 도모하기
위함이다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '3. 업무 절차', '개선업무의 주관은 각 팀의 팀장이 된다.
↓
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 주관팀장 | 문제점 도출
(●) 주관팀장 | 개선 필요성 판단
(●) 주관팀장
 (→) 조치팀장 | 개선테마 설정 및 상정 | (→) 시정/예방조치요구서
(●) 조치팀장 | 테마 및 개선 팀 확정
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 주관팀장 | 개 선 실 시
(●) 조치팀장 | 효과확인 및 결과보고 | (●) 경영검토규정
(●) 주관팀장 | 표준 제/개정 (필요시)
(●) 해당팀장 | 기 록 관 리', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '5. 세부절차', '5.1 문제점의 도출
5.1.1 기록 분석
각 팀장은 아래와 같이 기록분석을 실시하고, 그 결과 개선을 필요로 하는
문제점을 도출한다. 단, 분석 대상은 아래 항목에 국한되지 않으며 각 팀에서
개선을 필요로 하는 항목은 모두 해당될 수 있다.
(결품, 수량 및 사양 착오)
과다재고(자재, 제품)
설비고장
생산성
부적합 발생보고
중요한 품질문제
고객품질불만
공정능력 평가
제품/공정/프로세스/안전/환경
/리스크 분석 결과 경감/완화
하기로 결정한 조치
5.1.2 개선테마 도출
(1) 각 팀장은 업무 수행에 따른 리스크 분석 결과와 매월초 전월 해당 성과를 파악하고
그 결과의 구체적 조사 및 해석을 통하여 정상상태(목표치)를 벗어난 사항이나 긴급 개선을
필요로 하는 문제점 등을 테마로 도출한다. 해당시 타팀의 요청사항 또는 팀원의 제안 등을
통하여 개선테마로 도출한다.
(2) 분기 또는 반기에 해당되는 사항은 해당 분기/반기 직후에 성과를 파악한다.
(3) 5.1.1 / 5.1.2 (1) (2)항까지의 분석에도 불구하고 개선 대상이 없을 수 있으나,
최소한 기록분석을 하였다는 증거를 유지하여야 한다.
5.2 개선실시
5.2.1 개선테마 설정
(1) 해당팀장은 추출된 개선 과제에 대하여 기대효과, 해결가능성, 시급성, 중요도
등을 토대로 개선 추진 필요성을 검토한다.
(2) 해당팀장은 개선항목이 타팀으로 인하여 발생된 문제에 대해서는 “(시정․예방)조치
요구서”를 작성하여 조치팀에 통보한다.
5.2.2 개선실시
(1) 개선 활동은 각 팀장이 주관이 되어 시행하여야 하며, 관련팀의 협조를 받을 수
있다.
(2) 설비, 치공구 등의 신규 제작이나 변경 또는 그 외의 사항으로 예산이 필요한 경우
대표이사의 승인으로 예산을 확보한다.
(3) 개선추진을 위하여 TFT 구성이 필요하다고 판단되는 경우에는 대표이사에게 보고
하여 TFT를 구성한다. TFT운영 요령은 "부표1"과 같다.
5.2.3 개선시 활용되는 기법
각 팀장은 효과적인 지속적 개선 실행을 위해 아래의 필요한 기법에 대해 사내,외
교육을 통하여 실시하고 활용하여야 한다.
(1) 관리도
(2) 실험 계획법
(3) 제한 이론
(4) 종합적 장비 효과성
(5) PPM 분석
(6) 가치 분석
(7) 벤치 마킹
(8) 동작 인간 공학 분석
(9) 실수 방지방법론
5.3 개선결과 확인 및 보고
(1) 해당팀장은 개선완료후 실시 결과에 효과성을 확인하고 개선진행 및 조치 결과를 정리
하여 대표이사에게 보고하여야 한다.
(2) 해당팀장은 반기별로 경영검토회의시 개선 항목과 개선진행 항목을 보고하여야 한다.
5.4 표준화
각 팀장은 개선 과정 또는 결과상 나타난 표준의 제/개정 필요항목에 대하여 표준
제정 또는 개정을 추진한다.
5.5 기록관리
해당 팀장은 개선실시 결과를 품질기록으로 관리한다.

[표]
팀 명 | 분석 대상 자료 | 분석 방법 (선택) | 주기
영 업 | 고객 불만족 | 고객별, 품목별 분석 | 반기
팀 명 | 분석 대상 자료 | 분석 방법 (선택) | 주기
생산팀
생산기술팀 | 설비효율 | 라인별, 공정별, 품목별,
내용별, 설비별 | 반기
품질보증팀 | 수입, 공정, 최종검사 결과 | 품목별, 업체별, 
원인별, 유형별

(발생수량, 발생빈도) | 반기
부적합 사항에 대해 시정조치 후
유사 제품 및 업무에 확산 적용이
필요할 경우 | 건별 | 발생시
공 통 | 업무 수행중 예상되는 문제점을
사전에 방지하고자 하는 경우 | 대상별 | 반기', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '6. 관련표준', '(1) 시정조치 운영규정(B-1200)
(2) 경영검토규정(A-3100)', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '7. 부표', '(1) TF팀 운영 요령
부표1, TFT 운영 요령', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '[부표1, TFT 운영 요령] 1. TF팀의 구성', '(1) 회사내에 긴급 특정업무가 발생 하였거나, 비일상적인 과제의 해결 및 잠재적 부적합의
예방조치를 위하여 특별조직의 가동이 필요한 경우에는 TF팀을 구성한다.
(2) TF팀은 대표이사가 팀의 구성을 지시한다.
(3) TF팀장은 과업수행을 위한 계획수립 및 결과보고의 책임과 권한이 있으며, 팀 운영을
위한 예산을 회사에 요구할 수 있다.', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2200', '[부표1, TFT 운영 요령] 2. TF팀의 활동', 'TF팀의 활동은 다음의 단계에 준하여 시행한다.
팀조직 및 업무분담
활동계획서 작성
포함한 계획서를 작성하여 승인권자의 승인을
받는다.(단순한 과제일 경우 생략 가능)
현상파악 및 조사
대안수립 및 품의
품의한다.
실시 및 결과확인
효과가 없는 경우 원인조사 부터 재실시 한다.
YES
결과보고 및 표준화
하고, 필요시 관련표준의 제/개정을 실시한다.
팀 해 체
필요시 포상을 실시한다.

[표]
팀원을 확정하고 요원별 업무분야를 정한다.
추진단계, 개략일정, 관련인원, 주요내용을
NO | 과제에 관련된 구체사항을 파악한다.
목적달성을 위한 대책방안을 수립하고 승인권자에게
TF팀장은 대책을 실시하고 효과를 확인한다.
TF팀장은 팀활동의 과정 및 결과를 승인권자에게 보고
대표이사는 팀활동을 검토하고 팀해체를 승인하며,', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2200' AND sort_order = 8);

-- ── B-2300 (9p · REV.1 · 2025-08-01) 14섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'B-2300';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '(서두)', '정성품질 운영 지침 · 문서번호 TPC - B - 2300 · 개정 REV.1 · 재·개정일 2025-08-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2024-07-26 | 자사의 품질개선과 고객요구 만족을 위한 최초 제정
1 | 2025년 08월 01일 | 정성품질 점검 체크시트 개정 (HKMC 『협력사 현장 작업자 정성작업 유도방안』 점검 체크시트 인용)
주관부서 | 필라넥워터 사업부 품질보증팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 대 리 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김규윤 | 김상은 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2025-08-01 | 2025-08-01 | 2025-08-01 | 2025-08-01
작성 사업부 & 부서 & 작성자
작 성 자
필라넥워터 사업부 품질보증팀 손용수
필라넥워터 사업부 품질보증팀 김규윤
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-08-01 | 2025-08-01 | 2025-08-01 | 2025-08-01 | 2025-08-01 | 2025-08-01 | 2025-08-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '1. 적용범위', '당사에서 근무하는 모든 작업자 및 작업 환경에 대하여 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '2. 목 적', '현장 작업자의 품질 마인드 확립 및 향상에 그 목적이 있다', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '3. 용어 정의', '3.1 정성품질
온갖 힘을 다하려는 참되고 성실한 마음. 정성을 다하는 품질
3.2 C.F.T
상호기능팀 (Cross Functional Team)', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '4. 책임과 권한', '4.1 최고 경영자
정성품질 활동에 대한 총괄적인 책임과 권한이 있으며, 정성품질 활동이 운용될 수 있음을 보장
하여야 한다.
4.2 관리자
(1) 수평전개 교육의 실시에 대한 책임이 있다.
(2) 품질문제 발생시 개선활동 계획수립, 실시, 유지관리 감독에 책임이 있다.
(3) 고객사 관련 협업 발생시 당사를 대신하여 참여할 책임이 있다.
4.3 품질팀장
(1) 관리자 선정에 대한 책임이 있다.
(2) 품질문제 발생시 개선활동 참여하며 품질 부분 개선과 유지 관리에 책임이 있다.
(3) 관리자 부재시 대신하여 그 역할을 수행한다.
4.4 해당팀장
품질문제 발생시 개선활동에 참여하며 해당 부분 개선과 유지 관리에 책임이 있다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '5. 관리절차', '↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 품질팀장 | 정성품질 관리자 선정
(●) 정성품질 관리자 | CFT 조직 구성 | CFT 조직도
(●) 정성품질 관리자
 (→) CFT | 정성품질 대상파악 | 정성품질 순회점검 시트
정성품질 취합 대장
(●) 정성품질 관리자
 (→) CFT | 개선 계획 수립 | 문제점 및 개선 제안서
(●) 정성품질 관리자
 (→) CFT | 개선 활동 전개 | 정성품질 개선
타당성 검토서
(●) 정성품질 관리자
 (→) CFT | 표준 제/개정 (필요시)
및 유지 관리 | 유효성 평가 보고서
경영검토 보고서
(●) 품질팀장 | 기 록 관 리', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '6. 세부절차', '6.1 관리자 선정
(1) 품질팀장은 관리자 중 근무 년수, 업무 숙련도 등을 고려하여 정성품질 담당 관리자를 선정
하여 최고경영자에 보고한다.
(2) 관리자가 선정되면 필요시 고객사 담당자에 관리자의 정보를 공유한다.
6.2 정성품질 대상파악 (현상 파악)
(1) 관리자는 작업자 부주의 또는 실수로 인해 발생된 품질 문제 및 고객 부적합을 확인하여
분석을 실시하며 분석 및 개선 활동을 위하여 CFT를 조직하여 운영할 수 있다
(2) 분석은 작업자 인터뷰, 현상 재조사, 부적합품 분석 등을 통하여 상세원인을 파악한다.
(3) 명확한 원인조사를 위해 작업자와 인터뷰 하는 과정이 해당 인원의 잘못을 추궁하는 자리가
되어서는 안되며, 작업자가 편안함을 느낄 수 있는 장소에서 티타임을 하는 등 자연스러운
분위기를 유도하여 원인을 명확하게 파악하는 수단이어야 한다.
(3) 인터뷰, 현상 재조사 등을 통해 파악된 내용을 바탕으로 인적요인 및 원인유형을 분류한다
6.3 개선 계획 수립
(1) 파악된 인적요인 및 원인유형을 바탕으로 대책 방안을 수립하고 해당 대책 방안별 개선계획
수립 및 담당을 정한다. (부표 1 "휴면에러 원인 유형 및 대책방안" 예시 참조)
(2) 관리자는 개선을 진행하기에 앞서 작업자 교육, 체육대회, 다과회, 현수막, 포상제 등을 통해
개선하고자 하는 분위기 형성안을 제안하고 대표이사의 승인을 득한 후 실시한다.
6.4 개선 활동 전개
(1) 개선 계획 담당은 해당 항목별 개선 활동을 실시하고 필요시 작업자 교육 및 벤치마킹 등을
통해 해결할 수 있도록 한다
(2) 개선 실시 중 발생되는 문제점은 해당 팀장과 협의하여 진행한다.
(3) 개선 제안 내용에 대한 포상은 "A-6100 제안관리 규정"에 따른다
6.5 표준화 및 유지관리
(1) 개선이 완료되면 각 개선 담당자는 개선 결과에 대해 관련 표준의 제,개정을 추진한다.
(2) 개선 완료 후 일정기간 동안 개선사항에 대한 유효성, 안정화 여부, 경향 등을 파악하여
만족스럽다고 판단될 경우 개선 활동에 대하여 최고경영자에게 보고한다.
(3) 관리자는 개선된 사항에 대해서 지속적으로 관찰하며 문제점으로 발전될 수 있는 부분이
없는지에 대해 꾸준히 확인하여야 한다.
(4) 해당 개선된 사항은 경영검토시 보고되어야 한다.', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '7. 관련표준', '(1) 경영검토 규정 (A-2200)
(2) 시정조치 규정 (B-2100)
(3) 지속적 개선업무 (B-2200)', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '8. 관련양식', '(1)정성품질 CFT 업무분장 (B2300-1)
(2)정성품질 취합 대장 (B2300-2)
(3)정성품질 점검 체크시트(B2300-3)
(4)문제점 및 개선 제안서(B2300-4)
(5)정성품질 개선 타당성 검토(B2300-5)
(6)유효성 평가 보고서(B2300-6)
(7)인라인 공정불량 사례 시트(B2300-7)', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '9. 부표', '(1) 휴먼에러 원인유형 및 대책방안 예시', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '10. 동영상 교육 사이트', '(1) https://www.youtube.com/watch?v=yc312G4lfJY&list=PLC3D9OM4y9gR4opTH30Bchn8-X---1OC_
부표1, 휴먼에러 원인유형 및 대책방안 예시', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '[부표1, 휴먼에러 원인유형 및 대책방안 예시] 1. 작업환경', '1.1 의사소통, 팀워크 부족
(1) 인적요인
→ 잘못된 기준
→ 잘못된 의사소통
→ 불안정한 직장내 인간관계
→ 부적합한 서류작업
(2) 세부내용
→ 작업관련 지식과 의견은 명확해야 하며 오해의 소지가 없어야 함
→ 주/야간 업무 교대 시 업무인수인계가 철저해야 함
→ 전 단계에서 완료되지 않은 업무에 대해서는 반드시 정보가 전달 되어야 함
→ 외국인 작업자가 최소한의 의사소통이 가능한 방법 제공 필요
→ 여러 작업자가 단일의 업무를 수행하기 위해서는 작업자 간의 팀워크가 중요함
(3) 대책방안
→ 완료된 일과 해야할 일에 대한 명확한 전달을 위해 문서화 된 업무 전달 필요
(이상상황 정보 전달 대장 이용 업무 인수인계 내용 기록 및 O/P 서명)
→ 소속감을 느낄 수 있도록 품목별/라인별 그룹핑하여 교육이나 단체활동을 실시하고 회사
차원의 인센티브 부여
→ 외국인 작업자의 현지어로 작성된 업무표준 및 양식 제공
→ 외국인 작업자를 위한 자료는 그림/사진/동영상 등으로 직관적인 전달 필요
→ 팀원간 유대 관계 형성 및 원활한 업무 협조를 위해 정기회의로 업무 공유 및 업무량 조정
→ 의사소통에 대한 교육/세미나 참석 기회 제공
→ 품질 문제 발생 시 신속한 전파 교육 실시
→ 후공정작업 시 전공정 문제점을 상호 정보 전달 필요
1.2 작업 혼동, 집중력 저하
(1) 인적요인
→ 부적절한 작업환경(외부환경 요인)
(2) 세부내용
→ 작업 혼동 및 집중력 저하는 정신적/육체적 자연적인 현상임
→ 작업환경은 작업 혼동 및 집중력 저하 현상에 많은 영향을 미침
→ 작업자의 조직/개인적인 문제는 작업 효율을 저하시킴
(3) 대책방안
→ 작업장 주위 정리정돈(공구 및 SUB부품 등)을 통한 작업 혼동 방지
→ 작업 셋팅에 대한 점검항목 설정하여, 시업(복귀) 시 셋팅 상태 확인(재확인) 필요
→ 지속적인 작업자 면담 프로그램 운영 필요
→ 작업 내용 변경 시 변경 내용을 문서보다는 시각적으로 표기하여 작업오류 방지
→ 휴게시간 준수, 좌/우 공정 로테이션
→ 현장내 관리자들의 부적절한 행동통제(작업자 옆 전화통화, 복장 미흡, 작업공간 침범 등)
→ 작업자 중심 조도 측정구역 선정 및 조도 추가 확보 실시
(LED 조명으로 교체, 이동식 조명 비치 등)
1.3 자기표현 부족, 침묵
(1) 인적요인
→ 잘못된 의사소통
(2) 세부내용
→ 자기주장은 자신의 긍정적/생산적인 감정, 의견, 요구사항을 표현하는 것으로 공격적인
행동이나 주장과는 다름
→ 작업자 본인의 주장을 명확하게 얘기하지 않는 경우 품질문제 유발 및 안전사고 초래
(3) 대책방안
→ 작업자 제안제도 운영(우수제안 포상 포함) 필요
→ 양방향 토론 및 회의문화 정착 (일방적인 업무지시성 조회 및 회의는 지양)
→ 무기명(비밀) 신고제도 운영 필요
→ 부서내 멘토링 제도 실시
→ 자진신고 시 제재 면제 등 긍정적인 방향의 보상 제시', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 11);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '[부표1, 휴먼에러 원인유형 및 대책방안 예시] 2. 작업실행', '2.1 안일함, 인지력 저하
(1) 인적요인
→ 지루한 반복작업
→ 직무 불만족
→ 열악한 교육훈련
→ 부적합한 서류작업
(2) 세부내용
→ 동일한 작업 지속시 익숙함으로 인해 안일함/자만심 및 인지력 저하 발생 가능함
→ 검사 관련하여 문제없는 상태가 지속되는 항목의 경우 작업자가 임의로 검사를 소홀히
하거나 미실시할 가능성이 있음
→ 자신의 행동이 어떤 의미를 갖는지를 알지 못하면 그로 인한 결과도 인지하지 못함
(3) 대책방안
→ 중요 공정/검사 항목은 이중확인 절차 운영 필요
→ 특정 공정에 장기간 근무한 작업자는 정기적인 순환 배치가 필요함
→ 완벽하게 확인되기 전 작업일보 등 서명 금지
→ 작업자가 생산하는 부품의 기능 및 품질 중요성에 대한 교육 필요(작업 중요성 인식)
→ 주기적인 작업자 면담을 통해 순환근무, 보직 변경 등 검토 필요
→ 작업자 호칭 변경 (작업자 → 공정 책임자)하여 생산품에 대한 책임감 부여
2.2 지식부족
(1) 인적요인
→ 열악한 교육훈련
→ 부적합한 서류작업
→ 업무능력에 대한 잘못된 평가방법
(2) 세부내용
→ 생산공정에 대한 지식부족으로 불량품 및 필드 클레임 발생 가능
→ 작업자는 최신의 정보가 적용된 표준을 숙지하고 사양별 작업특성의 차이를 인지해야 함
→ 공정 문제 발생시 반드시 현장 관리자의 도움을 받아야 함 (작업지연과 무관)
(3) 대책방안
→ 부품 사양별작업 특성에 대한 교육 필요
→ 설비 상태(유압, 공압, 모니터, 전원, EOS 등)에 따른 불량유형을 충분히 교육 받은 직원만
해당공정 작업 수행
→ 작업 관련 기준(표준, 절차 등)은 항상 최신본 유지
→ 정기적인 작업자 직무교육 시행 및 배치기준 설정, 시행 필요
→ 유사부품 구분에 대한 명확한 시각적 자료를 배치하고 교육 실시
→ 교육 후 평가를 통한 적절한 보상 제공으로 동기부여
→ 사무직 뿐 아니라 현장직원들도 품질/생산관련 사내외교육 기회 확대
→ 자신의 작업 불량이 완성차에 어떤 영향을 끼치는지에 대한 교육 실시(영상, 이미지 등)
2.3 자만심, 잘못된 관행
(1) 인적요인
→ 잘못된 기준
→ 직무 불만족
(2) 세부내용
→ 관행이란 문서화된 규정은 아니지만 일반적으로 행하는 일의 방식
→ 부정적인 관행은 작업 기준 수립을 방해하고 품질문제 및 안전사고 발생의 원인
→ 부정적 관행은 비정상 작업수행, 기억에 의존한 작업 수행, 절차 미준수등이 있으며 고참
작업자일수록 따르기 쉬움
(3) 대책방안
→ 동일한 기준을 준수할 수 있도록 작업 관련 기준(표준, 절차 등)은 항상 최신본유지 필요
→ 중요 공정/검사 항목은 이중확인 절차 운영 필요
→ 한도견본을 게시(대형은 해당부위 절단) 또는 큰 사진으로 표현하여 작업자가 수시로 확인
→ 작업표준 최신본유지에 그치지 않고, 해당 표준대로 작업실시 여부 등을 현장 관리자의 정기
점검활동 필요
→ 생산을 위해 품질을 미루는 잘못된 관행 개선을 위해 제조부서 팀장 이상급인식 제고를 위한
교육 실시/참여', 12
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 12);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '[부표1, 휴먼에러 원인유형 및 대책방안 예시] 3. 작업자', '3.1 안일함, 인지력 저하
(1) 인적요인
→ 비현실적인 시간
→ 육체적/정신적 피로
→ 개인적인 가정사 문제
→ 부적절한 작업환경
→ 회사 처우에 대한 불만
(2) 세부내용
→ 피로는 자연적인 현상이며 작업자의 정신적/육체적 상태에 악영향을 줄 수 있음
→ 피로는 작업자의 반사속도, 집중력 저하에 따른 실수 증가 및 잘못된 결정 유발 가능
→ 물리적 인자 : 업무량과 작업환경 등
→ 심리적 인자 : 감정적 요소, 직장동료 및 상관과의 관계, 가정사 등
→ 생리적 인자 : 피로, 허약한 몸 상태, 배고픔, 질병 등
(3) 대책방안
→ 공정별 업무강도 분석 후 작업자별 적절한 업무 순환 배치 및 분배 필요
→ 시업(복귀)시 작업자 건강상태 자체 판단하여 업무배치 조정 가능한 절차(기준) 운영
→ 작업자가 스트레스를 받는 요인을 분석하여 도움을 줄 수 있는 프로그램(제도) 운영
→ 정기적인 통근버스 노선 점검 실시(월 단위 등)하여 신규 입사자의 통근 불편 예방
→ 외국인 작업자의 근무환경 조성
① 동료간 의지할 수 있도록 되도록 같은 국가 인원 채용
② 외국인 기숙사 환경 주기적 점검 개선
③ 정기 인터뷰를 통해 타국생활 상담
→ 근골격계 질환 사전 예방 : 피로 증가 또는 증상 발생 시 재활 프로그램 참여
→ 지역 보건소 스트레스 예방 검사 실시
3.2 압박, 부담
(1) 인적요인
→ 비현실적인 시간
(2) 세부내용
→ 작업자가 작업시간에 대한 과도한 압박을 느끼거나 새로운 업무를 맡을 경우 자신감이
떨어지며, 촉박한 시간 등의 부담이 큰 상황에서 오류를 발생시킬 가능성이 높음
→ 작업시간을 위해 안전과 품질이 희생되는 것은 허용될 수 없으며, 작업자가 시간에 쫓긴
다고 인지하는 경우 조직의 관리자에게 보고하고 공개하여 대안을 논의할 수 있어야 함
(3) 대책방안
→ 작업자가 느끼는 부담 해소를 위하여 관리자는 지속적인 의견청취 및 개선 프로그램 운영
→ 작업자가 적절한 시간으로 작업할 수 있도록 고려하여 표준 수립 및 지속적 업데이트
→ 작업시간에 압박을 느끼는 작업자의 작업수준 향상 프로그램 운영', 13
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 13);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'B-2300', '[부표1, 휴먼에러 원인유형 및 대책방안 예시] 4. 작업 필요자원', '4.1 필요자원 지원부족
(1) 인적요인
→ 비현실적인 시간
→ 치공구관리 미흡
→ 열악한 교육훈련
→ 열악한 공구와 장비
→ 직무 불만족
(2) 세부내용
→ 자원(서브품, 치공구, 계측기 등) 부족은 작업자의 생산성 및 제조 품질에 악영향
→ 올바른 작업을 위해서는 충분한 작업기준(표준, 절차 등)이 제공되어야 함
(3) 대책방안
→ 공정내 자원(서브품, 치공구, 계측기 등) 필요수량 및 보유현황을 지속적 분석 및 지원
→ 작업성에 직접적인 영향을 미치는 자원(치공구, 계측기 등)은 정기적으로 검증, 교정 필요
→ 작업 관련 기준(표준, 절차 등)은 항상 최신본 유지
→ 작업전셋업상태점검 필요하며 생산진행중서브부품/공구 등이 필요할 경우 별도 인원 운영
→ 검사 공정 등 조도가 중요한 공정은 LED 램프 사용
→ 공용대차수량 부족 시 불필요한 이동시간 발생, 집중도 저하됨
(용도별 전용 대차 지정 및 관리 주기 설정)
부표2, 정성품질 포스터 : 공정 게시용', 14
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'B-2300' AND sort_order = 14);

-- ── D-1100 (3p · REV.5 · 2023-05-01) 5섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'D-1100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '(서두)', '제품 특성 안전관리 규정 · 문서번호 TPC - D - 1100 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 필라넥워터 사업부 개발팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 과 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이백범 | 김상은 | 노영길 | 이정훈
서 명 | Sign | Sign | Sign | Sign
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '1. 적용범위', '이 규정은 회사의 자동차 관련 부품에 적용한다.
2
이 규정은 당사가 설계/제작한 또는 고객의 기술자료에 의거 제작하여 고객에게 제공한
제품에 대해, 제품 전 순기에 걸쳐 제품안전을 보장하기 위한 절차를 규정한다.

[표]
목 적', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '3.용어의 정의', '3.1 제품 안전(Product Safety)
사람에 대한 위해나 재산상의 손실과 같이 받아들일 수 없는 위험을 초래하지 않고, 설계된
또는 의도된 목적을 달성할 수 있는 제품의 상태', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '4. 책임과 권한', '4.1 대표이사
(1) 제품안전에 대한 최종 책임
(2) 제품안전에 법규 및 고객 요구사항 달성을 위한 자원 확보
(3) 제품안전에 대한 권한과 책임 부여
(4) 관련자에 대해 제품안전 사고 교육
4.2 개발팀장
(1) 제품 공정설계 시, 제품안전에 대한 위해요소 평가 및 안전치명항목/주요특성치/
특별요구사항/LOT 관리 결정
(2) 제품안전을 확보하기 위한 위험관리 실시
(3) 제조공정 설계인원에 대한 제품안전교육 제공
4.3 생산팀장
(1) 제품생산기획 시, 제품안전과 연관된 위험 식별 및 완화
(2) 제품안전과 관련되어 식별된 안전치명항목/주요특성치/특별요구사항/LOT의 관리 및 이행
(3) 생산인원에 대한 제품안전교육 제공
4.4 구매팀장/생산팀장
(1) 적용시, 제품안전에 대한 요구사항 협력업체에 전파
(2) 협력업체 내에서, 식별된 안전치명항목/주요특성치/특별요구사항의 관리 및 이행 보장
(3) 구매인원에 대한 제품안전교육 제공
4.5 품질보증팀장
(1) 내부심사를 통해 제품안전관리 절차의 이행 보장
(2) 제품안전 사고의 영향 분석
(3) 제품안전 사고의 이해관계자에 보고', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '5. 업무 절차', '5.1 일반사항
(1) 제품안전과 관련된 본 규정의 적용 정도는 고객에 제공된 제품의 안전에 관한 잠재적
영향과 제품의 유형 및 종류에 따라 결정된다.
(2) 견적 및 계약검토 단계에서 제품안전에 대한 추가 검토 필요성이 있으면 5.2항을 적용한다.
(3) 견적 및 계약단계에서 제품의 형상, 기능을 고려하여 제품안전에 위해 요인이 없는 경우,
이를 계약검토서에 기록/유지하여야 한다.
5.2 생산단계에서의 제품안전관리
(1) 생산 중, 제품안전의 위해요소을 분석하여 관련 위험을 식별하기 위해 공정 FMEA를
사용한다. 이때 조직의 인적요인 및 부여된 책임에 대한 위험도 식별하여 처리하여야 한다.
(2) 식별된 위험은 『리스크 관리 규정』 에 따라 관리한다,.
(3) 개발팀에서 또는 고객인 식별한 치명항목/주요특성치/특별요구사항은 개발팀에서 준비한
지침에 따라 관리한다.
5.3 협력업체에서의 제품안전관리
(1) 구매팀장/생산팀장은 적용시 제품안전에 요구사항을 계약서, 발주서, 협약서 등을 통해
협력업체에 전파하여야 한다.
(2) 년1회 협력업체 평가 시, 제품안전활동의 이행여부를 점검하고 불일치 발생 시 시정조치를
요구해야 한다.
5.4 발생한 제품안전 이벤트 분석 및 보고
5.4.1 품질보증팀은 내부심사 시, 제품안전관련 활동 이행상태를 점검하고 잠재적인 이벤트의
영향을 분석하여 그 결과를 최고경영자에게 보고한다.
5.4.2 적용 시, 발생된 이벤트는 24시간 이내에 고객을 포함한 이해관계자에게 ''제품 안전 사고
발생보고서''를 작성하여 보고한다.
5.4.3 품질보증팀은 발생된 사고에 대해, 관련자를 대상으로 이벤트 교육을 실시하고, 그 결과를
유지한다. 사고 교육에는 아래 사항이 포함된다.
(1) 납품한 제품의 영향
(2) 동일한 기술 또는 구성품에 기반을 두거나, 유사기능을 가지는 다른 부품 에 발생한 이벤트
(3) 안전요인으로 인한 이벤트
5.6 제품안전 교육
(1) 각 팀은 년1회 부서원에 대해 제품안전교육을 실시하고, 교육보고서를 작성/유지한다.
(2) 제품안전교육에는 제품안전에 대한 각 부서원의 기여도와 납품 후 당사가 제공한 제품의
안전에 대한 부정적인 영향을 포함한다.
(3) 관리팀은 협력업체 종업원에 대해 제품안전교육이 실시되도록 계약서, 발주서, 협약서 등을
통해 협력업체에 요구한다. 제품안전교육에는 협력업체 종업원의 제품안전에 대한 기여도가
포함된다.
(4) 관리팀은 년간 업체 평가 시 제품안전교육 관련 사항을 점검하여야 한다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'D-1100', '6. 관련 표준', '(1) 개발업무 규정(J-1100)
(2) 공정 FMEA 작성 및 관리 규정(J-1101)
(3) 협력업체관리 규정(K-1200)
(4) 리스크 관리 규정(A-8100)
8 관련 양식
(1) 안전 사고 발생보고서(D1100-01)
(2) 제품 안전교육 보고서(D1100-03)
(3) 공정 안전점검 연간 계획_실적(D1100-04) - 각 사업부 개별 점검 양식
(4) 공정 안전점검 체크시트(D1100-05) - 각 사업부 개별 점검 양식
(5) 공정 안전점검 개선대책(D1100-06) - 각 사업부 개별 점검 양식', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'D-1100' AND sort_order = 5);

-- ── F-1100 (5p · REV.9 · 2025-06-13) 12섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'F-1100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '(서두)', '교육훈련 규정 · 문서번호 TPC - F - 1100 · 개정 REV.9 · 재·개정일 2025-06-13
개정이력 | 개정
번호 | 재,개정일 | 재,개정사유 및 내용
시행 일자
0 | 2004년08월30일 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년08월01일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정 ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년04월01일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018년01월02일 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020년08월03일 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신 (파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023년05월01일 | 2,3공장 양산이후 원격지원 기능 발생
6 | 2023년07월17일 | 지식 관리표에 대한 업무기술 추가
7 | 2024년06월18일 | 4항 교육훈련의 종류 내 4.2항 4M변경 교육 항목 추가 개정
8 | 2024년08월12일 | 4항 교육훈련의 종류 내 4.3항 4.3 매뉴얼, 프로세스, 규정, 지침 제/개정 교육 항목 추가 개정
9 | 2025년06월13일 | 부표1 부서별 직무교육훈련 기준표 내 공정 FMEA 교육 추가 개정
주관부서 | 경영관리실 총무팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 이 사 | 실 장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김병철 | 김광선 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13
작성사업부 & 부서
작 성 자
총무 기획팀 김병철 과장
경영 관리실 김병철 차장
경영 관리실 김병철 차장
경영 관리실 김병철 부장
경영 관리실 김병철 부장
경영 관리실 김병철 이사
경영 관리실 김병철 이사
경영 관리실 김병철 이사
경영 관리실 김병철 이사
경영 관리실 김병철 이사
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 연구소장
성 명 | 김영동 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '1. 적용범위', '이 규정은 당사 직원의 업무에 관련된 교육훈련 제반 사항에 관하여 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '2. 목적', '사원의 자질과 능력을 개발하고 업무수행에 필요한 지식과 기능을 향상시키는데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '3. 운영 절차', '직무 교육의 주관팀은 경영관리실 총무팀이 되며, 운영 절차는 다음과 같다.
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 팀장 | 팀원 개인별 업무능력
 평가 및 필요 교육 파악
(●) 총무팀장 | 연간 교육훈련 계획 수립 | (→) 교육훈련 계획서
(●) 총무팀장
 (←) 대표이사(→) 각 팀장 | 연간 교육계획 확정 
 및 통보 | (→) 교육훈련 계획서
(●) 각 팀장
 (→) 총무팀장 | 사내, 외 교육훈련
 실시 및 결과보고 | (←) 교육훈련 계획서
(→) 교육훈련결과보고서
(●) 총무팀장 | 교육결과 이력관리 | (→) 교육훈련 이력카드
 [전산이력관리]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 총무팀장 | 교육기록 유지
[전산이력관리)', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '4. 교육훈련의 종류', '4.1 직무교육
(1) 직무교육은 각 직무에 종사하는 사원의 업무 관련지식 습득 및 업무능률 향상을
목적으로 실시를 하며, 그 기준은 부표 1을 기준으로 시행한다.
(2) 직무교육은 직무 기본 교육사항을 정하여 실시하는 과정으로 신규 직무부여 시에는
"신입교육", 기존 직무 수행자에게는 "직무교육"을 실시한다.
4.2 4M변경 교육
4M변경 사항에 대하여 관련 직무에 종사하는 사원에 대하여 관련 정보 및 지식을 공유하는
교육을 실시하여야 한다.
4.3 매뉴얼, 프로세스, 규정, 지침 제/개정 교육
매뉴얼, 프로세스, 규정, 지침 제/개정 사항에 대하여 관련 직무 종사 사원에 대하여 관련 정보
및 지식을 공유하는 교육을 실시하여야 한다.
4.4 환경 안전교육
환경 및 안전에 관한 준수사항과 업무 절차를 습득시키기 위하여 환경 안전교육 관련
업무 수행자에게 교육을 실시하며, 필요시 사외 위탁교육을 시행할수 있다.
4.5 지식관리표 교육
지식관리표를 매년 1회 갱신 하여야하며, 갱신된 내용을 이용하여 부서별, 담당자 직별별
업무 수행자에게 교육을 실시하며, 필요시 사외 위탁교육을 시행할수 있다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '5. 책임과 권한', '(1) 사업부장은 팀원 육성을 위하여 자기개발지원 및 사내,외에서 이루어지는 교육의 위탁 및
관리를 하여야 할 책임과 권한이 있다.
(2) 사원은 회사에게 지시받은 교육은 반드시 이수하여야 한다. 단, 휴직또는 기타사유로
교육이수가 불가능하다고 인정되는 경우에는 예외로 한다', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '6. 교육 계획', '6.1 팀원 업무능력 평가 및 필요 교육 파악
(1) 총무팀장은 매년 12월중에 각 팀장에게 차기년도 교육계획 수립 및 통보를 요청한다.
(2) 각 팀장은 개인별 직무능력 배양 및 업무 목표 달성을 위해 요구되는 부문에 대한 직무별
필요 역량 분석 및 필요 교육과정을 분석하여 역량개발에 대한 개인별 교육계획을
수립한다.
(3) 계획 수립은 개인별 직무수행 능력 및 사내 자격관리 요건등을 기반으로하며, 업무 진행에
필요한 지식을 고려하여 수립한다. (부표1 및 지식 관리표 참조)
(주) 각 팀장은 본인 및 사업부장의 필요 교육도 파악하여 교육훈련계획을 수립하여야 한다.
(4) 각 팀장은 수립된 부서별 교육훈련계획을 총무팀으로 제출 한다.
6.2 연간 교육 계획 수립
(1) 총무팀장은 관련팀으로부터 사내 및 사외 교육훈련 계획을 접수하여 전사 교육훈련
계획을 작성한다.
(2) 교육계획에는 교육대상자, 교육시행처, 교육과목, 예상교육비, 예상시기(분기)를
포함하여야한다.
(주) 사외교육의 경우에는 외부 교육기관의 교육안내 정보를 참조하여 작성한다.
6.3 연간 교육계획 확정 및 통보
(1) 총무팀장은 차년도 교육계획 내용과 소요예산이 포함된 교육계획을 공장장의
검토와 대표이사의 승인으로 확정한다.
(2) 총무팀장은 확정된 교육계획을 각 팀에 배포하여 교육훈련을 시행할 수 있도록 한다.', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '7. 교육 방법', '(1) 교육방법은 목표, 기간, 비용 등을 고려하여 합숙 또는 기타의 방법을 선택한다.
(2) 교육의 방법은 강의, 토의, 사례연구, 실습 등 각종 교육기법 중에서 해당과정 또는
과목의 특성에 따라 교육효과를 높일 수 있는 방법을 선택하여 실시한다.
※공정 면허에 대한 교육 방법은 이론 평가 및 실기 평가 (실제품 표준 기준 생산 능력
및 검사 능력)를 병행, 평가하여야 한다.', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '8.교육 실시 및 결과 보고', '8.1 사내/외 교육훈련 실시 및 결과보고
(1) 각 팀장은 확정된 내용을 토대로 연간 팀내 교육훈련을 실시한다.
(2) 교육훈련을 실시후에는 결과보고서를 작성하여야 하며, 교육완료후 7일 이내에
팀장의 승인 후 총무팀 및 품질경영팀에 송부하여야 한다. (자격부여 교육외 팀
자체적으로 실시되는 사내교육일 경우는 별도로 총무팀에 송부하지 않는다.)
(3) 교육 결과 보고서 작성은 다음과 같이 실시한다.
가. 사외 위탁교육의 경우 수강자가 보고서를 작성한다.
나. 사내 집체교육시에는 강사가 보고서를 작성한다.
다. 사내 개별 교육시에는 강사 또는 수강자가 보고서를 작성한다.
8.2 교육기록 유지
총무팀은 교육훈련 계획서 및 보고서를 보관한다.', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '9. 사내 자격 관리', '사내에 특수 직능이나 능력요건을 필요로 하는 업무 수행자에 대하여는 자격을 부여하고,
해당업무는 유자격자에 의하여만 수행되도록 통제한다.자격관리 세부사항은 『사내 자격
관리 지침』에 따른다.', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '10. 교육기록 관리', '교육훈련 계획서 및 결과 보고서는 품질기록으로 관리한다.', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '11. 관련 표준', '(1) 신규보직자 교육훈련 지침 (F-1101)
(2) 사내 자격관리 규정 (F-2100)', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 11);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1100', '12. 관련양식', '(1) 년 사/내외 교육훈련 계획서 (F1100-01)
(2) 교육 이수 보고서 (F1100-02)
(3) 교육훈련 이력카드 (F1100-03) - 전산이력관리 대체
(4) 지식 관리표 (F1100-04)
(5) 사내교육 관리대장(F1100-05)
(6) 사내 교육 보고서(F1100-06)
부표 1. 부서별 직무교육훈련 기준표', 12
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1100' AND sort_order = 12);

-- ── F-1101 (4p · REV.5 · 2023-05-01) 11섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'F-1101';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '(서두)', '신규 보직자 관리 지침 · 문서번호 TPC - F - 1101 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 경영관리실 총무팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 이 사 | 실 장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김병철 | 김광선 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
총무 기획팀 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
경영 관리실 총무 김병철
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 연구소장
성 명 | 김영동 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '1. 적용범위', '이 지침은 신입사원 또는 직무 변경자(이하 ''신규보직자''라 한다)의 기본직무 수행능력
배양을 위한 교육훈련에 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '2. 목 적', '필요한 업무 지식을 습득하고 능력을 개발하여 부여된 임무를 성공적으로 수행할 수
있도록 하는데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '3. 책임과 권한', '(1) 신규보직자 직무교육(이하 ''신임교육'' 이라 한다)은 팀 단위로 실시 한다.
(2) 각 팀장은 당해 팀의 신임 교육 실시에 대한 계획수립, 시행, 운영, 기록유지
등에 대하여 총괄적인 책임을 진다.', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '4. 운영 절차', '신임교육의 주관팀은 각 팀이 되며, 운영 절차는 다음과 같다.
↓
↓
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 소속팀장 | 신임교육 필요성 확인 | (←) 학력,경력,경험 등
 확인
(●) 소속팀장 | 필요 교육 과목 결정
(●) 소속팀장
 (→) 지도요원 | 지도요원 지명 및 
임무부여
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 소속팀장
 (→) 지도요원 | 교육계획 수립 및 승인 | (→) 신임 교육 계획서
(●) 지도요원
 (→) 대상자 | 훈 련 실 시
(●) 지도요원
 (→) 소속팀장 | 교육훈련 결과 보고 | (→) 신임교육일지
(●) 소속팀장 | 훈 련 성 과 평 가
(●) 소속팀장 | 직 무 부 여', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '5. 세부 절차', '5.1 신임교육 필요성 확인
소속 팀장은 다음 각 호의 경우 신임교육 필요성을 검토하여야 한다.
(1) 사원이 신규로 채용된 경우
(2) 보직변경 또는 담당 직무의 변경
5.2 필요 교육과목 결정
소속 팀장은 피교육자의 주요경력과 교육이력을 확인하여 필요 교육과목을 결정하여야
한다.
5.3 지도사원 지명 및 임무부여
(1) 각 팀장은 해당팀 신임교육을 담당할 지도요원을 지명한다.
(2) 지도요원은 교육대상 인원에 대한 신임교육의 목표와 계획수립에 대한 실무 책임자가
된다. 지도요원이 다수인 경우 팀장은 지도를 총괄할 대표요원을 선정한다.
5.4 신임 교육계획 수립 및 승인
(1) 지도요원은 소속 팀장이 지시한 교육 대상자의 교육 필요과목에 따라 신임 교육
계획서를 작성하여 팀장의 승인을 받아야 한다.
(2) 신임교육 계획서는 교육일정, 내용, 교육방법 등을 포함하여야 한다.
(3) 신임 교육 실시기간은 팀장의 판단에 따라 결정 한다.
5.5 훈련 실시
지도요원은 “신임 교육 계획서”에 따라 훈련을 실시한다.
5.6 훈련 결과보고
(1) 지도요원은 신임교육 완료 후 3일 이내에 ''교육 결과 보고서''를 작성하여 소속팀장
에게 보고하여야 한다.
(2) 피교육 대상자는 하루에 여러 과목을 교육하는 경우 매일, 한 과목을 여러날 시행하는
경우 해당 교육과목 종료시점에 신임교육 일지를 작성하여 소속팀장에게 보고하여야
한다. 단, 현장사원으로서 단순교육인 경우 강사가 ''교육결과 보고서''로 대체할 수 있다.
5.7 훈련 성과 평가
(1) 소속팀장은 교육이 종료된 경우에는 직무수행에 필요한 능력 배양의 정도를 평가
하여야 한다.
(2) 평가 방법에는 교육 내용의 소감 및 의견 청취, 질의응답, REPORT 접수, 실기평가
또는 평가시험 등의 방법으로 실시할 수 있다.
(3) 소속 팀장은 평가 결과를 토대로 지도 목표와 달성 정도에 미달할 경우에는
재교육을 실시한다.
(4) 훈련성과 평가 완료후에는 향후 육성의 필요점 등을 파악하여 차기교육 계획에 반영
하고 사원의 능력개발 자료로 활용하여야 한다.
5.8 직무 부여
(1) 신임교육 완료 후 팀장은 해당 인원에게 직무를 부여하고 ''개인별 직무 매트릭스''를
작성, 유지하도록 한다.
(2) 신임교육이 완료되기 전에는 독자적으로 업무수행을 하도록 해서는 안되며, 감독자의
지도 감독하에 제한된 범위의 보조업무만을 부여할 수 있다.', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '6. 관련표준', '(1) 조직 및 업무분장 규정 (A-1100)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '7. 관련 양식', '(1) 신임 교육 계획서 (F1101-01)
(2) 신임 교육 일지 (F1101-02)
(3) 교육 결과 보고서 (F1100-02)', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '8. 부표', '(1) 신규보직자 교육훈련 프로그램
부표 1. 신규보직자 교육훈련 프로세스', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '[부표 1. 신규보직자 교육훈련 프로세스] 1. 교육훈련 프로세스', '[표]
프 로 세 스 | 주관부서 | 협조부서 | 비 고
교안준비 및 강사선임 | 해 당 팀 | 총 무 팀
배치전 교육일정 계획 수립 | 해 당 팀 | 총 무 팀
신입사원 교육실시 | 해 당 팀
교육결과 보고서 작성 | 해당교육강사', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '[부표 1. 신규보직자 교육훈련 프로세스] 2. 관리직 신입사원 배치전 교육훈련 프로그램', '[표]
NO | 교 육 항 목 | 실시부서명 | 교육시간 | 교 육 내 용
1 | 회사 소개 | 총 무 팀 | 0.5시간 | 회사조직 및 인원소개
2 | 마인더 교육 | 공 장 장 | 0.5시간 | 생산제품 소개 및 기능 설명
3 | 근무규정 및 안전교육 | 생 산 팀 | 1시간 | 안전일반 및 작업 안전규정 실천및 요령
4 | 제조공정 관련 교육 | 생 산 팀 | 1시간 | 해당사업부 제조공정
5 | 거래선(고객) 소개 | 영 업 팀 | 0.5시간 | 거래선 및 고객 공장별 생산품 소개
6 | 3정 5S | 품질보증팀 | 0.5시간 | 3정5S 개요 및 실천요령
7 | 품질시스템 교육 | 품질보증팀 | 4시간 | IATF 16949 품질시스템 개요
8 | SQ 품질시스템 개요
총 교육 시간 | 8시간', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-1101', '[부표 1. 신규보직자 교육훈련 프로세스] 3. 현장직 신입사원 배치전 교육훈련 프로그램', '[표]
NO | 교 육 항 목 | 실시부서명 | 교육시간 | 교 육 내 용
1 | 회사소개 | 관 리 팀 | 0.5시간 | 회사조직 및 인원소개
2 | 마인더 교육 | 공 장 장 | 0.5시간 | 생산제품 소개 및 기능 설명
3 | 근무규정 및 안전교육 | 생 산 팀 | 1시간 | 안전일반 및 작업 안전규정 실천및 요령
4 | 제조공정 관련 교육 | 생 산 팀 | 1시간 | 해당사업부 제조공정
5 | 3정5S | 품질보증팀 | 1시간 | 3정5S 개요 및 실천요령
6 | 배치공정 작업표준 교육 | 생 산 팀 | 1시간 | 배치공정 작업요령 및 중점관리항목 교육
7 | 계측기 사용 요령 교육 | 품질보증팀 | 1시간 | 배치공정 사용 계측기
총 교육 시간 | 6시간', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-1101' AND sort_order = 11);

-- ── F-2100 (6p · REV.5 · 2023-05-01) 8섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'F-2100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '(서두)', '사내 자격관리 규정 · 문서번호 TPC - F - 2100 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 기술연구소 품질경영팀 | 협의부서
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처 | 협의
직 책 | 부 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김권표 | 박주돈 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
기술연구소 품질보증팀 곽주섭
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 김권표
기술연구소 품질보증팀 김권표
기술연구소 품질경영팀 김권표
주관부서 제외 전부서
구 분 | 정밀인발튜브 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장
성 명 | 김영동 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '1. 적용범위', '이 규정은 특정업무 종사 인원의 사내자격 인정에 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '2. 목 적', '유자격자에 의하여 정확한 업무 수행이 되도록 하는데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '3. 자격 종류', '당사의 자격 부여 종류는 다음과 같다.
(1) 검사 및 시험요원 --- 관리부서 : 각 사업부 품질보증팀
(2) 개발요원(개발담당,개발책임자) --- 관리부서 : 각 사업부 개발팀
(3) 내부심사 요원(품질,환경) --- 관리부서 : 기술연구소 품질경영팀
(4) 제조공정 및 제품심사 요원 (2자 심사요원) --- 관리부서 : 기술연구소 품질경영팀
(5) 특별공정 요원 --- 관리부서 : 해당 사업부
(6) 환경,안전,보건 관리자 --- 관리부서 : 경영관리실 총무팀
(7) 공정 작업자 면허 --- 관리부서 : 각 사업부 생산관리팀', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '4. 운영절차', '사내 자격관리는 기술연구소 품질보증팀이 되며, 운영 절차는 다음과 같다.
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 팀장 | 자격 부여 필요여부 파악 | (←) 자격부여 기준
(●) 해당팀장 | 대상 후보자 선정 | (←) 자격인증 변경 요청서
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 해당팀장
 (→) 후보자 | 교 육 / 훈 련 | (→) 교육결과보고서
(●) 승인권자 | 자격 평가 | (←) 자격부여기준 및
 평가자료
(→) 자격인정 평가서
(●) 기술연구소
 품질경영팀장 | 자격 등록 및 활용 | (→) 사내 자격 관리대장
(●) 해당팀장 | 사 후 관 리', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '5. 세부 절차', '5.1 자격 필요 여부 파악
각 팀장은 신입 또는 보직변경 등 필요시 자격부여 필요 여부를 파악하여야 한다.
5.2 대상 후보자 선정
해당 팀장은 자격부여가 필요한 경우 해당 자격과 관련하여 기본 자질을 겸비한 인원
중에서 후보자를 선정한다.
5.3 교육 훈련 실시
해당 팀장은 해당 자격요건에 따라 교육훈련을 실시 하여야 한다.
단, 경력자인 경우 경력 인정으로 교육훈련은 생략할 수 있다.
5.4 자격 평가
자격 부여를 위한 조건은 자격요건을 이수 하였거나, 이에 상응하는 경력이 있는자에 대하여
평가권자가 평가하여 합격한 경우로 한다. 자격 요건 및 평가 방법은 부표 1/부표 2와 같다.
5.5 자격 등록 및 활용
(1) 해당팀장은 ''자격 인정평가서''에 승인권자의 승인을 득하여 기술연구소 품질경영팀으로 해당
원본을 송부한다.
(2) 기술연구소 품질경영팀장은 신규자격 부여를 한 경우에는 아래와 같이 자격번호를 부여하여
''사내 자격 관리대장''에 등록한다. 갱신 등록의 경우 기존의 번호를 사용한다.
(1)(2)(3) : 당사 약호(TPC)
(4) : 자격분류 코드(아래참조)
(5)(6) : 일련번호(01~99)
5.6 사후 관리
(1) 자격 인정자의 전출, 퇴직등 변동사항이 발생시 해당 부서 팀장은 즉시 해당 인원에 대하여
자격인증 변경 요청서를 작성, 사업부장 승인 후 기술연구소 품질경영팀장에게 제출하여 사내
자격 관리대장에서 말소하며, 전출자에 대하여는 해당 기록 사항을 변경한다.
(2) 자격 인정 보수교육을 직무교육으로 하며, 자격 유효기간이 경과한 경우 관리부서 주관 재평가를
실시 한다.
(3) 자격 유효 기간은 "부표 1"을 참조한다.

[표]
자격분류 | 기 호 | 자격분류 | 기 호 | 자격분류 | 기 호
개발 요원 | CD | 검사/시험요원 | CI | 2자 심사요원 | CP
내부심사요원 | CA | 특별공정요원 | CS | 환경/안전/보건 | CE
공정면허 | PP', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '6. 관련양식', '(1) 사내 자격 관리대장 (F2100-01)
(2) 사내 자격 인증 카드 (F2100-02)
(3) 사내 자격 인증서 (F2100-03)
(4) 자격인증 변경 요청서 (F2100-04)
(5) 공정면허 이론평가서 1안 (F2100-05-01) - 각 사업부 품질보증팀장 주관 재정 이론 시험 평가
(6) 공정면허 이론평가서 2안 (F2100-05-02)
(7) 공정면허 실기평가서 (F2100-06) - 표준 기준 조건 셋팅, 제품 생산, 검사 능력 현물 평가
(8) 숙련도_다기능 평가 계획 (F2100-07)
(9) 숙련도 평가표 (F2100-08)
(10) 작업자 현장 직무 현황 (F2100-09)
(11) 작업자 숙련도 CHECK SHEET (F2100-10)
(12) 자격 인증 교육 및 평가서 (F2100-11)
(13) 공정별 전담자 및 대체자 관리기준 (F2100-12)
(14) 공정면허 자격인증 평가서(종합) (F2100-13)
(15) 공정면허 자격인증평가(갑지) (F2100-14)
(16) 공정 자격인증카드_공정 게시용 (F2100-15)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '7. 부표', '(1) 부표 1. 자격 요건 및 평가 방법
(2) 부표 2. 공정 작업자 숙련도 평가 기준', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'F-2100', '8. 관련표준', '(1) 교육훈련 규정(F-1100)
(2) 측정시스템 평가 지침(L-3101)
부표 1. 자격 요건 및 평가 방법
부표 2. 공정 작업자 숙련도 평가 기준', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'F-2100' AND sort_order = 8);

-- ── H-1100 (3p · REV.5 · 2023-05-01) 6섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'H-1100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '(서두)', '계약검토 규정 · 문서번호 TPC - H - 1100 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 필라넥워터 사업부 개발팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 과 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이백범 | 김상은 | 노영길 | 이정훈
서 명 | Sign | Sign | Sign | Sign
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '1. 적용범위', '이 규정은 고객으로부터 접수된 신규제품의 개발의뢰 접수에서 양산 주문전까지의 계약
검토 절차에 대하여 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '2. 목적', '고객으로부터 입찰서의 제출 또는 계약서나 주문서를 수락전에 검토하기 위한 업무를 문서화
된 절차로 수립하고 유지시켜 고객의 요구와 기대사항을 충족 시킴을 그 목적으로 한다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '3. 관리절차', '계약검토 업무의 주관팀은 개발팀이 되며, 업무 절차는 다음과 같다.
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 개발팀장 | 개발의뢰 접수 | (←) 개발검토의뢰서
(→) 개발의뢰접수대장
(●) 각 사업부 영업팀장 | 개발관련 정보조사 | (←) 설문,경쟁사 자료
(←) 고객사업계획
(●) 각 사업부 개발팀장 | 계약검토 | (→) 제조타당성 검토서
(●) 각 사업부 개발팀장 | 계약 서류 취합 및 제출 | (→) 원가계산서
(→) 고객요구서류
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 고객
 (→) 개발팀장 | 개발승인 | (←) 개발요청서
(→) 개발일정계획서
(●) 각 사업부 개발팀장 | 신제품 개발 | (●) 개발업무 규정', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '4. 세부업무절차', '4.1 개발의뢰 접수
고객으로부터 구두나 문서상으로 개발의뢰 요청이 오면 개발담당은 ''개발의뢰 접수대장''에
등록한다.
4.2 개발관련 정보조사
4.2.1 개발담당은 개발의뢰 받은 품목을 검토하고 정보가 불충분한 경우 고객에게 문의하여
고객의 조직과 의사소통 및 연계성 채널을 포함한 필요정보를 입수한다.
4.2.2 개발담당은 하기와 같은 자료를 개발의뢰 받은 품목의 검토자료로 활용한다.
(1) 설문조사된 정보 또는 대중매체의 분석자료
(2) 경쟁사의 관련 자료(Sample, 도면, 기타자료)
(3) 고객의 사업계획(양산시점, 생산수량, 생산지역, 개발일정 마케팅 전략)
4.2.3 개발담당은 상기 내용을 취합 검토하여 관련팀에 제조타당성검토서, 개발정보 및 관련
자료를 배포한다.
4.3 계약검토
4.3.1 제조타당성 검토서를 접수한 관련팀은 신제품에 관한 기술성, 경제성, 납기, 고객
지정 요구사항들을 조사, 검토한다.
(1) 기술성 : 금형 및 JIG제작, 생산 가능 여부 및 기타사항
(생산팀,생산기술팀)
(2) 경제성 : 투자비용, 공용화, 원가절감 및 기타사항
(생산팀, 생산기술팀)
(3) 납 기 : Sample 일정준수 및 기타사항
(개발팀, 생산팀, 품질보증팀)
4.3.2 개발담당은 일정이 촉박한 경우 관련팀과 회의를 통하여 상기 4.3.1항의 내용을 검토
하고 ''계약 검토서''에 관련검토자료를 첨부하여 검토기록을 유지한다.
4.4 계약서류 취합 및 제출
계약검토가 완료된 후 개발담당은 관련팀에서 ''원가계산서'' 작성을 위한 기초자료를 취합
하여 원가계산서 양식에 의거 자체원가를 산출하고, 품의서를 작성하여 대표이사의 승인을
득한 후 견적을 작성하고 고객의 요구 서류를 관련팀의 협조를 받아 취합,고객에게 제출
한다.
4.5 개발승인
(1) 계약서류 제출 후 고객으로부터 개발승인이 확정되면 개발팀은 고객으로부터 개발요청서를
접수하거나, 구두상 승인의 경우 ''개발의뢰 접수대장''에 기록 관리한다.
(2) 개발담당은 개발승인 내용이 고객에게 제출한 서류와 일치하는가를 검토하고 검토내용이
일치하지 않거나 추가 요구사항이 있을 경우에는 고객과 재협의하여 처리한다.
(3) 개발담당은 고객으로부터 접수한 개발요청 관련서류를 관련팀에 통보한다.
4.6 신제품 개발
관련팀은 개발팀으로부터 접수한 개발요청서나 내용을 참조하여 개발업무를 진행한다.
세부업무 절차는 『개발업무 규정』에 따른다.
4.7 계약변경
개발진행 또는 양산품목에 대하여 고객이 신규 요구사항을 추가하거나 일부 사양을
변경하는 경우 개발담당은 『4M 변경 관리 규정』에 따라 조치한다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '5. 관련표준', '(1) 개발업무 규정(J-1100)
(2) 4M 변경관리 규정(J-3100)
(3) 양산 주문접수 및 납품관리 규정(H-2100)', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-1100', '6. 관련양식', '(1) 제조타당서 검토서 (H1100-01)
(2) 개발의뢰 접수대장 (H1100-02)
(3) 원가계산서 (H1100-03)
(4) 원단위 원가분석 (H1100-04)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-1100' AND sort_order = 6);

-- ── H-2100 (4p · REV.5 · 2023-05-01) 7섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'H-2100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '(서두)', '양산 주문접수 및 납품관리 규정 · 문서번호 TPC - H - 2100 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 정밀인발튜브 사업부 영업팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 부 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이기식 | 김영동 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '1. 적용범위', '이 규정은 양산제품의 주문접수 및 검토, 납품 및 실적관리, 수금업무에 대하여 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '2. 목적', '주문접수에서 납품까지 고객의 요구사항을 보다 신속하게 처리하고, 고객의 납기를 준수하여
효율적인 판매 운영이 되도록 하는데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '3. 용어의 정의', '3.1 발주서
고객이 회사제품을 구입하고자 하는 부품명, 수량, 단가, 납기등이 기재된 구매요청
문서를 말한다.
3.2 판매계획
월간 거래처별, 판매예정금액을 파악, 집계한 계획서를 말한다.', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '4. 관리절차', '주문접수 및 판매업무의 주관은 각 사업부 영업팀이며 관리절차는 다음과 같다
↓
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 영업팀장 | 주문접수 | (←)발주서(FAX,E-MAIL)
(●) 각 사업부 영업팀장
 (→) 관련팀장 | 계약검토 | (→)납기검토관련 자료
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 영업팀장
 (→) 관련팀장 | 월 납품계획 수립 | (→)고객 발주서
(●) 각 사업부 영업팀장
 (→) 생산팀장 | 일 납품계획 수립 | (→)출고지시서
(●) 각 사업부 영업팀장 | 재고보유 여부 확인 | (●) 생산관리 규정
(●) 각 사업부 영업팀장 | 출고준비 및 납품 | (→)거래명세서 및 
 관련 서류
(●) 각 사업부 영업팀장 | 판매실적집계 및 보고 | (→)일일납품 실적
(→)월납품실적
(●) 해당팀장 | 불만처리 | (●) 고객불만처리규정', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '6. 세부절차', '6.1 주문접수
(1) 영업담당은 고객의 월간/일간 발주서 또는 생산계획을 접수한다.
6.2 계약 검토
6.2.1 월 발주 검토
(1) 영업담당은 고객의 월간발주서 또는 생산계획을 접수하면 납기요구사항 및 추가변동
요인등을 검토하며, 그외 포장, 물류, 기타사항들을 확인하고 생산팀에 고객의 납기
에 따른 리스크를 분석하여 그 일정내 생산이 불가능하면 고객과 협의 조정 등
필요한 조치를 하고 그 결과를 기록관리한다.
(2) 영업담당은 고객의 발주서 및 생산계획을 관련담당에게 배포한다.
6.2.2 일 발주 검토
영업담당은 고객의 일일 발주 수량을 당사 재고와 비교하여 검토 결과 재고가 부족
할 경우 고객과 일정을 재협의하고, 일정조정이 불가능할 경우 생산담당에게 긴급
생산가능여부를 확인하고 잔업, 연장, 철야 등 필요한 조치가 될 수 있도록 한다.
6.3 월 납품 계획 수립
(1) 영업담당은 수주현황을 정리하여 연간 사업계획과 비교하여 차이가 없을 시 별도의
납품계획을 수립하지 않고 고객의 발주현황을 납품계획으로 대체한다.
(2) 납품계획 수립시 거래처별 매출증진을 위하여 판매실적 및 판매촉진에 영향을 미치는
요인등을 검토하여 납품계획 수립시 반영한다.
6.4 제품 출고 및 납품
6.4.1 일 납품 계획 수립
영업담당은 주간 납품계획 및 고객의 일 발주사항을 고려하여 ''일일 출고 계획서''로
당일 출고계획을 수립한다.
6.4.2 재고 보유 여부 확인
(1) 영업담당은 당일 납품 계획에 따라 제품의 출하대상 품목 및 수량에 대하여 재고 보유
여부를 확인한다.
(2) 출하대상품목의 재고 부족시는 생산담당과 생산변경 가능 여부를 협의한다. 세부사항은
『생산관리규정』에 따른다.
6.5.3 출하 준비 및 확인
(1) 영업담당은 거래명세서에 출하될 품목 및 수량, 거래처 등을 기록하고 고객에게
인도될 납품서류를 관련팀의 협조를 받아 준비한다.
(2) 영업담당은 거래명세서를 기준으로 고객별, 제품별로 선입, 선출 될 수 있도록 LOT
구분하여 분류하고 이종혼입, 식별 및 라벨링 상태를 확인 후 상차한다.
6.5.4 납품
(1) 납품담당은 영업담당에게 납품서류를 접수하여 상차수량과 비교하고 이상이 없을시
고객의 납품장소로 납품한다.
(2) 납품담당은 납품전 기상변화에 따른 장비 및 공구를 사전 점검하고, 운송중에는
도로 법규에 따른 규정속도를 준수하여 제품손상이 발생되지 않도록 하여야 한다.
(3) 운송중 비상상황에 대처하기 위해 회사와 비상연락체제를 구축하여야 한다.
6.6 판매 실적 집계 및 보고
6.6.1 일일판매 실적집계
영업담당은 거래명세서를 참조하여 "일일 납품실적 보고서"로 일 납품실적을 보고한다.
6.6.2 월 판매실적 집계 및 보고
영업담당은 월별,거래처별, 품목별로 판매실적 및 초과운임 실적을 집계, 분석하여
매월 공장장에게 보고하고, 고객 발주 대비 출하량이 20%이상 차이가 발생한 경우
원인을 분석하여야 한다.
6.7 불만처리
회사에서 생산판매한 제품에 대해 고객으로부터 불만 또는 부적합 사항 발생시 『고객
불만 처리 규정』에 따라 처리한다.', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '7. 관련표준', '(1) 생산관리 규정(M-1100)
(2) 고객불만 처리 규정(H-3200)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-2100', '8. 관련양식', '(1) 발주서 (고객사 양식)
(2) 일일 출고 계획서(H2100-01)
(3) 월 납품량 분석 보고서(H2100-02)
(4) 일일 납품 실적 보고서(H2100-03)', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-2100' AND sort_order = 7);

-- ── H-3100 (3p · REV.5 · 2023-05-01) 6섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'H-3100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '(서두)', '고객 만족도 관리 규정 · 문서번호 TPC - H - 3100 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 정밀인발튜브 사업부 영업팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 부 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이기식 | 김영동 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '1. 적용범위', '이 규정은 내,외부 고객 만족도 조사를 위한 계획수립,평가 및 조치와 관련된 업무에
적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '2. 목적', '제품 요구사항 및 당사 내,외부 고객의 요구사항을 파악하여 내,외부 고객의 만족도를
향상시키는 데 그목적이 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '3. 관리절차', '외부 고객만족평가의 주관팀은 각 사업부 영업팀, 내부 고객만족도 평가관련 주관팀은
총무팀으로 업무 절차는 다음과 같다.
↓
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 주관팀장
 (→) 관련팀장 | 정보 취득 계획 수립 | (→)고객만족도 조사 계획서
(●) 각 사업부 주관팀장
 (→) 관련팀장 | 고객 관련 자료 조사 | (→)고객만족도 평가설문서
(●) 각 사업부 주관팀장 | 고객 만족 경향 분석 | (→)고객만족도 분석 자료
(●) 각 사업부 주관팀장 | 경쟁사 또는 목표지수 비교평가 | (→)고객만족도 분석 자료
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 주관팀장 | 경영검토 회의 상정 | (→)고객만족도 분석 자료
(●) 경영관리실 | 경영 검토 | (●)경영검토 규정
(●) 해당팀장 | 사업계획 반영 | (●)사업계획 운영 규정', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '4. 세부절차', '4.1 정보취득 계획수립
(1) 주관팀장은 매년 1회이상 내,외부 고객만족정도를 모니터링 하기위한 조사대상 선정
및 취득하고자 하는 정보의 방향설정 등을 평가기준에 따라 ''고객만족도 조사 계획''을
수립하여 대표이사의 승인을 받아 운영한다.
(2) 내부고객은 근무만족도 관련 사항에 대하여 조사하고 외부고객은 당사제품에 대한
품질(납품불량율), 인도성과(납기율,초과운임), 협조도, 고객통지(품질,인도,기타 불만 관련)
사항 등을 조사내용으로 한다.
4.2 내,외부 고객관련 자료조사
(1) 품질보증팀장은 수립된 계획에 따라 설문조사를 실시하거나 고객으로 부터 접수되는
고객 불량율 및 고객품질불만 관련 통보 등을 조사내용으로 한다.
(2) 영업팀장은 수립된 계획에 따라 고객의 납기관련 및 초과운임 관련 성과와 품질
납기, 협조도 등을 설문을 통하여 조사한다.
(3) 총무팀장은 내부고객 만족도 관련하여 복리후생 및 근무만족도 관련 사항에 대하여 년 1회
조사한다.
4.3 고객만족 자료 정리
주관팀장은 조사된 내용을 취합하여 분류 항목을 선정하여 항목별로 자료를 정리한다.
4.4 경쟁사 또는 목표지수와 비교평가
주관팀장은 정리된 자료를 경쟁사 또는 설정된 목표지수에 비교하여 고객만족 정도를
평가하고, 항목별로 불만족한 사항에 대해 회사의 사정을 고려하여 우선순위를
결정하여 조치한다.
4.5 경영검토회의 상정
주관팀장은 내,외부 고객만족도 평가 관련 조사, 분석 및 조치한 내용을 경영검토회의에
상정하여 경영자의 검토를 받을수 있도록 준비한다.
4.6 경영자 검토 및 사업계획 반영
경영검토 회의에 상정된 고객관련 자료는 각 관련팀장의 검토 및 상위 경영자의
검토를 통해 회사의 향후 영업 발전 방향결정, 중장기 계획수립, 사업계획에 반영될수
있도록 하고 고객불만 해소 및 신뢰성 향상 정책수립에 활용한다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '5. 관련표준', '(1) 사업계획운영규정 (A-2100)
(2) 경영검토 규정 (A-2200)', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3100', '6. 관련양식', '(1) 년 고객만족도 모니터링 (H3100-01)
(2) 고객만족도 조사 시행 계획서 (H3100-02)
(3) 고객만족도 평가서(설문지) (H3100-03)
(4) 종업원 만족도 조사 설문지 (H3100-04)
(5) 종업원 만족도 조사결과 보고서 (H3100-05)
(6) 종업원 동기부여 계획서 (H3100-06)
(7) 종업원 동기부여 실적평가서 (H3100-07)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3100' AND sort_order = 6);

-- ── H-3200 (3p · REV.5 · 2023-05-01) 8섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'H-3200';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '(서두)', '고객 불만처리 규정 · 문서번호 TPC - H - 3200 · 개정 REV.5 · 재·개정일 2023-05-01
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
주관부서 | 정밀인발튜브 사업부 품질보증팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 과 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이삼원 | 김영동 | 노영길 | 이정훈
서 명 | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01
작성 사업부 & 부서 & 작성자
작 성 자
기술연구소 품질보증팀 곽주섭
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 백달현
기술연구소 품질보증팀 김권표
기술연구소 품질보증팀 김권표
정밀인발튜브 사업부 품질보증팀 이삼원
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 필라넥워터 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김상은 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01 | 2023-05-01', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '1. 적용범위', '본 규정은 회사에서 생산 판매후 고객으로부터 접수되는 제품의 불만처리 절차에 대해서
적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '2. 목적', '고객으로부터 접수된 불만(품질, 납기 등)내용이 회사로 접수되는 경우 이에 신속 정확
하게 처리하여 고객의 요구조건을 충족시키고자 하는데 목적이 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '3. 책임과 권한', '3.1 품질보증팀
관련팀 또는 고객으로부터 품질 불만 사항을 접수하여 시정조치 및 개선을 주관할
책임이 있다.', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '4. 관리절차', '고객품질관련 업무의 주관은 품질보증팀에서 주관하여 처리한다.
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 품질보증팀장 | 고객불만 접수 | (←)고객 불만통보서
(→)고객불만 접수 대응
 현황 보고서
(●) 품질보증팀장 | 현품처리 필요사항 파악 | (→)조치사항 조사자료
(●) 품질보증팀장
 (→) 관련팀장 | 현품조치 | (→)선별,대체품
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 품질보증팀장
 (→) 관련팀장 | 불량품 분석 및 처리 | (→)부적합품발생보고서
(●)시정및예방조치규정
(●) 품질보증팀장
 (→) 고객 | 대책서 작성 및 고객 송부 | (→)개선대책서
(→)고객불만 대응 조치 
 결과 보고서
(●) 품질보증팀장 | 기록갱신 및 정기분석 | (→)분석자료', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '5. 세부절차', '5.1 고객불만 접수
품질보증팀장은 고객 또는 관련팀으로부터 고객품질불만 사항을 접수하였을 경우는
''고객불만관리대장''에 등록한다.
5.2 현품처리 필요사항 파악
품질보증팀장은 현품처리를 위하여 긴급히 대체해야할 사항 등을 고객과 협의하고 대책
마련을 위한 문제점을 파악한다.
5.3 현품 조치
(1) 품질보증팀장은 현품이 사용불가능할 경우 영업담당에게 통보하여 대체품을 납품하고
현품은 전량 회수하여 관련팀의 협조를 받아 선별한다.
(2) 품질보증팀장은 대체품 납품이 불가능하고 고객이 긴급히 제품을 사용해야 할 경우는
선별인원을 선발하여 고객을 방문, 선별 조치토록 한다.
5.4 불량품 분석 및 처리
(1) 품질보증팀장은 불량현상 및 원인을 파악하고 선별 또는 수정 및 사용 가능유무를
파악하여 ''부적합품 발생 보고서''를 작성한 후 팀장에게 보고하고 관련팀에
통보한다.
(2) 관련팀은 부적합 발생보고서의 내용에 따라 수정 또는 폐기처리한다.
(3) 품질보증팀장은 조사결과 재발방지가 필요한 사항에 대해서는 『시정조치 운영규정』
의 절차에 따라 다른 유사제품 및 공정을 포함하여 시정조치될 수 있도록 한다.
5.5 대책서 작성 및 고객송부
(1) 품질보증팀장은 고객의 요구사항에 따른 개선 대책서를 작성하여 송부하고 현황을 관리한다.
(2) 특별히 지정되는 경우 고객의 요구 양식에 기록 통보한다.
5.6 기록갱신 및 정기분석
품질관리담당은 개선 조치내용을 기록하고 동일불량의 재발여부를 확인한후 CLAIM비용
을 포함하여 정기적으로 분석하고 경영검토 평가자료로 활용한다.', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '6. CSR (고객지정 요구사항)', '(1) 개발 및 영업 팀장은 1회/주 고객사 홈페이지에 접속 및 신제품 개발시 CSR 변경 사항에
대하여 파악 후 대표이사 및 사업부장/ 팀장에게 보고, 승인을 득하여야 한다.
(2) 해당팀장은 변경사항에 대하여 매뉴얼 및 요구사항 매트릭스에 반영하여 개정 후
대표이사 및 사업부장/팀장에게 결재를 득한 후 관련 팀원 교육을 실시 하여야 한다.
(3) CSR(고객지정 요구사항)에 대한 고객사 홈페이지 및 부서별 확인, 결재, 회람 내용은
부표 1을 참조한다.
▣부표 1 : 고객사 홈페이지 주소
※홈페이지 접속 점검은 1회/일 이상 접속하여 고객으로부터 전달되는 정보에 대하여 항시
점검, 보고, 결재, 회람등을 진행하여야 한다.

[표]
순 | 고객사명 | 홈페이지 주소 | 부서명 | 확인 내용
1 | ZF 삭스 | https://www.zfsachskorea.co.kr/ | 영업팀 | 발주수량 외
품질팀 | 품질이슈, 정보 외
개발팀 | 개발품 정보 외
2 | 삼보모터스 | http://45.120.69.157:4161/ | 영업팀 | 발주수량 외
개발팀 | 개발품 정보 외
QMS | 품질팀 | 품질이슈, 정보 외', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '7. 관련표준', '(1) 시정조치운영 규정 (B-1200)
(2) 경영검토 규정 (A-2200)', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'H-3200', '8. 관련양식', '(1) 고객불만 접수 대응 현황 보고서 (H3200-01)
(2) 고객불만 대응 조치 결과 보고서 (H3200-02)
(3) 개선대책서 (고객양식)', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'H-3200' AND sort_order = 8);

-- ── J-1100 (13p · REV.7 · 2024-03-29) 7섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'J-1100';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '(서두)', '개발업무 규정 · 문서번호 TPC - J - 1100 · 개정 REV.7 · 재·개정일 2024-03-29
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2,3공장 양산이후 원격지원 기능 발생
6 | 2024-02-05 | 개발 과정(개발계획서 수립, 품질보증계획/투자계획, P1, P2, 양산이후 최종보고) 경영자 보고 절차 표준화
7 | 2024년 03월 29일 | 개발 과정 변경점에 대한 에스켈레이션(Escalation) 기준 재정
주관부서 | 필라넥워터 사업부 개발팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 과 장 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 이백범 | 김상은 | 노영길 | 이정훈
서 명 | Sign | Sign | Sign | Sign
일 자 | 2024-03-29 | 2024-03-29 | 2024-03-29 | 2024-03-29
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
필라넥워터 사업부 이백범
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2024-03-29 | 2024-03-29 | 2024-03-29 | 2024-03-29 | 2024-03-29 | 2024-03-29 | 2024-03-29', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '1. 적용범위', '이 규정은 자동차 관련 제품의 기획 단계부터 고객 승인 및 양산까지 개발업무에 적용한다.
단, 자동차 관련 제품을 제외한 경우는 회사의 필요에 따라 단계를 생략할 수 있다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '2. 목적', '자동차 또는 구조용 관련 제품의 체계적이고 적절한 제품개발 활동 및 품질기획을
추진하고 효율적인 개발 활동을 하여 고객이 요구하는 품질 및 납기를 확보하는 데 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '3. 업무절차', '자동차 관련 제품 개발업무의 관리 주관팀은 개발팀 및 MDT(Multi Disciplinary Team)가 되며,
개발업무 절차는 당사에서 "신규 개발"을 추진하는 경우와 "記,양산품 이관 개발"을 받는 경우로
구분하여 실시한다. 업무절차는 다음과 같다.
3.1 신규 개발인 경우
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
3.2 양산품 이관 및 설계 변경
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓
↓

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 개발팀장
 (←) 고객 | 개발일정 계획 수립 | (←)고객 개발일정 계획
(→)개발일정계획
(●) 각 사업부 개발팀장/
 MDT | 제조타당성 확인 | (→)제조 타당성 확인서
(●) 각 사업부 개발팀장/
 MDT | 공정설계 및 공정FMEA작성 | (●)공정FMEA작성지침
(→)공정FMEA SHEET
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 생산팀장 | 제조설비 제작 및 LAY-OUT | (●)설비관리규정
(→)LAT-OUT도
(●) 각 사업부 주관팀장 | 금형, 검사구, 계측기 
설계 및 제작 | (●)지그관리규정
(●)계측기관리규정
(→)부품개발요청서
(●) 각 사업부 개발팀장 | 용기제작 또는 구매 | (→)공정 및 납입 용기
설정서
(●) MDT | 선행양산 관리계획서 
작성 및 배포 | (●)관리계획서작성지침
(→)양산선행관리계획서
(●) 각 사업부 생산팀장
 (→) 관련팀장 | TRY-OUT 실시 | (→)회의록
(●) 품질보증팀장 | 측정시스템 평가 | (●)측정시스템평가지침
(→)측정시스템평가결과
(●) 생산팀장 | 치공구 보완 및 공정개선
(●) 품질보증팀장 | 검사기준서 작성 | (→)검사기준서
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각사업부 생산팀장 | 작업표준 작성 및 배포 | (●)작업표준서작성지침
(→)작업표준서
(●) 각 사업부 개발팀장
 (→) 관련팀장 | PILOT 생산 및 품평회 | (→)공정능력평가자료
(→)회의록
(●) MDT/
 품질보증팀장 | 양산 관리계획서 
작성 및 배포 | (→)양산관리계획서
(●) 해당팀장 | 관련 표준류 개정 | (→)작업표준서
(→)검사표준
(●) 품질보증팀장 | 고객 승인 | (●)고객승인업무규정
(●) 각 사업부 개발팀장
 /MDT
 (→) 대표이사 | 개발완료 보고 | (→)제품품질 요약 및
 완료 확인서
(●) 해당팀장 | 양산 및 시정조치
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 개발팀장 | 이관 및 설계변경 일정 수립 | (←)고객 개발일정 계획
(→)개발일정계획
(●) 각 사업부 개발팀장/
 MDT | 제조타당성 확인 | (→)제조 타당성 확인서
(●) 각 사업부 개발팀장 | 설비제작 및 
공장 LAY-OUT 설정 | (●)리스크관리 규정
(→)LAY-OUT도
(●) 생산팀장 | TRY-OUT 일정 계획 수립 | (→)TRY-OUT일정계획서
(●) 각 사업부 개발팀장
 (←) 고객 | 개발품 이관 접수 | (←)관리계획서/FMEA
 체크시트/특별특성목록
(●) 각 사업부 개발팀장 | 특별특성 파악 | (→)특별특성 목록표
(●) 생산팀장 | 1차 TRY-OUT 실시 | (→)TRY-OUT 결과
 보고서
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 품질보증팀장 | 측정시스템 평가 | (●)측정시스템평가지침
(→)측정시스템평가결과
(●) 품질보증팀장 | 검사기준서 작성 | (→)검사기준서
(●) 각사업부 생산팀장 | 작업표준 작성 및 배포 | (●)작업표준서작성지침
(→)작업표준서
(●) 각사업부 생산팀장
 품질보증팀장 | 2차 TRY-OUT 실시 및
공정능력 평가 | (→)T/O결과보고서
(→)공정능력평가자료
(●) 품질보증팀장 | 양산 관리계획서
작성 및 배포 | (→)양산관리계획서
(●) 해당팀장 | 관련표준류 개정 | (→)작업표준서
(→)검사표준
(●) 각 사업부 개발팀장 | 고객 승인 | (●)고객승인업무규정
(●) 각 사업부 개발팀장 | TRY-OUT 완료 보고 | (→)제품품질 요약 및
 완료 확인서
(●) 각 사업부 개발팀장 | 양산 및 시정조치', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '4. 기본사항', '4.1 신규 개발인 경우 업무의 순서는 통상 “PILOT 준비단계”, "PILOT 단계" 2단계로
이루어 진다. 또한 고객의 요청에 의해 일부 단계를 추가/포함시킬수 있다.
4.2 단계 및 절차들은 목표된 제품의 품질 및 성능 확보와 양산시 제조성, 조립성을 보증
하기 위해 다른 단계의 절차들과 상호 연계된다.
4.3 PM결정 및 MDT(Multi Disciplinary Team)구성
개발의 주요 절차는 아래의 MDT 운영에 의해 구성된 PM과 MDT의 협의 및 검토가 필요
하며, PM과 MDT가 그 처리를 주관하여 관련된 다른 단계의 절차를 고려하고 재검토하며
관련팀 및 고객과 협의하여 문제점을 해결하여야 한다.
4.3.1 MDT 용어 정의
신규 또는 변경제품 및 공정의 사전 제품 품질 계획을 수립하고 실행하기 위한 내부
상호 기능팀을 말한다.
4.3.2 구성 및 임무
(1) MDT의 구성은 구매팀,영업팀,개발팀,생기팀,생산팀,품질보증팀의 업무 담당자로 구성
되며,MDT의 팀장(PM)은 각사업부 개발팀장으로 한다. 필요시 협력업체 또는 고객 요구시
고객의 인원도 포함할 수 있으며, "PM및 MDT선정기준"을 참고하여 평가 한다.
(2) MDT은 신제품에 대한 본 규정의 사항이 이행되고 있는가를 개발 단계별 진행 상황
확인 및 감독할 책임과 부적합 사항에 대하여 개선을 요구하는 등의 권한이 있다.
(3) MDT의 활동 항목들에 대해서는 각 부문별 또는 MDT에서 책임을 분담하여 작성하고
각 문서에 대한 검토는 MDT에서 검토 및 결과 기록으로 남겨야 한다.
(4) MDT에 의해서 반드시 검토 및 완료되어야 할 사항은 아래와 같다.
가. 고객의 특별 특성항목 검토
나. 공정FMEA의 개발 및 검토
다. 위험 우선도가 높은 잠재적 불량 형태를 줄이기 위한 조치 수립
라. 관리 계획서의 작성 및 검토
마. 개발중 변경사항으로 인한 영향 평가 및 조치 방안 수립("에스컬레이션 기준" 평가 및 조치)
(5) MDT는 개발 계획을 통해 수시로 신제품 품질 계획의 F/UP 및 문제점에 대한 개선을
실시한다.
4.3.3 MDT의 활동 종료
신제품이 양산 승인이 나고 개발이 완료되면, 개발완료 보고로써 MDT의 활동은 종료
된다', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '5.세부 개발업무 절차', '5.1 신규 개발인 경우
5.1.1 개발일정 계획 수립
(1) 개발 계획 및 일정 관리 필요성 확인
각 사업부 개발팀장은 고객의 개발일정 계획을 접수하여 개발착수시 전체 개발계획을
수립하고 일정을 관리한다.
(2) 개발일정계획서내에 개발 품질 계획 항목 설정 및 수립
각 사업부 개발팀장은 개발 계획의 세부 단계와 내용을 아래 항목을 참조, MDT 또는
고객과 협의하여 ''개발 일정 계획서내 품질보증활동을 위한 아래 활동들''을 포함,관리한다.
가. 개발투자 계획 나. 설비, 금형 제작 계획 및 TRY-OUT
다. 특별특성항목 검토 및 선정 라. 공정 FMEA 개발
마. 관리 계획서 . 검사기준서/작업표준서 제정
바. 공정 및 납입 용기 설정. 시험, 제작 일정 수립
사. 측정시스템/공정능력/포장/출하방식등에 대한 고객승인
(3) 구체화된 품질보증계획 및 공정강화 방안 수립/문서화
고객의 특이한 사양요구, 개발경험을 통하여 신규 프로젝트에 반영할 사항, 과거유사품질
문제의 재발 방지 방안, 양산단계 공정능력이 충족되지 못하는 특별특성의 개선방안 수립
(4) 계획 실행 및 확인
수립된 계획에 대하여 각 관련팀 주관하에 진행하며, 각 사업부 개발팀장은 MDT를
활용하여 그 진행사항을 확인한다. 확인된 결과에 대해서는 각 사업부 개발팀장의
주관하에 완료 보고 또는 대책수립, 계획수정 등을 진행한다.
5.1.2 신제품개발관련 요구사항 파악 및 제조 타당성 확인
(1) 신제품개발관련 요구사항 파악
법규/정부규제 유무파악, 제품도면, 유사품이전개발경험 , 유사품 양산품질문제,
업체선정에 필요한 기준(까다로운 품질 규격고려), 기타 물류/포장/추적성/환경요구
(2) 제조타당성 관리 필요성 확인
각 사업부 개발팀장은 신규 개발 및 설계변경 내용 접수시 제품에 대한 고객 요구사항을
당사에서 충분히 만족할수 있는지를 필히 제조타당성 확인을 작성하여 판단하여야 한다
필요시 고객과 협의 추가적인 설계 변경을 진행하여야 한다
(3) 제조 타당성 검토 항목
각 사업부 개발팀장은 제조타당성 확인시 아래 항목을 참조하여 직성 관리한다.
가. 고객 요구조건 만족 / 나. 기술, 성능 조건 만족 / 다. 제조공차 만족
라. CPK 만족 / 마. 생산 능력 만족 / 바. 자재 취급 기술 만족
사. 법/규제 요구사항 만족
5.1.3 공정설계 및 공정FMEA
(1) 공정설계
가. 각 사업부 개발팀장은 신규 개발품에 대해 MDT요원과 ''공정흐름도''를 작성하고
사양 및 공법을 협의한다.
나. MDT는 개발품에 대해 공정별 생산되는 제품 특성과 관련된 공정변수(전공정 부품
특성, 공정변수, 작업조건, 부재료조건 등)와 상관관계를 분석하여 부품특성을
만족하기 위한 공정관리항목 및 중요도를 설정한다.
(2) 공정FMEA 작성
가. 공정흐름도에서 파악된 중요 공정특성 항목에 대한 각 공정의 기능 및 요구 사항을
파악하고, 공정별 고장형태, 고장영향, 고장원인, 현 공정관리 방법을 기입후, RPN
을 평가하고 RPN값이 "100이상인 항목 및 심각도가 9이상인 항목"에 대해서는 권고
조치사항을 수립하여 RPN지수를 낮추어야 한다. 그 세부 사항은 『공정FMEA 작성
및 관리 지침』에 따른다.
나. MDT는 고객의 특별특성 항목을 FMEA, 관리계획서, 작업표준 작성시 우선적으로
검토하여야 하며, 해당문서에서 특별특성임을 알수 있도록 식별되어야 한다.
특별특성의 식별표시는 부표1의 특별특성 기호에 따른다.
5.1.4 제조설비 제작 및 LAY-OUT 실시
(1) 제조설비 제작
가. 각 사업부 개발팀장은 설계된 사내 공정에 대하여 생산 계획 또는 판매 계획 대비
설비별 생산능력(UPH) 및 부하율을 검토후, 설비의 추가배치를 검토,계획한다.
나. 설비의 추가 제작이 필요하다고 판단되면 MDT를 소집하여 설비제작에 따른
리스크 관리 규정에 따라 리스크를 분석하고 리스크를 완화하기 위한 방법을
설비제작시 반영하여 제작될 수 있도록 한다.
나. 각 사업부 개발팀장은 P1단계 이전에 신규설비의 시운전이 완료될 수 있도록
하며, 치공구, 계측기 등에 대해서는 P1단계 이전에 입고되도록 한다.
(2) 인원 계획
신제품 개발 계획에 따라 추가의 인원 계획이 필요할 경우 단기 및 중장기 투자계획
중 인원계획에 반영하고 사업계획을 수립해야 하며, 긴급한 충원의 필요성이 있을시
각 사업부 생산팀장은 총무팀장과 협의를 거쳐 충원 요청에 따라 충원한다.
(3) LAY-OUT 실시
각 사업부 생산팀장은 신규 설비 및 생산 공정의 흐름, 유틸리티, LINE구성 등을 고려하여
LAY-OUT 도면 및 계획서를 작성하여 효율적인 공정이 되도록 계획하며 투자 개념의
비용이 발생시 품의를 득한다. LAY-OUT 설정시에는 동선의 최적화와 공간 부가가치의
최대한 활용이 되도록 한다.
5.1.5 치공구, 검사구, 계측기 설계 및 제작
(1) 해당팀장은 투자 품의서에 포함된 내용을 기본으로 하여 치공구, 검사구, 계측기
등의 세부사항을 검토한다.
(2) 필요한 경우 내부 검토안을 토대로 외주 설계 제작을 진행한다.
(3) 치공구, 검사구, 계측기등의 구입 및 제작에 따른 상세 내용은 해당 절차에 따른다.
(4) 각 사업부 "생산팀장"은 치공구 제작이 완료되면 당사의 설비 CAPA 및 단가등을 고려하여
필요시, 외주처리하여야 할 품목에 대해서는 등록된 협력업체중 적절한 업체를 선정하여
''부품 개발 요청서''로 외주 개발을 추진한다. 단, 등록되지 않는 협력업체에 개발을
추진하는 경우는 『협력업체 관리 규정』에 따라 업체를 평가하여 등록 후 개발을
추진한다.
5.1.6 용기 제작 또는 구매
(1) 각 사업부 개발팀장은 생산팀에 공정용기 사양 및 고객사에 완성품 용기 사양을 접수하고
관련팀과 협의하여 거래선의 납품단위를 고려 후 공정 및 완제품 포장수량을 결정한다.
(2) 결정된 용기의 사양을 "공정 및 납입용기 설정서"에 정리하여 고객 요청시 고객승인을
득하고, 별도의 승인이 필요 없을 경우 제작 또는 구매한다.
5.1.7 선행양산 관리계획서 작성 및 배포
(1) MDT는 시제품 제작 및 공정성 검토를 위해 초도품의 제작 기간동안에 발생하는
원자재 투입부터 출하에 이르는 전공정의 품질특성, 관리항목을 정하고 이를
관리하기 위한 방법, 사람 등을 지정하여 관리계획서를 작성한다.
(2) 관리계획서 작성시 다음의 내용이 고려되어야 한다.
1) 검사항목과 검사 방법
2) 공정별 사용하고자 하는 설비, 툴, 보조장치
3) 공정이상 발생시 필요한 조치
4) 제품의 특성/품질에 영향을 미치는 공정변수
5) 제품특성과 공정변수에 공차가 반드시 표기
6) 특별특성이 표시되고, 관리도가 제시
(3) 관리계획서에는 FMEA에서 파악된 특별특성 및 관련 공정이 반영되어야 한다.
세부사항은 『관리계획서 작성 및 관리 지침』에 따른다.
5.1.8 TRY-OUT
(1) TRY-OUT 실시
각 사업부 생산팀장은 준비한 원․부자재, 외주품, 치공구 및 검사구의 입고를 확인하고
관련팀의 협조하에 TRY-OUT을 실시한다.
(2) TRY-OUT 문제점 보완
단위 공정 및 작업별로 행한 TRY-OUT결과를 종합 검토하여 설비, 소재, 공정 등에
대한 문제점 발생여부를 검토하여 해당 문제점에 대한 대책회의를 실시하여 개선을
실시한다.
(3) 원/부자재, 외주품, 치공구 및 검사구에 대하여 개발품임을 누구나 알수 있도록 식별 관리를
하여 지정된 보관 장소에 보관하여야 한다.(식별관리 기준은 부표2을 참조한다)
5.1.9 측정시스템 평가
품질보증팀장은 관리계획서에 명기된 계측기에 대해 TRY-OUT시 『측정시스템
평가 지침』에 따라 게이지의 반복성 재현성에 대해 평가를 실시하여 측정의
신뢰성을 확보한다.
5.1.10 치공구 보완 공정개선
각 사업부 생산팀장은 TRY-OUT시 발생된 치공구 및 공정에 대한 불합리한 사항을 PILOT
샘플 생산이 진행되기 이전까지 보완 조치하여, PILOT 생산시에는 보완․개선된 내용이
적용되어야 한다.
5.1.11 검사기준서 작성
품질보증팀장은 도면 및 관리계획서를 참조하여 완성품을 검사하기 위한 ''검사
기준서''를 작성한다.
5.1.12 작업표준 작성 및 배포
각 사업부 생산팀장은 PILOT 생산 및 양산시 작업자가 표준에 준해 작업할 수 있도록
도면, 관리계획서를 근거로 작업표준을 작성 배포한다. 작업표준 작성 및 배포에
대한 세부 사항은 『작업표준 작성 및 관리 지침』에 따른다.
5.1.13 PILOT 생산
(1) PILOT 생산 실시
가. PILOT 생산은 TRY-OUT시 발생된 문제점에 대한 개선조치 확인과 제품 및 부품을
생산하는데 공정의 적합 여부를 확인하고 양산 상황에 준한 제품을 생산함으로서
제품에 대한 고객의 승인과 평가를 받기 위하여 실시한다.
나. PILOT 생산시에는 작업자 배치, 금형, 지그 및 검사구 배치, 원부자재 등 양산에
준한 작업조건이 되어야 한다.
다. 고객승인을 위한 PILOT 생산은 연속 4시간 이상 또는 300EA 이상 LOT가 구성될 수
있도록 한다. (단, 조관 및 인발의 경우 고객 초도 입고 수량 기준 생산으로 한다)
라. 생산 및 관련팀장은 PILOT 생산시 공정능력의 평가, 물류 흐름 파악, 작업조건, 상태
등을 파악하고 그 결과를 정리 및 문제점을 추출해야 한다.
마. 특별특성에 대한 검토결과 관련 고려되어야 할 지침은 아래와 같다.
-.특별특성이 규격을 이탈하는 경우와 조치 기록은 반드시 유지되어야 한다.
-. 특별특성에 대한 품질기록은 반드시 유지되어야 하고, 보존은 별도 고객이
지정하지 않는 한 20년 이상 유지되어야 한다.
바. 각 사업부 개발팀장은 관련팀의 협조를 받아 제작 또는 구매된 공정,납품용기에 대해 운송 중
손상 및 부정적인 환경요소로부터 제품의 보호여부를 평가한다.
(2) PILOT 생산 결과 평가 및 품평회 실시
가. 품질보증팀장은 PILOT 생산 제품에 대하여 관리계획서에 설정된 중요항목에 대해
『공정능력 운영 지침』에 따라 공정능력을 평가하여 Pp 또는 Ppk가 1.67이상
인지를 파악하여 미달시 적절한 대응 방안을 수립한다.
나. 품질보증팀장은 PILOT 생산에 따른 진행시의 공정 문제점에 대해 개선 방안의
수립 및 공정능력에 대한 개선 계획을 수립하여 개선을 시행하여야 한다.
다. 생산팀장은 공정품, 영업팀장은 완제품을 고객과 협의된 포장용기에 적재하여 포장상태에
대한 평가를 실시한다.
5.1.14 양산관리계획서 작성 및 배포
(1) MDT는 품질보증팀장 주관으로 선행양산 관리계획서를 토대로 PILOT 생산 결과에 따른
작업조건 설정 및 관리항목/방법의 변경을 포함한 양산 공정을 관리하기 위한
''양산 관리 계획서''를 작성한다.
(2) 품질보증팀장은 작성된 양산관리계획서를 생산 등 관련팀에 배포한다.
5.1.15 관련 표준류 개정
해당팀장은 양산관리계획서에 따른 작업표준, 검사표준 등 관련 표준을 개정하여
양산작업을 위한 표준화를 한다. 개정된 표준류는 해당 표준 관리 절차에 따라
배포한다.
(1) 관리계획서 : 품질보증팀 (조건 변경사항에 대한 변경 이력사항 포함)
(2) 작업표준서 : 생산관리팀 (품질보증팀 관리계획서 최종본 접구 후 공정 조건 비교 검증 실시)
(3) 검사표준 : 품질보증팀 (관리계획서 및 작업표준서 완료본 기준 작성)
5.1.16 고객승인
품질보증팀장은 PILOT 생산 결과 제품이 공정능력 및 규격을 만족하는 경우
『고객 승인업무 규정』또는 고객의 별도 승인 규정이 있는 경우 해당 절차에 따라
관련팀의 협조를 받아 승인 관련자료를 준비하여 고객에게 승인을 의뢰한다.
5.1.17 개발완료 보고
각 사업부 개발팀장은 P2단계 시험생산 완료후 개발일정 진행 결과에 대한 사항을
취합하여 ''제품 품질계획 요약 및 완료 확인서''에 MDT 인원의 확인을 받아 대표이사
에게 보고하고 개발업무를 종결한다.
5.1.18 양산 시정조치 및 피드백
(1) 품질보증팀장은 초기공정 안정을 위해 중요항목에 대해서는 양산 3개월 이내
관리상태를 확인하여 공정능력(Cpk)을 파악하고 관리이탈 또는 공정능력
미달시 각 사업부 생산팀에 시정조치될 수 있도록 조치하여야 한다.
(2) 품질보증팀장은 반기별로 품질현황을 관리하여 효율향상 계획 및 부적합품에
대한 시정 및 예방 조치를 하여야 한다.
(3) 각 사업부 영업팀장은 『고객만족도 관리 규정』의 절차에 따라 고객불만 처리 및
고객 만족도 조사를 실시하여 품질등급, 품질지수를 파악한다.
(4) 각 사업부 영업팀장은 인도 및 서비스 단계의 문제를 해결하고, 지속적 개선을 위해
고객과 협력관계를 유지한다. 또한 고객의 교체부품 공급시에는 품질,납기,비용을 고려
한다.
5.2 고객이나 타 기업으로부터 양산품 이관받는 경우
5.2.1 이관일정 협의
각 사업부 개발팀장은 고객이 금형, 지그 또는 설비에 대한 개발을 완료 양산 중 업체
변경으로 당사에 이관하는 경우 고객과 이관 일정계획 및 향후 추진일정을 협의한다.
5.2.2 공장 LAY OUT 설정
(1) 각 사업부 생산팀장은 관련팀의 협조를 받아 이관될 품목의 설비/지그 및 공정흐름,
유틸리티, LINE 구성 등을 고려하여 효율적인 공정이 되도록 LAY-OUT도를 작성한다.
(2) LAY-OUT 설정시에는 물류의 흐름을 고려한 동선의 최적화와 공간 부가가치의 최대한
활용이 되도록 한다.
5.2.3 TRY-OUT 일정 계획 수립
각 사업부 개발팀장은 MDT회의 소집하여 MDT요원과 고객의 양산요청시점을 고려한
이관될 제품에 대한 TRY-OUT, 측정시스템 평가 계획, 공정능력평가 계획을 포함한 양산
적용까지의 일정을 “개발품 TRY-OUT 일정계획서”에 수립하여 대표이사의 승인을
받는다.
5.2.4 개발품 이관 접수
(1) 개발품 관련 금형 및 지그/설비가 이관될 경우 각 사업부 개발팀장 및 MDT요원의 업무는
다음과 같다.
개발담당 : 도면접수, 설비&지그&금형 T/O 주관 및 이력카드 접수, 사급자재 현황파악,
특별특성 목록, 공정FMEA SHEET, 기타 개발관련 서류 접수
영업담당 : 납품용기 확인
품질담당 : 공정흐름도. 관리계획서, 검사기준서, 검사성적서 접수
5.2.5 특별특성 파악
품질보증팀장은 MDT요원과 고객의 특별특성 및 관리계획서를 참조하여 안전,성능
및 조립에 영향을 미치는 특별특성을 파악하여 ''특별특성 목록표''를 작성한다.
5.2.6 선행양산 관리계획서 작성 및 배포
(1) 품질보증팀장은 MDT와 특별특성목록표 및 고객으로부터 접수받은 자료를 참조하여
TRY-OUT을 관리하기 위한 관리계획서를 작성하여 관련팀에 배포한다.
(2) 관리계획서에 검사 및 시험을 위한 추가적인 계측 및 시험 설비가 있는 경우『계측기
관리 규정』의 절차에 따라 확보한다.
5.2.7 1차 TRY-OUT 실시
(1) 각 사업부 생산팀장 주관하에 고객 및 관련팀의 협조를 받아 금형 및 지그/설비의
작동성, 양산성 및 SPEC 만족여부에 대해 1차 TRY-OUT을 실시하여 ''TRY-OUT 결과
보고서''를 작성한다.
(2) TRY-OUT 실시 결과 문제점이 발생할 경우 각 사업부 생산팀장은 고객에게 통보하여
조치될 수 있도록 한다.
5.2.8 측정시스템 평가
품질보증팀장은 관리계획서에 명기된 계측기에 대해 측정자를 선정하고
『측정시스템 평가 지침』의 절차에 따라 게이지의 반복성 및 재현성에 대해 평가를
실시하여 측정의 신뢰성을 확보한다.
5.2.9 검사기준서 작성
(1) 품질보증팀장은 도면 및 관리계획서를 참조하여 완성품을 관리하기 위한 “검사
기준서“를 작성한다.
(2) 고객이 검사기준을 작성하여 배포한 경우 고객의 ''검사기준서''를 그대로 활용한다.
5.2.10 작업표준 작성 및 교육
(1) 각 사업부 생산팀장은 1차 TRY-OUT 결과를 토대로 관리계획서를 참조하여 2차 TRY
-OUT 및 양산시 작업자가 표준에 준해 작업을 할 수 있도록 작업표준을 작성, 배포한다.
(2) 각 사업부 생산팀장은 각 공정별 작업자를 배치하고 작업표준에 준한 작업방법에 대해
교육을 실시한다.
5.2.11 2차 TRY-OUT 실시 및 공정능력 평가
(1) 2차 TRY-OUT의 주관은 각 사업부 생산팀장이 되며, 관련팀의 협조를 받아 2차 TRY
-OUT을 실시한다. 2차 TRY-OUT은 공정의 안정상태 평가와 1차 TRY-OUT시 문제점을
개선하는데 주목적이 있다.
(2) 2차 TRY-OUT은 연속 4시간 이상 또는 300EA 이상 LOT가 구성될 수 있도록 한다.
(3) 품질보증팀장은 2차 TRY-OUT이 완료되면 관리계획서에 설정된 항목에 대해 검사
및 시험을 실시하여 검사성적서를 작성하고, 중요항목(특별특성 항목)에 대해서는 공정
능력 평가를 실시하여 초기공정능력이 1.67이상 확보되는지를『공정능력 관리 지침』
에 따라 파악한다.
(4) 공정능력 평가 결과 공정능력 미달시 이에 따른 적절한 대응방안을 수립하고, 공정
능력이 충분한 경우 고객과 협의된 납품용기에 적재하여 포장상태에 대한 평가를
실시한다.
5.2.12 양산관리계획서 작성 및 배포
(1) MDT는 품질보증팀장 주관으로 선행양산 관리계획서를 토대로 2차 TRY-OUT 결과에
따른 작업조건 설정 및 관리항목/방법의 변경을 포함한 양산 공정을 관리하기 위한
''양산 관리 계획서''를 작성한다.
(2) 품질보증팀장은 작성된 양산관리계획서를 생산 등 관련팀에 배포한다.
5.2.13 관련 표준류 개정
관련팀장은 양산관리계획서에 따른 작업표준, 검사표준 등 관련 표준을 개정하여
양산작업을 위한 표준화를 한다. 개정된 표준류는 해당 표준 관리 절차에 따라
배포한다.
5.2.14 고객승인
품질보증팀장은 2차 TRY-OUT 결과 공정능력이 만족되는 경우『고객승인업무
규정』또는 고객의 별도 승인 규정이 있는 경우 해당 절차에 따라 관련팀의 협조를
받아 해당 자료를 준비하여 고객에게 승인을 의뢰한다.
5.2.15 완료 보고
(1) 각 사업부 개발팀장은 이관된 품목에 대한 TRY-OUT 결과를 정리하여 ''개발품 TRY-OUT
완료 보고서''로 TRY-OUT 진행 경과, 제품품질 계획 요약, TRY-OUT 진행시 문제점 및
조치사항을 정리하여 관련 MDT 인원의 확인을 받아 대표이사에게 보고한다.
(2) 해당팀장은 고객으로부터 이관받은 금형 및 설비/지그 및 검사구에 대해 고객지급품임을
알 수 있도록 하고, 이력카드를 작성하여 해당 업부 절차에 따라 관리될 수 있도록 한다.
5.2.16 양산 시정조치 및 피드백
(1) 양산전에 이관활동이 "양산이관 기준"에 따라 진행되어야 하고, 이관이후에도 잔여문제에
대하여는 개선대책과 담당자 지정, 완료예정일이 포함된 계획서를 작성하고 개발담당은
지속적으로 관리하고 주간업무보고에서 사업부장에게 보고하여야 한다.
(2) 양산 첫로트 출하를 위하여는 품질보증팀장의 동의가 요구된다. Pilot생산에서 발견된
문제점들에 대하여는 수정 보완이되어 있는지 확인하고 기록이 유지되어야 한다
(3) 품질보증팀장은 초기공정 안정을 위해 중요항목에 대해서는 양산 3개월 이내 관리
상태를 확인하여 공정능력조사(Cpk)능력을 파악하고 관리이탈 또는 공정능력 미달시
시정조치될 수 있도록 조치하여야 한다.
(4) 품질보증팀장은 반기별로 품질현황을 관리하여 효율향상 계획 및 부적합품에 대한
시정 및 예방 조치를 하여야 한다.
(5) 각 사업부 영업팀장은 고객만족규정의 절차에 따라 고객불만 처리 및 고객 만족도
조사를 실시하여 품질등급, 품질지수를 파악한다.
(6) 각 사업부 영업팀장은 인도 및 서비스 단계의 문제를 해결하고, 지속적 개선을 위해
고객과 협력관계를 유지한다. 또한 고객의 교체부품 공급시에는 품질, 납기, 비용을
고려한다.', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '6. 관련표준', '(1) 공정 FMEA 작성 및 관리 지침 (J-1101)
(2) 관리계획서 작성 및 관리지침 (J-1102)
(3) 작업표준작성 및 관리지침 (J-1103)
(4) 설비관리규정 (L-1100)
(5) 치공구 관리 규정 (L-1200)
(6) 계측기 관리 규정 (L-3100)
(7) 측정시스템분석 지침 L-3101)
(9) 공정능력 관리지침 (L-4202)
(10) 도면관리규정 (J-2100)
(11) 고객 만족 관리 규정 (H-3200)
(12) 리스크 관리 규정 (A-8100)', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1100', '7. 관련양식', '(1) 개발일정 계획서 (J1100-01)
(2) 공정흐름도 (J1100-02)
(3) 특별특성 목록표 (J1100-03)
(4) 부품개발 요청서 (J1100-04)
(5) 제품 품질계획요약 및 완료확인서 (J1100-05)
(6) 개발품 TRY-OUT 일정 계획서 (J1100-06)
(7) 개발품 TRY-OUT 완료 보고서 (J1100-07)
(8) 공정 및 납입용기 설정서 (J1100-08)
(9) 제조타당성 확인서 (J1100-09)
(10) 제품 법_규제 요구사항 목록표 (J1100-10)
(11) PM 및 MDT 선정기준 (J1100-11)
(12) 에스켈레이션 기준 (J1100-12)
(13) 양산 이관 기준 (J1100-13)
(14) 고객 접수 도면 검토서 (J1100-14)
부표1. 특별특성 기호
합리적으로
예상되는 산
각하게 영향
을 미치지 않
는 제품특성
검증이 강제
적으로 요구
요소
※부표2 : 개발품 식별표
개발품 식별표

[표]
특성구분 | GM | 포드 | 크라이슬러 | ㈜TPC
정의: | 포가 제품의
핵심적이지 | 안전,정부법
않은 특성 | 규에 적합,장 | 사용되지 않음 | 사용되지 않음 | 사용되지 않음
"규격" | 착/기능에 심
명명법 기호 | 규격 없음
합리적으로 | 공정이 관리 | 되지만 운영
예상되는 산 | 되고 따라서 | 공정관리는 | 장착,기능,
포가 장착,기 | 고객만족 및 | 공정 안정성, | 자동적으로 | 외관과 같은
정의: | 능,탑재,외 | 관리계획서에 | 능력과 부품 | 요구되지 않 | 고객 만족 및
핵심 특성(안 | 관 또는 축조 | 포함되어야 할 | 의 수명을 위 | 는(생산) 부 | 품질 계획활
전 혹은 법적 | 와 같은 제품 | 품질계획 활동 | 한 관리를 측 | 품도면,공구, | 동에 중요한
인 고려와 관 | (S/C와는 다 | 에 중요한 제 | 정하기 위해 | 치구 및 공구 | 공정,시험에
련되지 않은) | 른)에 대한 고 | 품 및 공정, | SPC를 필요 | 보조물 절차 | 대한 요구사
객의 만족에 | 시험에 대한 | 로하는 특별 | 들의 현저히 | 항
심각하게 영 | 요구사항 | 하고 매우 중 | 부각되는 매
향을 미치는 | 요한 특성을 | 우 중요한 특
제품 특성 | 나타낸다. | 성들에 한한다
특성구분 | GM | 포드 | 크라이슬러 | ㈜TPC
장착/기능 - | SIGNIFICANT | DIAMOND | PENTAGON- | 장착,기능,품질
명명법 기호 | <F/F> | 특성 - S/C | <D> | <P>
◇ | 없음 | ◇ | ◇ | ◈
합리적으로 | 정부법규 또
예상되는 편 | 는 안전한 차
차가 제품의 | 량/제품기능
안전 또는 정 | 의 적합함에 | 정부법규에
부 법규 적합 | 영향을 미칠 | 안전특성은 정부의 차량 안 | 저촉될수 있
정의: | 성(예:가연성, | 수 있으며 특 | 전,배기,소음 또는 도난방 | 는 배기 가스
핵심 특성(안 | 운전자 보호, | 정 생산자,조 | 지 요구사항과 적합함을 보 | 누설,소음 및
전 또는 법적 | 핸들조종,제 | 립,출하 또는 | 장하는 특별한 제조관리를 | 고객이 요구
인 고려와 관 | 동등과 같은), | 감시활동 및 | 필요로 하는 구성품 자재, | 하는 주파수
련된) | 배기,소음, | 관리계획서에 | 조립운영에 적용되는 엔지 | 특성등의 제
라이도주파 | 의 포함을 필 | 니어링 지정사양 또는 제품 | 품 특성 사항
수 간섭 등에 | 요로하는 제 | 요구사항으로서 정의된다. | 및 영향을 줄
심각하게 영 | 품요구사항( | 수 있는 공정
향을 미치는 | 치수,사양시 | 요소
제품 특성 | 험)또는 공정
안전/적합성 | 치명적 특성 | SHIELD - <S>
명명법 기호 | - <S/C> | - CC
▽ | ▩ | ☆
품 명 | 제품 품명 또는 프로젝트명 기록
품 번 | 제품 품번(ISIR제출 기준) 기록
상 태 | 시작샘플 / P1샘플 / P2샘플
수 량 | 잔량 또는 이동 수량 기록', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1100' AND sort_order = 7);

-- ── J-1101 (5p · REV.6 · 2025-06-13) 13섹션 ──
DELETE FROM regulation_sections WHERE reg_code = 'J-1101';
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '(서두)', '공정 FMEA 작성 및 관리 지침 · 문서번호 TPC - J - 1101 · 개정 REV.6 · 재·개정일 2025-06-13
개정이력 | 개정
번호 | 재,개정일(시행일자) | 재,개정사유 및 내용
0 | 2004-08-30 | ISO/TS 16949:2002 추진에 따른 전면 개정
1 | 2009년 8월 1일 | 조직개편(TPC+코디박)에 따른 개정 및 오기수정
ISO/TS 16949 : 2009 개정요건 반영
2 | 2010년 4월 1일 | ㈜TPC 윤리행동규범 제정,공포
3 | 2018-01-02 | ISO/TS16949 : 2009 → IATF16949 : 2016 (International Automotive Task Force 16949: 2016) 전환에 따른 전면 개정
4 | 2020-08-03 | ISO14001 인증범위 변경에 따른 매뉴얼 갱신
(파이프의 생산 및 부가서비스 → 파이프의 생산 및 가공)
5 | 2023-05-01 | 2.3공장 양산이후 원격지원 기능 발생
6 | 2025-06-13 | 심각도, 발생도, 검출도 기준 개정 (FMEA 4판 기준)
주관부서 | 필라넥워터 사업부 개발팀
승인 | 구 분 | 작 성 | 검 토 | 검 토 | 승 인 | 배포처
직 책 | 이 사 | 사업부장 | 사 장 | 회 장 | 사내 Network
공유
성 명 | 김필수 | 김상은 | 노영길 | 이정훈
서 명 | Sign | Sign | Sign | Sign
일 자 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13
작성 사업부 & 부서 & 작성자
작 성 자
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
정밀인발튜브 사업부 개발영업 이기식
필라넥워터 사업부 개발 이백범
필라넥워터 사업부 개발 이백범
필라넥워터 사업부 개발 이백범
필라넥워터 사업부 개발 김필수
협의부서 | 주관부서 제외 전부서
협의 | 구 분 | 정밀인발 | 정밀강관 | A/M | 쇼바용접 | 구매 | 경영관리 | 기술연구소 | 비 고
직 책 | 사업부장 | 사업부장 | 사업부장 | 사업부장 | 팀 장 | 팀 장 | 연구소장
성 명 | 김영동 | 이석태 | 서상규 | 김상은 | 이인창 | 김병철 | 박주돈
서 명 | Signed | Signed | Signed | Signed | Signed | Signed | Signed
일 자 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13 | 2025-06-13', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 0);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '1. 적용범위', '이 지침은 신규개발 또는 제품변경, 공정변경품의 공정 FMEA 운영에 적용한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 1);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '2. 목적', '제품의 공정설계를 하는 시점에서 제품 생산 및 사용시 잠재적으로 예상되는 문제점에
대하여 각 팀간의 노하우를 집결하여 보완 사항들을 발견, 대책을 세우고 검증 조치함으
로써 최적의 기능을 발휘할 수 있는 제품 개발에 목적이 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 2);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '3. 용어의 정의', '3.1 FMEA
FMEA란 FAILURE MODE and EFFECTS ANALYSIS(불량 형태 영향 분석)의 약호이며 설계된
도면으로부터 예상되는 불량 형태와 그 불량으로 인하여 제품 기능에 미치는 영향을
분석하고 또한 가상된 불량의 발생 원인을 해석하여 그 고장의 감지 방법을 미리 검토하고
우선 중요 문제에 대한 개선 조치를 하는 것이다.
3.2 고장형태 용어
FMEA 내 잠재적 고장 형태 용어는 "부표 5 고장형태 용어집" 기준으로 작성한다.
고장형태 용어에 대하여 "부표4"내 고장형태 용어집에 없는 품질문제 발생시 품질 담당자는
즉시 개발 담당자에게 통보하여 "고장형태 용어집"을 개정하여야 한다', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 3);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '4. 책임과 권한', '공정FMEA의 주관팀은 개발팀이다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 4);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '5. 업무 절차', '↓
↓
↓
↓
↓
NO

[절차 흐름도]
책임(●) / 협조(→/←) | 절 차 | 문서(●) / 기록(→/←)
(●) 각 사업부 개발팀장 | 자료준비 | (←)유사 FMEA/공정흐름도
(←)승인도면,특별특성목록
(●) MDT | FMEA 실시 회의 소집 | (→)예비공정흐름도
(●) MDT | 특별특성 검토 및 결정 | (← )특별특성 목록표
(●) MDT | FMEA 실시 | (→)공정-FMEA SHEET
(●) 해당팀장 | 권고조치 실시 | (→)공정-FMEA SHEET
(●) MDT/관련팀장 | 후속조치 | (→)공정-FMEA SHEET
(→)조치내역', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 5);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '6. 세부 절차', '6.1 FMEA의 일반사항
6.1.1 구성
특별히 지정되지 않는 경우 각 사업부 개발팀장이 MDT장을 겸임하며, MDT에는 MDT장을
포함하여 FMEA 개발에 필요한 생산,품질,생기,영업,자재 등 부서의 실질적이고 직접적인
대표자로 구성되는데 협력업체 및 고객 요구시 고객의 인원도 참여가 가능하다.
6.1.2 책임과 권한
(1) MDT장은 FMEA를 관련 기능부문들 사이에서 아이디어를 상호 교환시키고 팀 활동을
장려하는 촉매 역할로 삼을수 있도록 감독할 책임이 있으며, 팀의 지명도/불량 가능성
/검출도 및 RPN에 대한 결정권이 있다.
(2) MDT는 FMEA 결과 RPN 및 지명도가 높은 항목에 대하여 합의에 의해 중요 항목으로
선정 관리하고 문서가 계속적으로 살아 있는 문서가 되도록 활용한다.
6.2 FMEA자료 준비
MDT장은 제품공정기획단계 또는 제품설계 변경단계에서 FMEA의 실시를 위한 다음
사항을 준비하도록 한다.(필요시 관련팀에 자료를 요청한다)
6.2.1 예비 공정흐름도(PRE-제조공정도)
6.2.2 특별특성 목록 및 이력
6.2.3 동일/유사제품의 PFMEA 실적자료
6.2.4 동일/유사제품의 공정설계 및 개발 정보(성공사례,실패사례,벤치마킹자료,공정능력,
생산성 자료,고객만족/불만족 자료 등)
6.2.5 동일/유사제품의 품질이력 정보
6.2.6 고객 및 법규 요구사항(계약검토자료, 포장/인도 관련정보, 안전, 환경 등)
6.2.7 제품설계 정보(도면 등), 제품샘플 등
6.4 FMEA 회의 실시 및 MDT 소집 통보
MDT장은 FMEA 실시를 위한 소집을 위하여 다음사항을 포함하는 협조전을 작성하고
사업부장의 승인 후 사전에 관련팀에 통보한다.
(1) 회의 주제 및 장소, 일시/시간
(2) 팀별 참석자 및 사전 준비자료
6.5 특별특성 검토 및 결정
6.5.1 MDT장은 MDT활동을 통하여, 준비된 예비 특별특성 목록표를 재검토하고, MDT의견을
수렴하여 조정, 확정한다.
6.5.2 특별특성에 관련한 부품은 반드시 FMEA 실시대상 품목으로 선정한다.
6.6 FMEA 대상 품목 및 해석 레벨 결정
6.6.1 개발팀장은 MDT활동을 통하여, 예비 제조공정도 상의 공정구성을
재검토한다.
6.6.2 PFMEA는 예비 제조공정도 상의 전 공정을 대상으로 함을 원칙으로 한다.
단, 동일/유사제품에 대한 PFMEA 실시경험으로 대체할 수 있는 경우, MDT를 통한
제외결정을 할 수 있다.
6.6.3 개발팀장은 MDT활동을 통하여, 특별 제품특성 목록검토 및 예비 공정흐름도 상의
특별 공정특성을 재검토하고, MDT의견을 수렴하여 조정, 확정한다.
6.6.4 특별 제품특성 관련 공정은 반드시 PFMEA 실시대상 공정으로 선정한다.
6.7 FMEA실시 대상품목별 고장형태 예측
6.7.1 MDT장은 MDT활동을 통하여 파악된 FMEA실시 대상부품별로 예측되는 고장형태를
다음을 참조하여 도출한다.
(1) 과거의 고장 발생 경험, 부적합보고서(NCR), 고객만족/불만족 정보
(2) 경쟁사, 선진사의 동일/유사제품에 관한 실패정보 및 기술정보
(3) 특정 작동 및 사용조건하에서의 예측되는 고장발생 가능성 등
6.7.2 잠재적인 고장형태는 특정항목, 기능에 있어서 하나 또는 해당시 다수의 고장형태를
나열한다.
6.8 잠재적 고장형태별 영향분석
6.8.1 MDT장은 MDT활동을 통하여 파악된 부품별,잠재적 고장형태별로 차량기능,인명상해,
법규위배,조립성 영향,고객불만족 영향의 정도를 도출, 분석한다.
6.8.2 잠재적 고장형태로 인한 각각의 잠재적 영향은 단품-부품/조립품/기능품-구성품-
서브시스템-시스템으로 미치는 영향의 관계를 고려하여 작성한다.
6.9 잠재적 고장형태별 고장의 잠재적 원인/매카니즘 분석
6.9.1 MDT장은 MDT활동을 통하여, 파악된 각각의 잠재적 고장형태별로 이러한 고장형태의
추정원인을 도출한다.
6.9.2 고장형태의 잠재적 원인 및 매카니즘은 각 기능팀 전문가들의 의견을 가능한 간결,
명확,완전하게 기술한다.
6.10 현 적용 관리 방법의 기술
6.10.1 파악된 고장형태, 원인 및 매카니즘에 대한 타당성을 확보하기 위하여 현재
적용하고 있는 수단, 활동들을 기술한다.
6.10.2 적용 관리 방법의 전형적인 관리형태의 예는 다음과 같다.
(1) 에러/실수방지
(2) SPC
(3) 검사 및 시험
(4) 공정심사활동 등
6.11 정량분석 실시
6.11.1 MDT는 파악된 잠재적 고장형태에 대한 가장 심각한 영향과 관련된 심각도(S)
등급을 (부표1)에 의거, 각 고장 형태별로 기술한다.
6.11.2 MDT는 파악된 잠재적 고장형태에 대한 고장의 잠재적 원인/매카니즘별 발생가능성
등급을 (부표2)에 의거, 결정하고 발생도(O)란에 기술한다.
6.11.3 MDT는 파악된 현 적용 공정관리 방법으로 가장 좋은 검출가능성과 관련된 검출도(D)
등급을 (부표 3)에 의거 결정하고 기술한다.
6.12 1차 RPN 산출 및 위험수준 결정
6.12.1 MDT장 및 MDT는 (부표1,2,3) 기준으로 산출된 각각의 심각도(S),발생도(O),검출도(D)를
곱하여 위험우선순위(Risk Priority Number:RPN)를 산출한다.
6.12.2 심각도(S),발생도(O),검출도(D)가 각 9 이상이거나 RPN 100 이상인 항목은 권고조치
대상항목으로서 적색다이아몬드(◇)기호로 식별표시한다(단, RPN 및 각 단위 평가
지수는 개선에 따라 조정가능하다)
6.13 권고조치의 계획 및 실행
6.13.1 MDT장 및 MDT는 상기 6.12.2항에서 도출된 권고조치항목에 대하여 종합적 위험성의
크기(RPN지수), 각각의 심각도(S), 발생도(O), 검출도(D)의 등급을 감소시키기 위해
다음사항을 포함하는 개선활동에 한다.
(1) 시정조치 및 예방조치 대상 항목별 방법 및 조치완료일자
(2) 시정조치 및 예방조치 대상 항목별 책임자
6.13.2 MDT장은 상기 개선활동을 모니터링 및 확인하고 조치가 완료된 후 MDT를 재 소집
하여 RPN 재 산출을 포함하여 FMEA를 개정한다.
6.13.3 MDT장은 FMEA 요구수준이 충족됨을 보장하여야 하며 낮은 등급의 항목이라 하더라도
가능한 개선조치를 실시한다.
6.14 후속조치
MDT장 및 MDT는 FMEA 결과로 도출되고 개선된 다수의 권고조치 실시 성과를 관련
문서에 반영되도록 하고 각 팀 담당인원의 교육을 포함한 팀별 후속활동을 주관한다.
(1) 제조공정도(공정흐름도)
(2) 관리계획서
(3) 특별특성 관련문서
(4) 작업표준서 등', 6
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 6);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '7. 관련표준', '(1) 개발 업무 규정 (J-1100)', 7
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 7);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '8. 관련양식', '(1) 공정 FMEA SHEET (J1101-01)', 8
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 8);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '9. 부표', '(1) 심각도 기준 (부표 1)
(2) 발생도 기준 (부표 2)
(3) 검출도 기준 (부표 3)
(4) 조치 우선 순위 기준 (부표 4)
(5) 고장형태 용어집 (부표 5)', 9
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 9);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '[부표] 부표1,2,3_심각도_발생도_검출도 기준', '심각도 평가기준 (S)
영 향 | 기준 : 제품에 대한 영향의 심각도 (고객 영향) | 등 급 | 영 향 | 기준 : 제품에 대한 영향의 심각도
(제조/조립 영향)
안전 및/ 또는 규제 요구
사항을 충족시키지 못함 | 잠재적 고장형태가 경고 없이 자동차 안전 운행에 영향을
미치거나, 정부 법규에 대해 불일치 사항을 포함한다. | 10 | 안전 및/ 또는 규제 요구
사항을 충족시키지 못함 | 경고없이 작업자(기계 또는 조립)를 위험에
빠뜨릴 수 있다
잠재적 고장형태가 경고를 하면서 자동차 안전운행에 영향을 미치거나, 정부 법규에 대해 불일치 사항을 포함한다. | 9 | 경고를 하면서 작업자(기계 또는 조립)을 위험에
빠뜨릴 수 있다
주요 기능 상실
또는 저하 | 주요 기능 상실
(자동차 작동 불능, 자동차 안전운행에 영향을 미치지 않는다) | 8 | 중대한 생산 중단 | 제품을 100% 폐기할 수 있다.
라인 가동을 중단하거나 선적 중단
주요 기능 저하 (자동차가 작동하지만, 성능 수준이 떨어짐) | 7 | 현저한 생산 중단 | 양산된 제품의 일부를 폐기할 수 있다. 라인속도 감소 또는
인력 충원을 포함한 주요 고정과의 편차
보조 기능의 상실
또는 저하 | 보조 기능 상실
(자동차가 작동하지만, 안락하고 편안한 기능 불능) | 6 | 보통의 생산 중단 | 양산된 제품 100%가 라인 밖에서 재작업되고
합격되도록 할 수 있다.
보조 기능 저하 (자동차가 작동하지만, 성능 수준의 감소로 안락하고 편안한 기능 수준이 떨어짐) | 5 | 양산 제품의 일부가 라인 밖에서 재작업되고
합격되도록 할 수 있다.
고객 불편
(Annoyance) | 외관 또는 들리는 소음, 자동차 작동 가능, 품목이 안락하지
않고 대부분의 고객에 의해 인지됨 (〉75%) | 4 | 보통의 생산 중단 | 양산된 제품 100%가 작업자 내에서 재작업되고
다음 공정으로 이동할 수 있다.
외관 또는 들리는 소음, 자동차 작동 가능, 품목이 안락하지
않고 많은 고객에 의해 인지됨 (50%) | 3 | 양산 제품의 일부가 작업장 내에서 재작업되고
다음 공정으로 이동할 수 있다.
외관 또는 들리는 소음, 자동차 작동 가능, 품목이 안락하지
않고 예민한 고객에 의해 인지됨 (〈 25%) | 2 | 경미한 생산 중단 | 공정, 오퍼레이션, 또는 작업자에게 경미한 불편
영향 없음 | 인지할 수 있는 영향 없음 | 1 | 영향 없음 | 인지할 수 있는 영향 없음
발생도 평가기준 (O)
고장 가능성 | 기준 : 원인의 발생도 - 공정 FMEA (부품/차량별 고장 건수) | 등 급
매우 높음 | 1,000개 당 100개 이상 / 10개 중 1개 이상 | 10
높 음 | 1,000개 당 50개 / 20개 중 1개 | 9
1,000개 당 20개 / 50개 중 1개 | 8
1,000개 당 10개 / 100개 중 1개 | 7
보 통 | 1,000개 당 2개 / 500개 중 1개 | 6
1,000개 당 0.5개 / 2,000개 중 1개 | 5
1,000개 당 0.1개 / 10,000개 중 1개 | 4
낮 음 | 1,000개 당 0.01개 / 100,000개 중 1개 | 3
1,000개 당 0.001개 / 1,000,000개 중 1개 | 2
매우 낮음 | 예방관리를 통해 고장이 제거됨 | 1
검출도 평가기준 (D)
검출 기회 | 기준 : 공정관리에 의한 검출 가능성 | 등급 | 검출 가능성
검출 기회 없음 | 현 공정관리 없음. 검출할 수 없음 또는 분석되지 않음 | 10 | 거의 불가능
어떤 단계에서도
검출될 가능성 적음 | 고장형태 및 /또는 에러(원인)가 쉽게 검출되지 않음 | 9 | 매우 희박
공정완료 후 문제 검출 | 작업자가 시각/촉각/청각을 통해 공정완료 후 고장형태 검출 | 8 | 희 박
공정에서 문제 검출 | 작업자가 시각/촉각/청각 수단을 이용해 작업 위치에서 고장형태 검출 또는 공정완료 후 계수치 게이지를 이용한
검출 (GO/NO게이지, 수작업 토오크 체크, 클리커 렌치 등) | 7 | 매우 낮음
공정 후 문제 검출 | 작업자가 계량치 게이지를 이용하여 공정완료 후 고장형태 검출 또는 계수치 게이지를 이용해 작업 위치에서
작업자에 의한 검출 (GO/NO게이지, 수작업 토오크 체크, 클리커 렌치 등) | 6 | 낮 음
현장에서 문제 검출 | 작업위치에서 계량치 게이지를 이용하는 작업자에 의해 또는 부적합한 부품을 검출하여 작업자에게 통지하는
작업위치의 자동화된 통제(빛, 버져 등)에 의해 고장형태 또는 에러(원인) 검출, 셋업상에서 수행된 게이지 측정 및
초물(셋업 원인에 대해서만) | 5 | 보 통
공정 후 문제 검출 | 서로 어긋나는 부품을 검출하고 더 이상의 공정 진행을 막기위해 스테이션에서 부품을 자동적으로 차단하는 자동화된 관리에 의한 공정 후 고장형태 검출 | 4 | 다소 높음
현장에서 문제 검출 | 서로 어긋나는 부품을 검출하고 더 이상의 공정 진행을 막기위해 스테이션에서 부품을 자동적으로 차단하는 자동화된 관리에 의한 스테이션 내 고장형태 검출 | 3 | 높 음
에러 검출 및 /또는
문제 예방 | 에러를 검출하고 서로 어긋나는 부품의 생산을 예방하는 자동화된 관리에 의한 스테이션 내 에러(원인) 검출 | 2 | 매우 높음
검출 해당사항 없음,
에러 예방 | 픽스쳐 설계, 기계 설계 또는 부품 설계의 결과로서의 에러(원인) 예방. 서로 어긋나는 부품은 만들어질 수 없는데,
그 이유는 부품이 공정/제품 설계에 의해 에러가 방지되었기 때문이다. | 1 | 거의 확실', 10
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 10);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '[부표] 부표4_조치 우선순위 기준', 'FMEA 우선 조치 순위 (AP)
조치 우선순위는 리스크 감소를 위한 조치의 우선순위를 정하기 위해 심각도, 발생도 및 검출도
등급의 조합을 기반으로 한다, | 사용자가
기입할 때
까지 빈칸
영향 | S
(심각도) | 발생한 고장
원인 예측 | O
(발생도) | 검출 능력 | D
(검출도) | 조치
우선순위
(AP) | 의견
제품 또는 공장
영향 매우 높음 | 9-10 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | M
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
제품 또는 공장
영향 높음 | 7-8 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | M
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | M
높음 | 2-4 | M
매우 높음 | 1 | M
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
설계 FMEA 및 공정 FMEA에 대한 조치 우선 순위 (AP)
조치 우선순위는 리스크 감소를 위한 조치의 우선순위를 정하기 위해 심각도, 발생도 및 검출도 등급의 조합을
기반으로 한다, | 사용자가
기입할 때
까지 빈칸
영향 | S
(심각도) | 발생한 고장
원인 예측 | O
(발생도) | 검출 능력 | D
(검출도) | 조치
우선순위
(AP) | 의견
제품 또는 공장
영향 중간 | 4-6 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | M
매우 높음 | 1 | M
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | M
매우 높음 | 1 | L
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
제품 또는 공장
영향 닞음 | 2-3 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
식별 가능한
영향이 없음 | 1 | 매우 낮음
- 매우 높음 | 1-10 | 매우 높음 - 매우 낮음 | 1-10 | L', 11
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 11);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '[부표] 부표5_고장형태 용어집', '고장 형태 용어집
고장형태 용어 | 용어 설명
CRACK | 파이프 비드부(용접부) 입열량 부족, 용접된 현상
공인발 | 원소재 내경부 플러그 미 규제 상태 인발로 내경 치수 미 변화 현상
찍힘 | 원소재 및 인발공정 취급상 이물질(칩등)에 의한 표면 눌림 현상
확관부 터짐 | 다단확관 과정 화관부 이물질, 연신 한계로 인한 터짐 현상
컬링량 부족 | 절단길이 부족으로 인한 확관 후 컬링 펀치시 파이프 규제부 부족 현상
가스 누기 | 필라넥 외관 CRACK등으로 인하여 연료 및 연료 가스가 외부로 누출되는 현상
리테이너 압입난이 | 필라넥 확관부 내경 치수 미달로 인한 내경부 삽입 리테이너 삽입 어려운 현상
서포터 체결 불량 | 확관부 외측 서포터 체결 규제 엠보 각도 및 거리 SPEC이탈로 인한 체결 불가 현상
주유건 삽입 불량 | 리테이너 위치 및 확관부 길이 부족으로 인한 주유건 안착 안되는 현상
유분 잔존 | 탈지공정 세척 미흡으로 인한 방청유, 확관유등이 제품 표면에 잔존하는 현상
이물질 잔존 | 탈청공정 미흡으로 인한 제품 표면 용접 스켈등이 제품 표면에 잔존하는 현상
미 코팅 불량 | 탈지 및 탈청 미흡 상태 디핑, 건조시 제품 표면 도막두께 미형성 현상
액고임 불량 | 제품 탈루 후 터치업 미흡으로 제품 표면에 도막 뭉침, 흐름자국등에 대한 현상
경화조건 | 표면처리 도막 건조를 위한 건조 조건', 12
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 12);
INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'J-1101', '[부표] 부표) 심각도_발생도_검출도_조치 우선순위 기준표 (2', '제품 일반 평가 기준 심각도 (S)
잠재적 고장 영향은 아래 기준에 따라 평가된다. | 사용자가
기입할 때
까지 빈칸
S | 영 향 | 심각도 기준 | 공동 또는
제품
라인 예시
10 | 매우 높음 | ▶해당 자동차 및 또는 다른 자동차의 안전한 운행, 운전자, 승객 또는 도로 사용자나,
 보행자의 건강에 영향을 미침
9 | ▶규제 사항 미 준수
8 | 높음 | ▶기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실
7 | ▶기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하
6 | 중간 | ▶자동차 보조 기능 상실
5 | ▶자동차 보조 기능 저하
4 | ▶매우 좋지 않은 외관, 소음, 진동, 거친 소리(harshness) 또는 촉각(haptics)
3 | 낮음 | ▶중간 정도의( 좋지 않은) 외관, 소음, 진동, 거친 소리(harshness) 또는 촉각(haptics)
2 | ▶약간의( 좋지 않은) 외관, 소음, 진동, 거친 소리(harshness) 또는 촉각(haptics)
1 | 매우 낮음 | ▶식별가능한 고장 영향이 없음.
제품에 대한 발생도 가능성 (O)
아래 기준에 따라 잠재적 고장 원인이 평가된다. 최적의 발생도 추정치(질적 등급)를 결정할 때 제품 경험
및 예방관리를 고려한다. | 사용자가
기입할 때
까지 빈칸
O | 발생한
잠재적 고장
원인 예측 | 발생도 기준 - 설계 FMEA | 공동 또는
제품
라인 예시
10 | 극도로 높음 | ▶운전 경험 및 또는 통제되지 않는 운행 조건없이 어디든 새로운 기술의 첫번째 적용.
▶제품 검증 및 또는 실현성 확인 / 타당성 확인 경험이 없다. 
▶표준은 존재하지 않으며 모범 사례는 아직 결정되지 않았다.
▶예방관리가 필드 성능을 예측할 수 없거나 존재하지 않는다.`
9 | 매우 높음 | ▶회사내에서 기술 혁신 또는 재료와 함께 처음 설계 사용.
▶새로운 적용 또는 duty cycle / 운행 조건에서의 변경.
▶제품 검증 및 또는 실현성확인/타당성확인 경험이 없다.
▶예방관리는 특정 요구사항에 대한 성능을 파악하기 위해 목표로 하지않는다.
8 | ▶새로운 적용에서 기술적 혁신 또는 재료와 함께 처음 설계 사용.
▶새로운 적용 또는 duty cycle / 운행 조건에서의 변경. 제품 검증 및 또는 실현성 확인
 / 타당성 확인 경험이 없다.
▶기존 표준 및 모범사례는 거의 없으며, 이 설계에 직접 적용할 수 없다.
▶예방관리는 필드 성능에 대해 신뢰할 수 있는 지표가 아니다.
7 | 높음 | ▶유사한 기술과 재료를 기반으로 한 새로운 설계.
▶새로운 적용 또는 Duty cycle / 운행 조건의 변경.
▶제품 검증 및 또는 실현성 확인 / 타당성 확인 경험이 없다.
▶표준,모범사례 및 설계 규칙은 기본 설계에 적용되지만, 혁신에는 적용되지 않는다.
▶예방관리는 성능에 대한 제한된 지표를 제공한다.
6 | ▶기존 기술과 재료를 사용하여 이전 설계와 유사하다.
▶Duty cycle 또는 운행 조건에서 변경에서 갖는 유사한 적용. 이전 시험 또는 필드 경험
▶표준 및 설계 규칙이 존재하지만 고장 원인이 발생하지 않도록 보장하기에는 부족하다.
▶예방관리는 고장 원인을 예방할 수 있는 일부 능력을 제공한다.
제품에 대한 발생도 가능성 (O)
아래 기준에 따라 잠재적 고장 원인이 평가된다. 최적의 발생도 추정치(질적 등급)를 결정할 때 제품 경험
및 예방관리를 고려한다. | 사용자가
기입할 때
까지 빈칸
O | 발생한
잠재적 고장
원인 예측 | 발생도 기준 - 설계 FMEA | 공동 또는
제품
라인 예시
5 | 중간 | ▶입증된 기술과 재료를 사용하여 이전 설계에 대한 세부사항을 변경한다.
▶유사한 적용, duty cycle 또는 운행 조건.
▶이전 시험 또는 필드 경험이나 고장과 관련된 일부시험 경험이 있는 새로운 설계.
▶설계는 이전 설계에서의 학습 교훈을 다룬다. 이 설계에 대해 모범 사례가 재 평가 되었지만
 , 아직 입증되지는 않았다.
▶예방관리는 고장 원인과 관련된 제품의 결함을 찾아내고 일부 성능 지표를 제공할 수 있다.
4 | ▶단기적 필드 노출과 거의 동일한 설계.
▶Duty-cycle 또는 운행 조건을 약간 변경한 유사한 적용. 이전 시험 또는 필드 경험.
▶새로운 설계의 선행 설계 및 변경은 모범 사례, 표준 및 시방을 준수한다.
▶예방관리는 고장원인과 관련된 제품의 결함을 찾아내고 설계 적합성을 나타낼 수 있다
3 | 낮음 | ▶비교 가능한 운행 조건하에서 알려진 설계(duty-cycle이나 운행 조건의 약간의 변경을
 갖는 동일 적용) 및 시험 또는 필드 경험에 대한 세부사항 변경, 혹은 성공적으로 완료된
 시험 절차의 새로운 설계
▶이전 설계로부터의 학습 교훈을 고려하여, 표준 및 모범 사례에 준수하도록 기대되는 설계
▶예방 관리는 고장 원인과 관련된 제품의 결함을 찾고 생산 설계의 적합성을 예측할 수 있다.
2 | 매우 낮음 | ▶장기적 필드 노출과 거의 동일한 성숙한 설계.
▶유사한 duty-cycle 및 운행 조건을 갖는 동일하나 적용.
▶유사한 운행 조건에서 시험 또는 필드 경험.
▶설계로부터의 학습교훈을 고려하면서, 표준 및 모범 사례를 준수하도록 기대되는 설계,
 상당한 신뢰도를 갖는다.
▶예방 관리는 고장원인과 관련된 제품의 결함을 찾아내고 설계 적합성에 대한 신뢰도를
 나타낸다.
1 | 극도로 낮음 | ▶예방관리를 통해 제거된 고장 및 고장원인은 설계 단계에서 발생가능성이 없다.
※제품 경험 : 회사내에서 제품 사용 이력 (설계, 적용 또는 사용 사례의 참신함) 이미 완료된 검출 관리의 결과는 설계
 경험을 제공한다.
※예방 관리 : 제품 설계, 설계 규칙. 회사 표준, 학습 교훈, 산업 표준, 재료 시방, 정부 규제 및 전산지원 공학, 수학, 모델링,
 시뮬레이션 연구, 공차 스택 및 설계 안전 여유를 포함한 예방 지향 분석 도구의 효과성에 대한 모범 사례 사용
※비고 : O 10, 9, 8, 7은 제품 실현성 확인 / 타당성 확인 활동에 따라 떨어질 수 있다.
제품 설계 실현성 확인 / 타당성 확인에 대한 검출도 가능성 (D)
검출 방법 성숙도와 검출을 위한 기회에 따라 등급 부여된 검출 관리
D | 검출 능력 | 검출 방법 성숙도 | 검출 기회 | 공동 또는
제품
라인 예시
10 | 매우 낮음 | ▶아직 개발되지 않은 시험 절차 | 시험 방법이
정의되지 않음
9 | ▶고장형태 또는 원인을 검출하도록 특별히 설계되지않은 시험 방법 | 합격-불합격, 불합격
 시험, 저하 시험
8 | 낮음 | ▶새로운 시험 방법, 입증되지 않음 | 합격-불합격, 불합격
 시험, 저하 시험
7 | ▶성능, 품질, 신뢰성 및 내구성의 기능 검증 또는 실현성 확인
 / 타당성 확인을 위해 입증된 시험방법, 계획된 타이밍은 시험
 실패로 인해 재 설계 및 또는 재도구화(re-tooling)를 위한 생산
 지연이 발생할 수 있는 제품 개발 사이클의 후반부에 있다. | 합격-불합격 시험
6 | 중간 | 불합격 시험
5 | 저하 시험
4 | 높음 | ▶성능, 품질, 신뢰성 및 내구성의 기능 검증 또는 실현성 확인
 / 타당성 확인을 위해 입증된 시험방법, 계획된 타이밍은 생산을
 위한 불출전에 생산 도구를 수정하기에 충분하다. | 합격-불합격 시험
3 | 불합격 시험
2 | 저하 시험
1 | 매우 높음 | ▶시험전에 고장 형태 또는 원인이 발생할 수 없음을 확인하거나, 고장 형태 또는 고장 원인을
 향상 검출하는것으로 입증된 검출 방법을 확인했다.
공정 설계의 실현성 확인 / 타당성 확인을 위한 검출 가능성 (D)
검출관리는 검출방법 성숙도와 검출 기회에 따라 등급이 매겨진다. | 사용자가
기입할 때
까지 빈칸
D | 검출 능력 | 검출 방법 성숙도 | 검출 기회 | 공동 또는
제품
라인 예시
10 | 매우 낮음 | ▶시험 또는 검사 방법이 수립되거나
 알려지지 않음 | 고장 형태가 검출되지 않거나 검출될 수 없다.
9 | ▶시험 또는 검사 방법이 고장 형태를 검출할
 가능성은 낮다. | 고장 형태는 무직위 또는 산발적인 심사를
통해 쉽게 검출되지 않는다.
8 | 낮음 | ▶시험 또는 검사 방법이 효과적이며, 신뢰할
 만한것으로 입증되지 않았다.
 →예: 공장은 한계의(marginal) 게이지 R&R
 결과, 비교 가능한 공정 또는 이러한 적용에
 대한 방법 경험이 거의 없거나, 전혀 없다.등 | 사람의 검사(시각, 촉각, 청각) 또는 고장
형태나 고장 원인을 검출해야 하는 수동
게이지(계수치 또는 계량치) 사용
7 | 기계 기반 검출(조명, 버저등에 의한 알림이
있는 반자동화) 또는 고장 형태 또는 고장
원인을 검출해야 하는 3차원 측정기(CMM)
같은 검사 장비 사용
6 | 중간 | ▶시험 또는 검사 방법은 효과적이고, 신뢰할
 수 있는으로 입증되었다.
 →예: 공정이 비교 가능한 공정 또는 이러한
 공정에 대한 방법에 경험이 있으며, 게이지
 R&R 결과는 수용 가능하다.등 | 사람의 검사(시각, 촉각, 청각) 또는 고장
형태나 고장 원인을 검출할 수 있는 수동
게이지(계수치 또는 계량치)을 사용한다.
5 | 기계 기반 검출(조명, 버저등에 의한 알림이
있는 반자동화) 또는 고장 형태 또는 고장
원인(제품 샘플 검사 포함)을 검출할 3차원
측정기(CMM) 같은 검사 장비 사용
4 | 높음 | ▶시스템이 효과적이고 신뢰할 수 있는 것으로
 입증되었다.
 →예:공장이 동일한 공정 또는 이러한 적용에
 대한 방법에 경험이 있음. 게이지 R&R 결과는
 수용 가능하다. 등 | 하류부문에서 고장 형태를 검출하고 추가
처리를 방지하거나, 시스템이 제품을 불일치
한 것으로 식별하여 지정된 불합격 하적
(unioad) 구역까지 공정에서 자동으로 진행
되도록 하는 기계 기반 자동 검출 방법.
불일치한 제품은 시설에서 제품이 유출되지
않도록 하는 강건한 시스템으로 관리될것이다
3 | 스테이션 내에서 고장 형태를 검출하고 추가
진행을 방지하거나, 시스템이 제품을 불일치
한 것으로 식별하여 지정된 불합격 하적 구역
까지 공정에서 자동으로 진행되도록 하는 기계
기반 자동 검출 방법.
불일치 제품이 유출되지 않도록 하는 강건한
시스템으로 관리된다.
2 | ▶검출 방법은 효과적으로 신뢰할 수 있는
 것으로 입증외었다.
 →예 : 공장에서 방법에 대한 경험이 있고,
 실수방지 검증 등 | 고장 원인을 검출할 고장 형태(불일치한 부품)
가 샌산되지 않도록 하는 기계 기반 검출 방법
1 | 매우 높음 | ▶고장 형태는 물리적으로 설계 또는 생산될 수 없으며, 항상 고장 형태 또는 고장 원인을
 검출하는 검출 방법으로 입증된다.
설계 FMEA 및 공정 FMEA에 대한 조치 우선 순위 (AP)
조치 우선순위는 리스크 감소를 위한 조치의 우선순위를 정하기 위해 심각도, 발생도 및 검출도 등급의 조합을
기반으로 한다, | 사용자가
기입할 때
까지 빈칸
영향 | S | 발생한 고장
원인 예측 | O | 검출 능력 | D | 조치 우선순위
(AP) | 의견
제품 또는 공장
영향 매우 높음 | 9-10 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | M
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
제품 또는 공장
영향 높음 | 7-8 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | H
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | H
매우 높음 | 1 | M
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | M
높음 | 2-4 | M
매우 높음 | 1 | M
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
설계 FMEA 및 공정 FMEA에 대한 조치 우선 순위 (AP)
조치 우선순위는 리스크 감소를 위한 조치의 우선순위를 정하기 위해 심각도, 발생도 및 검출도 등급의 조합을
기반으로 한다, | 사용자가
기입할 때
까지 빈칸
영향 | S | 발생한 고장
원인 예측 | O | 검출 능력 | D | 조치 우선순위
(AP) | 의견
제품 또는 공장
영향 중간 | 4-6 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | H
중간 | 5-6 | H
높음 | 2-4 | M
매우 높음 | 1 | M
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | M
매우 높음 | 1 | L
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
제품 또는 공장
영향 닞음 | 2-3 | 매우 높음 | 8-10 | 낮음 - 매우 낮음 | 7-10 | M
중간 | 5-6 | M
높음 | 2-4 | L
매우 높음 | 1 | L
높음 | 6-7 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
중간 | 4-5 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
낮음 | 2-3 | 낮음 - 매우 낮음 | 7-10 | L
중간 | 5-6 | L
높음 | 2-4 | L
매우 높음 | 1 | L
매우 낮음 | 1 | 매우 높음 - 매우 낮음 | 1-10 | L
식별 가능한
영향이 없음 | 1 | 매우 낮음
- 매우 높음 | 1-10 | 매우 높음 - 매우 낮음 | 1-10 | L', 13
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'J-1101' AND sort_order = 13);

