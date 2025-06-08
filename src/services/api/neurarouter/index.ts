import { ChatRequest, ChatResponse } from '@/types';
import { generateId } from "@/lib/utils";

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
      model: chatRequest.model || 'neurarouter-default',
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