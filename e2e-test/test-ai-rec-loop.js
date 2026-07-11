const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const apiCalls = [];
  page.on("request", req => {
    if (req.url().includes("/api/recommendations")) {
      apiCalls.push({ method: req.method(), url: req.url(), time: Date.now() });
    }
  });

  // Login as farmer
  await page.goto("http://localhost:5174/login", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForTimeout(2000);
  const farmerBtn = await page.$('button:has-text("Farmer")');
  if (farmerBtn) await farmerBtn.click();
  await page.waitForTimeout(500);
  await page.$eval('input[name="email"]', el => el.value = "farmer@agrisupport.rw");
  await page.fill('input[type="password"]', "Farmer@123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  // Go to AI Recommendation — count calls over 15 seconds
  apiCalls.length = 0;
  const startTime = Date.now();
  await page.goto("http://localhost:5174/ai-recommendation", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForTimeout(15000);
  const elapsed = Date.now() - startTime;

  console.log(`\nTotal recommendation API calls in ${elapsed}ms: ${apiCalls.length}`);
  console.log("Breakdown:");
  const byEndpoint = {};
  apiCalls.forEach(c => {
    const key = c.url.replace(/\/farms\/[^/]+/, "/farms/:id").replace(/\/runs\/[^/]+/, "/runs/:id");
    byEndpoint[key] = (byEndpoint[key] || 0) + 1;
  });
  Object.entries(byEndpoint).forEach(([k, v]) => console.log(`  ${k}: ${v} calls`));

  // Check for infinite loop: more than 10 calls to any endpoint = bad
  const maxCalls = Math.max(...Object.values(byEndpoint));
  if (maxCalls > 10) {
    console.log(`\nFAIL: ${maxCalls} calls to one endpoint — infinite loop detected!`);
  } else {
    console.log(`\nPASS: Max ${maxCalls} calls per endpoint — no infinite loop`);
  }

  await browser.close();
})();
