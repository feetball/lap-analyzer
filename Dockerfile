# Use Node.js 20 LTS (better-sqlite3 requires Node 20+)
FROM node:20-alpine

# Install dependencies for native modules and Python distutils
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data && chmod 755 data

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
