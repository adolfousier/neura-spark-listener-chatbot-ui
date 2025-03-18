
import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/context/ChatContext";
import { sendChatRequest, streamChatResponse } from "@/services/apiService";
import { useToast } from "@/hooks/use-toast";
import { SendHorizontal } from "lucide-react";
import { ChatResponse } from "@/types";
import { generateId } from "@/lib/utils";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);
  const { addMessage, settings, conversations, currentConversationId, setConversations } = useChat();
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
      const messages = [
        ...(currentConversation?.messages.map(m => ({
          role: m.role,
          content: m.content
        })) || []),
        { role: "user", content: message }
      ];
      
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
          createdAt: new Date()
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
        
        // Stream the response and update the message
        const stream = streamChatResponse(response);
        
        for await (const chunk of stream) {
          responseContent += chunk;
          
          // Update the message with the current content
          setConversations(prev => 
            prev.map(conv => 
              conv.id === currentConversationId 
                ? {
                    ...conv,
                    messages: conv.messages.map(msg => 
                      msg.id === assistantMessage.id
                        ? { ...msg, content: responseContent }
                        : msg
                    ),
                    updatedAt: new Date()
                  } 
                : conv
            )
          );
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
          placeholder={isReasoning ? "AI is reasoning..." : "Type your message..."}
          className="pr-14 min-h-[60px] max-h-[200px] resize-none"
          disabled={isSubmitting || isReasoning}
        />
        {isReasoning ? (
          <div className="absolute right-2 flex items-center justify-center">
            <div className="h-8 w-8 flex items-center justify-center">
              <div className="animate-pulse h-4 w-4 bg-primary rounded-full"></div>
            </div>
          </div>
        ) : (
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2" 
            disabled={isSubmitting || isReasoning || !message.trim()}
          >
            <SendHorizontal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-center opacity-75">
        AI powered by {settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)} • Model: {settings.model}
      </div>
    </form>
  );
}
