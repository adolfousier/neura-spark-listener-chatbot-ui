FROM node:18-buster

WORKDIR /app

# Install system dependencies
RUN apt-get update -y \
    && apt-get install -y \
        build-essential \
        libssl-dev \
        ca-certificates

# Remove existing node_modules to avoid conflicts
RUN rm -rf node_modules

# Install Rollup dependency explicitly first
RUN npm install --save-dev @rollup/rollup-linux-x64-gnu

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install 

# Copy entire project
COPY . .

# First Time - Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 4173

# Initialize database and start the application
CMD npx prisma db push && npm run preview