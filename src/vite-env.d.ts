/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_OPENAI_API_URL: string;
  readonly VITE_CLAUDE_API_KEY: string;
  readonly VITE_CLAUDE_API_URL: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_GROQ_API_URL: string;
  readonly VITE_FLOWISE_API_KEY: string;
  readonly VITE_FLOWISE_API_URL: string;
  readonly VITE_OPENROUTER_API_KEY: string;
  readonly VITE_OPENROUTER_API_URL: string;
  readonly VITE_NEURA_API_KEY: string;
  readonly VITE_NEURA_API_URL: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_GOOGLE_API_URL: string;
  readonly VITE_GOOGLE_API_MODEL: string;
  readonly VITE_OPENAI_TTS_API_KEY: string;
  readonly VITE_OPENAI_TTS_API_MODEL: string;
  readonly VITE_OPENAI_TTS_API_VOICE: string;
  readonly VITE_GROQ_STT_API_KEY: string;
  readonly VITE_GROQ_STT_API_MODEL: string;
  readonly VITE_AZURE_STORAGE_CONTAINER_ID: string;
  readonly VITE_AZURE_STORAGE_ACCOUNT_NAME: string;
  readonly VITE_AZURE_STORAGE_SAS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
