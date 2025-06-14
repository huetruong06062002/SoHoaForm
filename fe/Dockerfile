FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --prefer-offline --no-audit --legacy-peer-deps

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]