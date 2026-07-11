import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const testEmail = `testmo_${Date.now()}@agrisupport.rw`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const networkLogs = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/')) {
      let body = null;
      try { body = await response.text(); } catch {}
      networkLogs.push({ url: response.url(), status: response.status(), body: body?.substring(0, 500) });
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[console.error] ${msg.text()}`);
  });

  try {
    // Go to MO registration
    await page.goto(`${BASE}/register?role=market-officer`, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('1. Registration page loaded');

    // Fill the form with unique email
    await page.locator('input[name="fullName"]').fill('Test Market Officer');
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="phone"]').fill(`+25078${String(Date.now()).slice(-7)}`);
    await page.locator('input[name="marketName"]').fill('Test Market');
    await page.locator('input[name="district"]').fill('Kicukiro');
    await page.locator('input[name="sector"]').fill('Gatenga');
    await page.locator('input[name="password"]').fill('Market@123');
    await page.locator('input[name="confirmPassword"]').fill('Market@123');
    console.log(`2. Form filled with email: ${testEmail}`);

    // Click submit
    await page.locator('button[type="submit"]').click();
    console.log('3. Submit clicked');

    // Wait for response
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e-test/screenshots/mo-register-fresh.png', fullPage: true });

    console.log('4. Final URL:', page.url());
    const body = await page.textContent('body');
    if (body.includes('Registration submitted') || body.includes('awaiting') || body.includes('approval')) {
      console.log('5. SUCCESS: Registration submitted');
    }
    const formError = await page.locator('.form-error').textContent().catch(() => null);
    if (formError) console.log('6. Form error:', formError);

    // Print network logs
    console.log('\n--- Network Logs ---');
    networkLogs.forEach(log => {
      console.log(`  ${log.status} ${log.url}`);
      if (log.body) console.log(`    Body: ${log.body}`);
    });

    // Now verify in database via API
    console.log('\n--- Verify in DB ---');
    const adminLogin = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@agrisupport.rw', password: 'Admin@123' }),
    });
    const adminData = await adminLogin.json();
    const adminToken = adminData.data.token;

    // List pending MO applications
    const moList = await fetch('http://localhost:5001/api/admin/market-officers/pending', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const moData = await moList.json();
    console.log('Pending MO count:', moData.data?.length || moData.data?.officers?.length || 'unknown');
    console.log('Pending MO data:', JSON.stringify(moData.data).substring(0, 300));

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
