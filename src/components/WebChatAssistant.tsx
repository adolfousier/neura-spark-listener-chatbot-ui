import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/ChatContext';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { Header } from '@/components/Header'; // Added Header import

const BOXED_CHAT_UI = import.meta.env.VITE_BOXED_CHAT_UI === 'true';

const WebChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { 
    conversations, 
    currentConversationId, 
    createNewConversation, 
    selectConversation 
  } = useChat();

  useEffect(() => {
    setIsMounted(true);
    // Ensure a conversation is selected or created
    if (BOXED_CHAT_UI && !currentConversationId && conversations.length === 0) {
      createNewConversation();
    } else if (BOXED_CHAT_UI && !currentConversationId && conversations.length > 0) {
      // If no current ID but conversations exist, select the first one for the boxed UI
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
      {/* Chat Bubble Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 rounded-full w-16 h-16 shadow-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 p-0 flex items-center justify-center border border-border"
          aria-label="Open chat"
        >
          <img src="/mingcute_chat.png" alt="Open Chat" className="w-10 h-10" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed bottom-24 right-6 z-40 w-[500px] h-[750px] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}>
          {/* Use the existing Header component, but we need a way to pass the close button or handle it differently */}
          {/* For now, let's use a simplified header within WebChatAssistant and keep the original Header for the main app. */}
          {/* OR, we can adapt the main Header to be more flexible. */}
          {/* Let's try a simplified inline header first for the boxed chat */}
          <div className="flex items-center justify-between p-3 border-b bg-background">
            {/* Minimalist Header for boxed view - can be expanded or use a prop-based Header component later */}
            <div className="flex items-center space-x-2">
              <img src="/title-avatar.png" alt="Neura Spark" className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Neura Chat</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleChat} aria-label="Close chat">
              <X size={20} />
            </Button>
          </div>

          {/* Chat Content - This will likely need a more refined version of ChatPage or its components */}
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
          {/* Footer for the chat window */}
          <footer className="py-2 px-4 text-center text-xs text-muted-foreground border-t bg-background">
            <a 
              href="https://meetneura.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Powered by Neura AI
            </a>
          </footer>
        </div>
      )}
    </>
  );
};


export default WebChatAssistant;