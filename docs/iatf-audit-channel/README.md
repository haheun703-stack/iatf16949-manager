# IATF 16949 심사 학습채널 자막 아카이브

출처: [@IATFAuditing](https://www.youtube.com/@IATFAuditing) — **IAOB + SMMT 공동운영(공식 감독기구)**, 1·2·3자 심사원 교육용 실연 영상. 윤대근 위원 추천 학습자료.

## 현황

| 구분 | 수 |
|---|---|
| 채널 전체 영상 | 354 |
| **자막 확보(captured)** | **89** (88,926 단어) |
| 자막없음(nocaption) | 3 |
| 미수집(pending, IP차단) | 262 |

> 미수집분은 YouTube IP 차단(IpBlocked/429)으로 보류. 차단 회복 후 분할 재실행으로 점진 완성. 재개 방법은 하단 참조.

## 갭별 핵심 영상 (심사 방어포인트)

### 개발프로세스 / APQP — ✅ 확보
- 영상: [Remote Design Center Mock Audit](https://youtu.be/YJefpqSFv54) · [자막](transcripts/YJefpqSFv54.txt)
- 방어포인트: AIAG APQP는 "loosely 정합+자체 프로세스"도 허용 — 개발일정계획서 P1/P2/SOP를 APQP gate에 매핑해 제시

### 특별특성 — ✅ 확보
- 영상: [Special Characteristics & Line Speed](https://youtu.be/bds0Rceg-bg) · [자막](transcripts/bds0Rceg-bg.txt)
- 방어포인트: 특별특성 측정장비 교정 의무 없음 — 검증+국가/국제표준 추적성이면 충분(7.1.5.2)

### SPC / CP·CPK — ✅ 확보
- 영상: [Factory SPC Drawing Dimensions](https://youtu.be/mc1-8LGc8AM) · [자막](transcripts/mc1-8LGc8AM.txt)
- 방어포인트: 도면치수→게이지 추적·교정일→run chart→관리한계 special cause→특별특성 도면+관리계획서

### PFMEA / Job Setup — ✅ 확보
- 영상: [Job Set-ups and PFMEA](https://youtu.be/pCPBkU96ojw) · [자막](transcripts/pCPBkU96ojw.txt)
- 방어포인트: PFMEA 신판(AIAG-VDA 7-step) 전환은 CSR 없으면 의무 아님 — 구판 4판 OK (8.5.1.3 작업셋업검증)

**공통 교훈**: 심사원도 과잉지적(무조건 교정/무조건 신판)을 함 → 표준 근거로 반박 가능. 답변은 "근거→기록→추적성" 순으로.

## 구조

- `transcripts/<videoId>.txt` — 영어 자동자막 평문 (grep 검색용)
- `manifest.json` — 전체 354영상 목록 + status(captured/nocaption/pending) + 단어수

## 미수집분 재개 방법

IpBlocked는 시간이 지나면 회복됨. 차단 회복 후 수집 스크립트 재실행 시 **확보분은 자동 스킵**, 신규분만 받음(매 회차 ~30개 한도, IP 재차단 전까지).
- 근본 해결: Webshare **residential** 프록시(유료) 사용 시 일괄 완성 가능 (무료 datacenter IP는 ~30건 후 차단).
