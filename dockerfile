FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update -y \
    && apt-get install -y \
        openssl \
        build-essential \
        libssl-dev \
        ca-certificates

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies with platform-specific settings to avoid Rollup issues
RUN npm install 

# Copy entire project
COPY . .

# First Time - Generate Prisma Client
RUN npx prisma generate

# Build the application with NODE_OPTIONS to avoid optional dependency issues
RUN npm run build

# Expose port
EXPOSE 3000

# Initialize database and start the application
CMD npx prisma db push && npm run preview