# E2E 하네스 명단·실행 규약 (정본 · 2026-08-17 C′)

## 0. 실행 방법 — **`node` 가 아니라 `electron.exe`**

`better-sqlite3` 는 **Electron ABI(125)** 로 빌드된다(`postinstall: electron-builder install-app-deps`).
시스템 `node` 22(ABI 127)로 돌리면 `ERR_DLOPEN_FAILED` 로 죽는다. 헤더의 `node(electron)` 표기가 이 뜻이다.

```powershell
$env:ELECTRON_RUN_AS_NODE="1"
$env:IATF_DATA_DIR="C:\Users\<사용자>\AppData\Local\Temp\qms-e2e-<날짜>"
$env:E2E_DB="$env:IATF_DATA_DIR\iatf16949.db"
node_modules\electron\dist\electron.exe scripts\e2e-w4b.mjs
```

env 2종(`IATF_DATA_DIR`·`E2E_DB`)은 **필수**다. 없으면 게이트가 즉시 중단시킨다(폴백 금지).

## 1. 안전 계층 — `scripts/lib/e2e.mjs` (신규 하네스는 반드시 경유)

| 게이트 | 무엇을 막나 |
| --- | --- |
| `assertCopyDb(E2E_DB)` | 라이브 DB 파일. **실경로(realpath)+동일파일(dev/ino)** 비교 — 정션·subst·하드링크 우회 차단. `APPDATA`·`USERPROFILE` 둘 다 없으면 **판별 불능 = 중단**(fail-closed) |
| `assertBaseNotLive(BASE)` | 라이브 서버. **URL 파싱**으로 포트 확인(`:8080?x`·`#x` 우회 차단) + **루프백 외 호스트 거부** |
| `assertCopyServer(BASE, cookie)` | 대상 서버가 라이브 DB 로 떠 있는 경우(`health.copy !== true` → 중단) |
| `assertCopyPreflight(BASE)` | 위 항목을 **하네스 자체 로그인 흐름을 건드리지 않고** 1줄로 — E2E봇 1회 로그인 후 세션 폐기 |
| `loginBot(BASE)` | `assertCopyServer` 내장 로그인(권장 경로) |
| `guardLoginName(argv)` | 실무자 이름 로그인. 무인자 = `E2E봇`, 그 외 이름은 거부(8/13 STAMP 오인 사고 조건) |
| `loginExec` / `loginProbe` | executive·일반 계정 로그인(명시 API — 규칙 정리·403 음성 단언 전용) |
| `mkApi` / `mkCheck` / `ymdKST` | 복붙 회수용 공용 유틸 |

⚠ **비표준 포트로 뜬 라이브는 포트만으로 판별할 수 없다.** 복사본 여부의 정본은 언제나
`health.copy` (= `assertCopyServer` / `assertCopyPreflight`)다. `assertBaseNotLive` 는 값싼 1차 관문일 뿐이다.

## 2. 활성 회귀 세트 (9종 · 170건)

| 하네스 | 건수 | 축 |
| --- | --- | --- |
| `e2e-cr13a.mjs` | 20 | 8/13 처분 A군(C-1 승격 봉쇄·M-1 엑셀 가드·M-12 health 식별자) |
| `e2e-dgroup.mjs` | 17 | D군 승격분(Minor 10 다운로드 토큰 세션 바인딩·M-6 권한 변경 세션 무효화) |
| `e2e-cr13b.mjs` | 8 | 8/13 처분 B군(403 통지·정직 표기) |
| `e2e-w4a.mjs` | 9 | W4 배치A(health 슬림·PROTECTED 3종·E2E봇 시드) |
| `e2e-w4b.mjs` | 27 | W4 배치B(0142 매트릭스·SCREEN_GUARD·단가 하드락) |
| `e2e-d34-b3.mjs` | 24 | 34호 배치⑶(조업달력·분모·성과지표·추적) |
| `e2e-d35-tv.mjs` | 12 | 35호 전광판 |
| `e2e-g1-inbox.mjs` | 27 | G1 수집함 |
| `e2e-pc1.mjs` | 27 | PC-1 기록 쓰기 |

## 3. 화면(렌더러) 프로브 — HTTP 축 E2E 의 사각

| 프로브 | 용도 |
| --- | --- |
| `e2e-bprime-ui.mjs` | B′ 표적(30) — 1부 `SERVER_ENFORCED_ACTS` ↔ 서버 `SCREEN_GUARD` **소스 파싱 대조 tripwire** · 2부 헤드리스 실측(N-7 우회 봉쇄·N-2 표시 전용) |
| `e2e-tvboard-poll.mjs` | 전광판 폴링 계수(60초 계약) — 8/13 폭주 재발 감시 |
| `e2e-w4c-desktop.mjs` | 데스크톱 경로 주체 방어(bridge 직접 호출 = STAMP 미주입) |

## 4. 구세대 하네스 (회귀 미포함 · C′ 에서 게이트 이식 완료)

`e2e-batch1~6.mjs` · `e2e-b4.mjs` — 7종.

- **종전 위험**: 기본 대상이 **라이브 `:8080`** + `argv` 로 **실무자 이름 로그인** + 제출 생성(쓰기).
  8/13 오인 사고("복사본 통계를 실사용으로 오독")의 조건이 그대로 남아 있었다.
- **C′ 처분**: 기본 `:8081` + `assertBaseNotLive` + `guardLoginName`(E2E봇 강제) +
  `assertCopyPreflight` 1줄. 자산은 보존하되 **라이브를 기본으로 겨누지 않는다.**
- `e2e-batch7·8.mjs` · `e2e-p1b.mjs` 는 원래 기본이 `:8081` — 동일 규약으로 정렬 대기(잔여).

⚠ 검수 보고서(8/14)의 "구세대 9종"은 **실측 7종**이다 — 명단에 있던 `w2-smoke`·`w2-screens` 는
현존하지 않는다(자기정정, C′ 검수요청 §자기정정 참조).

## 5. 판매판 회귀 (S2 개정 8/19 — S3-1·S3-2 데이터층 GREEN 8/19 저녁 · xlsx 42종은 파일 자산이라 DB 단언 밖)

| 하네스 | 건수 | 축 |
| --- | --- | --- |
| `e2e-clean-install.mjs` | 13 | **A 레거시 경로**(마이그 전 체인 — 관찰) + **B 판매 경로**(러너 정본 `server/migrate-core.cjs` 클린 설치 = 스키마 스냅샷+팩) · 러너 감사·FK·시드 파리티·팩별 시드·프로파일 16키·TPC 7종/실명 5인 0건·플로우스루·**A↔B 스키마 동치**·**⑩ 표준팩 SQ층(S3-1 GREEN)**·**⑪ 양식 카탈로그·규정 뼈대(S3-2 GREEN — forms 290+/사업부 scope 0·bom 100+·뼈대 800+)**·**⑫ 레거시 무해(A 체인에 표준팩 전 파일 적용 → 11테이블 행수·양식명 불변)**·**⑬ 표준팩 xlsx 템플릿(238파일 실재·레이아웃 커버 100%·셀 TPC 0)** |
| `e2e-setup-wizard.mjs` | 22 | **M2 설치 첫날 E2E** — 빈 폴더 클린 설치(:8097) → /login→/setup 유도 → 입력 검증 3 → 마법사 완료(회사·관리자 executive·IATF 애드온 on) → 자동 로그인·brand·프로파일·forms 294 → 재진입 409/redirect → 관리자 재로그인 → **플래그 없음 = E2E봇 401(검수 전용)** → 같은 폴더 `IATF_REVIEW_COPY=1` 재기동 = copy=true + E2E봇 관문 통과. 서버는 스크립트가 띄우고 내림 |
| `e2e-standard-templates.mjs` | 11 | :8083 표준팩 서버 출력 실증 — 프로파일 companyName 세팅 → 8양식 제출·exportXlsx → 재판독(시트명=코드·`{{companyName}}` 토큰 잔존 0·회사명 치환·TPC 0·주입값) → 원복. 8080 거부 |
| `gen-core-schema.mjs --check` | 1 | `resources/core/schema.sql` 드리프트 0(스냅샷 지점 0144 재생성 결과와 바이트 동일) |

- **"지금 판매 가능한가"의 상시 지표**(39호 S4 → 41호 M1). §2 활성 세트와 분리 운영.
  **8/19 S3-1 = 10/11 → S3-2(저녁) = 12/12 · "판매 가능 여부: YES"** — ⑥⑦(TPC·실명) GREEN + ⑩ 표준팩 SQ층 GREEN
  (gen-pack-standard.mjs — 백본 42·가이드 372·④-4 재작성 11+4행·체크포인트 162 상태 리셋·pack_forms 57·APQP 43·KPI 35
  목표 0·의무 67 실명 0) + **⑪ 양식 카탈로그·규정 뼈대 GREEN**(080 forms 294 — 302 중 사업부 전용 6+타사업부 열람형 2 제외,
  SQ 미니멀 정션 참조 3종은 공통 편입 · 081 레이아웃 4테이블 · 090 bom_documents 105 뼈대 · 091 규정 뼈대 95종×9절=855행)
  + **⑫ 레거시 무해**(A 체인 DB 에 팩 10파일 적용 → forms/필드/셀맵/그리드/bom/규정/SQ/의무/KPI 행수·양식명 불변 —
  regulation_sections 는 "테이블 비어 있을 때만" 적재하는 SQL 이라 TPC 622행 보유 DB 에 뼈대가 끼어들지 않음).
  "판매 가능 여부" 줄 = ⑥⑦⑩⑪ 합산. 중립화 규칙·명시 맵 = `scripts/lib/neutralize-forms.mjs`, 대조본 생성 =
  `scripts/gen-forms-before-after.mjs`. **8/23 S3-2 후반 = xlsx 238종 완료**(`gen-pack-standard-templates.mjs` → templates/standard/ · 회사명 `{{companyName}}` 토큰 + 엔진 `applyProfileTokens`) → **13/13**.
  **레거시 무해 실증(S3-1)**: 8/19 :8081 재기동 — 행수·assignee 73·체크포인트 상태 64·KPI 목표 32 전부 유지.
- 클린 설치 경로(S2): 빈 DB → `resources/core/schema.sql`(스냅샷, 데이터 0) + `core/bootstrap.sql`(프로파일 빈 키 16)
  → snapshot 이하 마이그 143개는 `_migrations.status='snapshot'` 기록 → 초과분(0145~) 은 `packs.json` kind 로
  적용/스킵 → `resources/packs/<pack>/*.sql`. 웹 서버는 `IATF_INIT_DB=1`(+`IATF_INSTALL_PACKS=standard`) 로만 진입.
- 관찰치(A 경로): TPC 계열 **478행 · 실명 121행**(8/18 베이스라인 124 는 persons.json 시드 3행 포함분 — A 는 마이그만).
- 라이브 무접촉: `%TEMP%` mkdtemp 전용 · DB 경로를 env/argv 에서 받지 않음 —
  §0 의 `IATF_DATA_DIR`/`E2E_DB` **불필요**, §1 게이트 비경유(서버 비접촉·로그인 없음).
- 실행: `ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-clean-install.mjs`
- 스냅샷 지점을 옮길 때만 `scripts\gen-core-schema.mjs`(무인자) 로 재생성 — 그 외엔 `--check` 만.

## 5-1. ★복사본 규약 변경(M2, 8/23 — 42호 D)

- 검수 복사본 표지(`health.copy`)와 E2E봇 로그인은 **`IATF_REVIEW_COPY=1` 명시 플래그**로만 열린다. `IATF_DATA_DIR` 만 바꾼 서버 = 고객사 설치(copy=false·E2E봇 401).
  플래그가 켜졌는데 라이브 DB 를 열면 기동 거부(fail-closed). `start-standard-review.bat`·`e2e-console-kill`·`e2e-cprime-gates` 반영.
  **:8081 수동 기동 시 `set IATF_REVIEW_COPY=1` 필수** — 빠뜨리면 모든 하네스가 `assertCopyServer` 에서 즉시 중단된다(의도된 동작).

## 6. 기타 검증 스크립트

- `smoke-grid-export.cjs` — grid 8종 스모크. **C′**: `IATF_DATA_DIR` 없을 때 라이브 DB 를 열던
  폴백 제거(.cjs 라 lib(ESM) 미사용 — 같은 계약을 인라인으로 둠).
- `seed-local-passwords.cjs` · `setup-passwords.cjs` — 비번 시드/발급(오프라인).
- `restart-qms-server.bat` — **라이브 재기동 정본**. 실행 전 36호 5항(스윕 사정권 사전 조회) 준수.
  C′ 에서 `/t` 트리킬 제거 — 매치된 창을 죽여도 electron 은 콘솔에서 분리돼 있어
  **:8081 검수 서버가 살아남는다**(8/16 위험의 근본 처분).
