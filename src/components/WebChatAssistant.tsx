import { useState, useEffect } from 'react';
import { X, Settings, Globe, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/ChatContext';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { Logo } from './Logo';
import { ModeToggle } from './ModeToggle';
import { SettingsDialog } from './SettingsDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BOXED_CHAT_UI = import.meta.env.VITE_BOXED_CHATBUBBLE_MODE_ENABLED === 'true';

const WebChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { 
    conversations, 
    currentConversationId, 
    createNewConversation, 
    selectConversation,
    settings,
    toggleWebSearch,
    toggleAudioResponse
  } = useChat();

  useEffect(() => {
    setIsMounted(true);
    if (BOXED_CHAT_UI && !currentConversationId && conversations.length === 0) {
      createNewConversation();
    } else if (BOXED_CHAT_UI && !currentConversationId && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [BOXED_CHAT_UI, currentConversationId, conversations, createNewConversation, selectConversation]);

  if (!BOXED_CHAT_UI || !isMounted) {
    return null;
  }

  const toggleChat = () => setIsOpen(!isOpen);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  return (
    <>
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 rounded-full w-16 h-16 shadow-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 p-0 flex items-center justify-center border border-border"
          aria-label="Open chat"
        >
          <img src="/mingcute_chat.png" alt="Open Chat" className="w-10 h-10" />
        </Button>
      )}

      {isOpen && (
        <div className={cn(
          "fixed bottom-24 right-6 z-40 w-[500px] h-[750px] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}>
          <header className="flex items-center justify-between p-3 border-b bg-background">
            <div className="flex items-center space-x-2">
              <Logo />
              <h3 className="text-lg font-semibold">Neura Chat</h3>
            </div>
            <div className="flex items-center space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleWebSearch}
                      aria-label="Toggle web search"
                      className={cn("h-8 w-8", settings.webSearchEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Globe className={cn("h-4 w-4", settings.webSearchEnabled ? "animate-pulse-icon" : "")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{settings.webSearchEnabled ? "Disable web search" : "Enable web search"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleAudioResponse}
                      aria-label="Toggle audio responses"
                      className={cn("h-8 w-8", settings.audioResponseEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                    >
                      {settings.audioResponseEnabled ? (
                        <Volume2 className={cn("h-4 w-4", "animate-pulse-icon")} />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{settings.audioResponseEnabled ? "Disable automatic audio playback" : "Enable automatic audio playback"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ModeToggle />
              <SettingsDialog /> 
              <Button variant="ghost" size="icon" onClick={toggleChat} aria-label="Close chat" className="h-8 w-8">
                <X size={20} />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {currentConversation ? (
              <MessageList conversation={currentConversation} />
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Loading chat...
              </div>
            )}
          </div>
          {currentConversation && <MessageInput />}
          <footer className="py-3 px-4 text-center text-xs text-muted-foreground border-t bg-background">
            <div>
              <a 
                href="https://meetneura.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Powered by Neura AI
              </a>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default WebChatAssistant;