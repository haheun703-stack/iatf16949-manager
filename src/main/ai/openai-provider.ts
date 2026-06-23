import OpenAI from 'openai'
import type { AiProvider, AiGenerateOptions } from './types'
import { loadEnv } from './env-loader'

const DEFAULT_MODEL = 'gpt-4o-mini'

let cachedClient: { client: OpenAI; key: string } | null = null

function getClient(): { client: OpenAI; model: string } | null {
  const env = loadEnv()
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) return null

  if (!cachedClient || cachedClient.key !== apiKey) {
    cachedClient = { client: new OpenAI({ apiKey }), key: apiKey }
  }
  return { client: cachedClient.client, model: env.OPENAI_MODEL || DEFAULT_MODEL }
}

export const openaiProvider: AiProvider = {
  id: 'openai',
  displayName: 'OpenAI ChatGPT',
  isConfigured: () => Boolean(loadEnv().OPENAI_API_KEY),
  currentModel: () => loadEnv().OPENAI_MODEL || DEFAULT_MODEL,
  async generate(opts: AiGenerateOptions): Promise<string> {
    const got = getClient()
    if (!got) throw new Error('OpenAI API 키가 설정되지 않았습니다.')

    const userContent: OpenAI.Chat.ChatCompletionUserMessageParam['content'] = opts.image
      ? [
          { type: 'text', text: opts.userMessage },
          {
            type: 'image_url',
            image_url: { url: `data:${opts.image.mediaType};base64,${opts.image.base64}` }
          }
        ]
      : opts.userMessage
    const response = await got.client.chat.completions.create({
      model: got.model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: userContent }
      ]
    })

    const text = response.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.')
    return text
  }
}
