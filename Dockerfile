FROM node:12.16.3

RUN apt update -y
RUN apt install -y libreoffice

RUN mkdir /app
WORKDIR /app

RUN mkdir modified
RUN mkdir uploads
COPY package*.json ./
RUN npm install

COPY . .

RUN test -e .env.dev && cp .env.dev .env || echo "Production"
RUN test -e .env.prod && cp .env.prod .env || echo "Development"

ENV PORT 3000
EXPOSE ${PORT}
CMD ["node", "app.js"]
