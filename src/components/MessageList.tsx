
import { useEffect, useRef, useState } from "react";
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


interface MessageListProps {
  conversation: Conversation;
  className?: string;
}

export function MessageList({ conversation, className }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming } = useChat();
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Track if user has manually scrolled up during streaming
  useEffect(() => {
    const handleScroll = () => {
      if (scrollAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
        // If user scrolled up more than 100px from bottom, disable auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setAutoScroll(isNearBottom);
      }
    };
    
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    // Only auto-scroll if enabled or if not currently streaming
    if (autoScroll || !isStreaming) {
      scrollToBottom();
    }
  }, [conversation.messages, autoScroll, isStreaming]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  // Function to manually scroll to bottom (can be triggered by a button if needed)
  const handleScrollToBottom = () => {
    setAutoScroll(true);
    scrollToBottom();
  };

  return (
    <div className="relative h-full">
      <ScrollArea className={cn("h-full", className)} ref={scrollAreaRef}>
        <div className="flex flex-col p-4 pb-8">
          {conversation.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Scroll to bottom button - only shown when streaming and user has scrolled up */}
      {isStreaming && !autoScroll && (
        <Button
          className="absolute bottom-4 right-4 rounded-full shadow-md"
          size="icon"
          onClick={handleScrollToBottom}
          title="Scroll to latest message"
        >
          <ArrowDown className="h-4 w-4" />
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
