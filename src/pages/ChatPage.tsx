import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChat } from "@/context/ChatContext";
import { Header } from "@/components/Header";
import { SidebarConversations } from "@/components/SidebarConversations";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelLeftClose, ArrowLeftRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Arena Mode Configuration
const CHAT_ARENA_ENABLED = import.meta.env.VITE_CHAT_ARENA_ENABLED === 'true';

export default function ChatPage() {
  const { conversations, currentConversationId, selectConversation, createNewConversation, settings } = useChat();
  const { conversationId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [arenaMode, setArenaMode] = useState(false);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // For mobile, sidebar is closed by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setArenaMode(false); // Disable arena mode on mobile
    }
  }, [isMobile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        mainContentRef.current &&
        mainContentRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile, sidebarOpen]);

  // Handle URL parameter changes (when user clicks sidebar or navigates directly)
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId && !arenaMode) {
      const conversationExists = conversations.find(c => c.id === conversationId);
      if (conversationExists) {
        selectConversation(conversationId);
      }
    }
  }, [conversationId, arenaMode]);

  // Handle context changes (when new conversation is created)
  useEffect(() => {
    if (currentConversationId && (!conversationId || currentConversationId !== conversationId) && !arenaMode) {
      navigate(`/chat/${currentConversationId}`, { replace: true });
    }
  }, [currentConversationId, arenaMode]);

  // Handle initial load - only create if we have no conversations and no URL param
  useEffect(() => {
    if (!conversationId && !currentConversationId && conversations.length === 0 && !arenaMode) {
      const timer = setTimeout(() => {
        createNewConversation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [conversations.length, arenaMode]);

  // Find the current conversation
  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  // Handle case when no conversation is selected or found (non-arena mode)
  if (!arenaMode && !currentConversation) {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-lg mb-4">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header arenaMode={arenaMode} /> {/* Pass arenaMode to Header */} 
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={cn(
            "bg-secondary/30 backdrop-blur-sm w-80 flex-shrink-0 border-r transition-all duration-300 ease-in-out overflow-hidden",
            isMobile && "absolute inset-y-0 left-0 z-20 h-[calc(100%-4rem)] mt-16",
            !sidebarOpen && (isMobile ? "-translate-x-full" : "w-0 opacity-0")
          )}
        >
          <div className={cn(
            "w-80 transition-all duration-300",
            !sidebarOpen && "opacity-0"
          )}>
            <div className="p-4 border-b">
              {CHAT_ARENA_ENABLED && !isMobile && (
                <Button
                  variant={arenaMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setArenaMode(!arenaMode)}
                  className="w-full mb-4"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {arenaMode ? "Exit Arena" : "Enter Chat Arena"}
                </Button>
              )}
            </div>
            
            <SidebarConversations />
          </div>
        </aside>

        {/* Main content */}
        <main 
          ref={mainContentRef}
          className="flex-1 flex flex-col overflow-hidden relative"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 left-4 -translate-y-1/2 z-10"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
            <span className="sr-only">
              {sidebarOpen ? "Close sidebar" : "Open sidebar"}
            </span>
          </Button>
          
          {!arenaMode ? (
            // Regular chat mode
            <>
              <div className="flex-1 overflow-hidden">
                <MessageList conversation={currentConversation!} />
              </div>
              <MessageInput arenaMode={arenaMode} /> {/* Pass arenaMode to MessageInput */}
            </>
          ) : (
            // Arena mode - split view
            <div className="flex-1 flex flex-col">
              {/* Split Chat Views */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Chat */}
                <div className="flex-1 flex flex-col border-r">
                  <div className="p-3 border-b bg-primary/5">
                    <span className="text-sm font-medium">Model A</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MessageList conversation={currentConversation!} />
                  </div>
                </div>
                
                {/* Right Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b bg-secondary/5">
                    <span className="text-sm font-medium">Model B</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MessageList conversation={currentConversation!} />
                  </div>
                </div>
              </div>
              
              {/* Arena Message Input */}
              <div className="border-t">
                <MessageInput arenaMode={arenaMode} /> {/* Pass arenaMode to MessageInput in arena mode */}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <footer className="py-2 px-4 text-center text-sm text-muted-foreground border-t">
            {arenaMode ? (
              <div className="flex flex-col items-center">
                <div className="flex justify-center items-center space-x-4">
                  <span>Model A: {settings.modelA || 'Not Selected'}</span>
                  <span>Model B: {settings.modelB || 'Not Selected'}</span>
                </div>
                <a 
                  href="https://meetneura.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors mt-1"
                >
                  Powered by Neura AI
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <a 
                  href="https://meetneura.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors mt-1"
                >
                  Powered by Neura AI
                </a>
              </div>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}