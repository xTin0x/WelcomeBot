FROM node:slim
ENV NODE_ENV=local
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT npm run start:$NODE_ENV