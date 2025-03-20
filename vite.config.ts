// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4173,
    proxy: {
      // Add this new endpoint for tokenization
      '/api/tokenize': {
        target: 'http://localhost:4173/',
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    host: "::",
    port: 4173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "opensource-ai-chatbot.meetneura.ai"
    ]
  }
}));