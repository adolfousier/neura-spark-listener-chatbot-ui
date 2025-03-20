import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Settings, Provider, Template } from '@/types';
import { generateId, getDefaultSettings, getFirstMessage } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

type ChatContextType = {
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: Settings;
  isLoading: boolean;
  setSettings: (settings: Settings) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  createNewConversation: (initialMessage?: string) => string;
  selectConversation: (id: string) => void;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  clearConversations: () => void;
  updateTheme: (template: Template, darkMode: boolean) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    const savedSettings = localStorage.getItem('settings');
    
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        const formattedConversations = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          }))
        }));
        setConversations(formattedConversations);
        
        if (formattedConversations.length > 0) {
          setCurrentConversationId(formattedConversations[0].id);
        }
      } catch (error) {
        console.error('Error parsing saved conversations:', error);
        createNewConversation();
      }
    } else {
      createNewConversation();
    }
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        updateTheme(parsedSettings.template, parsedSettings.darkMode);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
        const defaults = getDefaultSettings();
        updateTheme(defaults.template, defaults.darkMode);
      }
    } else {
      const defaults = getDefaultSettings();
      updateTheme(defaults.template, defaults.darkMode);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const createNewConversation = useCallback((initialMessage?: string) => {
    const id = generateId();
    const now = new Date();
    const firstMessage = {
      id: generateId(),
      role: 'assistant' as const,
      content: getFirstMessage(initialMessage),
      createdAt: now
    };
    
    const newConversation: Conversation = {
      id,
      title: 'New Conversation',
      messages: [firstMessage],
      createdAt: now,
      updatedAt: now
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(id);
    return id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => {
    if (!currentConversationId) return;
    
    // Calculate token count directly when creating the message
    // Simple word-based tokenization
    const words = content
      .trim()
      .split(/\s+|[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/) 
      .filter(word => word.length > 0);
    
    const message: Message = {
      id: generateId(),
      role,
      content,
      createdAt: new Date(),
      tokenCount: words.length
    };
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === currentConversationId 
          ? {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date(),
              title: conv.title === 'New Conversation' && role === 'user' 
                ? content.slice(0, 30) + (content.length > 30 ? '...' : '') 
                : conv.title
            } 
          : conv
      )
    );
  }, [currentConversationId]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversationId === id) {
      if (conversations.length > 1) {
        const nextConv = conversations.find(conv => conv.id !== id);
        if (nextConv) {
          setCurrentConversationId(nextConv.id);
        } else {
          createNewConversation();
        }
      } else {
        createNewConversation();
      }
    }
    
    toast({
      title: "Conversation deleted",
      description: "The conversation has been removed",
    });
  }, [conversations, currentConversationId, createNewConversation, toast]);
  
  const clearConversations = useCallback(() => {
    setConversations([]);
    createNewConversation();
    
    toast({
      title: "All conversations cleared",
      description: "A new conversation has been created",
    });
  }, [createNewConversation, toast]);
  
  const updateTheme = useCallback((template: Template, darkMode: boolean) => {
    setSettings(prev => ({
      ...prev,
      template,
      darkMode
    }));
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    document.documentElement.classList.remove('template-minimal', 'template-vibrant', 'template-elegant');
    document.documentElement.classList.add(`template-${template}`);
    
    console.log(`Theme updated: template=${template}, darkMode=${darkMode}`);
    console.log('Current classes:', document.documentElement.className);
    
    requestAnimationFrame(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight;
      document.body.style.display = '';
    });
  }, []);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? {
              ...conv,
              title: newTitle,
              updatedAt: new Date()
            } 
          : conv
      )
    );
    
    toast({
      title: "Conversation renamed",
      description: "The conversation has been renamed",
    });
  }, [toast]);

  const value = {
    conversations,
    currentConversationId,
    settings,
    isLoading,
    setSettings,
    setConversations,
    createNewConversation,
    selectConversation,
    addMessage,
    deleteConversation,
    renameConversation,
    clearConversations,
    updateTheme,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
