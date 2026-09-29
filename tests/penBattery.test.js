const { calculatePenBatteryStatus } = require('../src/utils/penBatteryHelper');

describe('Stylus / Bluetooth Pen Battery Helper', () => {
  test('returns isVisible: false for null, undefined, NaN, or negative battery levels', () => {
    expect(calculatePenBatteryStatus(null).isVisible).toBe(false);
    expect(calculatePenBatteryStatus(undefined).isVisible).toBe(false);
    expect(calculatePenBatteryStatus(NaN).isVisible).toBe(false);
    expect(calculatePenBatteryStatus(-1).isVisible).toBe(false);
    expect(calculatePenBatteryStatus('50').isVisible).toBe(false);
  });

  test('formats battery status correctly for high charge (> 85%)', () => {
    const status = calculatePenBatteryStatus(95, 'Lenovo Tab Pen Plus');
    expect(status.isVisible).toBe(true);
    expect(status.level).toBe(95);
    expect(status.text).toBe('95%');
    expect(status.title).toBe('Lenovo Tab Pen Plus: 95%');
    expect(status.iconClass).toBe('fa-battery-full');
    expect(status.statusClass).toBe('battery-good');
  });

  test('formats battery status correctly for medium charge (35% - 65%)', () => {
    const status = calculatePenBatteryStatus(45);
    expect(status.isVisible).toBe(true);
    expect(status.level).toBe(45);
    expect(status.text).toBe('45%');
    expect(status.iconClass).toBe('fa-battery-half');
    expect(status.statusClass).toBe('battery-medium');
  });

  test('formats battery status correctly for low charge (<= 20%)', () => {
    const status = calculatePenBatteryStatus(10);
    expect(status.isVisible).toBe(true);
    expect(status.level).toBe(10);
    expect(status.text).toBe('10%');
    expect(status.iconClass).toBe('fa-battery-empty');
    expect(status.statusClass).toBe('battery-low');
  });

  test('clamps battery levels outside 0-100 range', () => {
    const over100 = calculatePenBatteryStatus(120);
    expect(over100.level).toBe(100);
    expect(over100.text).toBe('100%');
    expect(over100.iconClass).toBe('fa-battery-full');
  });
});
