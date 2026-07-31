# 전체 코드 검수 보고서 — 2026-07-31 (2차 전수)

**방법**: 6영역 병렬 검수(마이그·엔진/메인·렌더러·스크립트·슬러지·7/30 재대사) + 핵심 발견 4건
사무실 봇 직접 재검증. 범위 = 450357c(7/30 검수) 이후 델타 23커밋·58파일·+14,657줄 심층 +
슬러지는 src/server 전수(192파일). **코드 무수정 — 보고서만**(7/30 선례).

**총괄**: **Critical 1 · Major 12 · Minor 18± · 슬러지 6건**. 마이그 0116~0124 영역은
기계 검증 전 항목 통과(**결함 0**). 7/30 해결 3건(C-6·C-7·C-8) 회귀 없음. 시크릿·PII 신규
유출 0건. 오늘 완성한 P1·레거시 70종의 **데이터 층은 견실하고, 결함은 신호 소비층(UI·하네스
exit code·정직 표시 경계)에 집중**됐다.

---

## §1 Critical

**C-1 [스크립트] e2e-batch7/8 — 실패해도 exit code 0** (`e2e-batch7.mjs`·`e2e-batch8.mjs`
말미). 케이스 실패는 per-case try/catch가 삼키고 마지막이 `console.log('합계…')`로 끝남 —
`process.exit(fail?1:0)` 부재(e2e-p1b:79·smoke-grid-export:111은 있음). 전 케이스 500이어도
0 종료 → 자동화 체인·게이트에서 "전판 통과" 오판. **"E2E 343/343" 증거가 stdout 육안 판독
의존**. 부수: 케이스 예외 시 totalChecks 분모 자체가 줄어 첫 수치가 만점처럼 보이는 표시 왜곡.
→ 수정 2줄(양 파일 말미 exit 전파). 재검증 시 사무실 실측치는 stdout 육안 확인이었으므로
기존 통과 기록 자체는 유효.

## §2 Major (12)

### 보안·기록 주체
1. **`obligation:triggerComplete`가 STAMP_FIELDS 누락** (`server/index.cjs:205-208` — 3채널만.
   실측 확정). 핸들러 독스트링(obligation-handlers.ts:244)은 "세션 주체 강제 주입"을 주장하나
   실제 미등재 — 웹 모드에서 임의 사용자가 데이터 트리거를 타인 명의/무명(doneBy??null)으로
   ✓ 처리 가능. **"✓는 사람" 철학 위반 + 주석이 보호를 주장해 후속 검수가 놓치기 쉬움.**
   → 수정 1줄: `'obligation:triggerComplete': ['doneBy']`.

### 신규 채널(P1) — UTC·성능
2. **processLive/partProcess "오늘"=UTC** (`mes-records-handlers.ts:184,272,360` — 2개 영역
   교차 검출). KST 00~09시 홈 진입 시 어제 실적이 "오늘 실황"으로, 09시 후엔 아침 작성 기록이
   오늘 집계에서 누락. 알려진 P2(UTC→KST) 함정의 신규 표면 이식 — todayKST 공용 유틸 도입 시
   일괄 소탕 대상(form-handlers:461,521·case-handlers:135 포함 15곳+).
3. **processLive 홈 진입마다 sqc_daily 11.2만행 전량 스캔 + 행마다 앱 DB 쿼리 11.2만회**
   (`mes-records-handlers.ts:207-212` — gbnLabel()이 행당 prepare+get). 메인 프로세스 동기
   실행이라 그동안 전 IPC 정지(웹 서버 빌드에선 서버 전체 블록). qcgubun은 W/I/P 3종 —
   → 3칸 라벨 캐시 or `GROUP BY` 집계 SQL로 대체.

### 파손 신호 미소비(7/30 수정의 반쪽)
4. **엔진 가드 신호(valuesOk/gridOk/formulaSafe/guard)를 렌더러가 0건 소비**
   (form-handlers:557-567은 전달, FormCanvas:88은 여전히 mediaOk&&mergesOk만). 수식 차단으로
   값이 빠진 공식 문서도 화면엔 "출력 완료 — N개 항목 주입". 하네스는 보지만 사용자는 못 봄.
5. **FMEA 13행 이상 무음 절단** (fmea-export:133-135의 dropped/guardSkips를 fmeaStore·FmeaView가
   미표시). 20행 FMEA 출력 시 8행이 조용히 빠진 문서가 심사 제출될 수 있음.

### 렌더러 P1 — 정직 표시·동선
6. **ⓓ 카드가 T1(심사 갭 집계형)을 필터에서 제외** (`PortalHome.tsx:295` —
   triggerIssueId만. gapCount 기반 T1 미포함. 실측 확정). 캡션은 "행렬 공백·**심사 갭**에서
   자동 발행"이라 적고, 심사 갭만 있는 날은 **"공백 신호 없음 👍" 거짓 안심** 표시.
   KPI '데이터 할 일' 수치(235-237행, longGap 합산)와 카드 행 수도 불일치 가능.
7. **매트릭스 탭 "전체 보기 ›" 버튼 무반응** (`PortalHome.tsx:512` — setBoardView만 호출,
   setHomeTab('board') 누락. 실측 확정). 보드가 언마운트 상태라 화면 무변화 — 밴드의
   onOpenBoard(280-284행)는 제대로 탭 전환까지 하는데 이 버튼만 리팩터 누락.

### 스크립트·증거 파이프라인
8. **쓰기 E2E 4종 BASE 기본값=라이브 :8080** (batch7:18·batch8:17·p1b:12·smoke:21 —
   `E2E_BASE ||` 폴백). env 한 번 잊으면 라이브 DB에 가짜 제출 영구 기입 + 관제탑
   완료판정("작성기록=증거") 오염. → 기본 8081 또는 미지정 시 즉시 exit.
9. **capture.mjs scrollY 무음 실패** (200-206행 — `main` 부재·NaN·평가 예외 전부 조용히
   무시하고 캡처 진행). 레이아웃 개편 시 "하단 존" 이름의 최상단 캡처가 게이트 증거에 섞임.
   → 평가식이 scrollTop을 반환하게 해 미달 시 실패 처리.
10. **e2e-p1b 3단 트리거 단언이 사실상 항상 통과** (70-76행 — 기존 영속 트리거 행도 필터에
    걸림). trigger-engine이 죽어도 과거 발행분으로 "3단 ✓". → 주입 전/후 개수 diff로 강화.
11. **smoke-grid-export 앵커 검증 "비어있지 않음"뿐** (97-101행) — 수식 셀 차단·예시값
    잔존도 ✓. → 주입 리터럴 일치 확인으로 강화.
12. **forms-gap-audit VIEW_ONLY 하드코딩 이중 관리** (194-207행) — DB에 정본 마커
    (`description LIKE '📖 열람형%'`+change_log)가 있는데 수동 셋 의존. 다음 열람형 전환 시
    셋 갱신을 잊으면 갭A/legacy 카운트(현 91) 왜곡. → DB 마커 1차 판별 + 셋은 대사용.

## §3 Minor·[의심] 발췌 (상세는 영역별 원보고)

- **마이그(결함 0 클린)**: [의심] L1100-07 판단기준 G 앵커 홀짝(0121:105)·L1100-20 점검일
  2회차 U27 vs AJ27(0122) — 둘 다 주석↔맵 불일치 유형, **실물 1셀 확인으로 종결**.
  change_log reason 공란 8건(0121·0124).
- **엔진**: 사이드카 손상 시 available=false 폴백 못 타고 IPC 거부(신규 핸들러 2개만 try/catch
  누락)·미매핑 WRKCTR 무음 탈락(unmappedCodes 카운터 부재 — 신규 설비 코드 추가 시 기록 증발
  잠복)·'✕ 공백' 상태 운영상 도달 불가(미반입 우선 판정)·limit NaN 미방어·PREFIX_MAP 길이
  정렬 미강제(현재 무결·방어 1줄 권장)·verify 옵션형 광폭 통과.
- **스크립트**: verify-migrations 0개 적용도 통과·--seed 실패 삼킴·빌더 qty 파싱 실패 무음
  0(bad_qty 카운터 권장)·remove→rename 비원자(`os.replace` 권장)·p1b UTC 자정 경계·
  1글자 includes 단언 관용성.
- **렌더러**: data-testid 2종 CardShell 미포워딩(무효)·IPC 실패 시 onRetry 미전달(구서버에서
  "불러오지 못했습니다" 영구 고정)·ⓔ 탭 전환 시 MatrixBoard 아코디언 리셋(정보 손실 0의
  좁은 예외 — UI 상태만).
- **재대사**: 7/30 미해결 잔존 = W4 게이트 3(C-1~C-3)·비밀 위생 2(C-4·C-5)·P2 계열
  전 항목(날짜·조작차단 2경로·상태전이·발행번호·작성자 values·세션 회수·마이그 서버 경로) —
  전부 코드 무변경 확인, 무가드 145/149(신규 2채널은 읽기 전용이라 실질 증가 미미).

## §4 슬러지 (참조 실측 기반)

**즉시 제거 안전**: ① ipc-types.ts 고아 상수 3(`FMEA_DOC_STATUSES`·`FMEA_ACTION_PRIORITIES`·
`PPAP_SUBMISSION_STATUSES` — 참조 0 실측) ② 고아 파일 2(`DailyBoardCard.tsx` 200줄 —
7/16 포털 재편 이후 미참조·`RegulationViewer.tsx` 42줄 — 6/10 이후 무참조).
**리팩터 권장**: ③ `shortYmd` 3중 복제(오늘 P1 신규 3파일 — lib/utils 추출) ④ 빈
presentation_legacy 폴더+tsconfig exclude 죽은 참조. **클린 확인**: 채널 149 전량 사용·
미사용 import 0(192파일 전수)·renderer console.log 0·스테일 TODO 0.

## §5 권장 처리 순서

| 순위 | 묶음 | 규모 |
| --- | --- | --- |
| P0 | Major-1 STAMP 1줄 + C-1 exit 2줄 + Major-8 BASE 기본값 | 30분 — 보안·증거 신뢰 즉효 |
| P1 | 렌더러 정직·동선(Major-6·7) + 신호 소비(Major-4·5) | 반나절 — P1 다듬기로 묶음 |
| P2 | UTC 일괄 소탕(todayKST 유틸 — Major-2 포함 15곳+) | 기존 P2 트랙에 합류 |
| P3 | processLive 성능(Major-3)·하네스 강화(9~12)·슬러지 정리·[의심] 2셀 확인 | 여유 시 |
| 외부 | 7/30 잔존(W4 게이트·비밀 위생)은 사장님 결정 대기 그대로 | — |

*검수 = 사무실 봇 6영역 병렬 + 직접 재검증, 2026-07-31. 코드 무수정.*
