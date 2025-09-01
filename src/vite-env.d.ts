/// <reference types="vite/client" />

interface ImportMetaEnv {
  // SECURITY FIX: Only client-safe environment variables should be exposed
  // All API keys are now server-side only and removed from here
  
  // Client-side configuration (safe to expose)
  readonly VITE_API_BASE_URL: string;
  readonly VITE_BACKEND_SERVICE_PROVIDER: string;
  readonly VITE_GROQ_API_MODEL: string;
  readonly VITE_GOOGLE_API_MODEL: string;
  readonly VITE_STREAM_ENABLED: string;
  readonly VITE_REASONING_FORMAT: string;
  readonly VITE_BOXED_CHATBUBBLE_MODE_ENABLED: string;
  readonly VITE_PORT: string;
  readonly VITE_OPENAI_TTS_API_MODEL: string;
  readonly VITE_OPENAI_TTS_API_VOICE: string;
  readonly VITE_GROQ_STT_API_MODEL: string;
  readonly DEFAULT_SYSTEM_PROMPT: string;
  readonly DEFAULT_WELCOME_MESSAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
