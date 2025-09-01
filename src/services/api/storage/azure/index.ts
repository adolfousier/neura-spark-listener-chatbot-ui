import { getSecureApiBaseUrl } from '@/lib/utils';

/**
 * SECURITY FIX: Azure Blob Storage Service (now secure)
 * Uses secure server endpoint to upload files without exposing credentials
 */

/**
 * Upload audio data to Azure Blob Storage via secure server endpoint
 * @param audioData The audio data as ArrayBuffer
 * @param fileName Optional custom file name (defaults to a timestamp-based name)
 * @returns Promise with the URL of the uploaded audio file
 */
export async function uploadAudioToAzure(
  audioData: ArrayBuffer,
  fileName?: string
): Promise<string> {
  console.log('[Azure Blob] SECURE MODE - Starting audio upload via server');
  
  const baseUrl = getSecureApiBaseUrl();
  const uploadUrl = `${baseUrl}/api/storage/upload`;
  
  try {
    // Convert ArrayBuffer to base64 for JSON transport
    const audioBuffer = new Uint8Array(audioData);
    const audioBase64 = btoa(String.fromCharCode(...audioBuffer));
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: audioBase64,
        fileName: fileName || `speech-${Date.now()}.mp3`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Azure upload failed with status ${response.status}: ${
          errorData?.error || errorData?.message || response.statusText
        }`
      );
    }

    const result = await response.json();
    
    console.log('[Azure Blob] Upload successful:', {
      blobName: result.blobName,
      url: result.url
    });
    
    return result.url;
  } catch (error) {
    console.error('[Azure Blob] Error uploading audio:', error);
    throw error;
  }
}