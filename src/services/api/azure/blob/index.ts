import { BlobServiceClient } from '@azure/storage-blob';

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
  console.log('[Azure Blob] Starting audio upload');
  
  const accountName = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = import.meta.env.VITE_AZURE_STORAGE_CONTAINER_ID;
  const sasToken = import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN;
  
  if (!accountName || !containerName || !sasToken) {
    console.error('[Azure Blob] Missing credentials:', {
      hasAccountName: !!accountName,
      hasContainerName: !!containerName,
      hasSasToken: !!sasToken
    });
    throw new Error('Azure Storage credentials not configured');
  }
  
  try {
    // Create blob service client with SAS token
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net${sasToken}`
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Generate unique blob name
    const blobName = fileName || `speech-${Date.now()}.mp3`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload the audio data
    console.log('[Azure Blob] Uploading audio data:', {
      blobName,
      dataSize: audioData.byteLength
    });
    
    await blockBlobClient.uploadData(audioData, {
      blobHTTPHeaders: {
        blobContentType: 'audio/mpeg'
      }
    });
    
    // Get the URL with SAS token
    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: 'r', // Read only
      expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000), // 24 hours
      protocol: 'https',
      cacheControl: 'no-cache',
      contentDisposition: 'inline',
      contentType: 'audio/mpeg'
    });
    
    console.log('[Azure Blob] Upload successful:', {
      blobName,
      url: sasUrl
    });
    
    return sasUrl;
  } catch (error) {
    console.error('[Azure Blob] Error uploading audio:', error);
    throw error;
  }
} 