import { getApiKeyForProvider, getApiUrlForProvider} from "@/lib/utils";
import { ChatRequest, ChatResponse, Provider } from "@/types";
import { sendGoogleRequest } from "./api/google";
import { sendOpenRouterRequest } from "./api/openrouter";
import { sendClaudeRequest } from "./api/anthropic";
import { sendOpenAICompatibleRequest } from "./api/openai-compatible";
import { sendFlowiseRequest } from "./api/flowise";
import { sendNeuraRequest } from "./api/neurarouter";

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
  } else if (provider === 'neurarouter') {
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