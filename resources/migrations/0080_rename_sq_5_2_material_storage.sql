-- ============================================================
-- Migration 0080: SQ 5_2 항목명 교정 — '수입자재 보관장' → '자재 보관장' (2026-07-19 사장님 지시)
-- [데이터 전용] '수입자재'가 수입검사 품목으로 혼동될 수 있어 표시명 변경.
-- ⚠️가이드 Ver4 원문은 '수입자재 보관장 관리기준 수립 및 준수상태' — 심사 대조 시 참조.
-- kb(AI 검색) 청크·FTS 인덱스도 동기 교정(kb_fts=자체 콘텐츠형 FTS5, 직접 UPDATE 가능).
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈).
-- ============================================================

UPDATE sq_items
SET title = '자재 보관장 관리기준 수립 및 준수상태'
WHERE code = '5_2';

UPDATE kb_chunks
SET title = REPLACE(title, '수입자재 보관장', '자재 보관장'),
    text  = REPLACE(text,  '수입자재 보관장', '자재 보관장')
WHERE kind = 'sq_item' AND ref_key = '5_2';

UPDATE kb_fts
SET title = REPLACE(title, '수입자재 보관장', '자재 보관장'),
    text  = REPLACE(text,  '수입자재 보관장', '자재 보관장')
WHERE kind = 'sq_item' AND ref_key = '5_2';
