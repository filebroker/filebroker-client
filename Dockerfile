FROM node:18-alpine3.14 as build

WORKDIR /opt/filebroker-client
COPY /. ./

RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /opt/filebroker-client/build /usr/share/nginx/html/filebroker
CMD ["nginx", "-g", "daemon off;"]
