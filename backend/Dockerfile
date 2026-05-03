# Build stage -- bust cache: 20260503e
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
# Force cache invalidation for source copy (ARG changes every push via commit timestamp)
ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"
COPY backend/. .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/release.js ./release.js
EXPOSE 3000
# prisma db push + idle connection cleanup run via release.js (Railway releaseCommand)
CMD ["node", "dist/main"]
