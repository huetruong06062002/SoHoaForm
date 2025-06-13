FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (remove --only=production)
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 3 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm config set network-timeout 300000 && \
    npm ci --silent

# Copy source code
COPY . .

# Build the app for production
RUN npm run build

# Expose port 
EXPOSE 4173

# Start the application với port 3000 explicit
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]