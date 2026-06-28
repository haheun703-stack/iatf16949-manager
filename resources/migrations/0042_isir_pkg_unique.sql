-- 0042_isir_pkg_unique.sql
-- 방어: isir_packages 자연키(part_no, rev_code) UNIQUE.
--   0041 류 시드는 자식행을 (SELECT id FROM isir_packages WHERE part_no=? AND rev_code=?) 서브셀렉트로 연결.
--   같은 부품·사양을 다른 마이그레이션으로 재적재하면 패키지 2행 → 서브셀렉트가 첫 행 id만 반환(silent 오연결).
--   UNIQUE 로 중복 적재를 차단(P2 다품번/재적재 대비). migrate.ts 트랜잭션 래핑(BEGIN 없음).
CREATE UNIQUE INDEX IF NOT EXISTS idx_isir_pkg_natkey ON isir_packages(part_no, rev_code);
