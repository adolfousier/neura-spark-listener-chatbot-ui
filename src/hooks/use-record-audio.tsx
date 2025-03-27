import { useState, useCallback, useRef } from 'react';

interface UseRecordAudioReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecordingSupported: () => boolean;
}

export function useRecordAudio(): UseRecordAudioReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Check if recording is supported in this browser
  const isRecordingSupported = useCallback(() => {
    return typeof window !== 'undefined' && 
      'MediaRecorder' in window && 
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia !== undefined;
  }, []);
  
  // Start recording audio
  const startRecording = useCallback(async () => {
    if (!isRecordingSupported()) {
      throw new Error('Audio recording is not supported in this browser');
    }
    
    console.log('[Audio Hook] Starting audio recording');
    
    // Reset audio chunks
    audioChunksRef.current = [];
    
    try {
      // Test if we can access the microphone
      console.log('[Audio Hook] Testing microphone permission...');
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if we got tracks
      if (testStream.getAudioTracks().length === 0) {
        console.error('[Audio Hook] No audio tracks received when testing microphone');
        throw new Error('No microphone detected or permission denied');
      }
      
      // Stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      console.log('[Audio Hook] Microphone permission test successful');
    
      // Request microphone access with better audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[Audio Hook] Microphone access granted, tracks:', 
        stream.getAudioTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          constraints: track.getConstraints()
        }))
      );
      
      // Check for support and use the appropriate MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('[Audio Hook] audio/webm not supported, trying audio/ogg');
        mimeType = 'audio/ogg; codecs=opus';
        
        if (!MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
          console.warn('[Audio Hook] audio/ogg not supported, trying audio/mp4');
          mimeType = 'audio/mp4';
          
          if (!MediaRecorder.isTypeSupported('audio/mp4')) {
            console.warn('[Audio Hook] audio/mp4 not supported, using default');
            mimeType = '';
          }
        }
      }
      
      console.log('[Audio Hook] Selected MIME type:', mimeType || 'default browser format');
      
      // Create new MediaRecorder instance with shorter timeslice to ensure chunks are created
      const recorder = new MediaRecorder(stream, { 
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      });
      
      console.log('[Audio Hook] Created MediaRecorder with MIME type:', 
        recorder.mimeType || 'default browser format'
      );
      
      // Add event listeners
      console.log('[Audio Hook] Setting up dataavailable event listener');
      recorder.addEventListener('dataavailable', (event) => {
        console.log('[Audio Hook] Data available event, size:', event.data.size);
        if (event.data.size > 0) {
          console.log('[Audio Hook] Adding chunk to audioChunksRef');
          audioChunksRef.current.push(event.data);
        } else {
          console.warn('[Audio Hook] Received empty chunk');
        }
      });
      
      recorder.addEventListener('start', () => {
        console.log('[Audio Hook] MediaRecorder started');
      });
      
      recorder.addEventListener('error', (error) => {
        console.error('[Audio Hook] MediaRecorder error:', error);
      });
      
      // Save recorder
      mediaRecorderRef.current = recorder;
      
      // Start recording with a timeslice to get data during recording (every 500ms)
      console.log('[Audio Hook] Starting recorder with 500ms timeslice');
      recorder.start(500);
      setIsRecording(true);
      console.log('[Audio Hook] Recording started with 500ms timeslice');
      
      // Request a frame to make sure recording starts
      requestAnimationFrame(() => {
        console.log('[Audio Hook] Animation frame callback - recorder state:', recorder.state);
      });
    } catch (error) {
      console.error('[Audio Hook] Error starting recording:', error);
      throw error;
    }
  }, [isRecordingSupported]);
  
  // Stop recording audio
  const stopRecording = useCallback(async (): Promise<Blob> => {
    console.log('[Audio Hook] Stopping audio recording');
    
    if (!mediaRecorderRef.current) {
      throw new Error('No recording in progress');
    }
    
    return new Promise((resolve, reject) => {
      // Add stop event listener
      mediaRecorderRef.current!.addEventListener('stop', () => {
        try {
          console.log('[Audio Hook] MediaRecorder stopped, chunks collected:', 
            audioChunksRef.current.length,
            'chunks with data:',
            audioChunksRef.current.map(chunk => chunk.size)
          );
          
          if (audioChunksRef.current.length === 0) {
            console.error('[Audio Hook] No audio chunks collected');
            reject(new Error('No audio data recorded. Please try again.'));
            return;
          }
          
          const totalSize = audioChunksRef.current.reduce((size, chunk) => size + chunk.size, 0);
          console.log('[Audio Hook] Total size of chunks:', totalSize);
          
          // Create blob from audio chunks
          const mimeType = mediaRecorderRef.current!.mimeType || 'audio/webm';
          console.log('[Audio Hook] Creating blob with MIME type:', mimeType);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log('[Audio Hook] Created audio blob:', {
            size: audioBlob.size,
            type: audioBlob.type
          });
          
          // Stop all tracks in the stream
          mediaRecorderRef.current!.stream.getTracks().forEach(track => {
            track.stop();
            console.log('[Audio Hook] Stopped track:', track.label);
          });
          
          // Reset mediaRecorder
          mediaRecorderRef.current = null;
          setIsRecording(false);
          
          if (audioBlob.size === 0) {
            console.error('[Audio Hook] Audio blob is empty after creation');
            
            // Try to manually collect blobs before giving up
            if (totalSize > 0) {
              console.log('[Audio Hook] Trying to create blob manually with chunks:', 
                audioChunksRef.current.length
              );
              
              // Manually create a blob
              const backupBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              console.log('[Audio Hook] Manual blob created with size:', backupBlob.size);
              
              if (backupBlob.size > 0) {
                console.log('[Audio Hook] Using manual blob instead');
                resolve(backupBlob);
                return;
              }
            }
            
            reject(new Error('Recorded audio is empty. Please try again.'));
            return;
          }
          
          console.log('[Audio Hook] Recording stopped, blob size:', audioBlob.size);
          resolve(audioBlob);
        } catch (error) {
          console.error('[Audio Hook] Error in stop event:', error);
          reject(error);
        }
      });
      
      // Force a final dataavailable event before stopping
      try {
        if (mediaRecorderRef.current!.state === 'recording') {
          console.log('[Audio Hook] Requesting final data from recorder');
          mediaRecorderRef.current!.requestData();
          
          // Small delay to allow the requestData to process
          setTimeout(() => {
            console.log('[Audio Hook] Stopping recorder after requestData');
            mediaRecorderRef.current!.stop();
          }, 100);
        } else {
          console.warn('[Audio Hook] Tried to stop recorder but state was:', mediaRecorderRef.current!.state);
          reject(new Error(`MediaRecorder was not in recording state (${mediaRecorderRef.current!.state})`));
        }
      } catch (error) {
        console.error('[Audio Hook] Error in stop recording:', error);
        reject(error);
      }
    });
  }, []);
  
  return { isRecording, startRecording, stopRecording, isRecordingSupported };
} 