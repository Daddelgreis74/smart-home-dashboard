/**
 * Helper zur Formatierung und Status-Berechnung von Stylus / Bluetooth Pen Akkuständen.
 */

function calculatePenBatteryStatus(level, name = 'Lenovo Tab Pen Plus') {
  if (level == null || typeof level !== 'number' || isNaN(level) || level < 0) {
    return {
      isVisible: false,
      level: null,
      text: '',
      title: '',
      iconClass: 'fa-battery-empty',
      statusClass: 'battery-low'
    };
  }

  const clampedLevel = Math.max(0, Math.min(100, Math.round(level)));
  const text = `${clampedLevel}%`;
  const title = `${name || 'Stylus'}: ${text}`;

  let iconClass = 'fa-battery-full';
  if (clampedLevel <= 15) {
    iconClass = 'fa-battery-empty';
  } else if (clampedLevel <= 35) {
    iconClass = 'fa-battery-quarter';
  } else if (clampedLevel <= 65) {
    iconClass = 'fa-battery-half';
  } else if (clampedLevel <= 85) {
    iconClass = 'fa-battery-three-quarters';
  }

  let statusClass = 'battery-good';
  if (clampedLevel <= 20) {
    statusClass = 'battery-low';
  } else if (clampedLevel <= 50) {
    statusClass = 'battery-medium';
  }

  return {
    isVisible: true,
    level: clampedLevel,
    text,
    title,
    iconClass,
    statusClass
  };
}

module.exports = {
  calculatePenBatteryStatus
};
