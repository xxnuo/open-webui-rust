# Build stage - Build the SvelteKit frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the frontend (creates static files in /app/build)
# Increase Node.js memory limit to avoid out-of-memory errors
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Runtime stage - Serve the built static frontend with nginx
FROM nginx:alpine

# Copy built static files from builder
COPY --from=frontend-builder /app/build /usr/share/nginx/html

# Create nginx configuration for SPA
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

