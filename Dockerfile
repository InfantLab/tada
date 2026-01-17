# Build stage - use Alpine for consistency with production
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install build dependencies (CA certs for HTTPS, build tools for native modules)
RUN apk add --no-cache ca-certificates

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

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nuxt

# Copy built application
COPY --from=builder /app/.output ./.output

# Copy node_modules for native bindings (libsql needs platform-specific binaries)
COPY --from=builder /app/node_modules ./node_modules

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
