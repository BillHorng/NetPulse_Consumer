# NetPulse 專案交接手冊

> 此副本為 **NetPulse Consumer Edition**。核心監測邏輯與 Engineering Edition 相同，並保留完整的 OS、Browser、時間、時區、對外出口 IP、Colo、Location 與 Active Endpoint 資訊列。一般畫面使用縮小圖表與白話重點摘要，僅隱藏進階統計、Bufferbloat、設定及 Event Log；使用者可透過頁首「進階資訊」切換完整畫面。

Consumer 預設流程為 3 分鐘快速診斷。一般模式按下 Start 時會將本次 Auto Stop 固定為 3 分鐘；前 2 分 30 秒建立一般品質與 Idle baseline，最後 30 秒自動啟動下載測速及 Under-load 探測。完成後自動開啟 IT 文字摘要，並列出下載 Mbps、下載量、實際測速秒數與 Bufferbloat。摘要只在瀏覽器記憶體中產生，使用者必須自行複製或下載 TXT，不會自動傳送。

一般模式刻意隱藏 JSON／CSV／PNG、Theme、Percentile 切換與評分細項。Pause 在一般模式顯示為「取消檢測」並要求確認；Reset 只在已有結果且未執行時顯示為「重新檢測」，按下後會清空舊資料並立即開始新一輪。進階模式仍維持原本 Pause／Reset 語意。

完整即時曲線在一般模式預設隱藏，`chart-visible` body class 控制同頁展開；`#chart-toggle` 負責切換。進階模式不受此 class 影響並維持完整圖表。

## 1. 文件資訊

| 項目 | 內容 |
| --- | --- |
| 專案名稱 | NetPulse｜網路品質監測平台 |
| 目前版本 | v1.0.4 |
| 應用類型 | 無後端、可靜態部署的瀏覽器應用程式 |
| 主要語言 | HTML、CSS、原生 JavaScript ES Modules |
| 套件建置 | 正式頁面無建置步驟；npm／Playwright 僅供開發測試 |
| 規格基準 | `Web Application/LagCheck_v1.0.13_System_Rebuild_Spec.docx` |
| UI 基準 | `Web Application/UI 參考.png` |
| GitHub Repository | `https://github.com/BillHorng/NetPulse_Consumer` |
| GitHub Pages | `https://billhorng.github.io/NetPulse_Consumer/` |

本文件提供後續開發、維護、測試及部署所需的實務資訊。原始規格書仍是功能需求與驗收條件的最高依據；本文件著重目前 NetPulse 程式的實際結構與維護方式。

## 2. 產品定位

NetPulse 透過瀏覽器的 HTTPS `fetch` 請求測量應用層延遲，並根據測量結果計算 Jitter、MAD、Percentile、Probe 失敗率、尖峰與 Bufferbloat。

請勿將結果描述為 ICMP Ping 或真實 L3 packet loss。正式用語應為：

- HTTPS Probe latency
- Probe failure rate
- Probe timeout rate

頁面會連線 Cloudflare 與 AWS 取得網路環境及執行測試。樣本只存在目前頁面的記憶體中，不會送往 NetPulse 自有後端，也不會在重新整理後保留；只有使用者在進階設定中手動設定 HTTPS Webhook 時，完整報告才會傳送到該 URL。

### 2.1 對外出口 IP 資料契約

- 畫面欄位為 `#public-ip`，標籤簡化為 `IP`，Tooltip 為「您的對外連線出口 IP 位址」／`Your public egress IP address`。
- JSON 報告欄位為 `clientInfo.publicIp`；中英文文字報告分別使用「對外出口 IP」與 `Public egress IP`。
- 優先讀取 Cloudflare `cdn-cgi/trace` 的 `ip`、`colo` 與 `loc`；若 Cloudflare 無法提供有效 IP，再使用 AWS `checkip.amazonaws.com`。
- 回應必須通過 IPv4／IPv6 格式檢查，無有效結果時顯示 `—`。
- 公司網路通常顯示 NAT／防火牆的出口，例如 `59.125.x.x`；使用 VPN 或 Proxy 時，可能顯示 VPN／Proxy 的出口。
- 此欄位不是設備內網 IP，不代表 `192.168.x.x`、`10.x.x.x` 或特定網卡位址。

## 3. 目錄與檔案

```text
NetPulse_Consumer/
├─ index.html                 # UI 結構
├─ styles.css                 # 視覺樣式、深色模式、響應式版面
├─ app.mjs                    # 應用狀態、Probe、Stress、圖表及 DOM 協調
├─ core.mjs                   # 設定、統計及評分純函數
├─ device-info.mjs            # OS、Browser、對外出口 IP 與 CDN metadata
├─ speed-test.mjs             # 測速常數、暖機排除與分段中位數
├─ report.mjs                 # 報告編號與中英文 IT 文字報告
├─ tests.html                 # 不需測試框架的瀏覽器單元測試
├─ e2e/netpulse.spec.mjs      # Playwright 完整流程測試
├─ playwright.config.mjs      # E2E 與本機靜態伺服器設定
├─ package.json               # 開發測試依賴；正式頁面不使用
├─ .github/workflows/ci.yml   # push／PR 自動測試
├─ README.md                  # 使用者／部署者快速說明
└─ HANDOFF.md                 # 本交接手冊
```

主要責任分工：

| 檔案 | 維護原則 |
| --- | --- |
| `core.mjs` | 僅放無 DOM 相依的純函數；修改演算法時應同步新增測試 |
| `app.mjs` | 負責狀態、Probe、下載 workers、事件、生命週期與畫面協調 |
| `device-info.mjs` | 裝置／瀏覽器資訊、Cloudflare 出口 IP／Colo／Location 與 AWS IP fallback |
| `speed-test.mjs` | 測速計算必須保持純函數並由 `tests.html` 覆蓋 |
| `report.mjs` | 組合中英文文字報告，不直接讀取 DOM |
| `index.html` | 維持語義化標記、無障礙 label 與固定 DOM ID |
| `styles.css` | 顏色使用 CSS variables；響應式斷點目前為 1360、980、680 px |
| `tests.html` | 核心與安全邊界回歸測試；目前應顯示 `PASS 16/16` |
| `e2e/` | 驗證 1366 × 650 首屏、縮時完整流程、對外出口 IP、Tooltip 與 IT 報告 |

## 4. 本機啟動

ES Modules 建議由 HTTP Server 提供，不要直接雙擊 `index.html`。

在 VS Code 中可使用 Live Server；也可以使用任何現成的靜態網站伺服器。啟動後開啟：

```text
http://127.0.0.1:<port>/index.html
```

核心測試入口：

```text
http://127.0.0.1:<port>/tests.html
```

正式站必須優先使用 HTTPS，否則瀏覽器可能因 mixed content、CORS 或安全策略而阻擋 Probe、下載或 Webhook。

## 5. 目前架構

### 5.1 初始化順序

頁面載入時依下列順序建立設定：

```text
程式預設值
  → LocalStorage
  → URL Query String 覆寫
  → validateSettings()
  → UI render
  → optional autostart
```

LocalStorage key 為：

```text
netpulse-consumer-settings-v1
```

一般模式固定使用白色背景，不讀取系統深色偏好或同網域其他應用的主題設定；進階模式仍可於當次工作階段切換深色，返回一般模式時會恢復白色。桌面版的頁首、環境資訊列與主內容統一使用 1280 px 最大寬度並置中，Latency、Jitter、失敗／逾時三張狀態卡採等寬排列。

### 5.2 Probe 流程

`startMonitoring()` 啟動後，由 `scheduleProbe()` 和 `runProbe()` 形成 completion-based loop：

1. 讀取目前 Active Endpoint。
2. 建立獨立 `AbortController`。
3. 以 `performance.now()` 記錄開始時間。
4. 執行 `fetch`，預設使用 `no-cors`、`credentials: omit`、`cache: no-store`。
5. Timeout 時中止請求並建立 `timeout` sample。
6. 其他錯誤建立 `failed` sample。
7. 成功時計算 latency，建立 `ok` sample。
8. 更新統計、評級、Failover、Buffer、圖表和事件紀錄。
9. 扣除本次執行時間，再安排下一次 Probe。

Pause 會中止目前請求並停止後續排程，但保留已收集資料。Reset 會清空樣本、Log、評分、Failover 與 Buffer 狀態，但不清除使用者設定。

### 5.3 Sample 結構

```js
{
  timestamp: number,
  latency: number | null,
  jitter: number | null,
  diff: number | null,
  status: 'ok' | 'timeout' | 'failed',
  error: string | null,
  warmUp: boolean,
  spike: boolean,
  underLoad: boolean
}
```

限制：

- 最多 360 筆 Samples
- 前 3 筆標示為 Warm-up
- Event Log 最多 100 筆
- Jitter 使用最近 20 筆有效延遲差值

### 5.4 統計與評分

純函數集中於 `core.mjs`：

- `percentile()`：使用 `(N - 1) × p` 線性插值
- `mad()`：Median Absolute Deviation
- `wilsonUpper()`：95% Wilson upper bound，`z = 1.96`
- `isSpike()`：樣本不足時使用 100 ms；資料成立後使用 `max(100 ms, baseline × 2)`
- `calculateStats()`：計算延遲、失敗、逾時、尖峰及 Percentiles
- `calculateRating()`：計算各項分數、動態權重、bottleneck cap 與 Grade

Grade：

| 分數 | 等級 |
| --- | --- |
| ≥ 95 | A+ |
| 85–94 | A |
| 75–84 | B |
| 60–74 | C |
| < 60 | F |

`Percentile N <= 100` 時需 30 samples 解鎖評級；大於 100 時需 60 samples。UI 另有 Grade hysteresis，避免評級頻繁跳動。

### 5.5 Failover

- 成功：`consecutiveFailures` 歸零。
- Timeout 或 Failed：計數加一。
- 達設定門檻：Primary 與 Fallback 互相切換、計數歸零並寫入 Log。
- Failover 是雙向行為，不只 Primary → Fallback。

### 5.6 Stress 與 Bufferbloat

進階模式開啟 Stress 時，系統會先收集至少 5 筆 Idle samples，再啟動 2 個下載 workers。一般模式不受 Stress checkbox 影響，固定於 3 分鐘檢測的最後 30 秒自動啟動 workers；前段監測通常已建立足夠的 Idle baseline，即使成功 Probe 不足 5 筆仍會嘗試下載測速，但此時可能無法計算 Bufferbloat。

限制與計算：

- 單次 session 最多下載約 100 MB。
- 達上限或 worker 全部失敗後，同一次監測不會自行重啟 Stress。
- Pause、Auto Stop 與離開頁面都會停止 workers。
- Idle 與 Under-load 各保留最近最多 30 筆。
- 至少需要 5 筆 Idle、3 筆 Under-load 才會產生 Buffer delta。
- `Buffer delta = Under-load average - Idle average`。
- 一般畫面與文字報告以 Mbps 呈現，進階 Buffer 面板另顯示 MB/s。
- 兩個 workers 的 bytes 會合併到一秒時間桶；前 2 秒視為 TCP／TLS 暖機，不納入統計。
- 暖機後只採用完整的一秒時間桶，並以各桶總 Mbps 中位數作為主要結果；有效時間桶不足時才回退為「總下載量 ÷ 總時間」。
- 此功能只測量瀏覽器 HTTPS 下載速度，不包含上傳速度；結果也會受測速端點、瀏覽器、VPN／Proxy 與裝置效能影響。

一般模式的階段控制與下載 worker 位於 `app.mjs`，測速常數與純計算位於 `speed-test.mjs`：

- `QUICK_TEST_MS`：完整診斷時間，目前為 180 秒。
- `SPEED_PHASE_MS`：下載測速階段，目前為最後 30 秒。
- `checkSpeedPhase()`：依 elapsed time 啟動測速；一般模式會以 force 方式啟動，即使 Idle 成功樣本不足仍會嘗試下載。
- `calculateSpeedMetrics()`：排除暖機分段、計算分段中位數與 aggregate fallback。
- `getSpeedMetrics()`：整理目前 state 後呼叫純計算模組。
- `renderSpeedSummary()`：更新一般模式第五張「下載速度」摘要卡。

`buildReport()` 會在 JSON `stats` 加入 `downloadMbps`、`downloadMBps`、`downloadAggregateMbps`、`downloadedBytes`、`speedDurationSeconds`、`speedSegmentCount`、`speedMethod` 與 `speedWarmupSeconds`，另以 `speedTest` 記錄下載端點、flow 數與流量上限。`report.mjs` 會把測速方法、有效分段數與下載端點加入中英文 IT 報告；報告必須持續註明這是 HTTPS download-only 測試。

### 5.7 圖表

圖表以原生 Canvas 繪製，不依賴外部 Chart CDN：

- Live：未滿 60 秒時從第一筆樣本動態展開整個圖面，滿 60 秒後才切換為最近 60 秒滑動視窗；X 軸使用實際時間，避免初期樣本全部擠在右側而看似沒有波動。
- 延遲線會繪製小型取樣點，協助辨識細微波動；Y 軸仍從 0 ms 起算，避免用截斷座標誇大差異。
- 下方摘要的目前／平均／最低／最高與有效樣本只計算同一個可見區間。上方品質摘要仍使用 `percentileN` 評分視窗；圖表標頭會明示目前累積秒數或最近 60 秒，以及上方平均最近 N 筆。
- Percentile：只使用最近 `percentileN` 筆有效延遲排序，並標示 P50、P75、P90、P95、P99；不再混入評分視窗以外的舊樣本。
- Y 軸標示「延遲／抖動（ms）」，由 `calculateChartScale()` 依可見數值產生含 10% headroom 的易讀刻度，不再固定以 100 ms 粗略進位。
- 圖表標頭顯示實際 Active Endpoint；一般圖例簡化為延遲、抖動、尖峰與逾時／失敗。暖機樣本仍由內部統計排除，但不顯示灰色標記或圖例。
- 滑鼠移動或觸控圖表時，Tooltip 顯示最近樣本的時間、Latency、Jitter 與狀態。
- `document.hidden` 時停止不必要的重繪，但 Probe 繼續執行。

### 5.8 匯出

支援：

- JSON：完整 clientInfo、settings、stats 和 samples。
- CSV：逐筆 sample 資料。
- PNG：使用本地 SVG／XMLSerializer 擷取，不載入第三方 CDN 腳本。
- Webhook：HTTPS POST，`Content-Type: application/json`。

PNG 有兩層本地路徑：

1. 嘗試 SVG／XMLSerializer 完整頁面擷取。
2. 瀏覽器不允許擷取時，輸出 Canvas 摘要 PNG。

任何 PNG 或 Webhook 失敗都不應中止核心監測。

## 6. 預設設定與限制

| 設定 | 預設值 | 允許範圍／說明 |
| --- | --- | --- |
| Primary Endpoint | `https://checkip.amazonaws.com` | 僅 HTTPS |
| Fallback Endpoint | `https://one.one.one.one/cdn-cgi/trace` | 僅 HTTPS |
| Download URL | Cloudflare 10 MB endpoint | 僅 HTTPS |
| Interval | 500 ms | 200–2000 ms |
| Timeout | 2000 ms | 1000–5000 ms |
| Failover Threshold | 5 | 3–10 |
| Percentile N | 200 | 30–500 |
| Auto Stop | 3 min | 0–1440；0 表示停用 |
| Stress Workers | 2 | 固定值 |
| Stress Cap | 100 MB | 每次 session |

若需要修改預設值，請編輯 `core.mjs` 的 `DEFAULT_SETTINGS`；數值限制則位於 `LIMITS`。

### 6.1 測試端點的選擇與安全理由

目前各外部端點的責任必須保持分離：

| 用途 | 預設端點 | 選用理由 |
| --- | --- | --- |
| 一般 HTTPS Probe | `https://checkip.amazonaws.com` | AWS 提供的輕量純文字回應，內容小，適合重複測量應用層往返時間 |
| Probe failover | `https://one.one.one.one/cdn-cgi/trace` | 與 Primary 不同的 Cloudflare 網路，可避免單一服務不可用就誤判整段連線中斷 |
| 下載測速 | `https://speed.cloudflare.com/__down?bytes=10000000` | Cloudflare 提供的 Internet speed test 下載端點，可取得固定大小資料流 |
| 出口 IP／Colo／Location | `https://www.cloudflare.com/cdn-cgi/trace`，IP 失敗時使用 AWS | `/cdn-cgi/trace` 是 Cloudflare 管理的診斷端點；AWS 僅作 IP fallback |

這些端點都是實際的外部 HTTPS 服務。Probe 與下載測速使用 GET、`credentials: 'omit'` 及 `cache: 'no-store'`，不附帶 Cookie／HTTP 登入憑證、不上傳使用者檔案，也不執行遠端回應中的程式碼。外部服務仍會看見來源出口 IP、User-Agent 及一般連線 metadata；這是建立 HTTPS 連線與識別出口 IP 無法避免的資訊。完整 IT 報告只有使用者手動設定 Webhook 後才會送出。

不以 Google 首頁作為預設 Probe／測速端點，原因如下：

- Google 首頁不是公開的健康檢查或測速 API，重新導向、快取、區域化頁面、Bot 防護及限流都可能使樣本失真或不穩定。
- Google 回應較大且內容可能變動；頻繁存取一般網站也不是其設計用途。
- 測到的是「到 Google 的路徑」，不能代表公司系統、VPN、Microsoft 365 或整體 Internet 品質；知名網站不等同中立的量測端點。
- 即使改用 Google，仍只能證明該目的地當下可達，無法定位公司系統自身的異常。

若正式企業部署需要反映真實工作情境，建議保留 AWS／Cloudflare 作為 Internet baseline，另建立企業自有、無登入、無 Cookie、支援 HTTPS／CORS／no-store 且具容量控管的 `/health` 端點，分開呈現「Internet 品質」與「公司系統可達性」。不可直接對正式業務頁面執行下載壓力測試。

供後續維護核對的官方資料：

- AWS Check IP：`https://docs.aws.amazon.com/powershell/v4/userguide/aws-pst-v4-ug.pdf`
- Cloudflare `/cdn-cgi/`：`https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/`
- Cloudflare Internet speed test：`https://developers.cloudflare.com/fundamentals/performance/test-speed/`
- Fetch credentials：`https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch`

## 7. URL Automation

範例：

```text
?autostart=1&samples=100&export=json,png&lang=zh
```

| 目的 | 參數 |
| --- | --- |
| Interval | `interval` |
| Timeout | `timeout` |
| Failover | `failover`、`failoverThreshold` |
| Target／Window | `samples`、`percentileN` |
| Auto Stop | `autostop`、`autoStopMin` |
| Auto Start | `autostart=1|true` |
| Language | `lang=zh|en` |
| Chart | `mode=live|percentile` |
| Export | `export=json,csv,png|all` |
Endpoint、Fallback、Download URL、Stress 與 Webhook 不接受 Query String 覆寫，必須由使用者在進階設定中手動配置。所有網路目的地只接受 HTTPS；數值會由 `validateSettings()` clamp 至允許範圍。

## 8. 測試與驗收

### 8.1 現有自動測試

以瀏覽器開啟 `tests.html`，目前測試涵蓋：

- Percentile 空陣列、單筆及線性插值
- MAD 常數與離群值
- Wilson 0/0、零失敗及全失敗
- Metric score 邊界
- 固定及 Adaptive spike
- Warm-up／Timeout 統計分類
- Rating 解鎖及 Loss bottleneck cap
- HTTPS-only URL 驗證、automation 目的地封鎖、clamp、autostart 及 multiple export parsing
- 最後 30 秒測速階段的 02:30／03:00 邊界
- OS／Browser、Cloudflare trace 與 IPv4／IPv6 純解析
- 測速暖機排除、分段中位數及 aggregate fallback
- 固定時間輸入的報告編號

目前執行結果為：`PASS 16/16`。

本次 UI 回歸另以 Chrome 驗證 1920 × 768 與 1366 × 650：一般模式均為白色背景、主要區塊左右邊界一致，1366 × 650 可在首屏完整顯示而不需捲動。

模組化後 Edge 152、1366 × 650 可正常載入主畫面，執行後 DOM 無 SyntaxError／ReferenceError。

Playwright `e2e/netpulse.spec.mjs` 另驗證：`tests.html` 全數通過、1366 × 650 首屏無捲動、縮時完整診斷自動完成、畫面取得對外出口 IP、Tooltip 正確，且 IT 報告包含對外出口 IP／測速方法／下載端點。縮時常數只由 `page.addInitScript()` 注入 `globalThis.__NETPULSE_TEST_CONFIG__`，不接受 URL 參數，也不改變正式三分鐘常數。

### 8.2 已完成的瀏覽器 Smoke Test

- Edge 桌機版初始載入。
- URL autostart，以 200 ms interval 收集 30 samples。
- 達 30 samples 後自動 Pause。
- Live chart、Percentile、Wilson、Grade 與 Log 更新。
- 先建立 Idle baseline，再啟動 2-flow Stress。
- Buffer delta 與 MB/s 顯示。
- Stress 停止後 flow count 歸零。
- 完整頁面 PNG 匯出成功。
- 680 px 以下 responsive layout 檢查。

### 8.3 發版前仍應人工驗證

每次正式發版至少檢查：

1. Chrome／Edge 桌機。
2. iOS Safari。
3. Android Chrome。
4. Primary／Fallback 都不可達時的雙向 Failover。
5. 可控測試 URL 的 Timeout。
6. JSON、CSV、PNG 實際下載內容。
7. 可控 Webhook 的 2xx、4xx、5xx 與 CORS 行為。
8. Stress 達 100 MB 上限後不會自行重啟。
9. 未連線第三方腳本 CDN 時仍可 Probe、統計及匯出 PNG。
10. 長時間執行時 Samples、Log 與記憶體沒有無限制成長。

## 9. 部署

整個 `NetPulse_Consumer` 儲存庫可直接部署到 GitHub Pages、Nginx、Apache、Cloudflare Pages 或其他靜態 Hosting。

部署時至少包含：

```text
index.html
styles.css
app.mjs
core.mjs
device-info.mjs
speed-test.mjs
report.mjs
```

建議一併部署 `README.md` 與 `tests.html`，但若不希望正式站暴露測試頁，可以在部署流程排除 `tests.html`。

伺服器注意事項：

- `.mjs` 應回傳 JavaScript MIME type，例如 `text/javascript` 或 `application/javascript`。
- 使用 HTTPS。
- 不要加入會快取 Probe 回應的 Service Worker，除非已確認不影響延遲測量。
- HTML 已包含基本 CSP；正式站仍應用 HTTP header 設定 CSP、`frame-ancestors`、HSTS 與其他安全標頭。

## 10. 版本與發版流程

版本唯一來源位於：

```js
// core.mjs
export const VERSION = '1.0.4';
```

頁首、JSON 報告及 PNG 報告都會讀取此常數。發版時：

1. 更新 `core.mjs` 的 `VERSION`。
2. 執行 `tests.html`，確認 `PASS 16/16`。
3. 在有 Node.js 的環境執行 `npm ci` 與 `npm test`。
4. 完成第 8.3 節 Smoke Test。
5. 檢查 README 與本手冊是否需要同步。
6. 以 `git diff --check` 檢查後提交並推送；GitHub Actions 必須通過。

### 10.1 2026-09-10 部署紀錄（歷史，IP 行為已由 10.3 取代）

- 功能基準提交：`d8ed28a`（設備 IP 取代 Public IP）。
- 遠端分支：`main`。
- Pages 驗證：首頁、`app.mjs` 與設備 IP 欄位均已更新。
- 回歸結果：核心測試 `PASS 10/10`；Edge 152、1366 × 650 載入與首屏版面正常。

### 10.2 2026-09-11 改善紀錄（當時基於設備 IP）

- 發布版本：`v1.0.2`。
- 本機 `NetPulse_Consumer` 已直接初始化為獨立 Git 工作目錄，`main` 追蹤 `origin/main`；後續不再以暫存 clone 搬運檔案。
- `device-info.mjs`、`speed-test.mjs`、`report.mjs` 已從 `app.mjs` 拆出；設備 IP 的產品行為沒有擴充或改變。
- 測速排除前 2 秒暖機，合併兩條 flow 至一秒時間桶並取完整時間桶的 Mbps 中位數；不足時回退 aggregate，報告記錄方法、區段數與端點。
- 瀏覽器單元測試：`PASS 13/13`。
- Node 24 LTS 語法檢查：`app.mjs`、三個新模組及 Playwright spec 全數通過。
- Playwright E2E：`2 passed`，包含瀏覽器測試頁與縮時完整 Consumer 流程。
- `.github/workflows/ci.yml` 會在 `main` push／pull request 使用 `npm ci` 與 Chromium 執行測試。

### 10.3 2026-09-11 出口 IP 調整

- 發布版本：`v1.0.3`。
- 需求由設備內網 IP 改為對外出口 IP；移除 WebRTC host candidate 偵測。
- 畫面使用 `IP` 標籤與對外出口 Tooltip，IT／JSON 報告使用明確的 `publicIp` 命名。
- Cloudflare Trace 為主要來源，AWS Check IP 為備援；例如公司網路可能顯示 `59.125.x.x`。
- 瀏覽器單元測試：`PASS 14/14`；Playwright E2E：`2 passed`，包含出口 IP、Tooltip、首屏與 IT 報告驗證。

### 10.4 2026-09-11 即時曲線可讀性與範圍修正

- 發布版本：`v1.0.4`。
- Live 圖加入實際時間軸、毫秒軸標題、Active Endpoint、可見區間摘要與滑鼠／觸控 Tooltip。
- Jitter 圖例依使用者需求簡化為「抖動」；底層數值仍沿用 EWMA 計算。暖機樣本保留內部排除邏輯，但取消圖例、灰色標記及 Tooltip 狀態。
- 新增自適應 Y 軸刻度與 headroom；小幅延遲不再被固定 100 ms 級距壓縮，尖峰也不會貼齊圖表頂端。
- 圖表明示最近 60 秒與上方 `percentileN` 評分視窗的差異；Percentile 圖改為只使用最近 `percentileN` 筆有效樣本。
- `calculateChartScale()` 已拆為純函數並加入低延遲、中延遲與尖峰尺度測試；Playwright 覆蓋端點、範圍摘要、有效樣本及 Tooltip。
- 修正固定 60 秒 X 軸造成初期樣本擠在右側的問題：未滿 60 秒動態展開，滿 60 秒後滑動；延遲線加入小型取樣點。`calculateLiveChartRange()` 已加入早期展開、60 秒上限及空資料測試。
- Consumer 一般模式現在一律鎖定 Live：初始化時忽略 LocalStorage／URL 中殘留的 Percentile 狀態，`setChartMode()` 只允許進階模式切換 Percentile，離開進階模式立即回到 Live 並保存。Playwright 會預載 Percentile 舊設定並驗證載入與退出進階模式後都維持即時曲線。

## 11. 已知限制與風險

- Browser `no-cors` Probe 只能觀察請求是否完成或被瀏覽器拒絕，無法提供 ICMP 或封包層資訊。
- 不同瀏覽器、CORS、DNS、VPN、代理伺服器及省電策略可能影響結果。
- IP 顯示外部服務觀察到的出口位址；NAT、VPN、Proxy 或公司防火牆會影響結果，不能用來判定設備內網位址。
- IP／Colo／Location 優先仰賴 Cloudflare trace，只有 IP 具 AWS fallback；全部失敗時顯示 `—`，不影響主要檢測流程。
- Webhook 服務必須允許來源站的 CORS，否則瀏覽器會阻擋回應。
- PNG 不依賴第三方腳本；完整頁面擷取失敗時會輸出本地摘要 PNG。
- Event Log 目前主要使用英文事件字串；若要求完整中英文即時切換，應將事件改為 event key，render 時再查 i18n 字典。
- Playwright 已覆蓋主要 Consumer happy path，但 Failover、Webhook、各匯出格式及 Stress 100 MB 邊界仍需擴充。
- GitHub Actions 已建立；尚未完成 iOS／Android 實機相容性矩陣及正式 UAT 紀錄。

## 12. 建議後續工作

依優先順序建議：

1. 將 Event Log 改為 i18n event key，完成 Log 的中英文同步。
2. 繼續將 `app.mjs` 的 probe、chart、export 與 i18n 拆為獨立模組。
3. 擴充 Playwright E2E，覆蓋 Pause、Reset、Failover、Webhook、Auto Stop、Export 與 100 MB 邊界。
4. 加入可控的測試 endpoints，以可靠模擬 timeout、failed 和 slow response。
5. 完成 iOS Safari 與 Android Chrome 實機 smoke test。
6. 建立正式站 CSP header、隱私聲明與 UAT 紀錄。

## 13. 常見問題排查

### 頁面空白或 Module 載入失敗

- 確認不是直接以 `file://` 開啟。
- 確認 Server 對 `.mjs` 回傳正確 JavaScript MIME type。
- 查看瀏覽器 Console 是否有 404 或 CORS 錯誤。

### 所有 Probe 都 Failed

- 確認頁面與 Endpoint 都使用 HTTPS。
- 先測試預設 Primary／Fallback。
- 檢查 VPN、Proxy、瀏覽器 extension 或企業安全政策。
- 確認 URL 未被 CSP `connect-src` 阻擋。

### Stress 無法啟動或立即停止

- 系統會先等待至少 5 筆 Idle samples，這是預期行為。
- 確認 Download URL 支援瀏覽器跨來源下載與串流讀取。
- 查看 Event Log 是否有 CORS、HTTP 或 Network Error。

### Grade 長時間顯示「—」

- `Percentile N <= 100` 需要至少 30 samples。
- `Percentile N > 100` 需要至少 60 samples。
- 只有失敗 samples 時無法產生延遲統計。

### PNG 只有摘要內容

- 表示完整頁面擷取器不可用或被 CSP／瀏覽器限制。
- 查看 Event Log 中的完整頁面擷取錯誤；常見原因是瀏覽器不支援 SVG `foreignObject` 或 CSP 限制 Blob image。
- 摘要 PNG 是預期的安全降級結果，不影響 JSON／CSV。

## 14. 交接檢核表

- [ ] 接手者能以靜態 HTTP Server 開啟主頁。
- [ ] `tests.html` 全數通過。
- [ ] 接手者理解 HTTPS Probe 不等於 ICMP Ping。
- [ ] 接手者知道版本只在 `core.mjs` 維護。
- [ ] 接手者能說明 Pause 與 Reset 的差異。
- [ ] 接手者能說明 Failover 與 Stress 的生命週期。
- [ ] 接手者能產生 JSON、CSV 與 PNG。
- [ ] 接手者知道 Webhook 與 Download URL 的 CORS 限制。
- [ ] 接手者已閱讀「已知限制與風險」。
- [ ] 正式發版前已完成跨瀏覽器 Smoke Test。
