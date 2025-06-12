# Build stage
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry and timeout settings
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the app for production
RUN npm run build

# Expose port 
EXPOSE 3000

# Start the application
CMD ["npm", "run", "preview"]