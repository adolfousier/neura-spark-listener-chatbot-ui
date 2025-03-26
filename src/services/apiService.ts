import { getApiKeyForProvider, getApiUrlForProvider, generateId } from "@/lib/utils";
import { ChatRequest, ChatResponse, Provider } from "@/types";
import { FlowiseClient } from 'flowise-sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";
// Import the MessageType type from flowise-sdk
type MessageType = 'apiMessage' | 'userMessage';

/**
 * This file contains the API service for sending chat requests to various providers
 * including OpenAI, Groq, Claude, Flowise, and Google.
 */

export async function sendChatRequest(
  provider: Provider, 
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  console.log(`[API Service] Provider selected: ${provider}, Model: ${chatRequest.model}`);
  
  const apiKey = getApiKeyForProvider(provider);
  const apiUrl = getApiUrlForProvider(provider);
  
  console.log(`[API Service] Using API URL: ${apiUrl}`);
  
  if (!apiKey && provider !== 'flowise') {
    throw new Error(`API key for ${provider} is not set. Please check your environment variables.`);
  }

  if (provider === 'flowise') {
    console.log(`[API Service] Sending request to Flowise`);
    return sendFlowiseRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'neura') {
    console.log(`[API Service] Sending request to Neura`);
    return sendNeuraRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'claude') {
    console.log(`[API Service] Sending request to Claude`);
    return sendClaudeRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'openrouter') {
    console.log(`[API Service] Sending request to OpenRouter`);
    return sendOpenRouterRequest(apiUrl, apiKey, chatRequest);
  } else if (provider === 'google') {
    console.log(`[API Service] Sending request to Google AI`);
    return sendGoogleRequest(apiUrl, apiKey, chatRequest);
  } else {
    console.log(`[API Service] Sending request to OpenAI-compatible API`);
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

/**
 * Send a request to Google AI services
 */
async function sendGoogleRequest(
  apiUrl: string,
  apiKey: string,
  chatRequest: ChatRequest
): Promise<ChatResponse | ReadableStream<Uint8Array>> {
  console.log(`[Google API] Starting request to ${apiUrl} with model ${chatRequest.model}`);
  
  if (!apiKey) {
    throw new Error('Google API key is not set. Please check your environment variables.');
  }

  try {
    // Initialize the Google GenAI client
    console.log(`[Google API] Initializing Google GenAI client with key length: ${apiKey.length}`);
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Check if the model is an image generation model
    if (chatRequest.model === 'imagen-3.0-generate-001') {
      console.log(`[Google API] Using Imagen image generation model`);
      return handleImageGeneration(genAI, chatRequest);
    }
    
    // Initialize the model
    console.log(`[Google API] Initializing model: ${chatRequest.model}`);
    const model = genAI.getGenerativeModel({
      model: chatRequest.model,
      systemInstruction: chatRequest.messages.find(m => m.role === 'system')?.content
    });

    // Filter out system messages as they're handled separately via systemInstruction
    const nonSystemMessages = chatRequest.messages.filter(m => m.role !== 'system');
    console.log(`[Google API] Message count after filtering system messages: ${nonSystemMessages.length}`);
    
    // For code-gecko, only pass the last user message directly
    if (chatRequest.model === 'code-gecko') {
      console.log(`[Google API] Using Code Gecko model with direct message passing`);
      const lastUserMessage = nonSystemMessages.filter(m => m.role === 'user').pop();
      
      if (!lastUserMessage) {
        throw new Error('No user message found for code-gecko request');
      }
      
      console.log(`[Google API] Sending message to Code Gecko: length ${lastUserMessage.content.length} chars`);
      const result = await model.generateContent(lastUserMessage.content);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[Google API] Received response from Code Gecko: length ${text.length} chars`);
      return {
        id: generateId(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: text
            },
            finish_reason: 'stop'
          }
        ]
      };
    }
    
    // Convert messages to Google's chat format
    let history = [];
    
    // Google's API requires strict alternation between user and model messages,
    // and the first message must be from the user
    // We need to process messages to ensure this pattern
    for (let i = 0; i < nonSystemMessages.length; i++) {
      const msg = nonSystemMessages[i];
      const role = msg.role === 'user' ? 'user' : 'model';
      
      // Add the message to history
      history.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }
    
    console.log(`[Google API] Original history messages: ${history.length}`);
    
    // Ensure the conversation starts with a user message
    if (history.length > 0 && history[0].role !== 'user') {
      // If the first message is not from a user, add a placeholder user message
      console.log(`[Google API] First message is not from user, adding placeholder`);
      history.unshift({
        role: 'user',
        parts: [{ text: 'Hello' }]
      });
    }
    
    // Ensure proper user/model alternation throughout the history
    const processedHistory = [];
    let lastRole = null;
    
    for (const msg of history) {
      // Skip consecutive messages with the same role
      if (lastRole === msg.role) {
        // Append content to the last message if same role
        console.log(`[Google API] Combining consecutive ${msg.role} messages`);
        const lastMsg = processedHistory[processedHistory.length - 1];
        lastMsg.parts[0].text += "\n" + msg.parts[0].text;
      } else {
        processedHistory.push(msg);
        lastRole = msg.role;
      }
    }
    
    console.log(`[Google API] Processed history messages: ${processedHistory.length}`);
    console.log(`[Google API] History pattern: ${processedHistory.map(h => h.role).join(' -> ')}`);
    
    // For streaming responses
    if (chatRequest.stream) {
      console.log(`[Google API] Using streaming response mode`);
      const encoder = new TextEncoder();
      const chat = model.startChat({
        history: processedHistory,
        generationConfig: {
          temperature: chatRequest.temperature
        }
      });
      
      // Get the last user message
      const lastUserMessage = nonSystemMessages
        .filter(msg => msg.role === 'user')
        .pop();
        
      if (!lastUserMessage) {
        throw new Error('No user message found for chat request');
      }
      
      console.log(`[Google API] Sending streaming message: "${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}"`);
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await chat.sendMessageStream(lastUserMessage.content);
            
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                // Format the response to match OpenAI format for streaming
                const formattedChunk = JSON.stringify({
                  choices: [
                    {
                      index: 0,
                      delta: { content: text },
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
            console.log(`[Google API] Streaming response completed`);
          } catch (error) {
            console.error('[Google API] Error in streaming:', error);
            controller.error(error);
          }
        }
      });
      
      return stream;
    } 
    // For non-streaming responses
    else {
      console.log(`[Google API] Using non-streaming response mode`);
      const chat = model.startChat({
        history: processedHistory,
        generationConfig: {
          temperature: chatRequest.temperature
        }
      });
      
      // Get the last user message
      const lastUserMessage = nonSystemMessages
        .filter(msg => msg.role === 'user')
        .pop();
        
      if (!lastUserMessage) {
        throw new Error('No user message found for chat request');
      }
      
      console.log(`[Google API] Sending message: "${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}"`);
      const result = await chat.sendMessage(lastUserMessage.content);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[Google API] Received response: ${text.length} chars`);
      return {
        id: generateId(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: text
            },
            finish_reason: 'stop'
          }
        ]
      };
    }
  } catch (error) {
    console.error('[Google API] Error in request:', error);
    throw error;
  }
}

/**
 * Handle Imagen image generation
 */
async function handleImageGeneration(
  genAI: GoogleGenerativeAI,
  chatRequest: ChatRequest
): Promise<ChatResponse> {
  console.log(`[Imagen] Starting image generation process`);
  
  // Get the last user message as the image prompt
  const lastUserMessage = chatRequest.messages.filter(msg => msg.role === 'user').pop();
  if (!lastUserMessage) {
    throw new Error('No user message found for image generation');
  }
  
  console.log(`[Imagen] Using prompt: "${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}"`);
  console.log(`[Imagen] Initializing 'imagen-3.0-generate-001' model`);
  const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
  
  console.log(`[Imagen] Sending content generation request`);
  const result = await model.generateContent(lastUserMessage.content);
  console.log(`[Imagen] Received generation result`);
  const response = await result.response;
  
  // Check for generated images in the response parts
  console.log(`[Imagen] Processing response for image parts`);
  const images = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
      console.log(`[Imagen] Found image of type: ${part.inlineData.mimeType}`);
      images.push(part.inlineData);
    }
  }
  
  if (!images || images.length === 0) {
    console.error(`[Imagen] No images found in response`);
    throw new Error('No images generated');
  }
  
  console.log(`[Imagen] Successfully generated ${images.length} images`);
  
  // Format the response with markdown image
  const markdown = images.map((img) => {
    if (img) {
      const imgStr = `![Generated Image](data:${img.mimeType};base64,${img.data})`;
      console.log(`[Imagen] Created markdown image link: ${imgStr.substring(0, 50)}...`);
      return imgStr;
    }
    return '';
  }).join('\n\n');
  
  console.log(`[Imagen] Returning response with ${images.length} images as markdown`);
  return {
    id: generateId(),
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: markdown
        },
        finish_reason: 'stop'
      }
    ]
  };
}