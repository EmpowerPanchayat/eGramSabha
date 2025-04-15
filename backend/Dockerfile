FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create upload directories
RUN mkdir -p uploads/faces

EXPOSE 5000

CMD ["node", "server.js"]
