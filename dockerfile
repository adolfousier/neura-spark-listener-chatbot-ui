FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN mkdir -p data/audio data/uploads && npx prisma generate && npm run build

EXPOSE 4173 4174

CMD npx prisma db push && npm start