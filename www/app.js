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
  initNeoTalkVoiceDemo();
  initFritzboxDemo();
  initPresenceDemo();
  initClipboardHelpers();
  initSetupTabs();
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

/* --- 7. Neo Talk Voice Assistant Mockup --- */
function initNeoTalkVoiceDemo() {
  const btnTalkMic = document.getElementById('btnTalkMic');
  const voiceWave = document.getElementById('voiceWave');
  const talkStatusSub = document.getElementById('talkStatusSub');
  const talkChatLog = document.getElementById('talkChatLog');

  let activeSim = false;

  const conversationSteps = [
    {
      userText: "Schalte die Lampen im Wohnzimmer an!",
      neoText: "Alles klar! Ich schalte die Wohnzimmerlampen ein. Das grüne Licht am Steckdosen-Relais leuchtet jetzt."
    },
    {
      userText: "Wie wird das Wetter morgen?",
      neoText: "Morgen in Altenburg erwartet dich überwiegend klares Wetter mit bis zu 23 Grad. Perfekt für einen Ausflug!"
    },
    {
      userText: "Wer bist du eigentlich?",
      neoText: "Ich bin Neo, dein digitaler Hausgeist! Ich spuk-steuere deine Geräte und sorge dafür, dass dein Command Deck reibungslos läuft. 👻"
    }
  ];

  let stepIndex = 0;

  btnTalkMic.addEventListener('click', () => {
    if (activeSim) return;
    
    activeSim = true;
    btnTalkMic.classList.add('listening');
    voiceWave.classList.add('listening');
    talkStatusSub.textContent = "Ich höre zu...";
    
    // Choose which command to run
    const currentDialogue = conversationSteps[stepIndex % conversationSteps.length];
    stepIndex++;

    // Step 1: User speaks (Typing out user bubble)
    setTimeout(() => {
      // User Message bubble
      appendMessage("Steffen", currentDialogue.userText, "user");
      btnTalkMic.classList.remove('listening');
      voiceWave.classList.remove('listening');
      talkStatusSub.textContent = "Neo denkt nach...";
    }, 2000);

    // Step 2: Neo responds
    setTimeout(() => {
      appendMessage("<i class='fas fa-ghost'></i> Neo", currentDialogue.neoText, "neo");
      talkStatusSub.textContent = "Klicke zum Sprechen";
      activeSim = false;

      // Special interaction: If user wanted to toggle living room lights,
      // trigger simulated light switches on the tablet screen inside the hero mockup!
      if (currentDialogue.userText.includes("Wohnzimmer")) {
        const plugInTablet = document.querySelector('.sim-plug');
        if (plugInTablet) {
          plugInTablet.classList.add('active');
          // Automatically hide after some time or toggle
          setTimeout(() => {
            plugInTablet.classList.toggle('active');
          }, 3500);
        }
      }
    }, 3800);
  });

  function appendMessage(sender, text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${type}`;
    msg.innerHTML = `
      <span class="sender">${sender}:</span>
      <p class="message-content">${text}</p>
    `;
    talkChatLog.appendChild(msg);
    
    // Scroll terminal chat log to bottom
    talkChatLog.scrollTop = talkChatLog.scrollHeight;
  }
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
  const windowsGuide = document.getElementById('guide-windows');
  const linuxGuide = document.getElementById('guide-linux');
  
  if (!tabs.length || !windowsGuide || !linuxGuide) return;
  
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
      
      // Show/Hide guides
      if (os === 'windows') {
        windowsGuide.style.display = 'grid';
        linuxGuide.style.display = 'none';
      } else {
        windowsGuide.style.display = 'none';
        linuxGuide.style.display = 'grid';
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
    });
  });

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
  countText.textContent = activeCount === 1 ? '1 Person' : `\${activeCount} Personen`;
}

