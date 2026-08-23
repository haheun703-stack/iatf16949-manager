#!/usr/bin/env node
// scripts/gen-license-key.mjs — IATF 애드온 라이선스 키 발급(v1, 2026-08-23 M2). 서버 license:unlock 과 같은 HMAC.
// 사용: node scripts/gen-license-key.mjs "<회사명(company_profile.companyName 과 글자 그대로)>"
// 키는 회사명에 묶인다 — 회사명이 바뀌면 재발급. 정식 발급·회수 절차 = M4.
import { createHmac } from 'node:crypto'
const name = process.argv.slice(2).join(' ').trim()
if (!name) { console.error('사용법: node scripts/gen-license-key.mjs "<회사명>"'); process.exit(1) }
const h = createHmac('sha256', 'dailyq-iatf-addon-v1').update(name).digest('hex').toUpperCase().slice(0, 16)
console.log(`IATF-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`)
