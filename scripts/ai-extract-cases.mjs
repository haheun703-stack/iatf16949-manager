#!/usr/bin/env node
/**
 * ai-extract-cases.mjs — 대책서 원문 → 구조화 JSON (2단계, AI 추출)
 *
 * dump-defect-texts.py 가 뽑은 PPTX 원문 텍스트를, 앱이 쓰는 동일한
 * @anthropic-ai/sdk(Claude)로 구조화 추출한다. seed_defect_cases.py 의
 * 라벨-경계 정규식 field() 를 AI 구조화 추출로 대체하는 핵심.
 * (env-loader 가 electron 결합이라 generate()를 직접 import 못 함 → 동일 SDK 직접 호출)
 *
 * 비용관리: 기본 5건만. 전체는 `node scripts/ai-extract-cases.mjs 42`.
 * 출력: <scratchpad>/defect-cases-ai.json
 *
 * 사용: node scripts/ai-extract-cases.mjs [limit]
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(scriptDir, '..', '.env')
// dump-defect-texts.py 와 동일 기본 경로(OS temp). 환경변수로 덮어쓰기 가능.
const SCRATCH = process.env.DEFECT_TEXTS_OUT || join(tmpdir(), 'iatf-defect-texts.json')
const OUT = SCRATCH.replace(/iatf-defect-texts\.json$/, 'iatf-defect-cases-ai.json')

const LIMIT = parseInt(process.argv[2] || '5', 10)

/** .env 파서(앱 env-loader 와 동일 규칙: process.env 우선). */
function loadEnv() {
  const env = {}
  if (existsSync(ENV_PATH)) {
    for (const raw of readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      let v = line.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      env[line.slice(0, eq).trim()] = v
    }
  }
  return {
    key: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || env.CLAUDE_MODEL || 'claude-sonnet-4-5'
  }
}

const SYSTEM_PROMPT = `당신은 한국 제조업(자동차 부품) IATF 16949 품질불량 개선대책서를 구조화하는 추출 엔진이다.
주어진 대책서 본문 텍스트에서 아래 항목을 추출해 JSON 으로만 응답하라. 설명/마크다운 금지, 순수 JSON 객체 하나만.

규칙:
- 본문에 명시된 내용만 추출. 추측/창작 금지. 없으면 null.
- part_name: 순수 품명(품번/규격/P_NO 제외). 예: "호스", "브래킷".
- defect_desc: 불량현상을 30자 이내 명사구로. 예: "브레이징부 리크", "이종조립 불량".
- root_cause: 발생원인(원인 분석) 본문을 자연스러운 한국어 문장으로 정리. 라벨 잡음 제거.
- corrective_action: 근본대책/개선내용을 자연스러운 문장으로 정리.
- location: 발생지역/발생장소(예: "삼보 INLINE", "JATCO").
- defect_qty: 발생수량 정수만(단위 제거). 없거나 비현실적(품번조각 등)이면 null.
- occurred_date: 발생일자 YYYY-MM-DD. 본문/파일명에서. 없으면 null.
- lot: LOT NO(영문+숫자 형태만). 날짜는 LOT 아님. 없으면 null.
- customer: 고객사(JATCO/자트코, HMC/현대자동차, HPT/현대파워텍, 기아, 현대위아 등). 없으면 null.

응답 형식:
{"part_name":string|null,"defect_desc":string|null,"root_cause":string|null,"corrective_action":string|null,"location":string|null,"defect_qty":number|null,"occurred_date":string|null,"lot":string|null,"customer":string|null}`

/** 응답 텍스트에서 JSON 객체 추출(코드펜스/잡음 허용). */
function parseJson(text) {
  if (!text) return null
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const i = t.indexOf('{')
  const j = t.lastIndexOf('}')
  if (i < 0 || j < 0 || j < i) return null
  try {
    return JSON.parse(t.slice(i, j + 1))
  } catch {
    return null
  }
}

async function main() {
  const { key, model } = loadEnv()
  if (!key) {
    console.error('CLAUDE_API_KEY 미설정 (.env 확인)')
    process.exit(1)
  }
  if (!existsSync(SCRATCH)) {
    console.error(`원문 덤프 없음: ${SCRATCH}\n먼저 python scripts/dump-defect-texts.py 실행`)
    process.exit(1)
  }
  const records = JSON.parse(readFileSync(SCRATCH, 'utf-8'))
  const batch = records.slice(0, LIMIT)
  const client = new Anthropic({ apiKey: key })

  console.log(`AI 추출 시작: ${batch.length}/${records.length}건 (model=${model})\n`)
  const out = []
  for (const r of batch) {
    try {
      const resp = await client.messages.create({
        model,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `파일명: ${r.file}\n품번: ${r.part_no}\n\n[대책서 본문]\n${r.text}` }]
      })
      const block = resp.content.find((b) => b.type === 'text')
      const data = parseJson(block?.text)
      if (!data) {
        console.log(`  ✗ ${r.part_no} | JSON 파싱 실패`)
        out.push({ ...r, ai: null, error: 'parse_failed', raw: block?.text?.slice(0, 200) })
        continue
      }
      out.push({ file: r.file, part_no: r.part_no, ai: data })
      console.log(
        `  ✓ ${r.part_no.padEnd(13)} | 품명:${String(data.part_name ?? '-').slice(0, 12).padEnd(12)} | 현상:${String(data.defect_desc ?? '-').slice(0, 16).padEnd(16)} | 고객:${String(data.customer ?? '-').slice(0, 10).padEnd(10)} | 수량:${data.defect_qty ?? '-'} | 일자:${data.occurred_date ?? '-'} | LOT:${data.lot ?? '-'}`
      )
    } catch (err) {
      console.log(`  ✗ ${r.part_no} | API 오류: ${err.message}`)
      out.push({ ...r, ai: null, error: err.message })
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf-8')
  const ok = out.filter((o) => o.ai).length
  console.log(`\n완료: ${ok}/${batch.length}건 추출 성공 → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
