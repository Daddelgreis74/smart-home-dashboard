const {
  isIPv4,
  isPrivateIPv4,
  isPrivateBaseIp,
  cleanName,
  normalizeStreamUrl,
  sanitizeTasmotaList
} = require('../src/utils/validation');

describe('IP Validation Helpers', () => {
  test('isIPv4 should validate correct IPv4 addresses', () => {
    expect(isIPv4('192.168.178.1')).toBe(true);
    expect(isIPv4('10.0.0.1')).toBe(true);
    expect(isIPv4('8.8.8.8')).toBe(true);
    expect(isIPv4('256.0.0.1')).toBe(false);
    expect(isIPv4('abc')).toBe(false);
    expect(isIPv4(null)).toBe(false);
    expect(isIPv4('1.2.3')).toBe(false);
  });

  test('isPrivateIPv4 should identify private networks only', () => {
    expect(isPrivateIPv4('192.168.1.10')).toBe(true);
    expect(isPrivateIPv4('10.0.0.137')).toBe(true);
    expect(isPrivateIPv4('172.16.0.5')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    
    // Public IPs should return false
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateIPv4('172.32.0.1')).toBe(false);
    expect(isPrivateIPv4('192.169.1.1')).toBe(false);
  });

  test('isPrivateBaseIp should validate private subnet bases (x.y.z)', () => {
    expect(isPrivateBaseIp('192.168.178')).toBe(true);
    expect(isPrivateBaseIp('10.0.0')).toBe(true);
    expect(isPrivateBaseIp('192.168.178.1')).toBe(false); // full IP is not a base
    expect(isPrivateBaseIp('8.8.8')).toBe(false); // public base is not allowed
  });
});

describe('Sanitization & Cleanup Helpers', () => {
  test('cleanName should sanitize inputs and fallback if empty', () => {
    expect(cleanName(' Wohnzimmer   ')).toBe('Wohnzimmer');
    expect(cleanName('Küche\nLicht')).toBe('Küche Licht');
    expect(cleanName('', 'Fallback')).toBe('Fallback');
    expect(cleanName(null, 'Fallback')).toBe('Fallback');
  });

  test('normalizeStreamUrl should repair touch typos', () => {
    expect(normalizeStreamUrl('hthttps://stream.radio.de')).toBe('https://stream.radio.de');
    expect(normalizeStreamUrl('hthttp://stream.radio.de')).toBe('http://stream.radio.de');
    expect(normalizeStreamUrl('https://stream.radio.de')).toBe('https://stream.radio.de');
  });

  test('sanitizeTasmotaList should remove public/invalid IPs and filter duplicates', () => {
    const list = [
      { ip: '192.168.178.50', name: 'Stehlampe' },
      { ip: '8.8.8.8', name: 'Public DNS' }, // invalid private IP
      { ip: '192.168.178.50', name: 'Klon' }, // duplicate IP
      { ip: '10.0.0.5', name: '  Küche ' }
    ];
    const sanitized = sanitizeTasmotaList(list);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0]).toEqual({ ip: '192.168.178.50', name: 'Stehlampe' });
    expect(sanitized[1]).toEqual({ ip: '10.0.0.5', name: 'Küche' });
  });
});
