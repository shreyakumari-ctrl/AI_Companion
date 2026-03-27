FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --workspace backend --include-workspace-root=false

COPY backend backend

RUN npm run db:generate --workspace backend
RUN npm run build --workspace backend

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/prisma backend/prisma
COPY --from=builder /app/backend/scripts backend/scripts

EXPOSE 5000

CMD ["sh", "-c", "npm run db:migrate --workspace backend && npm run start --workspace backend"]
