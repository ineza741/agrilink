const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  const apiCalls = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });
  page.on("request", req => {
    if (req.url().includes("/api/")) {
      apiCalls.push({ method: req.method(), url: req.url() });
    }
  });

  // Login as farmer
  await page.goto("http://localhost:5174/login", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForTimeout(2000);
  
  const farmerBtn = await page.$('button:has-text("Farmer")');
  if (farmerBtn) await farmerBtn.click();
  await page.waitForTimeout(500);
  
  const emailInput = await page.$('input[name="email"]');
  const passwordInput = await page.$('input[type="password"]');
  const loginBtn = await page.$('button[type="submit"]');
  
  await emailInput.fill("farmer@agrisupport.rw");
  await passwordInput.fill("Farmer@123");
  await loginBtn.click();
  await page.waitForTimeout(5000);
  
  console.log("Logged in, URL:", page.url());

  // Go to AI Recommendation
  apiCalls.length = 0;
  await page.goto("http://localhost:5174/ai-recommendation", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForTimeout(10000);
  
  console.log("\nAPI calls made:");
  apiCalls.forEach(c => console.log(`  ${c.method} ${c.url}`));
  
  const bodyText = await page.textContent("body");
  
  if (bodyText.includes("Something interrupted")) {
    console.log("\nCRASH: Something interrupted this screen");
    const errorDetail = bodyText.substring(bodyText.indexOf("Something interrupted"), bodyText.indexOf("Something interrupted") + 200);
    console.log("Detail:", errorDetail);
  } else {
    console.log("\nNo crash screen");
  }
  
  // Check for key states
  const hasLoading = bodyText.includes("Loading...");
  const hasNoData = bodyText.includes("No data available") || bodyText.includes("No recommendations");
  const hasBackendUnavail = bodyText.includes("Backend unavailable");
  console.log("Loading visible:", hasLoading);
  console.log("No data message:", hasNoData);
  console.log("Backend unavailable:", hasBackendUnavail);
  
  // Look for recommendation content
  const hasRecommendation = bodyText.includes("Recommendation") || bodyText.includes("recommendation");
  const hasGenerate = bodyText.includes("Generate") || bodyText.includes("generate");
  console.log("Has recommendation text:", hasRecommendation);
  console.log("Has generate button:", hasGenerate);
  
  console.log("\nConsole errors:");
  errors.forEach(e => console.log("  ", e.substring(0, 200)));
  
  await browser.close();
})();
