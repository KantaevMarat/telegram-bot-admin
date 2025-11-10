FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

CMD ["npm", "run", "start:dev"]

FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies for building
RUN npm install --legacy-peer-deps

COPY . .

# Build the application
RUN npm run build

FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy built application from build stage
COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/main"]

