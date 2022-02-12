FROM node:12.22.8-slim
ENV NODE_ENV=local
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT npm run start:$NODE_ENV
