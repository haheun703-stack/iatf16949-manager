// ============================================================
// scripts/e2e-m9-draft.mjs — M-9 웹 초안 저장 파손 실증·회귀 (2026-08-17)
//
// 결함(8/13 검수 M-9 · 라이브 데이터 소실 현존):
//   핸들러는 `createdBy` 의 **존재 여부**를 "완료 저장" 신호로 쓰는데(form-handlers §W2 2착),
//   디스패처 STAMP 가 세션 이름을 **무조건** 채워 넣어 초안·자동저장까지 완료 저장으로 오인됐다.
//   → fact 공란 검사에 걸려 500. 그 예외를 FormCanvas 자동저장 catch 가 삼켜
//     **양식 이동 시 작성 중 내용이 말없이 소실**됐다.
//
// 처분(8/17): 디스패처에 `STAMP_ONLY_IF_PRESENT`(form 저장 2채널) — 값을 보냈을 때만 덮어쓴다.
//   위조 방어 불변(값을 보내면 언제나 세션 이름) · 폴백 금지 불변(없으면 없는 채로 초안).
//
// 이 프로브가 단언하는 것:
//   1 초안 저장(createdBy 미전달) = 200 이고 created_by 는 **비어 있다**(완료 아님)
//   2 완료 저장(createdBy 전달) = fact 공란이면 **거부**(서버 최종 관문 살아 있음)
//   3 완료 저장 + 위조 시도(createdBy:'위조') = 200 이면 created_by 는 **세션 이름**(STAMP 불변)
//   4 초안 → 이어쓰기(update) 도 같은 계약
//   5 잔여물 정리(자기 산물 전량 삭제)
// 대상 = :8081 복사본(lib 게이트 경유) · 라이브 무접촉.
//   IATF_DATA_DIR=<복사본> E2E_DB=<복사본.db> node(electron) scripts/e2e-m9-draft.mjs
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive, loginBot, mkApi, mkCheck } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const DB_PATH = assertCopyDb(process.env.E2E_DB)
const PW = process.argv[2] || 'qms1234'

const { check, done } = mkCheck()
const api = mkApi(BASE)
const cookie = await loginBot(BASE, PW)

const dbr = new Database(DB_PATH, { readonly: true })

// fact(오늘의 사실) 칸이 여러 개인 양식을 고른다 — 공란 검사가 실제로 걸리는 표본이어야 한다.
// 판별 기준은 서버 가드(submission-guards.detectEmptyFact)와 **같은 조건**이어야 의미가 있다:
//   field_class = 'fact' AND type <> 'auto'
const FACT_WHERE = "field_class = 'fact' AND type <> 'auto'"
const form = dbr.prepare(`
  SELECT form_code AS code, COUNT(*) AS facts
  FROM form_fields WHERE ${FACT_WHERE}
  GROUP BY form_code HAVING facts >= 3
  ORDER BY facts DESC LIMIT 1`).get()

if (!form) {
  console.error('fact 칸 3개 이상인 양식을 찾지 못했습니다 — 복사본 픽스처 확인')
  process.exit(1)
}
console.log(`대상 양식 = ${form.code} (fact ${form.facts}칸)\n`)

const created = []
const readRow = (id) => dbr.prepare('SELECT created_by, status FROM form_submissions WHERE id = ?').get(id)

// 1단 — 초안 저장(createdBy 미전달): 통과 + created_by 공란
{
  const r = await api(cookie, 'form:submissionCreate', { formCode: form.code, values: {} })
  const id = r.json && r.json.id
  if (id) created.push(id)
  check('1단 초안 저장(createdBy 미전달) = 200', r.status === 200 && !!id,
    `status=${r.status} err=${r.json && r.json.error}`)
  const row = id ? readRow(id) : null
  check('1단 ★초안은 created_by 가 비어 있다(완료 저장으로 오인되지 않음)',
    !!row && (row.created_by === null || row.created_by === ''), `created_by=${row && row.created_by}`)
}

// 2단 — 완료 저장(createdBy 전달) + fact 공란: 서버가 거부해야 한다(최종 관문 생존)
{
  const r = await api(cookie, 'form:submissionCreate',
    { formCode: form.code, values: {}, createdBy: 'E2E봇' })
  if (r.status === 200 && r.json && r.json.id) created.push(r.json.id)
  const blocked = r.status !== 200 || !!(r.json && r.json.error)
  check('2단 완료 저장 + fact 공란 = 거부(서버 최종 관문 생존)', blocked,
    `status=${r.status} err=${(r.json && r.json.error || '').slice(0, 50)}`)
}

// 3단 — STAMP 위조 방어 불변: createdBy 를 보내면 값은 언제나 세션 이름으로 덮인다
{
  const facts = dbr.prepare(
    `SELECT field_key AS fk FROM form_fields WHERE form_code = ? AND ${FACT_WHERE}`).all(form.code)
  const values = {}
  for (const f of facts) values[f.fk] = '1'
  const r = await api(cookie, 'form:submissionCreate',
    { formCode: form.code, values, createdBy: '위조' })
  const id = r.json && r.json.id
  if (id) created.push(id)
  check('3단 완료 저장(fact 채움) = 200', r.status === 200 && !!id,
    `status=${r.status} err=${(r.json && r.json.error || '').slice(0, 60)}`)
  const row = id ? readRow(id) : null
  check("3단 ★STAMP 불변 — created_by = 세션('E2E봇'), '위조' 아님",
    !!row && row.created_by === 'E2E봇', `created_by=${row && row.created_by}`)
}

// 4단 — 이어쓰기(update)도 같은 계약: createdBy 미전달이면 원작성자 보존·완료 승격 없음
{
  const r0 = await api(cookie, 'form:submissionCreate', { formCode: form.code, values: {} })
  const id = r0.json && r0.json.id
  if (id) created.push(id)
  const r = await api(cookie, 'form:submissionUpdate', { id, values: { probe: 'x' } })
  check('4단 초안 이어쓰기(createdBy 미전달) = 200', r.status === 200, `status=${r.status}`)
  const row = id ? readRow(id) : null
  check('4단 ★이어쓰기가 초안을 완료로 승격시키지 않는다(created_by 여전히 공란)',
    !!row && (row.created_by === null || row.created_by === ''), `created_by=${row && row.created_by}`)
}

// 5단 — 잔여물 0(자기 산물 전량 삭제 — 검증 산물 한정)
{
  const dbw = new Database(DB_PATH)
  let removed = 0
  const del = dbw.prepare('DELETE FROM form_submissions WHERE id = ?')
  for (const id of created) removed += del.run(id).changes
  dbw.close()
  check('5단 잔여물 정리(이 프로브가 만든 작성본 전량 삭제)', removed === created.length,
    `${removed}/${created.length}행`)
}

dbr.close()
done()
