# 전수 검수 — 2026-08-06 (이틀치 수정분: cd645f6..HEAD, 21커밋 · 38파일 · +4,904줄)

> **방법**: 병렬 검수 2조(메인·서버 / 렌더러 — 버그·로직·보안·계약·성능·슬러지 관점, 라인 실측
> 강제) + 봇 교차 확인(대표 발견 3건 코드 재검증: substr UTC 3곳·T4 취소 필터 부재·2단 서명
> 데스크톱 경로 — 전부 실재). 범위 = G1·PB2·31호·PC-1·32호 0번 골격 + 8/4 P0 후속.
> **즉시 조치 3건 완료(당일 밤)** — 나머지는 조치 계획(P0/P1/P2)로 분류, 내일 배치.

## Critical 3건

| # | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| C-1 | InspEntryView:94 | 검사일 = `toISOString` 절단(UTC) — KST 00~09시 기록이 전날로 영구 기입(append-only라 정정 불가) + todayKST 기준 "오늘 목록"에 안 떠 확인✓·취소 동선 단절. **7/30 M-날짜의 재발** | **✅ 당일 수정**(todayKST 강제) |
| C-2 | ProdEntryView:73 | 실적일 동일 UTC 패턴 — LOT 발번 일자(todayKST)와 실적일 하루 어긋남 | **✅ 당일 수정** |
| C-3 | semimes-write-handlers:354~368 | **데스크톱 경로에서 2단 서명 우회**: Electron엔 서버 STAMP가 없어 드롭다운 사용자명이 그대로 confirmer로 — 검사자 A 기록 후 드롭다운 B 전환으로 같은 사람이 2단 완성. inspector NULL이면 자기확인 검사 자체 무력. 주석("대필 경로 0")과 코드 불일치 | **P0(내일)** — ①inspector 빈 값 서버 거부 ②데스크톱 주체 인증은 W4 보안 트랙 병합 설계 |

*완충: 라이브 운영은 웹(:8080 — 서버 STAMP 작동)이라 야간 실위험 낮음. C-3는 데스크톱 실행 한정.*

## Major 10건 (전부 내일 P0~P1)

| # | 위치 | 내용 |
| --- | --- | --- |
| M-1 | write-handlers 8곳 + semimes-handlers 3곳 | 기록주체 클라 값 수용(데스크톱) 채널 10종 — 웹은 STAMP 강제되나 데스크톱은 임의 문자열·NULL 허용. 최소 방어(주체 빈 값 거부)부터 |
| M-2 | semimes-handlers:284~350 | **captureTag에 recordSource 가드 누락** — sidecar 설치에서도 수불 생성(이중 기록 금지 계약 위반 경로). 1줄 수정 |
| M-3 | trigger-engine:115~144 | **T4가 취소 기록을 산 것으로 취급** — hasInsp·dates·hasReceipt 전부 `canceled_at IS NULL` 필터 없음 → 취소된 검사로 해소 오판·자동취소 분기 도달 불가(죽은 분기) |
| M-4 | mes-records-handlers:261·358·408 | **form_submissions 집계 substr = UTC 절단** — 아침 작성분이 도넛·심사 뷰 셀에서 전날 귀속(7/31 Major-2 재발). `date(created_at,'localtime')`로 통일 |
| M-5 | semimes-handlers:286~348 | captureTag 상태 확인이 트랜잭션 밖(TOCTOU) — 데스크톱+웹 동시 태깅 시 수불 2벌. 검사·UPDATE를 트랜잭션 내로 + status 조건 |
| M-6 | mes-records-handlers:242~·343~ | processLive·auditMatrix 요청마다 sqc/mac 전 이력 풀스캔 — 덤프 누적 시 홈 로딩 저하. MAX/GROUP BY SQL로 대체 |
| M-7 | PortalHome:1391·1347 | KPI 타일 빈 값 Enter → `Number('')===0` 저장(가짜 0) + catch 없음 |
| M-8 | WorkOrderView:42~58 | 발번 연타 가드 없음 — 더블클릭 = 지시 이중 발번. catch도 없음 |
| M-9 | KpiGridView:63~99·45 | 저장 연타 이중 배치 + 연도 전환 시 미저장 편집 무확인 파기 + 부분 성공 무안내 |
| M-10 | InspEntry·ProdEntry 전 invoke | catch 없음 — 웹 모드 네트워크 오류 시 소리 없는 실패(입력은 보존됨) |

## Minor 16건 (P1 — 내일·모레 편성)

렌더러: 수집함 qty 빈칸 사전검증 없음 · dirty 판정에 receiptClass/kind 누락 · 구분 초안이 수동
선택 덮어씀 · 검색 타이머 공유/정리 없음 · ng=0 복귀 시 defectCode 잔존 · 검사종류 전환 시 입력
무확인 교체 · ModalSheet 접근성(role/포커스 트랩/스크롤 잠금) · KPI 미저장 표시 색 단독 ·
KPI_MONTH 12회 직렬 · MesRecordsView UTC(표시 전용).
서버: T3 기한 당일 overdue 표기 불일치 · 소급 tagYmd에 취소 행 포함 · receipt_rows 취소 포함 ·
cancel/confirm UPDATE 상태 조건 없음(교차 프로세스 덮어씀) · 발번 경합 시 원시 UNIQUE 에러
노출(재시도 없음) · express 8mb < 핸들러 9M자(안내 불달, 413 원시) · lastYmd 오늘만 갱신 모순 ·
auditMatrix 앱 기록 everLast 창 한정 · downloadTokens/EXPORT_DIR 무만료 · /api/health 무인증
(127.0.0.1 한정이라 저위험 — W4 시 재검).

## 일관성 3건

- ~~Sidebar SCHEMA_REV '0136'~~ → **✅ 당일 0137 수정**
- PortalHome:159 대리 완료 window.confirm — ModalSheet 방침(커스텀 확인창)과 상충. 기존 화면
  4곳(navBack·RevisionsModal·ObligationPage·UserManageModal)도 동일 — 일괄 교체는 P1
- MesMenuBar insp-entry 이중 등재(생산+품질) — 메가바 이중 점등·SubTabs 오귀속. 품질관리
  항목을 진입 전용 표기로 정리(P1)

## 슬러지 7건 (P2 — 처분은 확인표 정합 필요)

ProcessLiveStrip(31호 유물 — import 0) · ProcessLiveMatrix(Strip에서만 참조 → 전이 사장.
**"손실 0" 약속 위반**: 커버리지 상세 도달 경로 소멸 — mes-records 화면엔 있으므로 확인표
갱신 or 재배선 필요) · PipelineBand(import 0) · ProcessLiveDonuts(의도 존치 — 전광판 대기
명문) · W_MAP(매칭 0 자인 — 존치 사유 주석 유지) · captureCreate catch 죽은 분기 ·
listBoardIssues obTitle 미사용.

## 이상 없음 확인 (실측)

SQL 인젝션(화이트리스트·플레이스홀더) · 경로 탈출 · 웹 세션 가드(health 제외 전 채널) ·
append-only UPDATE 채널 부재 · 마이그 0134~0137 멱등·FK·재생성 안전 · PAGE_LABELS 전수 ·
토큰 정의 전수 · 모달 stale 참조 없음 · uiStore/useHeatColors 건전.

## 조치 계획

| 순위 | 내용 | 시점 |
| --- | --- | --- |
| ✅완료 | C-1·C-2(UTC 날짜)·SCHEMA_REV | 8/6 밤(본 커밋) |
| ✅**P0** | C-3 최소방어 + M-2(sidecar 가드)·M-3(T4 취소 필터)·M-4(substr→localtime)·M-5(TOCTOU)·M-8(발번 연타) | **8/11 완료** — E2E pc1 26/26·g1 27/27 + 표적 프로브 8/8(sidecar 태깅 거부·검사자 부재 확인 거부·취소검사 해소 오판 없음) |
| ✅P1 | M-1·M-6·M-7·M-9·M-10 + Minor 대부분 + 메뉴 이중 등재 | **8/11 완료**(커밋 2158407) — E2E 53/53·프로브 10/10. **보류 4건**(검사종류 전환 무확인·ModalSheet 접근성·confirm 일괄 교체 6곳·downloadTokens 만료) = confirm/접근성 묶음 배치(사장님 8/11 승인) |
| ☐수동확인(**W4 이월**) | **M-1 데스크톱 경로 거부**(사용자 미선택 → 기록주체 빈 값 거부 안내) | 웹 E2E·코워크 모두 재현 불가(STAMP 주입/웹 경유) → 사장님 수동 확인 1회 항목. **단 현행 설치판엔 M-1 코드 부재(재빌드 범위 0134+) — W4 설치판 재빌드 후 확인으로 조건 명기(8/11 사장님·코워크)**. W4 배치에 자동 동반 |
| P2 | 슬러지 7(확인표 정합 동반) + 데스크톱 STAMP 설계(W4 병합) | 1차분 후 |

## 총평

이틀 신규분의 서버 계약(실측값·취소 사유·2단 서명·발번)은 문서를 충실히 번역했고 웹 경로에서
전부 실증됐다. 아픈 곳은 셋: ①**날짜 축 회귀** — todayKST 유틸·재발 방지 주석이 있는데 신규
화면 2곳과 서버 집계 3곳이 UTC 절단을 다시 썼다(당일 2곳 봉합, 서버 3곳 P0) ②**취소 마크
규약 미습관** — 0137을 만든 당일 코드 3곳이 필터를 빠뜨림 ③**데스크톱 경로의 주체 공백** —
"STAMP 강제"는 현재 웹 한정 사실. E2E가 못 잡은 이유도 기록함: E2E는 웹 경로만 탔다 —
데스크톱 경로 단언을 검수 기준에 추가한다.
