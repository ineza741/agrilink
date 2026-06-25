const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");
const prisma = require("../src/prisma/client");

const ADMIN_CREDENTIALS = {
  email: "admin@agrisupport.rw",
  password: "Admin@123",
};

const FARMER_CREDENTIALS = {
  email: "farmer@agrisupport.rw",
  password: "Farmer@123",
};

const createdFarmerEmails = [];

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function login(credentials) {
  const response = await request(app).post("/api/auth/login").send(credentials);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data?.token);

  return response.body.data;
}

async function registerDemoFarmer(overrides = {}) {
  const suffix = uniqueSuffix();
  const phoneSeed = `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`.slice(-9);
  const payload = {
    fullName: `Demo Farmer ${suffix}`,
    email: `demo-farmer-${suffix}@agrisupport.rw`,
    phone: `07${phoneSeed}`,
    password: "Farmer@123",
    region: "Gatenga Sector, Kicukiro District",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    experienceLevel: "Intermediate",
    primaryCrop: "Maize",
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(payload);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data?.user?.role, "Farmer");
  assert.ok(response.body.data?.token);
  createdFarmerEmails.push(payload.email);

  return {
    payload,
    auth: response.body.data,
  };
}

after(async () => {
  if (!createdFarmerEmails.length) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: createdFarmerEmails,
      },
    },
  });
});

test("seeded farmer can log in and fetch current identity/profile", async () => {
  const { token, user } = await login(FARMER_CREDENTIALS);

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.success, true);
  assert.equal(meResponse.body.data.email, FARMER_CREDENTIALS.email);
  assert.equal(meResponse.body.data.role, "Farmer");
  assert.ok(meResponse.body.data.farmerProfile);

  const profileResponse = await request(app)
    .get("/api/farmers/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.success, true);
  assert.equal(profileResponse.body.data.user.id, user.id);
  assert.ok(Array.isArray(profileResponse.body.data.farms));
});

test("registered farmer can create a farm, save crop history, and run soil analysis", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 2 Soil Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const farmPayload = {
    farmName: `Backend Soil Plot ${uniqueSuffix()}`,
    province: "Kigali City",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    latitude: -1.9983,
    longitude: 30.1038,
    farmSize: 3.4,
    farmSizeUnit: "hectares",
    landType: "Clay Loam",
    soilType: "Clay Loam",
    currentCrop: "Beans",
    cropStage: "Vegetative",
    ownershipType: "Farmer managed",
  };

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(farmPayload);

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);
  assert.equal(createFarmResponse.body.data.farmName, farmPayload.farmName);

  const farmId = createFarmResponse.body.data.id;

  const cropHistoryPayload = {
    cropName: "Beans",
    season: "2026 B",
    year: 2026,
    yieldAmount: 2.4,
    yieldUnit: "t/ha",
    challenges: "Short dry spell at flowering",
    notes: "Field demonstration cycle",
  };

  const cropHistoryResponse = await request(app)
    .post(`/api/farms/${farmId}/crop-history`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(cropHistoryPayload);

  assert.equal(cropHistoryResponse.status, 201);
  assert.equal(cropHistoryResponse.body.success, true);
  assert.equal(cropHistoryResponse.body.data.cropName, cropHistoryPayload.cropName);

  const soilPayload = {
    farmId,
    sourceType: "manual",
    ph: 6.4,
    nitrogen: 32,
    phosphorus: 18,
    potassium: 16,
    organicMatter: 2.6,
    texture: "Clay Loam",
    notes: "Frontend-backed Phase 2 integration test",
  };

  const createSoilResponse = await request(app)
    .post("/api/soil-tests")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(soilPayload);

  assert.equal(createSoilResponse.status, 201);
  assert.equal(createSoilResponse.body.success, true);
  assert.equal(createSoilResponse.body.data.farmId, farmId);

  const soilTestId = createSoilResponse.body.data.id;

  const analyzeResponse = await request(app)
    .post(`/api/soil-tests/${soilTestId}/analyze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({});

  assert.equal(analyzeResponse.status, 200);
  assert.equal(analyzeResponse.body.success, true);
  assert.ok(analyzeResponse.body.data.soilTest);
  assert.ok(Array.isArray(analyzeResponse.body.data.suitabilityResults));
  assert.ok(analyzeResponse.body.data.suitabilityResults.length > 0);
  assert.ok(analyzeResponse.body.data.fertilizerRecommendation);

  const suitabilityResponse = await request(app)
    .get(`/api/crop-suitability/farm/${farmId}`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(suitabilityResponse.status, 200);
  assert.equal(suitabilityResponse.body.success, true);
  assert.equal(suitabilityResponse.body.data.latestSoilTest.farmId, farmId);
  assert.ok(Array.isArray(suitabilityResponse.body.data.suitabilityResults));
  assert.ok(suitabilityResponse.body.data.latestSoilTest);
});

test("registered farmer can calculate irrigation advisory and manage reminders", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 3 Irrigation Farmer ${uniqueSuffix()}`,
    primaryCrop: "Maize",
  });
  const farmerToken = registration.auth.token;

  const farmPayload = {
    farmName: `Backend Irrigation Plot ${uniqueSuffix()}`,
    province: "Kigali City",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    latitude: -1.9983,
    longitude: 30.1038,
    farmSize: 2.8,
    farmSizeUnit: "hectares",
    landType: "Loamy",
    soilType: "Loamy",
    currentCrop: "Maize",
    cropStage: "Vegetative",
    ownershipType: "Farmer managed",
  };

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(farmPayload);

  assert.equal(createFarmResponse.status, 201);
  const farmId = createFarmResponse.body.data.id;

  const advisoryPayload = {
    crop: "Maize",
    cropStage: "Vegetative",
    irrigationType: "Drip Irrigation",
    soilMoisture: 31,
    sensorMode: "manual",
    targetYield: 12,
    fertilizerType: "Precision NPK",
    budget: 240000,
    weatherLabel: "Live Weather Data",
    soilLabel: "Local Data",
    weather: {
      current: {
        temperature_2m: 26,
        relative_humidity_2m: 74,
        precipitation: 0.8,
        rain: 0.8,
        wind_speed_10m: 14,
      },
      daily: {
        time: [
          "2026-06-22",
          "2026-06-23",
          "2026-06-24",
          "2026-06-25",
          "2026-06-26",
          "2026-06-27",
          "2026-06-28",
        ],
        rain_sum: [0.3, 0, 1.2, 0.4, 0, 2.2, 0.7],
        precipitation_probability_max: [18, 12, 42, 26, 20, 58, 31],
        temperature_2m_max: [27, 28, 26, 27, 28, 29, 27],
        et0_fao_evapotranspiration: [4.1, 4.2, 4.0, 4.3, 4.4, 4.1, 4.0],
      },
    },
    soilProfile: {
      ph: 6.4,
      nitrogen: 35,
      phosphorus: 20,
      potassium: 24,
      organicMatter: 2.5,
      texture: "Loamy",
      source: "Local Data",
    },
  };

  const calculateResponse = await request(app)
    .post(`/api/irrigation/farms/${farmId}/calculate`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(advisoryPayload);

  assert.equal(calculateResponse.status, 201);
  assert.equal(calculateResponse.body.success, true);
  assert.ok(calculateResponse.body.data.id);
  assert.equal(calculateResponse.body.data.crop, "Maize");
  assert.ok(Array.isArray(calculateResponse.body.data.scheduleDates));
  assert.ok(calculateResponse.body.data.scheduleDates.length > 0);

  const advisoryId = calculateResponse.body.data.id;
  const reminderDate = calculateResponse.body.data.scheduleDates[0].dateKey;

  const createReminderResponse = await request(app)
    .post(`/api/irrigation/farms/${farmId}/reminders`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      dateKey: reminderDate,
      type: "irrigation",
      priority: "High",
      status: "Pending",
      advisoryId,
    });

  assert.equal(createReminderResponse.status, 201);
  assert.equal(createReminderResponse.body.success, true);
  assert.equal(createReminderResponse.body.data.dateKey, reminderDate);

  const reminderId = createReminderResponse.body.data.id;

  const listReminderResponse = await request(app)
    .get(`/api/irrigation/farms/${farmId}/reminders`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(listReminderResponse.status, 200);
  assert.equal(listReminderResponse.body.success, true);
  assert.ok(Array.isArray(listReminderResponse.body.data));
  assert.ok(listReminderResponse.body.data.some((entry) => entry.id === reminderId));

  const updateReminderResponse = await request(app)
    .put(`/api/irrigation/reminders/${reminderId}`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({ status: "Completed" });

  assert.equal(updateReminderResponse.status, 200);
  assert.equal(updateReminderResponse.body.success, true);
  assert.equal(updateReminderResponse.body.data.status, "Completed");

  const latestResponse = await request(app)
    .get(`/api/irrigation/farms/${farmId}/latest`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(latestResponse.status, 200);
  assert.equal(latestResponse.body.success, true);
  assert.equal(latestResponse.body.data.id, advisoryId);
  assert.ok(Array.isArray(latestResponse.body.data.scheduleDates));
});

test("registered farmer can generate market analysis and manage market alerts", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 4 Market Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const farmPayload = {
    farmName: `Backend Market Plot ${uniqueSuffix()}`,
    province: "Kigali City",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    latitude: -1.9838,
    longitude: 30.1014,
    farmSize: 4.2,
    farmSizeUnit: "hectares",
    landType: "Loamy",
    soilType: "Loamy",
    currentCrop: "Beans",
    cropStage: "Flowering",
    ownershipType: "Farmer managed",
  };

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(farmPayload);

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);

  const farmId = createFarmResponse.body.data.id;

  const analyzeResponse = await request(app)
    .post(`/api/market/farms/${farmId}/analyze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      crop: "Beans",
      timeframe: "30D",
    });

  assert.equal(analyzeResponse.status, 201);
  assert.equal(analyzeResponse.body.success, true);
  assert.equal(analyzeResponse.body.data.crop, "Beans");
  assert.ok(Array.isArray(analyzeResponse.body.data.markets));
  assert.ok(analyzeResponse.body.data.markets.length > 0);
  assert.ok(Array.isArray(analyzeResponse.body.data.forecasts));
  assert.ok(analyzeResponse.body.data.aiDecision);

  const createAlertResponse = await request(app)
    .post(`/api/market/farms/${farmId}/alerts`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      crop: "Beans",
      targetPrice: 1100,
      currentPrice: analyzeResponse.body.data.bestMarket?.currentPrice || analyzeResponse.body.data.currentPrice || 0,
      bestMarketName: analyzeResponse.body.data.bestMarket?.name || null,
    });

  assert.equal(createAlertResponse.status, 201);
  assert.equal(createAlertResponse.body.success, true);
  assert.equal(createAlertResponse.body.data.crop, "Beans");
  assert.equal(createAlertResponse.body.data.targetPrice, 1100);

  const alertId = createAlertResponse.body.data.id;

  const listAlertsResponse = await request(app)
    .get(`/api/market/farms/${farmId}/alerts`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(listAlertsResponse.status, 200);
  assert.equal(listAlertsResponse.body.success, true);
  assert.ok(Array.isArray(listAlertsResponse.body.data));
  assert.ok(listAlertsResponse.body.data.some((entry) => entry.id === alertId));

  const latestResponse = await request(app)
    .get(`/api/market/farms/${farmId}/latest?crop=Beans&timeframe=30D`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(latestResponse.status, 200);
  assert.equal(latestResponse.body.success, true);
  assert.equal(latestResponse.body.data.farmId, farmId);
  assert.equal(latestResponse.body.data.crop, "Beans");

  const deleteAlertResponse = await request(app)
    .delete(`/api/market/alerts/${alertId}`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(deleteAlertResponse.status, 200);
  assert.equal(deleteAlertResponse.body.success, true);
});

test("registered farmer can generate pest diagnosis and track response actions", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 5 Pest Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const farmPayload = {
    farmName: `Backend Pest Plot ${uniqueSuffix()}`,
    province: "Kigali City",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    latitude: -1.9983,
    longitude: 30.1038,
    farmSize: 2.6,
    farmSizeUnit: "hectares",
    landType: "Clay Loam",
    soilType: "Clay Loam",
    currentCrop: "Beans",
    cropStage: "Flowering",
    ownershipType: "Farmer managed",
  };

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(farmPayload);

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);

  const farmId = createFarmResponse.body.data.id;

  const analyzeResponse = await request(app)
    .post(`/api/pests/farms/${farmId}/analyze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      crop: "Beans",
      symptom: "White Mold",
      affectedArea: 34,
      uploadedImageName: "beans-canopy.jpg",
      weatherContribution: {
        current: {
          temperature: 23,
          humidity: 84,
          rainfall: 1.6,
          windSpeed: 12,
          description: "Moderate drizzle",
        },
        forecast: {
          totalRain: 18.5,
          humidDays: 5,
          warmDays: 4,
          peakHumidity: 88,
          peakTemperature: 26,
        },
        explanation: "Humidity and repeated canopy wetness are raising fungal disease pressure.",
      },
    });

  assert.equal(analyzeResponse.status, 201);
  assert.equal(analyzeResponse.body.success, true);
  assert.equal(analyzeResponse.body.data.crop, "Beans");
  assert.ok(analyzeResponse.body.data.topDiagnosis);
  assert.ok(analyzeResponse.body.data.recommendation);
  assert.ok(Array.isArray(analyzeResponse.body.data.historyLog));

  const diagnosisId = analyzeResponse.body.data.id;
  const recommendationId = analyzeResponse.body.data.recommendation.recommendationId;

  const latestResponse = await request(app)
    .get(`/api/pests/farms/${farmId}/latest`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(latestResponse.status, 200);
  assert.equal(latestResponse.body.success, true);
  assert.equal(latestResponse.body.data.id, diagnosisId);

  const actionResponse = await request(app)
    .post(`/api/pests/diagnoses/${diagnosisId}/actions`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      recommendationId,
      actionType: "Pest/Disease",
      feedbackStatus: "accepted",
    });

  assert.equal(actionResponse.status, 201);
  assert.equal(actionResponse.body.success, true);
  assert.equal(actionResponse.body.data.feedbackStatus, "accepted");

  const actionsListResponse = await request(app)
    .get(`/api/pests/diagnoses/${diagnosisId}/actions`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(actionsListResponse.status, 200);
  assert.equal(actionsListResponse.body.success, true);
  assert.ok(Array.isArray(actionsListResponse.body.data));
  assert.ok(actionsListResponse.body.data.some((entry) => entry.recommendationId === recommendationId));

  const historyResponse = await request(app)
    .get(`/api/pests/farms/${farmId}/history`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(historyResponse.status, 200);
  assert.equal(historyResponse.body.success, true);
  assert.ok(Array.isArray(historyResponse.body.data));
  assert.ok(historyResponse.body.data.length > 0);
});

test("registered farmer can generate AI recommendations and record workflow feedback", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 6 AI Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const farmPayload = {
    farmName: `Backend AI Plot ${uniqueSuffix()}`,
    province: "Kigali City",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    latitude: -1.9983,
    longitude: 30.1038,
    farmSize: 3.1,
    farmSizeUnit: "hectares",
    landType: "Loamy",
    soilType: "Loamy",
    currentCrop: "Beans",
    cropStage: "Pod Fill",
    ownershipType: "Farmer managed",
  };

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send(farmPayload);

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);

  const farmId = createFarmResponse.body.data.id;

  const generateResponse = await request(app)
    .post(`/api/recommendations/farms/${farmId}/generate`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      weatherSourceLabel: "Live Weather Data",
      weather: {
        temperature: 24,
        humidity: 78,
        rainProbability: 18,
        rainfall: 1.2,
        wind: 14,
        source: "Live Weather Data",
      },
    });

  assert.equal(generateResponse.status, 201);
  assert.equal(generateResponse.body.success, true);
  assert.ok(generateResponse.body.data.id);
  assert.ok(Array.isArray(generateResponse.body.data.recommendations));
  assert.ok(generateResponse.body.data.recommendations.length > 0);
  assert.ok(Array.isArray(generateResponse.body.data.scheduler));

  const runId = generateResponse.body.data.id;
  const recommendationId = generateResponse.body.data.recommendations[0].id;

  const latestResponse = await request(app)
    .get(`/api/recommendations/farms/${farmId}/latest`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(latestResponse.status, 200);
  assert.equal(latestResponse.body.success, true);
  assert.equal(latestResponse.body.data.id, runId);

  const feedbackResponse = await request(app)
    .post(`/api/recommendations/runs/${runId}/feedback`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      recommendationId,
      actionType: "AI Recommendation",
      feedbackStatus: "Approved",
      note: "Proceed with farmer notification workflow",
    });

  assert.equal(feedbackResponse.status, 201);
  assert.equal(feedbackResponse.body.success, true);
  assert.equal(feedbackResponse.body.data.recommendationId, recommendationId);

  const feedbackListResponse = await request(app)
    .get(`/api/recommendations/runs/${runId}/feedback`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(feedbackListResponse.status, 200);
  assert.equal(feedbackListResponse.body.success, true);
  assert.ok(Array.isArray(feedbackListResponse.body.data));
  assert.ok(feedbackListResponse.body.data.some((entry) => entry.recommendationId === recommendationId));

  const historyResponse = await request(app)
    .get(`/api/recommendations/farms/${farmId}/history`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(historyResponse.status, 200);
  assert.equal(historyResponse.body.success, true);
  assert.ok(Array.isArray(historyResponse.body.data));
  assert.ok(historyResponse.body.data.length > 0);
});

test("registered farmer can load notification center and persist alert actions", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 7 Notification Farmer ${uniqueSuffix()}`,
    primaryCrop: "Maize",
  });
  const farmerToken = registration.auth.token;

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      farmName: `Backend Notification Plot ${uniqueSuffix()}`,
      province: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      latitude: -1.9983,
      longitude: 30.1038,
      farmSize: 2.2,
      farmSizeUnit: "hectares",
      landType: "Loamy",
      soilType: "Loamy",
      currentCrop: "Maize",
      cropStage: "Flowering",
      ownershipType: "Farmer managed",
    });

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);

  const farmId = createFarmResponse.body.data.id;

  const centerResponse = await request(app)
    .get(`/api/notifications/center?farmId=${farmId}`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(centerResponse.status, 200);
  assert.equal(centerResponse.body.success, true);
  assert.equal(centerResponse.body.data.activeFarmId, farmId);
  assert.ok(Array.isArray(centerResponse.body.data.notifications));
  assert.ok(centerResponse.body.data.notifications.length > 0);
  assert.ok(Array.isArray(centerResponse.body.data.templates));
  assert.ok(centerResponse.body.data.preferences);

  const alertId = centerResponse.body.data.notifications[0].id;
  const templateId = centerResponse.body.data.templates[0].id;

  const preferenceResponse = await request(app)
    .put("/api/notifications/preferences")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      delivery: {
        email: true,
        sms: false,
        push: true,
        scheduledSummary: true,
      },
      categories: {
        weather: true,
        pest: true,
        market: false,
        irrigation: true,
        analytics: true,
      },
      summaries: {
        Daily: true,
        Weekly: false,
        Monthly: true,
      },
    });

  assert.equal(preferenceResponse.status, 200);
  assert.equal(preferenceResponse.body.success, true);
  assert.equal(preferenceResponse.body.data.delivery.sms, false);
  assert.equal(preferenceResponse.body.data.summaries.Monthly, true);

  const confirmResponse = await request(app)
    .put(`/api/notifications/${alertId}/confirm`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({});

  assert.equal(confirmResponse.status, 200);
  assert.equal(confirmResponse.body.success, true);
  assert.equal(confirmResponse.body.data.ackStatus, "confirmed");

  const snoozeResponse = await request(app)
    .put(`/api/notifications/${alertId}/snooze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({ hours: 4 });

  assert.equal(snoozeResponse.status, 200);
  assert.equal(snoozeResponse.body.success, true);
  assert.equal(snoozeResponse.body.data.deliveryStatus, "Pending");
  assert.ok(snoozeResponse.body.data.snoozedUntil);

  const markAllResponse = await request(app)
    .put("/api/notifications/mark-all-read")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({ farmId });

  assert.equal(markAllResponse.status, 200);
  assert.equal(markAllResponse.body.success, true);
  assert.ok(Array.isArray(markAllResponse.body.data));
  assert.ok(markAllResponse.body.data.every((entry) => entry.read === true));

  const templateResponse = await request(app)
    .put(`/api/notifications/templates/${templateId}/status`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({ status: "Published" });

  assert.equal(templateResponse.status, 200);
  assert.equal(templateResponse.body.success, true);
  assert.equal(templateResponse.body.data.status, "Published");
});


test("admin can load a system-wide notification center without farm context", async () => {
  const adminAuth = await login(ADMIN_CREDENTIALS);
  const adminToken = adminAuth.token;

  const centerResponse = await request(app)
    .get("/api/notifications/center")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(centerResponse.status, 200);
  assert.equal(centerResponse.body.success, true);
  assert.equal(centerResponse.body.data.sourceMode, "backend-admin");
  assert.ok(Array.isArray(centerResponse.body.data.notifications));
  assert.ok(centerResponse.body.data.notifications.length > 0);

  const districts = new Set(
    centerResponse.body.data.notifications.map((item) => item.district).filter(Boolean),
  );

  assert.ok(districts.size >= 1);

  const markAllResponse = await request(app)
    .put("/api/notifications/mark-all-read")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({});

  assert.equal(markAllResponse.status, 200);
  assert.equal(markAllResponse.body.success, true);
  assert.ok(Array.isArray(markAllResponse.body.data));
  assert.ok(markAllResponse.body.data.every((entry) => entry.read === true));
});
test("registered farmer and admin can use analytics dashboards, history, and exports", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 8 Analytics Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      farmName: `Backend Analytics Plot ${uniqueSuffix()}`,
      province: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      latitude: -1.9983,
      longitude: 30.1038,
      farmSize: 3.8,
      farmSizeUnit: "hectares",
      landType: "Clay Loam",
      soilType: "Clay Loam",
      currentCrop: "Beans",
      cropStage: "Flowering",
      ownershipType: "Farmer managed",
    });

  assert.equal(createFarmResponse.status, 201);
  assert.equal(createFarmResponse.body.success, true);
  const farmId = createFarmResponse.body.data.id;

  await request(app)
    .post("/api/soil-tests")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      farmId,
      sourceType: "manual",
      ph: 6.3,
      nitrogen: 34,
      phosphorus: 21,
      potassium: 18,
      organicMatter: 2.8,
      texture: "Clay Loam",
      notes: "Analytics module integration test",
    });

  await request(app)
    .post(`/api/market/farms/${farmId}/analyze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      crop: "Beans",
      timeframe: "30D",
    });

  await request(app)
    .post(`/api/pests/farms/${farmId}/analyze`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      crop: "Beans",
      symptom: "White Mold",
      affectedArea: 28,
      weatherContribution: {
        current: {
          temperature: 23,
          humidity: 80,
          rainfall: 1.8,
          windSpeed: 11,
        },
      },
    });

  await request(app)
    .post(`/api/recommendations/farms/${farmId}/generate`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      weatherSourceLabel: "Live Weather Data",
      weather: {
        temperature: 24,
        humidity: 76,
        rainProbability: 22,
        rainfall: 1.3,
        wind: 12,
      },
    });

  const farmerDashboardResponse = await request(app)
    .get(`/api/analytics/farms/${farmId}/dashboard?dateRange=6M&cropType=Beans&activityFilter=All&reportTemplate=Operations%20Summary&chartFilter=Quarterly`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(farmerDashboardResponse.status, 200);
  assert.equal(farmerDashboardResponse.body.success, true);
  assert.equal(farmerDashboardResponse.body.data.sourceMode, "backend");
  assert.ok(farmerDashboardResponse.body.data.analytics);
  assert.ok(Array.isArray(farmerDashboardResponse.body.data.aiInsights));
  assert.ok(Array.isArray(farmerDashboardResponse.body.data.sustainabilityRows));
  assert.ok(Array.isArray(farmerDashboardResponse.body.data.benchmarkRows));

  const farmerExportResponse = await request(app)
    .post(`/api/analytics/farms/${farmId}/export`)
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      format: "excel",
      dateRange: "6M",
      cropType: "Beans",
      activityFilter: "All",
      reportTemplate: "Operations Summary",
      chartFilter: "Quarterly",
    });

  assert.equal(farmerExportResponse.status, 201);
  assert.equal(farmerExportResponse.body.success, true);
  assert.equal(farmerExportResponse.body.data.scopeType, "farm");
  assert.equal(farmerExportResponse.body.data.farmId, farmId);
  assert.ok(farmerExportResponse.body.data.payload);

  const farmerHistoryResponse = await request(app)
    .get(`/api/analytics/farms/${farmId}/history`)
    .set("Authorization", `Bearer ${farmerToken}`);

  assert.equal(farmerHistoryResponse.status, 200);
  assert.equal(farmerHistoryResponse.body.success, true);
  assert.ok(Array.isArray(farmerHistoryResponse.body.data));
  assert.ok(farmerHistoryResponse.body.data.some((entry) => entry.farmId === farmId));

  const adminAuth = await login(ADMIN_CREDENTIALS);
  const adminToken = adminAuth.token;

  const adminDashboardResponse = await request(app)
    .get("/api/analytics/admin/dashboard?reportTemplate=Government%20Report&methodology=Climate%20Resilience&selectedComparison=Region%20vs%20Region&selectedCompliance=MINAGRI&selectedExportFormat=PDF")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(adminDashboardResponse.status, 200);
  assert.equal(adminDashboardResponse.body.success, true);
  assert.equal(adminDashboardResponse.body.data.sourceMode, "backend");
  assert.ok(Array.isArray(adminDashboardResponse.body.data.sourceLabels));
  assert.ok(Array.isArray(adminDashboardResponse.body.data.summaryCards));
  assert.ok(Array.isArray(adminDashboardResponse.body.data.sustainabilityDashboard));
  assert.ok(Array.isArray(adminDashboardResponse.body.data.aiRecommendationAnalytics));
  assert.ok(Array.isArray(adminDashboardResponse.body.data.recentExports));

  const adminExportResponse = await request(app)
    .post("/api/analytics/admin/export")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      format: "json",
      reportTemplate: "Government Report",
      methodology: "Climate Resilience",
      selectedComparison: "Region vs Region",
      selectedCompliance: "MINAGRI",
    });

  assert.equal(adminExportResponse.status, 201);
  assert.equal(adminExportResponse.body.success, true);
  assert.equal(adminExportResponse.body.data.scopeType, "admin");
  assert.ok(adminExportResponse.body.data.payload);

  const adminHistoryResponse = await request(app)
    .get("/api/analytics/admin/history")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(adminHistoryResponse.status, 200);
  assert.equal(adminHistoryResponse.body.success, true);
  assert.ok(Array.isArray(adminHistoryResponse.body.data));
  assert.ok(adminHistoryResponse.body.data.some((entry) => entry.scopeType === "admin"));
});

test("registered farmer can load backend weather dashboard and weather history", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Phase 9 Weather Farmer ${uniqueSuffix()}`,
    primaryCrop: "Beans",
  });
  const farmerToken = registration.auth.token;

  const createFarmResponse = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${farmerToken}`)
    .send({
      farmName: `Backend Weather Plot ${uniqueSuffix()}`,
      province: "Kigali City",
      district: "Kicukiro District",
      sector: "Gatenga Sector",
      latitude: -1.9983,
      longitude: 30.1038,
      farmSize: 2.9,
      farmSizeUnit: "hectares",
      landType: "Loam",
      soilType: "Loam",
      currentCrop: "Beans",
      cropStage: "Flowering",
      ownershipType: "Farmer managed",
    });

  assert.equal(createFarmResponse.status, 201);
  const farmId = createFarmResponse.body.data.id;

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const target = String(url);

    if (target.includes("archive-api.open-meteo.com")) {
      return new Response(JSON.stringify({
        daily: {
          time: ["2026-05-20", "2026-05-21", "2026-05-22", "2026-05-23", "2026-05-24", "2026-05-25"],
          temperature_2m_max: [27, 28, 27, 26, 25, 24],
          temperature_2m_min: [15, 16, 15, 14, 14, 13],
          precipitation_sum: [2.1, 0.4, 1.3, 3.8, 4.6, 0.9],
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (target.includes("api.open-meteo.com")) {
      return new Response(JSON.stringify({
        current: {
          time: "2026-06-25T09:00",
          temperature_2m: 24.5,
          relative_humidity_2m: 78,
          precipitation: 0.2,
          rain: 0.2,
          weather_code: 61,
          wind_speed_10m: 14,
          wind_direction_10m: 210,
          pressure_msl: 1013,
          visibility: 10000,
        },
        daily: {
          time: ["2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01"],
          weather_code: [61, 3, 2, 80, 0, 63, 1],
          temperature_2m_max: [25, 24, 26, 27, 28, 29, 26],
          temperature_2m_min: [14, 13, 14, 15, 16, 16, 15],
          precipitation_sum: [2.6, 0.4, 0, 3.8, 0, 12.4, 1.3],
          rain_sum: [2.4, 0.2, 0, 3.2, 0, 11.8, 1.1],
          precipitation_probability_max: [64, 18, 5, 72, 2, 88, 25],
          relative_humidity_2m_max: [84, 80, 78, 86, 74, 90, 82],
          wind_speed_10m_max: [18, 16, 14, 24, 21, 33, 19],
          et0_fao_evapotranspiration: [3.1, 3.3, 3.6, 3.8, 4.0, 3.4, 3.0],
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch target: ${target}`);
  };

  try {
    const dashboardResponse = await request(app)
      .get(`/api/weather/farms/${farmId}/dashboard?range=6M`)
      .set("Authorization", `Bearer ${farmerToken}`);

    assert.equal(dashboardResponse.status, 200);
    assert.equal(dashboardResponse.body.success, true);
    assert.equal(dashboardResponse.body.data.sourceMode, "backend");
    assert.equal(dashboardResponse.body.data.sourceLabel, "Live Weather Data");
    assert.ok(Array.isArray(dashboardResponse.body.data.forecastDays));
    assert.equal(dashboardResponse.body.data.forecastDays.length, 7);
    assert.ok(Array.isArray(dashboardResponse.body.data.alerts));
    assert.ok(dashboardResponse.body.data.chartSeries);
    assert.ok(Array.isArray(dashboardResponse.body.data.historicalSeries));
    assert.equal(dashboardResponse.body.data.selectedRange, "6M");

    const historyResponse = await request(app)
      .get(`/api/weather/farms/${farmId}/history?limit=5`)
      .set("Authorization", `Bearer ${farmerToken}`);

    assert.equal(historyResponse.status, 200);
    assert.equal(historyResponse.body.success, true);
    assert.ok(Array.isArray(historyResponse.body.data.snapshots));
    assert.ok(Array.isArray(historyResponse.body.data.archives));
    assert.ok(historyResponse.body.data.snapshots.length >= 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("admin can review farmers and export backend registry metrics", async () => {
  const registration = await registerDemoFarmer({
    fullName: `Approval Workflow Farmer ${uniqueSuffix()}`,
    primaryCrop: "Irish Potato",
  });

  const adminAuth = await login(ADMIN_CREDENTIALS);
  const adminToken = adminAuth.token;

  const listResponse = await request(app)
    .get("/api/farmers")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.success, true);

  const targetFarmer = listResponse.body.data.find(
    (item) => item.user?.email === registration.payload.email
  );

  assert.ok(targetFarmer, "Expected newly registered farmer to appear in admin farmer list.");
  assert.equal(targetFarmer.adminStatus, "Pending");

  const approveResponse = await request(app)
    .put(`/api/farmers/${targetFarmer.id}/approve`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ reason: "QA approval flow verification" });

  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.success, true);
  assert.equal(approveResponse.body.data.verificationStatus, "Verified");
  assert.equal(approveResponse.body.data.adminStatus, "Verified");

  const summaryResponse = await request(app)
    .get("/api/admin/dashboard-summary")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.success, true);
  assert.ok(typeof summaryResponse.body.data.totalFarmers === "number");
  assert.ok(typeof summaryResponse.body.data.verificationRate === "number");
  assert.ok("topRegion" in summaryResponse.body.data);
  assert.ok("multiFarmFarmers" in summaryResponse.body.data);
  assert.ok(Array.isArray(summaryResponse.body.data.regionBreakdown));

  const exportResponse = await request(app)
    .get("/api/admin/farmer-registry-export")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(exportResponse.status, 200);
  assert.equal(exportResponse.body.success, true);
  assert.equal(exportResponse.body.data.mode, "backend");
  assert.ok(Array.isArray(exportResponse.body.data.records));

  const exportRecord = exportResponse.body.data.records.find(
    (record) => record.email === registration.payload.email
  );

  assert.ok(exportRecord, "Expected approved farmer to appear in registry export.");
  assert.equal(exportRecord.adminStatus, "Verified");
  assert.ok("latestActivityAt" in exportRecord);
  assert.ok("hasMultipleFarms" in exportRecord);
});

