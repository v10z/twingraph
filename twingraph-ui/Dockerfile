# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

# Build stage
FROM node:22-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || :

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]