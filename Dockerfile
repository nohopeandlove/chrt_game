FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm_config_https_proxy="$HTTPS_PROXY" npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
