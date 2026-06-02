FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS final
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs
EXPOSE 5000
CMD ["node", "src/server.js"]
