import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const OUT_DIR = path.join(process.cwd(), 'e2e-test', 'screenshots', 'market-price-sync');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function clearStorage(page) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

async function login(page, roleLabel, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('button.role-option', { hasText: roleLabel }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const result = { passed: [], failed: [], screenshots: [] };
  const pass = (msg) => { result.passed.push(msg); console.log('PASS:', msg); };
  const fail = (msg) => { result.failed.push(msg); console.log('FAIL:', msg); };

  try {
    await clearStorage(page);
    await login(page, 'Market Officer', 'market@agrisupport.rw', 'Market@123');
    await page.goto(`${BASE}/market-officer/prices`, { waitUntil: 'networkidle' });
    await page.locator('input[placeholder="Search crop, market, or district"]').fill('Beans');
    await page.waitForTimeout(400);
    const targetRow = page.locator('tbody tr').filter({ hasText: 'Beans' }).filter({ hasText: 'Zinia Market' }).filter({ hasText: 'Wholesale' }).first();
    if (await targetRow.count()) pass('Found Beans / Zinia Market / Wholesale row in Crop Prices.');
    else fail('Could not find Beans / Zinia Market / Wholesale row.');

    await targetRow.getByRole('button', { name: 'Edit Price' }).click();
    await page.locator('input[type="number"]').fill('500');
    await page.locator('input[placeholder="Why is this price changing?"]').fill('Farmer market sync verification');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '01-market-officer-price-500');
    result.screenshots.push(path.join(OUT_DIR, '01-market-officer-price-500.png'));

    const updatedRow = page.locator('tbody tr').filter({ hasText: 'Beans' }).filter({ hasText: 'Zinia Market' }).filter({ hasText: 'Wholesale' }).first();
    const priceCell = await updatedRow.locator('td').nth(4).textContent();
    if ((priceCell || '').includes('500')) pass('Market Officer Crop Prices shows Beans at Zinia Market as RWF 500.');
    else fail(`Expected Crop Prices to show 500, saw ${priceCell}`);

    await clearStorage(page);
    await login(page, 'Farmer', 'farmer@agrisupport.rw', 'Farmer@123');
    await page.goto(`${BASE}/market-intelligence`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await page.locator('select').nth(1).selectOption('Beans');
    await page.waitForTimeout(400);
    await page.locator('select').nth(2).selectOption('Zinia Market');
    await page.waitForTimeout(400);
    await page.locator('select').nth(3).selectOption('Wholesale');
    await page.waitForTimeout(1200);
    await shot(page, '02-farmer-market-page');
    result.screenshots.push(path.join(OUT_DIR, '02-farmer-market-page.png'));

    const bodyText = await page.locator('body').textContent();
    if ((bodyText || '').includes('Current Official Price')) pass('Farmer Market Intelligence shows the official price section.');
    else fail('Farmer Market Intelligence did not render the official price section.');

    if ((bodyText || '').includes('RWF 500')) pass('Farmer Market Intelligence shows RWF 500 after Market Officer update.');
    else fail('Farmer Market Intelligence did not show RWF 500.');

    if (!/demo market data|No backend market analysis found yet|Showing demo/i.test(bodyText || '')) pass('Farmer Market Intelligence no longer shows demo-data messaging.');
    else fail('Farmer Market Intelligence still shows demo-data messaging.');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const refreshedText = await page.locator('body').textContent();
    if ((refreshedText || '').includes('RWF 500')) pass('Farmer Market Intelligence still shows RWF 500 after refresh.');
    else fail('Farmer Market Intelligence lost the official RWF 500 value after refresh.');
  } catch (error) {
    fail(`Sync verification crashed: ${error.message}`);
    await shot(page, '99-crash');
    result.screenshots.push(path.join(OUT_DIR, '99-crash.png'));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT_DIR, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.failed.length ? 1 : 0);
  }
})();
