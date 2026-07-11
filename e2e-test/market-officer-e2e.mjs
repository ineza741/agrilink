import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e-test', 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE = 'http://localhost:5173';

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function clearAuthAndReload(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function loginAs(page, role, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  const roleBtn = page.locator('button.role-option', { hasText: role });
  await roleBtn.click();
  await page.waitForTimeout(300);

  const emailInput = page.locator('input[name="email"]');
  await emailInput.fill('');
  await emailInput.fill(email);

  const pwInput = page.locator('input[name="password"]');
  await pwInput.fill('');
  await pwInput.fill(password);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(3000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ===== STEP 1: Market Officer Registration Page =====
    console.log('\n=== STEP 1: Market Officer Registration Page ===');
    await page.goto(`${BASE}/register?role=market-officer`, { waitUntil: 'networkidle', timeout: 15000 });
    await screenshot(page, '01-mo-register-page');

    const moTabActive = await page.locator('.role-option.active').textContent();
    console.log(`  Active tab: ${moTabActive.trim()}`);
    console.log(`  Market Officer tab active: ${moTabActive.includes('Market Officer')}`);

    for (const field of ['Full Name', 'Email Address', 'Phone Number', 'Market Name', 'District', 'Sector']) {
      const visible = await page.getByText(field, { exact: false }).first().isVisible();
      console.log(`  Field "${field}": ${visible ? 'OK' : 'MISSING'}`);
    }

    // ===== STEP 2: Farmer Registration Page =====
    console.log('\n=== STEP 2: Farmer Registration Page ===');
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 15000 });
    await screenshot(page, '02-farmer-register-page');
    const farmerTab = await page.locator('.role-option.active').textContent();
    console.log(`  Active tab: ${farmerTab.trim()}`);

    // ===== STEP 3: Market Officer Login =====
    console.log('\n=== STEP 3: Market Officer Login ===');
    await clearAuthAndReload(page);
    await loginAs(page, 'Market Officer', 'market@agrisupport.rw', 'Market@123');
    await screenshot(page, '03-mo-login-result');
    console.log(`  After login URL: ${page.url()}`);
    console.log(`  Logged in: ${!page.url().includes('/login')}`);

    // ===== STEP 4: MO Dashboard (role-based at /dashboard) =====
    console.log('\n=== STEP 4: Market Officer Dashboard ===');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '04-mo-dashboard');
    console.log(`  MO Dashboard URL: ${page.url()}`);
    const dashboardTitle = await page.textContent('h1').catch(() => '');
    console.log(`  Dashboard title: ${dashboardTitle}`);

    // ===== STEP 5: Crop Prices Page =====
    console.log('\n=== STEP 5: Crop Prices Page ===');
    await page.goto(`${BASE}/crop-prices`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '05-crop-prices-page');
    console.log(`  Crop Prices URL: ${page.url()}`);
    const tableVisible = await page.locator('table').first().isVisible().catch(() => false);
    console.log(`  Prices table visible: ${tableVisible}`);

    // ===== STEP 6: Admin Login =====
    console.log('\n=== STEP 6: Admin Login ===');
    await clearAuthAndReload(page);
    await loginAs(page, 'Admin', 'admin@agrisupport.rw', 'Admin@123');
    await screenshot(page, '06-admin-login-result');
    console.log(`  After login URL: ${page.url()}`);
    console.log(`  Logged in: ${!page.url().includes('/login')}`);

    // ===== STEP 7: Admin MO Applications =====
    console.log('\n=== STEP 7: Admin MO Applications ===');
    await page.goto(`${BASE}/market-officer-applications`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '07-admin-mo-applications');
    console.log(`  MO Applications URL: ${page.url()}`);

    // ===== STEP 8: Farmer Login =====
    console.log('\n=== STEP 8: Farmer Login ===');
    await clearAuthAndReload(page);
    await loginAs(page, 'Farmer', 'farmer@agrisupport.rw', 'Farmer@123');
    await screenshot(page, '08-farmer-dashboard');
    console.log(`  After login URL: ${page.url()}`);
    console.log(`  Logged in: ${!page.url().includes('/login')}`);

    // ===== STEP 9: Farmer Market Intelligence =====
    console.log('\n=== STEP 9: Farmer Market Intelligence ===');
    await page.goto(`${BASE}/market-intelligence`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, '09-farmer-market');
    console.log(`  Market Intelligence URL: ${page.url()}`);

    // ===== Summary =====
    console.log('\n=== TEST SUMMARY ===');
    const uniqueErrors = [...new Set(consoleErrors.filter(e => !e.includes('ERR_CONNECTION_REFUSED')))];
    console.log(`Console errors (non-network): ${uniqueErrors.length}`);
    if (uniqueErrors.length > 0) {
      uniqueErrors.slice(0, 5).forEach(e => console.log(`  ERROR: ${e.substring(0, 200)}`));
    }

  } catch (err) {
    console.error('TEST FAILED:', err.message);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
})();
