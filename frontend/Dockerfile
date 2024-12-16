# Frontend Dockerfile
FROM node:18 as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:latest
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
