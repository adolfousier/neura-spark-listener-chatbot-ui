import { 
  getAzureStorageContainerName, 
  getAzureStorageAccountName, 
  getAzureStorageSasToken 
} from '@/lib/utils';

/**
 * Azure Blob Storage Service
 * Used to upload audio files to Azure Blob Storage and get persistent URLs
 */

/**
 * Upload audio data to Azure Blob Storage and get a persistent URL
 * @param audioData The audio data as ArrayBuffer
 * @param fileName Optional custom file name (defaults to a timestamp-based name)
 * @returns Promise with the URL of the uploaded audio file
 */
export async function uploadAudioToAzure(
  audioData: ArrayBuffer,
  fileName?: string
): Promise<string> {
  console.log('[Azure Blob] Uploading audio to Azure Blob Storage');
  
  // Get Azure Storage config from environment variables
  const containerName = getAzureStorageContainerName();
  const accountName = getAzureStorageAccountName();
  const sasToken = getAzureStorageSasToken();
  
  if (!containerName || !accountName || !sasToken) {
    throw new Error('Azure Storage configuration is missing. Please check your environment variables.');
  }
  
  try {
    // Generate a unique file name if not provided
    const audioFileName = fileName || `speech-${Date.now()}.mp3`;
    
    // Create blob URL with SAS token
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${audioFileName}${sasToken}`;
    
    // Convert ArrayBuffer to Blob
    const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
    
    // Upload the blob to Azure Storage
    const response = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'audio/mpeg'
      },
      body: audioBlob
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
    }
    
    console.log(`[Azure Blob] Successfully uploaded audio file: ${audioFileName}`);
    
    // Return the public URL (without the SAS token for client access)
    const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${audioFileName}`;
    return publicUrl;
  } catch (error) {
    console.error('[Azure Blob] Error uploading audio:', error);
    throw error;
  }
} 