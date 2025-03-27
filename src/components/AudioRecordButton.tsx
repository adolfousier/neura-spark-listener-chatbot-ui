import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/context/ChatContext';
import { blobToArrayBuffer, convertSpeechToText, convertAndUploadTextToSpeech, playAudio } from '@/services/audioService';
import { cn } from '@/lib/utils';
import { useRecordAudio } from '@/hooks/use-record-audio';

type AudioRecordButtonProps = {
  className?: string;
};

export function AudioRecordButton({ className }: AudioRecordButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage, setIsInputDisabled } = useChat();
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioPreviewUrlRef = useRef<string | null>(null);
  
  // Use our custom recording hook
  const { isRecording, startRecording, stopRecording, isRecordingSupported } = useRecordAudio();

  // Clean up audio preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioPreviewUrlRef.current) {
        URL.revokeObjectURL(audioPreviewUrlRef.current);
      }
    };
  }, []);
  
  // Create a preview audio element for the recording
  const createAudioPreview = (audioBlob: Blob): string => {
    // Revoke previous URL if exists
    if (audioPreviewUrlRef.current) {
      URL.revokeObjectURL(audioPreviewUrlRef.current);
    }
    
    // Create new URL for blob
    const url = URL.createObjectURL(audioBlob);
    audioPreviewUrlRef.current = url;
    
    console.log('[Record Debug] Created audio preview URL:', url);
    return url;
  };
  
  const handleRecordToggle = async () => {
    if (!isRecordingSupported()) {
      console.warn('[Record Debug] Recording not supported by browser');
      toast({
        title: 'Recording not supported',
        description: 'Your browser does not support audio recording.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isRecording) {
        console.log('[Record Debug] Stopping recording');
        // Stop recording
        setIsProcessing(true);
        setIsInputDisabled(true); // Disable all input during processing
        
        // Get recorded audio
        const audioBlob = await stopRecording();
        console.log('[Record Debug] Audio blob received', {
          size: audioBlob.size,
          type: audioBlob.type
        });
        
        // Verify we received valid audio data
        if (audioBlob.size === 0) {
          console.error('[Record Debug] Received empty audio blob');
          toast({
            title: 'Recording failed',
            description: 'No audio was captured. Please check your microphone and try again.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          setIsInputDisabled(false);
          return;
        }
        
        // Create audio preview
        const previewUrl = createAudioPreview(audioBlob);
        
        // Play the audio preview
        if (audioPreviewRef.current) {
          console.log('[Record Debug] Playing audio preview');
          audioPreviewRef.current.src = previewUrl;
          audioPreviewRef.current.play().catch(err => {
            console.error('[Record Debug] Error playing audio preview:', err);
          });
        } else {
          console.warn('[Record Debug] Audio preview element not available');
        }
        
        toast({
          title: 'Recording complete',
          description: 'Processing your voice message...',
        });
        
        // Convert to ArrayBuffer for processing
        const audioData = await blobToArrayBuffer(audioBlob);
        console.log('[Record Debug] Converted to ArrayBuffer', {
          byteLength: audioData.byteLength
        });
        
        // Create File object from the Blob for STT
        const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
        console.log('[Record Debug] Created File object', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size
        });
        
        toast({
          title: 'Processing voice message',
          description: 'Converting speech to text...',
        });
        
        // Step 1: Convert speech to text
        console.log('[Record Debug] Starting STT conversion');
        const text = await convertSpeechToText(audioFile);
        console.log('[Record Debug] STT conversion complete', {
          textLength: text.length,
          textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });
        
        if (!text.trim()) {
          console.warn('[Record Debug] Empty transcription received');
          toast({
            title: 'Empty recording',
            description: 'No speech detected in recording.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          setIsInputDisabled(false);
          return;
        }
        
        // Step 2: Send the text message to the API
        console.log('[Record Debug] Sending transcribed text as message');
        try {
          // Perform a direct call to the API service to get the response
          // We need to use await here to get the actual API response
          const response = await sendMessage(text, undefined, undefined, true); // Use the returnResponse parameter
          
          if (!response || !('content' in response)) {
            console.warn('[Record Debug] Empty response from API');
            toast({
              title: 'Empty response',
              description: 'No response content received from API.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            setIsInputDisabled(false);
            return;
          }
          
          const apiResponseText = response.content;
          console.log('[Record Debug] Received API response:', {
            textLength: apiResponseText.length,
            textPreview: apiResponseText.substring(0, 50) + (apiResponseText.length > 50 ? '...' : '')
          });

          toast({
            title: 'Message sent',
            description: `Processing response...`,
          });
          
          // Step 3: Try to convert the API response to speech, but continue even if it fails
          try {
            console.log('[Record Debug] Converting API response to speech');
            toast({
              title: 'Converting to speech',
              description: 'Generating audio response...',
            });
            
            const { audioData: ttsAudioData, audioUrl } = await convertAndUploadTextToSpeech(apiResponseText);
            
            // Play the TTS audio
            console.log('[Record Debug] Playing TTS audio response');
            await playAudio(ttsAudioData);
            
            toast({
              title: 'Voice processing complete',
              description: `Response audio ready`,
            });
          } catch (ttsError) {
            console.error('[Record Debug] Error converting text to speech:', ttsError);
            // Continue without TTS since we already have the text message
            toast({
              title: 'Voice message processed',
              description: 'Could not generate audio response, but message was sent successfully.',
            });
          }
        } catch (apiError) {
          console.error('[Record Debug] Error sending message to API:', apiError);
          toast({
            title: 'API Error',
            description: apiError instanceof Error ? apiError.message : 'Error getting API response',
            variant: 'destructive',
          });
        }
      } else {
        console.log('[Record Debug] Starting recording');
        // Start recording
        await startRecording();
        
        toast({
          title: 'Recording started',
          description: 'Speak now. Click again to stop recording.',
        });
      }
    } catch (error) {
      console.error('[Record Debug] Error with recording:', error);
      toast({
        title: 'Recording error',
        description: error instanceof Error ? error.message : 'An error occurred with voice recording',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsInputDisabled(false); // Re-enable input when done
    }
  };

  // If not supported, don't render the button
  if (!isRecordingSupported()) return null;

  return (
    <>
      {/* Hidden audio element for preview */}
      <audio ref={audioPreviewRef} style={{ display: 'none' }} />
      
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn("h-9 w-9 shrink-0", className)}
        onClick={handleRecordToggle}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-mic h-5 w-5", isRecording && "text-red-500 animate-pulse")}
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
        )}
      </Button>
    </>
  );
} 