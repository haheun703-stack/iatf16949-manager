# 전수 검수 — 2026-08-11 (당일 전량: f2dd77e..3028597, 11커밋 · 46파일 · +3,648/−212)

> **방법**: 병렬 검수 2조(A = 서버/메인 9파일 — 버그·계약·동시성·보안·성능·슬러지 / B = 렌더러
> 화면 10신설+수정 8 — 버그·연타·catch·날짜 축·접근성·UX 계약·슬러지, 라인 실측 강제) + 봇
> 교차 재검증(상위 발견 전건 코드 대조). 범위 = P0·1차분·P1·묶음·배치⑴·배치⑵ 전량.
> **즉시 조치 14건 당일 완료** — 잔여는 P1″/P2″ 분류. [기존] = 오늘 이전 유입분.
> **하네스**: 조치 후 typecheck·build·build:server 통과 · E2E pc1 26/26·g1 27/27·배치⑵ 프로브 10/10.

## Critical 0건

## Major 10건 (오늘 유입 6 — 전건 당일 봉합 ✅ / [기존] 4 — 1건 동반 봉합·3건 P1″)

| # | 위치 | 내용 | 조치 |
| --- | --- | --- | --- |
| MA-1 | ModalSheet 포커스 effect | 의존성에 dirty 포함 → 첫 글자 입력 순간 포커스 강탈(태깅 폼 타이핑 불능) | ✅ ref 분리 — effect 는 open 에만 반응 |
| MA-2 | ConfirmDialog | "Tab 2버튼 순환" 선언만 있고 미구현 — 키보드 포커스가 배경 이탈 | ✅ Tab 트랩 실장 |
| MA-3 | SpecRegistry save | 빈 품번 미검증 — 품번 없이 저장 시도 통과 | ✅ 사전검증 |
| MA-4 | SpecRegistry 규격 | 비수치 입력이 NaN→null 강하로 무통지 소실 | ✅ 수치 사전검증 |
| MA-5 | KpiGrid 연도 경합 | 연도 연타 시 늦은 응답이 새 연도 라벨에 이전 값 → 그대로 저장 시 **타 연도 기입** | ✅ seq 토큰 — 늦은 응답 폐기 |
| MA-6 | lotIssue BUSY | 재시도 가드가 message 만 검사 — BUSY(code 필드)는 재시도 0회·원시 영문 노출 | ✅ code 병행 검사 |
| MA-7 | [기존] inspRecordCreate | `Number(null)=0` — 빈 측정값이 실측값 0으로 저장(실측값 강제 계약 우회, 규격 내면 합격 제안까지) | ✅ null/'' 거부(동반 봉합) |
| MA-8 | [기존] WorkOrderView load | catch 없음 — 통신 오류 무통지 | P1″ |
| MA-9 | [기존] WorkOrderView setStatus | catch·연타 가드 없음 + '취소' 전이 무확인(오클릭 1회) | P1″ |
| MA-10 | [기존] ProdEntryView issueLot | 연타 가드 없음 — 더블클릭 = LOT 차수 이중 발번 | P1″ |

## Minor — 즉시 조치 8건 ✅ (서버 계약 계열)

specSave `Number('')=0` 규격 0 저장 봉합 · specSave 개정 시 mu/ml(관리한계) 현행 승계(소실 방지) ·
ppmTargetSave null→0 봉합 · itemUpdate/partnerUpdate try/catch(원시 500→계약 응답)+itemType/거래처명
빈 값 거부(NOT NULL/CHECK 방어) · kpi 주체 거부 무언 실패→사유 동봉 · inspList/specList 미마이그 DB
방어(0137/0138) · 다운로드 TTL unlink 실패 시 토큰 유지(고아 방지) · captureTag 트랜잭션 내 품목
비활성 경합 정직 안내 + ModalSheet 트랩 disabled 제외 + KpiGrid 통신 오류 오안내 수정

## Minor — P1″ 이월 (렌더러 UX 계열, 18건)

연타/재진입 시리즈(ProdHistory 탭·BomBrowse 방향·PpmDash 목표 저장·수집함 검색 stale rowIdx) ·
시료 6+ 은닉 안내 · 품목/거래처 행 편집 무확인 파기 · WorkOrder adding 폼 탭 게이트 · ngQty 재타이핑
중 defectCode 소거 완화 · CSV 수식 선행문자 방어 · PPM 초과 색 단독(비색 표식 추가) · SpecRegistry
확인창 REV 문구 서버값 대조 · MesHome 입고 타일 목적지(mat-receipts) · [기존] PortalHome complete
무통지·트리거 대리완료 무확인·exportXlsx catch·연도 초기값 KST 축·취소 사유 렌더러 사전검증 ·
수집함 품번 빈 행 무통지 폐기

## Minor — P2″ 이월 ([기존] 서버 5건)

workOrder 발번 COUNT+1 경합(재시도 미적용 — lotIssue 문법 이식) · workOrderUpsert 갱신 경로 무주체
'취소' 전이(주체·사유 요구 검토) · ymdOk 실재 일자 미검증(2026-13-45 통과) · insp 헤더 spec_revision =
(품번×종류) MAX 단일값(항목별 상이 시 불일치 — 값 행 spec_id 가 실각인이라 저위험) · PART_PROCESS
풀스캔 M-6 미적용(덤프 재개 전 저위험)

## 슬러지 7건 (P2″ — 처분 일괄)

ymdAdd 3중 복제(공용 유틸 추출) · SpecRegistry 단일 tr Fragment · 품번 제안 검색 무디바운스 3중
구현(수집함 250ms 와 통일) · InspEntry values `_i` 죽은 왕복 · WorkOrder 엑셀 0행 활성(툴바 문법
불일치) · team-handlers 취소 필터 주석 낡음(0106→0137) · mes-records sqcProc 람다 2중 정의
(kpi 죽은 분기 `?? null` 은 금일 제거 ✅)

## 이상 없음 확인 (실측)

보안(SQL 인젝션 — 화이트리스트·바인딩·LIMIT 클램프 / 세션 가드 / STAMP 신규 4종 채널명 정합) ·
계약(구판 불변 — active 강하만·0136 UNIQUE 정합 / 취소 제외 집계 — 조회 12종·트리거 3처·소급
라벨 전수 / 날짜 축 — 신규 전량 todayKST·localtime / 돈 경계 — 단가 계열 부재) · 동시성(captureTag
IMMEDIATE+이중 상태 조건 / inspConfirm·recordCancel 조건부 UPDATE+changes / specSave IMMEDIATE) ·
라우팅/PageId/메뉴 alias 정합 · z-index 층위 · 취소 행 정직 표기(화면+CSV) · MesHome 가짜 0 없음 ·
express 12mb ≥ 핸들러 상한

## 조치 계획

| 순위 | 내용 | 시점 |
| --- | --- | --- |
| ✅완료 | Major 오늘분 6 + [기존] MA-7 + Minor 서버 8 + 슬러지 1 = **즉시 조치 14건** | 8/11 밤(본 커밋) — E2E 재검증 동봉 |
| P1″ | [기존] Major 3(MA-8~10) + 렌더러 Minor 18 | 배치⑶ 전 오전 1배치 또는 배치⑶ 병행 |
| P2″ | [기존] 서버 Minor 5 + 슬러지 7 | 배치⑷ 후 · 일부 W4/PC-2 접점 |

## 총평

오늘 하루 6배치(+3,648줄)의 서버 계약(주체 방어·개정=신규 행·취소 제외·IMMEDIATE)은 전 채널에서
일관되게 번역됐고 보안·동시성 축은 실측 전수 통과다. 아픈 곳은 둘: ①**빈 값의 0 강하** —
`Number(null/'')=0` 패턴이 실측값·규격·목표 3곳에서 같은 우회를 만들었다(전부 봉합 — "빈 값은
거부, 0은 사람이 적는다"를 수치 입력 공통 규약으로 삼는다) ②**effect 의존성·경합 취약** —
포커스 강탈과 연도 경합 둘 다 "상태 변화가 비동기 완료보다 빠를 때"의 고전 패턴. 신규 화면
속도전의 비용이 연타/재진입 가드 누락(P1″ 18건)으로 나타났다 — 다음 배치부터 조회 화면 공통
프레임에 seq 가드·디바운스를 기본 내장한다.
