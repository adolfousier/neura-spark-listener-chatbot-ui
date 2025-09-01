import type { IncomingMessage, ServerResponse } from 'http';
import busboy from 'busboy';
import { Readable } from 'stream';

// Import provider handlers
import { sendOpenAICompatibleRequest } from '../../services/api/chat/providers/openai-compatible/index.js';
import { sendGroqRequest } from '../../services/api/chat/providers/groq/index.js';
import { sendClaudeRequest } from '../../services/api/chat/providers/anthropic/index.js';
import { sendGoogleRequest } from '../../services/api/chat/providers/google/index.js';
import { sendOpenRouterRequest } from '../../services/api/chat/providers/openrouter/index.js';
import { sendNeuraRequest } from '../../services/api/chat/providers/neurarouter/index.js';
import { sendFlowiseRequest } from '../../services/api/chat/providers/flowise/index.js';

interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: string;
  provider: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

// Server-side function to get API keys from environment (without VITE_ prefix)
function getServerApiKey(provider: string): string {
  switch (provider) {
    case 'groq':
      return process.env.GROQ_API_KEY || '';
    case 'claude':
      return process.env.CLAUDE_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY || '';
    case 'flowise':
      return process.env.FLOWISE_API_KEY || '';
    case 'neurarouter':
      return process.env.NEURA_ROUTER_API_KEY || '';
    case 'google':
      return process.env.GOOGLE_API_KEY || '';
    default:
      return process.env.GROQ_API_KEY || '';
  }
}

function getServerApiUrl(provider: string): string {
  switch (provider) {
    case 'groq':
      return process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    case 'claude':
      return process.env.CLAUDE_API_URL || '/api/claude-proxy';
    case 'openai':
      return process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    case 'openrouter':
      return process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    case 'flowise':
      return process.env.FLOWISE_API_URL || 'http://localhost:3000/api/v1/prediction';
    case 'neurarouter':
      return process.env.NEURA_ROUTER_API_URL || 'https://api.meetneura.ai/v1/chat/completions/router';
    case 'google':
      return process.env.GOOGLE_API_URL || 'https://generativelanguage.googleapis.com';
    default:
      return process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  }
}

export async function handleChatRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    // Parse request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const chatRequest: ChatRequest = JSON.parse(body);
        const { provider } = chatRequest;

        // Get server-side API key and URL
        const apiKey = getServerApiKey(provider);
        const apiUrl = getServerApiUrl(provider);

        if (!apiKey && provider !== 'flowise') {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: `API key not configured for provider: ${provider}` }));
          return;
        }

        // Route to appropriate provider handler
        let response;
        switch (provider) {
          case 'flowise':
            response = await sendFlowiseRequest(apiUrl, apiKey, chatRequest);
            break;
          case 'neurarouter':
            response = await sendNeuraRequest(apiUrl, apiKey, chatRequest);
            break;
          case 'claude':
            response = await sendClaudeRequest(apiUrl, apiKey, chatRequest);
            break;
          case 'openrouter':
            response = await sendOpenRouterRequest(apiUrl, apiKey, chatRequest);
            break;
          case 'google':
            response = await sendGoogleRequest(apiUrl, apiKey, chatRequest);
            break;
          case 'groq':
          case 'openai':
          default:
            response = await sendOpenAICompatibleRequest(apiUrl, apiKey, chatRequest);
            break;
        }

        if (chatRequest.stream) {
          // Handle streaming response
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          
          if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                res.write(chunk);
              }
            } finally {
              reader.releaseLock();
            }
          }
          res.end();
        } else {
          // Handle non-streaming response
          const result = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        }
      } catch (error) {
        console.error('Error processing chat request:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}