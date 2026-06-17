---
name: project-renderer-review
description: IATF16949 manager 렌더러(presentation) 검수 시 알아둘 구조적 사실 — zustand 셀렉터 함정 처리 상태, 재발 주의 구역
metadata:
  type: project
---

IATF16949-manager 렌더러(`src/renderer/src/presentation`) 검수에서 확인된 구조적 사실.

zustand "셀렉터 안 새 배열/객체 → 무한루프" 함정은 과거 실제 버그였고, 현재는 대시보드 패널들(RecentScoresPanel, NeedsAttentionList)에서 `useStore((s)=>s.data?.x) ?? []` 패턴 + 설명 주석으로 올바르게 처리됨. 신규/수정 컴포넌트 추가 시 이 패턴 유지 여부를 우선 확인.

**Why:** 백지(Maximum update depth) 사고가 났던 코드베이스라 사용자가 이 항목을 최우선으로 본다.
**How to apply:** 렌더러 검수 때 셀렉터 반환값이 매 렌더 새 참조인지(.map/.filter/리터럴/`?? []` 내부) 먼저 grep. 현재 클린.

재발/주의 구역:
- `processStore.loadDetail`가 `currentPageIdx: 0`을 리셋함 → 업로드/삭제/페이지추가 후 ProcessImageViewer가 1페이지로 점프. 의도된 동작인지 확인 필요(과거 검수 미해결 슬러지 후보일 수 있음).
- FormCanvas는 form-builder(FormListPanel이 selectedFormCode 변경 시 loadFormDefinition 호출)와 process-workbench(ProcessFormsPanel은 클릭 시에만 호출, selectedFormCode 변경엔 effect 없음) 양쪽에서 쓰임. handleGoToNext가 setSelectedFormCode만 호출 → 두 컨텍스트에서 동작 차이 가능.
