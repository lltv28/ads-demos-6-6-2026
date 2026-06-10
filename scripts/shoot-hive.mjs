// Screenshot sweep of the /hive/* stages for review. Run with the dev server up:
//   npm run dev   (separate terminal)
//   node scripts/shoot-hive.mjs
import { chromium } from 'file:///C:/Users/lucas/AppData/Roaming/npm/node_modules/expect-cli/node_modules/playwright/index.mjs';

const OUT = 'C:/tmp/hive-review';
const BASE = 'http://localhost:3000';
const shots = [
  { name: 'hive-index', url: '/hive', w: 1280, h: 800, wait: 2000 },
  { name: 'orbit', url: '/hive/orbit', w: 1920, h: 1080, wait: 14000 },
  { name: 'global', url: '/hive/global', w: 1920, h: 1080, wait: 14000 },
  { name: 'throttle-early', url: '/hive/throttle', w: 1920, h: 1080, wait: 4000 },
  { name: 'mission-control', url: '/hive/mission-control', w: 1920, h: 1080, wait: 14000 },
  { name: 'assembly', url: '/hive/assembly', w: 1920, h: 1080, wait: 14000 },
  { name: 'switchboard', url: '/hive/switchboard', w: 1080, h: 1920, wait: 14000 },
];

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(BASE + s.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(s.wait);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(`OK ${s.name}${errors.length ? ` — ERRORS: ${[...new Set(errors)].slice(0, 3).join(' | ').slice(0, 400)}` : ''}`);
  // Throttle gets a second shot ≥10s later to prove the dial moved and tiles grew.
  if (s.name === 'throttle-early') {
    await page.waitForTimeout(11000);
    await page.screenshot({ path: `${OUT}/throttle-late.png` });
    console.log('OK throttle-late');
  }
  await page.close();
}
await browser.close();
console.log('done');
