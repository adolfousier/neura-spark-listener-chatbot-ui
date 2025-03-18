
import { getApiKeyForProvider, getApiUrlForProvider, generateId } from "@/lib/utils";
import { ChatRequest, ChatResponse, ChatStreamResponse, Provider } from "@/types";

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
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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

async function sendFlowiseRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  if (!apiUrl) {
    throw new Error('Flowise API URL is not set. Please check your environment variables.');
  }

  // Extract the chatflow ID from the URL or environment
  // The URL format should be: https://your-flowise-instance/api/v1/prediction/{chatflowId}
  const chatflowId = import.meta.env.VITE_FLOWISE_CHATFLOW_ID || '';
  if (!chatflowId) {
    throw new Error('Flowise Chatflow ID is not set. Please check your environment variables.');
  }

  // Ensure the URL is properly formatted
  // Remove trailing slashes from the API URL
  const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const fullUrl = `${cleanApiUrl}/prediction/${chatflowId}`;

  // Convert the ChatRequest format to Flowise format
  const lastUserMessage = chatRequest.messages.filter(msg => msg.role === 'user').pop();
  if (!lastUserMessage) {
    throw new Error('No user message found in the request');
  }

  // Format history for Flowise (excluding the last user message)
  const history = chatRequest.messages
    .filter(msg => msg.role !== 'system' && !(msg.role === 'user' && msg.content === lastUserMessage.content))
    .map(msg => ({
      role: msg.role === 'assistant' ? 'apiMessage' : 'userMessage',
      content: msg.content
    }));

  const flowiseRequest: FlowiseRequest = {
    question: lastUserMessage.content,
    history: history.length > 0 ? history : undefined,
    overrideConfig: {
      temperature: chatRequest.temperature
    }
    // Note: uploads field is not implemented yet, but could be added in the future
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(flowiseRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Flowise API request failed with status ${response.status}: ${
          errorData?.error || response.statusText
        }`
      );
    }

    if (chatRequest.stream) {
      // Flowise doesn't support streaming in the same way as OpenAI-compatible APIs
      // We'll need to adapt the response to match the expected format
      const data = await response.json();
      
      // Create a synthetic stream from the response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Extract the content from the Flowise response
          // Flowise can return data in different formats, so we need to handle all possibilities
          let content = '';
          if (typeof data === 'string') {
            content = data;
          } else if (data.text) {
            content = data.text;
          } else if (data.result) {
            content = data.result;
          } else if (data.json) {
            content = JSON.stringify(data.json);
          }
          
          // Format the response to match OpenAI format for streaming
          const chunk = JSON.stringify({
            choices: [
              {
                index: 0,
                delta: { content },
                finish_reason: null
              }
            ]
          });
          
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return stream;
    } else {
      // Handle non-streaming response for Flowise
      const data = await response.json();
      
      // Extract the content from the Flowise response
      // Flowise can return data in different formats, so we need to handle all possibilities
      let content = '';
      if (typeof data === 'string') {
        content = data;
      } else if (data.text) {
        content = data.text;
      } else if (data.result) {
        content = data.result;
      } else if (data.json) {
        content = JSON.stringify(data.json);
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
        // For server-sent events format
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim() !== '' && line.trim() !== 'data: [DONE]');
        
        for (const line of lines) {
          try {
            // Handle Groq and other OpenAI-compatible APIs
            const trimmedLine = line.startsWith('data: ') ? line.slice(6) : line;
            if (trimmedLine.trim() === '') continue;
            
            const data = JSON.parse(trimmedLine);
            
            // Check for content in delta (streaming format)
            if (data.choices && data.choices[0]?.delta?.content) {
              yield data.choices[0].delta.content;
            }
            // Also check for content in message (non-streaming format)
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

interface FlowiseRequest {
  question: string;
  history?: { role: string; content: string }[];
  overrideConfig?: Record<string, any>;
}
