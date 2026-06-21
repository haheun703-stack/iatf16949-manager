# TODO — 이어서 작업 (갱신: 2026-06-21)

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
- [ ] **B-2100→2_9(리크/리워크) 매핑 도메인 확인**: 시정조치 양식 1건이 리크 항목을 yellow로 점등(코워크 rules.json qms_sqmap 유래). 규정레벨 매핑 의도인지 확인 후 전용 리크/리워크 양식 매핑 검토.
- [ ] **218 forms 마이그레이션화**: 현재 forms는 `scripts/auto-link-forms.mjs`가 live DB에 직접 INSERT → 클린설치 시 0004의 4건만 복원. 정식 시드 SQL로 덤프해 재현성 확보.
- [ ] **8D 흐름 양식 표준화**: B2100-03(개선대책서)·B1100-05(봉쇄)·H3200-01/02 등에 form_fields+layout_json → 분배 대상 확대.
- [ ] **PPT→필드 AI 추출**: 정규식 시드의 노이즈 한계 → Claude로 대책서 본문을 구조화 JSON 추출(앱 AI인프라 활용).
- [ ] **LOT 입력 경로**: 분배 B1100-01 i4(LOT)는 case_facts.lot 의존인데 UI 입력칸 없음. 접수폼/상세에 추가.
- [ ] 로그인/작성자, 다른 양식 복제.

## 주의/메모
- SQ평가 = 삼보(HKMC) Ver4 브레이징 단일표준 가정(시드 하드코딩). 다업종 확장 시 백본 JSON 교체.
- 데모 시드/‘샘플 채우기’ 버튼은 dev 편의용 — 출하 시 정리 방침 필요(단일사용자 내부툴이라 현재는 low).
- AUDIT_DATE = `2026-12-31` 데모 임시값(useDday.ts).
- 핵심 파일: ipc/{sq-handlers,case-handlers,form-handlers}.ts, database/{migrate,serial}.ts,
  presentation/components/{sq-readiness,case-work}/*, stores/{formStore,uiStore}.ts,
  resources/migrations/0012_sq_backbone.sql, 0013_cases_8d.sql
