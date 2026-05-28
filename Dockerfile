# Basis-Image: Leichtgewichtiges und sicheres Node.js auf Alpine Linux
FROM node:20-alpine

# Setze Umgebungsvariablen für Produktion und Standardpfade
ENV NODE_ENV=production
ENV PORT=8443
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/data/uploads
ENV SSL_DIR=/app/data/ssl

# Arbeitsverzeichnis im Container festlegen
WORKDIR /app

# Kopiere package.json und package-lock.json für effizientes Caching
COPY package*.json ./

# Installiere ausschließlich Produktions-Abhängigkeiten
RUN npm ci --only=production

# Kopiere die Anwendungsdateien (Frontend und Backend)
COPY public/ ./public/
COPY server.js ./

# Erstelle das Datenverzeichnis für die persistenten Volumes
RUN mkdir -p /app/data

# Exponiere den Standard-Port des Dashboards
EXPOSE 8443

# Starte den Dashboard-Server
CMD ["node", "server.js"]
