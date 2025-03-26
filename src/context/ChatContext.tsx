import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Settings, Provider, Template, ChatResponse, ChatRequest } from '@/types';
import { generateId, getDefaultSettings, getFirstMessage } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { sendChatRequest, streamChatResponse } from "@/services/apiService";

type ChatContextType = {
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: Settings;
  isLoading: boolean;
  isStreaming: boolean;
  streamController: AbortController | null;
  setSettings: (settings: Settings) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  createNewConversation: (initialMessage?: string) => string;
  selectConversation: (id: string) => void;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  clearConversations: () => void;
  updateTheme: (template: Template, darkMode: boolean) => void;
  startStreaming: () => AbortController;
  stopStreaming: () => void;
  sendMessage: (content: string, contextMessages?: Message[], editedMessageIndex?: number) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamController, setStreamController] = useState<AbortController | null>(null);
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

  // Function to start streaming and return an AbortController for cancellation
  const startStreaming = useCallback(() => {
    const controller = new AbortController();
    setStreamController(controller);
    setIsStreaming(true);
    return controller;
  }, []);

  // Function to stop streaming
  const stopStreaming = useCallback(() => {
    if (streamController) {
      streamController.abort();
      setStreamController(null);
    }
    setIsStreaming(false);
  }, [streamController]);

  const sendMessage = useCallback(async (content: string, contextMessages?: Message[], editedMessageIndex?: number) => {
    if (!content.trim() || !currentConversationId) return;
    
    // Find current conversation
    const conversation = conversations.find(conv => conv.id === currentConversationId);
    if (!conversation) return;
    
    setIsLoading(true);
    
    try {
      // If we're editing a message, we need to slice the conversation
      // and replace messages after the edited message
      if (editedMessageIndex !== undefined && contextMessages) {
        // Get the original conversation messages up to the edited message
        const originalMessages = conversation.messages.slice(0, editedMessageIndex);
        
        // Get the user message that was edited
        const editedUserMessage = contextMessages[contextMessages.length - 1];
        
        // Create a new user message in place of the old one
        const newUserMessage: Message = {
          ...editedUserMessage,
          content: content
        };
        
        // Update the conversation with the new messages up to the edited message
        // plus the edited message itself
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [...originalMessages, newUserMessage],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
      } else {
        // Not editing, just add the new user message
        const userMessage: Message = {
          id: generateId(),
          role: 'user',
          content: content,
          createdAt: new Date(),
          tokenCount: content.split(/\s+/).length
        };
        
        // Add the user message to the conversation
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [...conv.messages, userMessage],
                  updatedAt: new Date(),
                  title: conv.title === 'New Conversation' 
                    ? content.slice(0, 30) + (content.length > 30 ? '...' : '') 
                    : conv.title
                } 
              : conv
          )
        );
      }
      
      // Prepare messages array for API request
      const messages = [];
      
      // Add system prompt if it exists
      if (settings.systemPrompt && settings.systemPrompt.trim() !== '') {
        messages.push({ role: "system", content: settings.systemPrompt });
      }
      
      // If we're editing and have context messages, use those
      // Otherwise use the full conversation history
      if (editedMessageIndex !== undefined && contextMessages) {
        // Add context messages
        messages.push(
          ...contextMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        );
      } else {
        // Add regular conversation history
        const updatedConversation = conversations.find(conv => conv.id === currentConversationId);
        if (updatedConversation) {
          // Limit the conversation history based on the context window setting
          const allMessages = updatedConversation.messages;
          let messagesToInclude = allMessages;
          
          // If we have more messages than the context window, limit it
          if (allMessages.length > settings.contextWindowSize * 2) {
            // Include the last N message pairs (user+assistant)
            const startIndex = Math.max(0, allMessages.length - (settings.contextWindowSize * 2));
            messagesToInclude = allMessages.slice(startIndex);
          }
          
          messages.push(
            ...messagesToInclude.map(m => ({
              role: m.role,
              content: m.content
            }))
          );
        }
      }
      
      // Create the chat request
      const chatRequest = {
        messages,
        model: settings.model,
        temperature: settings.temperature,
        stream: settings.streamEnabled
      };
      
      // Send request to API
      const response = await sendChatRequest(settings.provider, chatRequest);
      
      if (settings.streamEnabled && response instanceof ReadableStream) {
        // Handle streaming response
        let responseContent = '';
        
        // Create a new assistant message
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          tokenCount: 0
        };
        
        // Add the empty message that will be updated with streaming content
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [...conv.messages, assistantMessage],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
        
        // Start streaming and get the controller for cancellation
        const controller = startStreaming();
        
        try {
          // Stream the response and update the message
          const stream = streamChatResponse(response);
          
          for await (const chunk of stream) {
            // Check if streaming was cancelled
            if (controller.signal.aborted) {
              break;
            }
            
            responseContent += chunk;
            
            // Calculate token count
            const tokenCount = responseContent.split(/\s+/).length;
            
            // Update the message with the current content
            setConversations(prev => 
              prev.map(conv => 
                conv.id === currentConversationId 
                  ? {
                      ...conv,
                      messages: conv.messages.map(msg => 
                        msg.id === assistantMessage.id
                          ? { 
                              ...msg, 
                              content: responseContent,
                              tokenCount
                            }
                          : msg
                      ),
                      updatedAt: new Date()
                    } 
                  : conv
              )
            );
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            throw error;
          }
          // If it's an AbortError, we just stop the streaming gracefully
          console.log('Streaming was cancelled by user');
        }
      } else {
        // Handle non-streaming response
        const nonStreamResponse = response as ChatResponse;
        const responseContent = nonStreamResponse.choices[0]?.message?.content || "No response from AI";
        
        // Add the complete response as a new message
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          createdAt: new Date(),
          tokenCount: responseContent.split(/\s+/).length
        };
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: [...conv.messages, assistantMessage],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      
      // Add an error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
        tokenCount: 10
      };
      
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversationId 
            ? {
                ...conv,
                messages: [...conv.messages, errorMessage],
                updatedAt: new Date()
              } 
            : conv
        )
      );
    } finally {
      setIsLoading(false);
      stopStreaming(); // Ensure streaming state is reset
    }
  }, [conversations, currentConversationId, generateId, setConversations, settings, startStreaming, stopStreaming, toast]);

  const value = {
    conversations,
    currentConversationId,
    settings,
    isLoading,
    isStreaming,
    streamController,
    setSettings,
    setConversations,
    createNewConversation,
    selectConversation,
    addMessage,
    deleteConversation,
    renameConversation,
    clearConversations,
    updateTheme,
    startStreaming,
    stopStreaming,
    sendMessage,
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
