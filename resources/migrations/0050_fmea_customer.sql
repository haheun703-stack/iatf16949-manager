-- ============================================================
-- Migration 0050: fmea_documents.customer (고객명) — 신판 시트 헤더 C5 주입용
--
-- 신판 J-1101 시트 헤더 C5 = 고객명(제출처). 0047 에 컬럼이 없어 출력 시 C5 가 비었음.
-- 컬럼 추가 → fmea-export 가 doc.customer → C5 주입. 데모 문서엔 예시값 채움.
-- ============================================================

ALTER TABLE fmea_documents ADD COLUMN customer TEXT;   -- 고객사명(제출처). 출력 C5.

UPDATE fmea_documents
   SET customer = '현대위아 (데모)'
 WHERE fmea_no = 'PFMEA-DEMO-001' AND (customer IS NULL OR customer = '');
