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
            // Read the request body to extract the API key
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                // Set the Anthropic API key in the headers
                if (data.apiKey) {
                  proxyReq.setHeader('x-api-key', data.apiKey);
                  proxyReq.setHeader('anthropic-version', data.anthropicVersion || '2023-06-01');
                  
                  // Remove the apiKey and anthropicVersion from the body
                  delete data.apiKey;
                  delete data.anthropicVersion;
                  
                  // Update the body
                  const newBody = JSON.stringify(data);
                  proxyReq.setHeader('Content-Length', Buffer.byteLength(newBody));
                  proxyReq.write(newBody);
                  proxyReq.end();
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
