/**
 * Beispieldatei zur Veranschaulichung der Sprachumschaltung
 * Speicherort: public/translations.js
 */

const translations = {
  de: {
    // Header
    "deck_title": "Smart Home",
    "deck_subtitle": "Kommandozentrale",
    
    // Widgets
    "widget_weather": "Wetter & Standort",
    "widget_waste": "Abfallkalender",
    "widget_radio": "Live Radio",
    "widget_system": "System Status",
    "widget_tasmota": "Geräte",
    "widget_presence": "Anwesenheit",
    "widget_camera": "Kamera-Monitor",
    
    // Einstellungs-Menü
    "settings_title": "Einstellungen",
    "settings_desc": "Dashboard, Geräte und Datenquellen",
    "settings_theme": "Dashboard Design",
    "settings_layout": "Sichtbare Widgets",
    "settings_save": "Speichern",
    
    // Radio & Tasmota
    "radio_choose": "Sender wählen",
    "radio_play": "Wiedergabe",
    "radio_stop": "Stoppen",
    "tasmota_scan": "Netzwerk scannen",
    "tasmota_empty": "Keine Geräte gefunden"
  },
  en: {
    // Header
    "deck_title": "Smart Home",
    "deck_subtitle": "Command Center",
    
    // Widgets
    "widget_weather": "Weather & Location",
    "widget_waste": "Waste Calendar",
    "widget_radio": "Live Radio",
    "widget_system": "System Status",
    "widget_tasmota": "Devices",
    "widget_presence": "Presence",
    "widget_camera": "Camera Monitor",
    
    // Settings Menu
    "settings_title": "Settings",
    "settings_desc": "Dashboard, devices and data sources",
    "settings_theme": "Dashboard Design",
    "settings_layout": "Visible Widgets",
    "settings_save": "Save Changes",
    
    // Radio & Tasmota
    "radio_choose": "Select Station",
    "radio_play": "Play",
    "radio_stop": "Stop",
    "tasmota_scan": "Scan Network",
    "tasmota_empty": "No devices found"
  }
};

/**
 * Funktion zur Anwendung der Sprache auf alle Elemente mit dem Attribut [data-i18n]
 */
function setLanguage(lang) {
  if (!translations[lang]) lang = 'de'; // Fallback
  
  // Alle HTML-Elemente mit data-i18n Attribut suchen und Text ersetzen
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      // Wenn das Element ein Input ist, ersetzen wir den Platzhalter
      if (element.tagName === 'INPUT' && element.placeholder) {
        element.placeholder = translations[lang][key];
      } else {
        element.textContent = translations[lang][key];
      }
    }
  });

  // Speichern im LocalStorage
  localStorage.setItem('dashboard_lang', lang);
}
