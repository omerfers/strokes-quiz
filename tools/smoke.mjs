import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromPanel = createRequire(join(ROOT, 'omer-strokesquiz-panel', 'package.json'));
const { chromium } = requireFromPanel('@playwright/test');
const BASE = process.env.GRAFANA_URL ?? 'http://localhost:3000';
const OUT = join(ROOT, 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });
const catalog = JSON.parse(readFileSync(join(ROOT, 'omer-strokesquiz-panel', 'src', 'catalog.json'), 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1680, height: 940 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));
const login = await context.request.post(`${BASE}/login`, {
  data: { user: 'admin', password: 'admin' },
});
if (!login.ok()) {
  throw new Error(`login failed: ${login.status()} ${await login.text()}`);
}
await page.goto(`${BASE}/d/strokes-quiz/?kiosk&hideLogo=1`, { waitUntil: 'domcontentloaded' });
const panel = page.locator('[data-testid="strokes-quiz-panel"]');
await panel.waitFor({ timeout: 30000 });
const credit = (
  await panel
    .getByText(/Developed by/i)
    .first()
    .textContent()
)?.trim();
console.log('credit line      :', credit);
const catalogStatus = (await panel.getByTestId('strokes-catalog-status').textContent())?.replace(/\s+/g, ' ').trim();
console.log('catalog status   :', catalogStatus);
const attribution = page
  .locator('[data-testid^="text-panel-"]')
  .filter({ hasText: /Powered by/i })
  .first();
const attributionVisible = await attribution.isVisible();
const attributionText = (await attribution.innerText()).replace(/\s+/g, ' ').trim();
const logoLoaded = await attribution
  .locator('img')
  .evaluate((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)
  .catch(() => false);
const stickyFooter = await page.locator('[data-testid="public-dashboard-footer"]').count();
console.log('attribution      :', attributionText, '| logo:', logoLoaded, '| sticky footer:', stickyFooter);
const audioRequests = () =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => /\.(wav|mp3|m4a|ogg)(\?|$)/.test(name))
  );
await panel.getByRole('button', { name: /Start the quiz/i }).click();
await page.waitForTimeout(1200);
await panel.getByTestId('strokes-audio-toggle').click();
const pauseLabel = (await panel.getByTestId('strokes-audio-toggle').textContent())?.trim();
const canResume = (await panel.getByRole('button', { name: /Resume clip/i }).count()) === 1;
if (canResume) {
  await panel.getByTestId('strokes-audio-toggle').click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: join(OUT, '01-playing.png') });
console.log('pause button     :', pauseLabel);
const clips = await audioRequests();
console.log('audio requested  :', clips.length ? `${clips.length} clip(s)` : 'none');
await panel.getByRole('button', { name: /Reveal answer/i }).click();
await page.waitForTimeout(1200);
const firstTitle = (await panel.locator('[data-testid="strokes-song-title"]').textContent())?.trim();
const artVisible = await panel.locator('[data-testid="strokes-album-art"]').isVisible();
await page.screenshot({ path: join(OUT, '02-reveal.png') });
console.log('revealed title   :', firstTitle);
console.log('album art visible:', artVisible);
await panel.getByRole('button', { name: /Next song/i }).click();
await page.waitForTimeout(800);
let solved = false;
for (const song of catalog) {
  await panel.getByLabel('Song title').fill(song.title);
  await panel.getByRole('button', { name: /^Guess$/ }).click();
  await page.waitForTimeout(120);
  if ((await panel.getByText(/Correct \+1/).count()) > 0) {
    solved = true;
    break;
  }
}
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '03-correct.png') });
const score = (await panel.locator('[data-testid="strokes-score"]').textContent())?.replace(/\s+/g, ' ').trim();
console.log('correct guess    :', solved);
console.log('score pill       :', score);
console.log('console errors   :', consoleErrors.length ? consoleErrors : 'none');
const kioskPage = await context.newPage();
await kioskPage.goto(`${BASE}/d/strokes-quiz/?kiosk`, { waitUntil: 'domcontentloaded' });
await kioskPage.locator('[data-testid="strokes-quiz-panel"]').waitFor({ timeout: 30000 });
await kioskPage.waitForTimeout(1000);
const kioskFooterVisible = await kioskPage
  .locator('[data-testid="public-dashboard-footer"]')
  .isVisible()
  .catch(() => false);
console.log('plain kiosk bar  :', kioskFooterVisible ? 'visible' : 'hidden');
await kioskPage.close();
await browser.close();
const failures = [];
if (!credit || !/Ömer Faruk Ersakay/.test(credit)) {
  failures.push('student name is not visible in the panel footer');
}
if (!firstTitle || !artVisible) {
  failures.push('reveal did not render title + album art');
}
if (!catalogStatus || !catalogStatus.includes(`${catalog.length}/${catalog.length}`)) {
  failures.push(`footer does not show full audio coverage: ${catalogStatus}`);
}
if (!attributionVisible || !/Powered by/i.test(attributionText) || !logoLoaded) {
  failures.push('the Powered by Grafana line above the catalog is missing');
}
if (stickyFooter > 0) {
  failures.push('the sticky Grafana footer is still visible');
}
if (kioskFooterVisible) {
  failures.push('the sticky Grafana footer shows up without hideLogo');
}
if (!canResume) {
  failures.push('pause/resume button did not work');
}
if (clips.length === 0) {
  failures.push('no audio clip was requested by the page');
}
if (!solved) {
  failures.push('a correct guess never scored');
}
if (!score || !/1\s*\/\s*\d+/.test(score)) {
  failures.push(`unexpected score pill: ${score}`);
}
if (consoleErrors.length) {
  failures.push(`console errors: ${consoleErrors.join(' | ')}`);
}
if (failures.length) {
  console.error('\nFAIL:');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('\nOK — plugin loads, name visible, audio plays, correct guess scores.');
