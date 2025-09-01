import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, Message, Settings, Provider, Template, ChatResponse, ChatRequest } from '@/types';
import { generateId, getDefaultSettings, getFirstMessage, getDefaultArenaSettings } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { sendChatRequest } from "@/services/apiService";
import { streamChatResponse } from "@/lib/utils";
import { convertTextToSpeech, playAudio, convertAndUploadTextToSpeech } from "@/services/audioService";
import { countTokens } from '@/lib/tokenizer';
import * as dbService from '@/services/api/database';
import { useArena } from './ArenaContext';


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
  createNewConversation: (initialMessage?: string, isArena?: boolean) => Promise<string>;
  selectConversation: (id: string) => void;
  addMessage: (message: Partial<Message>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => void;
  clearConversations: () => Promise<void>;
  updateTheme: (template: Template, darkMode: boolean) => void;
  startStreaming: () => AbortController;
  stopStreaming: () => void;
  sendMessage: (content: string, contextMessages?: Message[], editedMessageIndex?: number, returnResponse?: boolean) => Promise<{ content: string } | void>;
  toggleWebSearch: () => void;
  toggleAudioResponse: () => void;
  toggleArenaMode: () => void;
  setIsInputDisabled: (disabled: boolean) => void;
};

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  currentConversationId: null,
  settings: { ...getDefaultSettings(), ...getDefaultArenaSettings(), arenaMode: false },
  isLoading: false,
  isStreaming: false,
  isInputDisabled: false,
  streamController: null,
  setSettings: () => {},
  setConversations: () => {},
  createNewConversation: async () => '',
  selectConversation: () => {},
  addMessage: async () => {},
  deleteConversation: async () => {},
  renameConversation: () => {},
  clearConversations: async () => {},
  updateTheme: () => {},
  startStreaming: () => new AbortController(),
  stopStreaming: () => {},
  sendMessage: async () => {},
  toggleWebSearch: () => {},
  toggleAudioResponse: () => {},
  toggleArenaMode: () => {},
  setIsInputDisabled: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { sendArenaMessage, arenaSettings, setArenaSettings, currentArenaConversationId, setCurrentArenaConversationId, setArenaConversations } = useArena();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({ ...getDefaultSettings(), ...getDefaultArenaSettings(), arenaMode: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [streamController, setStreamController] = useState<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    const savedSettings = localStorage.getItem('settings');
    
    const loadConversations = async () => {
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
          await createNewConversation(undefined, false);
        }
      } else {
        await createNewConversation(undefined, false);
      }
    };
    loadConversations();
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Ensure new arena settings are present if loading old settings
        setSettings(prev => ({ ...getDefaultArenaSettings(), ...prev, ...parsedSettings }));
        updateTheme(parsedSettings.template, parsedSettings.darkMode);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
        const defaults = { ...getDefaultSettings(), ...getDefaultArenaSettings() };
        setSettings(defaults);
        updateTheme(defaults.template, defaults.darkMode);
      }
    } else {
      const defaults = { ...getDefaultSettings(), ...getDefaultArenaSettings() };
      setSettings(defaults);
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

  const createNewConversation = useCallback(async (initialMessage?: string, isArena: boolean = false) => {
    const firstMessage = {
      id: generateId(),
      role: 'assistant' as const,
      content: getFirstMessage(initialMessage),
      createdAt: new Date()
    };
    
    const newConversation = await dbService.createConversation(
      'New Conversation',
      isArena,
      firstMessage
    );
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    return newConversation.id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  const addMessage = useCallback(async (message: Partial<Message>) => {
    if (!currentConversationId) return;

    const fullMessage: Message = {
      id: generateId(),
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content || '',
      createdAt: new Date(),
      tokenCount: message.content ? countTokens(message.content) : 0,
      modelA: message.modelA,
      modelB: message.modelB,
      providerA: message.providerA,
      providerB: message.providerB,
    };

    const savedMessage = await dbService.addMessage(currentConversationId, fullMessage);
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === currentConversationId 
          ? {
              ...conv,
              messages: [...conv.messages, savedMessage],
              updatedAt: new Date(),
              title: conv.title === 'New Conversation' && savedMessage.role === 'user' 
                ? savedMessage.content?.slice(0, 30) + (savedMessage.content && savedMessage.content.length > 30 ? '...' : '') 
                : conv.title
            } 
          : conv
      )
    );
  }, [currentConversationId]);

  const deleteConversation = useCallback(async (id: string) => {
    await dbService.deleteConversation(id);
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversationId === id) {
      if (conversations.length > 1) {
        const nextConv = conversations.find(conv => conv.id !== id);
        if (nextConv) {
          setCurrentConversationId(nextConv.id);
        } else {
          await createNewConversation(undefined, false);
        }
      } else {
        await createNewConversation(undefined, false);
      }
    }
    
    toast({
      title: "Conversation deleted",
      description: "The conversation has been removed",
    });
  }, [conversations, currentConversationId, createNewConversation, toast]);
  
  const clearConversations = useCallback(async () => {
    await dbService.deleteAllConversations();
    setConversations([]);
    await createNewConversation(undefined, false);
    
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
      const id = await createNewConversation(undefined, settings.arenaMode);
      setCurrentConversationId(id);
    }
    
    setIsLoading(true);

    try {
      if (settings.arenaMode) {
        let conversationIdToUse = currentArenaConversationId;
        // Ensure currentArenaConversationId is set, if not, create or select one
        if (!conversationIdToUse) {
          const newArenaConvId = generateId();
          const newArenaConversation: Conversation = {
            id: newArenaConvId,
            title: `Arena Battle ${new Date().toLocaleString()}`,
            isArena: true,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            // settings: settings // Use current chat settings as a base for arena - removing to fix TS error, settings are per model in arena
          };
          setArenaConversations(prev => [...prev, newArenaConversation]);
          setCurrentArenaConversationId(newArenaConvId);
          conversationIdToUse = newArenaConvId;
        }

        // Ensure arenaSettings are populated, using defaults from ChatContext's settings if necessary
        let currentArenaModelSettings = arenaSettings;
        if (!currentArenaModelSettings || currentArenaModelSettings.length < 2) {
          const defaultArenaModelA: Settings = { 
            ...(settings as Settings), // Base settings from ChatContext
            model: settings.modelA || 'gemini-1.0-pro', // Fallback if modelA is not in settings
            provider: settings.providerA || 'google', // Fallback if providerA is not in settings
            arenaModelLabel: 'Model A' 
          };
          const defaultArenaModelB: Settings = { 
            ...(settings as Settings), // Base settings from ChatContext
            model: settings.modelB || 'claude-2', // Fallback if modelB is not in settings
            provider: settings.providerB || 'anthropic', // Fallback if providerB is not in settings
            arenaModelLabel: 'Model B' 
          };
          currentArenaModelSettings = [defaultArenaModelA, defaultArenaModelB];
          setArenaSettings(currentArenaModelSettings);
        }
        
        await sendArenaMessage(content, conversationIdToUse, currentArenaModelSettings);
        setIsLoading(false);
        return; // Exit early if in arena mode
      }

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
         await addMessage({ role: "user", content });
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
        model: settings.arenaMode ? settings.modelA : (settings.webSearchEnabled ? 
          (import.meta.env.VITE_GOOGLE_API_MODEL || 'gemini-2.5-pro-exp-03-25') : 
          settings.model),
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
  const toggleArenaMode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      arenaMode: !prev.arenaMode
    }));
    toast({
      title: settings.arenaMode ? "Arena Mode Disabled" : "Arena Mode Enabled",
      description: settings.arenaMode ? 
        "Switching to standard chat mode." :
        "Switching to Arena Mode. Messages will be sent to two models.",
    });
  }, [settings, toast]);

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
    toggleArenaMode,
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
