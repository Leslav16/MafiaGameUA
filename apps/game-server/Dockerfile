# Build from the repo root: docker build -f apps/game-server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/game-server/package.json apps/game-server/
RUN npm ci
COPY apps/game-server apps/game-server
RUN npm run build -w game-server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["node", "apps/game-server/dist/index.js"]
