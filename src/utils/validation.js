function isIPv4(value) {
  if (typeof value !== 'string') return false;
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateIPv4(value) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateBaseIp(value) {
  if (typeof value !== 'string') return false;
  const candidate = `${value.trim()}.1`;
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value.trim()) && isPrivateIPv4(candidate);
}

function cleanName(value, fallback = 'Unbenannt') {
  const clean = String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 60);
  return clean || fallback;
}

function normalizeStreamUrl(value) {
  const raw = String(value || '').trim().slice(0, 500);
  // Repariert den häufigen Touch-Tippfehler "hthttps://..." ohne andere URLs still zu verbiegen.
  if (/^hthttps:\/\//i.test(raw)) return raw.slice(2);
  if (/^hthttp:\/\//i.test(raw)) return raw.slice(2);
  return raw;
}

function sanitizeTasmotaList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 80).reduce((acc, item) => {
    const ip = String(item?.ip || '').trim();
    if (!isPrivateIPv4(ip) || seen.has(ip)) return acc;
    seen.add(ip);
    acc.push({ ip, name: cleanName(item?.name, `Tasmota (${ip})`) });
    return acc;
  }, []);
}

function sanitizeStations(value) {
  const stations = Array.isArray(value?.stations) ? value.stations : [];
  return {
    stations: stations.slice(0, 40).reduce((acc, station) => {
      const name = cleanName(station?.name, 'Sender');
      const url = normalizeStreamUrl(station?.url);
      if (!/^https?:\/\//i.test(url)) return acc;
      acc.push({ name, url });
      return acc;
    }, [])
  };
}

function sanitizeCameras(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).reduce((acc, cam) => {
    const id = String(cam?.id || Date.now() + Math.random().toString(36).substring(2, 7));
    const name = cleanName(cam?.name, 'Kamera');
    const url = String(cam?.url || '').trim().slice(0, 800);
    if (!/^https?:\/\//i.test(url)) return acc;
    const interval = Math.max(0, Number(cam?.interval || 0));
    acc.push({ id, name, url, interval });
    return acc;
  }, []);
}

function sanitizeAppointments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).reduce((acc, appt) => {
    const id = String(appt?.id || Date.now() + Math.random().toString(36).substring(2, 7));
    const title = cleanName(appt?.title, 'Termin');
    
    // date validation YYYY-MM-DD
    const date = String(appt?.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return acc;
    
    // time validation HH:MM
    let time = String(appt?.time || '').trim();
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      time = '00:00';
    } else if (!time) {
      time = '00:00';
    }
    
    const description = String(appt?.description || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 500);
    
    acc.push({ id, title, date, time, description });
    return acc;
  }, []);
}

module.exports = {
  isIPv4,
  isPrivateIPv4,
  isPrivateBaseIp,
  cleanName,
  normalizeStreamUrl,
  sanitizeTasmotaList,
  sanitizeStations,
  sanitizeCameras,
  sanitizeAppointments
};
