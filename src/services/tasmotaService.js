async function getDeviceStatus(devices) {
  return Promise.all(devices.map(async d => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const r = await fetch(`http://${d.ip}/cm?cmnd=Power`, { signal: controller.signal });
      clearTimeout(timeout);
      const j = await r.json();
      return { ip: d.ip, state: j.POWER || 'OFF', online: true };
    } catch(e) {
      return { ip: d.ip, state: 'OFF', online: false };
    }
  }));
}

async function getSensorData(ip) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  const r = await fetch(`http://${ip}/cm?cmnd=Status%2010`, { signal: controller.signal });
  clearTimeout(timeout);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const sensors = data?.StatusSNS || {};
  const sensorName = Object.keys(sensors).find(key => sensors[key] && typeof sensors[key] === 'object' && 'Temperature' in sensors[key] && 'Humidity' in sensors[key]);
  const sensor = sensorName ? sensors[sensorName] : null;
  if (!sensor) throw new Error('Kein Temperatur-/Feuchte-Sensor gefunden');

  let batteryPercent = null;
  let batteryVoltage = null;

  if (sensor) {
    if (sensor.Battery !== undefined) batteryPercent = Number(sensor.Battery);
    if (sensor.BatteryPercent !== undefined) batteryPercent = Number(sensor.BatteryPercent);
    if (sensor.BatteryVoltage !== undefined) batteryVoltage = Number(sensor.BatteryVoltage);
  }
  if (sensors.Battery !== undefined && batteryPercent === null) batteryPercent = Number(sensors.Battery);
  if (sensors.BatteryPercent !== undefined && batteryPercent === null) batteryPercent = Number(sensors.BatteryPercent);
  if (sensors.BatteryVoltage !== undefined && batteryVoltage === null) batteryVoltage = Number(sensors.BatteryVoltage);
  if (sensors.Analog && sensors.Analog.A0 !== undefined) batteryVoltage = Number(sensors.Analog.A0);

  return {
    success: true,
    online: true,
    ip,
    name: sensorName,
    time: sensors.Time || null,
    temperature: Number(sensor.Temperature),
    humidity: Number(sensor.Humidity),
    dewPoint: Number(sensor.DewPoint),
    tempUnit: sensors.TempUnit || 'C',
    batteryPercent,
    batteryVoltage
  };
}

async function toggleDevice(ip) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  const r = await fetch(`http://${ip}/cm?cmnd=Power%20TOGGLE`, { signal: controller.signal });
  clearTimeout(timeout);
  const j = await r.json();
  return j.POWER;
}

async function setDevicePower(ip, action) {
  let commandAction = action === 'ON' || action === 'OFF' ? action : 'TOGGLE';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  const r = await fetch(`http://${ip}/cm?cmnd=Power%20${commandAction}`, { signal: controller.signal });
  clearTimeout(timeout);
  const j = await r.json();
  return j.POWER;
}

async function scanSubnet(baseIp) {
  const found = [];
  console.log("Start Tasmota Scan in Subnet: " + baseIp + ".x");

  async function scanChunk(ips) {
    const promises = ips.map(async (ip) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500); 
        const r = await fetch(`http://${ip}/cm?cmnd=Status`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await r.json();
        if (data && data.Status && data.Status.FriendlyName) {
          console.log("GEFUNDEN: " + ip);
          found.push({ip: ip, name: data.Status.FriendlyName[0] || `Tasmota (${ip})`});
        }
      } catch (err) {}
    });
    await Promise.all(promises);
  }

  const allIps = [];
  for(let i=1; i<255; i++) { allIps.push(`${baseIp}.${i}`); }

  const chunkSize = 20;
  for (let i = 0; i < allIps.length; i += chunkSize) {
    const chunk = allIps.slice(i, i + chunkSize);
    await scanChunk(chunk);
  }

  console.log("Scan beendet. Tasmota gefunden: ", found.length);
  return found;
}

module.exports = {
  getDeviceStatus,
  getSensorData,
  toggleDevice,
  setDevicePower,
  scanSubnet
};
