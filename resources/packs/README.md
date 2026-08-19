# resources/packs — 설치 팩 데이터 (39호 S2, 2026-08-19)

러너(`server/migrate-core.cjs`)가 마이그레이션 적용 **뒤**에 `install.packs`(app_config) 순서대로
`packs/<pack>/*.sql` 을 번호순 실행하고 `_migrations` 에 `packs/<pack>/<file>` 로 기록한다(멱등·1회).

| 팩 | 내용 | 채움 시점 |
|---|---|---|
| `standard/` | 표준팩 — 업종중립 골격(SQ 백본·미니멀 팩·코어툴 구조·KPI 이름·정기의무 표준·양식 카탈로그/레이아웃·뼈대 템플릿). 40호 ④ 도장 기준 | **S3**(8/22~27) |
| `tpc/` | TPC팩 — 레거시 DB 는 이미 마이그 체인에 데이터가 있으므로 비어 있음. 신규 TPC 재설치용 시드가 필요해지면 여기 | 필요 시 |

규칙: 파일 = 데이터 전용(INSERT/UPDATE), 컬럼 목록 명시, `INSERT OR IGNORE`/`ON CONFLICT DO NOTHING` 로 멱등.
실명·실주소·실거래 금지(standard). 클린 설치 게이트(`scripts/e2e-clean-install.mjs`)가 매번 TPC 식별자·실명 0 을 단언한다.
