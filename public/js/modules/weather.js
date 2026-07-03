import { Config } from './config.js';
import { getLangText } from './utils.js';

export async function loadWeather() {
  let d = null;
  let locName = 'Berlin';
  let success = false;

  try {
    const res = await fetch('/api/weather');
    if (res.ok) {
      d = await res.json();
      if (d && d.current) {
        success = true;
        locName = d.resolved_location || 'Berlin';
      }
    }
  } catch (e) {
    console.error("Error loading weather from proxy:", e);
  }

  if (!success) {
    const cityEl = document.getElementById('weatherCity');
    const condEl = document.getElementById('weatherCondition');
    if (cityEl) cityEl.textContent = 'Wetter offline';
    if (condEl) condEl.textContent = getLangText('weatherLimit') || 'Nicht erreichbar';
    return;
  }

  // 4. Wetter-UI rendern
  try {
    const lang = Config.get('dashboard_lang', 'de');
    
    const cityEl = document.getElementById('weatherCity');
    const tempEl = document.querySelector('.weather-temp');
    const humEl = document.getElementById('w-humidity');
    const windEl = document.getElementById('w-wind');
    const minmaxEl = document.getElementById('w-minmax');
    const feelsEl = document.getElementById('w-feels');
    const rainEl = document.getElementById('w-rain');
    const pressEl = document.getElementById('w-pressure');
    const cloudsEl = document.getElementById('w-clouds');
    const uvEl = document.getElementById('w-uv');
    const condEl = document.getElementById('weatherCondition');
    const iconEl = document.querySelector('.weather-icon');

    if (cityEl) cityEl.textContent = locName;
    if (tempEl) tempEl.innerHTML = Math.round(d.current.temperature_2m) + '&deg;';
    if (humEl) humEl.textContent = d.current.relative_humidity_2m + ' %';
    if (windEl) windEl.textContent = Math.round(d.current.wind_speed_10m) + ' km/h';
    if (minmaxEl) minmaxEl.textContent = Math.round(d.daily.temperature_2m_max[0]) + '° / ' + Math.round(d.daily.temperature_2m_min[0]) + '°';
    if (feelsEl) feelsEl.textContent = Math.round(d.current.apparent_temperature) + '°';
    if (rainEl) rainEl.textContent = (d.daily.precipitation_probability_max?.[0] ?? 0) + ' %';
    if (pressEl) pressEl.textContent = Math.round(d.current.pressure_msl || d.current.pressure_mb || 1013) + ' hPa';
    if (cloudsEl) cloudsEl.textContent = Math.round(d.current.cloud_cover) + ' %';
    if (uvEl) uvEl.textContent = (d.daily.uv_index_max?.[0] ?? 0).toFixed(1);
    
    let cond = { text: 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
    const trans = window.translations || {};
    
    if (d.current.is_weather_api) {
      const code = d.current.weather_code;
      const text = d.current.condition_text || '';
      
      if (code === 1000) {
        cond = { text: (trans[lang] ? trans[lang].weather_sunny || 'Sonnig' : 'Sonnig'), icon: 'fa-sun', style: 'sunny' };
      } else if (code === 1003) {
        cond = { text: (trans[lang] ? trans[lang].weather_partly_cloudy || 'Leicht bewölkt' : 'Leicht bewölkt'), icon: 'fa-cloud-sun', style: 'cloudy' };
      } else if (code === 1006 || code === 1009) {
        cond = { text: text || 'Bewölkt', icon: 'fa-cloud', style: 'cloudy' };
      } else if (code === 1030 || code === 1135 || code === 1147) {
        cond = { text: text || 'Nebel', icon: 'fa-smog', style: 'cloudy' };
      } else if (code === 1063 || code === 1150 || code === 1153 || code === 1180 || code === 1183 || code === 1186 || code === 1189) {
        cond = { text: text || 'Leichter Regen', icon: 'fa-cloud-rain', style: 'rainy' };
      } else if (code === 1087 || code === 1273 || code === 1276 || code === 1279 || code === 1282) {
        cond = { text: text || 'Gewitter', icon: 'fa-cloud-bolt', style: 'rainy' };
      } else if (code === 1066 || code === 1069 || code === 1072 || (code >= 1210 && code <= 1225) || (code >= 1249 && code <= 1264)) {
        cond = { text: text || 'Schnee', icon: 'fa-snowflake', style: 'cloudy' };
      } else if (code >= 1192 && code <= 1201 || code === 1240 || code === 1243 || code === 1246) {
        cond = { text: text || 'Starker Regen', icon: 'fa-cloud-showers-heavy', style: 'rainy' };
      } else {
        cond = { text: text || 'Bedeckt', icon: 'fa-cloud', style: 'cloudy' };
      }
    } else {
      const conditionsMap = {
        de: {
          0: 'Klar', 1: 'Überwiegend klar', 2: 'Leicht bewölkt', 3: 'Bewölkt', 45: 'Nebel', 48: 'Reifnebel',
          51: 'Nieselregen', 53: 'Nieselregen', 55: 'Starker Nieselregen', 61: 'Regen', 63: 'Regen',
          65: 'Starker Regen', 71: 'Schnee', 80: 'Regenschauer', 95: 'Gewitter'
        },
        en: {
          0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Depositing rime fog',
          51: 'Drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Rain', 63: 'Rain',
          65: 'Heavy rain', 71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm'
        },
        fr: {
          0: 'Clair', 1: 'Principalement clair', 2: 'Partiellement nuageux', 3: 'Nuageux', 45: 'Brouillard', 48: 'Brouillard givrant',
          51: 'Bruine', 53: 'Bruine', 55: 'Bruine forte', 61: 'Pluie', 63: 'Pluie',
          65: 'Pluie forte', 71: 'Neige', 80: 'Averses de pluie', 95: 'Orage'
        },
        es: {
          0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla helada',
          51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna fuerte', 61: 'Lluvia', 63: 'Lluvia',
          65: 'Lluvia fuerte', 71: 'Nieve', 80: 'Chubascos de lluvia', 95: 'Tormenta'
        },
        it: {
          0: 'Sereno', 1: 'Prevalentemente sereno', 2: 'Parzialmente nuvoloso', 3: 'Nuvoloso', 45: 'Nebbia', 48: 'Nebbia con brina',
          51: 'Pioggerellina', 53: 'Pioggerellina', 55: 'Pioggerellina intensa', 61: 'Pioggia', 63: 'Pioggia',
          65: 'Pioggia forte', 71: 'Neve', 80: 'Rovesci di pioggia', 95: 'Temporale'
        },
        nl: {
          0: 'Helder', 1: 'Overwegend helder', 2: 'Licht bewolkt', 3: 'Bewolkt', 45: 'Mist', 48: 'Rijpmist',
          51: 'Motregen', 53: 'Motregen', 55: 'Zware motregen', 61: 'Regen', 63: 'Regen',
          65: 'Zware regen', 71: 'Sneeuw', 80: 'Regenbuien', 95: 'Onweer'
        },
        pl: {
          0: 'Jasno', 1: 'Przeważnie jasno', 2: 'Lekkie zachmurzenie', 3: 'Zachmurzenie', 45: 'Mgła', 48: 'Mgła osadzająca szadź',
          51: 'Mżawka', 53: 'Mżawka', 55: 'Silna mżawka', 61: 'Deszcz', 63: 'Deszcz',
          65: 'Silny deszcz', 71: 'Śnieg', 80: 'Opady deszczu', 95: 'Burza'
        }
      };
      const langConds = conditionsMap[lang] || conditionsMap['de'];
      
      const conditions = {
        0:{text:langConds[0],icon:'fa-sun',style:'sunny'},
        1:{text:langConds[1],icon:'fa-sun',style:'sunny'},
        2:{text:langConds[2],icon:'fa-cloud-sun',style:'cloudy'},
        3:{text:langConds[3],icon:'fa-cloud',style:'cloudy'},
        45:{text:langConds[45],icon:'fa-smog',style:'cloudy'},
        48:{text:langConds[48],icon:'fa-smog',style:'cloudy'},
        51:{text:langConds[51],icon:'fa-cloud-rain',style:'rainy'},
        53:{text:langConds[53],icon:'fa-cloud-rain',style:'rainy'},
        55:{text:langConds[55],icon:'fa-cloud-rain',style:'rainy'},
        61:{text:langConds[61],icon:'fa-cloud-rain',style:'rainy'},
        63:{text:langConds[63],icon:'fa-cloud-showers-heavy',style:'rainy'},
        65:{text:langConds[65],icon:'fa-cloud-showers-heavy',style:'rainy'},
        71:{text:langConds[71],icon:'fa-snowflake',style:'cloudy'},
        80:{text:langConds[80],icon:'fa-cloud-sun-rain',style:'rainy'},
        95:{text:langConds[95],icon:'fa-cloud-bolt',style:'rainy'}
      };
      cond = conditions[d.current.weather_code] || { text: (trans[lang] ? trans[lang].weather_clouds || 'Bedeckt' : 'Bedeckt'), icon: 'fa-cloud', style: 'cloudy' };
    }
    
    if (condEl) condEl.textContent = cond.text;
    if (iconEl) {
      iconEl.innerHTML = `<i class="fas ${cond.icon}"></i>`;
      iconEl.className = `weather-icon ${cond.style}`;
    }
  } catch(e) {
    console.error("Render error in weather widget:", e);
  }
}
