// 오늘 날짜 YYYY-MM-DD — 실행 머신 로컬(KST) 기준.
// new Date().toISOString() 절단은 UTC 날짜라 KST 00~09시 작성분이 전날로 찍힌다
// (검수 7/30 M-날짜 · 7/31 Major-2). 날짜 기입·집계는 반드시 이 유틸을 쓴다.
export function todayKST(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** YYYY-MM-DD ± days — KST 축 유지(+09:00 고정 앵커라 toISOString 절단 안전).
 *  8/11 검수 슬러지: 화면별 3중 복제이던 것을 공용으로 승격 — 신규 화면은 이것만 쓴다. */
export function ymdAddKST(ymd: string, days: number): string {
  const base = new Date(`${ymd}T00:00:00+09:00`)
  return new Date(base.getTime() + days * 86400e3 + 9 * 3600e3).toISOString().slice(0, 10)
}
