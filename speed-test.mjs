export const DEFAULT_QUICK_TEST_MS = 3 * 60 * 1000;
export const DEFAULT_SPEED_PHASE_MS = 30 * 1000;
export const SPEED_FLOW_COUNT = 2;
export const SPEED_WARMUP_MS = 2000;

export function segmentMegabitsPerSecond(bytes, durationMs) {
  return Number.isFinite(bytes) && bytes > 0 && Number.isFinite(durationMs) && durationMs > 0
    ? bytes * 8 / durationMs / 1000
    : null;
}

export function calculateSpeedMetrics({ totalBytes = 0, elapsedMs = 0, buckets = [], warmupMs = SPEED_WARMUP_MS } = {}) {
  const seconds = elapsedMs > 0 ? Math.max(.001, elapsedMs / 1000) : 0;
  const aggregateMBps = seconds ? totalBytes / seconds / 1_000_000 : null;
  const completeBucketCount = Math.max(0, Math.floor((elapsedMs - warmupMs) / 1000));
  const rates = buckets
    .slice(0, completeBucketCount)
    .filter((bytes) => Number.isFinite(bytes) && bytes > 0)
    .map((bytes) => segmentMegabitsPerSecond(bytes, 1000))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const middle = Math.floor(rates.length / 2);
  const medianMbps = rates.length ? (rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2) : null;
  const aggregateMbps = aggregateMBps === null ? null : aggregateMBps * 8;
  return {
    bytes: totalBytes,
    seconds,
    megabytesPerSecond: medianMbps === null ? aggregateMBps : medianMbps / 8,
    megabitsPerSecond: medianMbps ?? aggregateMbps,
    aggregateMbps,
    segmentCount: rates.length,
    method: medianMbps === null ? 'aggregate' : 'median-segments',
    warmupSeconds: warmupMs / 1000,
  };
}
