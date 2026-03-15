FROM node:22-alpine

# Build tools required by better-sqlite3 (node-gyp needs python3, make, g++)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --build-from-source

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
