import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4173,
    proxy: {
      // Proxy for Claude API requests
      '/api/claude-proxy': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => '/v1/messages',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // We need to completely buffer the request body before we can modify it
            let bodyChunks: Buffer[] = [];
            let bodyLength = 0;
            
            req.on('data', (chunk: Buffer) => {
              bodyChunks.push(chunk);
              bodyLength += chunk.length;
            });
            
            req.on('end', () => {
              try {
                // Concatenate all chunks to get the complete body
                const bodyBuffer = Buffer.concat(bodyChunks, bodyLength);
                const body = bodyBuffer.toString();
                const data = JSON.parse(body);
                
                // Set the Anthropic API key in the headers
                if (data.apiKey) {
                  proxyReq.setHeader('x-api-key', data.apiKey);
                  proxyReq.setHeader('anthropic-version', data.anthropicVersion || '2023-06-01');
                  
                  // Remove the apiKey and anthropicVersion from the body
                  delete data.apiKey;
                  delete data.anthropicVersion;
                  
                  // Create a new body with the modified data
                  const newBody = JSON.stringify(data);
                  
                  // Update content length and write the new body
                  proxyReq.setHeader('Content-Length', Buffer.byteLength(newBody));
                  // End the request with the new body
                  proxyReq.write(newBody);
                  proxyReq.end();
                } else {
                  console.error('No API key found in request body');
                  // If no API key, just end the request with original body
                  proxyReq.end(bodyBuffer);
                }
              } catch (error) {
                console.error('Error processing proxy request:', error);
              }
            });
          });
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
