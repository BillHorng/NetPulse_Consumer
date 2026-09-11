import { formatMs, formatPercent } from './core.mjs';

export function createReportId(date = new Date()) {
  const digits = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0')).join('');
  return `NP-${digits}`;
}

export function buildDiagnosticText(model) {
  const { language, reportId, version, startTime, endTime, duration, symptom, note, highlights, stats, counts, buffer, speed, clientInfo, activeEndpoint, downloadEndpoint } = model;
  const zh = language === 'zh';
  const speedReady = Number.isFinite(speed.megabitsPerSecond) && speed.bytes > 0;
  const speedMbps = speedReady ? `${speed.megabitsPerSecond.toFixed(1)} Mbps` : (zh ? '未完成' : 'Incomplete');
  const speedDetail = speedReady
    ? `${(speed.bytes / 1_000_000).toFixed(1)} MB / ${speed.seconds.toFixed(1)} s / ${(speed.megabitsPerSecond / 8).toFixed(2)} MB/s`
    : (zh ? '尚無有效下載資料' : 'No valid download data');
  const method = speed.method === 'median-segments'
    ? (zh ? `排除前 ${speed.warmupSeconds.toFixed(0)} 秒後，${speed.segmentCount} 個完整一秒區段的總流量速率中位數` : `median aggregate rate across ${speed.segmentCount} complete 1s buckets after ${speed.warmupSeconds.toFixed(0)}s warm-up`)
    : (zh ? '總下載量／總測速時間（有效分段不足）' : 'total bytes / elapsed time (insufficient qualified segments)');
  const locale = zh ? 'zh-TW' : 'en-US';
  const lines = zh ? [
    'NetPulse 網路檢測重點摘要',
    `報告編號：${reportId}`,
    `檢測版本：v${version}`,
    `檢測時間：${startTime.toLocaleString(locale, { hour12: false })} ～ ${endTime.toLocaleString(locale, { hour12: false })}`,
    `檢測長度：${duration}`,
    '',
    '【使用者回報】', `狀況：${symptom}`, `補充：${note}`, '',
    '【重點判讀】',
    `整體品質：${highlights.overall}`,
    `連線穩定度：${highlights.stability}`,
    `反應速度：${highlights.response}`,
    `延遲一致性：${highlights.consistency}`,
    `下載速度：${speedMbps}`,
    '',
    '【測試數據】',
    `總探測：${counts.sent} 筆；統計視窗：最近 ${stats.total} 筆（成功 ${counts.successful}，含暖機 ${counts.warmUp}／失敗 ${counts.failed}／逾時 ${counts.timedOut}）`,
    `延遲：目前 ${formatMs(stats.current)}／平均 ${formatMs(stats.mean)}／最低 ${formatMs(stats.min)}／最高 ${formatMs(stats.max)}`,
    `百分位：P50 ${formatMs(stats.p50)}／P95 ${formatMs(stats.p95)}／P99 ${formatMs(stats.p99)}`,
    `Jitter：${formatMs(stats.jitter)}／MAD ${formatMs(stats.mad)}`,
    `失敗率：${formatPercent(stats.failureRate)}／逾時率 ${formatPercent(stats.timeoutRate)}／Wilson 95% ${formatPercent(stats.wilsonFailure)}`,
    `尖峰：${stats.spikes} 次／最大 ${formatMs(stats.maxSpike)}`,
    Number.isFinite(stats.bufferDelta) ? `Bufferbloat：${formatMs(stats.bufferDelta)}（Idle ${formatMs(buffer.idleAvg)}／負載 ${formatMs(buffer.loadAvg)}）` : 'Bufferbloat：本次未執行或資料不足',
    `下載測速：${speedMbps}（下載量／時間／速率：${speedDetail}）`,
    `測速方法：${method}`,
    `下載端點：${downloadEndpoint}`,
    '',
    '【裝置與網路環境】',
    `作業系統：${clientInfo.os}`, `瀏覽器：${clientInfo.browser}`, `時區：${clientInfo.timezone}`,
    `對外出口 IP：${clientInfo.publicIp}`, `CDN Node / Colo：${clientInfo.colo}`, `Location：${clientInfo.loc}`,
    `Active Endpoint：${activeEndpoint}`,
    '',
    '註：本工具測量瀏覽器 HTTPS Probe latency；失敗／逾時率不等同 ICMP packet loss。下載測速不包含上傳速度，且會受端點、VPN、Proxy、公司閘道及其他流量影響。',
  ] : [
    'NetPulse Network Diagnostic Summary',
    `Report ID: ${reportId}`, `Version: v${version}`,
    `Test window: ${startTime.toLocaleString(locale)} – ${endTime.toLocaleString(locale)}`, `Duration: ${duration}`, '',
    '[USER REPORT]', `Issue: ${symptom}`, `Note: ${note}`, '',
    '[KEY FINDINGS]',
    `Overall quality: ${highlights.overall}`, `Connection stability: ${highlights.stability}`,
    `Responsiveness: ${highlights.response}`, `Latency consistency: ${highlights.consistency}`,
    `Download speed: ${speedMbps}`, '',
    '[TEST DATA]',
    `Total probes: ${counts.sent}; statistics window: latest ${stats.total} (success ${counts.successful}, including ${counts.warmUp} warm-up / failed ${counts.failed} / timeout ${counts.timedOut})`,
    `Latency: current ${formatMs(stats.current)} / average ${formatMs(stats.mean)} / min ${formatMs(stats.min)} / max ${formatMs(stats.max)}`,
    `Percentiles: P50 ${formatMs(stats.p50)} / P95 ${formatMs(stats.p95)} / P99 ${formatMs(stats.p99)}`,
    `Jitter: ${formatMs(stats.jitter)} / MAD ${formatMs(stats.mad)}`,
    `Failure: ${formatPercent(stats.failureRate)} / timeout ${formatPercent(stats.timeoutRate)} / Wilson 95% ${formatPercent(stats.wilsonFailure)}`,
    `Spikes: ${stats.spikes} / maximum ${formatMs(stats.maxSpike)}`,
    Number.isFinite(stats.bufferDelta) ? `Bufferbloat: ${formatMs(stats.bufferDelta)} (idle ${formatMs(buffer.idleAvg)} / loaded ${formatMs(buffer.loadAvg)})` : 'Bufferbloat: not run or insufficient data',
    `Download test: ${speedMbps} (download / duration / rate: ${speedDetail})`,
    `Speed method: ${method}`, `Download endpoint: ${downloadEndpoint}`, '',
    '[CLIENT / NETWORK]',
    `OS: ${clientInfo.os}`, `Browser: ${clientInfo.browser}`, `Timezone: ${clientInfo.timezone}`,
    `Public egress IP: ${clientInfo.publicIp}`, `CDN Node / Colo: ${clientInfo.colo}`, `Location: ${clientInfo.loc}`,
    `Active Endpoint: ${activeEndpoint}`, '',
    'Note: This tool measures browser HTTPS probe latency. Failure/timeout rate is not ICMP packet loss. The download test excludes upload speed and is affected by the endpoint, VPN, proxy, enterprise gateway and competing traffic.',
  ];
  return lines.join('\n');
}
