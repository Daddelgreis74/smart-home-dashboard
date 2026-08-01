const apiKey = 'sk_9421c4b1566eed2447df5298b843888cb1df85cf1887f875';

async function run() {
  console.log("Starte ElevenLabs Stimmen-Test...");
  try {
    const listRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Fehler beim Holen der Stimmen-Liste:", errText);
      return;
    }
    const data = await listRes.json();
    const voices = data.voices || [];
    console.log(`Gefundene Stimmen: ${voices.length}. Teste jede Stimme...`);

    const results = [];
    
    for (const voice of voices) {
      const voiceId = voice.voice_id;
      const voiceName = voice.name;
      const category = voice.category || 'unknown';
      
      try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: "Hi",
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        });

        if (ttsRes.ok) {
          console.log(`[OK] ${voiceName} (${voiceId}) [${category}]`);
          results.push({ name: voiceName, id: voiceId, category, status: 'OK' });
        } else {
          const errText = await ttsRes.text().catch(() => '');
          let errMsg = `Status ${ttsRes.status}`;
          try {
            const errJson = JSON.parse(errText);
            errMsg = errJson.detail?.message || errText;
          } catch(e) {}
          console.log(`[FEHLER] ${voiceName} (${voiceId}) [${category}]: ${errMsg}`);
          results.push({ name: voiceName, id: voiceId, category, status: 'FAILED', error: errMsg });
        }
      } catch (err) {
        console.log(`[FEHLER] ${voiceName} (${voiceId}) [${category}]: ${err.message}`);
        results.push({ name: voiceName, id: voiceId, category, status: 'FAILED', error: err.message });
      }
      await new Promise(r => setTimeout(r, 400));
    }

    console.log("\n=== SUMMARY ===");
    console.log("WORKING VOICES:");
    results.filter(r => r.status === 'OK').forEach(r => {
      console.log(` - ${r.name} (ID: ${r.id}) [${r.category}]`);
    });
    
    console.log("\nFAILED VOICES:");
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(` - ${r.name} (ID: ${r.id}) [${r.category}]: ${r.error}`);
    });
  } catch (error) {
    console.error("Kritischer Fehler im Testskript:", error.message);
  }
}

run();
