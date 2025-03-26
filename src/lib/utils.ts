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
  return ['claude', 'openai', 'flowise', 'openrouter', 'neura'].includes(provider) ? provider : 'groq';
}

export function getDefaultSettings(): Settings {
  return {
    provider: getProviderFromEnv(),
    model: import.meta.env.VITE_GROQ_API_MODEL || 'deepseek-r1-distill-llama-70b',
    temperature: 0.7,
    streamEnabled: import.meta.env.VITE_STREAM_ENABLED !== 'false',
    reasoningFormat: import.meta.env.VITE_REASONING_FORMAT || 'parsed',
    template: 'minimal',
    darkMode: false,
    systemPrompt: import.meta.env.VITE_DEFAULT_SYSTEM_PROMPT || '',
    contextWindowSize: 5,
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getFirstMessage(message?: string): string {
  return message || "Hello! I'm your AI assistant. How can I help you today?";
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
      case 'neura':
        return import.meta.env.VITE_NEURA_ROUTER_API_URL || 'https://api.meetneura.ai/v1/chat/completions/router';    
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
      case 'neura':
        return import.meta.env.VITE_NEURA_ROUTER_API_KEY || '';      
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
