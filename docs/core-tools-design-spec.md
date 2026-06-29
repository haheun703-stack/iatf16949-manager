# IATF 16949 Core Tools 모듈 설계 명세서 (봇 핸드오프용)

> 이 문서는 **나중에 구현 봇(Claude Code 등 다른 에이전트 세션)에게 그대로 전달**하기 위한 설계 명세입니다.
> 봇은 이 문서만 받아도 추가 조사 없이 구현할 수 있도록 작성되었습니다.
> 레퍼런스 구현: **APQP 모듈** (커밋 `916e44d`, 브랜치 `claude/apqp-research-implementation-s9pb5y`).

---

## 0. 구현 봇을 위한 지침 (READ FIRST)

1. **APQP 모듈을 레퍼런스로 삼아 동일한 패턴으로 구현하라.** 새로운 아키텍처를 발명하지 말 것.
2. 아래 §3 "공통 구현 패턴"이 모든 모듈에 적용되는 골격이다. §4의 각 모듈은 그 골격에 넣을 **데이터·필드·UI 차이점만** 기술한다.
3. 각 모듈은 **독립적으로 1개 PR**로 끝낼 수 있게 설계되었다. 우선순위는 §6 참조.
4. 구현 후 반드시 §7의 검증 절차(빌드 + 헤드리스 DB 테스트)를 통과시키고 커밋·푸시하라.
5. 모든 FK 참조(clause_id, team_id)는 **실재하는 ID여야 한다** (`PRAGMA foreign_keys = ON`이 켜져 있어 위반 시 INSERT 실패). §4 표의 조항·팀 ID는 모두 검증된 값이다. 새 매핑을 추가할 땐 `resources/seed/iatf16949-clauses.json`과 `teams.json`에 존재하는지 먼저 확인하라.

---

## 1. 배경 & 목표

이 앱은 IATF 16949 품질경영시스템 관리 Electron 데스크톱 앱이다. 이미 조항(clauses)·문서/규정(documents)·팀(teams)·업무(tasks, PDCA)·심사(audits)·**APQP**를 관리한다.

APQP(사전 제품 품질 계획) 명세는 5개의 자동차 **Core Tool**을 참조한다. APQP가 "계획"이라면 Core Tool들은 그 계획을 실제로 수행하는 도구다. 목표는 나머지 Core Tool을 APQP와 동일한 깊이로 모듈화하여, 앱이 IATF Core Tool 전체를 한 곳에서 추적하게 하는 것이다.

**구현 대상 (5개 모듈):**

| # | 모듈 | 약어 | APQP 연결점 | 핵심 IATF 조항 |
|---|------|------|-------------|----------------|
| 1 | 양산부품승인 | **PPAP** | apqp-4-04 | 8.3.4.4 |
| 2 | 고장형태영향분석 | **FMEA** (DFMEA/PFMEA) | apqp-2-01, apqp-3-06 | 8.3.5 / 8.5.1 |
| 3 | 측정시스템분석 | **MSA** | apqp-3-09, apqp-4-02 | 7.1.5.1.1 |
| 4 | 통계적공정관리 | **SPC** | apqp-3-10, apqp-4-03 | 9.1.1 |
| 5 | 관리계획서 | **Control Plan** | apqp-2-04, apqp-3-07, apqp-4-07 | 8.5.1 |

---

## 2. 아키텍처 컨텍스트 (recap)

- **스택**: Electron 31 + electron-vite + React 18 + Zustand + better-sqlite3 + TailwindCSS 4 + TypeScript.
- **계층**:
  - `src/shared/` — IPC 채널명(`ipc-channels.ts`) + DTO/채널맵 타입(`ipc-types.ts`). 메인↔렌더러 공용.
  - `src/main/` — Electron 메인. DB 연결/마이그레이션/시드, IPC 핸들러.
  - `src/preload/index.ts` — `window.api.invoke(channel, req)` 노출. 타입은 `IpcChannelMap` 기반 자동 추론(수정 불필요).
  - `src/renderer/src/presentation/` — `stores/`(zustand), `components/`(뷰), `stores/uiStore.ts`(탭 상태).
- **DB**: `app.getPath('userData')/iatf16949.db`. WAL + `foreign_keys = ON`.
- **마이그레이션**: `resources/migrations/NNNN_*.sql`을 파일명 정렬 순으로 1회 실행, `_migrations` 테이블로 추적. 현재 최신은 `0004_apqp.sql` → **다음 번호는 `0005`부터**.
- **시드**: `resources/migrations`/`resources/seed`는 dev에서 `__dirname/../../resources/...`, 패키징 시 `process.resourcesPath/...`.
- **팀 ID**: `team-mg`(관리지원), `team-pu`(자재/납품), `team-pr`(생산), `team-qc`(품질), `team-de`(개발).
- **기존 탭**: dashboard, detail, tasks, gantt, team, apqp, docgen (`uiStore.ts`의 `TabId`).

---

## 3. 공통 구현 패턴 (APQP 레퍼런스)

각 모듈은 아래 9개 파일 작업으로 구성된다. APQP 커밋의 해당 파일을 그대로 본떠라.

### 3.1 마이그레이션 — `resources/migrations/000N_<module>.sql`
- 부모 테이블(헤더/스터디 단위) + 자식 테이블(라인 아이템) 2단 구조.
- `CHECK` 제약으로 enum 강제, `REFERENCES`로 FK, 인덱스 추가.
- `updated_at TEXT DEFAULT (datetime('now'))` 포함.
- 참고: `0004_apqp.sql` (apqp_phases / apqp_elements).

### 3.2 시드 데이터 — `resources/seed/<module>.json`
- 표준 항목(요구사항/요소)을 JSON으로 적재. §4의 표를 그대로 옮긴다.
- clause_id / team_id / core_tool 등 매핑 포함.

### 3.3 시드 로더 — `src/main/database/seed.ts`에 `seed<Module>(db)` 추가
- **반드시 if-empty 가드** (`SELECT COUNT(*) ... > 0 → return`)로 기존 DB에도 추가 적재되게 한다. `seedDatabase()` 상단에서 호출(APQP의 `seedApqp(db)` 호출 위치 참고).
- 테이블 없을 때(`try/catch`) 조용히 skip.
- 트랜잭션(`db.transaction`)으로 일괄 insert.

### 3.4 IPC 채널 — `src/shared/ipc-channels.ts`
```ts
<MODULE>_GET_BOARD: '<module>:getBoard',
<MODULE>_UPDATE_ITEM: '<module>:updateItem',
// 필요 시 CREATE/DELETE 추가
```

### 3.5 IPC 타입 — `src/shared/ipc-types.ts`
- DTO 인터페이스(`<Module>Item`, `<Module>Board` 등) + `IpcChannelMap`에 request/response 매핑 추가.
- `void` request면 preload가 인자 0개로 추론(APQP_GET_BOARD 참고).

### 3.6 IPC 핸들러 — `src/main/ipc/register.ts`
- `getBoard`: 부모/자식 JOIN(clauses, teams) → 집계(진척률/카운트) 후 DTO 반환. APQP `APQP_GET_BOARD` 핸들러가 모범.
- `updateItem`: 화이트리스트 필드만 동적 UPDATE + `updated_at` 갱신 + enum CHECK. APQP `APQP_UPDATE_ELEMENT` 참고.

### 3.7 스토어 — `src/renderer/src/presentation/stores/<module>Store.ts`
- zustand. `board`, `isLoading`, `loadBoard()`, `updateItem()`. `apqpStore.ts` 그대로 본뜸.

### 3.8 뷰 — `src/renderer/src/presentation/components/<module>/<Module>View.tsx`
- 상단 요약(진척률 바 + 카운트) → 섹션/테이블 → 상태 인라인 편집(select) + 일정(date input).
- 조항 클릭 시 detail 탭으로 이동(`setSelectedClause` + `setActiveTab('detail')` + 조상 expand). `ApqpView.tsx`의 `goToClause` 그대로 재사용.
- 색상/배지 스타일은 `ApqpView.tsx`의 `STATUS_STYLES`, `CORE_TOOL_STYLES` 컨벤션 준수.

### 3.9 UI 배선 (3곳)
- `stores/uiStore.ts` → `TabId` 유니온에 `'<module>'` 추가.
- `components/layout/TopBar.tsx` → `TABS` 배열에 `{ id, label, icon }` 추가(lucide 아이콘).
- `components/layout/MainContent.tsx` → import + `{activeTab === '<module>' && <Module View />}`.

---

## 4. 모듈별 상세 설계

> 표의 `clauseId`/`teamId`는 시드 시 FK로 검증된다. status enum은 모듈 공통으로
> `not_started | in_progress | completed | na`를 기본 사용(APQP와 동일)하되, 모듈 특성상
> 별도 상태가 필요한 경우 아래에 명시한다.

### 4.1 PPAP — 양산부품승인 (최우선)

**개념**: 고객에게 양산 부품을 승인받기 위해 제출하는 18개 표준 문서 묶음. 제출수준(Level 1~5)에 따라 제출/보관 범위가 달라진다. APQP Phase 4의 핵심 산출물.

**테이블** (`0005_ppap.sql`):
- `ppap_submissions` (헤더): `id, part_no, part_name, customer, level INTEGER CHECK(level IN (1,2,3,4,5)) DEFAULT 3, status TEXT CHECK(status IN ('draft','submitted','approved','interim','rejected')) DEFAULT 'draft', submitted_date, approved_date, note, created_at, updated_at`. **초기 시드에 데모 1건**(part_no='DEMO-001') 넣어 빈 화면 방지.
- `ppap_elements` (18 요구사항): `id, submission_id REFERENCES ppap_submissions(id), seq, name, name_en, clause_id REFERENCES clauses(id), team_id REFERENCES teams(id), status TEXT CHECK(...) DEFAULT 'not_started', note, sort_order, updated_at`.

**18 표준 요구사항** (seq / 한글 / 영문 / clauseId / teamId):
1. 설계기록 / Design Records / `8.3.5` / team-de
2. 엔지니어링 변경 문서 / Engineering Change Documents / `8.3.6` / team-de
3. 고객 엔지니어링 승인 / Customer Engineering Approval / `8.3.4` / team-de
4. 설계 FMEA / Design FMEA / `8.3.5` / team-de
5. 공정 흐름도 / Process Flow Diagram / `8.5.1` / team-pr
6. 공정 FMEA / Process FMEA / `8.5.1` / team-qc
7. 관리계획서 / Control Plan / `8.5.1` / team-qc
8. 측정시스템분석 / MSA Studies / `7.1.5.1.1` / team-qc
9. 치수결과 / Dimensional Results / `8.6.2` / team-qc
10. 재료·성능 시험결과 / Material & Performance Test Results / `8.6` / team-qc
11. 초기공정연구 / Initial Process Studies / `9.1.1` / team-qc
12. 공인시험소 문서 / Qualified Laboratory Documentation / `7.1.5` / team-qc
13. 외관승인보고서(AAR) / Appearance Approval Report / `8.6.3` / team-qc
14. 양산 샘플 / Sample Production Parts / `8.6` / team-qc
15. 한도견본 / Master Sample / `8.5.1` / team-qc
16. 검사치공구 / Checking Aids / `7.1.5` / team-qc
17. 고객별 특정요구 기록 / Customer-Specific Requirements / `8.2.3` / team-qc
18. 부품제출보증서(PSW) / Part Submission Warrant / `8.3.4.4` / team-qc

> 위 18개 clauseId는 모두 `iatf16949-clauses.json`에 **존재함이 검증됨**(시드 시 FK 통과).
> (`7.1.5.3.1`·`8.2.3.1`은 시드에 없어 각각 `7.1.5`·`8.2.3`으로 확정했다.)

**보드 집계**: 제출(submission)별로 18개 요구사항 중 completed 비율 = 진척률. 제출 status와 별개로 표시.

**UI**: 제출 선택 드롭다운(또는 카드 목록) → 선택된 제출의 18행 테이블 + 제출수준 배지(L1~L5) + 제출/승인일.

---

### 4.2 FMEA — 고장형태영향분석

**개념**: 설계(DFMEA)/공정(PFMEA)의 고장형태를 식별하고 심각도(S)·발생도(O)·검출도(D)를 1~10으로 평가. 신판(AIAG-VDA)은 RPN 대신 **AP(Action Priority: High/Medium/Low)** 사용 — 둘 다 표시.

**테이블** (`0006_fmea.sql`):
- `fmea_studies` (헤더): `id, type TEXT CHECK(type IN ('design','process')), title, part_or_process, clause_id, team_id, status, created_at, updated_at`. 시드에 DFMEA 1건·PFMEA 1건.
- `fmea_lines` (고장형태 행): `id, study_id REFERENCES fmea_studies(id), seq, item_function, failure_mode, effect, severity INTEGER CHECK(severity BETWEEN 1 AND 10), cause, occurrence INTEGER CHECK(occurrence BETWEEN 1 AND 10), control_prevention, control_detection, detection INTEGER CHECK(detection BETWEEN 1 AND 10), recommended_action, status, updated_at`.

**계산(핸들러/뷰에서)**: `rpn = severity*occurrence*detection`. `ap`는 S/O/D 조합 표(AIAG-VDA) — 간소화: `S>=9 → High면 빨강`, RPN>=100 또는 (S>=8 && O>=4) → High, RPN>=40 → Medium, 그 외 Low. RPN 높은 순 정렬.

**시드**: DFMEA(`type='design'`, clause `8.3.5`, team-de) / PFMEA(`type='process'`, clause `8.5.1`, team-qc) 각 헤더 + 예시 라인 3~4개씩.

**UI**: 스터디 탭(DFMEA|PFMEA) → 라인 테이블, S·O·D는 1~10 number input, RPN/AP는 색상 배지로 자동 표시.

---

### 4.3 MSA — 측정시스템분석

**개념**: 측정 시스템의 변동(Gage R&R 등)을 평가. %GRR < 10% 양호, 10~30% 조건부, >30% 부적합.

**테이블** (`0007_msa.sql`):
- `msa_studies`: `id, gage_name, gage_no, characteristic, method TEXT CHECK(method IN ('gage_rr','bias','linearity','stability')) DEFAULT 'gage_rr', grr_percent REAL, ndc INTEGER, result TEXT CHECK(result IN ('acceptable','marginal','unacceptable','pending')) DEFAULT 'pending', clause_id, team_id, study_date, note, updated_at`.
- (선택) `msa_readings`: 측정 원자료 행. **초기 버전은 생략 가능** — studies 단일 테이블로 시작.

**판정 자동화**: `grr_percent` 입력 시 result 자동(<10 acceptable, <=30 marginal, >30 unacceptable). 핸들러에서 계산.

**시드**: clause `7.1.5.1.1`, team-qc로 예시 게이지 3~4건(캘리퍼/마이크로미터/하이트게이지 등).

**UI**: 게이지 테이블 + %GRR number input + ndc + 판정 배지(녹/황/적).

---

### 4.4 SPC — 통계적공정관리

**개념**: 공정능력 Cp/Cpk/Pp/Ppk 추적. Cpk>=1.33 양호, 1.00~1.33 주의, <1.00 부적합.

**테이블** (`0008_spc.sql`):
- `spc_characteristics`: `id, process_name, characteristic, spec_lower REAL, spec_upper REAL, target REAL, cp REAL, cpk REAL, pp REAL, ppk REAL, sample_size INTEGER, result TEXT CHECK(result IN ('capable','marginal','incapable','pending')) DEFAULT 'pending', is_special INTEGER DEFAULT 0, clause_id, team_id, study_date, note, updated_at`.

**판정 자동화**: cpk 입력 시 result 자동(>=1.33 capable, >=1.00 marginal, <1.00 incapable).

**시드**: clause `9.1.1`, team-qc. 특별특성(is_special=1) 포함 예시 4~5건.

**UI**: 특성 테이블 + Cpk number input + 규격 상/하한 + 판정 배지. 특별특성은 ◆ 표시.

---

### 4.5 Control Plan — 관리계획서

**개념**: 공정 단계별 관리 항목·규격·측정방법·관리방법·대응계획을 정리. 시작품/양산전/양산 3종(APQP의 prototype/pre-launch/production CP에 대응).

**테이블** (`0009_control_plan.sql`):
- `control_plans` (헤더): `id, part_no, part_name, phase TEXT CHECK(phase IN ('prototype','pre_launch','production')) DEFAULT 'production', revision, clause_id, team_id, status, updated_at`. 시드 1건(production).
- `control_plan_lines` (행): `id, plan_id REFERENCES control_plans(id), seq, process_step, characteristic, char_type TEXT CHECK(char_type IN ('product','process')), spec_tolerance, measurement_method, sample_size, sample_freq, control_method, reaction_plan, is_special INTEGER DEFAULT 0, updated_at`.

**시드**: clause `8.5.1`, team-qc/team-pr. 예시 공정 단계 4~5행.

**UI**: 계획서 선택 → 라인 테이블(공정/특성/규격/측정/관리/대응). 특별특성 ◆.

---

## 5. APQP ↔ Core Tool 연동 (선택, 권장)

각 Core Tool 모듈 완성 후, APQP 산출물 행에서 해당 Core Tool로 점프하는 연결을 추가하면 "계획↔실행" 추적이 완성된다.

- `apqp_elements`에 nullable `linked_module TEXT`, `linked_id TEXT` 컬럼 추가(마이그레이션).
- `ApqpView`의 산출물 행에서 core_tool이 있으면 해당 탭으로 이동하는 버튼 노출.
- 매핑: apqp-4-04→PPAP, apqp-2-01/apqp-3-06→FMEA, apqp-3-09/apqp-4-02→MSA, apqp-3-10/apqp-4-03→SPC, apqp-2-04/apqp-3-07/apqp-4-07→Control Plan.

> 이 단계는 5개 모듈 중 일부만 끝나도 부분 적용 가능. 마지막에 별도 PR로 진행 권장.

---

## 6. 작업 순서 / 마일스톤

각 항목 = 독립 PR. 순서는 APQP 의존도·업무 가치 기준.

1. **PPAP** (최우선 — APQP Phase 4 직접 산출물, 18요구사항)
2. **FMEA** (DFMEA/PFMEA — PPAP #4·#6과 연결)
3. **Control Plan** (PPAP #7과 연결)
4. **MSA** (PPAP #8과 연결)
5. **SPC** (PPAP #11과 연결)
6. **APQP↔Core Tool 연동** (§5, 위 모듈들 위에 얹음)

---

## 7. 수용 기준 & 검증 절차

각 모듈 PR은 아래를 모두 만족해야 한다.

**기능 수용 기준:**
- [ ] 새 탭이 TopBar에 나타나고 클릭 시 뷰 렌더링.
- [ ] 시드 데이터가 보드에 표시(빈 화면 아님).
- [ ] 상태/수치 인라인 편집이 DB에 저장되고 새로고침 후 유지.
- [ ] 진척률/판정 집계가 올바름.
- [ ] 조항 클릭 시 detail 탭으로 이동.
- [ ] 기존 DB에서도 마이그레이션·시드가 자동 적용(if-empty 가드).

**기술 검증 (반드시 실행):**
```bash
# 1) 의존성 (Electron 바이너리 다운로드 실패 시 스킵)
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --no-audit --no-fund

# 2) 번들 빌드 — 반드시 성공
npm run build

# 3) 타입체크 — 신규 파일에서 에러 0건일 것
#    (electron.vite.config.ts / DocGenView.tsx / quality-manual-generator.ts의
#     기존 에러는 master에도 존재하므로 무시. 본인이 추가한 파일만 깨끗하면 OK)
npm run typecheck

# 4) 헤드리스 DB 검증 — better-sqlite3는 Electron용으로 컴파일되어
#    시스템 node에서 못 쓴다. node 내장 sqlite를 사용:
node --experimental-sqlite -e '
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
// 0001~000N 순서대로 exec, 그다음 clauses/teams 시드, 그다음 본 모듈 시드.
// FK 위반(존재하지 않는 clause_id/team_id)이 있으면 INSERT가 throw → 매핑 오류 검출.
// broken ref 카운트가 0인지, 집계가 맞는지 출력하라.
'
```

**커밋·푸시:**
- 지정 브랜치에 커밋. 커밋 메시지 한글, 마지막 2줄:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: <세션 URL>
  ```
- PR은 사용자가 명시적으로 요청할 때만 생성.

---

## 8. 함정 / 주의사항

- **FK ON**: 존재하지 않는 clause_id/team_id로 시드하면 런타임 INSERT 실패(앱이 빈 보드로 뜸). §4의 의심 조항은 시드 전 `iatf16949-clauses.json`에서 grep 확인.
- **시드 가드**: `clauses` 카운트로 막지 말고 **각 모듈 자체 테이블 카운트**로 if-empty 가드. 그래야 이미 시드된 기존 DB에도 신규 모듈이 적재된다(APQP `seedApqp` 방식).
- **마이그레이션 번호**: 항상 다음 빈 번호 사용(현재 0004까지 존재 → 0005~). 적용된 마이그레이션은 재실행 안 됨.
- **preload 수정 불필요**: `window.api.invoke` 타입은 `IpcChannelMap`에서 자동 추론. `ipc-types.ts`만 정확히 채우면 됨.
- **GUI 실행 불가 환경**: 원격/헤드리스 환경엔 Electron 바이너리/디스플레이가 없어 `npm run dev`로 창을 못 띄운다. 검증은 build + 헤드리스 DB 테스트로 대체하고, 시각 확인이 필요하면 사용자에게 로컬 실행을 안내하라.
- **기존 typecheck 에러**: `electron.vite.config.ts`(tailwind moduleResolution), `DocGenView.tsx`(미사용 import·lucide title prop), `quality-manual-generator.ts`(미사용 변수)는 **이 작업 이전부터 존재**. 본인이 만든 파일만 깨끗하면 통과로 간주.

---

## 부록 A. 레퍼런스 파일 (APQP 모듈)

봇은 아래 파일들을 열어 패턴을 그대로 모사하라:

| 역할 | 파일 |
|------|------|
| 마이그레이션 | `resources/migrations/0004_apqp.sql` |
| 시드 JSON | `resources/seed/apqp-elements.json` |
| 시드 로더 | `src/main/database/seed.ts` (`seedApqp`) |
| IPC 채널 | `src/shared/ipc-channels.ts` (`APQP_*`) |
| IPC 타입 | `src/shared/ipc-types.ts` (`Apqp*`, `IpcChannelMap`) |
| IPC 핸들러 | `src/main/ipc/register.ts` (`APQP_GET_BOARD`, `APQP_UPDATE_ELEMENT`) |
| 스토어 | `src/renderer/src/presentation/stores/apqpStore.ts` |
| 뷰 | `src/renderer/src/presentation/components/apqp/ApqpView.tsx` |
| UI 배선 | `uiStore.ts` / `TopBar.tsx` / `MainContent.tsx` |
