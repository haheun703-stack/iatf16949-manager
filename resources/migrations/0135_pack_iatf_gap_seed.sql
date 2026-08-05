-- ============================================================
-- Migration 0135: IATF 조항 매핑 + 갭 ＋행 시드 (2026-08-05) [데이터 시드 — 범용팩 성격]
--
-- 근거 = PB2 견적 ⓐ·원칙("＋행은 v1 에서 예방보전(8.5.1.5)·작업준비 검증(8.5.1.3) 2건으로
-- 시작 — 조항 확장은 데이터 행 추가로만") + 30번 목업 v2(사장님 확정 정본, 8/4).
--
-- 가짜 금지: 조항 매핑은 30번 목업에서 확정된 검증분만 시드한다 —
--   자주검사(M1200-10) → 8.6.1 · LOT 추적성 대장(M2100-10) → 8.5.2.
-- 나머지 sq-minimal 행의 조항은 ⓒ(SQ 심사 뷰) 설계 시 clauses·SQ Ver4 대조로 확장(행 UPDATE).
--
-- 갭 팩 'iatf-gap' = "MES(현장 기록 메뉴)에 없는 IATF 추가 요구"를 기존 양식으로 보완하는 연결:
--   ① 예방보전(TPM) 8.5.1.5 → L1100-12(월간설비 정기 점검 계획서) — 30번 목업 문구 그대로
--   ② 작업준비 검증(초물) 8.5.1.3 → M1200-10(공정 자주검사 CHECK SHEET — 초품 기록이 근거)
-- 두 양식 모두 실존 실측(8/5, 라이브 302종 내). 멱등 = INSERT OR IGNORE(PK)·UPDATE 반복 무해.
-- ============================================================

-- ── 갭 ＋행 2건 (v1 확정분) ──
INSERT OR IGNORE INTO pack_forms (pack_code, form_code, sq_item_code, required, sort_order, iatf_clause)
VALUES
  ('iatf-gap', 'L1100-12', '', 1, 1, '8.5.1.5'),
  ('iatf-gap', 'M1200-10', '', 1, 2, '8.5.1.3');

-- ── 검증된 조항 매핑 (30번 목업 확정분만 — 추정 기입 금지) ──
UPDATE pack_forms SET iatf_clause = '8.6.1' WHERE form_code = 'M1200-10' AND pack_code = 'sq-minimal';
UPDATE pack_forms SET iatf_clause = '8.5.2' WHERE form_code = 'M2100-10' AND pack_code = 'sq-minimal';
