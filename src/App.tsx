
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChatProvider } from "@/context/ChatContext";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import TemplatesPage from "./pages/TemplatesPage";
import NotFound from "./pages/NotFound";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
