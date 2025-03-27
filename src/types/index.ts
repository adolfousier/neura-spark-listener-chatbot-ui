export type Provider = 'groq' | 'claude' | 'openai' | 'flowise' | 'openrouter' | 'neura' | 'google';

export type Template = 'minimal' | 'vibrant' | 'elegant';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  tokenCount?: number; // Optional token count field
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

export type Settings = {
  provider: Provider;
  model: string;
  temperature: number;
  streamEnabled: boolean;
  reasoningFormat: string;
  template: Template;
  darkMode: boolean;
  systemPrompt: string;
  contextWindowSize: number; // Number of message pairs to include in context
  webSearchEnabled: boolean; // Whether to use web search capability
};

export type ChatRequest = {
  messages: { role: string; content: string }[];
  model: string;
  temperature: number;
  stream: boolean;
};

export type ChatResponse = {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
};

export type ChatStreamResponse = {
  id: string;
  choices: {
    index: number;
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }[];
};
