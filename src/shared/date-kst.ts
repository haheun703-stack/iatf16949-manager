// 오늘 날짜 YYYY-MM-DD — 실행 머신 로컬(KST) 기준.
// new Date().toISOString() 절단은 UTC 날짜라 KST 00~09시 작성분이 전날로 찍힌다
// (검수 7/30 M-날짜 · 7/31 Major-2). 날짜 기입·집계는 반드시 이 유틸을 쓴다.
export function todayKST(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
