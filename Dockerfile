FROM node:18-alpine3.14

WORKDIR /opt/filebroker-client
COPY /. ./

RUN npm install
RUN npm run build

CMD ["npm", "start"]
