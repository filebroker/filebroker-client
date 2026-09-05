# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /opt/filebroker-client

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build -- --base=./


FROM nginx:alpine

COPY --from=build \
    /opt/filebroker-client/build \
    /usr/share/nginx/html/filebroker

RUN mv \
    /usr/share/nginx/html/filebroker/index.html \
    /usr/share/nginx/html/filebroker/index.html.template

COPY docker/filebroker-env.js.template \
    /etc/filebroker/filebroker-env.js.template

COPY docker/40-filebroker-runtime-env.sh \
    /docker-entrypoint.d/40-filebroker-runtime-env.sh

RUN chmod +x /docker-entrypoint.d/40-filebroker-runtime-env.sh
