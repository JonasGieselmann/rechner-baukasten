# Stage 1: Build the frontend
# Platform is determined by docker buildx --platform flag
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Build the server
# Platform is determined by docker buildx --platform flag
FROM node:22-alpine AS server-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy server source
COPY server ./server
COPY tsconfig.server.json ./

# Build the server
RUN npm run build:server

# Stage 3: Production image
# Platform is determined by docker buildx --platform flag
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

# Start the server
CMD ["node", "dist/server/index.js"]
