import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { Plugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4173,
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api/proxy/claude': {
        target: 'https://api.anthropic.com/v1/messages',
        changeOrigin: true,
        rewrite: (path) => '',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Get the API key from the original request headers
            const apiKey = req.headers['x-api-key'];
            
            // Set the required headers for Anthropic API
            if (apiKey) {
              proxyReq.setHeader('x-api-key', apiKey);
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              proxyReq.setHeader('content-type', 'application/json');
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
            }
          });
          return [proxy, options];
        }
      }
    }
  },
  plugins: [
    react(),
    ...(mode === 'production' ? [componentTagger()] : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));