# =========================
# Build stage
# =========================
FROM node:20-alpine AS build
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Build para web
RUN npx expo export -p web

# =========================
# Runtime stage
# =========================
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copiar build
COPY --from=build /app/dist ./

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
