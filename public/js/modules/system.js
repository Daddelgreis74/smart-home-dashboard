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
  if (elDown && d.netDown !== undefined) {
    elDown.textContent = formatBitrate(d.netDown);
  }
  const elUp = document.getElementById('valFritzUp');
  if (elUp && d.netUp !== undefined) {
    elUp.textContent = formatBitrate(d.netUp);
  }
}

export function initSystemBargraph(socket) {
  socket.on('sys-status', handleSysStatus);
}
