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

export function candidateAddress(candidate) {
  if (!candidate) return null;
  const text = candidate.candidate || '';
  const type = candidate.type || /\btyp\s+(\w+)/.exec(text)?.[1];
  const address = candidate.address || text.split(/\s+/)[4];
  return type === 'host' && isUsableIpAddress(address) ? address : null;
}

export function isUsableIpAddress(value) {
  if (typeof value !== 'string' || !value || value.endsWith('.local')) return false;
  if (value.includes(':')) return value !== '::' && value !== '::1';
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && value !== '0.0.0.0' && !value.startsWith('127.');
}

export function isPrivateIpv4(value) {
  const parts = String(value).split('.').map(Number);
  return parts.length === 4 && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}

export async function detectDeviceIps(PeerConnection = globalThis.RTCPeerConnection) {
  if (!PeerConnection) return [];
  let connection;
  try { connection = new PeerConnection({ iceServers: [] }); }
  catch { return []; }
  const addresses = new Set();
  const collect = (candidate) => {
    const address = candidateAddress(candidate);
    if (address) addresses.add(address);
  };
  try {
    connection.createDataChannel('device-ip');
    connection.addEventListener('icecandidate', (event) => collect(event.candidate));
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1500);
      connection.addEventListener('icegatheringstatechange', () => {
        if (connection.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); }
      });
    });
    connection.localDescription?.sdp.split('\n').filter((line) => line.includes('candidate:')).forEach((line) => collect({ candidate: line }));
  } catch { /* Browser privacy settings may suppress host candidates. */ }
  finally { connection.close(); }
  return [...addresses].sort((a, b) => Number(isPrivateIpv4(b)) - Number(isPrivateIpv4(a)) || a.localeCompare(b));
}

export async function fetchCdnMetadata(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    const trace = Object.fromEntries((await response.text()).trim().split('\n').map((line) => line.split('=')));
    return { colo: trace.colo || '—', location: trace.loc || '—' };
  } catch {
    return { colo: '—', location: '—' };
  }
}
