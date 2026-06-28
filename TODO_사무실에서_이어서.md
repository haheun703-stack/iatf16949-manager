# TODO — 이어서 작업 (갱신: 2026-06-27)

> **📋 이번 세션(6/25) 핸드오프 보고서+지시서 = [docs/핸드오프_2026-06-25_양식출력엔진.md](docs/핸드오프_2026-06-25_양식출력엔진.md)**
> 양식 출력엔진(방향B) 작업을 이어받을 땐 **그 문서부터** 읽을 것. 완료보고·자산위치·다음지시·함정 전부 정리됨.

## 🟢 6/27 — ISIR/관리계획서 척추 P1 완료 (최신 · 콜드스타트 1순위)

> 도메인 통찰(사장님): **ISIR 서류(검사협정+관리계획서) = 모든 통제의 근간/통칭** — 고객과 "이렇게 관리하겠다" 협의한 문서묶음. SQ 공정감사가 이 ISIR을 근간으로 진행. 2nd 핵심 = 불량 개선대책서. 실 ISIR xlsx(현대위아 28237-2MAA1, 24시트 = 한 부품 통제패키지 전체, 모든 핵심시트가 ISIR제출용/공정감사용 쌍)를 까서 모델링. 플랜 = `C:\Users\ASUS\.claude\plans\encapsulated-greeting-lark.md`.

**라이브 완료 (레퍼런스 1품번 28237-2MAA1, end-to-end)**:
- **스키마** `0040_isir_spine.sql`: parts / isir_packages / isir_documents(26종 체크리스트) / control_plan_items(관리계획서 을 라인아이템). `0042`: isir_packages(part_no,rev_code) UNIQUE 방어.
- **적재** `scripts/ingest-isir.py`(원본 읽기전용 파싱→표지26종+검사협정IRE+관리계획서을 행그룹핑) → `0041_isir_28237_2maa1.sql`. 결과 = ISIR 1·관리항목 110/31공정·불량 1(QC-2026-0001 자동조인).
- **AI/IPC** `src/main/ai/isir.ts`(computeIsirCompleteness 결정론[설변기준 필수26중 미제출2=공정감사평가표·4M변경]/explainIsirGap AI) + `ipc/isir-handlers.ts`(PARTS_LIST/PART_DETAIL/AI_ISIR_COMPLETENESS/AI_ISIR_EXPLAIN) + `kb.ts` reindex 확장(control_plan110+part1 색인, FTS "포밍 외경"→28237-2MAA1#2 그라운딩OK).
- **UI** 사이드바 '품번/ISIR'(PartsView/PartDetail/partsStore) + 대시보드 IsirCompletenessCard.
- **검증**: typecheck(node+web)+빌드+실DB사본 통합+라이브 재시작(마이그 적용·396청크). **검수(독립 2에이전트+직접) 후 실결함 수정**: partsStore race가드(loadingDetail/동일품번 재선택 깜빡임), 0042 UNIQUE, 죽은 db param/cell()/글리프.

**▶ 내일(6/28) — P2 (우선순위순)**:
1. **런타임 임포트 UI** — 앱 안에서 xlsx 선택→파싱→DB 적재(빌드타임 python 마이그레이션 대체). ingest-isir.py 로직을 TS 포팅 or 파이프 호출.
2. **다품번 배치 적재** — 현대위아/삼보 승인본 다수. ★이때 검수 이월결함 해결: ingest-isir.py를 **argv화**(SRC 하드코딩 제거)·**submit_type 추정 강화**(align 휴리스틱이 agreement 오분류·동률편향)·**공정/설비 forward-fill 견고화**(cur_equip 누수)·**분담 글리프 일반화**·**latestPackage를 rev_date 정렬로**(현재 id DESC).
3. **cases ↔ parts FK** — 불량 이력 정합(현재 part_no 문자열 조인, 표기 정규화 미보증).
4. **FMEA 상세표** — isir_fmea_items(공정FMEA 시트, RPN).
5. **E1/E3 재정의** — 심사예측·모의심사를 일반양식(65/1000)이 아닌 **Control Plan 준수도** 기준으로.
6. **정기검사(1번 폴더) 연결** + **관리항목 주기 vs 성적서 freshness 부재감지**(F1 ISIR판 심화).

**검수 이월(저위험, P2에서 같이)**: PartsView 전체구독→셀렉터, IsirCompletenessCard PARTS_LIST 이중호출→store 단일화, PartDetail `it.special` truthy 명시화, 불필요 `as` 캐스팅. (zustand 무한루프 함정은 이번 추가분에 없음 확인.)

## 🤖 6/26 저녁 — AI 레이어 A→E1 전부 완료

> 설계서 `05_AI레이어_구현플랜`(claude.ai 제공) 채택, 전제교정(pack 뺌·기존 src/main/ai 흡수·벡터→FTS5). origin HEAD `6c8e479`.

**한 세션에 AI 레이어 "첫 2주" 전부 라이브** (마이그 0037~0039, 파일 `src/main/ai/{drafts,tools,gateway,kb,briefing,author,readiness}.ts` + `ipc/ai-handlers.ts`):
- **A 레일** (0037 ai_drafts/ai_actions): AI 쓰기는 ai_drafts에만 → 사람 approve로만 공식테이블 commit → ai_actions 감사. 게이트웨이(gateway.ts tool-use루프·캐싱·재시도·비용로깅) + 도구레지스트리(tools.ts read4/draft5, zod).
- **B 그라운딩** (0038 kb_chunks+kb_fts trigram): reindex 285청크(규정·SQ·양식·케이스·프로세스). searchKnowledge 하이브리드(FTS+다중어LIKE). 기동 시 reindex.
- **C1 코파일럿**(GlobalCopilot, TopBar ✨버튼): 우리 데이터 자연어 Q&A, 근거칩, read-only.
- **C2 브리핑**(BriefingCard, Dashboard): 마감초과/임박·심사Dday·SQ증빙누락 신호등 + AI요약.
- **D 캡처→초안→결재**(AiAuthorModal, TopBar 🪄버튼): 메모→AI가 B2100-01 등 초안→검토→승인(form_submission). raw_captures(0039).
- **E1 SQ 심사예측**(ReadinessCard, Dashboard): 결정론 점수(현재 65/1000)+손실항목+AI진단·우선순위.

**검증**: 전부 typecheck node+web + 헤드리스 end-to-end(실제 Claude+실제 데이터, 환각0) + 라이브 기동(0037~0039 적용·285청크). **⚠️ 런타임 UI 클릭(코파일럿·브리핑·AI작성·심사예측 4버튼)은 사용자 스팟체크 남음.**

**다음 후보**: 시크릿 회수 — **#4 부재감지 일반화(갭지도→expectedSet 룰엔진=F1, 추천1순위)** / #2 수용률 플라이휠 UI(ai_drafts.edit_diff 집계) / G 제품화(라이선스·비용대시보드) / 또는 양식 더 표준화해 실제 SQ점수↑. 상세=repo `05_AI레이어_구현플랜.md`(있으면) + 아래 정본PDF 블록(미반영분 #2 연결고리·#3 빈규정27 양식수집은 여전히 유효).

---

## 🌅 (이전) 정본 PDF 학습 + "쉬운 작성" 전환

**맥락(사용자 피드백)**: 뷰어로는 좋은데 **실제 작성 도구로는 불편/부족**하다. 핵심 니즈 =
① 정본 PDF를 읽어 도메인 정확도·연결고리 업데이트 ② 작성 편하게(노션/엑셀 복붙) ③ MES 자료 복붙→CSV→항목 자동분배 ④ 중간 이미지 삽입.

**새 자료**: `D:\IATF16949,SQ 자동작성 봇\IATF16949 캡쳐본 모음\` = 정본 PDF 캡쳐본 **36개**(메뉴얼23/프로세스9/규정4=A-1100만). 규정(B~M)·프로세스 나머지는 순차로 더 들어올 예정.

**오늘 한 것 = CP-03 생산관리 1장 읽고 앱과 대조(데모)**. 발견(중요):
- 앱 `process_forms`의 CP-03 = **L-1100 설비(24)+L-1200 치공구(11)=35개뿐**. 정작 정본 CP-03 흐름의 핵심(작업지시 M-1100/M-1200·자주검사 L-2100·완성품검사·4M변경 J-3100·시정조치 B-2100·완성품관리 M-3100)은 미반영. → 앱은 "양식의 소유 프로세스"만 모델링(검사 L-2100→SP-02). **"프로세스가 사용하는 양식 흐름(many-to-many)" 차원이 없음** = "연결고리"의 정체.
- **성과지표(KSSI)**: `process_revisions`에 kpi/formula/cycle/owner 컬럼 있으나 **CP-03은 0/7 전부 비어있음**. 정본 표지/개정표에 8종(생산계획달성율·설비가동율·공정불량율·입고불량율·완성품불량율·납기율·일인당생산성·조치율) 산출식·주기·책임자 다 있음 → 그대로 채울 수 있음.
- **빈 규정(양식 0개)**: A-2100·M-1100·M-1200·M-3100·M-4100 → 폴더3 규정 PDF가 채울 대상.
- **자주검사 체크시트**: 정본 C/A 핵심 산출물인데 **앱에 없음**(L-2100엔 수입·인수검사만). → MES 복붙 파일럿 후보로 딱.

**✅ 6/26 진행**: (C) 정본 9개 프로세스 + 0.6/0.7 매트릭스 전부 읽고 대조 → **갭지도 완성** = `docs/정본_연결고리_갭지도_2026-06-26.md`. 이어서 갭지도 §5 **#1 KSSI 일괄반영 완료**(0036, 위 미적용 참고). origin HEAD 20a2eaf.
**남은 우선순위(갭지도 §5)**: #2 연결고리 차원(`process_form_flow`, PDCA 단계별 양식 흐름) / #3 빈 규정 27개 양식수집(M-시리즈 생산본연 우선, 규정 PDF 더 필요) / #4 자주검사 체크시트 MES 파일럿.

**참고 — 당초 선택지(완료/이관)**:
- ~~(A) 자주검사 체크시트 파일럿~~ → 갭지도 #4로 이관(MES 자료 대기)
- ~~(B) CP-03 성과지표 반영~~ → (1) KSSI 일괄반영(9개 전체)으로 확장 완료
- ~~(C) 프로세스/규정 PDF 읽기~~ → 완료(갭지도)

**미해결 빌드 갭**: photo 필드는 입력칸만 있고 **공식 엑셀 출력에 이미지 주입은 미구현**(셀맵에 photo 타입 없음) → ④ 이미지 니즈 = 새 빌드 필요.

**콜드스타트**: 이 블록 → 그다음 핸드오프 "진행 갱신 2"(어제 h/f/g). 정본 대조 스크립트 참고는 scratchpad(세션밖, 재작성 가능): cp03_crosscheck.py.

## ⚠️ 미적용 마이그레이션 — 다음 앱 재시작 시 자동 적용
- **0036_seed_process_kssi.sql** ((1) KSSI 일괄반영): 정본 9개 프로세스 개정이력+성과지표를 process_revisions에 시드. 8개 프로세스 개정이력 6행 INSERT(KPI 초기행) + CP-03 기존행 KPI UPDATE. KPI 채워진행 18. 생성기 `scripts/seed-process-kssi.py`. 코드변경 없음(ProcessCoverDocument가 이미 렌더). 오프라인 시뮬 검증 완료.
  - ⚠️BEGIN/COMMIT 없음(migrate.ts가 db.transaction()으로 감쌈).
  - **적용 후 스팟체크**: 문서BOM 프로세스 상세 → 문서모드 → 개정이력 표에 성과지표/산출식/주기/책임자 채워졌는지(예 SP-02 4종, CP-03 3종).

> 0026~0035 은 적용 완료(0034 라벨·0035 개정관리 = 6/26 앱기동 시 적용됨).

## ✅ 2026-06-25 완료 (이 세션): B2100-01 증명 + 도메인지도 + 갭2 교정
- B2100-01 end-to-end 증명(ExcelJS 보존 무손실 + 값주입 + Excel COM PDF). 매핑=CSV(가) 확정.
- 도메인 지도: 정본 IATF전체자료 72xlsx/561시트, 앱↔정본 구조일치(프로세스9·regA~M·부서7). 고객=삼보+ZF. TPC 13만개=참고서.
- 갭2 정합성: 앱 process_forms ↔ 정본 0.6 = 40%일치. 분해(미수집27 + 오배치~10 + 분류차이~5) → 0026으로 오배치·분류 교정. 미수집27(E·M·D 양식부재)은 갭1에서 수집.
- **갭1 범위·설계 확정**: 72파일 323양식시트 → 폼형 **267**(83%, 자동화 타겟) / 격자 14 / 대장·매트릭스 42. 폼형 분포 검사L-2100(43)·설비L-1100(21)·자격F-2100(14) 집중.
  - **핵심 통찰**: 앱은 B2100-01만 s1~s10 수동정의, 나머지 262 폼형은 필드 미정의. → **셀맵 추출(label,cell,type)이 곧 field 정의**이므로 손정의 불필요. ①이 ②를 흡수.
  - **갭1 설계**: ①267폼형 셀맵 대량추출(=field+셀매핑) ②범용 출력엔진(fill-b2100 범용화: form+셀맵+값→엑셀→PDF) ③앱 IPC통합(작성→공식엑셀 출력 버튼). ③이 앱 코드변경(DB/IPC/UI) 신중작업.
  - 도구: scripts/extract-all.mjs(다중시트 셀맵), classify-forms.mjs(유형분류), fill-b2100.mjs(주입), probe-b2100.mjs. _demo_output/양식유형분류.csv·B2100_전체_셀맵.csv.
  - **✅ 갭1① 완료(이 세션)**: extract-all-full.mjs로 267폼형 셀맵 대량추출 → **3520건**(평균13.2). 품질분포 5건+ 70%(186)/1-4건 16%(43)/0건 14%(38실패). 샘플검증 B1100-01 **10/10정확**(발행번호K3·LOT E6·품번O6·발생일자E5·작성자O4·불량수량O5...), B2100-01 9/10. **셀맵 label이 앱 분배필드와 연결됨**(작성일자↔h2·발생일자↔i1·LOT↔i4·품명↔i3) = ②의 다리. 산출물 `_demo_output/전체_폼형_셀맵.csv`. 보강대상=실패38+부분43(후순위).
  - **다음 세션 1순위 = 갭1②③ 구현**(②fill-b2100 범용화: form+셀맵+값→엑셀→PDF / ③앱 IPC통합: 작성→공식엑셀 버튼) 또는 0026 적용검증 먼저.

## 🎯 내일(6/25) 1순위 — 제품 방향 전환 결정됨 (B: 작성 대체)

**결정(2026-06-24)**: 이 앱은 *뷰어*가 아니라 **여기서 모든 양식을 작성 → 공식 엑셀로 출력 → (점차) 앱으로 직접 심사**받는 도구다. 엑셀로 도망가지 않는다.

**핵심 깨달음 — 렌더러로 양식 똑같이 그리기(막혔던 것)는 버린다. 대신:**
> 앱에선 데이터만 입력 → 출력은 **원본 양식 엑셀(.xlsx)에 값을 꽂아서 생성**(ExcelJS read+write). 결재란·갑지/을지·레이아웃 전부 원본 그대로 = 100% 공식 양식. 입력 UI는 단순해도 됨. 양식별 "필드→엑셀 셀" 매핑표만 있으면 됨.

**내일 바로: 1개 양식 end-to-end 증명** — `B2100-01 시정/예방조치 요구서`로:
1. 원본 엑셀 위치: `IATF 전체 자료모음_김권표이사_260501/3.IATF16949 규정&지침_230501/B-2100 시정조치 규정...xlsx` 의 `(시정·예방)조치 요구서 (B2100-01)` 시트.
2. 앱 입력값(form_submissions.values_json: s1~s10) → 그 시트의 해당 셀에 ExcelJS로 write → `.xlsx` 저장/내보내기.
3. 셀 매핑(s6=부적합사항 → 어느 셀 등)은 시트 구조 까서 1:1 정의. 되면 "이 길이 맞다" 확정 → 218개로 확장.

**확장 로드맵(B)**: ① 엑셀 원본→양식 필드 대량 자동생성(손으로 깎지 말 것) ② 채운 값→공식 엑셀 출력 엔진+양식별 셀맵 ③ 심사 신뢰성(결재/승인 흐름·개정관리·작성자/일시 추적·접근통제). 분배엔진(한 번 입력→여러 양식)이 B의 심장. 기존 BOM/필드/AI추출/사업부분류 전부 재료로 쓰임.

## 현재 상태 (콜드스타트 1순위)
- 브랜치: `feature/v5-soft-reset`, origin 동기화. 최신 HEAD = 검수수정 커밋(아래 참조)
- 앱 실행: `cd iatf16949-manager && npm run dev` (끌 땐 창 닫기 = WAL 안전)
- DB: `%APPDATA%/iatf16949-manager/iatf16949.db` (점검은 `python sqlite3 file:...?mode=ro`)
- 설계 단일출처: `docs/사건중심_8D흐름_분배맵_설계.md`

## 최근 완료 (2026-06-20~21)
**SQ 평가 백본 + 사건중심 8D + 분배엔진** — 코워크 SQ Ver4 백본(6대·42항목·1000점)을 앱에 통합.
forms.reg_code ↔ sq_reg_map 으로 218개 양식이 SQ 항목에 자동 연결.
- **SQ 준비도**(사이드바): 42항목 신호등(🟢충족/🟡진행/🔴미충족/⬜미해당). 0012 + sq-handlers + sq-readiness/*.
- **사건 작업**(사이드바): 고객 불량 통보 → 8D 단계 → 선별(사내재고=생산/고객사=품질) → 원인·대책.
  0013 + case-handlers + case-work/*.
- **분배 엔진**: 케이스 공유사실 → B1100-01·B2100-01 작성본 자동생성(case_id 연결) → SQ 작성본수 롤업.
- **PPT 본문 추출 시드**: `scripts/seed_defect_cases.py` (대책서 PPTX 라벨 파싱, 데모 12건, owner='[샘플]').
- **전체 검수(멀티에이전트) + 수정 반영**: SQ green 규칙 재정의(도달가능+gray), 마이그레이션 원자성,
  채점 submissionId 경합, nextSerial 중복제거(database/serial.ts), 분배 작성일자 자동, '하헌'/'1000점' 하드코딩 제거.

## 다음 할 일
- [x] ~~**B-2100→2_9(리크/리워크) 매핑 도메인 확인**~~ (2026-06-24 완료): 진단 결과 B2100-01「시정/예방조치 요구서」가 2_9를 **거짓 green**(분배엔진 자동작성본) 점등. 실제 증거인 리크/리워크 검사양식은 forms에 0건. 도메인 결정=매핑 제거 → `0019_unmap_b2100_leak.sql`로 B-2100→2_9만 삭제(6_7은 유지). 2_9는 전용 양식 생길 때까지 gray(측정불가)=정직신호. 향후 전용 리크/리워크 양식 신설 시 sq_reg_map에 그 reg_code→2_9 추가하면 실증거 점등.
- [x] ~~**218 forms 마이그레이션화**~~ (2026-06-23 완료): `0014_seed_all_forms.sql` 로 forms 218 + process_forms 218 시드 고정.
  생성기 `scripts/dump-forms-seed.mjs`, 검증기 `scripts/verify-migrations.mjs`. 클린설치 재현 = live와 parity(forms/pf/fields/layout 일치, orphan 0).
- [x] ~~**8D 흐름 양식 표준화**~~ (2026-06-24 완료): B2100-03(개선대책서,`0020`,IMP) + B1100-05(봉쇄 작업표,`0021`,CTN) + H3200-02(고객불만 대응결과,`0022`,CCR) 표준화+분배. 표준화 양식 2→5개. H3200-01은 다행 관리대장이라 단일레코드 폼 모델 부적합 → 스킵. (렌더러 2D매트릭스/사진전후 미지원 → 실용 선형 필드셋 방침). 라이브는 다음 앱 재시작 시 0021/0022 자동 적용.
- [~] **PPT→필드 AI 추출** (파이프라인 완성, 적재 교체 대기): 2단 — `scripts/dump-defect-texts.py`(PPTX→원문 텍스트 JSON, 무과금) → `scripts/ai-extract-cases.mjs`(@anthropic-ai/sdk 구조화 추출, OS temp 출력). 42건 코퍼스, 5건 샘플 품질 정규식 압도(원인·근본대책이 완결 문장으로 정제). 남음: 전체 42건 배치(과금) + AI JSON → cases 적재(seed_defect_cases.py를 AI소스로 교체, DB 변경). env-loader가 electron 결합이라 generate() 직접 import 불가 → 동일 SDK 직접 호출로 우회.
- [x] ~~**LOT 입력 경로**~~ (2026-06-24 완료, `eb7a26b`): 접수폼에 'LOT NO' 필드 + CASE_CREATE가 case_facts.lot upsert + 상세 LOT FactBox. 분배 B1100-01 i4 갭 해소. CaseIntakeInput.lot 타입 추가.
- [~] **로그인/작성자**: 작성자 설정 ✅완료(2026-06-24, `b10ac80`) — Sidebar 인라인 편집으로 company_profile.defaultAuthor 변경(양식 자동채움/분배 즉시 반영). 단일사용자 내부툴이라 풀 로그인은 보류(과잉). 남음: (선택) 풀 로그인 시스템, 다른 양식 복제, AI프롬프트 내 인명 컨텍스트 동기화.
- [~] **양식 공통/사업부별 분류** (1단계 완료, `ba7896f`): 프로세스 관련양식이 사업부마다 공통/전용 갈리는데 모델에 차원 없던 것. `forms.scope`(common/division, 0023) + FORM_SET_SCOPE + BomProcessDetail 배지(🔵공통/🟠사업부별) 클릭 토글. 기본 전부 common, 사업부별만 flip. **2단계(향후)**: 사업부 테이블 + division_forms(사업부×양식 적용 매트릭스) — 공통=전 사업부, 전용=일부. 용접팩→타업종 일반화 기반. 라이브는 다음 앱 재시작 시 0023 자동 적용.

## 주의/메모
- SQ평가 = 삼보(HKMC) Ver4 브레이징 단일표준 가정(시드 하드코딩). 다업종 확장 시 백본 JSON 교체.
- 데모 시드/‘샘플 채우기’ 버튼은 dev 편의용 — 출하 시 정리 방침 필요(단일사용자 내부툴이라 현재는 low).
- AUDIT_DATE = `2026-12-31` 데모 임시값(useDday.ts).
- 핵심 파일: ipc/{sq-handlers,case-handlers,form-handlers}.ts, database/{migrate,serial}.ts,
  presentation/components/{sq-readiness,case-work}/*, stores/{formStore,uiStore}.ts,
  resources/migrations/0012_sq_backbone.sql, 0013_cases_8d.sql
