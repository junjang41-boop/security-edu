FROM node:20-alpine
RUN apk add --no-cache poppler-utils
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads/materials
EXPOSE 4000
CMD ["node", "index.js"]
