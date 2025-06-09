
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatProvider } from "@/context/ChatContext";
import { ArenaProvider } from "@/context/ArenaContext";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import TemplatesPage from "./pages/TemplatesPage";
import NotFound from "./pages/NotFound";
import WebChatAssistant from "./components/WebChatAssistant"; // Added import
import { useEffect } from "react";

// Create new query client instance
const queryClient = new QueryClient();

// This is a small component to ensure theme is applied on initial load
function ThemeInitializer() {
  useEffect(() => {
    // Get saved settings from localStorage
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        const { darkMode, template } = JSON.parse(savedSettings);
        
        // Apply dark mode
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Apply template
        document.documentElement.classList.remove('template-minimal', 'template-vibrant', 'template-elegant');
        document.documentElement.classList.add(`template-${template}`);
        
        console.log('Theme initialized:', { template, darkMode });
        
        // Force a reflow to ensure styles are applied
        document.body.style.display = 'none';
        document.body.offsetHeight;
        document.body.style.display = '';
      } catch (error) {
        console.error('Error initializing theme:', error);
      }
    }
  }, []);
  
  return null;
}

const App = () => {
  const isBoxedChatUI = import.meta.env.VITE_BOXED_CHATBUBBLE_MODE_ENABLED === 'true';

  if (isBoxedChatUI) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ArenaProvider>
            <ChatProvider>
              <ThemeInitializer />
              <Toaster />
              <Sonner />
              {/* Boxed UI doesn't need BrowserRouter or Routes, just the assistant */}
              <WebChatAssistant />
            </ChatProvider>
          </ArenaProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Default full app rendering
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ArenaProvider>
        <ChatProvider>
          <ThemeInitializer />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/chat/:conversationId?" element={<ChatPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </ArenaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
}

export default App;
