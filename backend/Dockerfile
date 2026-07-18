# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY backend/. .
# Deriva do commit SHA (Railway injeta automaticamente) para nunca cachear
# uma camada de prisma generate desatualizada em relação ao schema.prisma.
ARG RAILWAY_GIT_COMMIT_SHA=local
RUN echo "prisma-gen: ${RAILWAY_GIT_COMMIT_SHA}" && npx prisma generate
RUN npm run build
RUN mkdir -p dist/service-orders/templates && cp src/service-orders/templates/os-template.html dist/service-orders/templates/

# Production stage
FROM node:20-alpine
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/release.js ./release.js
COPY backend/seed-demo.js ./seed-demo.js
COPY backend/clean-reseed.js ./clean-reseed.js
COPY backend/repair-logins.js ./repair-logins.js
COPY backend/bootstrap-users.js ./bootstrap-users.js
COPY backend/migrate-metrology.js ./migrate-metrology.js
EXPOSE 3000
# prisma db push + idle connection cleanup run via release.js (Railway releaseCommand)
CMD ["node", "dist/main"]
