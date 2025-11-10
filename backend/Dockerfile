FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

CMD ["npm", "run", "start:dev"]

FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies first (including dev) for building
RUN npm install --legacy-peer-deps

COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

CMD ["node", "dist/main"]

