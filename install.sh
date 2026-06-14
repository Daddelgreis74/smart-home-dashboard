#!/bin/bash
# Neo Deck - Smart Home Dashboard Linux Installer 🏠👻
#
# Aufruf über:
# curl -fsSL https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.sh | bash

set -e

# Farben für Terminalausgabe
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}===================================================${NC}"
echo -e "${CYAN}    Neo Deck Smart Home Dashboard - Linux Setup    ${NC}"
echo -e "${CYAN}===================================================${NC}"
echo ""

# Hilfsfunktion zur Prüfung von Befehlen
check_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Paketmanager ermitteln
PACKAGE_MANAGER=""
if check_cmd apt-get; then
    PACKAGE_MANAGER="apt"
elif check_cmd dnf; then
    PACKAGE_MANAGER="dnf"
elif check_cmd pacman; then
    PACKAGE_MANAGER="pacman"
fi

# 2. Abhängigkeiten prüfen (Git, Node.js, npm)
needs_install=false
if ! check_cmd git || ! check_cmd node || ! check_cmd npm; then
    needs_install=true
fi

if [ "$needs_install" = true ]; then
    echo -e "${YELLOW}[INFO] Es fehlen noch benötigte Programme auf diesem System.${NC}"
    
    if [ -z "$PACKAGE_MANAGER" ]; then
        echo -e "${RED}[FEHLER] Kein unterstützter Paketmanager gefunden (apt, dnf, pacman).${NC}"
        echo "Bitte installiere Git, Node.js und npm manuell für dein System."
        exit 1
    fi
    
    echo "Fehlende Programme werden nun installiert. Root-Rechte (sudo) werden benötigt."
    
    if [ "$PACKAGE_MANAGER" = "apt" ]; then
        sudo apt-get update
        if ! check_cmd git; then
            echo -e "${CYAN}[INSTALL] Installiere git...${NC}"
            sudo apt-get install -y git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${CYAN}[INSTALL] Installiere Node.js und npm...${NC}"
            sudo apt-get install -y nodejs npm
        fi
    elif [ "$PACKAGE_MANAGER" = "dnf" ]; then
        if ! check_cmd git; then
            echo -e "${CYAN}[INSTALL] Installiere git...${NC}"
            sudo dnf install -y git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${CYAN}[INSTALL] Installiere Node.js und npm...${NC}"
            sudo dnf install -y nodejs npm
        fi
    elif [ "$PACKAGE_MANAGER" = "pacman" ]; then
        sudo pacman -Sy --noconfirm
        if ! check_cmd git; then
            echo -e "${CYAN}[INSTALL] Installiere git...${NC}"
            sudo pacman -S --noconfirm git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${CYAN}[INSTALL] Installiere Node.js und npm...${NC}"
            sudo pacman -S --noconfirm nodejs npm
        fi
    fi
    echo -e "${GREEN}[OK] Alle Abhängigkeiten erfolgreich installiert!${NC}"
else
    echo -e "${GREEN}[OK] Git, Node.js und npm sind bereits installiert!${NC}"
fi

# 3. Installations-Methode wählen
echo ""
echo "Wie möchtest du das Dashboard installieren?"
echo -e "1) ${CYAN}Lokal mit Node.js${NC} (Direkt auf dem System als Hintergrund-Dienst)"
echo -e "2) ${CYAN}Über Docker Compose${NC} (Im isolierten Container)"
read -p "Auswahl (1 oder 2, Standard: 1): " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

# 4. Installationspfad festlegen
INSTALL_DIR="$HOME/smart-home-dashboard"
echo ""
read -p "Installationsverzeichnis (Standard: $INSTALL_DIR): " USER_DIR
INSTALL_DIR=${USER_DIR:-$INSTALL_DIR}

# Verzeichnis erstellen
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 5. Repository klonen oder updaten
echo -e "${CYAN}[INFO] Lade Quellcode von GitHub herunter...${NC}"
if [ -d ".git" ]; then
    echo -e "${YELLOW}[INFO] Repository existiert bereits. Aktualisiere...${NC}"
    git pull
else
    git clone https://github.com/Daddelgreis74/smart-home-dashboard.git .
fi

# 6. Installation ausführen
if [ "$INSTALL_MODE" = "2" ]; then
    # Docker-Modus
    echo ""
    echo -e "${CYAN}[INFO] Richte Docker-Installation ein...${NC}"
    
    if ! check_cmd docker; then
        echo -e "${RED}[FEHLER] Docker ist auf diesem System nicht installiert!${NC}"
        echo "Bitte installiere Docker zuerst: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}[FEHLER] 'docker compose' ist nicht verfügbar!${NC}"
        echo "Bitte installiere das Docker Compose Plugin."
        exit 1
    fi
    
    echo -e "${CYAN}[INFO] Starte Docker Container im Hintergrund...${NC}"
    docker compose up -d
    
    echo -e "${GREEN}===================================================${NC}"
    echo -e "${GREEN}   DOCKER-INSTALLATION ERFOLGREICH! 🎉              ${NC}"
    echo -e "${GREEN}===================================================${NC}"
    echo ""
    echo "Das Dashboard läuft im Hintergrund im Docker-Container."
    echo "Erreichbar unter: http://localhost:8443 (oder unter deiner Server-IP)"
else
    # Lokaler Node.js Modus
    echo ""
    echo -e "${CYAN}[INFO] Richte lokale Node.js Installation ein...${NC}"
    
    echo -e "${CYAN}[INFO] Installiere npm-Pakete...${NC}"
    npm install
    
    # Optional: Systemd Service einrichten (nur wenn systemctl verfügbar ist)
    if check_cmd systemctl; then
        echo ""
        read -p "Möchtest du das Dashboard als Autostart-Hintergrunddienst (systemd) einrichten? (j/n, Standard: j): " SET_SERVICE
        SET_SERVICE=${SET_SERVICE:-j}
        
        if [[ "$SET_SERVICE" =~ ^[jJyY] ]]; then
            SERVICE_FILE="/etc/systemd/system/smart-home-dashboard.service"
            echo -e "${CYAN}[INFO] Erstelle Systemd-Service unter $SERVICE_FILE...${NC}"
            
            sudo bash -c "cat <<EOT > $SERVICE_FILE
[Unit]
Description=Neo Deck Smart Home Dashboard
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(command -v node) server.js
Restart=on-failure
Environment=PORT=8443 HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOT"
            
            echo -e "${CYAN}[INFO] Aktiviere und starte den Dienst...${NC}"
            sudo systemctl daemon-reload
            sudo systemctl enable smart-home-dashboard.service
            sudo systemctl start smart-home-dashboard.service
            
            echo -e "${GREEN}[OK] Hintergrunddienst wurde erfolgreich eingerichtet und gestartet!${NC}"
        fi
    fi
    
    # IP-Adresse ermitteln
    IP_ADDR=$(hostname -I | awk '{print $1}' || echo "deine-server-ip")
    
    echo -e "${GREEN}===================================================${NC}"
    echo -e "${GREEN}   LOKALE INSTALLATION ERFOLGREICH! 🎉              ${NC}"
    echo -e "${GREEN}===================================================${NC}"
    echo ""
    echo "Das Dashboard wurde erfolgreich installiert."
    if systemctl is-active --quiet smart-home-dashboard.service 2>/dev/null; then
        echo "Es läuft aktuell im Hintergrund als Systemdienst."
        echo "Dienst stoppen: sudo systemctl stop smart-home-dashboard"
        echo "Dienst starten: sudo systemctl start smart-home-dashboard"
    else
        echo "Du kannst es manuell im Projektordner mit folgendem Befehl starten:"
        echo "  PORT=8443 npm start"
    fi
    echo ""
    echo -e "Erreichbar unter: ${CYAN}http://$IP_ADDR:8443${NC} (oder http://localhost:8443)"
fi
