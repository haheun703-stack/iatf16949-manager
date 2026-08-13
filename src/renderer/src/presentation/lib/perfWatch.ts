/**
 * 렌더러 멎음 계측 (8/12 프로파일 분기 확정 — 사장님 육안 체감 "보였다" = 원격 캡처 한정
 * 가설 기각 → 실사용 성능 트랙 격상. 단서: 배치⑶ 화면 4회 · 배치⑷ 0회 — 조업달력·성과지표
 * 진입부 우선).
 *
 * 판별 설계 — 멎음의 축을 가르는 것이 목적:
 *  · longtask(>50ms) 관찰 = JS 메인 스레드 축
 *  · 하트비트 간극(500ms 주기, 2s+ 벌어짐) = 이벤트 루프 정지 축
 *  · 화면 전환 마크 = 언제·어느 화면에서였는지 좌표
 *  → 멎음이 보였는데 여기에 **아무것도 안 찍히면 컴포지터/GPU 축 확정**(JS 무혐의 물증).
 *
 * 사용(코워크 검수 동선): F12 콘솔 → `__perfLog()` = 표 출력 · `__perfLogCsv()` = CSV 복사용.
 * 저장 = localStorage 링버퍼(최근 300건 — 새로고침 생존). 오버헤드 = 관찰자 2개·마크뿐(무해).
 */

interface PerfEvent {
  t: string // ISO 시각
  kind: 'longtask' | 'heartbeat-gap' | 'page' | 'invoke-storm'
  detail: string
  ms: number
}

const KEY = 'perfwatch.log.v1'
const MAX = 300
let buf: PerfEvent[] = []
let started = false

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(buf.slice(-MAX)))
  } catch {
    /* 저장 실패 — 메모리 버퍼만 유지 */
  }
}

function push(kind: PerfEvent['kind'], detail: string, ms: number): void {
  buf.push({ t: new Date().toISOString(), kind, detail, ms: Math.round(ms) })
  if (buf.length > MAX) buf = buf.slice(-MAX)
  persist()
}

/** 화면 전환 좌표 마크 — AppShell 이 페이지 변경 시 호출 */
export function markPage(page: string): void {
  if (!started) return
  push('page', page, 0)
}

export function startPerfWatch(): void {
  if (started) return
  started = true
  try {
    buf = JSON.parse(localStorage.getItem(KEY) ?? '[]') as PerfEvent[]
  } catch {
    buf = []
  }

  // ① JS 롱태스크(500ms+만 기록 — 50ms 잡음 제외)
  try {
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration >= 500) push('longtask', e.name || 'longtask', e.duration)
      }
    })
    obs.observe({ entryTypes: ['longtask'] })
  } catch {
    /* Long Tasks API 미지원 — 하트비트만으로 판별 */
  }

  // ② 이벤트 루프 하트비트 — 2초 이상 벌어지면 기록(JS 정지 물증)
  let last = performance.now()
  window.setInterval(() => {
    const now = performance.now()
    const gap = now - last
    if (gap > 2000) push('heartbeat-gap', `이벤트 루프 ${Math.round(gap)}ms 정지`, gap)
    last = now
  }, 500)

  // ③ 채널 호출률 감시 (8/13 전광판 폭주 재발 방지 — 코워크 회신 §2 보강 요구 이행):
  // invoke 를 계수 래퍼로 감싼다 — 채널별 10초 창 계수, 31건째 도달 시 'invoke-storm' 1회
  // 기록(창당 1회 — 마크 자체 폭주 방지). 정상 화면은 같은 채널 10초 수 건이 상한이므로
  // 31건 = 3건/초 지속 = 재발사 루프 물증(당시 실측 초당 100건+는 0.3초 만에 걸린다).
  // 재검 열람 = __invokeRate() (채널별 현재 창 계수 표).
  const rate = new Map<string, { n: number; t0: number }>()
  try {
    const apiObj = window.api as unknown as { invoke: (...a: unknown[]) => Promise<unknown> }
    const orig = apiObj.invoke.bind(window.api)
    apiObj.invoke = (...args: unknown[]): Promise<unknown> => {
      const ch = String(args[0])
      const now = performance.now()
      let c = rate.get(ch)
      if (!c || now - c.t0 > 10_000) {
        c = { n: 0, t0: now }
        rate.set(ch, c)
      }
      c.n++
      if (c.n === 31) push('invoke-storm', `${ch} 10초 창 31건+ — 재발사 루프 의심`, now - c.t0)
      return orig(...args)
    }
  } catch {
    /* 데스크톱 preload(contextBridge)는 api 동결 = 대입이 TypeError → 감시 없이 계속.
       운용 정본인 웹 모드(:8080·:8081 polyfill)는 일반 객체라 감시가 걸린다(8/13 실측). */
  }
  ;(window as unknown as Record<string, unknown>).__invokeRate = () => {
    const now = performance.now()
    const rows = [...rate.entries()].map(([ch, c]) => ({
      채널: ch,
      '현재 10초 창 호출': now - c.t0 > 10_000 ? 0 : c.n,
      '창 경과(초)': Math.round(Math.min(now - c.t0, 10_000) / 100) / 10
    }))
    // eslint-disable-next-line no-console
    console.table(rows.filter((r) => r['현재 10초 창 호출'] > 0))
    const storms = buf.filter((e) => e.kind === 'invoke-storm').length
    return `폭주 마크 누적 ${storms}건 (0건 = 60초 계약 준수)`
  }

  // 콘솔 열람 도구(코워크 동선)
  ;(window as unknown as Record<string, unknown>).__perfLog = () => {
    // eslint-disable-next-line no-console
    console.table(buf)
    return `${buf.length}건 (longtask ${buf.filter((e) => e.kind === 'longtask').length} · gap ${buf.filter((e) => e.kind === 'heartbeat-gap').length})`
  }
  ;(window as unknown as Record<string, unknown>).__perfLogCsv = () =>
    ['시각,종류,내용,ms', ...buf.map((e) => `${e.t},${e.kind},"${e.detail}",${e.ms}`)].join('\n')
}
