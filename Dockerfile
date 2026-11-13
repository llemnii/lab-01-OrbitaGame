FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN corepack enable && pnpm install --no-frozen-lockfile
COPY client client
COPY server server
COPY shared shared
COPY eslint.config.js .prettierrc ./
RUN pnpm --dir client run build

FROM node:24-alpine AS runtime
ARG BUILD_SHA=unknown
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 BUILD_SHA=$BUILD_SHA
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN corepack enable && pnpm install --prod --no-frozen-lockfile
COPY --from=build /app/server/src server/src
COPY --from=build /app/shared shared
COPY --from=build /app/client/dist client/dist
RUN mkdir -p logs && addgroup -S orbita && adduser -S orbita -G orbita && chown -R orbita:orbita /app
USER orbita
EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "server/src/index.js"]
