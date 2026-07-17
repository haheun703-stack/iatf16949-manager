-- ============================================================
-- Migration 0073: MES 다운로드 일일 의무 + 드롭 폴더 설정 (2026-07-17)
-- [데이터 전용 마이그레이션 — 스키마 변경 없음] [TPC팩 후보]
--
-- 담당=생산팀 팀원(사장님 확정 7/17, 개인 이름은 앱 '담당자'란에서 지정).
-- 7/20(월)부터 도래 — 첫 샘플 수령일. 임포트 파이프라인이 붙으면
-- 파일 도착 감지=auto-done·미도착=빨간불로 승격 예정(0072 참조).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

INSERT INTO recurring_obligations
  (title, cadence, category, clause_ref, owner, lead_days, next_due_date, form_code, sort_order, note)
VALUES
  ('MES 일일 기록 다운로드·폴더 적재(4종)', '일', '모니터링', 'SQ 2_7', '생산팀', 0, '2026-07-20', NULL,
   390, '자주검사·수입검사·공정패트롤·설비일상점검 4종을 MES에서 다운로드 → "MES다운로드\YYYY-MM-DD\" 폴더에 접두어 붙여 저장(규칙=폴더 내 README). 담당자 이름은 담당자란에 지정. 임포트 파이프라인 구축 후 파일 도착=자동완료 전환');

-- 드롭 폴더 경로 (임포트 파이프라인의 감시 대상 — 소비 코드는 0072 파이프라인과 함께)
INSERT INTO app_config (key, value) VALUES ('mes.drop_dir', 'D:\IATF16949,SQ 자동작성 봇\MES다운로드')
  ON CONFLICT(key) DO NOTHING;
