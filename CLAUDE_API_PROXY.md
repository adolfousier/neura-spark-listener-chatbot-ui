# Claude API Proxy Implementation

## Overview

This document explains the implementation of a proxy solution for the Claude API to resolve CORS issues when making requests from the browser.

## Problem

When making direct requests to the Claude API (`https://api.anthropic.com/v1/messages`) from a browser-based application, CORS policies block the requests with the following error:

```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'http://localhost:4173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

To resolve this issue, we've implemented a proxy approach using Vite's built-in proxy capabilities:

1. **Proxy Configuration**: Added a proxy configuration in `vite.config.ts` that forwards requests from `/api/claude-proxy` to `https://api.anthropic.com/v1/messages`.

2. **API Service Modification**: Updated the `apiService.ts` file to use the proxy endpoint for Claude API requests instead of making direct API calls.

3. **Request Transformation**: The proxy extracts the API key from the request body and adds it to the headers before forwarding the request to the Claude API.

## Implementation Details

### Vite Proxy Configuration

The proxy is configured in `vite.config.ts` to:
- Forward requests from `/api/claude-proxy` to `https://api.anthropic.com/v1/messages`
- Extract the API key from the request body and add it to the headers
- Remove sensitive information from the forwarded request body

### API Service Changes

The `sendChatRequest` function in `apiService.ts` now:
- Uses a proxy approach for Claude API requests
- Passes the API key in the request body instead of headers
- Calls a new `sendProxyRequest` function to handle the proxy request

## Usage

No changes are required in how you use the chat functionality. The proxy is transparent to the application and handles the CORS issues behind the scenes.

## Security Considerations

- The API key is passed in the request body to the proxy and then moved to the headers before forwarding to the Claude API
- The proxy runs on the same origin as the application, avoiding CORS issues
- In a production environment, consider implementing additional security measures for handling API keys