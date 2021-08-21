FROM node:slim
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT ["node", "index.js"]