# Build from the repository root:  docker build -f web/Dockerfile --build-arg API_URL=http://api:4000 .
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY web/package.json web/
RUN npm ci -w web -w @nutrition/shared

FROM deps AS build
ARG API_URL=http://api:4000
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
COPY packages/shared packages/shared
COPY web web
RUN npm run build -w @nutrition/shared && npm run build -w web

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static web/.next/static
COPY --from=build --chown=node:node /app/web/public web/public
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]
