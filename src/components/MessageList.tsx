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
  const { isStreaming, sendMessage } = useChat();
  const [showButton, setShowButton] = useState(false);
  const previousStreamingRef = useRef(isStreaming);
  const userScrolledRef = useRef(false);
  const { toast } = useToast();
  
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

  // Handle editing a message
  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    // Find the edited message index
    const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // Get the message that was edited
    const editedMessage = conversation.messages[messageIndex];
    
    // Make sure it's a user message
    if (editedMessage.role !== "user") {
      toast({
        title: "Cannot edit assistant messages",
        description: "Only your messages can be edited.",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate the context window - last 5 message pairs before the edited message
    const contextStartIndex = Math.max(0, messageIndex - 10); // 5 pairs = 10 messages
    const contextEndIndex = messageIndex;
    
    // Get the context messages
    const contextMessages = conversation.messages.slice(contextStartIndex, contextEndIndex);
    
    // Create a new message list with the context + edited message
    const newMessageList = [
      ...contextMessages,
      { ...editedMessage, content: newContent }
    ];

    // Send the edited message to regenerate the response
    sendMessage(newContent, newMessageList, messageIndex);
    
    toast({
      title: "Message edited",
      description: "Regenerating response based on your edit...",
    });
  }, [conversation.messages, sendMessage, toast]);

  return (
    <div className="relative h-full" ref={scrollAreaRef}>
      <ScrollArea className={cn("h-full custom-scrollbar", className)}>
        <div className="flex flex-col p-4 pb-24">
          {conversation.messages.map((message) => (
            <Message 
              key={message.id} 
              message={message} 
              onEditMessage={handleEditMessage}
            />
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
  onEditMessage?: (messageId: string, newContent: string) => void;
}

function Message({ message, onEditMessage }: MessageProps) {
  const isUser = message.role === "user";
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Use the tokenCount from the message object or calculate it if not available
  const tokenCount = message.tokenCount || countTokens(message.content);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied to clipboard",
      duration: 2000,
    });
  };

  // Handle starting edit mode
  const handleEdit = () => {
    setEditedContent(message.content);
    setIsEditing(true);
    // Focus the textarea after it's rendered
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(message.content.length, message.content.length);
      }
    }, 50);
  };

  // Handle saving the edit
  const handleSaveEdit = () => {
    if (onEditMessage && editedContent.trim() !== message.content.trim()) {
      onEditMessage(message.id, editedContent);
    }
    setIsEditing(false);
  };

  // Handle canceling the edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  // Handle keyboard shortcuts for saving/canceling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="relative w-full py-3">
      <div
        className={cn(
          "flex w-full items-start gap-4 group",
          isUser ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isUser && (
          <Avatar>
            <AvatarFallback>AI</AvatarFallback>
            <AvatarImage src="/assistant-avatar.png" />
          </Avatar>
        )}
        
        <div className="relative">
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg px-4 py-3 animate-fade-in overflow-hidden",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
              "w-full" // Fixed width for both user and assistant messages
            )}
          >
            {isEditing && isUser ? (
              <div className="w-full">
                <textarea
                  ref={textareaRef}
                  className="w-full min-h-[100px] p-2 text-sm bg-background text-foreground border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Edit your message..."
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveEdit}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm overflow-hidden">
                <MarkdownRenderer content={message.content} />
              </div>
            )}
            
            <div className="text-xs opacity-50 mt-1 flex items-center gap-2">
              <span>{formatDate(message.createdAt)}</span>
              <span>•</span>
              <span>{tokenCount} tokens</span>
            </div>
          </div>
          
          {isHovered && !isEditing && (
            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm p-0.5 rounded-md flex gap-1 shadow-md z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-md"
                onClick={copyToClipboard}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              
              {isUser && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-md"
                  onClick={handleEdit}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {isUser && (
          <Avatar>
            <AvatarFallback>You</AvatarFallback>
            <AvatarImage src="/user-avatar.png" />
          </Avatar>
        )}
      </div>
    </div>
  );
}
