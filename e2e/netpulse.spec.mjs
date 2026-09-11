import { expect, test } from '@playwright/test';

test('browser unit suite passes', async ({ page }) => {
  await page.goto('/tests.html');
  await expect(page.locator('#result')).toHaveAttribute('data-status', 'passed');
  await expect(page.locator('#result')).toContainText('PASS 16/16');
});

test('consumer quick check completes and creates an IT report', async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__NETPULSE_TEST_CONFIG__ = { quickTestMs: 2400, speedPhaseMs: 800 };
    localStorage.setItem('netpulse-consumer-settings-v1', JSON.stringify({ chartMode: 'percentile' }));
  });
  await page.route('https://www.cloudflare.com/cdn-cgi/trace*', (route) => route.fulfill({
    status: 200,
    contentType: 'text/plain',
    headers: { 'access-control-allow-origin': '*' },
    body: 'ip=203.0.113.25\ncolo=TPE\nloc=TW\n',
  }));
  await page.route(/https:\/\/(checkip\.amazonaws\.com|one\.one\.one\.one)\/.*/, (route) => route.fulfill({
    status: 200,
    contentType: 'text/plain',
    body: 'ok',
  }));
  await page.route('https://speed.cloudflare.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: Buffer.alloc(1_000_000) });
  });

  await page.setViewportSize({ width: 1366, height: 650 });
  await page.goto('/index.html');
  await expect(page.locator('[data-chart="live"]')).toHaveClass(/active/);
  await expect(page.locator('[data-chart="percentile"]')).not.toHaveClass(/active/);
  await expect(page.locator('#public-ip')).toHaveText('203.0.113.25');
  await expect(page.locator('#public-ip')).toHaveAttribute('title', '您的對外連線出口 IP 位址');
  await expect(page.locator('.ip-info')).toHaveAttribute('data-tooltip', '您的對外連線出口 IP 位址');
  await page.locator('#public-ip').hover();
  await expect.poll(() => page.locator('.ip-info').evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('1');
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBeTruthy();
  await page.locator('#start-button').click();
  await page.locator('#chart-toggle').click();
  await expect(page.locator('#chart-target')).toContainText('checkip.amazonaws.com');
  await expect(page.locator('#chart-scope')).toContainText('最多 60 秒');
  await expect(page.locator('.chart-legend')).toContainText('抖動');
  await expect(page.locator('.chart-legend')).not.toContainText('暖機');
  await expect(page.locator('#chart-samples')).not.toHaveText('0');
  await expect.poll(() => page.locator('#chart').getAttribute('data-point-count').then(Number)).toBeGreaterThan(1);
  await expect.poll(() => page.locator('#chart').getAttribute('data-range-seconds').then(Number)).toBeLessThan(60);
  const chartBox = await page.locator('#chart').boundingBox();
  await page.mouse.move(chartBox.x + chartBox.width - 18, chartBox.y + chartBox.height / 2);
  await expect(page.locator('#chart-tooltip')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#chart-tooltip')).toContainText('延遲');
  await page.locator('#advanced-button').click();
  await page.locator('[data-chart="percentile"]').click();
  await expect(page.locator('[data-chart="percentile"]')).toHaveClass(/active/);
  await page.locator('#advanced-button').click();
  await expect(page.locator('[data-chart="live"]')).toHaveClass(/active/);
  await expect(page.locator('#chart-scope')).not.toContainText('評分樣本');
  await expect(page.locator('#report-dialog')).toHaveAttribute('open', '', { timeout: 10_000 });
  const report = page.locator('#text-report');
  await expect(report).toContainText('對外出口 IP：203.0.113.25');
  await expect(report).toContainText('測速方法：');
  await expect(report).toContainText('下載端點：speed.cloudflare.com');
  await expect(report).not.toContainText('設備 IP');
});
