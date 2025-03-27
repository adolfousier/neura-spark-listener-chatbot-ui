/**
 * Speech-to-Text API that must be used from server-side only
 * 
 * IMPORTANT: The Groq SDK should NOT be used directly in browser environments
 * as it risks exposing API credentials to attackers. This functionality should
 * be implemented behind a server-side API endpoint that handles the API key securely.
 */

/**
 * Convert speech to text using Groq's Whisper API
 * @param audioFile Audio file to transcribe
 * @returns Promise with transcribed text
 */
export async function speechToText(audioFile: File): Promise<string> {
  try {
    console.log(`[STT Debug] Starting STT conversion`, {
      fileName: audioFile.name,
      fileType: audioFile.type,
      fileSize: audioFile.size,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });
    
    // Send the audio file to our server endpoint
    console.log(`[STT Debug] Preparing fetch request to /api/stt`);
    
    // Create FormData to send file properly
    const formData = new FormData();
    
    // Using a fixed filename and explicitly setting content type
    const blob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type || 'audio/webm' });
    console.log(`[STT Debug] Created new blob from file:`, {
      blobSize: blob.size,
      blobType: blob.type
    });
    
    // Add to FormData with explicit filename
    formData.append('audio', blob, 'recording.webm');
    
    console.log(`[STT Debug] Created FormData with audio file`, {
      hasFile: formData.has('audio'),
      formDataEntries: [...formData.entries()].map(entry => 
        typeof entry[1] === 'string' 
          ? { key: entry[0], value: entry[1] } 
          : { key: entry[0], type: entry[1].type, size: entry[1].size }
      )
    });
    
    // Log fetch options
    console.log(`[STT Debug] Sending fetch request with FormData`);
    
    // Use FormData to properly send the file with correct Content-Type
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`[STT Debug] Received response`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[STT Debug] Error response data:`, errorData);
      throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`[STT Debug] Successfully transcribed speech to text:`, {
      textSnippet: data.text?.substring(0, 50) + (data.text?.length > 50 ? '...' : '') || 'No text returned'
    });
    
    return data.text || '';
  } catch (error) {
    // Provide a better error message
    if (error instanceof Error && error.message.includes('browser-like environment')) {
      console.error(
        '[STT Debug] Security Error: Groq SDK detected browser environment. ' +
        'API keys should never be exposed in client-side code. ' +
        'Implement a server-side API endpoint to handle this securely.'
      );
      throw new Error(
        'Speech-to-text functionality must be implemented on the server side for security. ' +
        'Please contact the developer to fix this issue.'
      );
    }
    
    console.error('[STT Debug] Error converting speech to text:', error);
    throw error;
  }
} 