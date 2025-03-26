import { getApiKeyForProvider, getApiUrlForProvider, generateId } from "@/lib/utils";
import { ChatRequest, ChatResponse, Provider } from "@/types";
import { FlowiseClient } from 'flowise-sdk';
// Import the MessageType type from flowise-sdk
type MessageType = 'apiMessage' | 'userMessage';

/**
 * This file contains the API service for sending chat requests to various providers
 * including OpenAI, Groq, Claude, and Flowise.
 */

export async function sendChatRequest(
  provider: Provider, 
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  const apiKey = getApiKeyForProvider(provider);
  const apiUrl = getApiUrlForProvider(provider);
  
  if (!apiKey && provider !== 'flowise') {
    throw new Error(`API key for ${provider} is not set. Please check your environment variables.`);
  }

  if (provider === 'flowise') {
    return sendFlowiseRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'neura') {
      return sendNeuraRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'claude') {
    return sendClaudeRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'openrouter') {
    return sendOpenRouterRequest(apiUrl, apiKey, chatRequest);
  } else {
    return sendOpenAICompatibleRequest(apiUrl, apiKey, chatRequest);
  }
}

/**
 * Send a request to Claude API through a server proxy to avoid CORS issues
 */
async function sendClaudeRequest(
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

/**
 * Send a request to OpenRouter API with the required headers
 */
async function sendOpenRouterRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': import.meta.env.VITE_OPENROUTER_HTTP_REFERER || window.location.origin,
    'X-Title': import.meta.env.VITE_OPENROUTER_X_TITLE || 'AI Spark Listener'
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `OpenRouter API request failed with status ${response.status}: ${
          errorData?.error?.message || response.statusText
        }`
      );
    }

    if (chatRequest.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data = await response.json();
      return data as ChatResponse;
    }
  } catch (error) {
    console.error('Error in OpenRouter API request:', error);
    throw error;
  }
}

/**
 * Send a request to OpenAI-compatible APIs (OpenAI, Groq)
 */
async function sendOpenAICompatibleRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `API request failed with status ${response.status}: ${
          errorData?.error?.message || response.statusText
        }`
      );
    }

    if (chatRequest.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data = await response.json();
      return data as ChatResponse;
    }
  } catch (error) {
    console.error('Error in chat API request:', error);
    throw error;
  }
}

/**
 * Send a request to Flowise API
 */
async function sendFlowiseRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  if (!apiUrl) {
    throw new Error('Flowise API URL is not set. Please check your environment variables.');
  }

  // Extract the chatflow ID from the environment
  const chatflowId = import.meta.env.VITE_FLOWISE_CHATFLOW_ID || '';
  if (!chatflowId) {
    throw new Error('Flowise Chatflow ID is not set. Please check your environment variables.');
  }

  // Initialize the Flowise SDK client with the base URL
  // Extract the base URL without the /api/v1/prediction/ path
  // This prevents path duplication when the SDK appends its own paths
  const baseUrl = apiUrl.replace(/\/api\/v1\/prediction\/?$/, '');
  
  const client = new FlowiseClient({
    baseUrl: baseUrl,
    apiKey: apiKey || undefined
  });

  // Convert the ChatRequest format to Flowise format
  const lastUserMessage = chatRequest.messages.filter(msg => msg.role === 'user').pop();
  if (!lastUserMessage) {
    throw new Error('No user message found in the request');
  }

  // Format history for Flowise (excluding the last user message)
  const history = chatRequest.messages
    .filter(msg => msg.role !== 'system' && !(msg.role === 'user' && msg.content === lastUserMessage.content))
    .map(msg => ({
      message: msg.content,
      type: msg.role === 'assistant' ? ('apiMessage' as MessageType) : ('userMessage' as MessageType),
      role: msg.role === 'assistant' ? ('apiMessage' as MessageType) : ('userMessage' as MessageType),
      content: msg.content
    }));

  try {
    if (chatRequest.stream) {
      // Handle streaming response using the SDK
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const prediction = await client.createPrediction({
              chatflowId: chatflowId,
              question: lastUserMessage.content,
              history: history.length > 0 ? history : undefined,
              overrideConfig: {
                temperature: chatRequest.temperature
              },
              streaming: true
            }) as AsyncGenerator<{event: string, data: string}, void, unknown>;

            for await (const chunk of prediction) {
              // The SDK returns events in the format {event: "token", data: "content"}
              if (chunk.event === 'token' && chunk.data) {
                // Format the response to match OpenAI format for streaming
                const formattedChunk = JSON.stringify({
                  choices: [
                    {
                      index: 0,
                      delta: { content: chunk.data },
                      finish_reason: null
                    }
                  ]
                });
                
                controller.enqueue(encoder.encode(`data: ${formattedChunk}\n\n`));
              }
            }
            
            // Signal the end of the stream
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in Flowise streaming:', error);
            controller.error(error);
          }
        }
      });
      
      return stream;
    } else {
      // Handle non-streaming response using the SDK
      const response = await client.createPrediction({
        chatflowId: chatflowId,
        question: lastUserMessage.content,
        history: history.length > 0 ? history : undefined,
        overrideConfig: {
          temperature: chatRequest.temperature
        }
      });
      
      // Extract the content from the response
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response.text) {
        content = response.text;
      } else if (response.result) {
        content = response.result;
      } else if (response.json) {
        content = JSON.stringify(response.json);
      }
      
      // Format the response to match OpenAI format
      return {
        id: generateId(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content
            },
            finish_reason: 'stop'
          }
        ]
      } as ChatResponse;
    }
  } catch (error) {
    console.error('Error in Flowise API request:', error);
    
    // Check if the error response contains HTML (indicating we hit the UI instead of API)
    if (error.message && (error.message.includes('<!DOCTYPE html>') || error.message.includes('<html'))) {
      throw new Error('Received HTML instead of JSON. Make sure your Flowise API URL points to the API endpoint, not the UI. The URL should be in format "https://bots.meetneura.ai/api/v1/prediction/" without including the chatflow ID.');
    }
    
    throw error;
  }
}

/**
 * Send a request to Neura API
 */
export async function sendNeuraRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    // Always request streaming from the API
    const apiRequest = {
      messages: chatRequest.messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      })),
      model: chatRequest.model || 'neura-default',
      temperature: chatRequest.temperature,
      stream: true, // Always stream from API
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiRequest),
    });

    if (!response.ok) {
      throw new Error(
        `Neura API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    // For UI streaming requests, return the stream directly
    if (chatRequest.stream) {
      // Create a ReadableStream that processes chunks as they arrive
      return new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            // Enqueue the Uint8Array chunk directly
            controller.enqueue(value);
          }

          // Signal that the stream is complete
          controller.close();
        },
      });
    } else {
      // For non-streaming requests, collect all chunks and return a complete response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split('\n')
            .filter((line) => line.trim() !== '');
          
          for (const line of lines) {
            try {
              // Skip ping events, [DONE] markers, and events
              if (line.includes('event: ping') || 
                  line.includes('[DONE]') || 
                  line.startsWith('event:')) continue;
              
              // Extract the data part
              if (!line.startsWith('data:')) continue;
              
              const trimmedLine = line.startsWith('data: ') ? line.slice(6) : line;
              if (trimmedLine.trim() === '') continue;
              
              const data = JSON.parse(trimmedLine);
              
              // Handle Neura format
              if (data.chunk !== undefined) {
                fullContent += data.chunk;
              }
              // Handle OpenAI format
              else if (data.choices && data.choices[0]?.delta?.content) {
                fullContent += data.choices[0].delta.content;
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Skipping invalid JSON in stream:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      // Return a complete response with the accumulated content
      return {
        id: generateId(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent
            },
            finish_reason: 'stop'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error in Neura API request:', error);
    throw error;
  }
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