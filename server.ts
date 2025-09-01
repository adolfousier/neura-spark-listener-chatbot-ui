import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import OpenAI from 'openai';
import { Groq } from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import * as dbService from './src/services/dbService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:4173', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  
  // Handle client-side routing in production
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Serve index.html for all other routes
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Secure API key getter (server-side only, no VITE_ prefix)
const getApiKey = (provider: string): string | null => {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null;
    case 'groq':
      return process.env.GROQ_API_KEY || null;
    case 'claude':
    case 'anthropic':
      return process.env.CLAUDE_API_KEY || null;
    case 'google':
      return process.env.GOOGLE_API_KEY || null;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY || null;
    case 'neurarouter':
      return process.env.NEURA_ROUTER_API_KEY || null;
    case 'flowise':
      return process.env.FLOWISE_API_KEY || null;
    default:
      return null;
  }
};

// Chat completions endpoint - handles all providers securely
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { provider, messages, model, temperature = 0.7, stream = false, max_tokens } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = getApiKey(provider);
    if (!apiKey && provider !== 'flowise') {
      return res.status(500).json({ 
        error: `API key not configured for provider: ${provider}` 
      });
    }

    let response;

    switch (provider) {
      case 'openai': {
        const openai = new OpenAI({ apiKey: apiKey! });
        response = await openai.chat.completions.create({
          model: model || 'gpt-3.5-turbo',
          messages,
          temperature,
          stream,
          max_tokens
        });
        break;
      }

      case 'groq': {
        const groq = new Groq({ apiKey: apiKey! });
        response = await groq.chat.completions.create({
          model: model || 'llama-3.1-70b-versatile',
          messages,
          temperature,
          stream,
          max_tokens
        });
        break;
      }

      case 'claude':
      case 'anthropic': {
        const anthropic = new Anthropic({ apiKey: apiKey! });
        
        // Convert messages to Anthropic format
        const systemMessage = messages.find((msg: any) => msg.role === 'system');
        const chatMessages = messages.filter((msg: any) => msg.role !== 'system');
        
        const anthropicResponse = await anthropic.messages.create({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: max_tokens || 1000,
          temperature,
          system: systemMessage?.content || undefined,
          messages: chatMessages,
          stream
        });

        // Convert Anthropic response to OpenAI format
        if (stream) {
          response = anthropicResponse;
        } else {
          response = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Date.now(),
            model,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: (anthropicResponse as any).content[0].text
              },
              finish_reason: 'stop'
            }],
            usage: (anthropicResponse as any).usage
          };
        }
        break;
      }

      case 'google': {
        const genAI = new GoogleGenerativeAI(apiKey!);
        const genModel = genAI.getGenerativeModel({ model: model || 'gemini-pro' });
        
        // Convert messages to Google format
        const prompt = messages.map((msg: any) => 
          `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
        ).join('\n');
        
        const result = await genModel.generateContent(prompt);
        const googleResponse = await result.response;
        
        response = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Date.now(),
          model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: googleResponse.text()
            },
            finish_reason: 'stop'
          }]
        };
        break;
      }

      case 'openrouter': {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_X_TITLE || 'AI Chat App'
          },
          body: JSON.stringify({
            model: model || 'openai/gpt-3.5-turbo',
            messages,
            temperature,
            stream,
            max_tokens
          })
        });
        
        if (!openRouterResponse.ok) {
          throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`);
        }
        
        response = await openRouterResponse.json();
        break;
      }

      case 'neurarouter': {
        const neuraResponse = await fetch(process.env.NEURA_ROUTER_API_URL || 'https://api.meetneura.ai/v1/router/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            messages,
            temperature,
            stream,
            max_tokens
          })
        });
        
        if (!neuraResponse.ok) {
          throw new Error(`Neura Router API error: ${neuraResponse.statusText}`);
        }
        
        response = await neuraResponse.json();
        break;
      }

      case 'flowise': {
        const flowiseUrl = process.env.FLOWISE_API_URL || 'http://localhost:3000/api/v1/prediction';
        const chatflowId = process.env.FLOWISE_CHATFLOW_ID || '';
        
        const flowiseResponse = await fetch(`${flowiseUrl}/${chatflowId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            question: messages[messages.length - 1]?.content || '',
            history: messages.slice(0, -1).map((msg: any) => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });
        
        if (!flowiseResponse.ok) {
          throw new Error(`Flowise API error: ${flowiseResponse.statusText}`);
        }
        
        const flowiseResult = await flowiseResponse.json();
        
        // Convert Flowise response to OpenAI format
        response = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Date.now(),
          model: 'flowise',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: flowiseResult.text || flowiseResult.answer || JSON.stringify(flowiseResult)
            },
            finish_reason: 'stop'
          }]
        };
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    if (stream) {
      // Handle streaming responses
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // For streaming responses, pipe the response
      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response as any) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
      }
      res.end();
    } else {
      res.json(response);
    }

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text-to-Speech endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'alloy', model = 'tts-1' } = req.body;
    const apiKey = getApiKey('openai');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const openai = new OpenAI({ apiKey });
    
    const mp3 = await openai.audio.speech.create({
      model,
      voice: voice as any,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('TTS API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Speech-to-Text endpoint
app.post('/api/stt', upload.single('audio'), async (req, res) => {
  let tempFilePath: string | null = null;
  
  try {
    const apiKey = getApiKey('groq');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    tempFilePath = req.file.path;
    console.log('Processing audio file:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: tempFilePath
    });

    const groq = new Groq({ apiKey });
    
    // Create file stream for Groq API
    const audioFile = fs.createReadStream(tempFilePath);
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: process.env.GROQ_STT_API_MODEL || 'whisper-large-v3-turbo',
      language: 'en', // You can make this configurable
      response_format: 'text'
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    res.json({ text: transcription });

  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    console.error('STT API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Azure Blob Storage endpoint
app.post('/api/storage/upload', async (req, res) => {
  try {
    const { audioData, fileName } = req.body;
    
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_ID;
    const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
    
    if (!accountName || !containerName || !sasToken) {
      return res.status(500).json({ 
        error: 'Azure Storage credentials not configured',
        details: {
          hasAccountName: !!accountName,
          hasContainerName: !!containerName,
          hasSasToken: !!sasToken
        }
      });
    }
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Convert base64 audio data back to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Create blob service client with SAS token
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net${sasToken}`
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Generate unique blob name
    const blobName = fileName || `speech-${Date.now()}.mp3`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log('[Azure Blob] Uploading audio data:', {
      blobName,
      dataSize: audioBuffer.length
    });
    
    // Upload the audio data
    await blockBlobClient.uploadData(audioBuffer, {
      blobHTTPHeaders: {
        blobContentType: 'audio/mpeg'
      }
    });
    
    // Generate SAS URL for reading
    const { BlobSASPermissions, SASProtocol } = await import('@azure/storage-blob');
    
    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(new Date().valueOf() + 24 * 60 * 60 * 1000),
      protocol: SASProtocol.Https,
      cacheControl: 'no-cache',
      contentDisposition: 'inline',
      contentType: 'audio/mpeg'
    });
    
    console.log('[Azure Blob] Upload successful:', { blobName, url: sasUrl });
    
    res.json({ url: sasUrl, blobName });

  } catch (error) {
    console.error('Azure Storage API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database API endpoints
// Get all conversations
app.get('/api/database/conversations', async (req, res) => {
  try {
    const conversations = await dbService.getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Database API error (getConversations):', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single conversation
app.get('/api/database/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await dbService.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Database API error (getConversation):', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new conversation
app.post('/api/database/conversations', async (req, res) => {
  try {
    const { title, isArena = false, initialMessage } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const conversation = await dbService.createConversation(title, isArena, initialMessage);
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Database API error (createConversation):', error);
    res.status(500).json({ 
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add message to conversation
app.post('/api/database/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const message = req.body;
    
    if (!message.role || !message.content) {
      return res.status(400).json({ error: 'Message role and content are required' });
    }
    
    const createdMessage = await dbService.addMessage(id, message);
    res.status(201).json(createdMessage);
  } catch (error) {
    console.error('Database API error (addMessage):', error);
    res.status(500).json({ 
      error: 'Failed to add message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update conversation title
app.put('/api/database/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const conversation = await dbService.updateConversationTitle(id, title);
    res.json(conversation);
  } catch (error) {
    console.error('Database API error (updateConversationTitle):', error);
    res.status(500).json({ 
      error: 'Failed to update conversation title',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete conversation
app.delete('/api/database/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteConversation(id);
    res.status(204).send();
  } catch (error) {
    console.error('Database API error (deleteConversation):', error);
    res.status(500).json({ 
      error: 'Failed to delete conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete all conversations
app.delete('/api/database/conversations', async (req, res) => {
  try {
    await dbService.deleteAllConversations();
    res.status(204).send();
  } catch (error) {
    console.error('Database API error (deleteAllConversations):', error);
    res.status(500).json({ 
      error: 'Failed to delete all conversations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Secure API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 API keys are now server-side only - no browser exposure!`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat/completions`);
  console.log(`🗄️  Database endpoints: http://localhost:${PORT}/api/database/conversations`);
  console.log(`🔊 TTS endpoint: http://localhost:${PORT}/api/tts`);
  console.log(`🎤 STT endpoint: http://localhost:${PORT}/api/stt`);
  console.log(`☁️  Storage endpoint: http://localhost:${PORT}/api/storage/upload`);
  console.log(`✨ All services secured and ready!`);
});

export default app;