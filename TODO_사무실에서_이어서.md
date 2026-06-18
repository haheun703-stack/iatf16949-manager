# TODO — 사무실에서 이어서 (작성: 2026-06-18 집에서)

## 현재 상태 (콜드스타트 1순위)
- 브랜치: `feature/v5-soft-reset`, **origin과 완전 동기화** (최신 `33901fb`)
- 앱 실행: `cd iatf16949-manager && npm run dev`  (끌 땐 **창 닫기로 정상 종료** = WAL 안전)
- DB 경로: `%APPDATA%/iatf16949-manager/iatf16949.db`
  (better-sqlite3는 Electron 전용 빌드라 일반 node로 못 엶 → 점검은 `python sqlite3`)

## 오늘 한 것 — B1100-01 "부적합품 발생 통보서"를 표준형으로 완성
원칙: **AI = 틀·가이드·채점 / 사람 = 실내용 / 시스템 = 메타자동**
- ① 메타 자동주입: 발행번호(NCR-2026-####) 자동넘버링·작성일=오늘·작성자(회사정보 defaultAuthor)
- ② 노션풍 문서뷰 + 인쇄/PDF: [입력|문서] 토글, 문서모드=실양식 모양
- ③ Excel 붙여넣기: 라벨 매칭으로 필드 자동채움(세로 키-값 / 가로 헤더+값)
- 레이아웃 엔진: `forms.layout_json`(블록 section/grid/full) + 범용 렌더러(FormDocument)
  → 0010 마이그레이션이 B1100-01 설계도 주입. **405 확장의 기반**
- 입력칸 베이지 시인성(`--color-fillable`), 자동칸 회색, 인쇄 시 평면화
- 현품 사진 첨부(클릭→파일선택→1280px 축소→data URL 임베드)
- 데이터손실 방지: '이어서작성' 자동저장 + [작성본] 목록 모달(저장본 열기/삭제)

## 다음 할 일 (편한 것부터)
- [ ] **다른 양식 복제**: B2100-01 시정조치요구서 등에 layout_json 작성해 같은 엔진으로 렌더
- [ ] **405 AI 자동생성 설계**: 각 BOM 양식 원본 → AI가 form_fields + layout_json 생성하는 파이프라인
- [ ] **로그인/작성자**: 현재 작성자=회사정보 stub('하헌'). 로그인 도입 시 사용자명 자동반영
- [ ] **문서 모양 다듬기**: 결재란 크기·칸 비율·베이지 톤·로고 등 미세조정
- [ ] **표(반복행) 필드 타입**: 표 있는 양식(점검표·관리대장) 만날 때 layout에 table 블록 추가

## 주의/메모
- AUDIT_DATE = `2026-12-31` **데모 임시값**(useDday.ts). 실제 심사일 확정 시 교체 (D-day/대시보드 공통)
- 집에서 작성하던 B1100-01 1건은 미저장으로 유실됨(이제 자동저장돼서 재발 안 함) → 사무실서 다시 입력
- 옛 테스트 작성본 2건(5/19)은 [작성본] 목록에서 휴지통으로 삭제 가능
- 핵심 파일: form-builder/{FormCanvas, FormDocument, PhotoField, ExcelPasteModal, SubmissionsModal}.tsx,
  stores/formStore.ts, ipc/form-handlers.ts, resources/migrations/0010_form_layout.sql
