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

## 2. 활성 회귀 세트 (8종 · 153건)

| 하네스 | 건수 | 축 |
| --- | --- | --- |
| `e2e-cr13a.mjs` | 20 | 8/13 처분 A군(C-1 승격 봉쇄·M-1 엑셀 가드·M-12 health 식별자) |
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

## 5. 기타 검증 스크립트

- `smoke-grid-export.cjs` — grid 8종 스모크. **C′**: `IATF_DATA_DIR` 없을 때 라이브 DB 를 열던
  폴백 제거(.cjs 라 lib(ESM) 미사용 — 같은 계약을 인라인으로 둠).
- `seed-local-passwords.cjs` · `setup-passwords.cjs` — 비번 시드/발급(오프라인).
- `restart-qms-server.bat` — **라이브 재기동 정본**. 실행 전 36호 5항(스윕 사정권 사전 조회) 준수.
  C′ 에서 `/t` 트리킬 제거 — 매치된 창을 죽여도 electron 은 콘솔에서 분리돼 있어
  **:8081 검수 서버가 살아남는다**(8/16 위험의 근본 처분).
