import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  try {
    // Go to login page
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    console.log('1. Login page loaded');
    console.log('   URL:', page.url());

    // Check initial role state
    const activeBtn = await page.locator('.role-option.active').textContent();
    console.log('2. Active role:', activeBtn?.trim());

    // Click Market Officer button
    const moBtn = page.locator('button.role-option', { hasText: 'Market Officer' });
    console.log('3. MO button found:', await moBtn.count());
    await moBtn.click();
    await page.waitForTimeout(500);

    // Check role after click
    const activeBtnAfter = await page.locator('.role-option.active').textContent();
    console.log('4. Active role after click:', activeBtnAfter?.trim());

    // Check email field value (auto-filled by handleRoleChange)
    const emailVal = await page.locator('input[name="email"]').inputValue();
    const passVal = await page.locator('input[name="password"]').inputValue();
    console.log('5. Auto-filled email:', emailVal);
    console.log('   Auto-filled password:', passVal);

    // Fill credentials manually
    await page.locator('input[name="email"]').fill('market@agrisupport.rw');
    await page.locator('input[name="password"]').fill('Market@123');
    await page.waitForTimeout(200);

    const emailAfter = await page.locator('input[name="email"]').inputValue();
    const passAfter = await page.locator('input[name="password"]').inputValue();
    console.log('6. Email after fill:', emailAfter);
    console.log('   Password after fill:', passAfter);

    // Click submit
    const submitBtn = page.locator('button[type="submit"]');
    console.log('7. Submit button text:', (await submitBtn.textContent())?.trim());
    await submitBtn.click();
    console.log('8. Submit clicked');

    // Wait and check result
    await page.waitForTimeout(5000);
    console.log('9. URL after wait:', page.url());

    // Check for error messages
    const errorEl = await page.locator('.form-error').textContent().catch(() => null);
    console.log('10. Error message:', errorEl || 'none');

    // Check for success message
    const pageContent = await page.textContent('body');
    if (pageContent.includes('awaiting') || pageContent.includes('approval')) {
      console.log('11. Page contains approval/waiting text');
    }

    // Print console logs
    console.log('\n--- Browser Console Logs ---');
    logs.forEach(l => console.log('  ', l));

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
