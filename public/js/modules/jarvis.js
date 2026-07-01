import { Config } from './config.js';
import { playJarvisBeep } from './utils.js';
import { tasmotaDevices, fetchTasmotaList, refreshTasmotaStatus, saveTasmotaList } from './tasmota.js';

export let jarvisHistory = [];
export let jarvisRecognition = null;
export let jarvisSpeakingUtterance = null;
export let elevenLabsAudio = null;
export let currentTtsRequestId = 0;

export function cancelJarvisSpeech() {
  currentTtsRequestId++;
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  if (elevenLabsAudio) {
    try {
      elevenLabsAudio.pause();
      elevenLabsAudio.currentTime = 0;
    } catch(e) {}
    elevenLabsAudio = null;
  }
  const reactor = document.getElementById('jarvisReactor');
  if (reactor) reactor.classList.remove('speaking');
  const statusSpan = document.getElementById('jarvisStatus');
  if (statusSpan && (statusSpan.textContent === 'Antwortet...' || statusSpan.textContent === 'Hör zu...')) {
    statusSpan.textContent = 'Online';
  }
}

export function speakLocalSpeech(text) {
  if (!('speechSynthesis' in window)) return;
  
  const lang = Config.get('dashboard_lang', 'de');
  jarvisSpeakingUtterance = new SpeechSynthesisUtterance(text);
  
  jarvisSpeakingUtterance.onstart = () => {
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan) statusSpan.textContent = 'Antwortet...';
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.add('speaking');
  };
  
  const resetSpeechUI = () => {
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan && statusSpan.textContent === 'Antwortet...') {
      statusSpan.textContent = 'Online';
    }
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.remove('speaking');
  };
  
  jarvisSpeakingUtterance.onend = resetSpeechUI;
  jarvisSpeakingUtterance.onerror = resetSpeechUI;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const savedLocalVoiceName = Config.get('jarvis_local_voice_name', '');
    if (savedLocalVoiceName) {
      const exact = voices.find(v => v.name === savedLocalVoiceName);
      if (exact) {
        jarvisSpeakingUtterance.voice = exact;
      }
    } else {
      const langVoices = voices.filter(v => v.lang.startsWith(lang));
      if (langVoices.length > 0) {
        const maleNames = ['stefan', 'Conrad', 'yannick', 'markus', 'christoph', 'Klaus', 'male', 'guy', 'männlich'];
        let maleVoice = langVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          return (nameLower.includes('natural') || nameLower.includes('online')) &&
                 maleNames.some(n => nameLower.includes(n));
        });
        if (!maleVoice) {
          maleVoice = langVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return maleNames.some(n => nameLower.includes(n));
          });
        }
        if (!maleVoice) {
          maleVoice = langVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return nameLower.includes('natural') || nameLower.includes('online');
          });
        }
        jarvisSpeakingUtterance.voice = maleVoice || langVoices[0];
      }
    }
  }

  const langMap = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL' };
  jarvisSpeakingUtterance.lang = langMap[lang] || 'de-DE';
  jarvisSpeakingUtterance.rate = 1.05;
  jarvisSpeakingUtterance.pitch = 0.95;

  window.speechSynthesis.speak(jarvisSpeakingUtterance);
}

export function speakJarvisReply(text) {
  cancelJarvisSpeech();
  
  const enabled = Config.get('jarvis_tts_enabled', 'true') !== 'false';
  if (!enabled) return;
  
  const provider = Config.get('jarvis_tts_provider', 'local');
  
  if (provider === 'elevenlabs') {
    const apiKey = Config.get('jarvis_eleven_api_key', '');
    const voiceId = Config.get('jarvis_eleven_voice_id', '21m00Tcm4TlvDq8ikWAM');
    
    if (!apiKey) {
      console.warn("ElevenLabs API Key fehlt, nutze lokale Sprachausgabe.");
      speakLocalSpeech(text);
      return;
    }
    
    const requestId = ++currentTtsRequestId;
    
    const statusSpan = document.getElementById('jarvisStatus');
    if (statusSpan) statusSpan.textContent = 'Antwortet...';
    const reactor = document.getElementById('jarvisReactor');
    if (reactor) reactor.classList.add('speaking');
    
    fetch('/api/elevenlabs/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Key': apiKey
      },
      body: JSON.stringify({ text, voiceId })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('ElevenLabs API returned ' + response.status);
      }
      return response.blob();
    })
    .then(blob => {
      if (requestId !== currentTtsRequestId) {
        console.log("ElevenLabs: Eine neuere Sprachausgabe wurde gestartet, verwerfe alte.");
        return;
      }
      
      const audioUrl = URL.createObjectURL(blob);
      elevenLabsAudio = new Audio(audioUrl);
      
      const resetSpeechUI = () => {
        const currentStatusSpan = document.getElementById('jarvisStatus');
        if (currentStatusSpan && currentStatusSpan.textContent === 'Antwortet...') {
          currentStatusSpan.textContent = 'Online';
        }
        const currentReactor = document.getElementById('jarvisReactor');
        if (currentReactor) currentReactor.classList.remove('speaking');
        if (elevenLabsAudio) {
          URL.revokeObjectURL(audioUrl);
          elevenLabsAudio = null;
        }
      };
      
      elevenLabsAudio.onended = resetSpeechUI;
      elevenLabsAudio.onerror = (e) => {
        console.error("Audio-Fehler bei ElevenLabs Playback:", e);
        resetSpeechUI();
        if (requestId === currentTtsRequestId) {
          speakLocalSpeech(text);
        }
      };
      
      elevenLabsAudio.play().catch(err => {
        console.error("Fehler beim Abspielen von ElevenLabs Audio:", err);
        resetSpeechUI();
        if (requestId === currentTtsRequestId) {
          speakLocalSpeech(text);
        }
      });
    })
    .catch(err => {
      console.error("ElevenLabs TTS-Anfrage fehlgeschlagen:", err);
      if (requestId === currentTtsRequestId) {
        const currentStatusSpan = document.getElementById('jarvisStatus');
        if (currentStatusSpan && currentStatusSpan.textContent === 'Antwortet...') {
          currentStatusSpan.textContent = 'Online';
        }
        const currentReactor = document.getElementById('jarvisReactor');
        if (currentReactor) currentReactor.classList.remove('speaking');
        speakLocalSpeech(text);
      }
    });
  } else {
    speakLocalSpeech(text);
  }
}

export async function callJarvisAPI(prompt) {
  const provider = Config.get('jarvis_provider', 'simulator');
  const searchEnabled = Config.get('jarvis_search_enabled', 'false') === 'true';
  const braveKey = Config.get('jarvis_brave_api_key', '');
  let apiKey = '';
  if (provider === 'gemini') {
    apiKey = Config.get('jarvis_gemini_api_key', '');
  } else if (provider === 'openrouter') {
    apiKey = Config.get('jarvis_openrouter_api_key', '');
  }
  const model = Config.get('jarvis_model', 'gemini-2.5-flash');
  const customModel = Config.get('jarvis_custom_model', '');
  const systemPrompt = Config.get('jarvis_system_prompt', 'Du bist J.A.R.V.I.S., eine hochentwickelte KI. Antworte kurz, präzise und charmant auf Deutsch.');
  
  const activeModel = customModel.trim() || model;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  let activeSystemPrompt = systemPrompt;
  activeSystemPrompt += `\nDu bist ein vollfunktionsfähiger, intelligenter Assistent. Du kannst allgemeine Fragen beantworten, Smalltalk führen, und hast zusätzlich Zugriff auf Smart-Home-Funktionen. Begrenze dich nicht selbst auf Smart-Home-Befehle.`;
  activeSystemPrompt += `\nAktuelle Zeit: ${dateStr}, ${timeStr} Uhr. Nutze diese Information, wenn der Benutzer nach Datum oder Uhrzeit fragt.`;
  
  if (searchEnabled && braveKey) {
    activeSystemPrompt += `\nDu hast Zugriff auf eine Echtzeit-Websuche. Nutze das Tool 'web_search', um aktuelle Informationen, Wetter, News oder Wissensfragen zu recherchieren, wenn deine internen Daten nicht ausreichen oder veraltet sein könnten.`;
  }
  
  if (tasmotaDevices && tasmotaDevices.length > 0) {
    const devicesList = tasmotaDevices.map(d => `${d.name} (IP: ${d.ip})`).join(', ');
    activeSystemPrompt += `\nRegistrierte Smart-Home-Geräte (Tasmota) im Haushalt: ${devicesList}. Nutze diese exakten Bezeichnungen oder IPs für Funktionsaufrufe.`;
  }
  
  if (provider === 'simulator') {
    return new Promise((resolve) => {
      setTimeout(() => {
        const replies = [
          "Selbstverständlich, Sir. Alle lebenserhaltenden Systeme laufen im optimalen Bereich. Die Energieversorgung ist stabil bei 100%.",
          "Ich habe einen Scan des lokalen Smart-Home-Netzwerks durchgeführt. Alle Tasmota-Steckdosen und die Fritz!Box reagieren normal.",
          "Wie Sie wünschen, Sir. Soll ich die Lichter regulieren oder das Fritzbox-Anruferprotokoll für Sie aufbereiten?",
          "Sir, ich stehe Ihnen bei jeder Fragestellung zur Seite. Wie kann ich Sie heute bei Ihren Projekten unterstützen?",
          "Protokoll 11 gestartet... Scherz beiseite, Sir. Welches Gerät oder welche Statusabfrage wünschen Sie?"
        ];
        resolve(replies[Math.floor(Math.random() * replies.length)]);
      }, 1000 + Math.random() * 1000);
    });
  }
  
  if (!apiKey) {
    throw new Error("API-Schlüssel fehlt! Bitte konfiguriere ihn in den Einstellungen.");
  }
  
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
    
    const contents = [];
    jarvisHistory.forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const tasmotaTools = [
      {
        functionDeclarations: [
          {
            name: "tasmota_control",
            description: "Steuert Tasmota-Smart-Home-Geräte im lokalen Netzwerk via HTTP (Ein-/Ausschalten, umschalten oder Status abfragen).",
            parameters: {
              type: "OBJECT",
              properties: {
                ip: {
                  type: "STRING",
                  description: "Die lokale IP-Adresse oder der gespeicherte Name des Geräts (z.B. '192.168.178.50' oder 'Stehlampe')"
                },
                action: {
                  type: "STRING",
                  description: "Die auszuführende Aktion: 'on' | 'off' | 'toggle' | 'status'"
                }
              },
              required: ["ip", "action"]
            }
          },
          {
            name: "tasmota_scan",
            description: "Scannt das lokale Netzwerk selbstständig nach Tasmota-Geräten und speichert die Namen und IPs in der Konfiguration.",
            parameters: {
              type: "OBJECT",
              properties: {
                subnet: {
                  type: "STRING",
                  description: "Optionales Subnetz für den Scan (z.B. '192.168.178'). Falls nicht angegeben, wird das im Dashboard konfigurierte oder das Standard-Subnetz verwendet."
                }
              }
            }
          },
          {
            name: "get_calendar_events",
            description: "Ruft die nächsten anstehenden Termine (z. B. Müllabfuhrtermine und persönliche Termine) aus dem Kalender ab.",
            parameters: {
              type: "OBJECT",
              properties: {
                limit: {
                  type: "INTEGER",
                  description: "Optionale maximale Anzahl der zurückzugebenden Termine (Standard: 4)."
                }
              }
            }
          },
          {
            name: "add_calendar_event",
            description: "Trägt einen neuen persönlichen Termin in den Kalender ein (z. B. Arzttermin, Treffen, Erinnerungen).",
            parameters: {
              type: "OBJECT",
              properties: {
                title: {
                  type: "STRING",
                  description: "Der Titel des Termins (z.B. 'Zahnarzt', 'Einkaufen', 'Treffen mit Julia')"
                },
                date: {
                  type: "STRING",
                  description: "Das Datum des Termins im Format YYYY-MM-DD"
                },
                time: {
                  type: "STRING",
                  description: "Die Uhrzeit des Termins im Format HH:MM (z.B. '14:30')"
                },
                description: {
                  type: "STRING",
                  description: "Optionale nähere Beschreibung des Termins"
                }
              },
              required: ["title", "date", "time"]
            }
          }
        ]
      }
    ];

    if (searchEnabled && braveKey) {
      tasmotaTools[0].functionDeclarations.push({
        name: "web_search",
        description: "Führt eine Websuche durch, um aktuelle Informationen, News, Wetter oder Daten zu recherchieren.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Der Suchbegriff oder die Suchanfrage (z.B. 'Wetter heute Berlin' oder 'Wer hat die Bundestagswahl gewonnen')"
            }
          },
          required: ["query"]
        }
      });
    }

    let loopCount = 0;
    const maxLoops = 5;

    while (loopCount < maxLoops) {
      loopCount++;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          tools: tasmotaTools,
          systemInstruction: { parts: [{ text: activeSystemPrompt }] },
          generationConfig: { 
            maxOutputTokens: 2000,
            temperature: 0.7 
          }
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP Fehler ${response.status}`);
      }
      
      const data = await response.json();
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Ungültiges Antwortformat von Gemini erhalten.");
      }

      const functionCallPart = candidate.content.parts.find(p => p.functionCall);
      
      if (functionCallPart) {
        contents.push(candidate.content);

        const call = functionCallPart.functionCall;
        const functionName = call.name;
        const args = call.args || {};
        let functionResult;

        try {
          if (functionName === 'tasmota_control') {
            const target = String(args.ip || '').trim();
            const action = String(args.action || 'toggle').trim().toLowerCase();
            
            if (tasmotaDevices.length === 0) {
              await fetchTasmotaList();
            }

            const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
            let deviceIp = '';
            let matchedName = target;

            if (isIp) {
              deviceIp = target;
              const known = tasmotaDevices.find(d => d.ip === target);
              if (known) matchedName = known.name;
            } else if (target) {
              const searchName = target.toLowerCase();
              const matched = tasmotaDevices.find(d => 
                d.name.toLowerCase().includes(searchName) || 
                searchName.includes(d.name.toLowerCase())
              );
              if (matched) {
                deviceIp = matched.ip;
                matchedName = matched.name;
              }
            }

            if (deviceIp) {
              if (action === 'status') {
                const statusRes = await fetch('/api/tasmota/status');
                const statusArray = await statusRes.json();
                const devStatus = statusArray.find(s => s.ip === deviceIp);
                if (devStatus) {
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    online: devStatus.online,
                    state: devStatus.state
                  };
                } else {
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    status: "Registriert, Status konnte nicht abgefragt werden."
                  };
                }
              } else {
                let apiAction = 'TOGGLE';
                if (action === 'on') apiAction = 'ON';
                if (action === 'off') apiAction = 'OFF';

                const powerRes = await fetch('/api/tasmota/power', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ip: deviceIp, action: apiAction })
                });
                const powerData = await powerRes.json();

                if (powerData.success) {
                  setTimeout(refreshTasmotaStatus, 100);
                  functionResult = {
                    success: true,
                    deviceName: matchedName,
                    ip: deviceIp,
                    action: action,
                    state: powerData.state
                  };
                } else {
                  functionResult = {
                    success: false,
                    error: powerData.error || "Aktion fehlgeschlagen."
                  };
                }
              }
            } else {
              functionResult = {
                success: false,
                error: `Gerät '${target}' konnte nicht gefunden werden. Registrierte Geräte: ${tasmotaDevices.map(d => d.name).join(', ') || 'Keine'}`
              };
            }
          } else if (functionName === 'tasmota_scan') {
            let base = String(args.subnet || '').trim();
            if (!base) {
              base = document.getElementById('tasmotaSubnet')?.value.trim() || '';
            }
            if (!base) {
              base = '192.168.178';
            }
            
            if (base.endsWith('.0')) base = base.slice(0, -2);
            if (base.endsWith('.')) base = base.slice(0, -1);

            const scanRes = await fetch('/api/tasmota/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ baseIp: base })
            });
            const scanData = await scanRes.json();

            if (scanData.success && scanData.found) {
              let newCount = 0;
              scanData.found.forEach(f => {
                if (!tasmotaDevices.find(d => d.ip === f.ip)) {
                  tasmotaDevices.push(f);
                  newCount++;
                }
              });
              if (newCount > 0) {
                await saveTasmotaList();
              }
              setTimeout(refreshTasmotaStatus, 100);
              functionResult = {
                success: true,
                message: `Scan erfolgreich abgeschlossen in Subnetz ${base}.x. ${scanData.found.length} Geräte gefunden, davon ${newCount} neu hinzugefügt.`,
                foundDevices: scanData.found
              };
            } else {
              functionResult = {
                success: false,
                error: scanData.error || "Netzwerk-Scan fehlgeschlagen."
              };
            }
          } else if (functionName === 'get_calendar_events') {
            const limit = Number(args.limit || 6);
            let icsEvents = [];
            try {
              const res = await fetch('/api/appointments/ics-data');
              const data = await res.json();
              if (data.success && data.data) {
                const lines = data.data.split('\n');
                let inEvent = false, evt = {};
                lines.forEach(l => {
                  const line = l.trim();
                  if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; evt = {}; }
                  else if (line.startsWith('END:VEVENT')) { inEvent = false; if(evt.date) icsEvents.push(evt); }
                  else if (inEvent) {
                    if (line.startsWith('SUMMARY:')) evt.summary = line.substring(8).replace('\\,', ',');
                    else { const m = line.match(/DTSTART[^:]*:(\d{8})/); if(m) evt.date = m[1]; }
                  }
                });
              }
            } catch (err) {
              console.warn("Fehler beim Laden der ICS-Daten für J.A.R.V.I.S.:", err);
            }

            let apptEvents = [];
            try {
              const res = await fetch('/api/appointments');
              if (res.ok) {
                apptEvents = await res.json();
              }
            } catch (err) {
              console.warn("Fehler beim Laden der Termine für J.A.R.V.I.S.:", err);
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayStrICS = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
            const todayStrAppt = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

            const formattedIcs = icsEvents
              .filter(e => e.date >= todayStrICS)
              .map(e => {
                const year = e.date.substring(0, 4);
                const month = e.date.substring(4, 6);
                const day = e.date.substring(6, 8);
                return {
                  type: "Abfalltermin",
                  date: `${year}-${month}-${day}`,
                  time: "Ganztägig",
                  title: e.summary,
                  description: "Müllabfuhr-Termin"
                };
              });

            const formattedAppts = apptEvents
              .filter(e => e.date >= todayStrAppt)
              .map(e => ({
                type: "Persönlicher Termin",
                date: e.date,
                time: e.time,
                title: e.title,
                description: e.description || ""
              }));

            const allEvents = [...formattedIcs, ...formattedAppts];

            allEvents.sort((a, b) => {
              const timeA = a.time === 'Ganztägig' ? '00:00' : a.time;
              const timeB = b.time === 'Ganztägig' ? '00:00' : b.time;
              const dateA = new Date(`${a.date}T${timeA}`);
              const dateB = new Date(`${b.date}T${timeB}`);
              return dateA - dateB;
            });

            const finalEvents = allEvents.slice(0, limit).map(e => {
              const [year, month, day] = e.date.split('-');
              return {
                type: e.type,
                date: `${day}.${month}.${year}`,
                time: e.time,
                title: e.title,
                description: e.description
              };
            });

            functionResult = {
              success: true,
              events: finalEvents
            };
          } else if (functionName === 'add_calendar_event') {
            const title = String(args.title || '').trim();
            const date = String(args.date || '').trim();
            const time = String(args.time || '').trim();
            const description = String(args.description || '').trim();

            if (!title || !date || !time) {
              functionResult = {
                success: false,
                error: "Titel, Datum und Uhrzeit sind erforderlich."
              };
            } else {
              const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, date, time, description })
              });
              const responseData = await response.json();
              if (responseData.success) {
                functionResult = {
                  success: true,
                  message: "Termin erfolgreich hinzugefügt.",
                  appointment: responseData.appointment
                };
              } else {
                functionResult = {
                  success: false,
                  error: responseData.error || "Fehler beim Erstellen des Termins."
                };
              }
            }
          } else if (functionName === 'web_search') {
            const query = String(args.query || '').trim();
            if (!query) {
              functionResult = { success: false, error: "Suchanfrage ist leer." };
            } else {
              const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                headers: { 'x-brave-key': braveKey }
              });
              const searchData = await res.json();
              if (searchData.success) {
                functionResult = {
                  success: true,
                  results: searchData.results
                };
              } else {
                functionResult = {
                  success: false,
                  error: searchData.error || "Websuche war nicht erfolgreich."
                };
              }
            }
          } else {
            functionResult = {
              success: false,
              error: `Unbekannte Funktion: ${functionName}`
            };
          }
        } catch (err) {
          console.error("Error executing Gemini tool:", err);
          functionResult = {
            success: false,
            error: err.message
          };
        }

        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: functionName,
              response: functionResult
            }
          }]
        });

        continue;
      }

      let reply = "";
      const textParts = candidate.content.parts.filter(part => !part.thought && part.text);
      if (textParts.length > 0) {
        reply = textParts.map(part => part.text).join("").trim();
      }
      
      if (!reply) {
        console.warn("Gemini Leere Antwort Daten:", data);
        const finishReason = candidate?.finishReason;
        const safetyNotice = finishReason ? ` (FinishReason: ${finishReason})` : '';
        const dataSnippet = JSON.stringify(data).substring(0, 120);
        throw new Error(`Keine Antwort von Gemini erhalten${safetyNotice}. Details: ${dataSnippet}...`);
      }
      return reply;
    }

    throw new Error("Maximale Anzahl an Funktionsaufrufen erreicht.");
  }
  
  if (provider === 'openrouter') {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const messages = [{ role: 'system', content: activeSystemPrompt }];
    jarvisHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });
    messages.push({ role: 'user', content: prompt });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Neo Deck Smart Home'
      },
      body: JSON.stringify({
        model: activeModel,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP Fehler ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Keine Antwort von OpenRouter erhalten.");
    return reply;
  }
  
  throw new Error("Ungültiger API-Provider konfiguriert.");
}

export function updateJarvisSettingsUI() {
  const provider = document.getElementById('jarvisProvider')?.value || 'simulator';
  const keyGroup = document.getElementById('jarvisApiKeyGroup');
  const modelGroup = document.getElementById('jarvisModelGroup');
  
  if (!keyGroup || !modelGroup) return;
  
  if (provider === 'simulator') {
    keyGroup.style.display = 'none';
    modelGroup.style.display = 'none';
  } else {
    keyGroup.style.display = 'block';
    modelGroup.style.display = 'block';
    
    const options = document.querySelectorAll('#jarvisModel option');
    options.forEach(opt => {
      if (provider === 'gemini') {
        opt.style.display = opt.classList.contains('gemini-opt') ? 'block' : 'none';
      } else {
        opt.style.display = opt.classList.contains('openrouter-opt') ? 'block' : 'none';
      }
    });
    
    const modelElem = document.getElementById('jarvisModel');
    if (modelElem) {
      modelElem.disabled = (provider === 'openrouter');
      
      const currentModel = modelElem.value;
      const selectedOpt = document.querySelector(`#jarvisModel option[value="${currentModel}"]`);
      if (selectedOpt && selectedOpt.style.display === 'none') {
        const firstVisible = document.querySelector(`#jarvisModel option[class*="${provider}-opt"]`);
        if (firstVisible) modelElem.value = firstVisible.value;
      }
    }
  }

  const searchToggleGroup = document.getElementById('jarvisSearchToggleGroup');
  const braveKeyGroup = document.getElementById('jarvisBraveKeyGroup');
  const searchEnabled = document.getElementById('jarvisSearchEnabled')?.checked;
  
  if (provider === 'gemini') {
    if (searchToggleGroup) searchToggleGroup.style.display = 'block';
    if (braveKeyGroup) {
      braveKeyGroup.style.display = searchEnabled ? 'block' : 'none';
    }
  } else {
    if (searchToggleGroup) searchToggleGroup.style.display = 'none';
    if (braveKeyGroup) braveKeyGroup.style.display = 'none';
  }

  const ttsEnabled = document.getElementById('jarvisTtsEnabled')?.checked;
  const ttsSettingsGroup = document.getElementById('jarvisTtsSettingsGroup');
  const elevenLabsGroup = document.getElementById('jarvisElevenLabsGroup');

  if (ttsSettingsGroup) {
    ttsSettingsGroup.style.display = ttsEnabled ? 'block' : 'none';
  }
  if (elevenLabsGroup) {
    elevenLabsGroup.style.display = ttsEnabled ? 'block' : 'none';
  }
}

export function appendJarvisMessage(sender, text, type = 'assistant') {
  const log = document.getElementById('jarvisChatLog');
  if (!log) return;
  
  const bubble = document.createElement('div');
  bubble.className = `jarvis-msg jarvis-msg-${type}`;
  bubble.style.cssText = 'animation: slideInUp 0.25s ease forwards; margin-bottom: 6px;';
  
  const senderSpan = `<span style="font-weight: 700;">${sender}:</span> `;
  bubble.innerHTML = (type === 'system' || type === 'error') ? text : senderSpan + text;
  
  log.appendChild(bubble);
  
  const wrapper = log.parentElement;
  if (wrapper) {
    wrapper.scrollTop = wrapper.scrollHeight;
  }
}

export async function sendJarvisMessage() {
  const input = document.getElementById('jarvisInput');
  const sendBtn = document.getElementById('jarvisSendBtn');
  const reactor = document.getElementById('jarvisReactor');
  const statusSpan = document.getElementById('jarvisStatus');
  
  if (!input || !input.value.trim()) return;
  
  const prompt = input.value.trim();
  input.value = '';
  
  cancelJarvisSpeech();
  
  appendJarvisMessage('Sir', prompt, 'user');
  
  if (sendBtn) sendBtn.disabled = true;
  if (reactor) reactor.classList.add('thinking');
  if (statusSpan) statusSpan.textContent = 'Denkt nach...';
  
  let speechStarted = false;
  
  try {
    const apiPromise = callJarvisAPI(prompt);
    const delayPromise = new Promise(resolve => setTimeout(resolve, 1200));
    const [reply] = await Promise.all([apiPromise, delayPromise]);
    
    jarvisHistory.push({ role: 'user', text: prompt });
    jarvisHistory.push({ role: 'assistant', text: reply });
    if (jarvisHistory.length > 12) {
      jarvisHistory.shift();
      jarvisHistory.shift();
    }
    Config.set('jarvis_chat_history', JSON.stringify(jarvisHistory));
    
    appendJarvisMessage('J.A.R.V.I.S.', reply, 'assistant');
    
    const ttsEnabled = Config.get('jarvis_tts_enabled', 'true') !== 'false';
    if (ttsEnabled) {
      speechStarted = true;
    }
    speakJarvisReply(reply);
    
  } catch (err) {
    console.error("Jarvis API Fehler:", err);
    appendJarvisMessage('System', `Fehler: ${err.message}`, 'error');
    playJarvisBeep(220, 0.2, 0.1);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (reactor) reactor.classList.remove('thinking');
    if (statusSpan && !speechStarted) {
      statusSpan.textContent = 'Online';
    }
  }
}

export function populateLocalVoicesGroup() {
  const group = document.getElementById('jarvisLocalVoicesGroup');
  if (!group) return;

  const allVoices = window.speechSynthesis?.getVoices() || [];
  const sorted = [...allVoices].sort((a, b) => {
    const langCmp = a.lang.localeCompare(b.lang);
    return langCmp !== 0 ? langCmp : a.name.localeCompare(b.name);
  });

  Array.from(group.querySelectorAll('option:not([value="local:auto"])')).forEach(o => o.remove());

  sorted.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = `local:${voice.name}`;
    opt.textContent = `${voice.name} (${voice.lang})`;
    group.appendChild(opt);
  });
}

export function populateElevenLabsVoicesGroup(voices) {
  const group = document.getElementById('jarvisElevenVoicesGroup');
  const unifiedSelect = document.getElementById('jarvisVoiceSelect');
  if (!group) return;

  group.innerHTML = '';

  if (!voices || voices.length === 0) {
    const opt = document.createElement('option');
    opt.value = 'eleven:loading';
    opt.disabled = true;
    opt.textContent = '— Keine ElevenLabs-Stimmen —';
    group.appendChild(opt);
    return;
  }

  const sorted = [...voices].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(voice => {
    const opt = document.createElement('option');
    opt.value = `eleven:${voice.voice_id}`;
    const gender = voice.labels?.gender
      ? ` · ${voice.labels.gender === 'female' ? '♀' : voice.labels.gender === 'male' ? '♂' : voice.labels.gender}`
      : '';
    opt.textContent = `${voice.name}${gender}`;
    group.appendChild(opt);
  });

  const savedVoiceId = Config.get('jarvis_eleven_voice_id');
  if (savedVoiceId && unifiedSelect) {
    const match = Array.from(unifiedSelect.options).find(o => o.value === `eleven:${savedVoiceId}`);
    if (match) unifiedSelect.value = match.value;
  }
}

export function populateElevenLabsVoicesDropdown(voices) {
  populateElevenLabsVoicesGroup(voices);
}

export async function loadElevenLabsVoices(apiKeyOverride = null) {
  const apiKey = apiKeyOverride || document.getElementById('jarvisElevenApiKey')?.value.trim() || Config.get('jarvis_eleven_api_key', '');
  if (!apiKey) {
    alert('Bitte zuerst den ElevenLabs API-Key eintragen.');
    return;
  }

  const btn = document.getElementById('jarvisLoadVoicesBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const response = await fetch('/api/elevenlabs/voices', {
      headers: { 'X-ElevenLabs-Key': apiKey }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Fehler beim Laden');

    const voices = data.voices || [];
    Config.set('jarvis_eleven_voices_cache', JSON.stringify(voices));
    populateElevenLabsVoicesGroup(voices);
  } catch (err) {
    console.error('ElevenLabs Stimmen konnten nicht geladen werden:', err);
    alert('ElevenLabs Stimmen konnten nicht geladen werden: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i>'; }
  }
}

export function initJarvis() {
  const input = document.getElementById('jarvisInput');
  const sendBtn = document.getElementById('jarvisSendBtn');
  const micBtn = document.getElementById('jarvisMicBtn');
  const providerSelect = document.getElementById('jarvisProvider');
  const saveBtn = document.getElementById('saveJarvisConfig');
  const clearKeyBtn = document.getElementById('jarvisClearKeyBtn');
  const clearHistoryBtn = document.getElementById('jarvisClearHistoryBtn');
  
  if (!input) return;

  try {
    jarvisHistory = JSON.parse(Config.get('jarvis_chat_history', '[]'));
  } catch (e) {
    jarvisHistory = [];
  }
  
  const chatLog = document.getElementById('jarvisChatLog');
  if (chatLog && jarvisHistory.length > 0) {
    chatLog.innerHTML = '';
    jarvisHistory.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `jarvis-msg jarvis-msg-${msg.role === 'user' ? 'user' : 'assistant'}`;
      bubble.style.cssText = 'margin-bottom: 6px;';
      const senderName = msg.role === 'user' ? 'Sir' : 'J.A.R.V.I.S.';
      bubble.innerHTML = `<span style="font-weight: 700;">${senderName}:</span> ${msg.text}`;
      chatLog.appendChild(bubble);
    });
    const wrapper = chatLog.parentElement;
    if (wrapper) {
      setTimeout(() => { wrapper.scrollTop = wrapper.scrollHeight; }, 100);
    }
  }
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
  
  const savedProvider = Config.get('jarvis_provider', 'simulator');
  
  const legacyKey = Config.get('jarvis_api_key');
  if (legacyKey && !Config.get('jarvis_gemini_api_key')) {
    Config.set('jarvis_gemini_api_key', legacyKey);
    Config._data['jarvis_api_key'] = undefined;
  }

  const gemKey = Config.get('jarvis_gemini_api_key', '');
  const orKey = Config.get('jarvis_openrouter_api_key', '');
  if (orKey && (orKey === gemKey || orKey.startsWith('AIzaSy'))) {
    Config.set('jarvis_openrouter_api_key', '');
  }

  let savedKey = '';
  if (savedProvider === 'gemini') {
    savedKey = Config.get('jarvis_gemini_api_key', '');
  } else if (savedProvider === 'openrouter') {
    savedKey = Config.get('jarvis_openrouter_api_key', '');
  }
  const savedModel = Config.get('jarvis_model', 'gemini-2.5-flash');
  const savedCustom = Config.get('jarvis_custom_model', '');
  let savedPrompt = Config.get('jarvis_system_prompt');
  const newPrompt = 'Du bist J.A.R.V.I.S., eine hochentwickelte KI. Antworte kurz, präzise und charmant auf Deutsch.';
  if (!savedPrompt) {
    savedPrompt = newPrompt;
    Config.set('jarvis_system_prompt', newPrompt);
  }
  const savedTts = Config.get('jarvis_tts_enabled', 'true') !== 'false';
  const savedSearch = Config.get('jarvis_search_enabled', 'false') === 'true';
  const savedBraveKey = Config.get('jarvis_brave_api_key', '');
  const savedElevenKey = Config.get('jarvis_eleven_api_key', '');
  
  if (providerSelect) providerSelect.value = savedProvider;
  if (document.getElementById('jarvisApiKey')) document.getElementById('jarvisApiKey').value = savedKey;
  if (document.getElementById('jarvisModel')) document.getElementById('jarvisModel').value = savedModel;
  if (document.getElementById('jarvisCustomModel')) document.getElementById('jarvisCustomModel').value = savedCustom;
  if (document.getElementById('jarvisSystemPrompt')) document.getElementById('jarvisSystemPrompt').value = savedPrompt;
  if (document.getElementById('jarvisTtsEnabled')) document.getElementById('jarvisTtsEnabled').checked = savedTts;
  if (document.getElementById('jarvisSearchEnabled')) document.getElementById('jarvisSearchEnabled').checked = savedSearch;
  if (document.getElementById('jarvisBraveApiKey')) document.getElementById('jarvisBraveApiKey').value = savedBraveKey;
  if (document.getElementById('jarvisElevenApiKey')) document.getElementById('jarvisElevenApiKey').value = savedElevenKey;

  const savedVoiceSelection = Config.get('jarvis_unified_voice', 'local:auto');

  const doPopulateVoices = () => {
    populateLocalVoicesGroup();
    try {
      const cached = Config.get('jarvis_eleven_voices_cache');
      if (cached) populateElevenLabsVoicesGroup(JSON.parse(cached));
    } catch (e) {
      console.warn('Fehler beim Laden gecachter Stimmen:', e);
    }
    const vs = document.getElementById('jarvisVoiceSelect');
    if (vs && Array.from(vs.options).some(o => o.value === savedVoiceSelection)) {
      vs.value = savedVoiceSelection;
    }
    updateJarvisSettingsUI();
  };

  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.getVoices().length > 0) {
      doPopulateVoices();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doPopulateVoices, { once: true });
    }
  } else {
    doPopulateVoices();
  }

  let currentProvider = savedProvider;
  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const newProvider = providerSelect.value;
      const currentKey = document.getElementById('jarvisApiKey')?.value.trim() || '';
      
      if (currentProvider === 'gemini') {
        Config.set('jarvis_gemini_api_key', currentKey);
      } else if (currentProvider === 'openrouter') {
        Config.set('jarvis_openrouter_api_key', currentKey);
      }
      
      currentProvider = newProvider;
      
      let newKey = '';
      if (newProvider === 'gemini') {
        newKey = Config.get('jarvis_gemini_api_key', '');
      } else if (newProvider === 'openrouter') {
        newKey = Config.get('jarvis_openrouter_api_key', '');
      }
      
      if (document.getElementById('jarvisApiKey')) {
        document.getElementById('jarvisApiKey').value = newKey;
      }
      
      updateJarvisSettingsUI();
    });
    updateJarvisSettingsUI();
  }

  const searchCheckbox = document.getElementById('jarvisSearchEnabled');
  if (searchCheckbox) {
    searchCheckbox.addEventListener('change', updateJarvisSettingsUI);
  }

  const ttsCheckbox = document.getElementById('jarvisTtsEnabled');
  if (ttsCheckbox) {
    ttsCheckbox.addEventListener('change', updateJarvisSettingsUI);
  }

  const unifiedVoiceSelect = document.getElementById('jarvisVoiceSelect');
  if (unifiedVoiceSelect) {
    unifiedVoiceSelect.addEventListener('change', updateJarvisSettingsUI);
  }

  const loadVoicesBtn = document.getElementById('jarvisLoadVoicesBtn');
  if (loadVoicesBtn) {
    loadVoicesBtn.addEventListener('click', () => loadElevenLabsVoices());
  }

  const saveJarvisSettings = () => {
    const provider = providerSelect.value;
    const apiKey = document.getElementById('jarvisApiKey')?.value.trim() || '';
    const model = document.getElementById('jarvisModel')?.value || 'gemini-2.5-flash';
    const customModel = document.getElementById('jarvisCustomModel')?.value.trim() || '';
    const systemPrompt = document.getElementById('jarvisSystemPrompt')?.value.trim() || '';
    const ttsEnabled = document.getElementById('jarvisTtsEnabled')?.checked;
    const searchEnabled = document.getElementById('jarvisSearchEnabled')?.checked;
    const braveApiKey = document.getElementById('jarvisBraveApiKey')?.value.trim() || '';
    const elevenApiKey = document.getElementById('jarvisElevenApiKey')?.value.trim() || '';

    const unifiedVal = document.getElementById('jarvisVoiceSelect')?.value || 'local:auto';
    const ttsProvider = unifiedVal.startsWith('eleven:') ? 'elevenlabs' : 'local';
    const elevenVoice = unifiedVal.startsWith('eleven:') ? unifiedVal.replace('eleven:', '') : '';
    const localVoiceName = unifiedVal.startsWith('local:') && unifiedVal !== 'local:auto'
      ? unifiedVal.replace('local:', '') : '';

    const settingsToSave = {
      jarvis_provider: provider,
      jarvis_model: model,
      jarvis_custom_model: customModel,
      jarvis_system_prompt: systemPrompt,
      jarvis_tts_enabled: String(ttsEnabled),
      jarvis_search_enabled: String(searchEnabled),
      jarvis_brave_api_key: braveApiKey,
      jarvis_tts_provider: ttsProvider,
      jarvis_eleven_api_key: elevenApiKey,
      jarvis_eleven_voice_id: elevenVoice,
      jarvis_local_voice_name: localVoiceName,
      jarvis_unified_voice: unifiedVal
    };
    if (provider === 'gemini') {
      settingsToSave.jarvis_gemini_api_key = apiKey;
    } else if (provider === 'openrouter') {
      settingsToSave.jarvis_openrouter_api_key = apiKey;
    }
    Config.setMany(settingsToSave);

    alert('J.A.R.V.I.S. Einstellungen erfolgreich gespeichert.');
    updateJarvisSettingsUI();
  };

  if (saveBtn) {
    saveBtn.addEventListener('click', saveJarvisSettings);
  }
  const saveTtsBtn = document.getElementById('saveJarvisConfigTts');
  if (saveTtsBtn) {
    saveTtsBtn.addEventListener('click', saveJarvisSettings);
  }
  const saveSearchBtn = document.getElementById('saveJarvisConfigSearch');
  if (saveSearchBtn) {
    saveSearchBtn.addEventListener('click', saveJarvisSettings);
  }
  
  if (clearKeyBtn) {
    clearKeyBtn.addEventListener('click', () => {
      const apiKeyInput = document.getElementById('jarvisApiKey');
      if (apiKeyInput) {
        apiKeyInput.value = '';
      }
      const provider = providerSelect ? providerSelect.value : 'gemini';
      if (provider === 'gemini') {
        Config.set('jarvis_gemini_api_key', '');
      } else if (provider === 'openrouter') {
        Config.set('jarvis_openrouter_api_key', '');
      }
      alert("API-Schlüssel für diesen Provider erfolgreich gelöscht.");
      updateJarvisSettingsUI();
    });
  }
  
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      jarvisHistory = [];
      Config.set('jarvis_chat_history', '[]');
      const chatLog = document.getElementById('jarvisChatLog');
      if (chatLog) {
        chatLog.innerHTML = '<div class="jarvis-msg jarvis-msg-system" style="color: var(--primary); font-weight: 500;"><span style="color: var(--primary); font-weight: 700;">J.A.R.V.I.S.:</span> Chatverlauf wurde gelöscht.</div>';
      }
      alert("Chatverlauf erfolgreich gelöscht.");
    });
  }
  
  if (sendBtn) sendBtn.addEventListener('click', sendJarvisMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendJarvisMessage();
    }
  });
  
  if (micBtn) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      jarvisRecognition = new SpeechRec();
      jarvisRecognition.continuous = false;
      jarvisRecognition.interimResults = false;
      
      const updateSpeechLang = () => {
        const lang = Config.get('dashboard_lang', 'de');
        jarvisRecognition.lang = lang === 'de' ? 'de-DE' : 'en-US';
      };
      updateSpeechLang();
      
      const langSel = document.getElementById('langSelector');
      if (langSel) {
        langSel.addEventListener('change', updateSpeechLang);
      }
      
      jarvisRecognition.onstart = () => {
        micBtn.classList.add('listening');
        const reactor = document.getElementById('jarvisReactor');
        if (reactor) reactor.classList.add('listening');
        const statusSpan = document.getElementById('jarvisStatus');
        if (statusSpan) statusSpan.textContent = 'Hört zu...';
        playJarvisBeep(440, 0.1, 0.15);
      };
      
      jarvisRecognition.onend = () => {
        micBtn.classList.remove('listening');
        const reactor = document.getElementById('jarvisReactor');
        if (reactor) reactor.classList.remove('listening');
        const statusSpan = document.getElementById('jarvisStatus');
        if (statusSpan) statusSpan.textContent = 'Online';
      };
      
      jarvisRecognition.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        input.value = resultText;
        playJarvisBeep(880, 0.08, 0.12);
        sendJarvisMessage();
      };
      
      jarvisRecognition.onerror = (e) => {
        console.error("SpeechRecognition Fehler:", e);
        playJarvisBeep(220, 0.25, 0.15);
      };
      
      micBtn.addEventListener('click', () => {
        try {
          if (micBtn.classList.contains('listening')) {
            jarvisRecognition.stop();
          } else {
            cancelJarvisSpeech();
            jarvisRecognition.start();
          }
        } catch (err) {
          console.warn("Fehler beim Starten der Spracherkennung:", err);
        }
      });
    } else {
      micBtn.style.opacity = '0.3';
      micBtn.title = "Spracherkennung im Browser nicht unterstützt";
      micBtn.addEventListener('click', () => {
        alert("Spracherkennung wird von diesem Browser leider nicht unterstützt.");
      });
    }
  }
}
