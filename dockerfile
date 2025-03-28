FROM node:18-buster

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
RUN mkdir -p src/data/audio && \
  chmod -R 777 src/data

# First Time - Generate Prisma Client
RUN npx prisma generate 

# Build the application
RUN npm run build

# Expose port
EXPOSE 4173

# Initialize database and start the application
CMD npx prisma db push && npm run preview