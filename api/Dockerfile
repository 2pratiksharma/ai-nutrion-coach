# Build from the repository root:  docker build -f api/Dockerfile .
# The same image runs the API (default) and the worker (command: node dist/worker.js).
FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
RUN npm ci -w api -w @nutrition/shared

FROM deps AS build
COPY packages/shared packages/shared
COPY api api
RUN npm run build -w @nutrition/shared \
 && npx --prefix api prisma generate --schema api/prisma/schema.prisma \
 && npm run build -w api

FROM base AS prod-deps
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
RUN npm ci -w api -w @nutrition/shared --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/api/package.json api/package.json
COPY --from=build /app/api/dist api/dist
COPY --from=build /app/api/prisma api/prisma
RUN ln -sfn ../../packages/shared node_modules/@nutrition/shared
USER node
WORKDIR /app/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/ready || exit 1
CMD ["node", "dist/server.js"]
