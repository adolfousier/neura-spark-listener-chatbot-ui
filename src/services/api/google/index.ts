import { ChatRequest, ChatResponse } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateId } from "@/lib/utils";

/**
 * Google API module - handles all interactions with Google Generative AI
 */

/**
 * Send a request to Google AI services
 */
export async function sendGoogleRequest(
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
    
    // Set up the model with proper configuration for current date awareness
    const model = genAI.getGenerativeModel({
      model: chatRequest.model,
      generationConfig: {
        temperature: chatRequest.temperature,
        topP: 1,
        topK: 1,
        maxOutputTokens: 8196,
      },
    });
    
    // For chat models like Gemini, use startChat for better conversation context handling
    const chat = model.startChat({
      // Enable search for real-time information
      tools: [{ 
        // @ts-ignore - google_search is valid but not typed in SDK
        google_search: {} 
      }],
    });
    
    // Get the last user message
    const lastUserMessage = chatRequest.messages
      .filter(msg => msg.role === 'user')
      .pop();
      
    if (!lastUserMessage) {
      throw new Error('No user message found in the request');
    }
    
    // Prepare history for the chat (excluding the last user message)
    const history = chatRequest.messages
      .filter(msg => msg.role !== 'system' && !(msg.role === 'user' && msg.content === lastUserMessage.content))
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
    
    // For streaming responses
    if (chatRequest.stream) {
      console.log(`[Google API] Using streaming response mode`);
      const encoder = new TextEncoder();
      
      // Send all history messages to the chat first to build context
      if (history.length > 0) {
        for (const msg of history) {
          try {
            // Send previous messages but don't wait for responses
            console.log(`[Google API] Adding history message from ${msg.role}`);
            if (msg.role === 'user') {
              await chat.sendMessage(msg.parts[0].text);
            }
          } catch (err) {
            console.log('[Google API] Error adding history message:', err);
          }
        }
      }
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log(`[Google API] Sending message: "${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}"`);
            
            // Now send the actual user message
            const result = await chat.sendMessage(lastUserMessage.content);
            
            // Streaming is handled differently with the new SDK
            const response = await result.response;
            const text = response.text();
            
            console.log(`[Google API] Got response with length: ${text.length}`);
            
            // Extract sources from response if available
            const sources = [];
            try {
              // @ts-ignore - grounding metadata is not typed in SDK
              const metadata = response.candidates?.[0]?.groundingMetadata;
              if (metadata) {
                const chunks = metadata.groundingChunks || [];
                
                for (const chunk of chunks) {
                  if (chunk.web?.uri && chunk.web?.title) {
                    const url = chunk.web.uri;
                    if (!sources.some(src => src.uri === url)) {
                      sources.push({
                        uri: url,
                        title: chunk.web.title || url
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.log('[Google API] Error extracting sources:', err);
            }
            
            // Send the main text as a streaming response chunk
            // Since we can't actually stream from the new SDK response, 
            // we break it into smaller chunks to simulate streaming
            const chunkSize = 20; // characters per chunk
            for (let i = 0; i < text.length; i += chunkSize) {
              const textChunk = text.substring(i, i + chunkSize);
              
              const formattedChunk = JSON.stringify({
                choices: [
                  {
                    index: 0,
                    delta: { content: textChunk },
                    finish_reason: null
                  }
                ]
              });
              
              controller.enqueue(encoder.encode(`data: ${formattedChunk}\n\n`));
              
              // Add a small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 2));
            }
            
            // If we have sources, send them as a final chunk
            if (sources.length > 0) {
              console.log(`[Google API] Adding ${sources.length} sources to the response`);
              
              // Create sources section
              const sourcesSection = "\n\n---\n**Sources:**\n" + 
                '<div class="sources-container">' +
                sources.map(src => 
                  `<a href="${src.uri}" target="_blank" class="source-link">${src.title}</a>`
                ).join(' • ') +
                '</div>';
              
              // Send the sources as the final chunk
              const sourceChunk = JSON.stringify({
                choices: [
                  {
                    index: 0,
                    delta: { content: sourcesSection },
                    finish_reason: null
                  }
                ]
              });
              
              controller.enqueue(encoder.encode(`data: ${sourceChunk}\n\n`));
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
      
      // Send all history messages to the chat first to build context
      if (history.length > 0) {
        for (const msg of history) {
          try {
            // Send previous messages but don't wait for responses
            console.log(`[Google API] Adding history message from ${msg.role}`);
            if (msg.role === 'user') {
              await chat.sendMessage(msg.parts[0].text);
            }
          } catch (err) {
            console.log('[Google API] Error adding history message:', err);
          }
        }
      }
      
      // Now send the actual user message and wait for the response
      console.log(`[Google API] Sending message: "${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}"`);
      const result = await chat.sendMessage(lastUserMessage.content);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[Google API] Received response: ${text.length} chars`);
      
      // Extract sources from response if available
      const sources = [];
      try {
        // @ts-ignore - grounding metadata is not typed in SDK
        const metadata = response.candidates?.[0]?.groundingMetadata;
        if (metadata) {
          const chunks = metadata.groundingChunks || [];
          
          for (const chunk of chunks) {
            if (chunk.web?.uri && chunk.web?.title) {
              const url = chunk.web.uri;
              if (!sources.some(src => src.uri === url)) {
                sources.push({
                  uri: url,
                  title: chunk.web.title || url
                });
              }
            }
          }
        }
      } catch (err) {
        console.log('[Google API] Error extracting sources:', err);
      }
      
      // If sources are found, add them to the response
      let finalText = text;
      if (sources.length > 0) {
        console.log(`[Google API] Adding ${sources.length} sources to the response`);
        
        // Create sources section
        const sourcesSection = "\n\n---\n**Sources:**\n" + 
          '<div class="sources-container">' +
          sources.map(src => 
            `<a href="${src.uri}" target="_blank" class="source-link">${src.title}</a>`
          ).join(' • ') +
          '</div>';
        
        // Add to the response text
        finalText += sourcesSection;
      }
      
      return {
        id: generateId(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: finalText
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
  
  try {
    // Generate content with the Imagen model
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
    console.log(`[Imagen] Initialized 'imagen-3.0-generate-001' model`);
    
    // Send the request for image generation
    console.log(`[Imagen] Sending generation request`);
    const result = await model.generateContent(lastUserMessage.content);
    console.log(`[Imagen] Received generation result`);
    
    // Extract images from the response
    console.log(`[Imagen] Processing response for image parts`);
    const response = await result.response;
    const images = [];
    
    // Check for parts with image data
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
        console.log(`[Imagen] Found image of type: ${part.inlineData.mimeType}`);
        images.push(part.inlineData);
      }
    }
    
    if (images.length === 0) {
      console.error(`[Imagen] No images found in response`);
      throw new Error('No images generated');
    }
    
    console.log(`[Imagen] Successfully generated ${images.length} images`);
    
    // Format the response with markdown image
    const markdown = images.map((img) => {
      const imgStr = `![Generated Image](data:${img.mimeType};base64,${img.data})`;
      console.log(`[Imagen] Created markdown image link: ${imgStr.substring(0, 50)}...`);
      return imgStr;
    }).join('\n\n');
    
    console.log(`[Imagen] Returning response with ${images.length} images`);
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
  } catch (error) {
    console.error('[Imagen] Error generating images:', error);
    throw error;
  }
} 