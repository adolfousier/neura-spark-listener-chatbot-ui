import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Provider, type Settings } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

export function getProviderFromEnv(): Provider {
  const provider = import.meta.env.VITE_BACKEND_SERVICE_PROVIDER?.toLowerCase() as Provider;
  return ['claude', 'openai', 'flowise', 'openrouter', 'neurarouter', 'google'].includes(provider) ? provider : 'groq';
}

export const getDefaultSettings = (): Omit<Settings, 'providerA' | 'modelA' | 'temperatureA' | 'providerB' | 'modelB' | 'temperatureB'> => {
  const provider = getProviderFromEnv();
  let defaultModel = import.meta.env.VITE_GROQ_API_MODEL || 'deepseek-r1-distill-llama-70b';

  // Set appropriate default model based on provider
  if (provider === 'google') {
    defaultModel = import.meta.env.VITE_GOOGLE_API_MODEL || 'gemini-2.0-flash';
  }
  return {
    provider,
    model: defaultModel,
    temperature: 0.7,
    streamEnabled: import.meta.env.VITE_STREAM_ENABLED !== 'false',
    reasoningFormat: import.meta.env.VITE_REASONING_FORMAT || 'parsed',
    template: 'minimal',
    darkMode: false,
    systemPrompt: import.meta.env.DEFAULT_SYSTEM_PROMPT || '',
    contextWindowSize: 5,
    webSearchEnabled: false, // Web search disabled by default
    audioResponseEnabled: false,
  };
};

export const getDefaultArenaSettings = (): Pick<Settings, 'providerA' | 'modelA' | 'temperatureA' | 'providerB' | 'modelB' | 'temperatureB'> => ({
  providerA: 'neurarouter',
  modelA: 'openrouter/deepseek-r1-0528:free',
  temperatureA: 0.7,
  providerB: 'neurarouter',
  modelB: 'openrouter/deepseek-r1-0528:free',
  temperatureB: 0.7,
});

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Gets the default welcome message from environment variables
 * Supports full markdown formatting
 */
export function getFirstMessage(message?: string): string {
  // If a specific message is provided, use it
  if (message) return message;
  
  // Otherwise, get from environment variable or use fallback
  return import.meta.env.DEFAULT_WELCOME_MESSAGE || "Hello! I'm your AI assistant. How can I help you today?";
}

export function getApiUrlForProvider(provider: Provider): string {
  switch (provider) {
    case 'groq':
      return import.meta.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    case 'claude':
      // Use the proxy URL for Claude API requests
      return import.meta.env.VITE_CLAUDE_API_URL || '/api/claude-proxy';
    case 'openai':
      return import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    case 'openrouter':
      return import.meta.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    case 'flowise':
      return import.meta.env.VITE_FLOWISE_API_URL || 'http://localhost:3000/api/v1/prediction';
    case 'neurarouter':
      return import.meta.env.VITE_NEURA_ROUTER_API_URL || 'https://api.meetneura.ai/v1/chat/completions/router';
    case 'google':
      return import.meta.env.VITE_GOOGLE_API_URL || 'https://generativelanguage.googleapis.com';
    default:
      return 'https://api.groq.com/openai/v1/chat/completions';
  }
}

export function getApiKeyForProvider(provider: Provider): string {
  switch (provider) {
    case 'groq':
      return import.meta.env.VITE_GROQ_API_KEY || '';
    case 'claude':
      return import.meta.env.VITE_CLAUDE_API_KEY || '';
    case 'openai':
      return import.meta.env.VITE_OPENAI_API_KEY || '';
    case 'openrouter':
      return import.meta.env.VITE_OPENROUTER_API_KEY || '';
    case 'flowise':
      return import.meta.env.VITE_FLOWISE_API_KEY || '';
    case 'neurarouter':
      return import.meta.env.VITE_NEURA_ROUTER_API_KEY || '';
    case 'google':
      return import.meta.env.VITE_GOOGLE_API_KEY || '';
    default:
      return import.meta.env.VITE_GROQ_API_KEY || '';
  }
}

export function getTemplateClass(template: string): string {
  switch (template) {
    case 'minimal':
      return 'template-minimal';
    case 'vibrant':
      return 'template-vibrant';
    case 'elegant':
      return 'template-elegant';
    default:
      return 'template-minimal';
  }
}

/**
 * Gets the OpenAI API key for TTS
 */
export function getOpenAITTSApiKey(): string {
  return import.meta.env.VITE_OPENAI_API_KEY || '';
}

/**
 * Gets the TTS model to use
 */
export function getOpenAITTSModel(): string {
  return import.meta.env.VITE_OPENAI_TTS_API_MODEL || 'gpt-4o-mini-tts';
}

/**
 * Gets the TTS voice to use
 */
export function getOpenAITTSVoice(): string {
  return import.meta.env.VITE_OPENAI_TTS_API_VOICE || 'alloy';
}

/**
 * Gets the Groq API key for STT
 */
export function getGroqSTTApiKey(): string {
  return import.meta.env.VITE_GROQ_API_KEY || '';
}

/**
 * Gets the STT model to use
 */
export function getGroqSTTModel(): string {
  return import.meta.env.VITE_GROQ_STT_API_MODEL || 'whisper-large-v3';
}

/**
 * Gets the Azure Blob Storage container name
 */
export function getAzureStorageContainerName(): string {
  return import.meta.env.VITE_AZURE_STORAGE_CONTAINER_ID || '';
}

/**
 * Gets the Azure Blob Storage account name
 */
export function getAzureStorageAccountName(): string {
  return import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || '';
}

/**
 * Gets the Azure Blob Storage SAS token
 */
export function getAzureStorageSasToken(): string {
  return import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN || '';
}


export async function* streamChatResponse(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      try {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim() !== '');
        
        for (const line of lines) {
          try {
            // Skip ping events
            if (line.includes('event: ping')) continue;
            
            // Skip [DONE] markers (from any provider)
            if (line.includes('[DONE]')) continue;
            
            // Handle Claude API specific events
            if (line.startsWith('event:')) continue;
            
            // Extract the data part
            if (!line.startsWith('data:')) continue;
            
            const trimmedLine = line.startsWith('data: ') ? line.slice(6) : line;
            if (trimmedLine.trim() === '') continue;
            
            const data = JSON.parse(trimmedLine);
            
            // Handle Neura format
            if (data.chunk !== undefined) {
              yield data.chunk;
            }
            // Handle Claude API format
            else if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
              yield data.delta.text;
            }
            // Handle OpenAI format
            else if (data.choices && data.choices[0]?.delta?.content) {
              yield data.choices[0].delta.content;
            }
            // Handle non-streaming format
            else if (data.choices && data.choices[0]?.message?.content) {
              yield data.choices[0].message.content;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('Skipping invalid JSON in stream:', line);
          }
        }
      } catch (e) {
        console.error('Error processing stream chunk:', e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}