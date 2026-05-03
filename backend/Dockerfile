# Build stage -- bust cache: 20260503g
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY backend/. .
# Timestamp abaixo muda a cada deploy para garantir prisma generate sempre roda
RUN echo "prisma-gen: 20260503T160000" && npx prisma generate
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
COPY backend/seed-demo.js ./seed-demo.js
EXPOSE 3000
# prisma db push + idle connection cleanup run via release.js (Railway releaseCommand)
CMD ["node", "dist/main"]
