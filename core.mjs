export const VERSION = '1.0.4';
export const STORAGE_KEY = 'netpulse-consumer-settings-v1';

export const DEFAULT_SETTINGS = Object.freeze({
  lang: 'zh',
  chartMode: 'live',
  endpoint: 'https://checkip.amazonaws.com',
  fallbackEndpoint: 'https://one.one.one.one/cdn-cgi/trace',
  downloadUrl: 'https://speed.cloudflare.com/__down?bytes=10000000',
  intervalMs: 500,
  timeoutMs: 2000,
  failoverThreshold: 5,
  percentileN: 200,
  autoStopMin: 3,
  stress: false,
  webhook: '',
});

export const LIMITS = Object.freeze({
  intervalMs: [200, 2000], timeoutMs: [1000, 5000],
  failoverThreshold: [3, 10], percentileN: [30, 500], autoStopMin: [0, 1440],
  samples: 360, logs: 100, jitterWindow: 20, stressBytes: 100 * 1024 * 1024,
});

export function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeUrl(value, { allowEmpty = false, httpsOnly = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw && allowEmpty) return '';
  if (!raw) throw new Error('URL is required');
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme);
  if (!['http:', 'https:'].includes(url.protocol) || (httpsOnly && url.protocol !== 'https:')) {
    throw new Error('Unsupported URL scheme');
  }
  return url.href;
}

export function validateSettings(candidate = {}) {
  const result = { ...DEFAULT_SETTINGS };
  result.lang = candidate.lang === 'en' ? 'en' : 'zh';
  result.chartMode = candidate.chartMode === 'percentile' ? 'percentile' : 'live';
  for (const key of ['endpoint', 'fallbackEndpoint', 'downloadUrl']) {
    try { result[key] = normalizeUrl(candidate[key] ?? DEFAULT_SETTINGS[key], { httpsOnly: true }); } catch { /* keep default */ }
  }
  try { result.webhook = normalizeUrl(candidate.webhook, { allowEmpty: true, httpsOnly: true }); } catch { result.webhook = ''; }
  for (const key of ['intervalMs', 'timeoutMs', 'failoverThreshold', 'percentileN', 'autoStopMin']) {
    result[key] = clamp(candidate[key], LIMITS[key][0], LIMITS[key][1], DEFAULT_SETTINGS[key]);
  }
  result.stress = candidate.stress === true || candidate.stress === 'true' || candidate.stress === '1';
  return result;
}

export function parseAutomation(search, base = DEFAULT_SETTINGS) {
  const params = new URLSearchParams(search);
  const next = { ...base };
  const first = (...names) => names.map((name) => params.get(name)).find((value) => value !== null);
  const mappings = { intervalMs: 'interval', timeoutMs: 'timeout', failoverThreshold: 'failover', percentileN: 'samples', autoStopMin: 'autostop' };
  for (const [key, name] of Object.entries(mappings)) {
    const value = first(name, key);
    if (value !== undefined) next[key] = value;
  }
  if (['zh', 'en'].includes(params.get('lang'))) next.lang = params.get('lang');
  if (['live', 'percentile'].includes(params.get('mode'))) next.chartMode = params.get('mode');
  return {
    settings: validateSettings(next),
    autostart: ['1', 'true'].includes((params.get('autostart') || '').toLowerCase()),
    targetSamples: params.has('samples') ? clamp(params.get('samples'), 30, 500, null) : null,
    exports: (params.get('export') || '').toLowerCase().split(',').filter(Boolean),
  };
}

export function isFinalPhase(elapsedMs, totalMs, phaseMs) {
  return Number.isFinite(elapsedMs) && Number.isFinite(totalMs) && Number.isFinite(phaseMs)
    && totalMs > 0 && phaseMs > 0 && phaseMs <= totalMs
    && elapsedMs >= totalMs - phaseMs && elapsedMs < totalMs;
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower + 1] === undefined ? sorted[lower] : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

export function median(values) { return percentile(values, 0.5); }

export function mad(values) {
  if (!values.length) return null;
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

export function wilsonUpper(failures, total, z = 1.96) {
  if (!total) return 0;
  const p = failures / total;
  const z2 = z * z;
  return (p + z2 / (2 * total) + z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / (1 + z2 / total);
}

export function metricScore(value, good, bad) {
  if (value === null || !Number.isFinite(value)) return 0;
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return 100 * (bad - value) / (bad - good);
}

export function isSpike(latency, history) {
  if (!Number.isFinite(latency)) return true;
  const valid = history.filter((sample) => sample.status === 'ok' && !sample.warmUp && Number.isFinite(sample.latency)).slice(-20);
  if (valid.length < 5) return latency > 100;
  const baseline = valid.reduce((sum, sample) => sum + sample.latency, 0) / valid.length;
  return latency > Math.max(100, baseline * 2);
}

export function ewma(previous, value, alpha = 0.2) {
  return previous === null || !Number.isFinite(previous) ? value : alpha * value + (1 - alpha) * previous;
}

export function calculateChartScale(values = []) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  const maximum = finite.length ? Math.max(...finite) : 0;
  const target = Math.max(50, maximum * 1.1);
  const roughStep = target / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  return { step, yMax: Math.ceil(target / step) * step };
}

export function calculateLiveChartRange(samples = [], now = Date.now(), windowMs = 60000) {
  const timestamps = samples.map((sample) => sample.timestamp).filter(Number.isFinite);
  const firstTimestamp = timestamps.length ? Math.min(...timestamps) : now;
  const duration = Math.min(windowMs, Math.max(1000, now - firstTimestamp));
  return { start: now - duration, end: now, duration };
}

export function calculateStats(samples, percentileN = 200, buffer = {}) {
  const window = samples.slice(-percentileN);
  const successes = window.filter((sample) => sample.status === 'ok' && !sample.warmUp && Number.isFinite(sample.latency));
  const latencies = successes.map((sample) => sample.latency);
  const failures = window.filter((sample) => sample.status !== 'ok').length;
  const timeouts = window.filter((sample) => sample.status === 'timeout').length;
  const spikes = window.filter((sample) => sample.spike).length;
  const last = successes.at(-1);
  const sum = latencies.reduce((total, value) => total + value, 0);
  const jitter = [...window].reverse().find((sample) => Number.isFinite(sample.jitter))?.jitter ?? null;
  return {
    total: window.length, successCount: successes.length, failures, timeouts, spikes,
    current: last?.latency ?? null,
    mean: latencies.length ? sum / latencies.length : null,
    min: latencies.length ? Math.min(...latencies) : null,
    max: latencies.length ? Math.max(...latencies) : null,
    p50: percentile(latencies, .5), p75: percentile(latencies, .75), p90: percentile(latencies, .9),
    p95: percentile(latencies, .95), p99: percentile(latencies, .99),
    jitter, mad: mad(latencies),
    failureRate: window.length ? failures / window.length : 0,
    timeoutRate: window.length ? timeouts / window.length : 0,
    wilsonFailure: wilsonUpper(failures, window.length),
    spikeRate: window.length ? spikes / window.length : 0,
    maxSpike: window.filter((sample) => sample.spike && Number.isFinite(sample.latency)).reduce((max, sample) => Math.max(max, sample.latency), 0) || null,
    bufferDelta: Number.isFinite(buffer.delta) ? buffer.delta : null,
  };
}

export function calculateRating(stats, sampleCount, percentileN) {
  const unlockAt = percentileN > 100 ? 60 : 30;
  const latency = .5 * metricScore(stats.p50, 220, 600) + .5 * metricScore(stats.p95, 400, 900);
  const jitter = .6 * metricScore(stats.jitter, 60, 180) + .4 * metricScore(stats.mad, 45, 140);
  const loss = metricScore(stats.wilsonFailure * 100, 4, 16);
  const spike = metricScore(stats.spikeRate * 100, 12, 40);
  const hasBuffer = Number.isFinite(stats.bufferDelta);
  const buffer = hasBuffer ? metricScore(stats.bufferDelta, 45, 220) : null;
  const weighted = hasBuffer
    ? .30 * latency + .20 * jitter + .30 * loss + .10 * spike + .10 * buffer
    : .35 * latency + .25 * jitter + .30 * loss + .10 * spike;
  const score = sampleCount >= unlockAt ? Math.round(Math.min(weighted, loss + 25, latency + 25)) : null;
  const grade = score === null ? null : score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'F';
  return { score, grade, latency: Math.round(latency), jitter: Math.round(jitter), loss: Math.round(loss), spike: Math.round(spike), buffer: buffer === null ? null : Math.round(buffer), unlockAt };
}

export function formatMs(value, digits = 0) { return Number.isFinite(value) ? `${value.toFixed(digits)} ms` : '—'; }
export function formatPercent(value) { return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'; }
