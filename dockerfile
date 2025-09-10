# Multi-stage build for secure server setup
FROM node:20-bookworm AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update -y \
    && apt-get install -y \
        build-essential \
        libssl-dev \
        ca-certificates

# Install Rollup dependency explicitly first
RUN npm install --save-dev @rollup/rollup-linux-x64-gnu

COPY package*.json ./
RUN npm install

# Install Firebase dependencies explicitly
RUN npm install firebase@latest

# Copy entire project
COPY . .

# Create data directory structure with proper permissions  
RUN mkdir -p data/audio data/uploads && \
    chmod 755 data

# Build client only (skip db:setup during build)
RUN npm run build:docker

# Production stage
FROM node:20-bookworm AS production

WORKDIR /app

# Install system dependencies
RUN apt-get update -y \
    && apt-get install -y \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for concurrently, vite, etc.)
RUN npm ci && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app .

# Create data directory structure with proper permissions
RUN mkdir -p data/audio data/uploads && \
    chmod 755 data

# Install tsx for running TypeScript in production
RUN npm install -g tsx

# Expose both server and client ports
EXPOSE 4173
EXPOSE 4174

# Set production environment
ENV NODE_ENV=production

# Start both server and client
CMD npm start