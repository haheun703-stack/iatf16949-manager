export type AiProviderId = 'claude' | 'openai' | 'gemini'

export interface AiImageInput {
  /** base64 인코딩된 이미지 데이터 (data URL 접두사 제외) */
  base64: string
  /** image/png | image/jpeg | image/webp | image/gif */
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
}

export interface AiGenerateOptions {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  /** 비전(이미지) 입력 — 있으면 멀티모달 호출 (캡쳐 → 구조화 추출 등) */
  image?: AiImageInput
}

export interface AiProvider {
  readonly id: AiProviderId
  readonly displayName: string
  /** Returns true if the provider has its API key configured. */
  isConfigured: () => boolean
  /** Returns model id actually used (for logging). */
  currentModel: () => string
  generate: (opts: AiGenerateOptions) => Promise<string>
}

export interface EnvMap {
  CLAUDE_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  CLAUDE_MODEL?: string
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  AI_PROVIDER?: AiProviderId
  AI_FALLBACK_CHAIN?: string
}
