-- ============================================================
-- Migration 0125: A-6300 품질문제 신고포상 규정 — 본문 재적재(읽기순서 복원)
--
-- 사장님 지시(8/1): A-6300 원본 xlsx CSV 변환 실험 → 웹 열람 등록.
-- 기존 0056 적재분(2행)은 행 단위 추출이라 좌우 2단이 인터리브됨
-- (섹션 제목부터 "1. 적용범위 4. 품질신고 및 포상절차"로 병합) → 열람 불가 수준.
-- 재추출 = 병합앵커+단 경계 인식(scratchpad reg_text_extract.py, 좌단→우단 순서 복원).
-- 원본 = IATF 전체 자료모음_김권표이사_260501\3.IATF16949 규정&지침 _230501\
--        A-6300 품질문제 신고포상 규정 (25년6월13일_REV.0)_품질보증.xlsx (REV.0, 2025-06-13)
-- DELETE+INSERT 재적재(regulation_sections 는 시드 전용 — 사용자 입력 없음), 재실행 멱등.
-- ============================================================

DELETE FROM regulation_sections WHERE reg_code = 'A-6300';

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '(서두)', '품질경영 시스템 — 품질문제 신고포상 규정
문서번호 TPC-A-6300 · 재,개정일자 2025-06-13 · 개정번호 0 (REV.0) · 페이지 1/2
[개정이력] 0판 2025-06-13: 품질의식 고취 및 종업원 동기부여 차원에서 품질문제 신고 포상 규정 제정,공포 — 작성: 기술연구소 품질보증팀 서민석
주관부서: 기술연구소 품질경영팀 · 협의부서: 주관부서 제외 전부서
[승인] 작성 차장 서민석 / 검토 사업부장 김권표 / 검토 사장 노영길 / 승인 회장 이정훈 (2025-06-13) · 배포처: 사내 Network 공유
[협의] 정밀인발튜브 사업부장 김영동 / 필라넥워터 사업부장 김상은 / 정밀강관 사업부장 이석태 / A/M 사업부장 서상규 / 쇼바용접 사업부장 김상은 / 구매 팀장 이인창 / 경영관리 팀장 김병철 (2025-06-13)', 0
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 0);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '1. 적용범위', '사내에서 발생 및 발견된 자체불량, 고객불량, 외주(원소재/부품)불량에 대한 신고 포상에 대해 규정한다.', 1
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 1);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '2. 목적', '본 규정은 당사 사원들의 품질의식 향상 및 유출불량 방지를 위한 종업원 동기부여 차원에서 육성하고 이를 회사운영에 반영하므로서 사원의 사기양양과 업무능률의 향상을 기하여 회사의 발전을 도모하는데 그 목적이 있다.', 2
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 2);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '3. 포상의 기준', '포상의 기준은 신고된 불량내용의 중요도를 판단 (품질 보증팀)하여 등급을 산정, 포상한다. 단,등급분류 기준과 관계없이 품질의식 강조차원에서 품의식 특별포상(금액은 승인권자 결정) 도 실시할 수 있다.
[등급분류 및 포상금액(건당)]
특별등급 50,000원 — ▶경영진 지시 또는 품질의식 강조등 필요시
1등급 10,000원 — ▶기능상의 치명적인 문제발생 ▶작업간 확인이 어려운경우 ▶재발우려 및 LOT성 불량 우려시
2등급 5,000원 — ▶기능상 치명적이진 않으나 고객사 유출시 회사이미지 손실우려 ▶재발우려 및 외관 불량 우려시
3등급 3,000원 — ▶기능상 문제는 아니나 위험성이 잠재하여 개선 필요시
비고: 매월 집계 후 대표이사 승인 후 포상', 3
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 3);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '4. 품질신고 및 포상절차', '(1) 全 사원은 공정작업중 불량 발견시 품질문제 신고서(양식)를 작성하여, 해당 불량품과 함께 현장 조,반장 및 생산 관리자에게 신고한다.
(2) 현장 조,반장 및 생산 관리자는 품질보증팀 담당자에게 불량품 및 신고서를 인계한다.
(3) 품질 담당자는 불량 내역을 검토 후 등급을 산정하여 사업부장의 승인을 득한다.
(4) 품질 담당자는 매월말 월별 품질문제 신고서를 집계 후 대표이사의 승인을 득한다.
(5) 승인을 득한 품질문제 신고 포상건에 대해 지출결의서를 작성(지급 대상자: 신고자)하여 대표이사의 승인을 득한 후 경영관리실 경리팀에 제출한다.
(6) 경영관리실 경리팀에서는 포상금을 신고자 급여 통장으로 입급 조치 한다. 필요시 전직원 교육 및 조회시간 별도의 포상식을 진행 할수 있다.', 4
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 4);

INSERT INTO regulation_sections (reg_code, section_title, section_body, sort_order)
SELECT 'A-6300', '5. 관련양식', '(1) 품질문제 신고서 (A6300-01)', 5
WHERE NOT EXISTS (SELECT 1 FROM regulation_sections WHERE reg_code = 'A-6300' AND sort_order = 5);
