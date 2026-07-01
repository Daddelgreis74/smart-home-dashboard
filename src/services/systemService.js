const si = require('systeminformation');

async function getSystemStatus() {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();
    const temp = await si.cpuTemperature();
    const net = await si.networkStats(); 
    let tx_sec = 0; let rx_sec = 0;
    if (net && net.length > 0) {
      net.forEach(iface => { rx_sec += iface.rx_sec; tx_sec += iface.tx_sec; });
    }
    const totalNetMb = (tx_sec + rx_sec) / (1024 * 1024);
    return {
      cpu: cpuLoad.currentLoad,                   
      ram: (mem.active / mem.total) * 100,        
      temp: temp.main || 40,                      
      net: totalNetMb,
      netDown: rx_sec,
      netUp: tx_sec
    };
  } catch (e) {
    console.error('Fehler bei System-Abfrage:', e);
    return null;
  }
}

module.exports = {
  getSystemStatus
};
