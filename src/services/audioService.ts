import { uploadAudioToAzure } from './api/storage/azure';
import {
  getOpenAITTSModel,
  getOpenAITTSVoice,
  getGroqSTTModel,
  getTTSApiUrl,
  getSTTApiUrl
} from '@/lib/utils';

/**
 * Audio Service - Handles text-to-speech, speech-to-text and audio recording
 */

/**
 * Convert text to speech using secure server endpoint
 * @param text Text to convert to speech
 * @returns Promise with audio data
 */
export async function convertTextToSpeech(text: string): Promise<ArrayBuffer> {
  console.log('[Audio Service] SECURE MODE - Converting text to speech');
  
  const apiUrl = getTTSApiUrl();
  const model = getOpenAITTSModel();
  const voice = getOpenAITTSVoice();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model,
        voice
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`TTS API request failed: ${response.status} - ${errorText}`);
    }

    const audioData = await response.arrayBuffer();
    console.log('[Audio Service] Successfully converted text to speech');
    return audioData;
  } catch (error) {
    console.error('[Audio Service] Failed to convert text to speech:', error);
    throw error;
  }
}

/**
 * Convert speech to text using a secure server endpoint
 * @param audioFile Audio file to transcribe
 * @returns Promise with transcribed text
 */
export async function convertSpeechToText(audioFile: File): Promise<string> {
  console.log('[Audio Debug] SECURE MODE - Starting speech-to-text conversion', {
    fileSize: audioFile.size,
    fileType: audioFile.type,
    fileName: audioFile.name
  });
  
  const apiUrl = getSTTApiUrl();
  
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('model', getGroqSTTModel());

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`STT API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.text || '';
    
    console.log(`[Audio Debug] Successfully converted speech to text:`, {
      textLength: text.length,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });
    return text;
  } catch (error) {
    console.error('[Audio Debug] Failed to convert speech to text:', error);
    throw error;
  }
}

// MediaRecorder instance and audio chunks array for recording
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

/**
 * Start recording audio
 * @returns Promise that resolves when recording starts
 */
export async function startRecording(): Promise<void> {
  console.log('[Audio Debug] Starting audio recording');
  
  // Reset audio chunks
  audioChunks = [];
  
  try {
    // Request microphone access
    console.log('[Audio Debug] Requesting microphone access');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    console.log('[Audio Debug] Microphone access granted, tracks:', 
      stream.getAudioTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      }))
    );
    
    // Create new MediaRecorder instance
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      console.warn('[Audio Debug] audio/webm not supported, trying fallback format');
      mimeType = '';
    }
    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType || undefined });
    
    console.log('[Audio Debug] MediaRecorder created with MIME type:', 
      mediaRecorder.mimeType || 'default browser format'
    );
    
    // Add event listeners
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        console.log('[Audio Debug] Received audio chunk, size:', event.data.size);
        audioChunks.push(event.data);
      } else {
        console.warn('[Audio Debug] Received empty audio chunk');
      }
    });
    
    mediaRecorder.addEventListener('start', () => {
      console.log('[Audio Debug] MediaRecorder started');
    });
    
    mediaRecorder.addEventListener('error', (event) => {
      console.error('[Audio Debug] MediaRecorder error:', event);
    });
    
    // Start recording
    mediaRecorder.start();
    console.log('[Audio Debug] Recording started');
  } catch (error) {
    console.error('[Audio Debug] Error starting recording:', error);
    throw error;
  }
}

/**
 * Stop recording audio
 * @returns Promise with recorded audio as blob
 */
export async function stopRecording(): Promise<Blob> {
  console.log('[Audio Debug] Stopping audio recording');
  
  if (!mediaRecorder) {
    console.error('[Audio Debug] No recording in progress');
    throw new Error('No recording in progress');
  }
  
  return new Promise((resolve, reject) => {
    // Add stop event listener
    mediaRecorder!.addEventListener('stop', () => {
      try {
        // Create blob from audio chunks
        console.log('[Audio Debug] Recorder stopped, creating audio blob from', 
          audioChunks.length, 'chunks with total size', 
          audioChunks.reduce((size, chunk) => size + chunk.size, 0)
        );
        
        if (audioChunks.length === 0) {
          console.error('[Audio Debug] No audio chunks collected');
          reject(new Error('No audio data recorded'));
          return;
        }
        
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder!.mimeType || 'audio/webm' });
        
        console.log('[Audio Debug] Audio blob created', {
          size: audioBlob.size,
          type: audioBlob.type
        });
        
        // Stop all tracks in the stream
        mediaRecorder!.stream.getTracks().forEach(track => {
          track.stop();
          console.log('[Audio Debug] Track stopped:', track.label);
        });
        
        // Reset mediaRecorder
        mediaRecorder = null;
        
        resolve(audioBlob);
      } catch (error) {
        console.error('[Audio Debug] Error creating audio blob:', error);
        reject(error);
      }
    });
    
    // Stop recording
    if (mediaRecorder!.state === 'recording') {
      mediaRecorder!.stop();
    } else {
      console.warn('[Audio Debug] Tried to stop recorder but state was:', mediaRecorder!.state);
      // Try to clean up anyway
      mediaRecorder!.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;
      reject(new Error('Recording was not in progress'));
    }
  });
}

/**
 * Play audio from ArrayBuffer
 * @param audioData Audio data to play
 * @returns Promise that resolves when audio playback starts
 */
export async function playAudio(audioData: ArrayBuffer): Promise<void> {
  console.log('[Audio Debug] Playing audio', {
    dataSize: audioData.byteLength
  });
  
  try {
    // Create blob from audio data
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    
    // Create URL from blob
    const url = URL.createObjectURL(blob);
    
    // Create audio element
    const audio = new Audio(url);
    
    // Add ended event to clean up URL object
    audio.addEventListener('ended', () => {
      console.log('[Audio Debug] Audio playback ended, revoking URL');
      URL.revokeObjectURL(url);
    });
    
    // Add error handler
    audio.addEventListener('error', (e) => {
      console.error('[Audio Debug] Audio playback error:', e);
      URL.revokeObjectURL(url);
    });
    
    // Play audio
    await audio.play();
    console.log('[Audio Debug] Audio playback started');
  } catch (error) {
    console.error('[Audio Debug] Error playing audio:', error);
    throw error;
  }
}

/**
 * Convert blob to ArrayBuffer
 * @param blob Blob to convert
 * @returns Promise with ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

/**
 * Convert text to speech using OpenAI's TTS API and upload to Azure Blob Storage
 * @param text Text to convert to speech
 * @returns Promise with the URL of the uploaded audio file and audio data
 */
export async function convertAndUploadTextToSpeech(text: string): Promise<{ audioUrl: string, audioData: ArrayBuffer }> {
  console.log('[Audio Debug] Starting TTS conversion and Azure upload', {
    textLength: text.length,
    textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
  });
  
  // Limit text to 4000 characters for TTS (OpenAI limit is 4096)
  let processText = text;
  if (text.length > 4000) {
    console.log('[Audio Debug] Text exceeds 4000 chars, truncating');
    processText = text.substring(0, 4000) + '...';
  }
  
  // Clean text to improve speech quality
  processText = processText
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\*\*|\*|__|\|_|#/g, '') // Remove markdown formatting
    .replace(/!\[(.*?)\]\(.*?\)/g, 'Image: $1') // Replace image links
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace markdown links with just the text
    .replace(/\n\n+/g, '\n\n') // Condense multiple newlines
    .trim();
  
  try {
    // First convert text to speech via our server endpoint
    console.log('[Audio Debug] Converting text to speech via server endpoint');
    const apiKey = getOpenAITTSApiKey();
    const model = getOpenAITTSModel();
    const voice = getOpenAITTSVoice() as any; // Cast to any to avoid type errors
    
    const audioData = await textToSpeech(processText, apiKey, model, voice);
    console.log('[Audio Debug] TTS conversion successful, audio size:', audioData.byteLength);
    
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('TTS API returned empty audio data');
    }
    
    // Create a temporary blob URL for immediate playback
    const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
    const tempUrl = URL.createObjectURL(audioBlob);
    console.log('[Audio Debug] Created temporary blob URL:', tempUrl);
    
    let azureUploadPromise: Promise<string> | null = null;
    
    try {
      // Upload to Azure Blob Storage in the background to get a persistent URL
      console.log('[Audio Debug] Starting async Azure upload');
      
      // Start the upload process but don't await it
      azureUploadPromise = uploadAudioToAzure(audioData)
        .then(persistentUrl => {
          console.log(`[Audio Debug] Azure upload complete:`, {
            url: persistentUrl
          });
          return persistentUrl;
          // The component that receives the response should update the message with this URL
        })
        .catch(error => {
          console.error('[Audio Debug] Azure upload failed:', error);
          // Return the temp URL if the upload fails
          return tempUrl;
        });
    } catch (uploadError) {
      console.error('[Audio Debug] Error starting Azure upload:', uploadError);
      // Continue with the temp URL even if upload initiation fails
    }
    
    // Return the temp URL immediately and the audio data
    return { 
      audioUrl: tempUrl, 
      audioData,
      // If needed, expose the upload promise for consumers to await the final URL
      // azureUploadPromise 
    };
  } catch (error) {
    console.error('[Audio Debug] Failed to convert text to speech:', error);
    throw new Error(`TTS conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert blob to base64 string for temporary storage
 * @param blob Audio blob to convert
 * @returns Promise with base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
} 