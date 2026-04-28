# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "echo '=== OFICINA360 STARTUP ===' && echo 'NODE_ENV='$NODE_ENV && echo 'PORT='$PORT && echo 'DATABASE_URL='$DATABASE_URL && npx prisma db push --accept-data-loss 2>&1 || echo 'WARNING: prisma db push failed' && node dist/main"]
