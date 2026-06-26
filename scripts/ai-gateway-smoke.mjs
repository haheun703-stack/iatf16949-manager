// A1 게이트웨이 스모크 테스트 — 실제 Claude API에 tool-use 루프 1왕복 + 프롬프트 캐싱 확인.
// gateway.ts 의 핵심 패턴을 SDK 직접 호출로 재현(better-sqlite3 결합 회피). 최소 토큰.
// 사용: node scripts/ai-gateway-smoke.mjs
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'

const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const apiKey = env.CLAUDE_API_KEY
const model = env.CLAUDE_MODEL || 'claude-sonnet-4-5'
if (!apiKey) {
  console.error('CLAUDE_API_KEY 없음')
  process.exit(1)
}
console.log(`모델: ${model}  (키: ${apiKey.slice(0, 7)}… 비노출)`)

const client = new Anthropic({ apiKey })
const system = [{ type: 'text', text: 'IATF 품질 어시스턴트(테스트). 도구를 적극 사용.', cache_control: { type: 'ephemeral' } }]
const tools = [
  {
    name: 'get_open_cases',
    description: '진행중 케이스 목록을 반환한다.',
    input_schema: { type: 'object', properties: { limit: { type: 'number' } } }
  }
]

const r1 = await client.messages.create({
  model,
  max_tokens: 400,
  system,
  tools,
  messages: [{ role: 'user', content: '지금 진행중인 케이스를 get_open_cases 도구로 조회해줘.' }]
})
console.log(`\n[turn1] stop_reason=${r1.stop_reason}`)
console.log(`        usage: in=${r1.usage.input_tokens} out=${r1.usage.output_tokens} cache_create=${r1.usage.cache_creation_input_tokens ?? 0} cache_read=${r1.usage.cache_read_input_tokens ?? 0}`)
const tu = r1.content.find((b) => b.type === 'tool_use')
console.log(`        tool_use: ${tu ? tu.name + ' ' + JSON.stringify(tu.input) : '없음 ✗'}`)
if (!tu) {
  console.log('\n도구 호출이 안 일어남 — 루프 검증 불가')
  process.exit(2)
}

// tool_result 회신 → 최종 응답
const r2 = await client.messages.create({
  model,
  max_tokens: 400,
  system,
  tools,
  messages: [
    { role: 'user', content: '지금 진행중인 케이스를 get_open_cases 도구로 조회해줘.' },
    { role: 'assistant', content: r1.content },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify([{ case_no: 'QC-2026-0007', title: '클립 이물 불량', customer: '삼보' }])
        }
      ]
    }
  ]
})
const text = r2.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
console.log(`\n[turn2] stop_reason=${r2.stop_reason}`)
console.log(`        usage: in=${r2.usage.input_tokens} out=${r2.usage.output_tokens} cache_read=${r2.usage.cache_read_input_tokens ?? 0}`)
console.log(`        최종응답: ${text.slice(0, 160)}`)

const inTot = r1.usage.input_tokens + r2.usage.input_tokens
const outTot = r1.usage.output_tokens + r2.usage.output_tokens
const cost = ((inTot / 1e6) * (/opus/i.test(model) ? 15 : 3) + (outTot / 1e6) * (/opus/i.test(model) ? 75 : 15)).toFixed(6)
console.log(`\n✅ 루프 OK | 총 토큰 in=${inTot} out=${outTot} | 추정비용 $${cost}`)
console.log('   (실제 gateway.ts 는 이 흐름 + ai_actions 로깅. 로깅은 A2 시뮬로 검증됨)')
