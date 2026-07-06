FROM node:20-alpine

# Installiere openssl für die automatische Zertifikatserstellung
RUN apk add --no-cache openssl

# Setze Umgebungsvariablen für Produktion und Standardpfade
ENV NODE_ENV=production
ENV PORT=8443
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/data/uploads
ENV SSL_DIR=/app/data/ssl

# Arbeitsverzeichnis im Container festlegen
WORKDIR /app

# Kopiere package.json und package-lock.json für effizientes Caching und reproduzierbare Builds
COPY package.json package-lock.json ./

# Installiere ausschließlich Produktions-Abhängigkeiten via clean-install (ci)
RUN npm ci --omit=dev

# Kopiere die Anwendungsdateien (Frontend und Backend)
COPY public/ ./public/
COPY src/ ./src/
COPY server.js ./

# Erstelle das Datenverzeichnis für die persistenten Volumes
RUN mkdir -p /app/data

# Exponiere den Standard-Port des Dashboards und den HTTP-Redirect-Port
EXPOSE 8443 8080

# Starte den Dashboard-Server
CMD ["node", "server.js"]
