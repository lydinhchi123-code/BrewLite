
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY apps/api/package*.json ./
RUN npm ci

COPY apps/api/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY apps/api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3001

CMD ["node", "dist/main.js"]
