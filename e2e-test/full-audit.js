const { chromium } = require("playwright");

const FRONTEND = "http://localhost:5174";
const BACKEND = "http://localhost:5001";

const results = [];
let browser, page;

function log(screen, status, detail = "") {
  const entry = { screen, status, detail };
  results.push(entry);
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} [${screen}] ${detail}`);
}

async function goto(path) {
  await page.goto(`${FRONTEND}${path}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function checkConsoleErrors() {
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

async function screenshot(name) {
  await page.screenshot({ path: `C:\\Users\\Darrly\\OneDrive\\Desktop\\work\\rodrigue\\e2e-test\\screenshots\\${name}.png`, fullPage: false });
}

(async () => {
  const fs = require("fs");
  const dir = "C:\\Users\\Darrly\\OneDrive\\Desktop\\work\\rodrigue\\e2e-test\\screenshots";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", err => {
    consoleErrors.push({ url: page.url(), text: `PAGE ERROR: ${err.message}` });
  });

  // Track network failures
  const networkFailures = [];
  page.on("requestfailed", req => {
    networkFailures.push({ url: req.url(), error: req.failure()?.errorText });
  });

  // ===== SCREEN 1: LOGIN =====
  console.log("\n=== Testing Login ===");
  await goto("/login");
  await screenshot("01-login");
  
  // Check if login form exists
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passwordInput = await page.$('input[type="password"]');
  const loginButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
  
  if (emailInput && passwordInput && loginButton) {
    log("Login", "PASS", "Form elements found");
    
    // Try logging in
    await emailInput.fill("farmer@agrisupport.rw");
    await passwordInput.fill("Farmer@123");
    await loginButton.click();
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes("/dashboard")) {
      log("Login", "PASS", "Redirected to dashboard after login");
    } else {
      log("Login", "FAIL", `Did not redirect. URL: ${currentUrl}`);
    }
  } else {
    log("Login", "FAIL", `Missing elements: email=${!!emailInput} password=${!!passwordInput} button=${!!loginButton}`);
  }

  // ===== SCREEN 2: FARMER DASHBOARD =====
  console.log("\n=== Testing Farmer Dashboard ===");
  await goto("/dashboard");
  await page.waitForTimeout(3000);
  await screenshot("02-dashboard");
  
  const dashText = await page.textContent("body");
  if (dashText.includes("Something interrupted")) {
    log("FarmerDashboard", "FAIL", "CRASH SCREEN - Something interrupted this screen");
  } else if (dashText.includes("Loading") || dashText.includes("loading")) {
    // Check if loading eventually stops
    await page.waitForTimeout(8000);
    const afterWait = await page.textContent("body");
    if (afterWait.includes("Loading") && !afterWait.includes("Dashboard") && !afterWait.includes("Welcome")) {
      log("FarmerDashboard", "FAIL", "Infinite loading - never stops");
    } else {
      log("FarmerDashboard", "PASS", "Loading completed");
    }
  } else {
    log("FarmerDashboard", "PASS", "Page loaded");
  }

  // ===== SCREEN 3: FARMS =====
  console.log("\n=== Testing Farms ===");
  await goto("/farms");
  await page.waitForTimeout(3000);
  await screenshot("03-farms");
  
  const farmsText = await page.textContent("body");
  if (farmsText.includes("Something interrupted")) {
    log("Farms", "FAIL", "CRASH SCREEN");
  } else {
    log("Farms", "PASS", "Page loaded");
  }

  // ===== SCREEN 4: ADD FARM =====
  console.log("\n=== Testing Add Farm ===");
  await goto("/farms/new");
  await page.waitForTimeout(2000);
  await screenshot("04-addfarm");
  
  const addFarmText = await page.textContent("body");
  if (addFarmText.includes("Something interrupted")) {
    log("AddFarm", "FAIL", "CRASH SCREEN");
  } else {
    log("AddFarm", "PASS", "Page loaded");
  }

  // ===== SCREEN 5: WEATHER =====
  console.log("\n=== Testing Weather ===");
  await goto("/weather");
  await page.waitForTimeout(5000);
  await screenshot("05-weather");
  
  const weatherText = await page.textContent("body");
  if (weatherText.includes("Something interrupted")) {
    log("Weather", "FAIL", "CRASH SCREEN");
  } else if (weatherText.includes("Loading") || weatherText.includes("loading")) {
    await page.waitForTimeout(10000);
    const afterWait = await page.textContent("body");
    if (afterWait.includes("Loading")) {
      log("Weather", "FAIL", "Infinite loading");
    } else {
      log("Weather", "PASS", "Loading completed");
    }
  } else {
    log("Weather", "PASS", "Page loaded");
  }

  // ===== SCREEN 6: SOIL & CROP =====
  console.log("\n=== Testing Soil & Crop ===");
  await goto("/soil-crop");
  await page.waitForTimeout(5000);
  await screenshot("06-soil");
  
  const soilText = await page.textContent("body");
  if (soilText.includes("Something interrupted")) {
    log("SoilCrop", "FAIL", "CRASH SCREEN");
  } else {
    log("SoilCrop", "PASS", "Page loaded");
  }

  // ===== SCREEN 7: AI RECOMMENDATION =====
  console.log("\n=== Testing AI Recommendation ===");
  await goto("/ai-recommendation");
  await page.waitForTimeout(5000);
  await screenshot("07-ai");
  
  const aiText = await page.textContent("body");
  if (aiText.includes("Something interrupted")) {
    log("AiRecommendation", "FAIL", "CRASH SCREEN");
  } else {
    log("AiRecommendation", "PASS", "Page loaded");
  }

  // ===== SCREEN 8: IRRIGATION =====
  console.log("\n=== Testing Irrigation ===");
  await goto("/irrigation-fertilizer");
  await page.waitForTimeout(5000);
  await screenshot("08-irrigation");
  
  const irrigText = await page.textContent("body");
  if (irrigText.includes("Something interrupted")) {
    log("Irrigation", "FAIL", "CRASH SCREEN");
  } else {
    log("Irrigation", "PASS", "Page loaded");
  }

  // ===== SCREEN 9: PESTS =====
  console.log("\n=== Testing Pests ===");
  await goto("/pests-diseases");
  await page.waitForTimeout(5000);
  await screenshot("09-pests");
  
  const pestsText = await page.textContent("body");
  if (pestsText.includes("Something interrupted")) {
    log("Pests", "FAIL", "CRASH SCREEN");
  } else {
    log("Pests", "PASS", "Page loaded");
  }

  // ===== SCREEN 10: MARKET =====
  console.log("\n=== Testing Market ===");
  await goto("/market-intelligence");
  await page.waitForTimeout(5000);
  await screenshot("10-market");
  
  const marketText = await page.textContent("body");
  if (marketText.includes("Something interrupted")) {
    log("Market", "FAIL", "CRASH SCREEN");
  } else {
    log("Market", "PASS", "Page loaded");
  }

  // ===== SCREEN 11: COMMUNITY =====
  console.log("\n=== Testing Community ===");
  await goto("/community");
  await page.waitForTimeout(5000);
  await screenshot("11-community");
  
  const communityText = await page.textContent("body");
  if (communityText.includes("Something interrupted")) {
    log("Community", "FAIL", "CRASH SCREEN");
  } else {
    log("Community", "PASS", "Page loaded");
  }

  // ===== SCREEN 12: NOTIFICATIONS =====
  console.log("\n=== Testing Notifications ===");
  await goto("/notifications");
  await page.waitForTimeout(5000);
  await screenshot("12-notifications");
  
  const notifText = await page.textContent("body");
  if (notifText.includes("Something interrupted")) {
    log("Notifications", "FAIL", "CRASH SCREEN");
  } else {
    log("Notifications", "PASS", "Page loaded");
  }

  // ===== SCREEN 13: SETTINGS =====
  console.log("\n=== Testing Settings ===");
  await goto("/settings");
  await page.waitForTimeout(3000);
  await screenshot("13-settings");
  
  const settingsText = await page.textContent("body");
  if (settingsText.includes("Something interrupted")) {
    log("Settings", "FAIL", "CRASH SCREEN");
  } else {
    log("Settings", "PASS", "Page loaded");
  }

  // ===== Now test as ADMIN =====
  console.log("\n=== Switching to Admin ===");
  // First clear storage to force logout
  await page.evaluate(() => {
    localStorage.removeItem("agri-feed-access-token");
    localStorage.removeItem("agri-feed-auth-source");
  });
  // Login as admin
  await goto("/login");
  await page.waitForTimeout(2000);
  
  // Click admin role button first
  const adminRoleBtn = await page.$('button:has-text("Admin")');
  if (adminRoleBtn) {
    await adminRoleBtn.click();
    await page.waitForTimeout(500);
  }
  
  const emailInput2 = await page.$('input[name="email"]');
  const passwordInput2 = await page.$('input[type="password"]');
  const loginButton2 = await page.$('button[type="submit"]');
  
  if (emailInput2 && passwordInput2 && loginButton2) {
    await emailInput2.fill("");
    await passwordInput2.fill("");
    await emailInput2.fill("admin@agrisupport.rw");
    await passwordInput2.fill("Admin@123");
    await loginButton2.click();
    await page.waitForTimeout(5000);
    const adminUrl = page.url();
    log("AdminLogin", adminUrl.includes("/dashboard") ? "PASS" : "FAIL", `URL: ${adminUrl}`);
  } else {
    log("AdminLogin", "FAIL", `Login form not found: email=${!!emailInput2} pw=${!!passwordInput2} btn=${!!loginButton2}`);
  }

  // ===== SCREEN 14: ADMIN DASHBOARD =====
  console.log("\n=== Testing Admin Dashboard ===");
  await goto("/dashboard");
  await page.waitForTimeout(5000);
  await screenshot("14-admin-dashboard");
  
  const adminDashText = await page.textContent("body");
  if (adminDashText.includes("Something interrupted")) {
    log("AdminDashboard", "FAIL", "CRASH SCREEN");
  } else {
    log("AdminDashboard", "PASS", "Page loaded");
  }

  // ===== SCREEN 15: REGIONAL MONITORING =====
  console.log("\n=== Testing Regional Monitoring ===");
  await goto("/regional-monitoring");
  await page.waitForTimeout(5000);
  await screenshot("15-regional");
  
  const regionalText = await page.textContent("body");
  if (regionalText.includes("Something interrupted")) {
    log("RegionalMonitoring", "FAIL", "CRASH SCREEN");
  } else {
    log("RegionalMonitoring", "PASS", "Page loaded");
  }

  // ===== SCREEN 16: RECOMMENDATIONS (Admin Content) =====
  console.log("\n=== Testing Recommendations/Content ===");
  await goto("/recommendations");
  await page.waitForTimeout(5000);
  await screenshot("16-recommendations");
  
  const recText = await page.textContent("body");
  if (recText.includes("Something interrupted")) {
    log("Recommendations", "FAIL", "CRASH SCREEN");
  } else {
    log("Recommendations", "PASS", "Page loaded");
  }

  // ===== SCREEN 17: ANALYTICS =====
  console.log("\n=== Testing Analytics ===");
  await goto("/analytics");
  await page.waitForTimeout(5000);
  await screenshot("17-analytics");
  
  const analyticsText = await page.textContent("body");
  if (analyticsText.includes("Something interrupted")) {
    log("Analytics", "FAIL", "CRASH SCREEN");
  } else {
    log("Analytics", "PASS", "Page loaded");
  }

  // ===== SCREEN 18: PROFILE =====
  console.log("\n=== Testing Profile ===");
  await goto("/profile");
  await page.waitForTimeout(3000);
  await screenshot("18-profile");
  
  const profileText = await page.textContent("body");
  if (profileText.includes("Something interrupted")) {
    log("Profile", "FAIL", "CRASH SCREEN");
  } else {
    log("Profile", "PASS", "Page loaded");
  }

  // ===== Report console errors =====
  console.log("\n=== Console Errors ===");
  if (consoleErrors.length === 0) {
    console.log("No console errors detected");
  } else {
    console.log(`${consoleErrors.length} console errors:`);
    consoleErrors.forEach(e => console.log(`  [${e.url}] ${e.text.substring(0, 200)}`));
  }

  console.log("\n=== Network Failures ===");
  if (networkFailures.length === 0) {
    console.log("No network failures detected");
  } else {
    console.log(`${networkFailures.length} network failures:`);
    networkFailures.forEach(f => console.log(`  ${f.url}: ${f.error}`));
  }

  // Summary
  console.log("\n\n=== SUMMARY ===");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}`);
  
  if (failed > 0) {
    console.log("\nFailed screens:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ${r.screen}: ${r.detail}`));
  }

  await browser.close();
})();
