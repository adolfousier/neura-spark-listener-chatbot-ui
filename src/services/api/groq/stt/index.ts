/**
 * Speech-to-Text API that must be used from server-side only
 * 
 * IMPORTANT: The Groq SDK should NOT be used directly in browser environments
 * as it risks exposing API credentials to attackers. This functionality should
 * be implemented behind a server-side API endpoint that handles the API key securely.
 */

import { getGroqSTTApiKey, getGroqSTTModel } from '@/lib/utils';

/**
 * Convert audio file to text using Groq's Whisper API
 * @param audioFile Audio file to transcribe
 * @returns Promise with transcribed text
 */
export async function speechToText(audioFile: File): Promise<string> {
  console.log('[STT Debug] Starting speech-to-text conversion', {
    fileSize: audioFile.size,
    fileType: audioFile.type,
    fileName: audioFile.name
  });
  
  const apiKey = getGroqSTTApiKey();
  const model = getGroqSTTModel();
  
  if (!apiKey) {
    throw new Error('Groq API key is not set. Please check your environment variables.');
  }
  
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile, 'recording.webm');
    
    // Send request to server endpoint
    console.log('[STT Debug] Sending request to server endpoint');
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[STT Debug] Server error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[STT Debug] Received response:', {
      textLength: data.text.length,
      textPreview: data.text.substring(0, 50) + (data.text.length > 50 ? '...' : '')
    });
    
    return data.text;
  } catch (error) {
    console.error('[STT Debug] Failed to convert speech to text:', error);
    throw error;
  }
} 