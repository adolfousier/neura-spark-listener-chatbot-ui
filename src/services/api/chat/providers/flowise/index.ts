import { generateId } from "@/lib/utils";
import { FlowiseClient } from 'flowise-sdk';
import { ChatRequest, ChatResponse } from '@/types';

// Import the MessageType type from flowise-sdk
type MessageType = 'apiMessage' | 'userMessage';

/**
 * Send a request to Flowise API
 */
export async function sendFlowiseRequest(
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