FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./
COPY public/ ./public/

RUN npm run build
EXPOSE 3001 6001

CMD ["node", "dist/main.js"]
