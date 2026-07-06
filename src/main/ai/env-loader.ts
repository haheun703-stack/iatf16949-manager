import { app } from 'electron'
import { readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import type { EnvMap } from './types'

let cache: { env: EnvMap; mtime: number; path: string | null } | null = null

function findEnvPath(): string | null {
  // 보안: .env(API 키)는 설치판 리소스에 절대 번들하지 않는다(유출 패키지 방지).
  // 패키징 시 1순위 = userData/.env (사용자 PC 로컬 전용, 인스톨러에 미포함).
  // resourcesPath 는 과거 번들판 호환용 폴백으로만 남긴다.
  const candidates = !app.isPackaged
    ? [join(__dirname, '../../.env'), join(process.cwd(), '.env')]
    : [join(app.getPath('userData'), '.env'), join(process.resourcesPath, '.env')]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function parseDotenv(text: string): EnvMap {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out as EnvMap
}

/**
 * Returns the merged env (process.env > .env file).
 * Re-reads .env if its mtime changed since last read (no manual cache busting needed).
 */
export function loadEnv(): EnvMap {
  const path = findEnvPath()
  const fileEnv: EnvMap = (() => {
    if (!path) {
      cache = { env: {}, mtime: 0, path: null }
      return {}
    }
    const mtime = statSync(path).mtimeMs
    if (cache && cache.path === path && cache.mtime === mtime) {
      return cache.env
    }
    const text = readFileSync(path, 'utf-8')
    const env = parseDotenv(text)
    cache = { env, mtime, path }
    return env
  })()

  // process.env takes precedence over .env
  const merged: EnvMap = {
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || fileEnv.CLAUDE_API_KEY || fileEnv.ANTHROPIC_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || fileEnv.CLAUDE_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || fileEnv.OPENAI_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || fileEnv.GEMINI_MODEL,
    AI_PROVIDER: (process.env.AI_PROVIDER || fileEnv.AI_PROVIDER) as EnvMap['AI_PROVIDER'],
    AI_FALLBACK_CHAIN: process.env.AI_FALLBACK_CHAIN || fileEnv.AI_FALLBACK_CHAIN
  }
  return merged
}
