// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { Groq } from 'groq-sdk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import busboy from 'busboy';
import { Readable } from 'stream';
import type { FileInfo } from 'busboy';
import OpenAI from 'openai';

export default defineConfig(({ mode }) => {
  // Properly load env variables for the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Create middleware with access to env variables
  const sttMiddlewarePlugin = {
    name: 'stt-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        // Handle speech-to-text API endpoint
        if (req.url === '/api/stt' && req.method === 'POST') {
          console.log('[STT Debug] Request received', {
            url: req.url,
            method: req.method,
            headers: JSON.stringify(req.headers),
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length']
          });

          try {
            // Get the API key from loaded env variables
            const apiKey = env.VITE_GROQ_API_KEY;
            const model = env.VITE_GROQ_STT_API_MODEL || 'whisper-large-v3';
            
            console.log('[STT Debug] Environment check:', { 
              apiKeyExists: !!apiKey, 
              apiKeyLength: apiKey?.length,
              model
            });
            
            if (!apiKey) {
              console.error('[STT Debug] Missing API key');
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                text: "Could not process audio. Please check your microphone and try again." 
              }));
              return;
            }
            
            // Special handling for FormData/multipart uploads
            if (req.headers['content-type']?.includes('multipart/form-data')) {
              console.log('[STT Debug] Parsing multipart/form-data with busboy');
              
              // Create a file to store the audio data
              const tempDir = 'data/audio/azure';
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              const tempFileName = path.join(tempDir, `temp-${Date.now()}.webm`);
              
              // Set up busboy to handle the multipart form
              const bb = busboy({ headers: req.headers });
              let audioFileFound = false;
              let fileWriteStream: fs.WriteStream | null = null;
              
              // Handle file upload
              let filePromise: Promise<void>;
              
              bb.on('file', (name: string, file: Readable, info: FileInfo) => {
                const { filename, encoding, mimeType } = info;
                console.log('[STT Debug] File upload started:', {
                  fieldName: name,
                  filename,
                  encoding,
                  mimeType
                });
                
                audioFileFound = true;
                fileWriteStream = fs.createWriteStream(tempFileName);
                
                // Create a promise that resolves when the file is completely written
                filePromise = new Promise<void>((resolve, reject) => {
                  if (!fileWriteStream) {
                    reject(new Error('File write stream was not created'));
                    return;
                  }
                  
                  // Add timeout to prevent hanging indefinitely
                  const timeout = setTimeout(() => {
                    console.warn('[STT Debug] File write timed out after 5 seconds, continuing anyway');
                    resolve();
                  }, 5000);
                  
                  fileWriteStream.on('finish', () => {
                    clearTimeout(timeout);
                    console.log('[STT Debug] File write stream finished');
                    resolve();
                  });
                  
                  fileWriteStream.on('error', (err) => {
                    clearTimeout(timeout);
                    console.error('[STT Debug] File write stream error:', err);
                    reject(err);
                  });
                });
                
                // Pipe the file to disk
                file.pipe(fileWriteStream);
                
                // Log chunks as they come in
                let bytesReceived = 0;
                file.on('data', (chunk: Buffer) => {
                  bytesReceived += chunk.length;
                  console.log('[STT Debug] Received file chunk:', {
                    chunkSize: chunk.length,
                    totalBytesReceived: bytesReceived
                  });
                });

                // Handle file write completion
                fileWriteStream.on('finish', () => {
                  console.log('[STT Debug] File write stream finished');
                });

                fileWriteStream.on('error', (err) => {
                  console.error('[STT Debug] File write stream error:', err);
                });
              });
              
              // Handle errors
              bb.on('error', (err: Error) => {
                console.error('[STT Debug] Busboy error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  text: "Error processing your audio upload. Please try again." 
                }));
                
                // Clean up if we created a temp file
                if (fs.existsSync(tempFileName)) {
                  fs.unlinkSync(tempFileName);
                }
              });
              
              // Handle form completion
              bb.on('finish', async () => {
                if (!audioFileFound) {
                  console.error('[STT Debug] No audio file found in form data');
                  res.statusCode = 400;
                  res.end(JSON.stringify({ 
                    text: "No audio file found in the upload. Please try again." 
                  }));
                  return;
                }
                
                try {
                  // Wait for file stream to finish writing
                  if (filePromise) {
                    console.log('[STT Debug] Waiting for file write to complete');
                    try {
                      await filePromise;
                      console.log('[STT Debug] File write completed successfully');
                    } catch (err) {
                      console.error('[STT Debug] Error waiting for file write:', err);
                      throw err;
                    }
                  } else {
                    console.warn('[STT Debug] No file promise found, continuing without waiting');
                  }
                  
                  // Verify file was created and has data
                  if (!fs.existsSync(tempFileName)) {
                    console.error('[STT Debug] Temp file was not created');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ 
                      text: "Error creating temporary audio file. Please try again." 
                    }));
                    return;
                  }
                  
                  const fileStats = fs.statSync(tempFileName);
                  console.log('[STT Debug] File stats:', {
                    exists: fs.existsSync(tempFileName),
                    size: fileStats.size,
                    path: path.resolve(tempFileName)
                  });
                  
                  if (fileStats.size === 0) {
                    console.error('[STT Debug] Empty file received');
                    res.statusCode = 400;
                    res.end(JSON.stringify({ 
                      text: "Empty audio file received. Please check your microphone and try again." 
                    }));
                    
                    // Clean up temp file
                    fs.unlinkSync(tempFileName);
                    return;
                  }
                  
                  try {
                    console.log('[STT Debug] Initializing Groq client');
                    // Initialize Groq client on server-side (secure)
                    const groq = new Groq({ apiKey });
                    
                    console.log('[STT Debug] Preparing file for Groq API');
                    const fileStream = fs.createReadStream(tempFileName);
                    
                    // Check file stream is readable
                    let isReadable = false;
                    fileStream.on('readable', () => {
                      isReadable = true;
                      console.log('[STT Debug] File stream is readable');
                    });
                    
                    fileStream.on('error', (err) => {
                      console.error('[STT Debug] File stream error:', err);
                    });
                    
                    // Small delay to ensure the file is properly written
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (!isReadable) {
                      console.log('[STT Debug] Waiting for file stream to become readable...');
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    console.log('[STT Debug] Sending request to Groq API');
                    // Process with Groq
                    const response = await groq.audio.transcriptions.create({
                      model,
                      file: fileStream,
                    });
                    
                    // Clean up temp file
                    fs.unlinkSync(tempFileName);
                    
                    console.log('[STT Debug] Transcription successful:', response.text);
                    // Return the actual transcribed text
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ text: response.text }));
                  } catch (groqError) {
                    console.error('[STT Debug] Groq API error:', groqError);
                    // Clean up temp file if it exists
                    if (fs.existsSync(tempFileName)) {
                      fs.unlinkSync(tempFileName);
                    }
                    // Return a user-friendly error
                    res.statusCode = 500;
                    res.end(JSON.stringify({ 
                      text: "Sorry, I couldn't understand that. Please try speaking more clearly." 
                    }));
                  }
                } catch (fileError) {
                  console.error('[STT Debug] File handling error:', fileError);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ 
                    text: "Error processing audio file. Please try again." 
                  }));
                  
                  // Clean up if we created a temp file
                  if (fs.existsSync(tempFileName)) {
                    fs.unlinkSync(tempFileName);
                  }
                }
              });
              
              // Start processing the request
              req.pipe(bb);
              return;
            }
            
            // Fallback to direct buffer processing if not multipart
            console.log('[STT Debug] Starting to read direct request data');
            let chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk));
              console.log('[STT Debug] Received chunk size:', chunk.length);
            }
            const buffer = Buffer.concat(chunks);
            console.log('[STT Debug] Total buffer size:', buffer.length);
            
            if (buffer.length === 0) {
              console.error('[STT Debug] Empty buffer received');
              res.statusCode = 400;
              res.end(JSON.stringify({ 
                text: "No audio data received. Please try again." 
              }));
              return;
            }

            // Create a temporary file
            const tempDir = 'data/audio/azure';
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFileName = path.join(tempDir, `temp-${Date.now()}.webm`);
            console.log(`[STT Debug] Writing to temp file: ${tempFileName}`);
            fs.writeFileSync(tempFileName, buffer);
            
            // Verify file was created and has data
            const fileStats = fs.statSync(tempFileName);
            console.log('[STT Debug] File stats:', {
              exists: fs.existsSync(tempFileName),
              size: fileStats.size,
              path: path.resolve(tempFileName)
            });
            
            try {
              console.log('[STT Debug] Initializing Groq client');
              // Initialize Groq client on server-side (secure)
              const groq = new Groq({ apiKey });
              
              console.log('[STT Debug] Preparing file for Groq API');
              const fileStream = fs.createReadStream(tempFileName);
              
              // Check file stream is readable
              fileStream.on('readable', () => {
                console.log('[STT Debug] File stream is readable');
              });
              
              fileStream.on('error', (err) => {
                console.error('[STT Debug] File stream error:', err);
              });
              
              console.log('[STT Debug] Sending request to Groq API');
              // Process with Groq
              const response = await groq.audio.transcriptions.create({
                model,
                file: fileStream,
              });
              
              // Clean up temp file
              fs.unlinkSync(tempFileName);
              
              console.log('[STT Debug] Transcription successful:', response.text);
              // Return the actual transcribed text
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: response.text }));
            } catch (groqError) {
              console.error('[STT Debug] Groq API error:', groqError);
              // Clean up temp file if it exists
              if (fs.existsSync(tempFileName)) {
                fs.unlinkSync(tempFileName);
              }
              // Return a user-friendly error
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                text: "Sorry, I couldn't understand that. Please try speaking more clearly." 
              }));
            }
          } catch (error) {
            console.error('[STT Debug] General error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              text: "Sorry, I couldn't process your voice message. Please try again." 
            }));
          }
          return;
        }
        
        // Handle text-to-speech API endpoint
        else if (req.url === '/api/tts' && req.method === 'POST') {
          console.log('[TTS Debug] Request received', {
            url: req.url,
            method: req.method,
            headers: JSON.stringify(req.headers),
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length']
          });

          try {
            // Get the API key from loaded env variables
            const apiKey = env.VITE_OPENAI_API_KEY;
            const model = env.VITE_OPENAI_TTS_MODEL || 'tts-1';
            const voice = env.VITE_OPENAI_TTS_VOICE || 'alloy';
            
            console.log('[TTS Debug] Environment check:', { 
              apiKeyExists: !!apiKey, 
              apiKeyLength: apiKey?.length,
              model,
              voice
            });
            
            if (!apiKey) {
              console.error('[TTS Debug] Missing API key');
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: "Could not process text-to-speech. API key is missing."
              }));
              return;
            }
            
            // Read the request body as JSON
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.from(chunk));
            }
            
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) {
              console.error('[TTS Debug] Empty request received');
              res.statusCode = 400;
              res.end(JSON.stringify({ 
                error: "No text received. Please provide text to convert to speech."
              }));
              return;
            }
            
            let data;
            try {
              data = JSON.parse(buffer.toString());
            } catch (parseError) {
              console.error('[TTS Debug] Error parsing JSON:', parseError);
              res.statusCode = 400;
              res.end(JSON.stringify({ 
                error: "Invalid JSON format. Please provide valid JSON."
              }));
              return;
            }
            
            if (!data.text) {
              console.error('[TTS Debug] No text provided in request');
              res.statusCode = 400;
              res.end(JSON.stringify({ 
                error: "No text provided. Please include 'text' in your request."
              }));
              return;
            }
            
            const text = data.text;
            const requestModel = data.model || model;
            const requestVoice = data.voice || voice;
            
            console.log('[TTS Debug] Processing TTS request:', { 
              textLength: text.length,
              textPreview: text.length > 50 ? text.substring(0, 50) + '...' : text,
              model: requestModel,
              voice: requestVoice
            });
            
            try {
              console.log('[TTS Debug] Initializing OpenAI client');
              // Initialize OpenAI client on server-side (secure)
              const openai = new OpenAI({ apiKey });
              
              console.log('[TTS Debug] Sending request to OpenAI TTS API');
              // Create speech from text
              const mp3 = await openai.audio.speech.create({
                model: requestModel,
                voice: requestVoice,
                input: text,
              });
              
              console.log('[TTS Debug] Speech generation successful, converting to buffer');
              // Convert to buffer
              const buffer = Buffer.from(await mp3.arrayBuffer());
              
              console.log('[TTS Debug] TTS successful, returning audio buffer');
              // Set headers and return audio data
              res.statusCode = 200;
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Content-Length', buffer.length);
              res.end(buffer);
            } catch (openaiError) {
              console.error('[TTS Debug] OpenAI API error:', openaiError);
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: "Error generating speech. Please try again."
              }));
            }
          } catch (error) {
            console.error('[TTS Debug] General error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              error: "Sorry, I couldn't process your text-to-speech request. Please try again."
            }));
          }
          return;
        }
        
        next();
      });
    }
  };

  return {
    plugins: [react(), sttMiddlewarePlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  server: {
    host: "::",
      port: parseInt(env.VITE_PORT || '4173'),
    proxy: {
      // Add this new endpoint for tokenization
      '/api/tokenize': {
        target: 'https://opensource-ai-chatbot.meetneura.ai',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Keep your existing Claude proxy
      '/api/proxy/claude': {
        target: 'https://api.anthropic.com/v1/messages',
        changeOrigin: true,
        rewrite: (path) => '',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
              proxyReq.setHeader('x-api-key', apiKey);
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              proxyReq.setHeader('content-type', 'application/json');
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
            }
          });
        }
      }
    }
  },
    build: {
      outDir: 'build',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            ai: ['@google/generative-ai', 'openai', 'groq-sdk'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
    },
  },
  preview: {
    host: "::",
      port: parseInt(env.VITE_PORT || '4173'),
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "opensource-ai-chatbot.meetneura.ai"
    ]
  }
  };
});