#!/usr/bin/env node
// scripts/gen-license-key.mjs — IATF 애드온 라이선스 키 발급(v1, 2026-08-23 M2). 계산식 = server/license.cjs 단일 출처(리뷰 8/23: 복사본 3벌 제거).
// 사용: node scripts/gen-license-key.mjs "<회사명(company_profile.companyName 과 글자 그대로)>"
// 키는 회사명에 묶인다 — 회사명이 바뀌면 재발급. 정식 발급·회수 절차 = M4.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { licenseKeyFor } = require('../server/license.cjs')
const name = process.argv.slice(2).join(' ').trim()
if (!name) { console.error('사용법: node scripts/gen-license-key.mjs "<회사명>"'); process.exit(1) }
console.log(licenseKeyFor(name))
