// Screenshot sweep of the Sales Brain. Dev server up first: npm run dev
import { chromium } from 'file:///C:/Users/lucas/AppData/Roaming/npm/node_modules/expect-cli/node_modules/playwright/index.mjs';
const OUT = 'C:/tmp/brain-review';
const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function shot(name, url, wait) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`OK ${name}${errs.length ? ' — ERRORS: ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''}`);
  await page.close();
}

await shot('graph', '/brain', 4000);
await shot('attract-early', '/brain?attract=1', 4000);
await shot('attract-late', '/brain?attract=1', 14000);
await browser.close();
console.log('done');
