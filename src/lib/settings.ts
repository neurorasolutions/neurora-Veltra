// Impostazioni delle integrazioni esterne.
// Le chiavi API sono inserite dall'utente nella pagina Impostazioni e
// salvate in localStorage (mai committate, mai inviate a terzi se non
// al rispettivo servizio).

export type LLMProvider = 'anthropic' | 'openai' | 'groq' | 'openrouter' | 'ollama'

export interface Settings {
  // Provider SDI (Aruba) — richiede utenza Premium per i Web Services
  aruba: {
    username: string
    password: string
    authUrl: string
    apiUrl: string
  }
  // Commercialista AI
  llm: {
    provider: LLMProvider
    apiKey: string
    model: string
  }
  // Email alert (usata da n8n / Edge Functions, qui solo conservata)
  email: {
    resendApiKey: string
    destinatario: string
  }
  // Ollama Cloud API
  ollama: {
    apiKey: string
    apiUrl: string
  }
  // Migrazione da Fatture in Cloud
  fattureInCloud: {
    accessToken: string
    companyId: string
  }
  // Webhook n8n per alert schedulati
  n8nWebhookUrl: string
  // RAG normativo + web search
  rag: {
    enabled: boolean
    autoFetch: boolean
  }
  webSearch: {
    enabled: boolean
  }
}

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'anthropic/claude-haiku-4.5',
  ollama: 'glm-5.2',
}

export interface ModelOption {
  value: string
  label: string
}

// Liste curate mostrate nel menu a tendina. Per OpenRouter la lista viene
// arricchita a runtime con i modelli scaricati dall'API (fetchOpenRouterModels).
export const MODEL_OPTIONS: Record<LLMProvider, ModelOption[]> = {
  anthropic: [
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — veloce ed economico' },
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 — equilibrato' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 — massima qualità' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — economico' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — versatile' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B — istantaneo' },
  ],
  ollama: [
    { value: 'glm-5.2', label: 'GLM 5.2 — bilanciato (consigliato)' },
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash — veloce' },
    { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro — ragionamento' },
    { value: 'kimi-k2.7-code', label: 'Kimi K2.7 Code' },
    { value: 'kimi-k2.6', label: 'Kimi K2.6' },
    { value: 'kimi-k2.5', label: 'Kimi K2.5' },
    { value: 'qwen3.5:397b', label: 'Qwen3.5 397B — massima qualita' },
    { value: 'glm-5.1', label: 'GLM 5.1' },
    { value: 'mistral-large-3:675b', label: 'Mistral Large 3 675B' },
    { value: 'nemotron-3-ultra', label: 'Nemotron 3 Ultra' },
    { value: 'nemotron-3-super', label: 'Nemotron 3 Super' },
    { value: 'gpt-oss:120b', label: 'GPT-OSS 120B' },
    { value: 'gpt-oss:20b', label: 'GPT-OSS 20B — veloce' },
    { value: 'gemma4:31b', label: 'Gemma 4 31B' },
  ],
  openrouter: [
    { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
    { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ],
}

const DEFAULTS: Settings = {
  aruba: {
    username: '',
    password: '',
    authUrl: 'https://auth.fatturazioneelettronica.aruba.it',
    apiUrl: 'https://ws.fatturazioneelettronica.aruba.it',
  },
  llm: {
    provider: 'anthropic',
    apiKey: '',
    model: DEFAULT_MODELS.anthropic,
  },
  email: {
    resendApiKey: '',
    destinatario: '',
  },
  fattureInCloud: {
    accessToken: '',
    companyId: '',
  },
  n8nWebhookUrl: '',
  ollama: {
    apiKey: '',
    apiUrl: 'https://ollama.com',
  },
  rag: {
    enabled: true,
    autoFetch: false,
  },
  webSearch: {
    enabled: true,
  },
}

const KEY = 'nf_settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    const parsed = JSON.parse(raw)
    // merge con i default per compatibilità con versioni precedenti
    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      aruba: { ...DEFAULTS.aruba, ...(parsed.aruba || {}) },
      llm: { ...DEFAULTS.llm, ...(parsed.llm || {}) },
      email: { ...DEFAULTS.email, ...(parsed.email || {}) },
      fattureInCloud: { ...DEFAULTS.fattureInCloud, ...(parsed.fattureInCloud || {}) },
      ollama: { ...DEFAULTS.ollama, ...(parsed.ollama || {}) },
      rag: { ...DEFAULTS.rag, ...(parsed.rag || {}) },
      webSearch: { ...DEFAULTS.webSearch, ...(parsed.webSearch || {}) },
    }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function isArubaConfigured(s: Settings) {
  return !!(s.aruba.username && s.aruba.password)
}

export function isLLMConfigured(s: Settings) {
  if (s.llm.provider === 'ollama') return !!s.ollama.apiKey
  return !!s.llm.apiKey
}
