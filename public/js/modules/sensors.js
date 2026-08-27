import { Config } from './config.js';
import { getLangText } from './utils.js';

export function clampNumber(value, min, max) {
  const n = Number(value);
  if(!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function setGauge(id, value, min, max) {
  const el = document.getElementById(id);
  if(!el) return;
  const pct = ((clampNumber(value, min, max) - min) / (max - min)) * 100;
  el.style.setProperty('--value', pct.toFixed(1));
  el.style.setProperty('--sweep', `${(pct * 0.75).toFixed(1)}%`);
}

export function getSensorListFromConfig() {
  let sensorList = Config.get('sensorList');
  if (!sensorList) {
    const legacyIp = Config.get('sensorIp', '192.168.178.40');
    sensorList = [{ ip: legacyIp, name: 'Temperatur' }];
  } else if (typeof sensorList === 'string') {
    try {
      sensorList = JSON.parse(sensorList);
    } catch(e) {
      sensorList = [];
    }
  }
  return sensorList;
}

export function renderSensorSettings() {
  const container = document.getElementById('sensorSettingsList');
  if (!container) return;
  container.innerHTML = '';

  const sensorList = getSensorListFromConfig();
  sensorList.forEach((sensor, index) => {
    const row = document.createElement('div');
    row.className = 'sensor-settings-row';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.style.marginBottom = '8px';
    row.innerHTML = `
      <input type="text" class="sensor-name-input input-field" style="flex: 1;" placeholder="${getLangText('sensor_name_placeholder') || 'Name'}" value="${sensor.name || ''}">
      <input type="text" class="sensor-ip-input input-field" style="flex: 1;" placeholder="z.B. 192.168.178.40" value="${sensor.ip || ''}">
      <button class="btn btn-danger remove-sensor-btn" data-index="${index}" style="padding: 8px 12px; background: #ef4444;"><i class="fas fa-trash-can"></i></button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.remove-sensor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      removeSensor(idx);
    });
  });
}

export function removeSensor(index) {
  const sensorList = getSensorListFromConfig();
  sensorList.splice(index, 1);
  Config.set('sensorList', sensorList);
  renderSensorSettings();
}

let prevTemps = {};
let smoothedHums = {};

export async function refreshSensorWidget() {
  const sensorBody = document.getElementById('sensorBody');
  if (!sensorBody) return;

  const sensorList = getSensorListFromConfig();

  if (sensorList.length === 0) {
    sensorBody.innerHTML = `<div style="text-align: center; color: rgba(218,232,255,0.4); width: 100%; padding: 20px;">Keine Sensoren konfiguriert</div>`;
    return;
  }

  const currentKey = sensorList.map(s => `${s.name || ''}_${s.ip}`).join('|');
  
  // Render das modern-sensors-container Layout
  if (sensorBody.dataset.currentKey !== currentKey || !sensorBody.querySelector('.modern-sensors-container')) {
    sensorBody.dataset.currentKey = currentKey;
    
    let rowsHtml = '';
    sensorList.forEach((sensor, index) => {
      const nameLower = (sensor.name || '').toLowerCase();
      const isOutdoor = nameLower.includes('out') || nameLower.includes('außen') || nameLower.includes('aussen');
      const rowClass = isOutdoor ? 'sensor-outdoor' : 'sensor-indoor';
      const iconClass = isOutdoor ? 'fas fa-house-chimney-window' : 'fas fa-home';
      const tagText = isOutdoor ? 'OUT' : 'IN';

      rowsHtml += `
        <div class="modern-sensor-row ${rowClass}">
          <div class="sensor-info-left">
            <div class="sensor-icon-circle"><i class="${iconClass}"></i></div>
            <div class="sensor-name-group">
              <span class="sensor-tag">${tagText}</span>
              <span class="sensor-location-name">${sensor.name || (isOutdoor ? 'Außen' : 'Innen')}</span>
            </div>
          </div>
          <div class="sensor-values-right">
            <div class="sensor-temp-display">
              <span class="sensor-temp-val" id="sensorTemp-${index}">--.-</span><span class="sensor-temp-unit">°C</span>
              <span class="sensor-trend-arrow" id="sensorTrend-${index}"></span>
            </div>
            <div class="sensor-sub-details">
              <span class="sensor-hum-val"><i class="fas fa-droplet"></i> <span id="sensorHum-${index}">--%</span></span>
              <span class="sensor-comfort-badge" id="sensorComfort-${index}"></span>
              <div class="sensor-battery-val" id="sensorBat-${index}" style="display: none;"></div>
            </div>
          </div>
        </div>
      `;
    });

    sensorBody.innerHTML = `
      <div class="modern-sensors-container">
        ${rowsHtml}
      </div>
      <div class="modern-sensor-footer">
        <span class="lcd-status-dot" id="lcdStatusDot"></span>
        <span class="modern-meta-text" id="sensorStatus-combined">Lade...</span>
      </div>
    `;
  }

  const sensorStatuses = sensorList.map(() => ({ offline: false, time: null }));

  const promises = sensorList.map(async (sensor, index) => {
    const tempEl = document.getElementById(`sensorTemp-${index}`);
    const humEl = document.getElementById(`sensorHum-${index}`);
    const batEl = document.getElementById(`sensorBat-${index}`);
    if (!tempEl) return;

    try {
      const res = await fetch(`/api/tasmota/sensor?ip=${encodeURIComponent(sensor.ip)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sensor nicht erreichbar');

      const temp = Number(data.temperature);
      const rawHum = Number(data.humidity);

      let hum = rawHum;
      if (Number.isFinite(rawHum)) {
        if (smoothedHums[index] === undefined || smoothedHums[index] === null) {
          smoothedHums[index] = rawHum;
        } else {
          smoothedHums[index] = smoothedHums[index] * 0.7 + rawHum * 0.3;
        }
        hum = smoothedHums[index];
      }

      tempEl.textContent = Number.isFinite(temp) ? temp.toFixed(1) : '--.-';
      if (humEl) {
        humEl.textContent = Number.isFinite(hum) ? `${Math.round(hum)}%` : '--%';
      }

      // Trend & Komfort-Indikatoren aktualisieren
      if (Number.isFinite(temp)) {
        const trendEl = document.getElementById(`sensorTrend-${index}`);
        if (trendEl) {
          const prev = prevTemps[index];
          if (prev !== undefined && prev !== null) {
            const diff = temp - prev;
            if (diff > 0.1) {
              trendEl.innerHTML = '<i class="fas fa-arrow-up-long lcd-trend-up" title="Steigend"></i>';
            } else if (diff < -0.1) {
              trendEl.innerHTML = '<i class="fas fa-arrow-down-long lcd-trend-down" title="Fallend"></i>';
            } else {
              trendEl.innerHTML = '<i class="fas fa-arrow-right-long lcd-trend-stable" title="Stabil"></i>';
            }
          } else {
            trendEl.innerHTML = '<i class="fas fa-arrow-right-long lcd-trend-stable" title="Stabil"></i>';
          }
        }
        prevTemps[index] = temp;
      }

      if (Number.isFinite(hum)) {
        const comfortEl = document.getElementById(`sensorComfort-${index}`);
        if (comfortEl) {
          if (hum >= 40 && hum <= 60) {
            comfortEl.innerHTML = '<i class="fas fa-face-smile lcd-comfort-ok" title="Komfortbereich"></i>';
          } else if (hum > 60) {
            comfortEl.innerHTML = '<i class="fas fa-droplet lcd-comfort-wet" title="Feucht"></i>';
          } else {
            comfortEl.innerHTML = '<i class="fas fa-sun lcd-comfort-dry" title="Trocken"></i>';
          }
        }
      }

      if (batEl) {
        const pct = data.batteryPercent !== null && data.batteryPercent !== undefined ? Number(data.batteryPercent) : null;
        const volt = data.batteryVoltage !== null && data.batteryVoltage !== undefined ? Number(data.batteryVoltage) : null;
        
        if (pct !== null || volt !== null) {
          batEl.style.display = 'flex';
          let batIcon = 'fa-battery-half';
          let batColor = '#22c55e'; // green
          
          if (pct !== null) {
            if (pct < 20) {
              batIcon = 'fa-battery-empty';
              batColor = '#ef4444'; // red
            } else if (pct < 50) {
              batIcon = 'fa-battery-quarter';
              batColor = '#f97316'; // orange
            } else if (pct < 75) {
              batIcon = 'fa-battery-half';
            } else if (pct < 90) {
              batIcon = 'fa-battery-three-quarters';
            } else {
              batIcon = 'fa-battery-full';
            }
          } else {
            if (volt < 3.4) {
              batIcon = 'fa-battery-empty';
              batColor = '#ef4444';
            } else if (volt < 3.7) {
              batIcon = 'fa-battery-quarter';
              batColor = '#f97316';
            } else if (volt < 4.0) {
              batIcon = 'fa-battery-half';
            } else {
              batIcon = 'fa-battery-full';
            }
          }

          batEl.style.color = batColor;
          
          let batText = `<i class="fas ${batIcon}"></i>`;
          if (pct !== null) {
            batText += ` <span>${pct}%</span>`;
          }
          if (volt !== null) {
            if (pct !== null) {
              batText += ` <span style="opacity: 0.6; font-size: 8px; margin-left: 2px;">(${volt.toFixed(2)}V)</span>`;
            } else {
              batText += ` <span>${volt.toFixed(2)}V</span>`;
            }
          }
          batEl.innerHTML = batText;
        } else {
          batEl.style.display = 'none';
        }
      }

      if (data.time) {
        try {
          const str = String(data.time).trim();
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            sensorStatuses[index].time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          } else {
            sensorStatuses[index].time = str.slice(11, 16);
          }
        } catch (e) {
          sensorStatuses[index].time = String(data.time).slice(11, 16);
        }
      }
    } catch (e) {
      tempEl.textContent = '--.-';
      if (humEl) humEl.textContent = '--%';
      
      if (batEl) {
        batEl.style.display = 'none';
      }
      
      sensorStatuses[index].offline = true;
    }
  });

  await Promise.allSettled(promises);

  const combinedStatusEl = document.getElementById('sensorStatus-combined');
  const statusDotEl = document.getElementById('lcdStatusDot');
  if (combinedStatusEl) {
    const offlines = sensorStatuses.filter(s => s.offline);
    if (offlines.length === sensorList.length) {
      combinedStatusEl.textContent = sensorList.length === 1 ? 'Offline' : 'Alle offline';
      if (statusDotEl) statusDotEl.className = 'lcd-status-dot offline';
    } else if (offlines.length > 0) {
      const parts = sensorList.map((s, idx) => {
        const name = s.name || `Sensor ${idx + 1}`;
        return sensorStatuses[idx].offline ? `${name}: Offline` : `${name}: ${sensorStatuses[idx].time || 'Aktiv'}`;
      });
      combinedStatusEl.textContent = parts.join(' | ');
      if (statusDotEl) statusDotEl.className = 'lcd-status-dot';
    } else {
      const parts = sensorList.map((s, idx) => {
        const name = s.name || `Sensor ${idx + 1}`;
        return `${name}: ${sensorStatuses[idx].time || 'Aktiv'}`;
      });
      combinedStatusEl.textContent = parts.join(' | ');
      if (statusDotEl) statusDotEl.className = 'lcd-status-dot';
    }
  }
}

export function initSensorWidget() {
  let list = Config.get('sensorList');
  if (!list) {
    const legacyIp = Config.get('sensorIp');
    if (legacyIp) {
      list = [{ ip: legacyIp, name: 'Temperatur' }];
      Config.set('sensorList', list);
    }
  }

  renderSensorSettings();
  refreshSensorWidget();
  setInterval(refreshSensorWidget, 15000);
}
