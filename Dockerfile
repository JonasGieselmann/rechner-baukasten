# Stage 1: Install dependencies (shared between frontend and server builds)
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies once (cached if package.json unchanged)
RUN npm ci

# Stage 2: Build the frontend
FROM deps AS frontend-builder

# Build argument for API URL (optional - defaults to relative URLs)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Copy source files
COPY . .

# Build the frontend (VITE_API_URL is embedded at build time)
RUN npm run build

# Stage 3: Build the server
FROM deps AS server-builder

# Copy only what's needed for server build
COPY server ./server
COPY tsconfig.server.json ./

# Build the server
RUN npm run build:server

# Stage 4: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Copy built server from builder stage
COPY --from=server-builder /app/dist/server ./dist/server

# Copy public assets (including custom calculators)
COPY public ./public

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start via entrypoint (creates Traefik config if DOMAIN is set)
ENTRYPOINT ["/docker-entrypoint.sh"]
