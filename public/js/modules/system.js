export function formatBitrate(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 0) return '0.0 Mbit/s';
  const bitsPerSec = bytesPerSec * 8;
  if (bitsPerSec < 1000000) {
    return (bitsPerSec / 1000).toFixed(0) + ' Kbit/s';
  }
  return (bitsPerSec / 1000000).toFixed(1) + ' Mbit/s';
}

export function updateBar(id, val, max, unit, dec = 0) {
  const el = document.getElementById('val-' + id);
  if (!el) return;
  el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + ' ' + unit;
  
  const circle = document.getElementById('circle-' + id);
  if (!circle) return;
  const pct = Math.max(0, Math.min(val / max, 1));
  const circumference = 251.327; // 2 * Math.PI * 40
  const offset = circumference * (1 - pct);
  circle.style.strokeDashoffset = offset;
}

export function handleSysStatus(d) {
  updateBar('cpu', d.cpu, 100, '%');
  updateBar('ram', d.ram, 100, '%');
  updateBar('temp', d.temp, 90, '°C');
  updateBar('net', d.net, 15, 'MB/s', 2);

  const elDown = document.getElementById('valFritzDown');
  const barDown = document.getElementById('barFritzDown');
  if (d.netDown !== undefined) {
    if (elDown) elDown.textContent = formatBitrate(d.netDown);
    if (barDown) {
      const bits = (d.netDown || 0) * 8;
      const maxBits = window.fritzSyncDownBits || 100000000;
      const pct = Math.min(100, Math.round((bits / maxBits) * 100));
      barDown.style.width = `${bits > 0 ? Math.max(3, pct) : 0}%`;
    }
  }
  const elUp = document.getElementById('valFritzUp');
  const barUp = document.getElementById('barFritzUp');
  if (d.netUp !== undefined) {
    if (elUp) elUp.textContent = formatBitrate(d.netUp);
    if (barUp) {
      const bits = (d.netUp || 0) * 8;
      const maxBits = window.fritzSyncUpBits || 40000000;
      const pct = Math.min(100, Math.round((bits / maxBits) * 100));
      barUp.style.width = `${bits > 0 ? Math.max(3, pct) : 0}%`;
    }
  }
}

export function initSystemBargraph(socket) {
  socket.on('sys-status', handleSysStatus);
}
