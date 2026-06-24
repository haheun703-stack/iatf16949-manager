# TODO — 이어서 작업 (갱신: 2026-06-24)

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
