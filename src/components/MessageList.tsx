import { useEffect, useRef, useState, useCallback } from "react";
import { Conversation, Message as MessageType } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, ArrowDown } from "lucide-react";
import { countTokens } from "@/lib/tokenizer";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/hooks/use-theme";

interface MessageListProps {
  conversation: Conversation;
  className?: string;
}

export function MessageList({ conversation, className }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming } = useChat();
  const [showButton, setShowButton] = useState(false);
  const previousStreamingRef = useRef(isStreaming);
  const userScrolledRef = useRef(false);
  
  // Get theme styles
  const { template } = useTheme();
  
  const getButtonStyle = () => {
    switch (template) {
      case 'vibrant':
        return 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white';
      case 'elegant':
        return 'bg-[#0891B2] hover:bg-[#0E7490] text-white';
      case 'minimal':
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };
  
  // Simple scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowButton(false);
    userScrolledRef.current = false;
  }, []);
  
  // Only scroll to bottom when a new message is added (not during streaming)
  useEffect(() => {
    if (!isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.messages.length, isStreaming]);

  // Add global scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollAreaRef.current) return;
      
      // We're targeting the parent element which contains the shadcn ScrollArea
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (!viewport) return;
      
      const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Consider the user has scrolled up if they're more than 100px from bottom
      userScrolledRef.current = distanceFromBottom > 100;
      
      // Show button only when scrolled up (more than 100px from bottom)
      setShowButton(distanceFromBottom > 100);
    };
    
    // Find the element and attach listener
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Detect when streaming ends and scroll to bottom if user hasn't scrolled up
  useEffect(() => {
    // Check if streaming just ended
    if (previousStreamingRef.current && !isStreaming) {
      // If user hasn't manually scrolled up
      if (!userScrolledRef.current) {
        // Slight delay to ensure content is fully rendered
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
    
    // Update ref for next check
    previousStreamingRef.current = isStreaming;
  }, [isStreaming]);

  return (
    <div className="relative h-full" ref={scrollAreaRef}>
      <ScrollArea className={cn("h-full custom-scrollbar", className)}>
        <div className="flex flex-col p-4 pb-24">
          {conversation.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </ScrollArea>
      
      {showButton && (
        <Button
          className={cn(
            "absolute bottom-16 right-4 rounded-md shadow-lg",
            getButtonStyle(),
            "w-10 h-10"
          )}
          size="icon"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

interface MessageProps {
  message: MessageType;
}

function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  
  // Use the tokenCount from the message object or calculate it if not available
// In the Message component, update the tokenCount calculation:
const tokenCount = message.tokenCount || countTokens(message.content);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 py-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar>
          <AvatarFallback>AI</AvatarFallback>
          <AvatarImage src="/assistant-avatar.png" />
        </Avatar>
      )}
      
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3 animate-fade-in relative group overflow-hidden",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="text-sm overflow-hidden">
          <MarkdownRenderer content={message.content} />
        </div>
        <div className="text-xs opacity-50 mt-1 flex items-center gap-2">
          <span>{formatDate(message.createdAt)}</span>
          <span>•</span>
          <span>{tokenCount} tokens</span>
        </div>
        
        {isHovered && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute bottom-1 right-1 opacity-70 hover:opacity-100 h-8 w-8 shadow-sm rounded-xl"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {isUser && (
        <Avatar>
          <AvatarFallback>You</AvatarFallback>
          <AvatarImage src="/user-avatar.png" />
        </Avatar>
      )}
    </div>
  );
}
