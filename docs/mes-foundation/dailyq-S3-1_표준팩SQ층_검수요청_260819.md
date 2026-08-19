# S3-1 표준팩 SQ층 — 검수요청 (2026-08-19 오후, 봇 · 41호 M1 1일차 계속)

- 근거: 40호 ④ 도장 7건 + 42검증+S2 합격 회신 "S3 가라". S3 를 2절로 분할: **S3-1 = SQ층(오늘)** · S3-2 = 양식 카탈로그·xlsx 42종·④-5 뼈대 템플릿(내일부터).
- ⚠ 라이브 무접촉. :8081 = 신판 **pid 36292**(팩 적용 재기동).

## 1. 산출물 — `scripts/gen-pack-standard.mjs` (생성기 정본) → `resources/packs/standard/` 6파일

| 파일 | 내용 | ④ 이행 |
|---|---|---|
| 020_sq_backbone.sql | sq_categories 6 · **sq_items 42** · sq_reg_map 60 · sq_item_docs 46 · sq_item_form_types 58(보관소 통계→0) | ④-4: 브레이징 4행(1_5·2_8·3_4·3_5) **업종중립 재작성**(REWRITE_ITEMS — 생성기에 원문 대조 가능) |
| 030_sq_guide_layer.sql | sq_guide_items 42(규정 참조 "TPC-" 접두 제거·"(보유 N건)" 제거) · **sq_guides 372**(브레이징 예시 **11행 재작성** REWRITE_GUIDES) · **sq_checkpoints 162 — 상태 리셋**(status='missing'·evidence_note/updated_by NULL: 현행 값은 TPC ISIR 실사 상태라 카탈로그 아님 — 8/19 발견) | ④-4 ⓐ · ④-1(코드 채택 = 접두만 제거) |
| 040_pack_forms.sql | pack_forms 57(sq-minimal 55 + iatf-gap 2) | 0133/0135 승계 |
| 050_apqp_catalog.sql | apqp_phases 5 · elements 43 — **team_id NULL**(표준 설치 teams 빈 상태·FK)·status 리셋. PPAP/FMEA/MSA 데모 인스턴스 제외 | |
| 060_kpi_indicators.sql | KPI 35 — **target 전부 NULL** | ④-6 ⓐ |
| 070_recurring_obligations.sql | **의무 67**(73 중 6 제외: 브레이징 조건·스포트 팁·MES 정합·중금속 MS201-02·내식성 MS611-15·MES 다운로드) — **assignee/도래일 전부 NULL**(역할 기반) | ④-3 ⓑ |

- 생성기 안전: 체인 임시 DB 에서 추출(운영 DB 비접촉) + **출력 자체에 회사식별/실명 정규식 게이트**(위반 시 생성 중단 — 오늘 실제로 3회 걸러냄: 자기 헤더 문구 2회 포함).
- ⚠ **④-3 편차 신고**: 도장 문구는 "27 + 선별 ~20(≈47)"이었으나 실측 선별 결과 **67건**(생산일보·NCR·출하검사·마감보고 5·재고실사·결산 등 조직 무관 일상업무가 예상보다 많음). 제외는 6건뿐. 과하면 제목 목록으로 잘라 주시면 생성기 EXCLUDE 목록에 추가(1줄).

## 2. 실측

| 검증 | 결과 |
|---|---|
| `e2e-clean-install.mjs` (10→**11단언** — ⑩ 을 SQ층/⑪ 양식·뼈대로 분리) | **10/11** — **⑩ 표준팩 SQ층 GREEN**(sq_items 42·guides 372·cp 162/상태 0·pack_forms 57·apqp 43·kpi 35/목표 0·의무 67/실명 0) · ⑪만 RED(S3-2 전) |
| ⑥⑦ 판매 경로 | TPC 0행 · 실명 0행 유지 |
| **레거시 무해**(:8081 재기동 pid 36292 — 팩 6파일 레거시 DB 적용) | **전건 OR IGNORE no-op** — 행수 라이브 동일(의무 73·kpi 35·cp 162) + TPC 운영 상태 유지(assignee 73·cp 상태 64·kpi 목표 32·sq_items 1_5 TPC 원문 그대로) |
| `gen-core-schema.mjs --check` | 드리프트 0 (스키마 무변경 — 데이터 전용) |

## 3. 코워크 확인 요청 (:8081 pid 36292 · E2E봇)

1. 심사대응 SQ 화면 — 42항목·가이드·체크포인트 **종전 그대로**(팩 적용이 레거시 화면 무영향).
2. §2 수치 대조 + **④-4 재작성 15행 품질 소견**(생성기 REWRITE_ITEMS/REWRITE_GUIDES — 업종중립 표현이 SQ 심사 요지를 훼손하지 않는지).
3. ④-3 편차(§1 ⚠ 67건) — 이견 시 제외 제목 목록 회신.

## 4. 다음 = S3-2 (8/20~): 양식 카탈로그 302 중립판(사업부 9 제외·접미 정리) + xlsx 42종(추출 ~30종 포함) + ④-5 규정 뼈대 템플릿(안내문 신규 집필·TPC 0) → ⑪ GREEN = M1 완성.
