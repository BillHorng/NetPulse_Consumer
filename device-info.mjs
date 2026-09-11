export function detectOperatingSystem(userAgent = '') {
  if (/Windows NT 10/.test(userAgent)) return 'Windows 10/11';
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPad/.test(userAgent)) return 'iOS / iPadOS';
  if (/Mac OS X/.test(userAgent)) return 'macOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return 'Unknown';
}

export function detectBrowser(userAgent = '') {
  const edge = /Edg\/(\d+)/.exec(userAgent)?.[1];
  if (edge) return `Edge ${edge}`;
  const chrome = /Chrome\/(\d+)/.exec(userAgent)?.[1];
  if (chrome) return `Chrome ${chrome}`;
  const safari = /Version\/(\d+).*Safari/.exec(userAgent)?.[1];
  return safari ? `Safari ${safari}` : 'Browser';
}

export function parseCloudflareTrace(text = '') {
  const trace = Object.fromEntries(String(text).trim().split('\n').map((line) => line.split('=')));
  return { publicIp: isIpAddress(trace.ip) ? trace.ip : '—', colo: trace.colo || '—', location: trace.loc || '—' };
}

export function isIpAddress(value) {
  if (typeof value !== 'string' || !value) return false;
  if (value.includes(':')) return /^[0-9a-f:.]+$/i.test(value) && value !== '::';
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

export async function fetchNetworkMetadata(fetchImpl = globalThis.fetch) {
  let metadata = { publicIp: '—', colo: '—', location: '—' };
  try {
    const response = await fetchImpl('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    metadata = parseCloudflareTrace(await response.text());
  } catch { /* AWS fallback below still attempts the egress IP. */ }
  if (metadata.publicIp !== '—') return metadata;
  try {
    const response = await fetchImpl('https://checkip.amazonaws.com', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const publicIp = (await response.text()).trim();
    return { ...metadata, publicIp: isIpAddress(publicIp) ? publicIp : '—' };
  } catch { return metadata; }
}
