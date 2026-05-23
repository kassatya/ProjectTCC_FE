FROM node:18-alpine
WORKDIR /frontend/
COPY . /frontend/
RUN npm install
CMD ["npm", "start"]