-- ============================================================
-- Migration 0132: pack_forms — 양식 팩 정션 (2026-08-04) [스키마 전용 마이그레이션 — 데이터 없음]
--
-- 근거 = 29번 지시서 §5(SQ 미니멀 팩) + §8-⑤ 도장(8/4 기전 재가).
-- "팀원이 뭘 넣어야 할지 난해"의 해법: 302종 전량 노출 대신 SQ Ver4 42항목에서
-- 역산한 필수 세트만 기본 노출한다. 302종은 삭제가 아니라 미노출(전체 보기 토글).
--
-- forms 열 추가가 아닌 정션인 이유(29번 §5):
--  ① 한 양식이 여러 SQ 항목의 증거(설비일상점검표 = 3_1·3_4·3_6)
--  ② 팩은 복수가 된다(sq-minimal / iatf-full / 고객사별)
--  ③ 팩 축 = 제품화 분리 축(신규 고객 배포판 = 코어 + 범용팩) — 시드분리 규칙의 content_packs 예고 이행
-- ============================================================
CREATE TABLE IF NOT EXISTS pack_forms (
  pack_code    TEXT NOT NULL,                -- 'sq-minimal' 등
  form_code    TEXT NOT NULL,                -- forms.code 느슨 참조
  sq_item_code TEXT NOT NULL DEFAULT '',     -- sq_guide_items.item_code 역산 근거('2_7' 등, 없으면 '')
  required     INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_code, form_code, sq_item_code)
);
CREATE INDEX IF NOT EXISTS idx_pack_forms_pack ON pack_forms(pack_code, form_code);
