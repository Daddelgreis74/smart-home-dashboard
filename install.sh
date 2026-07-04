#!/bin/bash
# Neo Deck - Smart Home Dashboard Linux Installer 🏠👻
#
# Aufruf über:
# bash <(curl -fsSL https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.sh)

set -e

# Farben & Stile für Terminalausgabe
GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
PURPLE='\033[1;35m'
BLUE='\033[1;34m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'
UNDERLINE='\033[4m'

# Status-Labels
INFO="${CYAN}[ INFO ]${NC}"
SUCCESS="${GREEN}[  OK  ]${NC}"
WARNING="${YELLOW}[ WARN ]${NC}"
ERROR="${RED}[ FEHL ]${NC}"
PROMPT="${PURPLE}[ EING ]${NC}"

# Banner ausgeben
clear
echo -e "${CYAN}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}${BOLD} _  _ ____ ____    ___  ____ ____ _  _              ${NC}${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}${BOLD} |\ | |___ |  |    |  \ |___ |    |_/               ${NC}${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  ${WHITE}${BOLD} | \| |___ |__|    |__/ |___ |___ | \               ${NC}${CYAN}│${NC}"
echo -e "${CYAN}│${NC}                                                        ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}        ${GREEN}🏠 Smart Home Dashboard - Setup-Assistent${NC}       ${CYAN}│${NC}"
echo -e "${CYAN}└────────────────────────────────────────────────────────┘${NC}"
echo ""

# Hilfsfunktion zur Prüfung von Befehlen
check_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Phase 1: System-Prüfung
echo -e "${BLUE}${BOLD}=== Phase 1: System-Analyse ===${NC}"
echo -e "${INFO} Analysiere Systemkomponenten..."

PACKAGE_MANAGER=""
if check_cmd apt-get; then
    PACKAGE_MANAGER="apt"
elif check_cmd dnf; then
    PACKAGE_MANAGER="dnf"
elif check_cmd pacman; then
    PACKAGE_MANAGER="pacman"
fi

# Abhängigkeiten prüfen (Git, Node.js, npm)
echo -e "  ➜  Paketmanager:   ${CYAN}${PACKAGE_MANAGER:-Keiner (Manuelles Setup erforderlich)}${NC}"
echo -e "  ➜  Git:            $(check_cmd git && echo -e "${GREEN}Installiert [✔]${NC}" || echo -e "${YELLOW}Fehlt [!]${NC}")"
echo -e "  ➜  Node.js:        $(check_cmd node && echo -e "${GREEN}Installiert [✔] (${WHITE}$(node -v)${GREEN})${NC}" || echo -e "${YELLOW}Fehlt [!]${NC}")"
echo -e "  ➜  npm:            $(check_cmd npm && echo -e "${GREEN}Installiert [✔] (${WHITE}v$(npm -v)${GREEN})${NC}" || echo -e "${YELLOW}Fehlt [!]${NC}")"
echo ""

needs_install=false
if ! check_cmd git || ! check_cmd node || ! check_cmd npm; then
    needs_install=true
fi

if [ "$needs_install" = true ]; then
    echo -e "${WARNING} Benötigte Programme fehlen."
    
    if [ -z "$PACKAGE_MANAGER" ]; then
        echo -e "${ERROR} Kein unterstützter Paketmanager gefunden (apt, dnf, pacman)."
        echo -e "         Bitte installiere Git, Node.js und npm manuell für dein System."
        exit 1
    fi
    
    echo -e "${INFO} Fehlende Programme werden nun installiert. Root-Rechte (sudo) werden benötigt..."
    
    if [ "$PACKAGE_MANAGER" = "apt" ]; then
        sudo apt-get update
        if ! check_cmd git; then
            echo -e "${INFO} Installiere git..."
            sudo apt-get install -y git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${INFO} Installiere Node.js und npm..."
            sudo apt-get install -y nodejs npm
        fi
    elif [ "$PACKAGE_MANAGER" = "dnf" ]; then
        if ! check_cmd git; then
            echo -e "${INFO} Installiere git..."
            sudo dnf install -y git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${INFO} Installiere Node.js und npm..."
            sudo dnf install -y nodejs npm
        fi
    elif [ "$PACKAGE_MANAGER" = "pacman" ]; then
        sudo pacman -Sy --noconfirm
        if ! check_cmd git; then
            echo -e "${INFO} Installiere git..."
            sudo pacman -S --noconfirm git
        fi
        if ! check_cmd node || ! check_cmd npm; then
            echo -e "${INFO} Installiere Node.js und npm..."
            sudo pacman -S --noconfirm nodejs npm
        fi
    fi
    echo -e "${SUCCESS} Alle Abhängigkeiten erfolgreich installiert!"
    echo ""
else
    echo -e "${SUCCESS} Systemvoraussetzungen erfüllt. Keine Installationen nötig."
    echo ""
fi

# Phase 2: Installationspfad
echo -e "${BLUE}${BOLD}=== Phase 2: Zielverzeichnis ===${NC}"
DEFAULT_DIR="$HOME/smart-home-dashboard"
echo -e "${PROMPT} Bitte gib den Installationspfad an."
read -p "      Standard [$DEFAULT_DIR]: " USER_DIR
INSTALL_DIR=${USER_DIR:-$DEFAULT_DIR}

# Verzeichnis erstellen
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
echo -e "${SUCCESS} Installationspfad gesetzt auf: ${WHITE}$INSTALL_DIR${NC}"
echo ""

# Phase 3: Quellcode beziehen
echo -e "${BLUE}${BOLD}=== Phase 3: Download & Update ===${NC}"
if [ -d ".git" ]; then
    echo -e "${INFO} Bestehendes Repository gefunden. Aktualisiere..."
    git pull
else
    echo -e "${INFO} Klone Repository von GitHub..."
    git clone https://github.com/Daddelgreis74/smart-home-dashboard.git .
fi
echo -e "${SUCCESS} Quellcode erfolgreich geladen."
echo ""

# Phase 4: npm-Pakete installieren
echo -e "${BLUE}${BOLD}=== Phase 4: npm-Installation ===${NC}"
echo -e "${INFO} Installiere externe Node.js Bibliotheken (npm install)..."
npm install
echo -e "${SUCCESS} Alle npm-Pakete erfolgreich eingerichtet."
echo ""

# Phase 5: Systemd Autostart-Service
if check_cmd systemctl; then
    echo -e "${BLUE}${BOLD}=== Phase 5: Autostart einrichten ===${NC}"
    echo -e "${PROMPT} Möchtest du das Dashboard als Autostart-Hintergrunddienst (systemd) einrichten?"
    read -p "      Einrichten? (j/n) [Standard: j]: " SET_SERVICE
    SET_SERVICE=${SET_SERVICE:-j}
    
    if [[ "$SET_SERVICE" =~ ^[jJyY] ]]; then
        SERVICE_FILE="/etc/systemd/system/smart-home-dashboard.service"
        echo -e "${INFO} Erstelle Systemd-Service unter ${WHITE}$SERVICE_FILE${NC}..."
        
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
Environment=PORT=8443 HOST=0.0.0.0 AUTO_SSL=true

[Install]
WantedBy=multi-user.target
EOT"
        
        echo -e "${INFO} Aktiviere und starte den Dienst..."
        sudo systemctl daemon-reload
        sudo systemctl enable smart-home-dashboard.service
        sudo systemctl restart smart-home-dashboard.service
        
        echo -e "${SUCCESS} Hintergrunddienst wurde eingerichtet und gestartet!"
    else
        echo -e "${INFO} Autostart-Dienst übersprungen."
    fi
    echo ""
fi

# IP-Adresse ermitteln
IP_ADDR=$(hostname -I | awk '{print $1}' || echo "deine-server-ip")

# Erfolgsmeldung
echo -e "${GREEN}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│${NC}          ${BOLD}${WHITE}INSTALLATION ERFOLGREICH BEENDET! 🎉${NC}          ${GREEN}│${NC}"
echo -e "${GREEN}└────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e " Das Dashboard wurde erfolgreich installiert."
if systemctl is-active --quiet smart-home-dashboard.service 2>/dev/null; then
    echo -e " Es läuft aktuell als Hintergrunddienst."
    echo ""
    echo -e " ${BOLD}Dienst-Befehle:${NC}"
    echo -e "   ➜  Neu starten:   ${WHITE}sudo systemctl restart smart-home-dashboard.service${NC}"
    echo -e "   ➜  Stoppen:       ${WHITE}sudo systemctl stop smart-home-dashboard.service${NC}"
    echo -e "   ➜  Status:        ${WHITE}sudo systemctl status smart-home-dashboard.service${NC}"
else
    echo -e " Du kannst das Dashboard manuell im Ordner starten mit:"
    echo -e "   ${WHITE}PORT=8443 AUTO_SSL=true npm start${NC}"
fi
echo ""
echo -e " ${BOLD}Web-Oberfläche:${NC}"
echo -e "   ➜  Adresse:       ${CYAN}https://$IP_ADDR:8443${NC} (HTTPS ist für J.A.R.V.I.S. zwingend!)"
echo ""
echo -e "${GREEN}==========================================================${NC}"
