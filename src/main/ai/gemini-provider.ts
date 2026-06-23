import { GoogleGenAI } from '@google/genai'
import type { AiProvider, AiGenerateOptions } from './types'
import { loadEnv } from './env-loader'

const DEFAULT_MODEL = 'gemini-2.0-flash-001'

let cachedClient: { client: GoogleGenAI; key: string } | null = null

function getClient(): { client: GoogleGenAI; model: string } | null {
  const env = loadEnv()
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) return null

  if (!cachedClient || cachedClient.key !== apiKey) {
    cachedClient = { client: new GoogleGenAI({ apiKey }), key: apiKey }
  }
  return { client: cachedClient.client, model: env.GEMINI_MODEL || DEFAULT_MODEL }
}

export const geminiProvider: AiProvider = {
  id: 'gemini',
  displayName: 'Google Gemini',
  isConfigured: () => Boolean(loadEnv().GEMINI_API_KEY),
  currentModel: () => loadEnv().GEMINI_MODEL || DEFAULT_MODEL,
  async generate(opts: AiGenerateOptions): Promise<string> {
    const got = getClient()
    if (!got) throw new Error('Gemini API 키가 설정되지 않았습니다.')

    // Gemini combines system + user into a single user-turn (system instruction via config)
    const contents = opts.image
      ? [
          {
            role: 'user',
            parts: [
              { text: opts.userMessage },
              { inlineData: { mimeType: opts.image.mediaType, data: opts.image.base64 } }
            ]
          }
        ]
      : opts.userMessage
    const response = await got.client.models.generateContent({
      model: got.model,
      contents,
      config: {
        systemInstruction: opts.systemPrompt,
        maxOutputTokens: opts.maxTokens ?? 1024
      }
    })

    const text = response.text
    if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다.')
    return text
  }
}
