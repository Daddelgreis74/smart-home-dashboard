// Setup Client Controller for isolated setup.html

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentStep = 1;
  const totalSteps = 7;
  
  const config = {
    dashboard_lang: 'de',
    dashboard_theme: 'theme-aurora',
    weather_location: '',
    weather_provider: 'openmeteo',
    weather_lat: null,
    weather_lon: null,
    weather_loc_resolved: '',
    temp_sensor_ip: '',
    sensorIp: '', // Duplicate for compatibility
    tasmota_scan_subnet: '192.168.178',
    jarvis_provider: 'gemini',
    jarvis_gemini_api_key: '',
    jarvis_openrouter_api_key: '',
    jarvis_eleven_api_key: '',
    jarvis_speech_output_enabled: false,
    jarvis_tts_enabled: false
  };

  const fritzbox = {
    ip: '',
    user: '',
    pass: '',
    callMonitorEnabled: false
  };

  const tasmotaDevices = [];
  let icsUploaded = false;

  // Check if calendar already exists
  fetch('/api/appointments/ics-data')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.data) {
        icsUploaded = true;
        const indicator = document.getElementById('setupIcsIndicator');
        if (indicator) {
          showIndicator(indicator, 'success', 'Bereits konfiguriert (calendar.ics auf dem Server vorhanden)');
        }
      }
    })
    .catch(() => {});

  // DOM Elements
  const prevBtn = document.getElementById('setupPrevBtn');
  const nextBtn = document.getElementById('setupNextBtn');
  const skipBtn = document.getElementById('setupSkipBtn');
  const progressBar = document.getElementById('setupProgressBar');
  const stepDots = document.querySelectorAll('.setup-step-dot');
  const stepViews = document.querySelectorAll('.setup-step-view');

  // Initialize UI
  applyTheme(config.dashboard_theme);
  updateStepUI();

  // Navigation handlers
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
    }
  });

  nextBtn.addEventListener('click', async () => {
    saveStepData(currentStep);
    if (currentStep === totalSteps) {
      await finishSetup();
    } else {
      currentStep++;
      updateStepUI();
    }
  });

  skipBtn.addEventListener('click', () => {
    // Clear inputs in current step to represent "Skipped"
    clearStepInputs(currentStep);
    if (currentStep < totalSteps) {
      currentStep++;
      updateStepUI();
    }
  });

  // Step 1: Theme selection listener
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const theme = card.getAttribute('data-theme');
      config.dashboard_theme = theme;
      applyTheme(theme);
    });
  });

  // Step 1: Language selection listener
  const langSelect = document.getElementById('setupLang');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      config.dashboard_lang = langSelect.value;
    });
  }

  // Step 2: Weather location test
  const testWeatherBtn = document.getElementById('setupTestWeather');
  if (testWeatherBtn) {
    testWeatherBtn.addEventListener('click', async () => {
      const locInput = document.getElementById('setupWeatherLoc');
      const indicator = document.getElementById('setupWeatherIndicator');
      if (!locInput || !indicator) return;

      const location = locInput.value.trim();
      if (!location) {
        showIndicator(indicator, 'error', 'Bitte einen Ort eingeben.');
        return;
      }

      showIndicator(indicator, 'loading', 'Ort wird überprüft...');
      try {
        const res = await fetch('/api/weather/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location })
        });
        const data = await res.json();
        if (data.success) {
          showIndicator(indicator, 'success', `Gefunden: ${data.resolvedLocation} (${data.country})`);
          config.weather_location = data.resolvedLocation;
          config.weather_lat = data.lat;
          config.weather_lon = data.lon;
          config.weather_loc_resolved = `${data.resolvedLocation}, ${data.country}`;
        } else {
          showIndicator(indicator, 'error', data.error || 'Fehler beim Finden des Ortes.');
        }
      } catch (err) {
        showIndicator(indicator, 'error', 'Netzwerkfehler beim Verbindungstest.');
      }
    });
  }

  // Step 3: Fritzbox connection test
  const testFritzBtn = document.getElementById('setupTestFritz');
  if (testFritzBtn) {
    testFritzBtn.addEventListener('click', async () => {
      const ipInput = document.getElementById('setupFritzIp');
      const indicator = document.getElementById('setupFritzIndicator');
      if (!ipInput || !indicator) return;

      const ip = ipInput.value.trim();
      if (!ip) {
        showIndicator(indicator, 'error', 'Bitte IP-Adresse eingeben.');
        return;
      }

      showIndicator(indicator, 'loading', 'Fritz!Box wird angepingt...');
      try {
        const res = await fetch('/api/fritzbox/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip })
        });
        const data = await res.json();
        if (data.success) {
          showIndicator(indicator, 'success', 'Fritz!Box erfolgreich erreicht!');
        } else {
          showIndicator(indicator, 'error', data.error || 'Keine Antwort auf Port 49000.');
        }
      } catch (err) {
        showIndicator(indicator, 'error', 'Verbindungsfehler.');
      }
    });
  }

  // Step 4: Tasmota scan subnet
  const scanSubnetBtn = document.getElementById('setupScanSubnet');
  if (scanSubnetBtn) {
    scanSubnetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const subnetInput = document.getElementById('setupTasmotaSubnet');
      const indicator = document.getElementById('setupTasmotaIndicator');
      const resultsDiv = document.getElementById('setupTasmotaScanResults');
      if (!subnetInput || !indicator || !resultsDiv) return;

      const baseIp = subnetInput.value.trim();
      if (!baseIp) {
        showIndicator(indicator, 'error', 'Bitte Subnetz eingeben (z.B. 192.168.178).');
        return;
      }

      showIndicator(indicator, 'loading', 'Subnetz wird gescannt (dauert ca. 10 Sekunden)...');
      resultsDiv.innerHTML = '';
      try {
        const res = await fetch('/api/tasmota/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseIp })
        });
        const data = await res.json();
        if (data.success && data.found && data.found.length > 0) {
          showIndicator(indicator, 'success', `${data.found.length} Tasmota-Geräte gefunden!`);
          tasmotaDevices.length = 0;
          data.found.forEach(dev => {
            tasmotaDevices.push({ ip: dev.ip, name: dev.name });
            const item = document.createElement('div');
            item.className = 'scan-result-item';
            
            const isMain = document.getElementById('setupTasmotaIp').value.trim() === dev.ip;
            item.innerHTML = `
              <span>🔌 <b>${dev.name}</b> (${dev.ip})</span>
              <div class="scan-result-actions">
                <span class="scan-result-badge"><i class="fas fa-check"></i> Importiert</span>
                <button class="btn-select-sensor ${isMain ? 'active' : ''}" data-ip="${dev.ip}">
                  <i class="fas ${isMain ? 'fa-check' : 'fa-thermometer-half'}"></i> ${isMain ? 'Haupt-Sensor' : 'Als Haupt-Sensor setzen'}
                </button>
              </div>
            `;

            const btn = item.querySelector('.btn-select-sensor');
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              
              // Reset all select buttons
              document.querySelectorAll('.btn-select-sensor').forEach(b => {
                b.classList.remove('active');
                b.innerHTML = '<i class="fas fa-thermometer-half"></i> Als Haupt-Sensor setzen';
              });
              
              // Set active
              btn.classList.add('active');
              btn.innerHTML = '<i class="fas fa-check"></i> Haupt-Sensor';
              
              document.getElementById('setupTasmotaIp').value = dev.ip;
              config.temp_sensor_ip = dev.ip;
              config.sensorIp = dev.ip;
            });
            resultsDiv.appendChild(item);
          });
        } else {
          showIndicator(indicator, 'error', data.error || 'Keine Geräte im Subnetz gefunden.');
        }
      } catch (err) {
        showIndicator(indicator, 'error', 'Scannen fehlgeschlagen.');
      }
    });
  }

  // Step 5: Abfallkalender file upload
  const uploadIcsBtn = document.getElementById('setupUploadIcs');
  if (uploadIcsBtn) {
    uploadIcsBtn.addEventListener('click', async () => {
      const fileInput = document.getElementById('setupIcsFile');
      const indicator = document.getElementById('setupIcsIndicator');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showIndicator(indicator, 'error', 'Bitte wähle zuerst eine .ics-Datei aus.');
        return;
      }
      
      const file = fileInput.files[0];
      showIndicator(indicator, 'loading', 'Datei wird hochgeladen...');
      
      const formData = new FormData();
      formData.append('icsFile', file);
      
      try {
        const res = await fetch('/api/appointments/upload-ics', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          icsUploaded = true;
          showIndicator(indicator, 'success', `Erfolgreich hochgeladen: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        } else {
          showIndicator(indicator, 'error', data.error || 'Upload fehlgeschlagen.');
        }
      } catch (err) {
        showIndicator(indicator, 'error', 'Upload fehlgeschlagen: ' + err.message);
      }
    });
  }

  // Update visual progress and views
  function updateStepUI() {
    // Progress Bar
    const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressBar.style.width = `${percent}%`;

    // Step dots state
    stepDots.forEach((dot, index) => {
      const stepNum = index + 1;
      dot.className = 'setup-step-dot';
      if (stepNum === currentStep) {
        dot.classList.add('active');
      } else if (stepNum < currentStep) {
        dot.classList.add('completed');
      }
    });

    // Step views toggle
    stepViews.forEach((view, index) => {
      const stepNum = index + 1;
      view.classList.toggle('active', stepNum === currentStep);
    });

    // Buttons configuration
    prevBtn.disabled = currentStep === 1;
    
    if (currentStep === totalSteps) {
      updateSummaryCard();
      nextBtn.innerHTML = 'Dashboard freischalten <i class="fas fa-rocket"></i>';
      nextBtn.className = 'btn btn-primary';
      nextBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
      nextBtn.innerHTML = 'Weiter <i class="fas fa-chevron-right"></i>';
      nextBtn.className = 'btn btn-primary';
      nextBtn.style.background = '';
    }

    // Skippable steps: FritzBox (3), Tasmota (4), Abfallkalender (5), Jarvis (6)
    const skippableSteps = [3, 4, 5, 6];
    if (skippableSteps.includes(currentStep)) {
      skipBtn.style.display = 'inline-flex';
    } else {
      skipBtn.style.display = 'none';
    }
  }

  // Helper to dynamically apply selected theme to body background
  function applyTheme(themeClass) {
    document.body.className = '';
    document.body.classList.add(themeClass);
    localStorage.setItem('dashboard_theme', themeClass);
  }

  // Helper to clear step input values on skip
  function clearStepInputs(step) {
    if (step === 3) {
      document.getElementById('setupFritzIp').value = '';
      document.getElementById('setupFritzUser').value = '';
      document.getElementById('setupFritzPass').value = '';
    } else if (step === 4) {
      document.getElementById('setupTasmotaIp').value = '';
    } else if (step === 5) {
      document.getElementById('setupIcsFile').value = '';
    } else if (step === 6) {
      document.getElementById('setupJarvisKey').value = '';
      document.getElementById('setupJarvisElevenKey').value = '';
    }
  }

  // Save current step data into config states
  function saveStepData(step) {
    if (step === 2) {
      const locInput = document.getElementById('setupWeatherLoc');
      if (locInput) config.weather_location = locInput.value.trim();
    } else if (step === 3) {
      const ip = document.getElementById('setupFritzIp').value.trim();
      const user = document.getElementById('setupFritzUser').value.trim();
      const pass = document.getElementById('setupFritzPass').value.trim();
      if (ip) {
        fritzbox.ip = ip;
        fritzbox.user = user;
        fritzbox.pass = pass;
        fritzbox.callMonitorEnabled = true;
      } else {
        fritzbox.ip = '';
      }
    } else if (step === 4) {
      const ip = document.getElementById('setupTasmotaIp').value.trim();
      const subnet = document.getElementById('setupTasmotaSubnet').value.trim();
      if (ip) {
        config.temp_sensor_ip = ip;
        config.sensorIp = ip;
      } else {
        config.temp_sensor_ip = '';
        config.sensorIp = '';
      }
      if (subnet) config.tasmota_scan_subnet = subnet;
    } else if (step === 6) {
      const provider = document.getElementById('setupJarvisProvider').value;
      const key = document.getElementById('setupJarvisKey').value.trim();
      const elevenKey = document.getElementById('setupJarvisElevenKey').value.trim();

      config.jarvis_provider = provider;
      if (key) {
        if (provider === 'gemini') {
          config.jarvis_gemini_api_key = key;
          config.jarvis_openrouter_api_key = '';
        } else {
          config.jarvis_openrouter_api_key = key;
          config.jarvis_gemini_api_key = '';
        }
        config.jarvis_speech_output_enabled = true;
      } else {
        config.jarvis_gemini_api_key = '';
        config.jarvis_openrouter_api_key = '';
        config.jarvis_speech_output_enabled = false;
      }
      if (elevenKey) {
        config.jarvis_eleven_api_key = elevenKey;
        config.jarvis_tts_enabled = true;
      } else {
        config.jarvis_eleven_api_key = '';
        config.jarvis_tts_enabled = false;
      }
    }
  }

  // Update summary overview card in step 6
  function updateSummaryCard() {
    document.getElementById('sumLang').textContent = config.dashboard_lang === 'de' ? 'Deutsch' : 'English';
    
    let themeText = 'Aurora Nordlicht';
    if (config.dashboard_theme === 'theme-stealth') themeText = 'Stealth Dark';
    else if (config.dashboard_theme === 'theme-retrowave') themeText = 'Retro Cyberpunk';
    document.getElementById('sumTheme').textContent = themeText;

    document.getElementById('sumWeather').textContent = config.weather_location 
      ? config.weather_location 
      : 'Nicht konfiguriert';

    document.getElementById('sumFritz').textContent = fritzbox.ip 
      ? `Aktiv (${fritzbox.ip})` 
      : 'Deaktiviert';

    document.getElementById('sumTasmota').textContent = config.temp_sensor_ip 
      ? `Aktiv (${config.temp_sensor_ip})` 
      : 'Deaktiviert';
      
    document.getElementById('sumWaste').textContent = icsUploaded 
      ? 'Aktiv (calendar.ics)' 
      : 'Deaktiviert';
 
    document.getElementById('sumJarvis').textContent = (config.jarvis_gemini_api_key || config.jarvis_openrouter_api_key) 
      ? `Aktiv (${config.jarvis_provider.toUpperCase()})` 
      : 'Deaktiviert';
  }

  // Display verification state status indicator
  function showIndicator(element, type, text) {
    element.className = `setup-test-indicator ${type}`;
    element.style.display = 'inline-flex';
    
    let icon = '';
    if (type === 'loading') icon = '<i class="fas fa-spinner fa-spin"></i>';
    else if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    
    element.innerHTML = `${icon} ${text}`;
  }

  // Submit collected configurations and trigger main interface reload
  async function finishSetup() {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    nextBtn.innerHTML = 'Einrichten... <i class="fas fa-spinner fa-spin"></i>';

    try {
      const res = await fetch('/api/config/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, fritzbox, tasmota: tasmotaDevices })
      });
      const data = await res.json();
      if (data.success) {
        // Success! Reload page - server will now serve the real index.html
        window.location.reload();
      } else {
        throw new Error(data.error || 'Speichern der Einstellungen fehlgeschlagen');
      }
    } catch (err) {
      alert(`Fehler beim Einrichten: ${err.message}`);
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      updateStepUI();
    }
  }
});
