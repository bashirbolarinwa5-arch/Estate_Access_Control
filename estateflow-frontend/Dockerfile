# =============================================================
#  EstateFlow — Frontend (React + Vite, served by nginx)
#  Build:  docker build -t estateflow-web ./estateflow-frontend
#  Run:    see docker-compose.yml
# =============================================================

# ---------- Stage 1: build the static bundle ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies from the lockfile (reproducible,
# cached as long as package.json / package-lock.json
# don't change).
COPY package.json package-lock.json ./
RUN npm ci

# The API URL is a BUILD-time value (Vite inlines env vars).
# The default is http://localhost:8081 — override with:
#   docker build --build-arg VITE_API_BASE_URL=https://api.example.com .
ARG VITE_API_BASE_URL=http://localhost:8081
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ---------- Stage 2: tiny nginx runtime ----------
FROM nginx:alpine AS runtime

# SPA configuration: unknown paths fall back to index.html
# so React Router paths like /security or /visits work on
# refresh / direct entry.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
