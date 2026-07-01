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
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Config._data)
      });
    } catch (e) {
      console.warn('Config.setMany: Server-Fehler, nur im RAM gespeichert');
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
      'sensorIp', 'tasmotaBackup'
    ];
    const toMigrate = {};
    for (const key of KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null && Config._data[key] === undefined) {
        toMigrate[key] = val;
      }
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
          localStorage.removeItem(key);
        }
        console.log(`Config: ${Object.keys(toMigrate).length} Einstellungen aus localStorage migriert`);
      } catch (e) {
        console.error('Config-Migration fehlgeschlagen:', e.message);
      }
    }
  }
}
