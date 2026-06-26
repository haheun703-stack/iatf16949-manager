// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase E1 — SQ 준비도 예측 ("지금 심사 보면 몇 점").
//  점수는 결정론(SQ 신호등 가중) — computeSqReadiness 재사용. AI 는 설명·우선순위만.
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import { computeSqReadiness } from '../ipc/sq-handlers'
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type { ReadinessPrediction, ReadinessRed } from '@shared/ipc-types'

const W: Record<string, number> = { green: 1, yellow: 0.5, red: 0, gray: 0 }

/** 결정론 예측(무API): 신호등 가중점수 + RED/회색 항목. */
export function predictReadiness(db: Database.Database = getSqlite()): ReadinessPrediction {
  const r = computeSqReadiness(db)
  const counts = { green: 0, yellow: 0, red: 0, gray: 0 }
  const reds: ReadinessRed[] = []
  let achieved = 0
  let measurable = 0
  const categories: ReadinessPrediction['categories'] = []

  for (const c of r.categories) {
    let catAch = 0
    for (const it of c.items) {
      counts[it.signal] = (counts[it.signal] ?? 0) + 1
      const earn = (W[it.signal] ?? 0) * it.points
      achieved += earn
      catAch += earn
      if (it.signal !== 'gray') measurable += it.points
      if (it.signal === 'red' || it.signal === 'gray') {
        reds.push({
          code: it.code,
          title: it.title,
          points: it.points,
          signal: it.signal,
          reason:
            it.signal === 'gray'
              ? '양식 매핑 없음(측정 불가)'
              : it.formCount > 0 && it.standardizedCount === 0 && it.draftedCount === 0
                ? '양식 미표준화·미작성'
                : '작성본 없음'
        })
      }
    }
    categories.push({ name: c.name, points: c.points, signal: c.signal, score: Math.round(catAch) })
  }
  reds.sort((a, b) => b.points - a.points)

  return {
    score: Math.round(achieved),
    totalPoints: r.totalPoints,
    measurablePoints: measurable,
    counts,
    categories,
    reds: reds.slice(0, 12)
  }
}

/** AI 진단(점수 설명 + 우선순위). 도구 없음, 사실만. read-only. */
export async function explainReadiness(p: ReadinessPrediction): Promise<{ text: string; costUsd: number | null }> {
  const system = `당신은 IATF 16949 / 고객 SQ 심사 전문가입니다. 아래 결정론적 SQ 준비도(JSON)를 진단하세요.
- 1줄 총평: 현재 추정 ${p.score}/${p.totalPoints}점(미측정 회색 항목은 0점 처리)이 어떤 수준인지.
- 점수 손실이 가장 큰 RED/회색 항목 3~5개를 사유(증빙없음/미작성/측정불가)와 함께.
- 점수를 가장 빨리 올릴 우선순위 액션 3가지 — 배점 큰 항목부터, 무엇을 하면 몇 점 오르는지.
사실(JSON)에 있는 항목·숫자만 사용. 지어내지 말 것. 한국어, 간결, 행동촉구.`
  const res = await aiCall({
    purpose: 'readiness',
    system,
    messages: [{ role: 'user', content: JSON.stringify(p) + '\n\n위 SQ 준비도를 진단하고 우선순위를 제안해줘.' }],
    tier: 'fast',
    maxTokens: 800
  })
  return { text: res.text, costUsd: res.costUsd }
}
