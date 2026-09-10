FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data/app.db
ENV UPLOADS_DIR=/app/data/uploads

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/db-migrate.mjs ./scripts/db-migrate.mjs
COPY --from=builder /app/scripts/create-admin.mjs ./scripts/create-admin.mjs
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

VOLUME ["/app/data"]
EXPOSE 3000
CMD ["/bin/sh", "-c", "node scripts/db-migrate.mjs && node server.js"]
