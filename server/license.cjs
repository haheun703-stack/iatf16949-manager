// server/license.cjs — IATF 애드온 라이선스 단일 출처 (M2 검수 수정 2026-08-23)
// 종전엔 키 계산식이 index.cjs·gen-license-key.mjs·e2e-license-unlock.mjs 에 3벌 복사돼 있었다(코드 리뷰 지적) —
// salt/형식을 한 곳만 바꾸면 고객 키가 전부 거부되는 구조. 부수효과 0 모듈로 분리해 서버·발급기·하네스가 같이 require 한다.
// 키 v1 = "IATF-XXXX-XXXX-XXXX-XXXX" (HMAC-SHA256(회사명, salt) 앞 16hex). 정식 발급·회수·만료 = M4.
'use strict'
const crypto = require('crypto')

const LICENSE_SALT = 'dailyq-iatf-addon-v1'
const KEY_RE = /^IATF-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/

function normalizeKey(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '')
}
function licenseKeyFor(companyName) {
  const h = crypto.createHmac('sha256', LICENSE_SALT).update(String(companyName || '').trim()).digest('hex').toUpperCase().slice(0, 16)
  return `IATF-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`
}
/** 키 검증 — { ok } | { ok:false, error } */
function verifyKey(rawKey, companyName) {
  const key = normalizeKey(rawKey)
  if (!KEY_RE.test(key)) return { ok: false, error: '키 형식이 아닙니다. 예: IATF-1A2B-3C4D-5E6F-7A8B' }
  if (!String(companyName || '').trim()) return { ok: false, error: '회사명이 설정되지 않았습니다. 회사명을 먼저 입력하세요.' }
  if (key !== licenseKeyFor(companyName)) return { ok: false, error: `이 키는 "${companyName}" 용이 아닙니다. 발급받은 회사명과 등록된 회사명이 글자 그대로 같은지 확인하세요.` }
  return { ok: true, key }
}
function licenseState(db) {
  try {
    const r = db.prepare("SELECT value FROM app_config WHERE key = 'license.iatf_addon'").get()
    return { iatfAddon: !!r && r.value === 'on' }
  } catch {
    return { iatfAddon: false }
  }
}
/** IATF 애드온 전용 채널(접두) — 렌더러 IATF_ADDON_PAGES(iatf-dashboard·clause-tree·document-bom·process-workbench)의 데이터 채널.
 *  regulation:* 은 양식 작성 화면(기본판)도 쓰므로 제외. processFlow:* 는 기준정보(기본판). */
const ADDON_CHANNEL_PREFIXES = ['bom:', 'clause:', 'iatf:', 'process:']
function isAddonChannel(ch) {
  return ADDON_CHANNEL_PREFIXES.some((p) => ch.startsWith(p))
}

module.exports = { LICENSE_SALT, KEY_RE, normalizeKey, licenseKeyFor, verifyKey, licenseState, isAddonChannel, ADDON_CHANNEL_PREFIXES }
