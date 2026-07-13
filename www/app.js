/* ==========================================
   NEO DECK PRESENTATION SITE LOGIC
   Featuring interactive dashboard widgets,
   live math gauges, simulated subnet scanner
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  initSimulatedClock();
  initTabletMockupInteractivity();
  initDemoTabs();
  initClimateSensorDemo();
  initSubnetScannerDemo();
  initRadioPlayerDemo();
  initFritzboxDemo();
  initPresenceDemo();
  initCameraDemo();
  initClipboardHelpers();
  initSetupTabs();
  initSystemStatusDemo();
});

/* --- 1. Simulated Tablet Clock --- */
function initSimulatedClock() {
  const clockEl = document.getElementById('simTime');
  if (!clockEl) return;
  
  function updateTime() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hrs}:${mins}`;
  }
  
  updateTime();
  setInterval(updateTime, 1000 * 60); // update every minute
}

/* --- 2. Interactive Tablet Mockup Overlay --- */
function initTabletMockupInteractivity() {
  const overlay = document.getElementById('mockupOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const simWidgets = document.querySelectorAll('.sim-widget');
  
  const widgetDetails = {
    weather: {
      title: "Wetter Pro Widget",
      text: "Nutzt die quelloffene Open-Meteo API (ohne API-Key). Zeigt neben Temperatur auch Regenwahrscheinlichkeit, gefühlte Temperatur, Windgeschwindigkeit, Wolkendichte und den UV-Index für präzise lokale Vorhersagen."
    },
    climate: {
      title: "AM2301 Klimasensor Gauge",
      text: "Verbindet sich lokal im Heimnetzwerk mit einem Tasmota-Sensor-Endpunkt. Liest Temperatur und Feuchtigkeit aus, berechnet in Echtzeit den Taupunkt und warnt optisch bei Schimmelgefahr."
    },
    tasmota: {
      title: "Tasmota Smart Home Geräte",
      text: "Erlaubt das direkte Schalten von Steckdosen und Lichtern im lokalen Subnetz. Bietet Statusrückmeldungen in Echtzeit und speichert Gerätenamen lokal auf dem Server."
    },
    radio: {
      title: "Live Radio Stream Player",
      text: "Unterstützt MP3/AAC und HLS Live-Streams. Mit integrierten Weck- und Standby-Guards, die streams im Hintergrund radikal beenden, wenn das Tablet gesperrt wird, um Android-Autoplay-Bugs zu blockieren."
    }
  };

  simWidgets.forEach(widget => {
    widget.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = widget.getAttribute('data-target');
      if (widgetDetails[target]) {
        overlayTitle.textContent = widgetDetails[target].title;
        overlayText.textContent = widgetDetails[target].text;
        overlay.classList.remove('hidden');
      }
    });
  });

  // Clicking anywhere else on the screen hides or resets the overlay
  document.addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

/* --- 3. Interactive Feature Tabs Switcher --- */
function initDemoTabs() {
  const tabs = document.querySelectorAll('.int-tab');
  const panes = document.querySelectorAll('.tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Toggle tabs active class
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Toggle pane display
      panes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.getAttribute('id') === `pane-${targetTab}`) {
          pane.classList.add('active');
        }
      });
    });
  });
}

/* --- 4. Klima-Sensor (AM2301) Live Math & Gauges --- */
function initClimateSensorDemo() {
  const tempInput = document.getElementById('tempInput');
  const humInput = document.getElementById('humInput');
  const tempDisplay = document.getElementById('tempDisplay');
  const humDisplay = document.getElementById('humDisplay');
  const dewDisplay = document.getElementById('dewDisplay');
  
  const demoSensorTemp = document.getElementById('demoSensorTemp');
  const demoSensorHumidity = document.getElementById('demoSensorHumidity');
  const demoTempGauge = document.getElementById('demoTempGauge');
  const demoHumGauge = document.getElementById('demoHumGauge');

  function calculateDewPoint(t, rh) {
    // Simple highly accurate Magnus-formula approximation
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * t) / (b + t)) + Math.log(rh / 100);
    const dp = (b * alpha) / (a - alpha);
    return dp.toFixed(1);
  }

  function updateClimateDemo() {
    const t = parseFloat(tempInput.value);
    const rh = parseInt(humInput.value);
    
    // Update Slider Displays
    tempDisplay.textContent = `${t.toFixed(1)} °C`;
    humDisplay.textContent = `${rh} %`;
    
    // Calculate and display Dew Point
    const dewPoint = calculateDewPoint(t, rh);
    dewDisplay.textContent = `${dewPoint} °C`;
    
    // Update Temp Gauge
    // Temp range from -10 to 45 -> scale to percentage (0 - 100)
    const tempMin = -10;
    const tempMax = 45;
    const tempPct = Math.min(100, Math.max(0, ((t - tempMin) / (tempMax - tempMin)) * 100));
    demoTempGauge.style.setProperty('--value', tempPct);
    demoSensorTemp.textContent = `${t.toFixed(1)}°`;
    
    // Dynamically adjust temperature gauge colors based on ranges
    let tempColor = '#66d9ff'; // Cold (Cyan)
    if (t >= 15 && t <= 28) {
      tempColor = '#00f59b'; // Pleasant (Green/Teal)
    } else if (t > 28) {
      tempColor = '#ff3366'; // Warm/Hot (Orange/Red)
    }
    demoTempGauge.style.setProperty('--color', tempColor);

    // Update Humidity Gauge (Direct percentage scale)
    demoHumGauge.style.setProperty('--value', rh);
    demoSensorHumidity.textContent = `${rh}%`;
    
    let humColor = '#55f5b1'; // Normal
    if (rh > 70) {
      humColor = '#00f0ff'; // High/Humid (Blue/Cyan)
    } else if (rh < 35) {
      humColor = '#ff9f1c'; // Dry (Orange)
    }
    demoHumGauge.style.setProperty('--color', humColor);
  }

  if (tempInput && humInput) {
    tempInput.addEventListener('input', updateClimateDemo);
    humInput.addEventListener('input', updateClimateDemo);
    updateClimateDemo(); // initial render
  }
}

/* --- 5. Tasmota Subnetz Scanner Simulator --- */
function initSubnetScannerDemo() {
  const btnStartScan = document.getElementById('btnStartScan');
  const radarCircle = document.getElementById('radarCircle');
  const discoveredList = document.getElementById('discoveredList');
  const scannerProgress = document.getElementById('scannerProgress');
  const scannerStatusText = document.getElementById('scannerStatusText');
  const scanSubnet = document.getElementById('scanSubnet');

  let isScanning = false;

  const mockDevices = [
    { name: "Tasmota SmartPlug - Flur", ip: "12", fullIp: ".12" },
    { name: "Tasmota Dimmer - Küche", ip: "24", fullIp: ".24" },
    { name: "AM2301 Klimasensor", ip: "40", fullIp: ".40" }
  ];

  btnStartScan.addEventListener('click', () => {
    if (isScanning) return;
    
    isScanning = true;
    btnStartScan.disabled = true;
    scannerProgress.style.width = '0%';
    discoveredList.innerHTML = '';
    radarCircle.classList.add('scanning');
    
    const subnetBase = scanSubnet.value.trim() || '192.168.178';
    scannerStatusText.textContent = `Scanne Subnetz ${subnetBase}.x ...`;

    // Progress bar animation
    let width = 0;
    const progressInterval = setInterval(() => {
      width += 2;
      scannerProgress.style.width = `${width}%`;
      if (width >= 100) {
        clearInterval(progressInterval);
      }
    }, 80);

    // Simulate discovering devices step-by-step
    setTimeout(() => {
      appendDiscoveredDevice(mockDevices[0].name, `${subnetBase}${mockDevices[0].fullIp}`);
    }, 1000);

    setTimeout(() => {
      appendDiscoveredDevice(mockDevices[1].name, `${subnetBase}${mockDevices[1].fullIp}`);
    }, 2200);

    setTimeout(() => {
      appendDiscoveredDevice(mockDevices[2].name, `${subnetBase}${mockDevices[2].fullIp}`);
    }, 3200);

    // Finish Scan
    setTimeout(() => {
      isScanning = false;
      btnStartScan.disabled = false;
      radarCircle.classList.remove('scanning');
      scannerStatusText.innerHTML = `<span style="color:var(--green)"><i class="fas fa-circle-check"></i> Scan abgeschlossen! 3 Tasmota Geräte gefunden.</span>`;
    }, 4100);
  });

  function appendDiscoveredDevice(name, ip) {
    const item = document.createElement('div');
    item.className = 'dev-item';
    
    const randomId = 'sw-' + Math.random().toString(36).substring(7);
    const checkedState = Math.random() > 0.5 ? 'checked' : '';
    
    item.innerHTML = `
      <div class="dev-name-box">
        <span class="dev-name">${name}</span>
        <span class="dev-ip"><i class="fas fa-circle-nodes"></i> ${ip}</span>
      </div>
      <label class="switch-label" for="${randomId}">
        <input type="checkbox" id="${randomId}" ${checkedState}>
        <span class="slider-switch"></span>
      </label>
    `;
    discoveredList.appendChild(item);
  }
}

/* --- 6. Live Radio Player & Preset Demos --- */
function initRadioPlayerDemo() {
  const presets = document.querySelectorAll('.preset-card');
  const nowPlayingStation = document.getElementById('nowPlayingStation');
  const playerStreamUrl = document.getElementById('playerStreamUrl');
  const demoVisualizer = document.getElementById('demoVisualizer');
  const playerPanel = document.querySelector('.radio-player-panel');
  const btnRadioPlay = document.getElementById('btnRadioPlay');
  
  let isPlaying = true; // initially playing in mock view

  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      presets.forEach(p => p.classList.remove('active-preset'));
      preset.classList.add('active-preset');
      
      const station = preset.getAttribute('data-station');
      const url = preset.getAttribute('data-url');
      
      nowPlayingStation.textContent = `${station} Live`;
      playerStreamUrl.textContent = url;
      
      // Automatically activate playing visual elements
      isPlaying = true;
      demoVisualizer.classList.add('active');
      playerPanel.classList.add('playing');
      btnRadioPlay.innerHTML = '<i class="fas fa-pause"></i>';
    });
  });

  btnRadioPlay.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      demoVisualizer.classList.add('active');
      playerPanel.classList.add('playing');
      btnRadioPlay.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
      demoVisualizer.classList.remove('active');
      playerPanel.classList.remove('playing');
      btnRadioPlay.innerHTML = '<i class="fas fa-play"></i>';
    }
  });
}



/* --- 8. Clipboard Command Copy Helpers --- */
function initClipboardHelpers() {
  const copyButtons = document.querySelectorAll('.btn-copy');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-clipboard');
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        // Success feedback
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check" style="color:var(--green)"></i>';
        btn.style.opacity = '1';
        
        setTimeout(() => {
          btn.innerHTML = oldHtml;
          btn.style.opacity = '';
        }, 1500);
      }).catch(err => {
        console.error('Kopierfehler: ', err);
      });
    });
  });
}

/* --- 9. Setup OS Tabs Switcher --- */
function initSetupTabs() {
  const tabs = document.querySelectorAll('.setup-tab-btn');
  const guides = document.querySelectorAll('.os-guide-pane');
  
  if (!tabs.length || !guides.length) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const os = tab.getAttribute('data-os');
      
      // Update Tab Styles
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'rgba(255,255,255,0.03)';
        t.style.borderColor = 'var(--border)';
        t.style.color = 'var(--text-muted)';
        t.style.boxShadow = 'none';
      });
      
      tab.classList.add('active');
      tab.style.background = 'rgba(0, 240, 255, 0.1)';
      tab.style.borderColor = 'var(--cyan)';
      tab.style.color = '#fff';
      tab.style.boxShadow = '0 4px 15px var(--cyan-glow)';
      
      // Show/Hide guides dynamically
      guides.forEach(guide => {
        if (guide.getAttribute('id') === `guide-${os}`) {
          guide.style.display = 'grid';
        } else {
          guide.style.display = 'none';
        }
      });

      // Show/Hide quick commands dynamically
      const quickCmdContainer = document.querySelector('.quick-commands-container');
      const quickCards = document.querySelectorAll('.quick-cmd-card');
      if (quickCmdContainer && quickCards.length) {
        let hasActiveCard = false;
        quickCards.forEach(card => {
          if (card.getAttribute('data-os') === os) {
            card.style.display = 'flex';
            hasActiveCard = true;
          } else {
            card.style.display = 'none';
          }
        });
        
        if (hasActiveCard) {
          quickCmdContainer.style.display = 'flex';
        } else {
          quickCmdContainer.style.display = 'none';
        }
      }
    });
  });
}

/* --- 10. Fritz!Box Monitor & Call Simulator Demo --- */
function initFritzboxDemo() {
  const btnStartCall = document.getElementById('btnSimStartCall');
  const btnEndCall = document.getElementById('btnSimEndCall');
  const overlay = document.getElementById('demoFritzToastOverlay');
  const toastNumber = document.getElementById('demoFritzToastNumber');
  const toastCaller = document.getElementById('demoFritzToastCaller');
  const simCallNumber = document.getElementById('simCallNumber');
  const simCallName = document.getElementById('simCallName');
  const demoFritzCallList = document.getElementById('demoFritzCallList');

  const netBtns = document.querySelectorAll('.btn-net-sim');
  const demoLedFritz = document.getElementById('demoLedFritz');
  const demoValFritzStatus = document.getElementById('demoValFritzStatus');
  const demoLedInternet = document.getElementById('demoLedInternet');
  const demoValInternetStatus = document.getElementById('demoValInternetStatus');
  
  const demoValNetDown = document.getElementById('demoValNetDown');
  const demoValNetUp = document.getElementById('demoValNetUp');

  if (!btnStartCall) return;

  // 1. Network simulation logic
  netBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      netBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const status = btn.getAttribute('data-status');
      if (status === 'online-fast') {
        demoLedFritz.className = 'led-dot green';
        demoLedFritz.style.backgroundColor = '#55f5b1';
        demoLedFritz.style.boxShadow = '0 0 8px #55f5b1';
        demoValFritzStatus.textContent = 'Online (2ms)';

        demoLedInternet.className = 'led-dot green';
        demoLedInternet.style.backgroundColor = '#55f5b1';
        demoLedInternet.style.boxShadow = '0 0 8px #55f5b1';
        demoValInternetStatus.textContent = 'Online (14ms)';
      } else if (status === 'online-slow') {
        demoLedFritz.className = 'led-dot green';
        demoLedFritz.style.backgroundColor = '#55f5b1';
        demoLedFritz.style.boxShadow = '0 0 8px #55f5b1';
        demoValFritzStatus.textContent = 'Online (12ms)';

        demoLedInternet.className = 'led-dot orange';
        demoLedInternet.style.backgroundColor = '#ff9f1c';
        demoLedInternet.style.boxShadow = '0 0 8px #ff9f1c';
        demoValInternetStatus.textContent = 'Online (148ms)';
      } else if (status === 'offline') {
        demoLedFritz.className = 'led-dot red';
        demoLedFritz.style.backgroundColor = '#ff3366';
        demoLedFritz.style.boxShadow = '0 0 8px #ff3366';
        demoValFritzStatus.textContent = 'Offline';

        demoLedInternet.className = 'led-dot red';
        demoLedInternet.style.backgroundColor = '#ff3366';
        demoLedInternet.style.boxShadow = '0 0 8px #ff3366';
        demoValInternetStatus.textContent = 'Offline';
      }
      updateSpeeds();
    });
  });

  // Dynamic bandwidth speeds simulation
  function updateSpeeds() {
    const activeNetSim = document.querySelector('.btn-net-sim.active');
    if (!activeNetSim || !demoValNetDown || !demoValNetUp) return;
    const status = activeNetSim.getAttribute('data-status');
    
    if (status === 'online-fast') {
      const down = (240 + Math.random() * 15).toFixed(1);
      const up = (38 + Math.random() * 3).toFixed(1);
      demoValNetDown.textContent = `${down} Mbps`;
      demoValNetUp.textContent = `${up} Mbps`;
    } else if (status === 'online-slow') {
      const down = (5 + Math.random() * 4).toFixed(1);
      const up = (0.8 + Math.random() * 0.5).toFixed(1);
      demoValNetDown.textContent = `${down} Mbps`;
      demoValNetUp.textContent = `${up} Mbps`;
    } else {
      demoValNetDown.textContent = '0.0 Mbps';
      demoValNetUp.textContent = '0.0 Mbps';
    }
  }

  // Periodic fluctuations
  setInterval(updateSpeeds, 3000);

  // 2. Call simulation logic
  let currentNumber = '';
  let currentName = '';
  let callStartTime = null;

  btnStartCall.addEventListener('click', () => {
    currentNumber = simCallNumber.value.trim() || '0176 1234567';
    currentName = simCallName.value.trim() || 'Unbekannter Anrufer';

    toastNumber.textContent = currentNumber;
    toastCaller.textContent = currentName;

    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    btnStartCall.disabled = true;
    btnEndCall.disabled = false;
    callStartTime = new Date();
  });

  btnEndCall.addEventListener('click', () => {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';

    btnStartCall.disabled = false;
    btnEndCall.disabled = true;

    // Log the call
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const duration = callStartTime ? Math.round((now - callStartTime) / 1000) : 12;

    // Format duration
    let durText = '';
    if (duration > 0) {
      const m = Math.floor(duration / 60);
      const s = duration % 60;
      durText = m > 0 ? `${m}m ${s}s` : `${s}s`;
    } else {
      durText = '0s';
    }

    // Remove "no-calls" placeholder if it exists
    const noCalls = demoFritzCallList.querySelector('.no-calls');
    if (noCalls) {
      noCalls.remove();
    }

    // Create call item
    const item = document.createElement('div');
    item.className = 'fritz-call-item';
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      font-size: 11px;
      animation: slideInUp 0.3s ease forwards;
    `;

    item.innerHTML = `
      <div class="call-info-left" style="display: flex; align-items: center; gap: 8px;">
        <div class="call-icon inbound" style="color: #55f5b1; font-size: 12px; width: 16px; text-align: center;"><i class="fas fa-phone-volume"></i></div>
        <div class="call-details" style="display: flex; flex-direction: column; gap: 1px; text-align: left;">
          <span class="call-name" style="font-weight: 700; color: var(--text-main);">${currentName}</span>
          <span class="call-time" style="font-size: 9px; color: var(--text-muted);">${timeStr} Uhr · Eingehend</span>
        </div>
      </div>
      <span class="call-duration" style="font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums;">${durText}</span>
    `;

    // Insert at the top of the list
    demoFritzCallList.insertBefore(item, demoFritzCallList.firstChild);
  });
}

/* --- 11. Fritz!Box Presence Detection Demo --- */
function initPresenceDemo() {
  const simSteffen = document.getElementById('simPresenceSteffen');
  const simSabine = document.getElementById('simPresenceSabine');
  const simLuca = document.getElementById('simPresenceLuca');

  const cardSteffen = document.getElementById('avatarCardSteffen');
  const cardSabine = document.getElementById('avatarCardSabine');
  const cardLuca = document.getElementById('avatarCardLuca');

  const countText = document.getElementById('presenceCountText');

  if (!simSteffen || !simSabine || !simLuca) return;

  function updatePresenceDisplay(memberId, isChecked, cardEl) {
    const ringEl = cardEl.querySelector('.presence-avatar-ring');
    const badgeEl = cardEl.querySelector('.presence-status-badge');
    const statusEl = cardEl.querySelector('.presence-avatar-status');
    const borderImgEl = document.querySelector(`label[for="simPresence\${memberId}"]`).parentElement.querySelector('img');

    if (isChecked) {
      cardEl.classList.remove('inactive');
      cardEl.classList.add('active');
      ringEl.classList.add('active');
      badgeEl.classList.add('active');
      badgeEl.style.backgroundColor = 'var(--green)';
      statusEl.textContent = 'Zu Hause';
      statusEl.style.color = 'var(--green)';
      if (borderImgEl) {
        borderImgEl.style.borderColor = 'var(--green)';
        borderImgEl.style.opacity = '1';
      }
    } else {
      cardEl.classList.remove('active');
      cardEl.classList.add('inactive');
      ringEl.classList.remove('active');
      badgeEl.classList.remove('active');
      badgeEl.style.backgroundColor = 'var(--text-muted)';
      statusEl.textContent = 'Unterwegs';
      statusEl.style.color = 'var(--text-muted)';
      if (borderImgEl) {
        borderImgEl.style.borderColor = 'var(--text-muted)';
        borderImgEl.style.opacity = '0.6';
      }
    }

    // Update active count
    const activeCount = [simSteffen.checked, simSabine.checked, simLuca.checked].filter(Boolean).length;
    if (activeCount === 1) {
      countText.textContent = '1 Person';
    } else {
      countText.textContent = `\${activeCount} Personen`;
    }
  }

  simSteffen.addEventListener('change', (e) => {
    updatePresenceDisplay('Steffen', e.target.checked, cardSteffen);
  });

  simSabine.addEventListener('change', (e) => {
    updatePresenceDisplay('Sabine', e.target.checked, cardSabine);
  });

  simLuca.addEventListener('change', (e) => {
    updatePresenceDisplay('Luca', e.target.checked, cardLuca);
  });

  // Trigger initial count calculation
  const activeCount = [simSteffen.checked, simSabine.checked, simLuca.checked].filter(Boolean).length;
  countText.textContent = activeCount === 1 ? '1 Person' : `${activeCount} Personen`;
}

/* --- 12. Premium Camera Monitor Demo --- */
function initCameraDemo() {
  const grid = document.getElementById('demoCameraGrid');
  if (!grid) return;

  const camData = [
    { name: '01 | Einfahrt', url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80' },
    { name: '02 | Garten', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80' },
    { name: '03 | Wohnzimmer', url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80' },
    { name: '04 | Garage', url: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=400&q=80' }
  ];

  function renderDemoCameras(count) {
    grid.className = 'camera-demo-grid';
    grid.innerHTML = '';

    if (count === 1) {
      grid.classList.add('cols-1');
    } else if (count === 2) {
      grid.classList.add('cols-2');
    } else {
      grid.classList.add('cols-4');
    }

    const items = camData.slice(0, count);
    items.forEach(c => {
      const card = document.createElement('div');
      card.className = 'camera-card';
      card.style.cssText = 'position: relative; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.4); aspect-ratio: 16/9; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.06);';
      
      card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--primary)'; card.style.transform = 'scale(1.02)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = 'rgba(255,255,255,0.06)'; card.style.transform = 'scale(1)'; });

      const img = document.createElement('img');
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      img.alt = c.name;
      img.src = c.url;

      const liveDot = document.createElement('div');
      liveDot.style.cssText = 'position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 4px; padding: 3px 6px; background: rgba(0,0,0,0.6); border-radius: 10px; font-size: 7px; font-weight: 700; color: #fff; text-transform: uppercase; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
      liveDot.innerHTML = '<span style="width: 5px; height: 5px; border-radius: 50%; background: var(--red); display: inline-block; box-shadow: 0 0 4px var(--red); animation: ringPulse 1s infinite;"></span><span>Live</span>';

      const nameBadge = document.createElement('div');
      nameBadge.style.cssText = 'position: absolute; bottom: 6px; left: 6px; padding: 3px 6px; background: rgba(15, 18, 37, 0.75); backdrop-filter: blur(4px); border-radius: 4px; font-size: 8px; font-weight: 600; color: #fff; z-index: 2; border: 1px solid rgba(255,255,255,0.08);';
      nameBadge.textContent = c.name;

      card.append(img, liveDot, nameBadge);

      card.addEventListener('click', () => {
        const fsOverlay = document.getElementById('demoCameraFullscreen');
        const fsImg = document.getElementById('demoFullscreenCameraImg');
        const fsTitle = document.getElementById('demoFullscreenCameraTitle');
        if (fsOverlay && fsImg && fsTitle) {
          fsImg.src = c.url;
          fsTitle.textContent = c.name.split('|')[1].trim();
          fsOverlay.style.display = 'flex';
          setTimeout(() => {
            fsOverlay.style.opacity = '1';
            fsOverlay.style.pointerEvents = 'all';
          }, 10);
        }
      });

      grid.appendChild(card);
    });
  }

  // Bind Buttons
  const buttons = document.querySelectorAll('.btn-cam-count');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = parseInt(btn.dataset.count);
      renderDemoCameras(count);
    });
  });

  // Bind Close Overlay
  const fsOverlay = document.getElementById('demoCameraFullscreen');
  const closeBtn = document.getElementById('closeDemoCameraFullscreen');
  if (fsOverlay && closeBtn) {
    const closeFs = () => {
      fsOverlay.style.opacity = '0';
      fsOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        fsOverlay.style.display = 'none';
      }, 300);
    };
    closeBtn.addEventListener('click', closeFs);
    fsOverlay.addEventListener('click', (e) => {
      if (e.target === fsOverlay || e.target.classList.contains('fa-times') || e.target.id === 'closeDemoCameraFullscreen') closeFs();
    });
  }

  // Render initial
  renderDemoCameras(1);
}

/* --- 13. System Status Gauges Simulator --- */
function initSystemStatusDemo() {
  const cpuInput = document.getElementById('cpuInput');
  const ramInput = document.getElementById('ramInput');
  const diskInput = document.getElementById('diskInput');
  
  const cpuDisplay = document.getElementById('cpuDisplay');
  const ramDisplay = document.getElementById('ramDisplay');
  const diskDisplay = document.getElementById('diskDisplay');
  
  const demoSystemCpu = document.getElementById('demoSystemCpu');
  const demoSystemRam = document.getElementById('demoSystemRam');
  const demoSystemDisk = document.getElementById('demoSystemDisk');
  
  const demoCpuGauge = document.getElementById('demoCpuGauge');
  const demoRamGauge = document.getElementById('demoRamGauge');
  const demoDiskGauge = document.getElementById('demoDiskGauge');

  function updateSystemDemo() {
    if (!cpuInput) return;
    const cpuVal = parseInt(cpuInput.value);
    const ramVal = parseInt(ramInput.value);
    const diskVal = parseInt(diskInput.value);

    // Update Text Outputs
    cpuDisplay.textContent = `${cpuVal} %`;
    ramDisplay.textContent = `${ramVal} %`;
    diskDisplay.textContent = `${diskVal} %`;

    // Update Gauges (values for conic-gradient)
    demoCpuGauge.style.setProperty('--value', cpuVal);
    demoSystemCpu.textContent = `${cpuVal}%`;
    
    demoRamGauge.style.setProperty('--value', ramVal);
    demoSystemRam.textContent = `${ramVal}%`;
    
    demoDiskGauge.style.setProperty('--value', diskVal);
    demoSystemDisk.textContent = `${diskVal}%`;

    // Dynamic color updates
    const getSystemColor = (val) => {
      if (val < 60) return '#34d399'; // green
      if (val < 85) return '#fbbf24'; // orange
      return '#ff3366'; // red
    };

    demoCpuGauge.style.setProperty('--color', getSystemColor(cpuVal));
    demoRamGauge.style.setProperty('--color', getSystemColor(ramVal));
    demoDiskGauge.style.setProperty('--color', getSystemColor(diskVal));
  }

  if (cpuInput && ramInput && diskInput) {
    cpuInput.addEventListener('input', updateSystemDemo);
    ramInput.addEventListener('input', updateSystemDemo);
    diskInput.addEventListener('input', updateSystemDemo);
    updateSystemDemo();
  }
}


