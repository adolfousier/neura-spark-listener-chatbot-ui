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

# Create necessary directories and set permissions
RUN mkdir -p app/src/data/audio uploads && \
  chmod -R 777 src/data uploads

# First Time - Generate Prisma Client
RUN npx prisma generate

# Build both server and client (includes server build now)
RUN npm run build

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

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.server.json ./
COPY --from=builder /app/prisma ./prisma

# Create necessary directories
RUN mkdir -p uploads src/data/audio && \
  chmod -R 777 src/data uploads

# Install tsx for running TypeScript in production
RUN npm install -g tsx

# Generate Prisma Client in production
RUN npx prisma generate

# Expose both server and client ports
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Initialize database and start the secure server
CMD npx prisma db push && npm run start:prod