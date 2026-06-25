-- 0029_form_cell_map_checkboxes.sql (□ 앵커 스캐너 생성)
-- radio/checkbox form_fields 를 마스터의 □셀과 옵션포함 매칭 → form_cell_map 보강.
-- 엔진이 옵션별 □→■ 치환(공백허용). migrate.ts 트랜잭션 래핑 → BEGIN/COMMIT 없음.
INSERT INTO form_cell_map (form_code, field_key, label, cell, type, sort_order) VALUES
  ('A5100-02','심사구분','심사구분','Y4','radio',900),
  ('A5100-02','심사항목','심사항목','E5','checkbox',901),
  ('B1100-03','특채종류','특채종류','W5','radio',902),
  ('B1100-03','고객승인 필요성','고객승인 필요성','Q21','radio',903),
  ('B1100-03','결점분류','결점분류','AN20','radio',904),
  ('B2100-01','구분','구분','E1','radio',905),
  ('B2100-01','발행구분','발행구분','F6','checkbox',906),
  ('B2100-03','개선효과 유효성','개선효과 유효성','AH42','radio',907),
  ('B2100-03','표준류 반영','표준류 반영','T44','checkbox',908);
