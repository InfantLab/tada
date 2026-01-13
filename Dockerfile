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

# Install production dependencies for the server bundle
RUN cd .output/server && bun install --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install CA certificates, bash, git, and sqlite3 for migrations
RUN apk add --no-cache ca-certificates bash git openssh-client sqlite

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Copy built application
COPY --from=builder /app/.output ./.output

# Copy migrations and migration runner
COPY --from=builder /app/server/db/migrations ./server/db/migrations
COPY app/migrate.js ./migrate.js

# Copy startup script
COPY app/migrate-and-start.sh ./migrate-and-start.sh
RUN chmod +x ./migrate-and-start.sh

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/db.sqlite
ENV HOST=0.0.0.0
ENV PORT=3000

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1

# Start the application (migrations run first)
CMD ["./migrate-and-start.sh"]
