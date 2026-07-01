import { Config } from './config.js';
import { getLangText } from './utils.js';

export let tasmotaDevices = [];

export async function initTasmota() {
  await fetchTasmotaList();
  
  const addBtn = document.getElementById('addTasmota');
  if(addBtn) {
    addBtn.addEventListener('click', async () => {
      const ip = document.getElementById('tasmotaManIp').value.trim();
      const name = document.getElementById('tasmotaManName').value.trim();
      if(ip && name) {
        tasmotaDevices.push({ip, name});
        await saveTasmotaList();
        document.getElementById('tasmotaManIp').value = '';
        document.getElementById('tasmotaManName').value = '';
      }
    });
  }

  const scanBtn = document.getElementById('scanTasmota');
  if(scanBtn) {
    scanBtn.addEventListener('click', async () => {
      const base = document.getElementById('tasmotaSubnet').value.trim();
      if(!base) return;
      scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const res = await fetch('/api/tasmota/scan', {
          method: 'POST', 
          headers: {'Content-Type': 'application/json'}, 
          body: JSON.stringify({baseIp: base})
        });
        const data = await res.json();
        if(data.found && data.found.length > 0) {
          let newCount = 0;
          data.found.forEach(f => {
            if(!tasmotaDevices.find(d => d.ip === f.ip)) {
              tasmotaDevices.push(f);
              newCount++;
            }
          });
          await saveTasmotaList();
          
          if (newCount > 0) {
            alert(`${newCount} ` + getLangText('tasmotaNewFound'));
          } else {
            alert(getLangText('tasmotaAlreadyReg'));
          }
        } else {
          alert(getLangText('tasmotaNone'));
        }
      } catch(e) {
        console.error("Tasmota Scan Error", e);
        alert(getLangText('tasmotaScanErr'));
      }
      scanBtn.innerHTML = '<i class="fas fa-search"></i>';
    });
  }
}

export async function fetchTasmotaList() {
  try {
    const res = await fetch('/api/tasmota');
    const data = await res.json();
    if(data && Array.isArray(data)) tasmotaDevices = data;
    else tasmotaDevices = [];
  } catch(e) {
    tasmotaDevices = JSON.parse(Config.get('tasmotaBackup', '[]'));
  }
  renderTasmotaSettings();
  renderTasmotaButtons();
  refreshTasmotaStatus();
}

export async function saveTasmotaList() {
  Config.set('tasmotaBackup', JSON.stringify(tasmotaDevices));
  try {
    const res = await fetch('/api/tasmota', {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(tasmotaDevices)
    });
    const data = await res.json();
    if(data.success && data.saved) {
      tasmotaDevices = data.saved;
    }
  } catch(e) {
    console.error("Backend Save Error", e);
  }
  renderTasmotaSettings();
  renderTasmotaButtons();
}

export function removeTasmota(ip) {
  tasmotaDevices = tasmotaDevices.filter(d => d.ip !== ip);
  saveTasmotaList();
}

// Make globally accessible for dynamically generated settings items
window.removeTasmota = removeTasmota;

export async function toggleTasmota(ip) {
  const btn = document.getElementById('tasmota-btn-' + ip.replace(/\./g, '-'));
  if(btn) btn.style.transform = 'scale(0.95)';
  
  try {
    const res = await fetch('/api/tasmota/toggle', {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ip})
    });
    const data = await res.json();
    if(data.success) {
      if(data.state === 'ON') {
        btn.classList.add('active');
        btn.classList.remove('off');
      } else {
        btn.classList.remove('active');
        btn.classList.add('off');
      }
    }
  } catch(e) {}
  
  if(btn) setTimeout(() => btn.style.transform = 'scale(1)', 150);
}

// Make globally accessible for dynamically generated buttons
window.toggleTasmota = toggleTasmota;

export function renderTasmotaSettings() {
  const list = document.getElementById('tasmotaList');
  if(!list) return;
  list.innerHTML = '';
  tasmotaDevices.forEach(d => {
    const div = document.createElement('div');
    div.className = 'tasmota-setting-item';
    const label = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = d.name;
    const ip = document.createElement('small');
    ip.textContent = `(${d.ip})`;
    const button = document.createElement('button');
    button.className = 'btn-del';
    button.innerHTML = '<i class="fas fa-trash"></i>';
    button.addEventListener('click', () => window.removeTasmota(d.ip));
    label.append(name, ' ', ip);
    div.append(label, button);
    list.appendChild(div);
  });
}

export function renderTasmotaButtons() {
  const body = document.getElementById('tasmotaBody');
  if(!body) return;
  body.innerHTML = '';
  tasmotaDevices.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'tasmota-btn';
    btn.id = 'tasmota-btn-' + d.ip.replace(/\./g, '-');
    const icon = document.createElement('i');
    icon.className = 'fas fa-power-off';
    const label = document.createElement('span');
    label.textContent = d.name;
    btn.append(icon, label);
    btn.onclick = () => window.toggleTasmota(d.ip);
    body.appendChild(btn);
  });
}

export async function refreshTasmotaStatus() {
  if (tasmotaDevices.length === 0) return;
  try {
    const res = await fetch('/api/tasmota/status');
    const statusArray = await res.json();
    statusArray.forEach(s => {
      const btn = document.getElementById('tasmota-btn-' + s.ip.replace(/\./g, '-'));
      if(btn) {
        if(!s.online) { btn.classList.remove('active', 'off'); btn.style.opacity = '0.5'; }
        else {
          btn.style.opacity = '1';
          if(s.state === 'ON') {
            btn.classList.add('active');
            btn.classList.remove('off');
          } else {
            btn.classList.remove('active');
            btn.classList.add('off');
          }
        }
      }
    });
  } catch(e) {}
}

setInterval(refreshTasmotaStatus, 15000); // Geändert auf 15 Sekunden wie Sensoren für weniger Last
