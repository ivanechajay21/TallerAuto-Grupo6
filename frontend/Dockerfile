FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_USE_APACHE_POI=false
ENV VITE_USE_APACHE_POI=${VITE_USE_APACHE_POI}
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Add custom nginx config for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
