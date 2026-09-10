import {
  VERSION, STORAGE_KEY, DEFAULT_SETTINGS, LIMITS, validateSettings, parseAutomation,
  isSpike, ewma, calculateStats, calculateRating, formatMs, formatPercent, isFinalPhase,
} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const copy = {
  zh: {
    subtitle: '網路品質監測平台', start: '開始 3 分鐘檢測', startAdvanced: '開始監測', pause: '暫停', cancel: '取消檢測', reset: '重設', retry: '重新檢測', export: '匯出報告',
    os: '作業系統', browser: '瀏覽器', localTime: '本機時間', timezone: '時區', deviceIp: '設備 IP', deviceIpUnavailable: '瀏覽器未提供', latency: '連線延遲',
    current: '目前', average: '平均', minimum: '最低', maximum: '最高', failure: '失敗／逾時',
    failCount: '失敗數', failureRate: '失敗率', timeoutRate: '逾時率', maximumSpike: '最大尖峰', spikeCount: '尖峰數',
    liveChart: '即時曲線', last60: '◷ 最近 60 秒', chartEmpty: '開始監測後，圖表會顯示即時網路品質。',
    score: '總分', settings: '測試設定', restoreDefaults: '還原預設', currentStatus: '目前狀態', ready: 'Ready',
    running: 'Running', paused: 'Paused', elapsed: '運行時間', nextProbe: '下次探測', allEvents: '全部事件',
    time: '時間', event: '事件', noEvents: '尚無事件', helpTitle: '如何解讀監測結果', helpProbeTitle: '這不是 ICMP Ping',
    helpProbe: 'NetPulse 透過瀏覽器 HTTPS 請求測量應用層往返時間。失敗／逾時率代表 Probe 請求結果，不等同 L3 封包遺失率。',
    helpRating: '評分綜合延遲、Jitter、Wilson 失敗率、尖峰與 Bufferbloat，並以最差瓶頸限制總分。',
    helpPrivacy: '頁面會連線 Cloudflare 與 AWS 取得網路環境及執行測試。樣本預設只存在記憶體中；只有手動設定 Webhook 時才會傳送完整報告。',
    saved: '設定已儲存', invalidUrl: 'URL 格式不正確，已保留原設定', advancedInfo: '進階資訊', simpleView: '返回簡潔',
    keySummary: '重點摘要', overallQuality: '整體品質', connectionStability: '連線穩定度', responsiveness: '反應速度', consistency: '延遲一致性', ratingProgress: '評級進度',
    estimatedRemaining: '預計剩餘時間', itReport: 'IT 文字報告', reportTitle: '網路檢測文字摘要', symptom: '當時遇到的狀況', symptomSlow: '網路變慢', symptomDisconnect: '連線中斷', symptomMeeting: '視訊／語音卡頓', symptomUnreachable: '系統或網站連不上', symptomOther: '其他', additionalNote: '補充描述（選填）', notePlaceholder: '例如：開會時聲音斷斷續續、公司系統無法登入', reportHint: '請複製下方內容提供給 IT；報告不會自動上傳。', downloadTxt: '下載 TXT', copyText: '複製文字', copied: '已複製，可貼給 IT',
    ratingTitle: '網路品質評級', buildingRating: '正在建立評級', stepOne: '步驟一', stepTwo: '步驟二', stepThree: '步驟三', phaseEnvironment: '確認裝置與網路資訊', phaseTest: '進行 3 分鐘檢測', phaseReport: '將文字報告交給 IT', keepOpen: '請保持此頁面開啟，並繼續操作發生問題的系統或網站。', unstableAlert: '目前連線不穩定，請等待檢測完成並將報告交給 IT。', cancelConfirm: '確定取消本次檢測？已取得的資料仍可產生 IT 報告。',
    showChart: '查看即時圖表', hideChart: '隱藏即時圖表', downloadSpeed: '下載速度', speedPending: '最後 30 秒測量', speedTesting: '下載測速中', speedComplete: '下載測速完成', speedUnavailable: '測速未完成', qualityMonitoring: '網路品質監測中', checkPaused: '檢測已暫停', checkComplete: '檢測完成',
  },
  en: {
    subtitle: 'Network Quality Monitor', start: 'Start 3-minute Check', startAdvanced: 'Start Monitoring', pause: 'Pause', cancel: 'Cancel Check', reset: 'Reset', retry: 'Run Again', export: 'Export',
    os: 'Operating System', browser: 'Browser', localTime: 'Local Time', timezone: 'Timezone', deviceIp: 'Device IP', deviceIpUnavailable: 'Not exposed by browser', latency: 'Connection Latency',
    current: 'Current', average: 'Average', minimum: 'Minimum', maximum: 'Maximum', failure: 'Fail / Timeout',
    failCount: 'Fail Count', failureRate: 'Failure %', timeoutRate: 'Timeout %', maximumSpike: 'Maximum Spike', spikeCount: 'Spike Count',
    liveChart: 'Live Chart', last60: '◷ Last 60 seconds', chartEmpty: 'Start monitoring to see live network quality.',
    score: 'Score', settings: 'Test Settings', restoreDefaults: 'Restore Defaults', currentStatus: 'Current Status', ready: 'Ready',
    running: 'Running', paused: 'Paused', elapsed: 'Elapsed', nextProbe: 'Next Probe', allEvents: 'All Events',
    time: 'Time', event: 'Event', noEvents: 'No events yet', helpTitle: 'Understanding the Results', helpProbeTitle: 'This is not ICMP ping',
    helpProbe: 'NetPulse measures application-layer round-trip time using browser HTTPS requests. Failure and timeout rates describe probes, not L3 packet loss.',
    helpRating: 'The rating combines latency, jitter, Wilson failure bound, spikes and bufferbloat, with a cap based on the weakest bottleneck.',
    helpPrivacy: 'The page connects to Cloudflare and AWS for network details and tests. Samples stay in memory; a full report is sent only after a webhook is configured manually.',
    saved: 'Settings saved', invalidUrl: 'Invalid URL; previous setting retained', advancedInfo: 'Advanced', simpleView: 'Simple View',
    keySummary: 'Key Summary', overallQuality: 'Overall Quality', connectionStability: 'Connection Stability', responsiveness: 'Responsiveness', consistency: 'Latency Consistency', ratingProgress: 'Rating Progress',
    estimatedRemaining: 'Estimated Time Left', itReport: 'IT Text Report', reportTitle: 'Network Diagnostic Summary', symptom: 'Issue experienced', symptomSlow: 'Slow network', symptomDisconnect: 'Disconnected', symptomMeeting: 'Video / audio lag', symptomUnreachable: 'System or site unreachable', symptomOther: 'Other', additionalNote: 'Additional note (optional)', notePlaceholder: 'Example: Audio kept cutting out during a meeting', reportHint: 'Copy the text below and send it to IT. Nothing is uploaded automatically.', downloadTxt: 'Download TXT', copyText: 'Copy Text', copied: 'Copied — ready to send to IT',
    ratingTitle: 'Network Quality Rating', buildingRating: 'Building rating', stepOne: 'Step one', stepTwo: 'Step two', stepThree: 'Step three', phaseEnvironment: 'Confirm device and network', phaseTest: 'Run the 3-minute check', phaseReport: 'Send the text report to IT', keepOpen: 'Keep this page open and continue using the affected system or website.', unstableAlert: 'The connection is unstable. Wait for the check to finish and send the report to IT.', cancelConfirm: 'Cancel this check? The data collected so far can still be included in an IT report.',
    showChart: 'View Live Chart', hideChart: 'Hide Live Chart', downloadSpeed: 'Download Speed', speedPending: 'Measured in final 30 sec', speedTesting: 'Testing download speed', speedComplete: 'Download test complete', speedUnavailable: 'Speed test incomplete', qualityMonitoring: 'Monitoring network quality', checkPaused: 'Check paused', checkComplete: 'Check complete',
  },
};

const QUICK_TEST_MS = 3 * 60 * 1000;
const SPEED_PHASE_MS = 30 * 1000;

const automation = parseAutomation(location.search, loadStoredSettings());
let settings = automation.settings;
const state = {
  running: false, paused: false, samples: [], logs: [], sent: 0, consecutiveFailures: 0,
  endpointKey: 'endpoint', abortController: null, probeTimer: null, countdownTimer: null,
  startedAt: null, elapsedBeforePause: 0, nextProbeAt: null, ewmaJitter: null, jitterDiffs: [], previousLatency: null,
  stressControllers: [], stressBytes: 0, stressStartedAt: null, stressElapsedMs: 0, stressActive: false, stressCompleted: false, activeStressWorkers: 0,
  buffer: { idle: [], load: [], idleAvg: null, loadAvg: null, delta: null },
  rating: { current: null, pending: null, count: 0 }, targetCompleted: false,
  diagnosticComplete: false, diagnosticStartedAt: null, diagnosticEndedAt: null, reportId: null,
  quickDiagnostic: false, speedPhaseStarted: false,
};

$('#version').textContent = VERSION;
fillSettingsForm();
applyLanguage();
detectClient();
bindEvents();
renderAll();
setInterval(renderClock, 1000);
setInterval(renderRuntime, 250);
window.addEventListener('resize', drawChart);
window.addEventListener('online', () => setOnline(true));
window.addEventListener('offline', () => setOnline(false));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (state.running) checkCompletion();
    drawChart();
  }
});
window.addEventListener('beforeunload', shutdown);
setOnline(navigator.onLine, false);
if (automation.autostart) setTimeout(startMonitoring, 350);

function loadStoredSettings() {
  try { return validateSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  $('#form-message').textContent = copy[settings.lang].saved;
  setTimeout(() => { $('#form-message').textContent = ''; }, 1400);
}

function bindEvents() {
  $('#start-button').addEventListener('click', startMonitoring);
  $('#pause-button').addEventListener('click', handlePause);
  $('#reset-button').addEventListener('click', handleReset);
  $('#defaults-button').addEventListener('click', restoreDefaults);
  $$('[data-export]').forEach((button) => button.addEventListener('click', () => {
    exportReport(button.dataset.export);
    $('.export-control').removeAttribute('open');
  }));
  $('#theme-button').addEventListener('click', toggleTheme);
  $('#advanced-button').addEventListener('click', toggleAdvanced);
  $('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
  $('#help-close').addEventListener('click', () => $('#help-dialog').close());
  $('#help-dialog').addEventListener('click', (event) => { if (event.target === $('#help-dialog')) $('#help-dialog').close(); });
  $('#report-button').addEventListener('click', showTextReport);
  $('#chart-toggle').addEventListener('click', toggleConsumerChart);
  $('#report-close').addEventListener('click', () => $('#report-dialog').close());
  $('#report-dialog').addEventListener('click', (event) => { if (event.target === $('#report-dialog')) $('#report-dialog').close(); });
  $('#incident-type').addEventListener('change', renderTextReport);
  $('#incident-note').addEventListener('input', renderTextReport);
  $('#copy-report').addEventListener('click', copyTextReport);
  $('#download-report').addEventListener('click', downloadTextReport);
  $$('.language button').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  $$('[data-chart]').forEach((button) => button.addEventListener('click', () => setChartMode(button.dataset.chart)));
  $('#settings-form').addEventListener('change', applyFormSettings);
  $('#log-filter').addEventListener('change', renderLog);
}

function applyFormSettings() {
  const data = Object.fromEntries(new FormData($('#settings-form')));
  data.stress = $('#settings-form').elements.stress.checked;
  const previous = settings;
  settings = validateSettings({ ...settings, ...data });
  fillSettingsForm();
  saveSettings();
  if (state.running && settings.stress !== previous.stress) {
    if (settings.stress) { state.stressCompleted = false; startStress(); }
    else stopStress('Stress Stopped');
  }
  renderAll();
}

function fillSettingsForm() {
  const form = $('#settings-form');
  if (!form) return;
  for (const [key, value] of Object.entries(settings)) if (form.elements[key]) {
    if (form.elements[key].type === 'checkbox') form.elements[key].checked = value;
    else form.elements[key].value = value;
  }
}

function restoreDefaults() {
  if (state.stressActive) stopStress('Stress Stopped');
  settings = { ...DEFAULT_SETTINGS, lang: settings.lang };
  localStorage.removeItem(STORAGE_KEY);
  fillSettingsForm();
  applyLanguage();
  addLog('Defaults Restored', 'info');
  renderAll();
}

function setLanguage(lang) {
  settings.lang = lang === 'en' ? 'en' : 'zh';
  saveSettings();
  applyLanguage();
  renderAll();
}

function applyLanguage() {
  document.documentElement.lang = settings.lang === 'en' ? 'en' : 'zh-Hant';
  $$('[data-i18n]').forEach((node) => { const value = copy[settings.lang][node.dataset.i18n]; if (value) node.textContent = value; });
  $$('[data-i18n-placeholder]').forEach((node) => { const value = copy[settings.lang][node.dataset.i18nPlaceholder]; if (value) node.placeholder = value; });
  const deviceIp = $('#device-ip');
  if (deviceIp?.dataset.unavailable === 'true') deviceIp.textContent = deviceIp.title = copy[settings.lang].deviceIpUnavailable;
  $$('.language button').forEach((button) => button.classList.toggle('active', button.dataset.lang === settings.lang));
  updateAdvancedControl();
}

function setChartMode(mode) {
  settings.chartMode = mode === 'percentile' ? 'percentile' : 'live';
  saveSettings();
  $$('[data-chart]').forEach((button) => button.classList.toggle('active', button.dataset.chart === settings.chartMode));
  drawChart();
}

function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  requestAnimationFrame(drawChart);
}

function toggleAdvanced() {
  document.body.classList.toggle('advanced');
  if (!document.body.classList.contains('advanced')) document.documentElement.dataset.theme = '';
  updateAdvancedControl();
  requestAnimationFrame(drawChart);
}

function updateAdvancedControl() {
  const expanded = document.body.classList.contains('advanced');
  $('#advanced-button').setAttribute('aria-expanded', String(expanded));
  $('[data-role="advanced-label"]').textContent = copy[settings.lang][expanded ? 'simpleView' : 'advancedInfo'];
  $('[data-i18n="start"]').textContent = copy[settings.lang][expanded ? 'startAdvanced' : 'start'];
  $('[data-i18n="pause"]').textContent = copy[settings.lang][expanded ? 'pause' : 'cancel'];
  $('[data-i18n="reset"]').textContent = copy[settings.lang][expanded ? 'reset' : 'retry'];
  updateChartToggle();
}

function toggleConsumerChart() {
  document.body.classList.toggle('chart-visible');
  updateChartToggle();
  if (document.body.classList.contains('chart-visible')) requestAnimationFrame(drawChart);
}

function updateChartToggle() {
  const label = $('[data-role="chart-toggle-label"]');
  if (label) label.textContent = copy[settings.lang][document.body.classList.contains('chart-visible') ? 'hideChart' : 'showChart'];
}

function handlePause() {
  if (document.body.classList.contains('advanced')) { pauseMonitoring('Monitoring Paused'); return; }
  if (!confirm(copy[settings.lang].cancelConfirm)) return;
  pauseMonitoring('Monitoring Cancelled');
  if (state.sent) showTextReport();
}

function handleReset() {
  const retry = !document.body.classList.contains('advanced');
  resetMonitoring();
  if (retry) startMonitoring();
}

function startMonitoring() {
  if (state.running) return;
  const quickTest = !document.body.classList.contains('advanced');
  if (quickTest && state.diagnosticComplete) resetMonitoring();
  if (quickTest) settings.autoStopMin = 3;
  state.quickDiagnostic = quickTest;
  state.speedPhaseStarted = false;
  state.running = true;
  state.paused = false;
  if (!state.diagnosticStartedAt || state.elapsedBeforePause === 0) state.diagnosticStartedAt = Date.now();
  state.diagnosticEndedAt = null;
  state.stressCompleted = false;
  state.diagnosticComplete = false;
  state.reportId = null;
  state.startedAt = performance.now();
  addLog('Monitoring Started', 'info');
  if (!state.quickDiagnostic && settings.stress && state.buffer.idle.length >= 5) startStress();
  renderStatus();
  scheduleProbe(0);
}

function pauseMonitoring(reason = 'Monitoring Paused') {
  if (!state.running) return;
  state.elapsedBeforePause += performance.now() - state.startedAt;
  state.running = false;
  state.paused = true;
  state.diagnosticEndedAt = Date.now();
  if (reason === 'Auto Stop') state.diagnosticComplete = true;
  clearTimeout(state.probeTimer);
  clearInterval(state.countdownTimer);
  state.nextProbeAt = null;
  if (state.abortController) state.abortController.abort('pause');
  state.abortController = null;
  stopStress();
  addLog(reason, reason === 'Auto Stop' ? 'warning' : 'info');
  renderStatus();
}

function resetMonitoring() {
  if (state.running) pauseMonitoring('Monitoring Paused');
  state.samples = []; state.logs = []; state.sent = 0; state.consecutiveFailures = 0;
  state.endpointKey = 'endpoint'; state.elapsedBeforePause = 0; state.startedAt = null;
  state.ewmaJitter = null; state.jitterDiffs = []; state.previousLatency = null; state.targetCompleted = false; state.stressCompleted = false;
  state.stressBytes = 0; state.stressStartedAt = null; state.stressElapsedMs = 0; state.activeStressWorkers = 0;
  state.buffer = { idle: [], load: [], idleAvg: null, loadAvg: null, delta: null };
  state.rating = { current: null, pending: null, count: 0 }; state.diagnosticComplete = false; state.diagnosticStartedAt = null; state.diagnosticEndedAt = null; state.reportId = null;
  state.quickDiagnostic = false; state.speedPhaseStarted = false;
  state.paused = false;
  renderAll();
}

function scheduleProbe(delay) {
  if (!state.running) return;
  state.nextProbeAt = performance.now() + delay;
  clearTimeout(state.probeTimer);
  state.probeTimer = setTimeout(runProbe, delay);
  renderStatus();
}

async function runProbe() {
  if (!state.running) return;
  const cycleStarted = performance.now();
  const controller = new AbortController();
  state.abortController = controller;
  const timeout = setTimeout(() => controller.abort('timeout'), settings.timeoutMs);
  let status = 'ok', latency = null, error = null;
  try {
    await fetch(cacheBust(settings[state.endpointKey]), {
      method: 'GET', mode: 'no-cors', credentials: 'omit', redirect: 'follow', cache: 'no-store', signal: controller.signal,
    });
    latency = performance.now() - cycleStarted;
  } catch (caught) {
    if (!state.running && controller.signal.reason === 'pause') return;
    status = controller.signal.aborted && controller.signal.reason === 'timeout' ? 'timeout' : 'failed';
    error = caught?.message || String(caught);
  } finally {
    clearTimeout(timeout);
    if (state.abortController === controller) state.abortController = null;
  }
  if (!state.running) return;
  recordSample({ status, latency, error });
  const spent = performance.now() - cycleStarted;
  scheduleProbe(Math.max(0, settings.intervalMs - spent));
}

function recordSample({ status, latency, error }) {
  const warmUp = state.sent < 3;
  const spike = status !== 'ok' || isSpike(latency, state.samples);
  let diff = null;
  if (status === 'ok' && Number.isFinite(state.previousLatency)) {
    diff = Math.abs(latency - state.previousLatency);
    state.jitterDiffs.push(diff);
    if (state.jitterDiffs.length > LIMITS.jitterWindow) state.jitterDiffs.shift();
    state.ewmaJitter = state.jitterDiffs.reduce((current, value) => ewma(current, value), null);
  }
  if (status === 'ok') state.previousLatency = latency;
  const underLoad = state.stressActive && state.activeStressWorkers > 0;
  const sample = { timestamp: Date.now(), latency, jitter: state.ewmaJitter, diff, status, error, warmUp, spike, underLoad };
  state.samples.push(sample);
  if (state.samples.length > LIMITS.samples) state.samples.shift();
  state.sent += 1;

  if (status === 'ok') state.consecutiveFailures = 0;
  else {
    state.consecutiveFailures += 1;
    addLog(status === 'timeout' ? `Probe Timeout (${settings.timeoutMs} ms)` : `Probe Failed (${error || 'Network error'})`, 'error');
  }
  if (spike && status === 'ok') addLog(`Latency Spike Detected (${Math.round(latency)} ms)`, 'warning');
  if (state.consecutiveFailures >= settings.failoverThreshold) {
    state.endpointKey = state.endpointKey === 'endpoint' ? 'fallbackEndpoint' : 'endpoint';
    state.consecutiveFailures = 0;
    addLog(`Failover Switched to ${state.endpointKey === 'endpoint' ? 'Primary' : 'Fallback'}`, 'warning');
  }
  updateBuffer(sample);
  checkSpeedPhase();
  if (!state.quickDiagnostic && settings.stress && state.running && !state.stressActive && !state.stressCompleted && state.buffer.idle.length >= 5) startStress();
  renderAll();
  checkCompletion();
}

function checkCompletion() {
  const elapsed = getElapsed();
  const autoStopReached = state.quickDiagnostic
    ? elapsed >= QUICK_TEST_MS
    : settings.autoStopMin > 0 && elapsed >= settings.autoStopMin * 60000;
  if (autoStopReached) {
    pauseMonitoring('Auto Stop');
    performAutomationOutputs();
    showTextReport();
    return;
  }
  if (automation.autostart && automation.targetSamples && state.sent >= automation.targetSamples && !state.targetCompleted) {
    state.targetCompleted = true;
    pauseMonitoring('Auto Stop');
    performAutomationOutputs();
    showTextReport();
  }
}

function checkSpeedPhase() {
  if (!state.running || !state.quickDiagnostic || state.speedPhaseStarted) return;
  const elapsed = getElapsed();
  if (!isFinalPhase(elapsed, QUICK_TEST_MS, SPEED_PHASE_MS)) return;
  state.speedPhaseStarted = true;
  addLog('Download Speed Test Started (final 30 seconds)', 'info');
  startStress(true);
}

function updateBuffer(sample) {
  if (sample.status !== 'ok' || sample.warmUp) return;
  const bucket = sample.underLoad ? state.buffer.load : state.buffer.idle;
  bucket.push(sample.latency);
  if (bucket.length > 30) bucket.shift();
  if (state.buffer.idle.length >= 5) state.buffer.idleAvg = average(state.buffer.idle);
  if (state.buffer.load.length >= 3) state.buffer.loadAvg = average(state.buffer.load);
  if (Number.isFinite(state.buffer.idleAvg) && Number.isFinite(state.buffer.loadAvg)) state.buffer.delta = state.buffer.loadAvg - state.buffer.idleAvg;
}

function startStress(force = false) {
  if (state.stressActive || state.stressCompleted || !state.running) return;
  if (!force && state.buffer.idle.length < 5) return;
  state.stressActive = true; state.stressBytes = 0; state.stressStartedAt = performance.now(); state.stressElapsedMs = 0; state.activeStressWorkers = 0;
  addLog('Stress Started (2 flows)', 'info');
  for (let i = 0; i < 2; i += 1) stressWorker(i);
}

async function stressWorker(workerId) {
  state.activeStressWorkers += 1;
  try {
    while (state.running && state.stressActive && state.stressBytes < LIMITS.stressBytes) {
      const controller = new AbortController();
      state.stressControllers.push(controller);
      try {
      const response = await fetch(cacheBust(settings.downloadUrl), { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.body) {
        const reader = response.body.getReader();
        while (state.stressActive) {
          const { done, value } = await reader.read();
          if (done) break;
          state.stressBytes += value.byteLength;
          if (state.stressBytes >= LIMITS.stressBytes) { controller.abort(); break; }
        }
      } else {
        state.stressBytes += (await response.arrayBuffer()).byteLength;
      }
      } catch (error) {
        if (state.stressActive && error?.name !== 'AbortError') {
          addLog(`Stress Error (flow ${workerId + 1}: ${error.message})`, 'error');
          break;
        }
      } finally {
        state.stressControllers = state.stressControllers.filter((item) => item !== controller);
      }
    }
  } finally {
    state.activeStressWorkers = Math.max(0, state.activeStressWorkers - 1);
    if (state.stressActive && state.activeStressWorkers === 0 && state.stressBytes < LIMITS.stressBytes) stopStress('Stress Failed');
    renderBuffer();
  }
  if (state.stressActive && state.stressBytes >= LIMITS.stressBytes) stopStress('Stress Limit Reached');
}

function stopStress(reason) {
  const wasActive = state.stressActive;
  if (wasActive && state.stressStartedAt) state.stressElapsedMs = performance.now() - state.stressStartedAt;
  if (reason?.includes('Limit') || reason?.includes('Failed')) state.stressCompleted = true;
  state.stressActive = false;
  state.stressControllers.forEach((controller) => controller.abort());
  state.stressControllers = [];
  if (reason && wasActive) addLog(reason, reason.includes('Limit') ? 'warning' : 'info');
  renderBuffer();
}

function addLog(message, level = 'info') {
  state.logs.unshift({ timestamp: Date.now(), message, level });
  if (state.logs.length > LIMITS.logs) state.logs.pop();
  renderLog();
}

function renderAll() {
  const stats = calculateStats(state.samples, settings.percentileN, state.buffer);
  const rawRating = calculateRating(stats, state.sent, settings.percentileN);
  const displayGrade = applyGradeHysteresis(rawRating.grade);
  renderMetrics(stats);
  renderPercentiles(stats);
  const rating = { ...rawRating, grade: displayGrade };
  renderRating(rating);
  renderHighlights(stats, rating);
  renderBuffer();
  renderStatus();
  renderLog();
  if (!document.hidden) requestAnimationFrame(drawChart);
}

function applyGradeHysteresis(candidate) {
  if (!candidate) { state.rating = { current: null, pending: null, count: 0 }; return null; }
  if (!state.rating.current) { state.rating.current = candidate; return candidate; }
  if (candidate === state.rating.current) { state.rating.pending = null; state.rating.count = 0; return candidate; }
  const ranks = ['F', 'C', 'B', 'A', 'A+'];
  const direction = ranks.indexOf(candidate) - ranks.indexOf(state.rating.current);
  const needed = direction <= -2 ? 1 : direction < 0 ? 2 : 4;
  if (state.rating.pending !== candidate) { state.rating.pending = candidate; state.rating.count = 1; }
  else state.rating.count += 1;
  if (state.rating.count >= needed) state.rating = { current: candidate, pending: null, count: 0 };
  return state.rating.current;
}

function renderMetrics(stats) {
  setText('latency-current', formatMs(stats.current)); setText('latency-average', formatMs(stats.mean));
  setText('latency-min', formatMs(stats.min)); setText('latency-max', formatMs(stats.max));
  setText('jitter-current', formatMs(stats.jitter)); setText('mad-current', formatMs(stats.mad));
  setText('fail-count', stats.failures); setText('fail-rate', formatPercent(stats.failureRate));
  setText('timeout-rate', formatPercent(stats.timeoutRate)); setText('wilson-rate', formatPercent(stats.wilsonFailure));
  setText('spike-count', stats.spikes); setText('max-spike', formatMs(stats.maxSpike));
  const recent = state.samples.filter((sample) => sample.status === 'ok').slice(-10).map((sample) => sample.latency);
  if (recent.length >= 4) {
    const half = Math.floor(recent.length / 2), before = average(recent.slice(0, half)), after = average(recent.slice(half));
    const change = before ? (after - before) / before : 0;
    $('#latency-trend').textContent = `${change <= 0 ? '▼' : '▲'} ${Math.abs(change * 100).toFixed(0)}%`;
    $('#latency-trend').style.color = change <= 0 ? 'var(--green)' : 'var(--red)';
  } else $('#latency-trend').textContent = '—';
}

function renderPercentiles(stats) {
  const items = [['P50', stats.p50], ['P75', stats.p75], ['P90', stats.p90], ['P95', stats.p95], ['P99', stats.p99], ['Avg', stats.mean], ['Min', stats.min], ['Max', stats.max]];
  $('#percentile-grid').innerHTML = items.map(([label, value]) => `<div><small>${label}</small><strong>${escapeHtml(formatMs(value))}</strong></div>`).join('');
}

function renderRating(rating) {
  const simplified = !document.body.classList.contains('advanced');
  setText('grade', rating.grade || (simplified ? '…' : '—'));
  setText('score', rating.score === null ? (simplified ? copy[settings.lang].buildingRating : '— / 100') : `${rating.score} / 100`);
  $('#rating-unlock').textContent = rating.score === null ? `${state.sent}/${rating.unlockAt} samples` : '';
  const items = [['Latency', rating.latency], ['Jitter', rating.jitter], ['Loss', rating.loss], ['Spike', rating.spike]];
  if (rating.buffer !== null) items.push(['Buffer', rating.buffer]);
  $('#score-bars').innerHTML = items.map(([label, score]) => `<div class="score-row"><span>${label}</span><div class="bar"><i style="width:${score}%"></i></div><b>${score}</b></div>`).join('');
}

function renderHighlights(stats, rating) {
  const zh = settings.lang === 'zh';
  const gradeText = zh
    ? { 'A+': '極佳', A: '優良', B: '良好', C: '需要留意', F: '品質不佳' }
    : { 'A+': 'Excellent', A: 'Very Good', B: 'Good', C: 'Needs Attention', F: 'Poor' };
  setHighlight('highlight-overall', rating.grade ? `${rating.grade} · ${gradeText[rating.grade]}` : (zh ? '蒐集資料中' : 'Collecting data'), rating.grade ? (['A+', 'A', 'B'].includes(rating.grade) ? 'good' : rating.grade === 'C' ? 'warning' : 'bad') : 'neutral');

  if (stats.total < 5) setHighlight('highlight-stability', zh ? '等待更多樣本' : 'Waiting for samples', 'neutral');
  else if (stats.failureRate === 0) setHighlight('highlight-stability', zh ? '穩定，未偵測失敗' : 'Stable, no failures', 'good');
  else if (stats.failureRate <= .04) setHighlight('highlight-stability', zh ? '大致穩定' : 'Mostly stable', 'good');
  else if (stats.failureRate <= .16) setHighlight('highlight-stability', zh ? '偶有中斷' : 'Occasional failures', 'warning');
  else setHighlight('highlight-stability', zh ? '連線不穩定' : 'Unstable connection', 'bad');

  if (!Number.isFinite(stats.mean)) setHighlight('highlight-response', zh ? '等待延遲資料' : 'Waiting for latency', 'neutral');
  else if (stats.mean <= 80) setHighlight('highlight-response', zh ? '反應快速' : 'Very responsive', 'good');
  else if (stats.mean <= 150) setHighlight('highlight-response', zh ? '反應良好' : 'Responsive', 'good');
  else if (stats.mean <= 220) setHighlight('highlight-response', zh ? '反應普通' : 'Moderate', 'warning');
  else setHighlight('highlight-response', zh ? '反應偏慢' : 'Slow response', 'bad');

  if (!Number.isFinite(stats.jitter)) setHighlight('highlight-consistency', zh ? '等待 Jitter 資料' : 'Waiting for jitter', 'neutral');
  else if (stats.jitter <= 20) setHighlight('highlight-consistency', zh ? '延遲非常穩定' : 'Very consistent', 'good');
  else if (stats.jitter <= 60) setHighlight('highlight-consistency', zh ? '延遲穩定' : 'Consistent', 'good');
  else if (stats.jitter <= 180) setHighlight('highlight-consistency', zh ? '延遲波動明顯' : 'Noticeable variation', 'warning');
  else setHighlight('highlight-consistency', zh ? '延遲波動過大' : 'Highly inconsistent', 'bad');

  renderSpeedSummary();

  const progress = Math.min(100, state.sent / rating.unlockAt * 100);
  setText('highlight-progress-label', `${Math.min(state.sent, rating.unlockAt)} / ${rating.unlockAt}`);
  $('#highlight-progress').style.width = `${progress}%`;
  $('#highlight-progress-note').textContent = rating.score === null
    ? (zh ? `尚需 ${Math.max(0, rating.unlockAt - state.sent)} 筆樣本` : `${Math.max(0, rating.unlockAt - state.sent)} more samples needed`)
    : (zh ? '品質評級已建立' : 'Quality rating ready');
  $('#connection-alert').classList.toggle('visible', stats.total >= 5 && stats.failureRate > .1);
}

function getSpeedMetrics() {
  const elapsedMs = state.stressActive && state.stressStartedAt ? performance.now() - state.stressStartedAt : state.stressElapsedMs;
  const seconds = elapsedMs ? Math.max(.001, elapsedMs / 1000) : 0;
  const megabytesPerSecond = seconds ? state.stressBytes / seconds / 1_000_000 : null;
  return { bytes: state.stressBytes, seconds, megabytesPerSecond, megabitsPerSecond: megabytesPerSecond === null ? null : megabytesPerSecond * 8 };
}

function renderSpeedSummary() {
  const node = document.getElementById('highlight-speed');
  if (!node) return;
  const speed = getSpeedMetrics();
  if (Number.isFinite(speed.megabitsPerSecond) && speed.bytes > 0) {
    const suffix = state.stressActive ? (settings.lang === 'zh' ? '（測量中）' : ' (testing)') : '';
    setHighlight('highlight-speed', `${speed.megabitsPerSecond.toFixed(1)} Mbps${suffix}`, state.stressActive ? 'warning' : 'info');
  } else if (state.speedPhaseStarted && !state.stressActive) setHighlight('highlight-speed', copy[settings.lang].speedUnavailable, 'warning');
  else setHighlight('highlight-speed', state.speedPhaseStarted ? copy[settings.lang].speedTesting : copy[settings.lang].speedPending, state.speedPhaseStarted ? 'warning' : 'neutral');
}

function setHighlight(id, text, tone) {
  const node = document.getElementById(id);
  node.textContent = text;
  node.dataset.tone = tone;
}

function renderBuffer() {
  setText('idle-average', formatMs(state.buffer.idleAvg)); setText('load-average', formatMs(state.buffer.loadAvg));
  setText('buffer-delta', Number.isFinite(state.buffer.delta) ? `${state.buffer.delta >= 0 ? '+' : ''}${state.buffer.delta.toFixed(0)} ms` : '—');
  const speed = getSpeedMetrics();
  setText('download-speed', speed.seconds ? `${speed.megabytesPerSecond.toFixed(2)} MB/s` : '—');
  setText('flow-count', state.activeStressWorkers);
  renderSpeedSummary();
}

function renderStatus() {
  const status = $('#status');
  status.className = `status ${state.running ? 'running' : state.paused ? 'paused' : 'stopped'}`;
  status.lastElementChild.textContent = copy[settings.lang][state.running ? 'running' : state.paused ? 'paused' : 'ready'];
  const simpleStatus = $('#simple-status');
  simpleStatus.className = `simple-state ${state.running ? 'running' : state.paused ? 'paused' : 'stopped'}`;
  simpleStatus.lastElementChild.textContent = copy[settings.lang][state.running ? 'running' : state.paused ? 'paused' : 'ready'];
  setText('sample-count', state.sent); setText('consecutive-failures', state.consecutiveFailures);
  const endpointName = state.endpointKey === 'endpoint' ? 'Primary' : 'Fallback';
  setText('active-endpoint', endpointName); setText('active-endpoint-detail', `${endpointName} (${hostOf(settings[state.endpointKey])})`);
  $('#start-button').disabled = state.running; $('#pause-button').disabled = !state.running;
  $('#report-button').disabled = state.sent === 0;
  document.body.classList.toggle('testing', state.running);
  document.body.classList.toggle('has-results', state.sent > 0);
  renderJourney();
  $$('[data-chart]').forEach((button) => button.classList.toggle('active', button.dataset.chart === settings.chartMode));
}

function renderJourney() {
  const testing = $('[data-step="testing"]');
  const report = $('[data-step="report"]');
  testing.classList.toggle('complete', state.diagnosticComplete);
  testing.classList.toggle('active', !state.diagnosticComplete);
  report.classList.toggle('active', state.diagnosticComplete);
}

function renderRuntime() {
  setText('elapsed', formatDuration(getElapsed()));
  if (state.running && state.nextProbeAt) setText('next-probe', `${Math.max(0, (state.nextProbeAt - performance.now()) / 1000).toFixed(1)} s`);
  else setText('next-probe', '—');
  if (state.running) checkSpeedPhase();
  if (state.stressActive) renderBuffer();
  if (state.running) checkCompletion();
  const quickRemaining = Math.max(0, QUICK_TEST_MS - getElapsed());
  setText('quick-test-remaining', state.diagnosticComplete ? (settings.lang === 'zh' ? '檢測完成' : 'Complete') : state.paused ? (settings.lang === 'zh' ? '已暫停' : 'Paused') : formatCountdown(quickRemaining));
  const phase = state.diagnosticComplete
    ? copy[settings.lang].checkComplete
    : state.paused
      ? copy[settings.lang].checkPaused
      : state.speedPhaseStarted
        ? state.stressActive ? copy[settings.lang].speedTesting : state.stressBytes > 0 ? copy[settings.lang].speedComplete : copy[settings.lang].speedUnavailable
        : copy[settings.lang].qualityMonitoring;
  setText('quick-test-phase', phase);
}

function renderClock() {
  const now = new Date();
  setText('local-time', now.toLocaleString(settings.lang === 'zh' ? 'zh-TW' : 'en-US', { hour12: false }));
}

function renderLog() {
  const holder = $('#event-log');
  const filter = $('#log-filter')?.value || 'all';
  const events = state.logs.filter((item) => filter === 'all' || item.level === filter);
  if (!events.length) { holder.innerHTML = `<p class="empty-log">${copy[settings.lang].noEvents}</p>`; return; }
  holder.innerHTML = events.map((item) => `<div class="log-entry ${item.level}"><time>${new Date(item.timestamp).toLocaleTimeString(settings.lang === 'zh' ? 'zh-TW' : 'en-US', { hour12: false })}</time><span>${escapeHtml(item.message)}</span></div>`).join('');
}

function drawChart() {
  const canvas = $('#chart');
  if (!canvas || document.hidden) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const context = canvas.getContext('2d'); context.scale(dpr, dpr);
  const style = getComputedStyle(document.documentElement);
  const colors = { text: style.getPropertyValue('--muted'), line: style.getPropertyValue('--line'), blue: '#0874f9', purple: '#7445ed', red: '#ff4652', orange: '#fb8b18', gray: '#a9b5c7' };
  const pad = { left: 46, right: 14, top: 10, bottom: 28 }, width = rect.width - pad.left - pad.right, height = rect.height - pad.top - pad.bottom;
  context.clearRect(0, 0, rect.width, rect.height);
  const valid = state.samples.filter((sample) => Number.isFinite(sample.latency));
  $('#chart-empty').style.display = valid.length ? 'none' : 'grid';
  const data = settings.chartMode === 'live' ? state.samples.filter((sample) => sample.timestamp >= Date.now() - 60000) : [...valid].sort((a, b) => a.latency - b.latency);
  const maxValue = Math.max(100, ...data.flatMap((sample) => [sample.latency || 0, sample.jitter || 0]));
  const yMax = Math.ceil(maxValue / 100) * 100;
  context.font = '11px system-ui'; context.fillStyle = colors.text; context.strokeStyle = colors.line; context.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = pad.top + height * i / 5;
    context.beginPath(); context.moveTo(pad.left, y); context.lineTo(pad.left + width, y); context.stroke();
    context.textAlign = 'right'; context.fillText(Math.round(yMax * (1 - i / 5)), pad.left - 8, y + 4);
  }
  if (!data.length) return;
  const xAt = (sample, index) => settings.chartMode === 'live'
    ? pad.left + width * Math.max(0, (sample.timestamp - (Date.now() - 60000)) / 60000)
    : pad.left + width * index / Math.max(1, data.length - 1);
  const yAt = (value) => pad.top + height * (1 - Math.min(yMax, value || 0) / yMax);
  drawSeries('latency', colors.blue, 2); drawSeries('jitter', colors.purple, 1.5);
  data.forEach((sample, index) => {
    if (sample.status !== 'ok' || sample.spike || sample.warmUp) {
      const value = Number.isFinite(sample.latency) ? sample.latency : yMax;
      context.beginPath(); context.arc(xAt(sample, index), yAt(value), 3.5, 0, Math.PI * 2);
      context.fillStyle = sample.status !== 'ok' ? colors.red : sample.spike ? colors.orange : colors.gray; context.fill();
    }
  });
  if (settings.chartMode === 'percentile') {
    context.fillStyle = colors.text; context.textAlign = 'center';
    [[.5, 'P50'], [.75, 'P75'], [.9, 'P90'], [.95, 'P95'], [.99, 'P99']].forEach(([p, label]) => {
      const x = pad.left + width * p; context.fillText(label, x, rect.height - 8);
    });
  }
  function drawSeries(key, color, lineWidth) {
    context.beginPath(); context.strokeStyle = color; context.lineWidth = lineWidth; let open = false;
    data.forEach((sample, index) => {
      const value = sample[key];
      if (!Number.isFinite(value) || sample.status !== 'ok') { open = false; return; }
      const x = xAt(sample, index), y = yAt(value);
      if (!open) context.moveTo(x, y); else context.lineTo(x, y);
      open = true;
    });
    context.stroke();
  }
}

async function detectClient() {
  const ua = navigator.userAgent;
  setText('client-os', /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS / iPadOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown');
  const browser = /Edg\/(\d+)/.exec(ua)?.[1] ? `Edge ${/Edg\/(\d+)/.exec(ua)[1]}` : /Chrome\/(\d+)/.exec(ua)?.[1] ? `Chrome ${/Chrome\/(\d+)/.exec(ua)[1]}` : /Version\/(\d+).*Safari/.exec(ua)?.[1] ? `Safari ${/Version\/(\d+).*Safari/.exec(ua)[1]}` : 'Browser';
  setText('client-browser', browser);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -new Date().getTimezoneOffset();
  setText('timezone', `${zone} (UTC${offset >= 0 ? '+' : ''}${offset / 60})`); renderClock();
  const deviceIps = await detectDeviceIps();
  const deviceIp = deviceIps.length ? deviceIps.join(' / ') : copy[settings.lang].deviceIpUnavailable;
  const deviceIpNode = $('#device-ip');
  deviceIpNode.dataset.unavailable = String(!deviceIps.length);
  setText('device-ip', deviceIp);
  deviceIpNode.title = deviceIp;
  try {
    const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    const trace = Object.fromEntries((await response.text()).trim().split('\n').map((line) => line.split('=')));
    setText('colo', trace.colo || '—'); setText('location', trace.loc || '—');
  } catch { /* non-blocking */ }
}

async function detectDeviceIps() {
  if (!window.RTCPeerConnection) return [];
  let connection;
  try { connection = new RTCPeerConnection({ iceServers: [] }); }
  catch { return []; }
  const addresses = new Set();
  const collect = (candidate) => {
    if (!candidate) return;
    const text = candidate.candidate || '';
    const type = candidate.type || /\btyp\s+(\w+)/.exec(text)?.[1];
    const address = candidate.address || text.split(/\s+/)[4];
    if (type === 'host' && isUsableIpAddress(address)) addresses.add(address);
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

function isUsableIpAddress(value) {
  if (!value || value.endsWith('.local')) return false;
  if (value.includes(':')) return value !== '::' && value !== '::1';
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && value !== '0.0.0.0' && !value.startsWith('127.');
}

function isPrivateIpv4(value) {
  const parts = value.split('.').map(Number);
  return parts.length === 4 && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}

function setOnline(online, log = true) {
  const node = $('#online-indicator'); node.textContent = `● ${online ? 'Online' : 'Offline'}`; node.classList.toggle('offline', !online);
  if (log) addLog(`Browser ${online ? 'Online' : 'Offline'}`, online ? 'info' : 'error');
}

function buildReport() {
  const stats = calculateStats(state.samples, settings.percentileN, state.buffer);
  const rating = calculateRating(stats, state.sent, settings.percentileN);
  const speed = getSpeedMetrics();
  return { timestamp: new Date().toISOString(), version: VERSION, clientInfo: { os: $('#client-os').textContent, browser: $('#client-browser').textContent, deviceIp: $('#device-ip').textContent, colo: $('#colo').textContent, loc: $('#location').textContent, timezone: $('#timezone').textContent }, settings: { ...settings }, stats: { ...stats, grade: state.rating.current || rating.grade, score: rating.score, gradeLabel: state.rating.current || rating.grade || 'unavailable', downloadMbps: speed.megabitsPerSecond, downloadMBps: speed.megabytesPerSecond, downloadedBytes: speed.bytes, speedDurationSeconds: speed.seconds }, samples: state.samples.map((sample) => ({ ...sample, timestamp: new Date(sample.timestamp).toISOString() })) };
}

function showTextReport() {
  if (!state.sent) return;
  if (!state.reportId) state.reportId = createReportId();
  renderTextReport();
  if (!$('#report-dialog').open) $('#report-dialog').showModal();
}

function renderTextReport() {
  if (!state.sent) return;
  $('#text-report').textContent = buildTextReport();
}

function buildTextReport() {
  const report = buildReport();
  const stats = report.stats;
  const zh = settings.lang === 'zh';
  const symptom = $('#incident-type').selectedOptions[0]?.textContent || '—';
  const note = $('#incident-note').value.trim() || (zh ? '未填寫' : 'Not provided');
  const startTime = new Date(state.diagnosticStartedAt || Date.now() - getElapsed());
  const endTime = new Date(state.diagnosticEndedAt || Date.now());
  const statisticsWindow = state.samples.slice(-settings.percentileN);
  const successful = statisticsWindow.filter((sample) => sample.status === 'ok').length;
  const failedOnly = statisticsWindow.filter((sample) => sample.status === 'failed').length;
  const timedOut = statisticsWindow.filter((sample) => sample.status === 'timeout').length;
  const warmUp = statisticsWindow.filter((sample) => sample.warmUp).length;
  const locale = zh ? 'zh-TW' : 'en-US';
  const speedReady = Number.isFinite(stats.downloadMbps) && stats.downloadedBytes > 0;
  const speedMbps = speedReady ? `${stats.downloadMbps.toFixed(1)} Mbps` : (zh ? '未完成' : 'Incomplete');
  const speedDetail = speedReady
    ? `${(stats.downloadedBytes / 1_000_000).toFixed(1)} MB / ${stats.speedDurationSeconds.toFixed(1)} s / ${stats.downloadMBps.toFixed(2)} MB/s`
    : (zh ? '尚無有效下載資料' : 'No valid download data');
  const lines = zh ? [
    'NetPulse 網路檢測重點摘要',
    `報告編號：${state.reportId}`,
    `檢測版本：v${VERSION}`,
    `檢測時間：${startTime.toLocaleString(locale, { hour12: false })} ～ ${endTime.toLocaleString(locale, { hour12: false })}`,
    `檢測長度：${formatDuration(getElapsed())}`,
    '',
    '【使用者回報】',
    `狀況：${symptom}`,
    `補充：${note}`,
    '',
    '【重點判讀】',
    `整體品質：${$('#highlight-overall').textContent}`,
    `連線穩定度：${$('#highlight-stability').textContent}`,
    `反應速度：${$('#highlight-response').textContent}`,
    `延遲一致性：${$('#highlight-consistency').textContent}`,
    `下載速度：${speedMbps}`,
    '',
    '【測試數據】',
    `總探測：${state.sent} 筆；統計視窗：最近 ${stats.total} 筆（成功 ${successful}，含暖機 ${warmUp}／失敗 ${failedOnly}／逾時 ${timedOut}）`,
    `延遲：目前 ${formatMs(stats.current)}／平均 ${formatMs(stats.mean)}／最低 ${formatMs(stats.min)}／最高 ${formatMs(stats.max)}`,
    `百分位：P50 ${formatMs(stats.p50)}／P95 ${formatMs(stats.p95)}／P99 ${formatMs(stats.p99)}`,
    `Jitter：${formatMs(stats.jitter)}／MAD ${formatMs(stats.mad)}`,
    `失敗率：${formatPercent(stats.failureRate)}／逾時率 ${formatPercent(stats.timeoutRate)}／Wilson 95% ${formatPercent(stats.wilsonFailure)}`,
    `尖峰：${stats.spikes} 次／最大 ${formatMs(stats.maxSpike)}`,
    Number.isFinite(stats.bufferDelta) ? `Bufferbloat：${formatMs(stats.bufferDelta)}（Idle ${formatMs(state.buffer.idleAvg)}／負載 ${formatMs(state.buffer.loadAvg)}）` : 'Bufferbloat：本次未執行或資料不足',
    `下載測速：${speedMbps}（下載量／時間／速率：${speedDetail}）`,
    '',
    '【裝置與網路環境】',
    `作業系統：${report.clientInfo.os}`,
    `瀏覽器：${report.clientInfo.browser}`,
    `時區：${report.clientInfo.timezone}`,
    `設備 IP：${report.clientInfo.deviceIp}`,
    `CDN Node / Colo：${report.clientInfo.colo}`,
    `Location：${report.clientInfo.loc}`,
    `Active Endpoint：${state.endpointKey === 'endpoint' ? 'Primary' : 'Fallback'} (${hostOf(settings[state.endpointKey])})`,
    '',
    '註：本工具測量瀏覽器 HTTPS Probe latency；失敗／逾時率不等同 ICMP packet loss。下載測速使用瀏覽器 HTTPS 下載流量，不包含上傳速度。',
  ] : [
    'NetPulse Network Diagnostic Summary',
    `Report ID: ${state.reportId}`,
    `Version: v${VERSION}`,
    `Test window: ${startTime.toLocaleString(locale)} – ${endTime.toLocaleString(locale)}`,
    `Duration: ${formatDuration(getElapsed())}`,
    '',
    '[USER REPORT]', `Issue: ${symptom}`, `Note: ${note}`, '',
    '[KEY FINDINGS]',
    `Overall quality: ${$('#highlight-overall').textContent}`,
    `Connection stability: ${$('#highlight-stability').textContent}`,
    `Responsiveness: ${$('#highlight-response').textContent}`,
    `Latency consistency: ${$('#highlight-consistency').textContent}`,
    `Download speed: ${speedMbps}`,
    '',
    '[TEST DATA]',
    `Total probes: ${state.sent}; statistics window: latest ${stats.total} (success ${successful}, including ${warmUp} warm-up / failed ${failedOnly} / timeout ${timedOut})`,
    `Latency: current ${formatMs(stats.current)} / average ${formatMs(stats.mean)} / min ${formatMs(stats.min)} / max ${formatMs(stats.max)}`,
    `Percentiles: P50 ${formatMs(stats.p50)} / P95 ${formatMs(stats.p95)} / P99 ${formatMs(stats.p99)}`,
    `Jitter: ${formatMs(stats.jitter)} / MAD ${formatMs(stats.mad)}`,
    `Failure: ${formatPercent(stats.failureRate)} / timeout ${formatPercent(stats.timeoutRate)} / Wilson 95% ${formatPercent(stats.wilsonFailure)}`,
    `Spikes: ${stats.spikes} / maximum ${formatMs(stats.maxSpike)}`,
    Number.isFinite(stats.bufferDelta) ? `Bufferbloat: ${formatMs(stats.bufferDelta)} (idle ${formatMs(state.buffer.idleAvg)} / loaded ${formatMs(state.buffer.loadAvg)})` : 'Bufferbloat: not run or insufficient data',
    `Download test: ${speedMbps} (download / duration / rate: ${speedDetail})`,
    '',
    '[CLIENT / NETWORK]',
    `OS: ${report.clientInfo.os}`, `Browser: ${report.clientInfo.browser}`, `Timezone: ${report.clientInfo.timezone}`,
    `Device IP: ${report.clientInfo.deviceIp}`, `CDN Node / Colo: ${report.clientInfo.colo}`, `Location: ${report.clientInfo.loc}`,
    `Active Endpoint: ${state.endpointKey === 'endpoint' ? 'Primary' : 'Fallback'} (${hostOf(settings[state.endpointKey])})`,
    '',
    'Note: This tool measures browser HTTPS probe latency. Failure/timeout rate is not ICMP packet loss. The speed test uses browser HTTPS download traffic and does not measure upload speed.',
  ];
  return lines.join('\n');
}

async function copyTextReport() {
  const text = buildTextReport();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.append(textarea); textarea.select(); document.execCommand('copy'); textarea.remove();
  }
  $('#report-action-status').textContent = copy[settings.lang].copied;
  setTimeout(() => { $('#report-action-status').textContent = ''; }, 2500);
}

function downloadTextReport() {
  downloadBlob('\ufeff' + buildTextReport(), `${state.reportId || createReportId()}.txt`, 'text/plain;charset=utf-8');
}

function createReportId() {
  const date = new Date();
  const digits = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0')).join('');
  return `NP-${digits}`;
}

function exportReport(type) {
  const report = buildReport(), stamp = report.timestamp.replace(/[:.]/g, '-');
  if (type === 'json') downloadBlob(JSON.stringify(report, null, 2), `netpulse-${stamp}.json`, 'application/json');
  else if (type === 'csv') {
    const header = 'timestamp,latency_ms,jitter_ms,status,warm_up,spike,under_load\n';
    const rows = report.samples.map((s) => [s.timestamp, finiteCsv(s.latency), finiteCsv(s.jitter), s.status, s.warmUp, s.spike, s.underLoad].join(',')).join('\n');
    downloadBlob('\ufeff' + header + rows, `netpulse-${stamp}.csv`, 'text/csv;charset=utf-8');
  } else if (type === 'png') exportPng(report, stamp);
}

async function exportPng(report, stamp) {
  try {
    const root = $('#report-root');
    const clone = root.cloneNode(true);
    const sources = [root, ...root.querySelectorAll('*')];
    const targets = [clone, ...clone.querySelectorAll('*')];
    sources.forEach((source, index) => {
      const target = targets[index];
      const computed = getComputedStyle(source);
      target.setAttribute('style', [...computed].map((property) => `${property}:${computed.getPropertyValue(property)};`).join(''));
      if (source instanceof HTMLInputElement) {
        target.setAttribute('value', source.value);
        if (source.type === 'checkbox' && source.checked) target.setAttribute('checked', '');
      }
      if (source instanceof HTMLSelectElement) [...target.options].forEach((option, optionIndex) => { option.selected = source.options[optionIndex].selected; });
      if (source instanceof HTMLCanvasElement) {
        const image = document.createElement('img'); image.src = source.toDataURL('image/png'); image.setAttribute('style', target.getAttribute('style')); target.replaceWith(image);
      }
    });
    clone.querySelectorAll('details').forEach((details) => details.removeAttribute('open'));
    const width = root.scrollWidth, height = root.scrollHeight;
    const wrapper = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
    wrapper.append(clone);
    const serialized = new XMLSerializer().serializeToString(wrapper);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = svgUrl; });
    URL.revokeObjectURL(svgUrl);
    const scale = Math.min(2, 3840 / width);
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('PNG encoding failed');
    downloadBlob(png, `netpulse-${stamp}.png`, 'image/png');
    addLog('PNG Exported', 'info');
  } catch (error) {
    addLog(`PNG fallback (${error?.message || 'capture unavailable'})`, 'warning');
    exportSummaryPng(report, stamp);
  }
}

function exportSummaryPng(report, stamp) {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 900;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f5f8fc'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#10203d'; context.font = '700 48px system-ui'; context.fillText('NetPulse Network Quality Report', 70, 90);
  context.font = '24px system-ui'; context.fillStyle = '#60708d'; context.fillText(report.timestamp, 70, 132);
  const cards = [['Grade', report.stats.gradeLabel], ['Score', report.stats.score ?? '—'], ['P50', formatMs(report.stats.p50)], ['P95', formatMs(report.stats.p95)], ['Jitter', formatMs(report.stats.jitter)], ['Failure', formatPercent(report.stats.failureRate)], ['Wilson 95%', formatPercent(report.stats.wilsonFailure)], ['Bufferbloat', formatMs(report.stats.bufferDelta)]];
  cards.forEach(([label, value], index) => { const x = 70 + (index % 4) * 375, y = 190 + Math.floor(index / 4) * 180; context.fillStyle = '#fff'; roundRect(context, x, y, 330, 140, 16); context.fill(); context.fillStyle = '#60708d'; context.font = '22px system-ui'; context.fillText(label, x + 25, y + 42); context.fillStyle = '#10203d'; context.font = '700 38px system-ui'; context.fillText(String(value), x + 25, y + 99); });
  context.fillStyle = '#60708d'; context.font = '20px system-ui'; context.fillText('Browser HTTPS request latency — not ICMP ping', 70, 620);
  context.fillText(`Samples: ${report.samples.length}  |  Active endpoint: ${hostOf(settings[state.endpointKey])}`, 70, 658);
  canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `netpulse-${stamp}.png`, 'image/png'); });
}

async function performAutomationOutputs() {
  let types = automation.exports.includes('all') ? ['json', 'csv', 'png'] : automation.exports.filter((type) => ['json', 'csv', 'png'].includes(type));
  types.forEach(exportReport);
  if (settings.webhook) {
    try {
      const response = await fetch(settings.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildReport()) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('Webhook Delivered', 'info');
    } catch (error) { addLog(`Webhook Failed (${error.message})`, 'error'); }
  }
}

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shutdown() { clearTimeout(state.probeTimer); state.abortController?.abort('pause'); stopStress(); }
function getElapsed() { return state.elapsedBeforePause + (state.running && state.startedAt ? performance.now() - state.startedAt : 0); }
function formatDuration(ms) { const total = Math.floor(ms / 1000); return [Math.floor(total / 3600), Math.floor(total % 3600 / 60), total % 60].map((value) => String(value).padStart(2, '0')).join(':'); }
function formatCountdown(ms) { const total = Math.ceil(ms / 1000); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; }
function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function hostOf(url) { try { return new URL(url).hostname; } catch { return '—'; } }
function cacheBust(url) { const next = new URL(url); next.searchParams.set('_netpulse', `${Date.now()}-${Math.random().toString(36).slice(2)}`); return next.href; }
function finiteCsv(value) { return Number.isFinite(value) ? value.toFixed(3) : ''; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function roundRect(context, x, y, width, height, radius) { context.beginPath(); context.roundRect(x, y, width, height, radius); }

// Consumer mode always opens in the light theme. Dark mode remains opt-in while viewing advanced information.
document.documentElement.dataset.theme = '';
