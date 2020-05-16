FROM node:11

RUN apt update -y
RUN apt install -y libreoffice

RUN mkdir /app
WORKDIR /app

RUN mkdir modified
RUN mkdir uploads
COPY package*.json ./
RUN npm install

COPY . .

ENV PORT 3000
EXPOSE ${PORT}
CMD ["node", "app.js"]
