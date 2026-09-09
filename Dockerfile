FROM node:22-alpine

WORKDIR /app

# Install bash and coreutils (for GNU timeout) needed by the build scripts
RUN apk add --no-cache bash coreutils

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build the project
RUN chmod +x scripts/*.sh
RUN npm run build

# Expose ports that Wrangler/miniflare typically uses
EXPOSE 8787 5173 3000

# Start the application using the package.json script
CMD ["npm", "run", "start"]
