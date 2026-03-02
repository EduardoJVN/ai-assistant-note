# --- Stage 1: Build ---
FROM node:24-alpine AS builder
# Instalar dependencias necesarias para compilar algunos paquetes de node si fuera necesario
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# --- Stage 2: Production ---
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiamos solo lo esencial
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Usuario no-root por seguridad (Alpine lo trae por defecto)
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]