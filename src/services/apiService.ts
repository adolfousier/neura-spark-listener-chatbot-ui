import { getApiUrlForProvider } from "@/lib/utils";
import { ChatRequest, ChatResponse, Provider } from "@/types";

/**
 * SECURITY FIX: Unified secure API service
 * All requests now go through our secure Express server
 * API keys are handled server-side only
 */
export async function sendChatRequest(
  provider: Provider, 
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  console.log(`[API Service] SECURE MODE - Provider selected: ${provider}, Model: ${chatRequest.model}`);
  
  const apiUrl = getApiUrlForProvider(provider);
  
  console.log(`[API Service] Using secure API URL: ${apiUrl}`);
  
  // Create request body with provider information
  const requestBody = {
    ...chatRequest,
    provider: provider  // Server needs to know which provider to use
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Secure API request failed with status ${response.status}: ${
          errorData?.error || errorData?.message || response.statusText
        }`
      );
    }

    if (chatRequest.stream) {
      // Return the response body for streaming
      if (!response.body) {
        throw new Error('Response body is null for streaming request');
      }
      return response.body;
    } else {
      // Parse JSON response for non-streaming
      const data = await response.json();
      return data as ChatResponse;
    }
  } catch (error) {
    console.error('Secure API request error:', error);
    throw error;
  }
}