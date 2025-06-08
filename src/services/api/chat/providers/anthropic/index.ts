import { ChatRequest, ChatResponse } from '@/types';

/**
 * Send a request to Claude API through a server proxy to avoid CORS issues
 */
export async function sendClaudeRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  try {
    // Convert messages to the format expected by Anthropic API
    // Filter out any messages with empty content as Claude API doesn't accept them
    const anthropicMessages = chatRequest.messages
      .filter(msg => msg.content && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
    // Ensure there's at least one message
    if (anthropicMessages.length === 0) {
      throw new Error('No valid messages found for Claude API request. Messages cannot have empty content.');
    }
    
    // Create the request body
    const requestBody = {
      model: chatRequest.model,
      max_tokens: chatRequest.stream ? 16000 : 4096,
      messages: anthropicMessages,
      stream: chatRequest.stream
    };

    // Set up a proxy endpoint on your backend server to forward requests to Anthropic
    // This endpoint should be configured in your Vite server proxy settings
    const proxyEndpoint = '/api/proxy/claude'; 
    
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey, // The server will use this to make the Anthropic request
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Claude API request failed with status ${response.status}: ${
          errorData?.error?.message || response.statusText
        }`
      );
    }

    if (chatRequest.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data = await response.json();
      // Format the response to match OpenAI format
      return {
        id: data.id,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: data.content?.[0]?.text || ''
            },
            finish_reason: 'stop'
          }
        ]
      } as ChatResponse;
    }
  } catch (error) {
    console.error('Error in Claude API request:', error);
    throw error;
  }
}

