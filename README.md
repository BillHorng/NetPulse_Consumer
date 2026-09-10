# NetPulse

> 本資料夾為 **NetPulse Consumer Edition**。預設保留完整的裝置與網路環境資訊列，並以精簡圖表搭配白話「重點摘要」呈現品質、穩定度、反應速度與樣本進度；按下「進階資訊」仍可使用完整工程數據、設定與事件紀錄。

一般使用者可直接按下「開始 3 分鐘檢測」。前 2 分 30 秒持續監測網路品質，最後 30 秒自動執行 HTTPS 下載測速與負載延遲檢查。完成後系統會產生可複製或下載的 IT 文字摘要，內容包含下載 Mbps、實際下載量、測速時間與 Bufferbloat；使用者可補充當時症狀，再透過 Helpdesk、Email 或通訊軟體交給 IT。

一般模式採固定三階段導引：「確認環境資訊 → 進行檢測 → 將報告交給 IT」。檢測期間只提供「取消檢測」，完成後才提供「重新檢測」；工程格式匯出、Percentile 切換、分項評分及技術設定均收在進階模式。

Consumer 預設採一頁式白色摘要：桌面版頁首、環境資訊與主內容以 1280 px 最大寬度置中，三張狀態卡等寬排列。完整曲線不佔用首屏，需要時可按「查看即時圖表」在同頁展開，再按一次隱藏。

NetPulse 是一套可部署於靜態網站的瀏覽器式網路品質監測工具。它以 HTTPS `fetch` 測量應用層請求延遲；Probe 失敗／逾時率不等同 ICMP packet loss。

## 執行

請透過任一靜態 HTTP Server 開啟此資料夾，不要直接雙擊 `index.html`。正式部署建議使用 HTTPS。

入口為 `index.html`，不需要安裝套件或執行建置。`tests.html` 是核心演算法的瀏覽器測試頁。

開發、維護、測試與發版流程請參閱 [`HANDOFF.md`](./HANDOFF.md)。

## 功能

- Latency、EWMA Jitter、MAD、P50／P75／P90／P95／P99
- Adaptive spike detection 與 Wilson 95% failure upper bound
- A+／A／B／C／F 動態品質評級與 bottleneck cap
- Primary／Fallback 雙向 failover
- 設備 IP 最佳努力偵測；只接受 WebRTC host candidate，不使用或回報出口 IP
- 一般模式最後 30 秒自動執行 2-flow HTTPS 下載測速與 Bufferbloat delta（單次最多約 100 MB）
- Canvas 即時／百分位圖表，不依賴外部圖表 CDN
- 中英文、一般模式固定白色背景、進階模式可於當次工作階段切換深色，以及 LocalStorage 設定保存
- JSON、CSV、PNG 與 HTTPS Webhook
- Online／Offline、Visibility、Auto Stop 與 URL automation

## URL automation

範例：

```text
?autostart=1&samples=100&export=json,png&lang=zh
```

安全起見，URL automation 只接受 `interval`、`timeout`、`failover`、`samples`、`autostop`、`autostart`、`lang`、`mode` 與 `export`。Endpoint、Download URL、Stress 與 Webhook 必須由使用者在進階設定中手動配置，且所有網路目的地只接受 HTTPS。

## 隱私

頁面會透過瀏覽器 WebRTC host candidate 嘗試取得設備 IP，並連線 Cloudflare 與 AWS 取得 CDN 資訊及執行測試；不會顯示或寫入出口 IP。Chrome 等瀏覽器可能基於隱私政策隱藏設備 IP，此時會顯示「瀏覽器未提供」。測試樣本預設僅保存在目前分頁的記憶體，不會跨重新整理保存；只有使用者在進階設定中手動設定 Webhook 時，完整 JSON 報告才會送往該 HTTPS URL。
