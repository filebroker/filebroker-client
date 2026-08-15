# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /opt/filebroker-client

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build


FROM nginx:alpine

COPY --from=build \
    /opt/filebroker-client/build \
    /usr/share/nginx/html/filebroker
