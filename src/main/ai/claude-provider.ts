import Anthropic from '@anthropic-ai/sdk'
import type { AiProvider, AiGenerateOptions } from './types'
import { loadEnv } from './env-loader'

const DEFAULT_MODEL = 'claude-sonnet-4-5'

let cachedClient: { client: Anthropic; key: string } | null = null

function getClient(): { client: Anthropic; model: string } | null {
  const env = loadEnv()
  const apiKey = env.CLAUDE_API_KEY
  if (!apiKey) return null

  if (!cachedClient || cachedClient.key !== apiKey) {
    cachedClient = { client: new Anthropic({ apiKey }), key: apiKey }
  }
  return { client: cachedClient.client, model: env.CLAUDE_MODEL || DEFAULT_MODEL }
}

export const claudeProvider: AiProvider = {
  id: 'claude',
  displayName: 'Anthropic Claude',
  isConfigured: () => Boolean(loadEnv().CLAUDE_API_KEY),
  currentModel: () => loadEnv().CLAUDE_MODEL || DEFAULT_MODEL,
  async generate(opts: AiGenerateOptions): Promise<string> {
    const got = getClient()
    if (!got) throw new Error('Claude API 키가 설정되지 않았습니다.')
    const response = await got.client.messages.create({
      model: got.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userMessage }]
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude 응답에 텍스트 블록이 없습니다.')
    }
    return textBlock.text
  }
}
