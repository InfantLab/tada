# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Install CA certificates for HTTPS git operations
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY app/package.json app/bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY app/ ./

# Build the application (skip type check - generated files cause issues)
RUN bun run build:docker

# Production stage
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Install CA certificates and bash for HTTPS operations and development
RUN apk add ca-certificates bash

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Copy built application
COPY --from=builder /app/.output ./.output

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R nuxt:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/db.sqlite
ENV HOST=0.0.0.0
ENV PORT=3000

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Start the application
CMD ["bun", "run", ".output/server/index.mjs"]
