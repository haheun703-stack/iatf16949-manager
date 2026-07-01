-- ============================================================
-- Migration 0053: 전 프로세스 관련규정 정합화 (매뉴얼 0.7 REV.7 기준)
--
-- 정본 = 품질환경매뉴얼 0.7 프로세스매트릭스(조항) REV.7, 74튜플/69규정.
-- 각 프로세스에 정본이 명시한 관련규정을 채움(미적재 규정은 문서 등록=필드미정의).
-- MP 라벨 보정: 0.7 MP-02(인적자원)→앱 MP-03 / 앱 MP-02=리스크(A-8100·8101·E-1100·1101·J-1101).
-- + 책임부서(resp_dept)·IATF조항(iatf_clause) 컬럼 추가·전 규정 기입.
-- 이번 마이그는 '규정 문서 등록 + 프로세스 표시'까지. 각 규정 하위 개별양식 셀맵/필드는 후속.
-- INSERT OR IGNORE 멱등. SP-03 등 이미 채워진 프로세스는 갭0이라 변화 없음.
-- ============================================================

ALTER TABLE forms ADD COLUMN resp_dept   TEXT;   -- 책임부서(팀): 총무/영업/품질보증/개발/구매/생산/생산기술
ALTER TABLE forms ADD COLUMN iatf_clause TEXT;   -- IATF 조항(0.7): 4~10, 쉼표구분

-- 1) 미적재 규정 28건 문서 등록(필드 미정의)
INSERT OR IGNORE INTO forms (code, name, reg_code, description, approvals_json, resp_dept, iatf_clause) VALUES
  ('A-2100', '사업계획 운영 규정', 'A-2100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '6'),
  ('A-3100', '회의운영 규정', 'A-3100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '5'),
  ('A-4101', '관리표준 작성 지침', 'A-4101', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '품질보증팀', '7'),
  ('A-8101', '비상상태 대비 및 대응 규정', 'A-8101', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '6,8'),
  ('D-1100', '제품 특성 안전관리 규정', 'D-1100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '개발팀', '4,8'),
  ('D-2100', '안전보건관리규정', 'D-2100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('D-2101', '작업장 안전관리 지침', 'D-2101', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-1100', '환경 리스크 평가 규정', 'E-1100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '6'),
  ('E-1101', '환경측면 파악 및 리스크 평가표 작성지침', 'E-1101', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '6'),
  ('E-2100', '안전보건,환경 법규관리 규정', 'E-2100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '7'),
  ('E-3100', '환경운영관리 규정', 'E-3100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3101', '작업환경관리 지침', 'E-3101', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3102', '소음진동 관리 지침', 'E-3102', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3103', '폐기물 관리 지침', 'E-3103', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3104', '유해화학물질 관리 지침', 'E-3104', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3105', '대기관리 지침', 'E-3105', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3106', '수질관리 지침', 'E-3106', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3107', '소방시설 관리 지침', 'E-3107', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-3108', '에너지 관리 지침', 'E-3108', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '8'),
  ('E-5100', '감시 및 측정관리 규정', 'E-5100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '총무팀', '9'),
  ('J-3100', '4M 변경관리 규정', 'J-3100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '개발팀', '7,8'),
  ('J-4200', '도면 부품 일치성 점검 지침', 'J-4200', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '품질보증팀', '8'),
  ('M-1100', '생산관리 규정', 'M-1100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '생산팀', '8'),
  ('M-1200', '공정관리 규정', 'M-1200', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '생산팀', '8'),
  ('M-2100', '식별 및 추적성 관리 규정', 'M-2100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '생산팀', '8'),
  ('M-3100', '완성품 관리 규정', 'M-3100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '영업팀', '8'),
  ('M-4100', '3정 5S활동 규정', 'M-4100', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '생산팀', '7'),
  ('M-4200', '조도(Lux) 관리 지침', 'M-4200', '정본 0.7 매트릭스 관련규정 (문서 등록, 필드 미정의).', '["담당","팀장","사업부장"]', '품질보증팀', '7');

-- 2) 전 규정 69건: 책임부서·조항 기입(기존 양식 포함, reg_code 기준)
UPDATE forms SET resp_dept='총무팀', iatf_clause='5' WHERE reg_code='A-1100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='6' WHERE reg_code='A-2100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='9' WHERE reg_code='A-2200';
UPDATE forms SET resp_dept='총무팀', iatf_clause='5' WHERE reg_code='A-3100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='A-3200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='A-4100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='A-4101';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='A-4200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='A-5100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='A-5200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='A-6100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='A-6200';
UPDATE forms SET resp_dept='총무팀', iatf_clause='5' WHERE reg_code='A-7100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='6' WHERE reg_code='A-8100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='6,8' WHERE reg_code='A-8101';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='B-1100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='10' WHERE reg_code='B-2100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='10' WHERE reg_code='B-2200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='10' WHERE reg_code='B-2300';
UPDATE forms SET resp_dept='개발팀', iatf_clause='4,8' WHERE reg_code='D-1100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='D-2100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='D-2101';
UPDATE forms SET resp_dept='총무팀', iatf_clause='6' WHERE reg_code='E-1100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='6' WHERE reg_code='E-1101';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='E-2100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3101';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3102';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3103';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3104';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3105';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3106';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3107';
UPDATE forms SET resp_dept='총무팀', iatf_clause='8' WHERE reg_code='E-3108';
UPDATE forms SET resp_dept='총무팀', iatf_clause='9' WHERE reg_code='E-5100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='F-1100';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='F-1101';
UPDATE forms SET resp_dept='총무팀', iatf_clause='7' WHERE reg_code='F-2100';
UPDATE forms SET resp_dept='개발팀', iatf_clause='8' WHERE reg_code='H-1100';
UPDATE forms SET resp_dept='영업팀', iatf_clause='8' WHERE reg_code='H-2100';
UPDATE forms SET resp_dept='영업팀', iatf_clause='9' WHERE reg_code='H-3100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='H-3200';
UPDATE forms SET resp_dept='개발팀', iatf_clause='8' WHERE reg_code='J-1100';
UPDATE forms SET resp_dept='개발팀', iatf_clause='6,8' WHERE reg_code='J-1101';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='J-1102';
UPDATE forms SET resp_dept='생산팀', iatf_clause='8' WHERE reg_code='J-1103';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='J-2100';
UPDATE forms SET resp_dept='개발팀', iatf_clause='7,8' WHERE reg_code='J-3100';
UPDATE forms SET resp_dept='개발팀', iatf_clause='8' WHERE reg_code='J-4100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='J-4200';
UPDATE forms SET resp_dept='구매팀', iatf_clause='8' WHERE reg_code='K-1100';
UPDATE forms SET resp_dept='구매팀', iatf_clause='8' WHERE reg_code='K-1200';
UPDATE forms SET resp_dept='구매팀', iatf_clause='8' WHERE reg_code='K-2100';
UPDATE forms SET resp_dept='생산기술팀', iatf_clause='7,8' WHERE reg_code='L-1100';
UPDATE forms SET resp_dept='생산기술팀', iatf_clause='8' WHERE reg_code='L-1200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='L-2100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='L-2200';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='8' WHERE reg_code='L-2300';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='L-3100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='L-3101';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='L-4100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='L-4101';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='9' WHERE reg_code='L-4102';
UPDATE forms SET resp_dept='생산팀', iatf_clause='8' WHERE reg_code='M-1100';
UPDATE forms SET resp_dept='생산팀', iatf_clause='8' WHERE reg_code='M-1200';
UPDATE forms SET resp_dept='생산팀', iatf_clause='8' WHERE reg_code='M-2100';
UPDATE forms SET resp_dept='영업팀', iatf_clause='8' WHERE reg_code='M-3100';
UPDATE forms SET resp_dept='생산팀', iatf_clause='7' WHERE reg_code='M-4100';
UPDATE forms SET resp_dept='품질보증팀', iatf_clause='7' WHERE reg_code='M-4200';

-- 3) 프로세스 관련규정 매핑 29건 (갭만)
INSERT OR IGNORE INTO process_forms (process_code, form_code, sort_order) VALUES
  ('MP-02', 'E-1100', 70),
  ('MP-02', 'E-1101', 71),
  ('MP-01', 'A-2100', 72),
  ('MP-01', 'A-3100', 73),
  ('MP-01', 'A-4101', 74),
  ('MP-01', 'E-2100', 75),
  ('MP-01', 'E-5100', 76),
  ('CP-02', 'D-1100', 77),
  ('CP-02', 'J-2100', 78),
  ('CP-03', 'A-8101', 79),
  ('CP-03', 'D-2100', 80),
  ('CP-03', 'D-2101', 81),
  ('CP-03', 'E-3100', 82),
  ('CP-03', 'E-3101', 83),
  ('CP-03', 'E-3102', 84),
  ('CP-03', 'E-3103', 85),
  ('CP-03', 'E-3104', 86),
  ('CP-03', 'E-3105', 87),
  ('CP-03', 'E-3106', 88),
  ('CP-03', 'E-3107', 89),
  ('CP-03', 'E-3108', 90),
  ('CP-03', 'J-3100', 91),
  ('CP-03', 'M-1100', 92),
  ('CP-03', 'M-1200', 93),
  ('CP-03', 'M-2100', 94),
  ('CP-03', 'M-3100', 95),
  ('CP-03', 'M-4100', 96),
  ('CP-03', 'M-4200', 97),
  ('SP-02', 'J-4200', 98);
