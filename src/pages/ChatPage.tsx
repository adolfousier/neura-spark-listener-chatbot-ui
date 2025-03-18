
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "@/context/ChatContext";
import { Header } from "@/components/Header";
import { SidebarConversations } from "@/components/SidebarConversations";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { conversations, currentConversationId } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // For mobile, sidebar is closed by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
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

  // Find the current conversation
  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  // Handle case when no conversations exist (should not happen but just in case)
  if (!currentConversation) {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-lg mb-4">No conversation found</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
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
          
          <div className="flex-1 overflow-hidden">
            <MessageList conversation={currentConversation} />
          </div>
          
          <MessageInput />
          
          {/* Footer */}
          <footer className="py-2 px-4 text-center text-sm text-muted-foreground border-t">
            <a 
              href="https://meetneura.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Powered by Neura AI
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
