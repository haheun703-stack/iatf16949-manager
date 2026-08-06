import { PartProcessMatrix } from './PartProcessMatrix'

/**
 * 31호 §3 — 품번×공정 실황 조회 화면. 홈(관제탑)에서 제거된 표의 새 정위치
 * (생산관리 메뉴 하위 — 조회성 정보는 홈에 두지 않는다, §1 정리).
 * 표 자체(PartProcessMatrix — ★중점관리·히트맵 포함)는 무수정 재사용 — 정보 손실 0.
 */
export function PartProcessView(): JSX.Element {
  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">품번 × 공정 실황</h1>
        <span className="text-[13px] text-muted-foreground">
          월 수불량(SO) 상위 품번의 공정별 기록 — ★중점관리 상단 고정 (31호로 홈에서 이동)
        </span>
      </div>
      <PartProcessMatrix />
    </div>
  )
}
