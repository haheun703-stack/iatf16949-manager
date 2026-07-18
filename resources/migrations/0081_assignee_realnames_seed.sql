-- ============================================================
-- Migration 0081: 관제탑 담당자(assignee) 실명 기본 배정 — v4 STEP 2 (2026-07-19)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 원천 = "26년 TPC AM사업부 조직도.png" (2026.1/1, 회장 승인본, 15명 실명).
-- 배정 원칙(v4 관리자 확인형 철학): assignee = 그 기록의 "확인 책임자".
--   · 일일 마감보고·확인형·회의·연간 시스템 의무 = 팀장
--   · 역할이 조직도에 명시된 기록 의무 = 해당 실무자
--   · 품질(개발) 과장 2인 분담: 김민수=Core Tool 문서(FMEA/APQP/MSA),
--     서명진=검사·공정능력(ISIR/SPC/CPK)
--   · 경영 의무(경영검토·경영진 LPA) = 서상규 전무(사업부장)
-- 조직도 팀 → 앱 5팀: 관리지원팀→관리팀(서규하·김초연) / 자재·납품팀→영업/자재팀
--   (차현수·안진성·조성민·김만진) / 생산팀(보전)→생산팀(손진식·장석봉·박민수) /
--   품질·개발팀→품질팀(김기범·고형진)+개발팀(하헌), 김민수·서명진 양팀 겸직.
-- 멱등성: WHERE (assignee IS NULL OR assignee='') 가드 — 사용자가 이미 기입한
--   담당자는 절대 덮어쓰지 않음(관제탑 ObligationModal 에서 자유 수정 가능).
-- 대상 = active=1 의무 72건 전량. title 정확일치 매칭(id 는 설치본별 편차 가능).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ⚠️assignee 는 kb 인덱스 비수록 필드 — kb 동기 불필요(0080 R8 해당 없음).
-- ============================================================

-- ── 개발팀 (팀장 하헌) ──
UPDATE recurring_obligations SET assignee='하헌', updated_at=datetime('now')
WHERE title='일일 마감보고 — 개발팀' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='하헌', updated_at=datetime('now')
WHERE title='RFQ 접수·견적 진행 기록' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김민수', updated_at=datetime('now')
WHERE title='APQP 진척·시험데이터 기록' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='하헌', updated_at=datetime('now')
WHERE title='수주 파이프라인 리뷰' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='하헌', updated_at=datetime('now')
WHERE title='견적 대비 실원가 대사' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='양산이관·초기유동(ISIR) 점검' AND active=1 AND (assignee IS NULL OR assignee='');

-- ── 영업/자재팀 (팀장 차현수 · 납품관리 안진성 · 자재관리 조성민) ──
UPDATE recurring_obligations SET assignee='차현수', updated_at=datetime('now')
WHERE title='일일 마감보고 — 영업/자재팀' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='안진성', updated_at=datetime('now')
WHERE title='납입지시(EDI/발주) 확인·출하계획 확정' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='입고 LOT 등록·FIFO 불출 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='순환 재고실사·외주 진행 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='주간 소요계획(MRP) 확정·발주' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='재고자산 결산(장기재고 보고)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='안진성', updated_at=datetime('now')
WHERE title='고객 스코어카드/포털 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='공급업체 납입·품질 모니터링' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='차현수', updated_at=datetime('now')
WHERE title='공급업체 성과 평가' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='조성민', updated_at=datetime('now')
WHERE title='외주 ISIR·검사협정 접수대장 갱신' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='차현수', updated_at=datetime('now')
WHERE title='2자(공급업체) 심사 계획·실시' AND active=1 AND (assignee IS NULL OR assignee='');

-- ── 생산팀 (팀장 손진식 · 팀원 장석봉·박민수) ──
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='일일 마감보고 — 생산팀' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='장석봉', updated_at=datetime('now')
WHERE title='초·중·종물 검사(초/중/종)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='작업 셋업 검증(Job Set-up)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='박민수', updated_at=datetime('now')
WHERE title='설비 일상점검(TPM)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='브레이징 조건 기록(3회/일) 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='장석봉', updated_at=datetime('now')
WHERE title='MES 일일 기록 다운로드·폴더 적재(4종)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='생산일보 마감(투입 자재 LOT 기재)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='4M 변경 기록·승인 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='박민수', updated_at=datetime('now')
WHERE title='스포트 팁 카운터↔교체대장 정합 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='박민수', updated_at=datetime('now')
WHERE title='설비 주간점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='완성품 검사일지↔MES 수량 정합 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='설비·금형 PM(예방보전)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='손진식', updated_at=datetime('now')
WHERE title='비상대응계획 점검' AND active=1 AND (assignee IS NULL OR assignee='');

-- ── 품질팀 (팀장 김기범 · 품질관리 고형진 · 개발품질 서명진/김민수) ──
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='일일 마감보고 — 품질팀' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='수입검사 이력카드 당일 입고분 기입 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='공정 순회검사·LOT 라벨 상태 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='부적합 식별·격리·NCR 등록' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='출하검사·성적서 발행(생산 LOT 기재)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='층별 공정감사(LPA)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='주간 품질회의(부적합 리뷰)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='CAPA 진행·기한 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='품질목표/KPI 모니터링' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='교정 도래(Due) 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='부적합/고객불만 동향 분석' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='SPC·Cpk 월간 검토(특별특성)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='모의 역추적 훈련(리콜 시뮬레이션)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='한도견본·검사구(C/F)·마스터 시편 상태 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='원소재 M/SHEET 수취 확인(품목별 1회/3개월)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='중금속(MS201-02) 공인성적서 수취 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='내식성(MS611-15) 공인성적서 수취 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='층별감사 종합 검토' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='내부심사 — QMS' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='내부심사 — 제조공정' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='내부심사 — 제품' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김민수', updated_at=datetime('now')
WHERE title='MSA 측정시스템 분석 재평가' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서명진', updated_at=datetime('now')
WHERE title='공정능력 재검증(CP/CPK)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='문서 정기 검토(개정 유효성)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='고객특별요구(CSR) 갱신 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='내부심사원 자격 유지' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='고형진', updated_at=datetime('now')
WHERE title='측정기 전수 교정' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김기범', updated_at=datetime('now')
WHERE title='연간 내부심사 계획 수립' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김민수', updated_at=datetime('now')
WHERE title='FMEA·관리계획서 정기 검토' AND active=1 AND (assignee IS NULL OR assignee='');

-- ── 관리팀 (팀장 서규하 · 관리 실무 김초연) + 경영(서상규 전무) ──
UPDATE recurring_obligations SET assignee='서규하', updated_at=datetime('now')
WHERE title='일일 마감보고 — 관리팀' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='자금일보 작성·시재 확인' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='근태 확인·결원 시 4M 통보' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='주간 KPI 집계 → 운영회의' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='KPI 월 결산 → 경영회의' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='교육 실시·Skill Matrix 갱신' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='김초연', updated_at=datetime('now')
WHERE title='월 결산 마감(D+5)·법정신고 점검' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서상규', updated_at=datetime('now')
WHERE title='경영진 LPA(계층별 공정감사)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서규하', updated_at=datetime('now')
WHERE title='비상대응 모의훈련' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서규하', updated_at=datetime('now')
WHERE title='리스크/기회 검토(SWOT)' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서규하', updated_at=datetime('now')
WHERE title='제품안전 교육·인식' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서규하', updated_at=datetime('now')
WHERE title='교육훈련 계획 수립·효과성' AND active=1 AND (assignee IS NULL OR assignee='');
UPDATE recurring_obligations SET assignee='서상규', updated_at=datetime('now')
WHERE title='경영검토 회의' AND active=1 AND (assignee IS NULL OR assignee='');
