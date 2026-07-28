-- ============================================================
-- Migration 0106: B-1 — M1 입고·출하 사진함 선행 스키마 (2026-07-28 오후)
--
-- 근거 = M1 선행분 견적서 §1(코워크 합격 7/28 밤) + 코워크 B-1 착수 승인(7/28 오후).
-- 신규 테이블 0 — 0101 코어의 raw_captures 재사용 + mat_receipt 컬럼 2개 추가만.
--
--  · mat_receipt.capture_id    : 사진(raw_captures) ↔ 수불 N행 연결(전표 실측 1:N —
--                                4장 중 3장 다품목. N행이 같은 capture_id 참조)
--  · mat_receipt.receipt_class : '원자재' | '외주재입고' — partner.partner_type 으로
--                                초안 유도, 태깅 때 확정(명시 컬럼이 정직)
--
-- raw_captures 규약(컬럼 추가 없음 — 값 규약만, 견적서 §2.5 content JSON v1 계약):
--  · kind   = 'receipt_in' | 'receipt_out'
--  · status = '미분류' → '태깅완료'
--  · content = {"v":1, docDate, partnerCode, items[{itemCode,qty,vendorLot}], receiptClass, note}
--    (단가·금액 구조화 금지 — 사진 원본이 증거. 출하는 mat_receipt 미생성, content 가 유일 구조화)
--
-- B-2(태깅 화면)·B-3(수입검사 데이터 트리거)는 사장님 ④ 수집함 재가 후 — 이 마이그는
-- 스키마 선행분만이라 화면·동작 변화 0. 시드 없음.
-- 멱등: 컬럼 존재 시 재실행해도 _migrations 기록으로 스킵(러너 규약).
-- ============================================================

ALTER TABLE mat_receipt ADD COLUMN capture_id INTEGER REFERENCES raw_captures(id);
ALTER TABLE mat_receipt ADD COLUMN receipt_class TEXT;

CREATE INDEX IF NOT EXISTS idx_mat_receipt_capture ON mat_receipt(capture_id);
