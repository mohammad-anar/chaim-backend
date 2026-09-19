FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and necessary build tools for Prisma & native packages
RUN apk add --no-cache openssl libc6-compat

# Copy package manifests
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Copy Prisma schema, migrations, and TypeScript configs
COPY prisma ./prisma/
COPY prisma.config.ts tsconfig.json ./

# Dummy DATABASE_URL for Prisma client compilation during build
ENV DATABASE_URL="postgresql://postgres:12345678@localhost:5432/chaim_db?schema=public"

# Install all dependencies
RUN npm install

# Generate Prisma Client from multi-file schemas
RUN npx prisma generate

# Copy application source code
COPY src ./src

# Build TypeScript to JavaScript in /dist
RUN npm run build

# Expose server port (Render will inject PORT at runtime)
EXPOSE 8000

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=8000

# Start server
CMD ["node", "dist/server.js"]
