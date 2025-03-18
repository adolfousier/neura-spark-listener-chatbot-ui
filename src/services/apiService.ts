
import { getApiKeyForProvider, getApiUrlForProvider } from "@/lib/utils";
import { ChatRequest, ChatResponse, ChatStreamResponse, Provider } from "@/types";

export async function sendChatRequest(
  provider: Provider, 
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  const apiKey = getApiKeyForProvider(provider);
  const apiUrl = getApiUrlForProvider(provider);
  
  if (!apiKey) {
    throw new Error(`API key for ${provider} is not set. Please check your environment variables.`);
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
      
      // Handle different stream formats
      try {
        // For server-sent events format
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim() !== '' && line.trim() !== 'data: [DONE]');
        
        for (const line of lines) {
          try {
            const trimmedLine = line.startsWith('data: ') ? line.slice(6) : line;
            const data = JSON.parse(trimmedLine);
            
            if (data.choices && data.choices[0]?.delta?.content) {
              yield data.choices[0].delta.content;
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
