FROM node:20-alpine

WORKDIR /app

# Copy package manifest
COPY package.json ./

# Copy Prisma schema & configuration
COPY prisma ./prisma/
COPY prisma.config.ts tsconfig.json ./

# Set build-time DATABASE_URL for Prisma Client generation
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/chaim_db?schema=public"

# Install dependencies with npm
RUN npm install --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript code
RUN npm run build

# Expose API Port
EXPOSE 5000

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=5000

# Start production server
CMD ["node", "dist/server.js"]
