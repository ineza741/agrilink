import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5173';
const SHOTS = path.join(process.cwd(), 'e2e-test', 'screenshots', 'market-officer-final');
fs.mkdirSync(SHOTS, { recursive: true });

const marketOfficer = { email: 'market@agrisupport.rw', password: 'Market@123' };
const farmer = { email: 'farmer@agrisupport.rw', password: 'Farmer@123' };
const pendingOfficer = { email: `pending.mo.${Date.now()}@agrisupport.rw`, phone: `+250788${String(Date.now()).slice(-6)}`, password: 'Market@123' };

const results = {
  screenshots: [],
  passed: [],
  failed: [],
  consoleErrors: [],
  notes: [],
};

function pass(message) { results.passed.push(message); console.log('PASS:', message); }
function fail(message) { results.failed.push(message); console.log('FAIL:', message); }
async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push(file);
}

async function clearStorage(page) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
}

async function login(page, roleLabel, credentials) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('button.role-option', { hasText: roleLabel }).click();
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
}

async function registerPendingOfficer(page) {
  await page.goto(`${BASE}/register?role=market-officer`, { waitUntil: 'networkidle' });
  await page.locator('input[name="fullName"]').fill('Pending Market Officer');
  await page.locator('input[name="email"]').fill(pendingOfficer.email);
  await page.locator('input[name="phone"]').fill(pendingOfficer.phone);
  await page.locator('input[name="marketName"]').fill('Pending Test Market');
  await page.locator('input[name="district"]').fill('Kicukiro District');
  await page.locator('input[name="sector"]').fill('Gatenga Sector');
  await page.locator('input[name="password"]').fill(pendingOfficer.password);
  await page.locator('input[name="confirmPassword"]').fill(pendingOfficer.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => results.consoleErrors.push(String(err)));

  try {
    await clearStorage(page);
    await login(page, 'Market Officer', marketOfficer);
    await shot(page, '01-dashboard');

    if (page.url().includes('/market-officer/dashboard')) pass('Approved Market Officer lands on dashboard after login.');
    else fail(`Expected dashboard after login, got ${page.url()}`);

    const sidebarTexts = await page.locator('aside nav a span').allTextContents();
    const expectedSidebar = ['Dashboard', 'Crop Prices', 'Profile'];
    const removedSidebar = ['Price History', 'Market Reports', 'Notifications', 'Settings', 'Support'];
    if (JSON.stringify(sidebarTexts) === JSON.stringify(expectedSidebar)) pass('Sidebar shows only Dashboard, Crop Prices, and Profile for Market Officer.');
    else fail(`Sidebar items were ${JSON.stringify(sidebarTexts)}`);
    for (const label of removedSidebar) {
      if (sidebarTexts.includes(label)) fail(`Sidebar still shows removed item: ${label}`);
    }

    const cardsText = await page.locator('.prototype-stat-card').allTextContents();
    if (cardsText.length === 4) pass('Dashboard summary cards render.');
    else fail('Dashboard summary cards did not render as expected.');

    await page.goto(`${BASE}/market-officer/prices`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await shot(page, '02-crop-prices');

    if (page.url().includes('/market-officer/prices')) pass('Crop Prices route opens from sidebar.');
    else fail(`Expected /market-officer/prices, got ${page.url()}`);

    const tableRowsBeforeSearch = await page.locator('tbody tr').count();
    if (tableRowsBeforeSearch > 0) pass('Crop Prices table loaded backend rows.');
    else fail('Crop Prices table did not load any rows.');

    await page.locator('input[placeholder="Search crop, market, or district"]').fill('Wheat');
    await page.waitForTimeout(400);
    const wheatRow = page.locator('tbody tr').filter({ hasText: 'Wheat' }).filter({ hasText: 'Wholesale' }).first();
    const wheatExists = await wheatRow.count();
    if (wheatExists) pass('Search for Wheat returns a matching price row.');
    else fail('Search for Wheat did not return the expected row.');

    const currentValueText = (await wheatRow.locator('td').nth(4).textContent()).trim();
    const currentValue = Number(currentValueText.replace(/[^0-9.]/g, ''));
    const updatedValue = currentValue + 25;

    await wheatRow.getByRole('button', { name: 'Edit Price' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[type="number"]').fill(String(updatedValue));
    await page.locator('input[placeholder="Why is this price changing?"]').fill('Routine official market adjustment');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    await shot(page, '03-price-saved');

    const toastText = await page.locator('[data-sonner-toast]').last().textContent().catch(() => '');
    if ((toastText || '').toLowerCase().includes('updated')) pass('Success toast appears after saving crop price.');
    else fail('Expected a success toast after saving crop price.');

    const refreshedWheatRow = page.locator('tbody tr').filter({ hasText: 'Wheat' }).filter({ hasText: 'Wholesale' }).first();
    const updatedCellText = (await refreshedWheatRow.locator('td').nth(4).textContent()).trim();
    if (updatedCellText.includes(updatedValue.toLocaleString())) pass('Updated Wheat price appears immediately in the table.');
    else fail(`Expected updated price ${updatedValue}, saw ${updatedCellText}`);

    await refreshedWheatRow.getByRole('button', { name: 'View Details' }).click();
    await page.waitForTimeout(400);
    await shot(page, '04-price-history');
    const detailsText = await page.locator('body').textContent();
    if (detailsText.includes(String(currentValue)) || detailsText.includes(currentValue.toLocaleString())) pass('Price details show the previous Wheat price.');
    else fail('Price details did not show the previous Wheat price.');
    if (detailsText.includes(String(updatedValue)) || detailsText.includes(updatedValue.toLocaleString())) pass('Price details show the new Wheat price.');
    else fail('Price details did not show the new Wheat price.');
    await page.locator('button[aria-label="Close details"]').click();

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const persistedWheatRow = page.locator('tbody tr').filter({ hasText: 'Wheat' }).filter({ hasText: 'Wholesale' }).first();
    const persistedText = (await persistedWheatRow.locator('td').nth(4).textContent()).trim();
    if (persistedText.includes(updatedValue.toLocaleString())) pass('Updated Wheat price persists after browser refresh.');
    else fail('Updated Wheat price did not persist after browser refresh.');

    await page.goto(`${BASE}/market-officer/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, '05-profile');

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    const phoneInput = page.locator('label:has-text("Phone")').locator('..').locator('input');
    const originalPhone = await phoneInput.inputValue();
    const newPhone = originalPhone.endsWith('5') ? originalPhone.slice(0, -1) + '6' : originalPhone.slice(0, -1) + '5';
    await phoneInput.fill(newPhone);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '06-profile-saved');

    const profileToast = await page.locator('[data-sonner-toast]').last().textContent().catch(() => '');
    if ((profileToast || '').toLowerCase().includes('profile updated')) pass('Profile success toast appears after save.');
    else fail('Expected profile success toast after saving.');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const refreshedPhone = await page.locator('body').textContent();
    if (refreshedPhone.includes(newPhone)) pass('Profile update persists after refresh.');
    else fail('Profile update did not persist after refresh.');

    await clearStorage(page);
    await login(page, 'Farmer', farmer);
    await page.goto(`${BASE}/market-officer/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    if (!page.url().includes('/market-officer/dashboard')) pass('Farmer cannot stay on Market Officer dashboard route.');
    else fail('Farmer was able to access Market Officer dashboard route.');

    await clearStorage(page);
    await login(page, 'Market Officer', marketOfficer);
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    if (!page.url().includes('/admin')) pass('Approved Market Officer cannot stay on admin-only route.');
    else fail('Approved Market Officer was able to access /admin.');

    await clearStorage(page);
    await registerPendingOfficer(page);
    await clearStorage(page);
    await login(page, 'Market Officer', pendingOfficer);
    const loginPageText = await page.locator('body').textContent();
    const loginErrorText = await page.locator('.form-error').textContent().catch(() => '');
    const combinedLoginText = `${loginPageText} ${loginErrorText}`;
    if (page.url().includes('/login') && /awaiting administrator approval|not approved|access denied/i.test(combinedLoginText)) {
      pass('Pending Market Officer is blocked from accessing protected Market Officer screens.');
    } else {
      fail(`Pending Market Officer login was not blocked as expected. URL: ${page.url()}`);
    }

    await shot(page, '07-pending-blocked');
  } catch (error) {
    fail(`Verification script crashed: ${error.message}`);
    await shot(page, '99-crash');
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(SHOTS, 'result.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.failed.length ? 1 : 0);
  }
})();
