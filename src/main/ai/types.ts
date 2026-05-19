export type AiProviderId = 'claude' | 'openai' | 'gemini'

export interface AiGenerateOptions {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
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
