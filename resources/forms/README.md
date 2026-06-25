# resources/forms — 양식 마스터 원본 (출력엔진용)

양식 출력엔진(`src/main/docgen/form-export-engine.ts`)이 값을 주입할 **원본 .xlsx 72개**를 두는 곳입니다.

## 동작 (resolveMastersDir 우선순위)

1. **환경변수** `IATF_MASTERS_DIR` (있고 존재하면 최우선)
2. **DB 설정** `company_profile.mastersDir`
3. **번들** 이 폴더(`resources/forms`) — `.xlsx` 가 실제로 들어있을 때만 채택
4. **개발 폴백** — 엔진 상단 `FALLBACK_MASTERS` 외부 경로

현재 이 폴더는 비어 있어(이 README만 존재) **폴백 경로**로 동작합니다.

## 배포 번들 방법

1. 원본 72양식(`IATF 전체 자료모음.../3.IATF16949 규정&지침 .../*.xlsx`)을 이 폴더로 복사
2. `npm run build:win` → `electron-builder.yml` 의 extraResources 가 `resources/forms → forms` 로 번들
3. 패키지 앱에서 엔진이 `process.resourcesPath/forms` 를 자동 탐색

> ⚠️ 원본은 회사 기밀 양식이므로 git 커밋 여부는 정책에 따라 결정(현재 .xlsx 미커밋 권장).
