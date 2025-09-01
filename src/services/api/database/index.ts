import { getSecureApiBaseUrl } from '@/lib/utils';
import { Conversation, Message } from '@/types';

// Convert API response dates from strings back to Date objects
const convertDatesInMessage = (message: any): Message => ({
  ...message,
  createdAt: new Date(message.createdAt),
});

const convertDatesInConversation = (conversation: any): Conversation => ({
  ...conversation,
  createdAt: new Date(conversation.createdAt),
  updatedAt: new Date(conversation.updatedAt),
  messages: conversation.messages.map(convertDatesInMessage)
});

/**
 * SECURITY FIX: Database API Service (client-side)
 * All database operations now go through secure server endpoints
 */

const getApiUrl = (endpoint: string): string => {
  const baseUrl = getSecureApiBaseUrl();
  return `${baseUrl}/api/database${endpoint}`;
};

// Get all conversations
export const getConversations = async (): Promise<Conversation[]> => {
  console.log('[DB API] Fetching conversations via secure endpoint');
  
  const response = await fetch(getApiUrl('/conversations'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  const conversations = await response.json();
  return conversations.map(convertDatesInConversation);
};

// Get a single conversation by ID
export const getConversation = async (id: string): Promise<Conversation | null> => {
  console.log(`[DB API] Fetching conversation ${id} via secure endpoint`);
  
  const response = await fetch(getApiUrl(`/conversations/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
  }

  const conversation = await response.json();
  return convertDatesInConversation(conversation);
};

// Create a new conversation
export const createConversation = async (
  title: string,
  isArena: boolean = false,
  initialMessage?: Message,
): Promise<Conversation> => {
  console.log('[DB API] Creating conversation via secure endpoint');
  
  const response = await fetch(getApiUrl('/conversations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      isArena,
      initialMessage
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.statusText}`);
  }

  const conversation = await response.json();
  return convertDatesInConversation(conversation);
};

// Add a message to a conversation
export const addMessage = async (
  conversationId: string,
  message: Partial<Message>,
): Promise<Message> => {
  console.log(`[DB API] Adding message to conversation ${conversationId} via secure endpoint`);
  
  const response = await fetch(getApiUrl(`/conversations/${conversationId}/messages`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Failed to add message: ${response.statusText}`);
  }

  const createdMessage = await response.json();
  return convertDatesInMessage(createdMessage);
};

// Update conversation title
export const updateConversationTitle = async (id: string, title: string): Promise<Conversation> => {
  console.log(`[DB API] Updating conversation ${id} title via secure endpoint`);
  
  const response = await fetch(getApiUrl(`/conversations/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update conversation title: ${response.statusText}`);
  }

  const conversation = await response.json();
  return convertDatesInConversation(conversation);
};

// Delete a conversation
export const deleteConversation = async (id: string): Promise<void> => {
  console.log(`[DB API] Deleting conversation ${id} via secure endpoint`);
  
  const response = await fetch(getApiUrl(`/conversations/${id}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }
};

// Delete all conversations
export const deleteAllConversations = async (): Promise<void> => {
  console.log('[DB API] Deleting all conversations via secure endpoint');
  
  const response = await fetch(getApiUrl('/conversations'), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete all conversations: ${response.statusText}`);
  }
};