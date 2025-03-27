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

# Copy entire project
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p src/data/audio && \
  chmod -R 777 src/data

# Install dependencies
RUN npm install 

# First Time - Generate Prisma Client
RUN npx prisma generate 

# Build the application
RUN npm run build

# Expose port
EXPOSE 4173

# Initialize database and start the application
CMD npx prisma db push && npm run preview