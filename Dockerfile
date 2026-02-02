# Build stage - use Alpine for consistency with production
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Build arguments for version info
ARG GIT_HASH=unknown
ARG GIT_SHORT_HASH=unknown

# Install build dependencies (CA certs for HTTPS, build tools for native modules, git for version)
RUN apk add --no-cache ca-certificates git

# Copy package files
COPY app/package.json app/bun.lock* ./

# Install dependencies (native bindings will be compiled for musl/Alpine)
RUN bun install --frozen-lockfile

# Copy source
COPY app/ ./

# Build the application (skip type check - generated files cause issues)
RUN bun run build:docker

# Production stage - Alpine for minimal attack surface
FROM oven/bun:1-alpine AS production

# Build arguments (passed from builder)
ARG GIT_HASH=unknown
ARG GIT_SHORT_HASH=unknown

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nuxt

# Copy built application
COPY --from=builder /app/.output ./.output

# Copy full node_modules into .output/server for proper module resolution
# Nitro creates partial node_modules there, we need the complete set including transitive deps
COPY --from=builder /app/node_modules ./.output/server/node_modules

# Copy migration files and script for database setup
COPY --from=builder /app/migrate.js ./migrate.js
COPY --from=builder /app/server/db/migrations ./server/db/migrations

# Create data directory for SQLite at /data (CapRover persistent volume mount point)
# WARNING: Do NOT change this path - it must match CapRover's persistent directory config
# The host path /var/lib/caprover/appsdata/tadata maps to /data in the container
RUN mkdir -p /data/logs && chown -R nuxt:nodejs /data

# Set environment variables
# WARNING: DATABASE_URL must point to /data/db.sqlite for persistence across deploys
# Changing this path will cause DATA LOSS - the database will be ephemeral
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/db.sqlite
ENV HOST=0.0.0.0
ENV PORT=3000
ENV GIT_HASH=${GIT_HASH}
ENV GIT_SHORT_HASH=${GIT_SHORT_HASH}

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Run migrations then start the application
CMD ["sh", "-c", "bun run migrate.js && bun run .output/server/index.mjs"]
