FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --no-cache-dir openai-whisper

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

RUN mkdir -p /app/data /app/temp /app/logs /app/agents/skills && \
    chown -R nodejs:nodejs /app

USER nodejs

VOLUME ["/app/data", "/app/agents/skills", "/app/logs"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "dist/index.js"]
