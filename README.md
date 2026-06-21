# IATF 16949 Manager

IATF 16949 품질경영시스템(QMS) 문서·SQ 자동작성 관리 데스크톱 앱.
Electron + React + TypeScript + SQLite(better-sqlite3) 로 만든 로컬 데스크톱 애플리케이션입니다.

> **인수인계 문서** — 이 프로젝트를 처음 받는 팀원을 위한 안내입니다.
> 작업 이력과 다음 할 일은 [`TODO_사무실에서_이어서.md`](./TODO_사무실에서_이어서.md) 를 참고하세요.

---

## 1. 빠른 시작 (Quick Start)

### 사전 준비물
- **Node.js 18 이상** (LTS 20 권장) — https://nodejs.org
- **Git** — https://git-scm.com
- Windows 10/11 (Electron-builder 윈도우 빌드 기준)

### 설치 & 실행
```powershell
# 1) 저장소 클론 (master가 최신본입니다)
git clone https://github.com/haheun703-stack/iatf16949-manager.git
cd iatf16949-manager

# 2) 의존성 설치 (better-sqlite3 네이티브 빌드 포함)
npm install

# 3) 환경변수 파일 준비
#    .env.example 을 복사해 .env 로 만들고, 전달받은 API 키를 채웁니다.
Copy-Item .env.example .env
#    -> .env 를 열어 CLAUDE_API_KEY 등 실제 키 값 입력

# 4) (선택) 기존 데이터 이어받기: 전달받은 iatf16949.db 를 아래 경로에 복사
#    %APPDATA%\iatf16949-manager\iatf16949.db   (4번 항목 참고)

# 5) 개발 모드 실행
npm run dev
```

---

## 2. 주요 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 모드 실행 (Electron + Vite HMR) |
| `npm run build` | 프로덕션 빌드 (electron-vite) |
| `npm run build:win` | 윈도우 설치 파일(.exe) 생성 (electron-builder) |
| `npm run typecheck` | 타입 체크 (node + web 양쪽) |

---

## 3. 환경변수 (.env)

이 앱은 AI 제공자(Claude / OpenAI / Gemini)를 사용합니다. **실제 키 값은 git에 올라가지 않으며**(`.gitignore`),
인수인계 시 담당자에게 **별도로 안전하게 전달**받아야 합니다.

키 구조는 [`.env.example`](./.env.example) 참고. 핵심:
- `AI_PROVIDER` — 기본 제공자 (`claude` | `openai` | `gemini`)
- `CLAUDE_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` — 각 제공자 키
- `PERPLEXITY_API_KEY` — (선택) 리서치용

---

## 4. 데이터(DB) 위치 — 중요

이 앱의 실제 데이터(문서 BOM, 양식, SQ 평가, 8D 등)는 프로젝트 폴더가 **아니라**
운영체제의 사용자 데이터 폴더에 저장됩니다:

```
Windows: %APPDATA%\iatf16949-manager\iatf16949.db
       = C:\Users\<사용자명>\AppData\Roaming\iatf16949-manager\iatf16949.db
```

- **빈 상태로 시작하려면**: 그냥 실행하면 됩니다. 앱이 첫 실행 시 DB 스키마를 자동 생성합니다.
- **기존에 작업한 데이터를 그대로 이어받으려면**: 인계자의 `iatf16949.db` 파일을
  위 경로에 복사해 넣으세요. (앱 종료 상태에서 복사할 것)

---

## 5. 프로젝트 구조 (개요)

```
src/
  main/        Electron 메인 프로세스 (DB, IPC, AI 호출, 파일 IO)
  preload/     preload 브리지
  renderer/    React UI (대시보드, 양식, SQ, 8D 등)
scripts/       개발/유틸 스크립트 (dev.mjs 등)
docs/          설계·작업 문서
resources/     아이콘 등 정적 리소스
```

---

## 6. 브랜치 안내

- `master` — 구버전 안정본 (문서 자동생성 + 대시보드 리디자인까지)
- **`feature/v5-soft-reset`** — **현재 최신 작업 브랜치** (SQ 평가 백본 + 사건중심 8D + 케이스→양식 분배 엔진).
  팀원은 이 브랜치에서 작업을 이어가면 됩니다.

---

## 7. 현재 상태 / 다음 할 일

자세한 내용은 [`TODO_사무실에서_이어서.md`](./TODO_사무실에서_이어서.md) 참고. 요약:
- ✅ SQ 평가 백본(준비도) + 사건중심 8D 워크플로우 + 케이스→양식 분배 엔진 완료
- ✅ 멀티에이전트 전체 검수 21건 반영
- ⏭️ B-2100 → 2_9 매핑 도메인 확인
- ⏭️ 218 forms 마이그레이션화(재현성 확보)
- ⏭️ 8D 양식 표준화 + PPT→필드 AI 추출
