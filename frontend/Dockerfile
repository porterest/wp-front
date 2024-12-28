# Stage 1: Install dependencies
FROM node:18 AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 300000

# Stage 2: Build application
COPY . .
RUN yarn build

# Stage 3: Serve with Nginx
FROM nginx:latest
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
