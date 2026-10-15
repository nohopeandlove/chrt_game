FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm_config_https_proxy="$HTTPS_PROXY" npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node src/reporting.ts ./src/reporting.ts
COPY --chown=node:node src/types.ts ./src/types.ts
COPY --chown=node:node src/screens/shared.ts ./src/screens/shared.ts
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "server/app.mjs"]
