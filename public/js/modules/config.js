export class Config {
  static _data = {};
  static _loaded = false;

  /** Lädt die gesamte Config vom Server */
  static async load() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        Config._data = await res.json();
      }
    } catch (e) {
      console.warn('Config: Server nicht erreichbar, nutze localStorage-Fallback');
    }
    Config._loaded = true;
  }

  /** Liest einen Wert aus der Config (mit optionalem Standardwert) */
  static get(key, defaultValue = null) {
    const val = Config._data[key];
    if (val === undefined || val === null) return defaultValue;
    return val;
  }

  /** Speichert einen einzelnen Wert auf dem Server (und im lokalen Cache) */
  static async set(key, value) {
    Config._data[key] = value;
    try {
      await fetch(`/api/config/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
    } catch (e) {
      console.warn('Config.set: Server-Fehler, nur im RAM gespeichert');
    }
  }

  /** Schreibt mehrere Werte auf einmal zum Server */
  static async setMany(obj) {
    Object.assign(Config._data, obj);
    
    // Read-only Keys für das Senden an den Server herausfiltern
    const toSend = { ...Config._data };
    delete toSend.server_permission_error;

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend)
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Config.setMany failed:', err.error || res.statusText);
      }
    } catch (e) {
      console.warn('Config.setMany: Server-Fehler, nur im RAM gespeichert', e.message);
    }
  }

  /**
   * Einmalige Migration: Liest noch vorhandene localStorage-Keys
   * und überträgt sie zur Server-Config, danach werden sie gelöscht.
   */
  static async migrate() {
    const KEYS = [
      'dashboard_lang', 'jarvis_provider', 'jarvis_gemini_api_key',
      'jarvis_openrouter_api_key', 'jarvis_model', 'jarvis_custom_model',
      'jarvis_system_prompt', 'jarvis_tts_enabled', 'jarvis_tts_provider',
      'jarvis_unified_voice', 'jarvis_local_voice_name', 'jarvis_eleven_api_key',
      'jarvis_eleven_voice_id', 'jarvis_eleven_voices_cache',
      'jarvis_search_enabled', 'jarvis_brave_api_key', 'jarvis_chat_history',
      'sensorIp', 'tasmotaBackup', 'weather_provider', 'weather_api_key',
      'presence_sound_enabled'
    ];
    const toMigrate = {};
    for (const key of KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null && Config._data[key] === undefined) {
        toMigrate[key] = val;
      }
    }

    // Spezieller Mapping-Fall für weatherLoc -> weather_location
    const legacyLoc = localStorage.getItem('weatherLoc');
    if (legacyLoc !== null && Config._data['weather_location'] === undefined) {
      toMigrate['weather_location'] = legacyLoc;
    }

    if (Object.keys(toMigrate).length > 0) {
      Object.assign(Config._data, toMigrate);
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Config._data)
        });
        // Lokalen localStorage bereinigen
        for (const key of Object.keys(toMigrate)) {
          if (key === 'weather_location') {
            localStorage.removeItem('weatherLoc');
          } else {
            localStorage.removeItem(key);
          }
        }
        console.log(`Config: ${Object.keys(toMigrate).length} Einstellungen aus localStorage migriert`);
      } catch (e) {
        console.error('Config-Migration fehlgeschlagen:', e.message);
      }
    }
  }
}
