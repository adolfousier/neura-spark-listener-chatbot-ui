import OpenAI from "openai";

/**
 * Text-to-Speech service using OpenAI's API
 * 
 * IMPORTANT: Using the server endpoint to avoid exposing API keys in the browser
 */

// Add type for voice options
type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'coral' | 'sage' | 'ash';

/**
 * Convert text to speech using OpenAI's TTS API via our secure server endpoint
 * @param text The text to convert to speech
 * @param apiKey OpenAI API key (used only for server calls, not exposed in browser)
 * @param model TTS model to use (defaults to tts-1 if not specified)
 * @param voice Voice to use (defaults to 'alloy' if not specified)
 * @returns ArrayBuffer containing the audio data
 */
export async function textToSpeech(
  text: string,
  apiKey: string,
  model?: string, 
  voice?: OpenAIVoice
): Promise<ArrayBuffer> {
  if (!text.trim()) {
    throw new Error('Text is required for TTS');
  }

  console.log(`[OpenAI TTS] Converting text to speech via server endpoint`, {
    textLength: text.length,
    modelUsed: model || 'tts-1',
    voiceUsed: voice || 'alloy'
  });
  
  try {
    // Send request to our secure server endpoint
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: model || 'tts-1',
        voice: voice || 'alloy',
      }),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Server returned ${response.status}: ${response.statusText}` };
      }
      
      throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
    }
    
    // Get the audio buffer directly
    const audioBuffer = await response.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Received empty audio data from TTS service');
    }
    
    console.log(`[OpenAI TTS] Successfully converted text to speech (${audioBuffer.byteLength} bytes)`);
    return audioBuffer;
  } catch (error) {
    console.error('[OpenAI TTS] Error converting text to speech:', error);
    throw error;
  }
} 