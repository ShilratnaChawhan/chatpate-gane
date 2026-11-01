# ==========================
# Stage 1 - Build Angular App
# ==========================

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install --legacy-peer-deps

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npx ng build

FROM nginx:1.23-alpine

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# IMPORTANT:
# Replace "angular-ui" with your actual dist folder name
COPY --from=build /app/dist/Angular-UI/browser /usr/share/nginx/html

EXPOSE 80


