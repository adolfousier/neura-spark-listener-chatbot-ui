import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, Message, Settings, Provider, Template, ChatResponse, ChatRequest } from '@/types';
import { generateId, getDefaultSettings, getFirstMessage } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { sendChatRequest } from "@/services/apiService";
import { streamChatResponse } from "@/lib/utils";
import { convertTextToSpeech, playAudio, convertAndUploadTextToSpeech } from "@/services/audioService";
import { countTokens } from '@/lib/tokenizer';


type ChatContextType = {
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: Settings;
  isLoading: boolean;
  isStreaming: boolean;
  isInputDisabled: boolean;
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
  sendMessage: (content: string, contextMessages?: Message[], editedMessageIndex?: number, returnResponse?: boolean) => Promise<{ content: string } | void>;
  toggleWebSearch: () => void;
  toggleAudioResponse: () => void;
  setIsInputDisabled: (disabled: boolean) => void;
};

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  currentConversationId: null,
  settings: getDefaultSettings(),
  isLoading: false,
  isStreaming: false,
  isInputDisabled: false,
  streamController: null,
  setSettings: () => {},
  setConversations: () => {},
  createNewConversation: () => '',
  selectConversation: () => {},
  addMessage: () => {},
  deleteConversation: () => {},
  renameConversation: () => {},
  clearConversations: () => {},
  updateTheme: () => {},
  startStreaming: () => new AbortController(),
  stopStreaming: () => {},
  sendMessage: async () => {},
  toggleWebSearch: () => {},
  toggleAudioResponse: () => {},
  setIsInputDisabled: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
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

  /**
   * Send a message to the AI and handle the response
   * @param content Message content to send
   * @param contextMessages Optional context messages to use instead of conversation history
   * @param editedMessageIndex Optional index of message being edited
   * @param returnResponse Optional flag to return the response content instead of adding to conversation
   * @returns Promise that resolves when the message is sent and response received
   */
  const sendMessage = async (
    content: string, 
    contextMessages?: Message[],
    editedMessageIndex?: number,
    returnResponse?: boolean
  ): Promise<{ content: string } | void> => {
    if (!currentConversationId) {
      const id = createNewConversation();
      setCurrentConversationId(id);
    }
    
    setIsLoading(true);
    
    try {
      // If editing, update the state immediately to reflect the edit and remove subsequent messages
      if (editedMessageIndex !== undefined) {
        setConversations(prev =>
          prev.map(conv => {
            if (conv.id === currentConversationId) {
              // Get messages up to the edited one
              const messagesBeforeEdit = conv.messages.slice(0, editedMessageIndex);
              // Get the original message object to update
              const originalMessage = conv.messages[editedMessageIndex];
              // Create the updated message with new content
              const updatedMessage = {
                ...originalMessage,
                content: content, // Use the 'content' parameter passed to sendMessage
                createdAt: new Date() // Update timestamp
              };
              return {
                ...conv,
                // Combine messages before edit + the updated message
                messages: [...messagesBeforeEdit, updatedMessage],
                updatedAt: new Date(),
              };
            }
            return conv;
          })
        );
      } else {
         // If not editing, add the new user message normally
         addMessage("user", content);
      }
      
      // Prepare messages array with system prompt if available
      const messages = [];
      
      // Add system prompt if it exists
      if (settings.systemPrompt && settings.systemPrompt.trim() !== '') {
        messages.push({ role: "system", content: settings.systemPrompt });
      }
      
      // Get the current conversation state
      const currentConversation = conversations.find(conv => conv.id === currentConversationId);
      let messagesToSend: Message[] = [];

      if (currentConversation) {
        if (editedMessageIndex !== undefined) {
          // If editing, use messages up to the edited one (exclusive of the original edited message)
          messagesToSend = currentConversation.messages.slice(0, editedMessageIndex);
        } else {
          // If not editing, use the regular conversation history
          messagesToSend = currentConversation.messages;
        }

        // Limit the history based on context window size, excluding the system prompt if present
        const historyLimit = settings.contextWindowSize * 2;
        if (messagesToSend.length > historyLimit) {
          const startIndex = Math.max(0, messagesToSend.length - historyLimit);
          messagesToSend = messagesToSend.slice(startIndex);
        }
      }

      // Add the messages (excluding system prompt if it was added earlier)
      messages.push(
        ...messagesToSend
          .filter(m => m.role !== 'system') // Avoid duplicate system prompts
          .map(m => ({ role: m.role, content: m.content }))
      );

      // Always add the current user message (the edited content or new content)
      messages.push({ role: "user", content });
      
      // Create the chat request
      const chatRequest = {
        messages,
        model: settings.webSearchEnabled ? 
          (import.meta.env.VITE_GOOGLE_API_MODEL || 'gemini-2.5-pro-exp-03-25') : 
          settings.model,
        temperature: settings.temperature,
        stream: settings.streamEnabled
      };
      
      // For special case where we need to return the response directly
      if (returnResponse) {
        // Send request to API without streaming - direct response needed
        const provider = settings.webSearchEnabled ? 'google' : settings.provider;
        const response = await sendChatRequest(provider, { ...chatRequest, stream: false });
        
        if (response instanceof ReadableStream) {
          throw new Error("Streaming not supported when returnResponse is true");
        }
        
        const responseContent = response.choices[0]?.message?.content || "No response from AI";
        return { content: responseContent };
      }
      
      // State update for editing is now handled earlier, before preparing the API payload.

      // For any provider without streaming, add a placeholder loading message
      let placeholderMessageId = null;
      
      if (!settings.streamEnabled) {
        const placeholderMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `<div class="reasoning-placeholder">${settings.model} is reasoning...</div>`,
          createdAt: new Date(),
          tokenCount: 0
        };
        
        placeholderMessageId = placeholderMessage.id;
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  // Add placeholder AFTER potentially slicing for edit
                  messages: [...conv.messages, placeholderMessage],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
      }
      
      // Send request to API - use Google provider when web search is enabled
      const provider = settings.webSearchEnabled ? 'google' : settings.provider;
      const response = await sendChatRequest(provider, chatRequest);
      
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

            // Accumulate the chunk content
            responseContent += chunk;
            
            // Update the message with the current content and recalculate token count
            const words = responseContent
              .trim()
              .split(/\s+|[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/) 
              .filter(word => word.length > 0);
            
            setConversations(prev => 
              prev.map(conv => 
                conv.id === currentConversationId 
                  ? {
                      ...conv,
                      // Ensure we are updating the correct message
                      messages: conv.messages.map(msg => 
                        msg.id === assistantMessage.id
                          ? { 
                              ...msg, 
                              content: responseContent, // Use accumulated content
                              tokenCount: words.length 
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
        // Replace placeholder if it exists, otherwise add the new message
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? {
                  ...conv,
                  messages: placeholderMessageId
                    ? conv.messages.map(msg => 
                        msg.id === placeholderMessageId
                          ? { 
                              ...msg, 
                              content: responseContent, 
                              tokenCount: countTokens(responseContent) // Calculate token count
                            }
                          : msg
                      )
                    // If no placeholder (e.g., after edit), add the new assistant message
                    : [...conv.messages, {
                        id: generateId(),
                        role: 'assistant',
                        content: responseContent,
                        createdAt: new Date(),
                        tokenCount: countTokens(responseContent)
                      }],
                  updatedAt: new Date()
                } 
              : conv
          )
        );
        
        // If audio responses are enabled, convert the response to speech, upload to Azure and play it
        if (settings.audioResponseEnabled) {
          try {
            // Get clean text for TTS by removing markdown and HTML
            const cleanText = responseContent
              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/\*\*|\*|__|\|_|#/g, '') // Remove markdown formatting
              .replace(/!\[(.*?)\]\(.*?\)/g, 'Image: $1') // Replace image links
              .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace markdown links with just the text
              .replace(/\n\n+/g, '\n\n') // Condense multiple newlines
              .trim();
            
            // Limit to first 250 words to keep audio reasonably short
            const words = cleanText.split(/\s+/);
            const limitedText = words.slice(0, 250).join(' ') + 
              (words.length > 250 ? '... (continue reading for more)' : '');
            
            // Convert to speech, upload to Azure, and play
            const { audioUrl, audioData } = await convertAndUploadTextToSpeech(limitedText);
            
            // Update the message with the audio URL
            setConversations(prev => 
              prev.map(conv => 
                conv.id === currentConversationId 
                  ? {
                      ...conv,
                      messages: conv.messages.map(msg => 
                        msg.id === placeholderMessageId
                          ? { 
                              ...msg, 
                              audioUrl
                            }
                          : msg
                      ),
                      updatedAt: new Date()
                    } 
                  : conv
              )
            );
            
            // Play the audio immediately
            await playAudio(audioData);
          } catch (error) {
            console.error('Error processing audio response:', error);
            // Don't show error to user - just fall back to text silently
          }
        }
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
  };

  const toggleWebSearch = useCallback(() => {
    // Save previous settings when enabling web search
    const prevSettings = { ...settings };
    
    setSettings(prev => {
      const webSearchEnabled = !prev.webSearchEnabled;
      
      // Toggle between web search and regular mode
      return {
        ...prev,
        webSearchEnabled,
        // When enabling web search, switch to Google provider with Gemini model
        provider: webSearchEnabled ? 'google' : prev.provider,
        model: webSearchEnabled ? 
          (import.meta.env.VITE_GOOGLE_API_MODEL || 'gemini-2.5-pro-exp-03-25') : 
          prev.model
      };
    });
    
    toast({
      title: settings.webSearchEnabled ? "Web Search Disabled" : "Web Search Enabled",
      description: settings.webSearchEnabled ? 
        "Using standard AI model without search." : 
        "Using Gemini with real-time web search capabilities.",
    });
  }, [settings, toast]);

  // Function to toggle audio responses
  const toggleAudioResponse = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      audioResponseEnabled: !prev.audioResponseEnabled
    }));
    
    toast({
      title: settings.audioResponseEnabled ? "Audio Responses Disabled" : "Audio Responses Enabled",
      description: settings.audioResponseEnabled ? 
        "Assistant responses will be text only." : 
        "Assistant responses will include speech audio.",
    });
  }, [settings, toast]);

  const contextValue = useMemo(() => ({
    conversations,
    currentConversationId,
    settings,
    isLoading,
    isStreaming,
    isInputDisabled,
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
    toggleWebSearch,
    toggleAudioResponse,
    setIsInputDisabled,
  }), [
    conversations, 
    currentConversationId, 
    settings, 
    isLoading, 
    isStreaming,
    isInputDisabled,
    streamController,
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
    toggleWebSearch,
    toggleAudioResponse
  ]);

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
