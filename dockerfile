FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p data/audio data/uploads && npm run build:docker

EXPOSE 4173 4174

CMD npm start