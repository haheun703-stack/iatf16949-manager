-- ============================================================
-- Migration 0093: 정기 의무 → 증거 양식 연결 25건 (2026-07-22)
-- [의무-양식 연결] — 12번 지시서 #4 회신, 사장님 승인분.
--
-- 원천 = form_examples 검수 후속 스코핑. active 의무 72건 중 form_code 미연결 65건을
--   전수 검토 → '그 의무의 증거가 되는 실재 양식이 명확한 것'만 보수적으로 연결(25건).
--   회의·마감보고·KPI결산류 등 단일 증거양식이 없는 40건은 억지 연결 금지(관제탑 오도 방지) → 미연결 유지.
--
-- ⚠️연결 시 홈 '오늘 할 일'에서 해당 의무는 P3 규칙(작성기록=증거)으로 자동 전환 —
--   수동 완료 대신 그 양식의 작성기록으로만 ✓ 확정된다(formDoneToday 매칭).
-- ⚠️#44=J3100-03(대장), #60=L1100-12(금형 L1100-25 분리는 12절 미결). #8·#70=L3100-03 공유(주기 다른 두 의무·정상).
-- 매칭 키 = title(정확 문자열, DB에서 추출 — ·— 유사문자 오타 방지). 가드 = 미연결·active만 → 사용자 수정분/기존 연결 불가침, 완전 멱등.
-- 멱등: form_code IS NULL/'' 인 행만 UPDATE(재적용 시 0행). BEGIN/COMMIT 없음(migrate.ts 트랜잭션).
-- ============================================================

-- ── 확실 14건 ──
-- #3 설비 일상점검(TPM)  →  L1100-07 (설비 일상 점검표 ()) · 설비 일상 점검표
UPDATE recurring_obligations SET form_code='L1100-07'
WHERE title='설비 일상점검(TPM)' AND active=1 AND (form_code IS NULL OR form_code='');

-- #9 공급업체 납입·품질 모니터링  →  K1200-06 (협력사 월별 모니터링 ()) · 협력사 월별 모니터링
UPDATE recurring_obligations SET form_code='K1200-06'
WHERE title='공급업체 납입·품질 모니터링' AND active=1 AND (form_code IS NULL OR form_code='');

-- #15 내부심사 — QMS  →  A5100-04 (내부심사(품질,환경,안전) 체크리스트 ()) · 내부심사(품질,환경,안전) 체크리스트
UPDATE recurring_obligations SET form_code='A5100-04'
WHERE title='내부심사 — QMS' AND active=1 AND (form_code IS NULL OR form_code='');

-- #16 내부심사 — 제조공정  →  A5200-03 (내부심사(제조) 체크리스트) · 내부심사(제조) 체크리스트
UPDATE recurring_obligations SET form_code='A5200-03'
WHERE title='내부심사 — 제조공정' AND active=1 AND (form_code IS NULL OR form_code='');

-- #17 내부심사 — 제품  →  A5200-04 (내부심사(제품) 체크리스트) · 내부심사(제품) 체크리스트
UPDATE recurring_obligations SET form_code='A5200-04'
WHERE title='내부심사 — 제품' AND active=1 AND (form_code IS NULL OR form_code='');

-- #18 경영검토 회의  →  A2200-03 ((    )년 경영검토 보고서 ()) · 경영검토 보고서
UPDATE recurring_obligations SET form_code='A2200-03'
WHERE title='경영검토 회의' AND active=1 AND (form_code IS NULL OR form_code='');

-- #19 MSA 측정시스템 분석 재평가  →  L3101-01 (측정시스템 분석 계획서()) · 측정시스템 분석 계획서
UPDATE recurring_obligations SET form_code='L3101-01'
WHERE title='MSA 측정시스템 분석 재평가' AND active=1 AND (form_code IS NULL OR form_code='');

-- #22 제품안전 교육·인식  →  D1100-03 (제품 안전교육 보고서()) · 제품 안전교육 보고서
UPDATE recurring_obligations SET form_code='D1100-03'
WHERE title='제품안전 교육·인식' AND active=1 AND (form_code IS NULL OR form_code='');

-- #23 교육훈련 계획 수립·효과성  →  F1100-01 (년 사내외 교육훈련 계획서 ()) · 년 사내외 교육훈련 계획서
UPDATE recurring_obligations SET form_code='F1100-01'
WHERE title='교육훈련 계획 수립·효과성' AND active=1 AND (form_code IS NULL OR form_code='');

-- #46 부적합 식별·격리·NCR 등록  →  B1100-01 (부적합품 발생 통보서) · 부적합품 발생 통보서(NCR)
UPDATE recurring_obligations SET form_code='B1100-01'
WHERE title='부적합 식별·격리·NCR 등록' AND active=1 AND (form_code IS NULL OR form_code='');

-- #47 출하검사·성적서 발행(생산 LOT 기재)  →  M3100-05 (완성품·출하검사 성적서) · 완성품·출하검사 성적서
UPDATE recurring_obligations SET form_code='M3100-05'
WHERE title='출하검사·성적서 발행(생산 LOT 기재)' AND active=1 AND (form_code IS NULL OR form_code='');

-- #71 비상대응 모의훈련  →  A8101-02 (비상사태 대비 훈련결과 보고서()) · 비상사태 대비 훈련결과 보고서
UPDATE recurring_obligations SET form_code='A8101-02'
WHERE title='비상대응 모의훈련' AND active=1 AND (form_code IS NULL OR form_code='');

-- #72 연간 내부심사 계획 수립  →  A5100-01 (내부심사 년간 계획 및 실적 ()) · 내부심사 년간 계획 및 실적
UPDATE recurring_obligations SET form_code='A5100-01'
WHERE title='연간 내부심사 계획 수립' AND active=1 AND (form_code IS NULL OR form_code='');

-- #45 공정 순회검사·LOT 라벨 상태 확인  →  L2100-05 (조관공정 순회검사일지(-조)) · 조관공정 순회검사일지
UPDATE recurring_obligations SET form_code='L2100-05'
WHERE title='공정 순회검사·LOT 라벨 상태 확인' AND active=1 AND (form_code IS NULL OR form_code='');

-- ── 검토 11건 ──
-- #8 교정 도래(Due) 점검  →  L3100-03 (계측기 검교정 계획서 ()) · 계측기 검교정 계획서(도래일 관리) — #70과 공유
UPDATE recurring_obligations SET form_code='L3100-03'
WHERE title='교정 도래(Due) 점검' AND active=1 AND (form_code IS NULL OR form_code='');

-- #70 측정기 전수 교정  →  L3100-03 (계측기 검교정 계획서 ()) · 계측기 검교정 계획서(전수 교정) — #8과 공유
UPDATE recurring_obligations SET form_code='L3100-03'
WHERE title='측정기 전수 교정' AND active=1 AND (form_code IS NULL OR form_code='');

-- #61 SPC·Cpk 월간 검토(특별특성)  →  L-4101-01 (SPC 평가표) · SPC 평가표 (CP/CPK는 #20 L4102-02)
UPDATE recurring_obligations SET form_code='L-4101-01'
WHERE title='SPC·Cpk 월간 검토(특별특성)' AND active=1 AND (form_code IS NULL OR form_code='');

-- #56 순환 재고실사·외주 진행 점검  →  K2100-04 (재고조사표 ()) · 재고조사표
UPDATE recurring_obligations SET form_code='K2100-04'
WHERE title='순환 재고실사·외주 진행 점검' AND active=1 AND (form_code IS NULL OR form_code='');

-- #67 재고자산 결산(장기재고 보고)  →  K2100-01 (장기재고관리 현황 ()) · 장기재고관리 현황
UPDATE recurring_obligations SET form_code='K2100-01'
WHERE title='재고자산 결산(장기재고 보고)' AND active=1 AND (form_code IS NULL OR form_code='');

-- #60 설비·금형 PM(예방보전)  →  L1100-12 (월간설비 정기 점검 계획서 ()) · 월간설비 정기 점검 계획서 — 금형(L1100-25) 분리는 사장님 추후 결정
UPDATE recurring_obligations SET form_code='L1100-12'
WHERE title='설비·금형 PM(예방보전)' AND active=1 AND (form_code IS NULL OR form_code='');

-- #44 4M 변경 기록·승인 확인  →  J3100-03 (4M 변경 관리대장 ()_신양식) · 4M 변경 관리대장 — 의무가 "기록·승인 확인"이라 점검C/S 아닌 대장이 증거(사장님 확정)
UPDATE recurring_obligations SET form_code='J3100-03'
WHERE title='4M 변경 기록·승인 확인' AND active=1 AND (form_code IS NULL OR form_code='');

-- #27 2자(공급업체) 심사 계획·실시  →  K1200-05 (⑤협력업체 체제 평가표 ()) · 협력업체 체제 평가표
UPDATE recurring_obligations SET form_code='K1200-05'
WHERE title='2자(공급업체) 심사 계획·실시' AND active=1 AND (form_code IS NULL OR form_code='');

-- #12 공급업체 성과 평가  →  K1200-03 (③협력업체 사후 평가 계획서 ()) · 협력업체 사후 평가 계획서
UPDATE recurring_obligations SET form_code='K1200-03'
WHERE title='공급업체 성과 평가' AND active=1 AND (form_code IS NULL OR form_code='');

-- #13 비상대응계획 점검  →  A8101-04 (비상사태 검토 보고서()) · 비상사태 검토 보고서
UPDATE recurring_obligations SET form_code='A8101-04'
WHERE title='비상대응계획 점검' AND active=1 AND (form_code IS NULL OR form_code='');

-- #65 교육 실시·Skill Matrix 갱신  →  F2100-07 (숙련도_다기능 평가 계획 ()) · 숙련도_다기능 평가 계획(Skill Matrix)
UPDATE recurring_obligations SET form_code='F2100-07'
WHERE title='교육 실시·Skill Matrix 갱신' AND active=1 AND (form_code IS NULL OR form_code='');

