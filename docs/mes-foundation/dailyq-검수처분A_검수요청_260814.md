# 검수 처분 A군 검수요청 — C-1 승격 봉쇄 · M-1 가드 소생 · M-7 fail-closed · M-12 재기동 신뢰성 (2026-08-14)

> **첫 줄 하네스**: 신규 `scripts/e2e-cr13a.mjs` **20/20 ×2(멱등)** + 회귀 **164/164**(w4a 9 ·
> w4b 23 · pc1 27 · g1 27 · b3 24 · b4 28 · d35 12 · w4c-desktop 14) + typecheck node+web +
> build + build:server + 클린설치 재현(0001~**0143** · FK 0) + **M-7 음성 실증**(기동 거부 exit 1).
> 대상 = :8081 **새 복사본**(qms-e2e-260814 · A군 서버 코드로 기동 · 서규하/2222 · E2E봇/qms1234).
> 정본 = `docs/code-review-2026-08-13.md` §7-A — TODO 정본 8/13 사장님 도장분의 당일 이행.

## 1. C-1 — 권한 승격 봉쇄 (Critical ①)

어제 도장한 판정①(권한 배분 = 사장님 고유)이 "팀장 클릭 4번"으로 뚫리던 구멍. 4겹으로 봉쇄:

- **PROTECTED**: `appUser:upsert`/`resetPassword`/`delete` = **executive 전용**(`server/index.cjs`).
  manager 호출 = 403 — cr13a 1단 실측(어제까진 200이던 경로).
- **핸들러 2중 방어**(`app-users-handlers.ts` `actorDenied`): 디스패처가 세션 주체
  (`actorName`/`actorRole`)를 강제 주입(클라 위조값 무시 — STAMP 동일 원칙), 핸들러가
  ①주체 없음 = 거부 ②비executive 는 경영진을 만들 수도(role 지정) 건드릴 수도(수정·삭제·비번)
  없음을 검사. **INSERT 가 동명 기존 행을 UPDATE 하는 경로(ON CONFLICT)까지 대상 조회로 방어.**
- **데스크톱 경로**(bridge 직행 = 세션 없음): appUser 쓰기 3종 = **무주체 거부** — W4-C
  방어선에 편입(cr13a 3단 실측). 데스크톱 앱에서 사용자 관리는 이제 조회 전용.
- **UI**(`UserManageModal`): 역할 드롭다운 '경영진' = **executive 화면에서만 노출**, 경영진 행은
  비executive 화면에서 표시 전용(disabled).
- **감사 각인(마이그 0143)**: `app_users.pw_reset_by`/`pw_reset_at` — resetPassword 성공 시
  세션 주체 각인. cr13a 2단 실측: 위조 `actorName` 전달 → **세션 사용자로 덮여 각인**.

**운용 변화(확인 요청)**: 비번 재설정·사용자 등록이 **사장님 전용**으로 좁아짐(7/25 "관리팀
대장 운용"과 달라짐 — 판정①의 연장선으로 이행. 관리팀 재확대 = PROTECTED 1줄 자리).

## 2. M-1 — FMEA 엑셀 가드 소생 + 웹 다운로드 3종 소생 (S-5 동반)

- **SCREEN_GUARD**: `'fmea:export'`(실존하지 않는 채널명) → `'fmea:exportXlsx'` — 죽어 있던
  엑셀 가드가 살아났다. cr13a 4단 실측: 규칙(excel 0) → **403** → 해제 → 정상 다운로드.
- **SAVE_DIALOG_CHANNELS 죽은 키 3개 전부 실채널로 정정**: `fmea:export`→`fmea:exportXlsx` ·
  `report:export`→`report:exportScores` · `sqReport:export`→`sq:assessExport`.
  ⚠판독 확대: 이 3종은 **웹에서 내보내기 자체가 무음 취소 상태였다**(키 불일치 = shim 경로
  미주입 = canceled). 정정으로 **FMEA 신판·AI 채점 리포트·SQ 평가 xlsx 웹 다운로드 소생**.
- **동반 2곳**(`fmea-handlers`·`report-handlers`): `if (!win) return` 조기 반환이 웹(창 스텁
  null)에서 다이얼로그 주입 전에 끊고 있었다 — kpi 핸들러의 win 분기 패턴으로 통일.
- 실증: fmea:exportXlsx → 다운로드 토큰 → **GET /download = 169,210B xlsx 실물**(cr13a 4단).
  report:exportScores 는 복사본 form_scores 0건이라 skip 명시(데이터 있으면 동일 경로).

## 3. M-7 — 마이그 fail-open 차단 (fail-closed 전환)

- 마이그 적용 실패 = **기동 중단**(종전 "계속 진행" → 매트릭스가 통째로 꺼진 채 조용히 서빙).
- **부팅 후 검증**: `screen_permission` 테이블 실재 확인 — 없으면 기동 거부. 런처 bat 의
  [FAIL]+로그 꼬리(8/13 보강)가 있으므로 중단 = 곧 발견.
- `screenRuleOf` 무음 catch → **로그 1줄**(현행 유지 동작은 불변 — "가짜 차단 금지" 유지).
- **음성 실증**: 복사본에서 `screen_permission` DROP 후 기동 → `[server] screen_permission
  테이블 없음(0142 미적용 DB) — 기동 중단(M-7)` + **exit 1** 실측.

## 4. M-12 — 재기동 스크립트 신뢰성 + 신원 복구

- `restart-qms-server.bat`: ①taskkill 맹신 제거 — **포트 해제를 최대 6초 재확인**, 실패 시
  아무것도 시작하지 않고 [FAIL](구판이 계속 서빙 중임을 명시) ②**고아 "IATF QMS Server" 창
  스윕**(재기동마다 1개씩 쌓이던 것 — 어제 실측 2개) ③기동 후 **신판 PID·기동시각 표시**.
- health(무인증): `{ok}` → `{ok, pid, startedAt}` — **신원 아닌 식별자만** 복구(구판/신판 구분
  근거. DB 경로·건수·runtime 은 여전히 세션 전용 — 배치A 슬림 계약 유지, w4a 0단 갱신).

## 5. 검증 총괄

| 축 | 결과 |
|---|---|
| 신규 e2e-cr13a(C-1 웹+데스크톱·감사·M-1 전 주기·M-12) | **20/20 ×2 멱등** · 잔여물 0 검산 내장 |
| 회귀 | **164/164**(w4a 9·w4b 23·pc1 27·g1 27·b3 24·b4 28·d35 12·w4c 14) |
| 클린설치 재현 | 0001~**0143** 전 적용 · FK 위반 0 |
| M-7 음성 실증 | screen_permission 없는 DB → 기동 거부 exit 1 |
| typecheck / build / build:server | 전건 통과 |

## 6. 재기동 · 후속

- **라이브(:8080)는 구판 유지 중** — A군은 서버 변경이라 재기동 1회 필요(0143 동반).
  재기동 창 = **사장님 지정 대기**(재로그인 1회 발생). B군(렌더러 한정·재기동 불요)은 오늘
  이어서 진행 — :8081 정적 자산이 낮에 B군 번들로 갱신될 수 있음을 사전 고지(A군 검수는
  API 축이라 무영향).
- 판정 필요 항목 없음(전건 8/13 TODO 도장 범위 내). §1 운용 변화만 확인 부탁드립니다.
