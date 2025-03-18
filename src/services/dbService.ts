import { prisma } from '@/lib/prisma';
import { Conversation, Message } from '@/types';

// Convert Prisma Conversation to app Conversation type
const convertPrismaConversation = (prismaConversation: any): Conversation => ({
  id: prismaConversation.id,
  title: prismaConversation.title,
  messages: prismaConversation.messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    createdAt: new Date(msg.createdAt),
  })),
  createdAt: new Date(prismaConversation.createdAt),
  updatedAt: new Date(prismaConversation.updatedAt),
});

// Get all conversations
export const getConversations = async (): Promise<Conversation[]> => {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return conversations.map(convertPrismaConversation);
};

// Get a single conversation by ID
export const getConversation = async (id: string): Promise<Conversation | null> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: true,
    },
  });

  if (!conversation) return null;
  return convertPrismaConversation(conversation);
};

// Create a new conversation
export const createConversation = async (title: string, initialMessage?: Message): Promise<Conversation> => {
  const conversation = await prisma.conversation.create({
    data: {
      title,
      messages: initialMessage
        ? {
            create: {
              role: initialMessage.role,
              content: initialMessage.content,
            },
          }
        : undefined,
    },
    include: {
      messages: true,
    },
  });

  return convertPrismaConversation(conversation);
};

// Add a message to a conversation
export const addMessage = async (conversationId: string, role: string, content: string): Promise<Message> => {
  const message = await prisma.message.create({
    data: {
      role,
      content,
      conversationId,
    },
  });

  // Update the conversation's updatedAt timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    content: message.content,
    createdAt: new Date(message.createdAt),
  };
};

// Update conversation title
export const updateConversationTitle = async (id: string, title: string): Promise<Conversation> => {
  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title },
    include: {
      messages: true,
    },
  });

  return convertPrismaConversation(conversation);
};

// Delete a conversation
export const deleteConversation = async (id: string): Promise<void> => {
  await prisma.conversation.delete({
    where: { id },
  });
};

// Delete all conversations
export const deleteAllConversations = async (): Promise<void> => {
  await prisma.conversation.deleteMany({});
};