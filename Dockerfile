# Stage 1: Build all packages
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

# Build shared → server → client
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/
RUN npm run build

# Prune dev dependencies before copying to runner
RUN npm prune --omit=dev

# Stage 2: Minimal production image
FROM node:20-alpine AS runner
WORKDIR /app

# Workspace manifests (needed for npm workspace module resolution)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/server/package.json ./server/

# Production node_modules (workspace symlinks included)
COPY --from=builder /app/node_modules ./node_modules

# Compiled packages
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

# Static client files — server resolves these at path.join(__dirname, '../../client/dist')
COPY --from=builder /app/client/dist ./client/dist

# SQLite data directory (mount a volume here in production)
RUN mkdir -p server/data

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
