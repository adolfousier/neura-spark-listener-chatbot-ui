import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Settings, Message, Conversation } from '../types'; // Assuming types are in ../types
import { sendChatRequest } from "@/services/apiService";
import { streamChatResponse } from "@/lib/utils"; // Assuming api utils are in ../utils/api
import { useToast } from '@/components/ui/use-toast'; // Assuming toast is used for notifications

// Define the shape of the ArenaContext
interface ArenaContextType {
  arenaConversations: Conversation[];
  setArenaConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  currentArenaConversationId: string | null;
  setCurrentArenaConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  arenaSettings: Settings[]; // Array of settings for multiple models
  setArenaSettings: React.Dispatch<React.SetStateAction<Settings[]>>;
  isArenaLoading: boolean[]; // Array for loading states of multiple models
  // Add other necessary states and functions for arena mode
  sendArenaMessage: (content: string, conversationId: string, settings: Settings[]) => Promise<void>;
  // Potentially functions to manage arena conversations, select models, etc.
}

// Create the ArenaContext with a default value
export const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

// Define the props for the ArenaProvider
interface ArenaProviderProps {
  children: ReactNode;
}

// Generate a unique ID for messages and conversations
const generateId = () => uuidv4();

// ArenaProvider component
export const ArenaProvider: React.FC<ArenaProviderProps> = ({ children }) => {
  const [arenaConversations, setArenaConversations] = useState<Conversation[]>([]);
  const [currentArenaConversationId, setCurrentArenaConversationId] = useState<string | null>(null);
  // Initialize with two default settings for arena mode, can be customized later
  const [arenaSettings, setArenaSettings] = useState<Settings[]>([]); 
  const [isArenaLoading, setIsArenaLoading] = useState<boolean[]>([false, false]);
  const { toast } = useToast();

  // Function to send messages in arena mode (handles concurrent requests)
  const sendArenaMessage = useCallback(async (content: string, conversationId: string, currentArenaSettings: Settings[]) => {
    if (!conversationId || currentArenaSettings.length === 0) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      createdAt: new Date(),
      tokenCount: content.split(' ').length, // Basic token count
    };

    // Add user message to the conversation
    setArenaConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, userMessage], updatedAt: new Date() }
          : conv
      )
    );

    // Set loading states for both models
    setIsArenaLoading([true, true]);

    // Prepare API requests for both models
    const requests = currentArenaSettings.map(settings => {
      const history = arenaConversations
        .find(conv => conv.id === conversationId)?.messages
        .slice(-settings.contextWindowSize) // Apply context window
        .map(msg => ({ role: msg.role, content: msg.content })) || [];
      
      return sendChatRequest(settings.provider, {
        model: settings.model,
        messages: [...history, { role: 'user', content }],
        temperature: settings.temperature,
        stream: settings.streamEnabled,
        web_search_enabled: settings.webSearchEnabled,
      });
    });

    try {
      // Execute requests concurrently
      const responses = await Promise.all(requests);

      // Process responses
      responses.forEach(async (response, index) => {
        const currentModelSettings = currentArenaSettings[index];
        let placeholderMessageId: string | null = null;

        if (!currentModelSettings.streamEnabled) {
          const placeholderMessage: Message = {
            id: generateId(),
            role: 'assistant',
            model: currentModelSettings.model, // Identify which model is responding
            content: `<div class="reasoning-placeholder">${currentModelSettings.model} is reasoning...</div>`,
            createdAt: new Date(),
            tokenCount: 0
          };
          placeholderMessageId = placeholderMessage.id;
          setArenaConversations(prev =>
            prev.map(conv =>
              conv.id === conversationId
                ? { ...conv, messages: [...conv.messages, placeholderMessage], updatedAt: new Date() }
                : conv
            )
          );
        }

        if (currentModelSettings.streamEnabled && response instanceof ReadableStream) {
          let responseContent = '';
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            model: currentModelSettings.model,
            content: '',
            createdAt: new Date(),
            tokenCount: 0
          };

          setArenaConversations(prev =>
            prev.map(conv =>
              conv.id === conversationId
                ? { ...conv, messages: [...conv.messages, assistantMessage], updatedAt: new Date() }
                : conv
            )
          );

          try {
            const stream = streamChatResponse(response);
            for await (const chunk of stream) {
              responseContent += chunk;
              const words = responseContent.trim().split(/\s+|[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/).filter(word => word.length > 0);
              setArenaConversations(prev =>
                prev.map(conv =>
                  conv.id === conversationId
                    ? {
                        ...conv,
                        messages: conv.messages.map(msg =>
                          msg.id === assistantMessage.id
                            ? { ...msg, content: responseContent, tokenCount: words.length }
                            : msg
                        ),
                        updatedAt: new Date()
                      }
                    : conv
                )
              );
            }
          } catch (error) {
            console.error('Streaming error for model:', currentModelSettings.model, error);
            // Handle individual stream error, maybe update the specific message
             setArenaConversations(prev =>
                prev.map(conv =>
                  conv.id === conversationId
                    ? {
                        ...conv,
                        messages: conv.messages.map(msg =>
                          msg.id === assistantMessage.id
                            ? { ...msg, content: `${msg.content}\n\nError during streaming for ${currentModelSettings.model}.` }
                            : msg
                        ),
                        updatedAt: new Date()
                      }
                    : conv
                )
              );
          }
        } else {
          const nonStreamResponse = response as any; // Adjust type as per actual API response structure
          const responseContent = nonStreamResponse.choices?.[0]?.message?.content || `No response from ${currentModelSettings.model}`;
          const tokenCount = responseContent.split(' ').length; // Basic token count

          setArenaConversations(prev =>
            prev.map(conv =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: placeholderMessageId
                      ? conv.messages.map(msg =>
                          msg.id === placeholderMessageId
                            ? { ...msg, content: responseContent, tokenCount, model: currentModelSettings.model }
                            : msg
                        )
                      : [...conv.messages, {
                          id: generateId(),
                          role: 'assistant',
                          model: currentModelSettings.model,
                          content: responseContent,
                          createdAt: new Date(),
                          tokenCount
                        }],
                    updatedAt: new Date()
                  }
                : conv
            )
          );
        }
        // Update loading state for this model
        setIsArenaLoading(prevLoading => {
          const newLoading = [...prevLoading];
          newLoading[index] = false;
          return newLoading;
        });
      });
    } catch (error) {
      console.error("Error sending arena message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send messages in arena mode",
        variant: "destructive",
      });
      // Add a general error message to the conversation for both models if Promise.all fails
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I encountered an error processing responses. Please try again.",
        createdAt: new Date(),
        tokenCount: 10
      };
      setArenaConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, errorMessage], updatedAt: new Date() }
            : conv
        )
      );
      setIsArenaLoading([false, false]); // Reset loading for both on global error
    }
  }, [arenaConversations, toast]);

  // Memoize the context value
  const contextValue = useMemo(() => ({
    arenaConversations,
    setArenaConversations,
    currentArenaConversationId,
    setCurrentArenaConversationId,
    arenaSettings,
    setArenaSettings,
    isArenaLoading,
    sendArenaMessage,
    // Add other functions and state setters here
    // e.g., createNewArenaConversation, selectArenaConversation
  }), [
    arenaConversations,
    setArenaConversations,
    currentArenaConversationId,
    setCurrentArenaConversationId,
    arenaSettings,
    setArenaSettings,
    arenaConversations,
    currentArenaConversationId,
    arenaSettings,
    isArenaLoading,
    sendArenaMessage
  ]);

  return <ArenaContext.Provider value={contextValue}>{children}</ArenaContext.Provider>;
};

// Custom hook to use the ArenaContext
export const useArena = (): ArenaContextType => {
  const context = useContext(ArenaContext);
  if (context === undefined) {
    throw new Error('useArena must be used within an ArenaProvider');
  }
  return context;
};