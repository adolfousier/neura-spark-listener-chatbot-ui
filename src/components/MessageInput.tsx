import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/context/ChatContext";
import { sendChatRequest } from "@/services/apiService";
import { streamChatResponse } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SendHorizontal, Square } from "lucide-react";
import { ChatResponse } from "@/types";
import { generateId } from "@/lib/utils";
import { AudioRecordButton } from "@/components/AudioRecordButton";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const { 
    addMessage, 
    settings, 
    conversations, 
    currentConversationId, 
    setConversations,
    isStreaming,
    startStreaming,
    stopStreaming,
    isInputDisabled
  } = useChat();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting || !currentConversationId) return;
    
    // Add user message
    addMessage("user", message);
    
    // Prepare for API call
    setIsSubmitting(true);
    setIsReasoning(true);
    setMessage("");
    
    try {
      // Prepare messages array with system prompt if available
      const messages = [];
      
      // Add system prompt if it exists
      if (settings.systemPrompt && settings.systemPrompt.trim() !== '') {
        messages.push({ role: "system", content: settings.systemPrompt });
      }
      
      // Add conversation history
      messages.push(
        ...(currentConversation?.messages.map(m => ({
          role: m.role,
          content: m.content
        })) || [])
      );
      
      // Add current user message
      messages.push({ role: "user", content: message });

      
      const chatRequest = {
        messages,
        model: settings.model,
        temperature: settings.temperature,
        stream: settings.streamEnabled
      };
      
      // Send request with proper typing
      const response = await sendChatRequest(settings.provider, chatRequest);
      
      if (settings.streamEnabled && response instanceof ReadableStream) {
        // Handle streaming response
        let responseContent = '';
        
        // Create a new assistant message
        const assistantMessage = {
          id: generateId(),
          role: 'assistant' as const,
          content: '',
          createdAt: new Date(),
          tokenCount: 0 // Initialize token count
        };
        
        // Add the empty message that will be updated with streaming content
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [...conv.messages, assistantMessage],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
        
        // Start streaming and get the controller for cancellation
        const controller = startStreaming();
        
        try {
          // Stream the response and update the message
          const stream = streamChatResponse(response);
          
          for await (const chunk of stream) {
            // Check if streaming was cancelled
            if (controller.signal.aborted) {
              break;
            }
            
            responseContent += chunk;
            
            // Update the message with the current content and recalculate token count
            const words = responseContent
              .trim()
              .split(/\s+|[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/) 
              .filter(word => word.length > 0);
            
            setConversations(prev => 
              prev.map(conv => 
                conv.id === currentConversationId 
                  ? {
                      ...conv,
                      messages: conv.messages.map(msg => 
                        msg.id === assistantMessage.id
                          ? { 
                              ...msg, 
                              content: responseContent,
                              tokenCount: words.length 
                            }
                          : msg
                      ),
                      updatedAt: new Date()
                    } 
                  : conv
              )
            );
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            throw error;
          }
          // If it's an AbortError, we just stop the streaming gracefully
          console.log('Streaming was cancelled by user');
        }
      } else if (!settings.streamEnabled && !(response instanceof ReadableStream)) {
        // Handle non-streaming response
        const nonStreamResponse = response as ChatResponse;
        const responseContent = nonStreamResponse.choices[0]?.message?.content || "No response from AI";
        
        // Add the complete response as a new message
        addMessage("assistant", responseContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      
      // Add an error message
      addMessage("assistant", "Sorry, I encountered an error. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsReasoning(false);
      stopStreaming(); // Ensure streaming state is reset
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={isReasoning ? "AI is reasoning..." : isInputDisabled ? "Processing voice message..." : "Type your message..."}
          className="pr-14 min-h-[60px] max-h-[200px] resize-none"
          disabled={isSubmitting || isReasoning || isInputDisabled}
        />
        {isReasoning ? (
          <div className="absolute right-2 flex items-center justify-center">
            {isStreaming ? (
              <Button 
                type="button" 
                size="icon" 
                variant="destructive"
                className="h-8 w-8" 
                onClick={() => stopStreaming()}
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
                <span className="sr-only">Stop</span>
              </Button>
            ) : (
              <div className="h-8 w-8 flex items-center justify-center">
                <div className="animate-pulse h-4 w-4 bg-primary rounded-full"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute right-2 flex items-center space-x-2">
            <AudioRecordButton />
            <Button
              type="submit"
              size="icon"
              disabled={isSubmitting || isReasoning || !message.trim() || isInputDisabled}
            >
              <SendHorizontal className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-muted-foreground">
          {message.length > 0 ? `${message.length} characters` : ''}
        </div>
        <div className="text-xs text-muted-foreground opacity-75 text-center flex-grow mx-auto">
          AI powered by {settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)} • Model: {settings.model}
        </div>
        <div className="text-xs text-muted-foreground w-20"></div>
      </div>
    </form>
  );
}
