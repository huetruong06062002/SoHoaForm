# Build stage
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build tools)
RUN npm ci

# Copy source code
COPY . .

# Build the app for production
RUN npm run build

# Expose port 
EXPOSE 3000

# Start the application
CMD ["npm", "run", "preview"]