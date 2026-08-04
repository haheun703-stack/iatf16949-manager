# 전체 코드 검수 보고서 — 2026-08-04 (3차 전수)

**방법**: 3영역 병렬 검수(①8/4 코드 변경 적대 검증 ②스크립트·마이그 규율 ③7/31 재대사+슬러지)
+ 최상위 발견 사무실 봇 직접 재검증. 범위 = 7/31 검수 이후 델타(8/4 커밋 11 — 코드 실변경은
`7535bc4` P2·`06dc0ce` PE 2건) + 전 잔존 재대사. **코드 무수정 — 보고서만**(7/30 선례).
즉시 정정 1건만 예외(문서: 4차 노트 헤더 색 규칙 모순 — 구현자 오독 방지).

**총괄**: **Critical 1 · Major 7 · Minor 15± · 슬러지 7**. 7/31 지적 5건은 해소 실증
(STAMP·UTC 일괄·e2e 4종·미사용 import 0 유지), 잔존 10건은 전부 코드 무변경 확인.
8/4 신규 코드의 결함은 **"고친 것이 반쪽"** 유형에 집중 — 발행번호는 DB만 유일하고 문서 본문은
여전히 중복 가능(C-1), e2e 방어는 9종 중 4종만(M-3), approved 불변은 role 가드 없이 선행 도입(M-1).

---

## §1 Critical

**C-1. 재채번 발행번호가 values_json 에 미반영 — 문서 본문 번호는 여전히 중복 가능**
(`form-handlers.ts` create + `formStore.ts`) 초안 기본값이 `values[autoKey]`와 serialPreview
양쪽에 같은 번호를 주입하는데, 서버 재채번(0131 대응)은 **serial_no 컬럼만** 갱신한다. 엑셀
출력은 values_json만 읽으므로(=docgen에 serial_no 참조 0) 동시 사용자 시나리오에서 **발행문서
2장이 같은 번호로 인쇄**될 수 있다 — M-발행번호 수정의 목표(증거물 유일성)가 미달성.
부수: formStore가 갱신하는 serialPreview는 화면 어디에도 표시되지 않음(실효 0).
→ 수정: create/update에서 재채번 시 values_json의 자동 발행번호 필드(autoKey)도 동기 갱신
+ 응답 serialNo를 캔버스 값에 반영.

## §2 Major

1. **M-1 approved 불변 게이트의 도입 순서 문제** — 출력(`formStore:280`)·개정 스냅샷(`:318`)이
   값 무변경이어도 saveDraft를 선행 호출 → **승인본은 공식 출력·개정 불가**. 동시에
   `form:submissionUpdate`가 PROTECTED 미등재라 웹에서 role 무관 2회 POST(submitted→approved)로
   **타인 기록을 영구 동결** 가능. → 수정: ⓐapproved여도 값 동일하면 no-op 허용(또는 출력은
   저장 생략) ⓑstatus 전이는 PROTECTED 등재와 동시 적용(W4 편입).
2. **M-2 FORM_LIST가 pack_forms 무방비 의존** — 관례(구버전 DB try/catch)와 달리 폴백 없음.
   서버는 마이그 실패를 삼키고 기동(`index.cjs:57-61`)하므로 0132 미적용이면 양식 화면 전면
   사망(+렌더러 loadFormList catch 부재). → EXISTS를 try/catch 폴백으로.
3. **M-3 e2e 방어가 9종 중 4종만** — batch1~6·b4 7종은 여전히 exit 미전파 + BASE 8080(라이브)
   기본, batch5/6은 실제 쓰기 스크립트. 커밋 노트의 "쓰기 E2E 4종"은 집합 오인. → 7종 일괄 동일 패치.
4. **M-4 'SQ 필수만' 토글 빈 목록 함정** — 구 bridge(inSqPack 미반환)·미시드 DB에서 목록 0건
   + 안내문 "'' 검색 결과 없음" + localStorage 영속으로 "양식 전부 사라짐" 오인.
   → 팩 0건이면 토글 자동 해제+안내.
5. **M-5 발행번호 방어선 누락 2곳** — ai/drafts 승인 INSERT는 재채번 가드 없음(0131에 원문
   에러로 하드 실패), 0131 자체는 dedup 선행 없이 UNIQUE 생성이라 **중복 보유 DB는 부팅 불가**
   (라이브만 0건 실측 — 코워크 복사본·설치판 미검증). → drafts에 가드 이식 + 0131에 dedup 선행.
6. **M-6 pack_forms 고아 자동 게이트 부재** — verify-migrations가 pack 건수·고아를 안 본다
   (FK 없음 + 검사 없음 = 오타 시 팩에서 양식이 조용히 소실). → 게이트 1쿼리 추가.
7. **M-7 비번 정책 드리프트** — TODO "6자리 재가됨" ↔ `auth.cjs:42,81`·`setup-passwords.cjs`는
   4자리 고정. W4 발급 시 재가 정책과 코드가 어긋남. → PA(W4 게이트) 커밋에 포함.

## §3 Minor·슬러지 (발췌)

- **todayKST 명칭**: 실체는 "실행 머신 로컬" — TZ≠KST 호스트(서비스 UTC 기동)면 무효.
  Asia/Seoul 포맷터 고정 권장. 렌더러 잔존 UTC 2곳(FormCanvas:108 PDF 스탬프·MesRecordsView:64).
- FormListPanel ref 가드는 재마운트 미보호(홈→재진입 시 초안 덮임 경로 잔존) · 케이스 분배
  가드 throw는 5종 전체 롤백+원인 안내 부족 · 재채번 검사-삽입 비원자(프로세스 간).
- 문서: drive-migration §5 "정본=E" 잔존(§6과 모순) · 3차 노트 생산관리 15↔14 · 29번의 PB2
  "4~5일" 인용 스테일(정본 5~6.5일) · smoke 주석 8080 잔존 · mes_spike 사용례 CWD 용어 혼선.
- 슬러지: 위임 껍데기 4개(todayYmd×2·detect×2) · localStorage 키 인라인+네이밍 3파 분열 ·
  드라이브 스윕 누락 2파일(fill_item_names.py·team_chain_audit.py — C:/Users/ASUS 하드코딩) ·
  7/31분 잔존(고아 상수 3·고아 파일 2·shortYmd 3중·presentation_legacy).
- 0133 `[TPC팩 후보]` 표기 여부 재론(형식상 TPC 카탈로그 코드 참조 — 실명 없音, 판단 회신 요청).

## §4 재대사 — 해소 5 · 무변경 10

**해소**: Major-1 STAMP(triggerComplete) · Major-2 UTC 일괄(todayKST) · C-1 e2e exit(4종) ·
Major-8 BASE(4종) · 미사용 import 0 유지.
**무변경(외부 결정·미착수 트랙 그대로)**: W4 3 Critical(NULL 해시·143 무가드·4자리) ·
비밀 위생 2(실비번 3건·TODO 추적) · P1 렌더러 정직 4(가드 신호 미소비·FMEA 절단 무음·
ⓓ T1 필터·전체보기 버튼) · processLive 성능.

## §5 권장 처리 순서

| 순위 | 묶음 | 규모 |
| --- | --- | --- |
| P0 | C-1 values 동기화 + M-4 토글 폴백 + M-2 try/catch | 반나절 — 발행번호·화면 사망 즉효 |
| P1 | M-3 e2e 7종 일괄 + M-5(drafts 가드·0131 dedup) + M-6 게이트 | 반나절 |
| P1 | M-1 게이트 순서(값 동일 no-op + PROTECTED 등재는 W4 편입) | 0.5일 |
| P2 | 문서 정정 일괄 + 슬러지 30분급(껍데기·키 상수화·스윕 2파일) | 0.5일 |
| 외부 | W4 3 Critical + M-7 비번 정책 + 비밀 위생 — 사장님 결정·PA 트랙 그대로 | — |

PB2·G1 착수 전에 **P0만이라도 선행 권고** — C-1은 발행번호 트랙의 반쪽이라 지금 닫는 게 싸다.

*검수 = 사무실 봇 3영역 병렬 + 직접 재검증(C-1·M-1 실코드 확인), 2026-08-04. 코드 무수정.*
