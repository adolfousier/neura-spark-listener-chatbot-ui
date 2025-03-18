
import { useEffect, useRef } from "react";
import { Conversation, Message as MessageType } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface MessageListProps {
  conversation: Conversation;
  className?: string;
}

export function MessageList({ conversation, className }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <ScrollArea className={cn("h-full", className)} ref={scrollAreaRef}>
      <div className="flex flex-col p-4 pb-8">
        {conversation.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

interface MessageProps {
  message: MessageType;
}

function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

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
          <AvatarImage src="" />
          <Bot className="h-5 w-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
        </Avatar>
      )}
      
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-2 rounded-lg px-4 py-3 animate-fade-in",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        <div className="text-sm break-words whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="text-xs opacity-50 mt-1">
          {formatDate(message.createdAt)}
        </div>
      </div>
      
      {isUser && (
        <Avatar>
          <AvatarFallback>You</AvatarFallback>
          <AvatarImage src="" />
          <User className="h-5 w-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
        </Avatar>
      )}
    </div>
  );
}
