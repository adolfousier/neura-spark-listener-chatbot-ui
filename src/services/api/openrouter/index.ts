import { ChatRequest, ChatResponse } from '@/types';
/**
 * Send a request to OpenRouter API
 */

/**
 * Send a request to OpenRouter API with the required headers
 */
export async function sendOpenRouterRequest(
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