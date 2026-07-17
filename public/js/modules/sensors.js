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

export async function refreshSensorWidget() {
  const sensorBody = document.getElementById('sensorBody');
  if (!sensorBody) return;

  const sensorList = getSensorListFromConfig();

  if (sensorList.length === 0) {
    sensorBody.innerHTML = `<div style="text-align: center; color: rgba(218,232,255,0.4); width: 100%; padding: 20px;">Keine Sensoren konfiguriert</div>`;
    return;
  }

  const currentKey = sensorList.map(s => `${s.name || ''}_${s.ip}`).join('|');
  if (sensorBody.dataset.currentKey !== currentKey) {
    sensorBody.dataset.currentKey = currentKey;
    sensorBody.innerHTML = '';
    sensorList.forEach((sensor, index) => {
      const card = document.createElement('div');
      card.className = 'sensor-card';
      card.innerHTML = `
        <div class="sensor-card-title">${sensor.name || 'Sensor'}</div>
        <div class="sensor-gauges">
          <div class="sensor-gauge temp" id="tempGauge-${index}" style="--value:0; --color:#38bdf8;">
            <div class="gauge-core">
              <i class="fas fa-temperature-half"></i>
              <strong id="sensorTemp-${index}">--°</strong>
              <small data-i18n="system_temp">Temp</small>
            </div>
          </div>
        </div>
        <div class="sensor-extra-info">
          <div class="sensor-humidity" id="sensorHum-${index}">Feuchte: --%</div>
          <div class="sensor-battery" id="sensorBat-${index}" style="display: none;"></div>
        </div>
        <div class="sensor-meta" id="sensorStatus-${index}">Offline</div>
      `;
      sensorBody.appendChild(card);
    });
  }

  const promises = sensorList.map(async (sensor, index) => {
    const tempEl = document.getElementById(`sensorTemp-${index}`);
    const humEl = document.getElementById(`sensorHum-${index}`);
    const batEl = document.getElementById(`sensorBat-${index}`);
    const statusEl = document.getElementById(`sensorStatus-${index}`);
    if (!tempEl) return;

    try {
      const res = await fetch(`/api/tasmota/sensor?ip=${encodeURIComponent(sensor.ip)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sensor nicht erreichbar');

      const temp = Number(data.temperature);
      const hum = Number(data.humidity);

      tempEl.textContent = Number.isFinite(temp) ? `${temp.toFixed(1)}°` : '--°';
      setGauge(`tempGauge-${index}`, temp, -15, 45);

      if (humEl) {
        humEl.textContent = Number.isFinite(hum) ? `Feuchte: ${hum.toFixed(0)}%` : 'Feuchte: --%';
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
            // Wenn wir nur Volt haben (z. B. 18650 Akku von 3.0V bis 4.2V)
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
              batText += ` <span style="opacity: 0.7; font-size: 8.5px; margin-left: 2px;">(${volt.toFixed(2)}V)</span>`;
            } else {
              batText += ` <span>${volt.toFixed(2)}V</span>`;
            }
          }
          batEl.innerHTML = batText;
        } else {
          batEl.style.display = 'none';
        }
      }

      if (statusEl) {
        statusEl.textContent = data.time ? data.time.slice(11, 16) : 'Online';
        statusEl.style.color = '';
      }
    } catch (e) {
      tempEl.textContent = '--°';
      setGauge(`tempGauge-${index}`, 0, -15, 45);
      if (humEl) {
        humEl.textContent = 'Feuchte: --%';
      }
      if (batEl) {
        batEl.style.display = 'none';
      }
      if (statusEl) {
        statusEl.textContent = 'Offline';
        statusEl.style.color = '#ef4444';
      }
    }
  });

  await Promise.allSettled(promises);
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
