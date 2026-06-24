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
- [x] ~~**B-2100→2_9(리크/리워크) 매핑 도메인 확인**~~ (2026-06-24 완료): 진단 결과 B2100-01「시정/예방조치 요구서」가 2_9를 **거짓 green**(분배엔진 자동작성본) 점등. 실제 증거인 리크/리워크 검사양식은 forms에 0건. 도메인 결정=매핑 제거 → `0019_unmap_b2100_leak.sql`로 B-2100→2_9만 삭제(6_7은 유지). 2_9는 전용 양식 생길 때까지 gray(측정불가)=정직신호. 향후 전용 리크/리워크 양식 신설 시 sq_reg_map에 그 reg_code→2_9 추가하면 실증거 점등.
- [x] ~~**218 forms 마이그레이션화**~~ (2026-06-23 완료): `0014_seed_all_forms.sql` 로 forms 218 + process_forms 218 시드 고정.
  생성기 `scripts/dump-forms-seed.mjs`, 검증기 `scripts/verify-migrations.mjs`. 클린설치 재현 = live와 parity(forms/pf/fields/layout 일치, orphan 0).
- [~] **8D 흐름 양식 표준화** (진행중): B2100-03(개선대책서) ✅완료(2026-06-24, `0020`) — 21필드 실용 8D 선형셋+layout(15블록)+DISTRIBUTION(prefix IMP) 추가로 8D 분배 체인(B1100-01→B2100-01→B2100-03) 종착 완성. 남음: B1100-05(봉쇄)·H3200-01/02. (렌더러가 2D매트릭스/사진전후 미지원 → 픽셀충실 대신 실용형 방침)
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
