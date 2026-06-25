const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

const CROP_MARKET_PROFILE = {
  Wheat: { current: 860, volatility: 0.08, growth30: 0.05, demand: 74, export: 980, wholesale: 790 },
  Corn: { current: 680, volatility: 0.06, growth30: 0.04, demand: 78, export: 760, wholesale: 620 },
  Soybeans: { current: 930, volatility: 0.07, growth30: 0.06, demand: 81, export: 1020, wholesale: 870 },
  Rice: { current: 1420, volatility: 0.05, growth30: 0.03, demand: 68, export: 1560, wholesale: 1320 },
  Barley: { current: 720, volatility: 0.05, growth30: 0.02, demand: 60, export: 790, wholesale: 660 },
  Beans: { current: 980, volatility: 0.09, growth30: 0.07, demand: 84, export: 1080, wholesale: 910 },
  "Irish Potato": { current: 520, volatility: 0.11, growth30: 0.03, demand: 79, export: 610, wholesale: 470 },
  "Sweet Potato": { current: 460, volatility: 0.07, growth30: 0.02, demand: 71, export: 530, wholesale: 410 },
  Cassava: { current: 430, volatility: 0.06, growth30: 0.01, demand: 66, export: 500, wholesale: 390 },
  Sorghum: { current: 610, volatility: 0.05, growth30: 0.03, demand: 64, export: 690, wholesale: 560 },
  Banana: { current: 380, volatility: 0.1, growth30: 0.02, demand: 77, export: 430, wholesale: 340 },
  Plantain: { current: 420, volatility: 0.09, growth30: 0.025, demand: 76, export: 470, wholesale: 380 },
  Groundnuts: { current: 1450, volatility: 0.08, growth30: 0.05, demand: 83, export: 1580, wholesale: 1360 },
  Peas: { current: 890, volatility: 0.07, growth30: 0.04, demand: 67, export: 960, wholesale: 820 },
  Coffee: { current: 2100, volatility: 0.06, growth30: 0.08, demand: 88, export: 2380, wholesale: 1950 },
  Tea: { current: 1750, volatility: 0.05, growth30: 0.05, demand: 85, export: 1940, wholesale: 1620 },
};

const RWANDA_MARKET_DIRECTORY = [
  { name: "Nyamata Market", district: "Bugesera District", province: "Eastern Province", lat: -2.1405, lng: 30.1022, access: 88, road: "Paved highway access" },
  { name: "Gako Market", district: "Bugesera District", province: "Eastern Province", lat: -2.1754, lng: 30.1035, access: 76, road: "Good feeder-road access" },
  { name: "Ruhuha Market", district: "Bugesera District", province: "Eastern Province", lat: -2.2392, lng: 30.1936, access: 69, road: "Seasonal feeder access" },
  { name: "Zinia Market", district: "Kicukiro District", province: "Kigali City", lat: -1.9838, lng: 30.1014, access: 82, road: "Urban collector road" },
  { name: "Kanserege Market", district: "Kicukiro District", province: "Kigali City", lat: -1.9927, lng: 30.1086, access: 78, road: "Mixed traffic route" },
  { name: "Kicukiro New Modern Market", district: "Kicukiro District", province: "Kigali City", lat: -1.9704, lng: 30.1059, access: 91, road: "Modern wholesale entry" },
  { name: "Nyabugogo Market", district: "Nyarugenge District", province: "Kigali City", lat: -1.9446, lng: 30.0619, access: 89, road: "Major truck route" },
  { name: "Kimironko Market", district: "Gasabo District", province: "Kigali City", lat: -1.944, lng: 30.1131, access: 87, road: "High-volume urban market" },
  { name: "Musanze Main Market", district: "Musanze District", province: "Northern Province", lat: -1.4996, lng: 29.6344, access: 84, road: "Regional collector point" },
  { name: "Kinigi Exchange Point", district: "Musanze District", province: "Northern Province", lat: -1.4328, lng: 29.5874, access: 67, road: "Mountain access road" },
  { name: "Huye Central Market", district: "Huye District", province: "Southern Province", lat: -2.5967, lng: 29.7394, access: 83, road: "Reliable district road" },
  { name: "Ngoma Trading Point", district: "Huye District", province: "Southern Province", lat: -2.6125, lng: 29.7488, access: 72, road: "Good but slower loading access" },
  { name: "Rubavu Border Market", district: "Rubavu District", province: "Western Province", lat: -1.679, lng: 29.2589, access: 86, road: "Border trade route" },
  { name: "Gisenyi Produce Market", district: "Rubavu District", province: "Western Province", lat: -1.7026, lng: 29.2579, access: 80, road: "Urban + border route" },
  { name: "Rwamagana Market", district: "Rwamagana District", province: "Eastern Province", lat: -1.9499, lng: 30.4347, access: 79, road: "District aggregation route" },
  { name: "Kigabiro Trading Hub", district: "Rwamagana District", province: "Eastern Province", lat: -1.9524, lng: 30.4416, access: 74, road: "Cooperative buyer route" },
  { name: "Kayonza Market", district: "Kayonza District", province: "Eastern Province", lat: -1.8772, lng: 30.6451, access: 81, road: "Processor route access" },
  { name: "Mukarange Collection Point", district: "Kayonza District", province: "Eastern Province", lat: -1.8779, lng: 30.6507, access: 71, road: "Feeder-road aggregation point" },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCropSelection(value) {
  if (value === "Maize" || value === "Hybrid Corn") return "Corn";
  if (value === "Bush Beans" || value === "Climbing Beans") return "Beans";
  if (value === "Potato" || value === "Potatoes") return "Irish Potato";
  if (value === "Groundnut" || value === "Peanut" || value === "Peanuts") return "Groundnuts";
  if (value === "Green Banana" || value === "Matoke") return "Banana";
  return CROP_MARKET_PROFILE[value] ? value : "Wheat";
}

function inferFarmDistrict(farm) {
  const searchSpace = [farm?.district, farm?.sector, farm?.province, farm?.farmName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const found = RWANDA_MARKET_DIRECTORY.find((market) =>
    searchSpace.includes(market.district.toLowerCase()) || searchSpace.includes(market.name.toLowerCase())
  );
  return found?.district || farm?.district || "Kicukiro District";
}

function inferFarmProvince(farm) {
  const district = inferFarmDistrict(farm);
  const found = RWANDA_MARKET_DIRECTORY.find((market) => market.district === district);
  return found?.province || farm?.province || "Kigali City";
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getDemandLabel(score) {
  if (score >= 82) return "High";
  if (score >= 68) return "Medium";
  return "Low";
}

function getTrendLabel(changePct) {
  if (changePct >= 7) return "Rising Fast";
  if (changePct >= 2) return "Rising";
  if (changePct <= -6) return "Falling";
  return "Stable";
}

function getRecommendationLabel(score) {
  if (score >= 82) return "Best Choice";
  if (score >= 70) return "Good Option";
  if (score >= 55) return "Moderate";
  return "Avoid";
}

function buildForecastWindows(basePrice, growth30, volatility, demandScore) {
  const growth7 = growth30 * 0.35 + (demandScore - 70) * 0.001;
  const growth90 = growth30 * 2.1 - volatility * 0.15;
  const predicted7 = Math.round(basePrice * (1 + growth7));
  const predicted30 = Math.round(basePrice * (1 + growth30));
  const predicted90 = Math.round(basePrice * (1 + growth90));
  const confidence = clamp(Math.round(62 + demandScore * 0.22 - volatility * 90), 58, 95);

  return [
    {
      label: "7 Days",
      currentPrice: basePrice,
      predictedPrice: predicted7,
      forecastChange: Number((((predicted7 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence,
    },
    {
      label: "30 Days",
      currentPrice: basePrice,
      predictedPrice: predicted30,
      forecastChange: Number((((predicted30 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence: clamp(confidence - 4, 52, 92),
    },
    {
      label: "90 Days",
      currentPrice: basePrice,
      predictedPrice: predicted90,
      forecastChange: Number((((predicted90 - basePrice) / basePrice) * 100).toFixed(1)),
      confidence: clamp(confidence - 8, 48, 88),
    },
  ];
}

function createMapEmbedUrl(farm, markets) {
  const farmLat = Number(farm?.latitude || -1.9441);
  const farmLng = Number(farm?.longitude || 30.0619);
  const lats = [farmLat, ...markets.map((market) => market.coordinates.lat)];
  const lngs = [farmLng, ...markets.map((market) => market.coordinates.lng)];
  const minLat = Math.min(...lats) - 0.03;
  const maxLat = Math.max(...lats) + 0.03;
  const minLng = Math.min(...lngs) - 0.03;
  const maxLng = Math.max(...lngs) + 0.03;
  const bbox = [minLng, minLat, maxLng, maxLat].map((value) => value.toFixed(4)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${farmLat.toFixed(4)}%2C${farmLng.toFixed(4)}`;
}

function buildMarketData({ farm, crop, timeframe }) {
  const normalizedCrop = normalizeCropSelection(crop);
  const profile = CROP_MARKET_PROFILE[normalizedCrop] || CROP_MARKET_PROFILE.Wheat;
  const district = inferFarmDistrict(farm);
  const province = inferFarmProvince(farm);
  const farmLat = Number(farm?.latitude || -1.9441);
  const farmLng = Number(farm?.longitude || 30.0619);
  const seed = Math.round(Math.abs(farmLat) * 100 + Math.abs(farmLng) * 100 + Number(farm?.farmSize || 0));

  const candidateMarkets = RWANDA_MARKET_DIRECTORY.filter(
    (market) => market.district === district || market.province === province
  );

  const markets = candidateMarkets
    .map((market, index) => {
      const distanceKm = haversineKm(farmLat, farmLng, market.lat, market.lng);
      const priceVariance = ((seed + index * 9) % 45) - 18;
      const currentPrice = profile.current + priceVariance;
      const demandScore = clamp(profile.demand + (market.access - 75) * 0.35 - distanceKm * 1.4, 42, 97);
      const trendChange = Number((profile.growth30 * 100 + ((seed + index * 7) % 6) - 2).toFixed(1));
      const distanceScore = clamp(100 - distanceKm * 4.2, 18, 100);
      const accessScore = market.access;
      const opportunityScore = Math.round(
        currentPrice * 0.4 * (100 / (profile.current * 1.35)) +
        demandScore * 0.3 +
        distanceScore * 0.2 +
        accessScore * 0.1
      );

      return {
        id: `${market.name}-${normalizedCrop}`,
        name: market.name,
        district: market.district,
        province: market.province,
        distanceKm: Number(distanceKm.toFixed(1)),
        distanceLabel: `${distanceKm.toFixed(1)} km`,
        currentPrice,
        demandScore: Math.round(demandScore),
        demandLabel: getDemandLabel(demandScore),
        trendChange,
        trendLabel: getTrendLabel(trendChange),
        accessibilityScore: accessScore,
        accessibilityLabel: accessScore >= 85 ? "Excellent" : accessScore >= 72 ? "Good" : "Limited",
        recommendation: getRecommendationLabel(opportunityScore),
        opportunityScore: clamp(opportunityScore, 35, 98),
        routeNote: market.road,
        coordinates: { lat: market.lat, lng: market.lng },
        wholesalePrice: profile.wholesale + Math.round(priceVariance * 0.85),
        exportPrice: profile.export + Math.round(priceVariance * 1.15),
        updatedAt: new Date().toISOString(),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const basePrice = Math.round(
    markets.reduce((sum, market) => sum + market.currentPrice, 0) / Math.max(markets.length, 1)
  );
  const trendLength = timeframe === "6M" ? 6 : timeframe === "90D" ? 8 : 10;
  const trendBars = Array.from({ length: trendLength }, (_, index) => {
    const seasonal = Math.sin((index + seed / 8) * 0.7) * 7;
    const drift = profile.growth30 * 100 * (index / trendLength) * 1.1;
    return Math.round(30 + seasonal + drift + (profile.demand - 60) * 0.22);
  });

  const forecasts = buildForecastWindows(basePrice, profile.growth30, profile.volatility, profile.demand);
  const bestMarket = markets[0] || null;
  const aiDecision =
    forecasts[0].forecastChange >= 4
      ? "Wait 7 Days"
      : profile.export > basePrice * 1.22 && bestMarket?.province !== "Kigali City"
        ? "Export Opportunity"
        : bestMarket?.opportunityScore >= 82
          ? "Sell Now"
          : "Wait 14 Days";

  const aiReason =
    aiDecision === "Wait 7 Days"
      ? `Demand forecast is increasing and prices are expected to rise by ${forecasts[0].forecastChange}%.`
      : aiDecision === "Export Opportunity"
        ? "Export and wholesale spreads are strong enough to justify a premium selling channel."
        : aiDecision === "Sell Now"
          ? `${bestMarket?.name || "Top market"} currently offers the strongest score with good access and price.`
          : "Current signals are stable, but a later window may improve margin if transport is planned well.";

  const logisticsTips = [
    `Nearest district markets for ${district} are ranked by opportunity and route distance from ${farm.farmName}.`,
    "Prioritize markets with good accessibility during rainy periods to reduce spoilage and delay.",
    "Bulk loads above 8 tons should compare wholesale and export channels before dispatch.",
  ];

  const platforms = [
    {
      title: "Local Market Platforms",
      description: "Use district-level buyer coordination and cooperative trading boards.",
      actionLabel: "Open Platform",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${district} crop market platform Rwanda`)}`,
    },
    {
      title: "Wholesale Platforms",
      description: "Review larger buyer networks and transport-backed aggregation channels.",
      actionLabel: "Visit Market Website",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${normalizedCrop} wholesale buyers Rwanda`)}`,
    },
    {
      title: "Export Platforms",
      description: "Benchmark export buyers and cross-border opportunity channels.",
      actionLabel: "Open Platform",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${normalizedCrop} export buyers Rwanda`)}`,
    },
  ];

  return {
    crop: normalizedCrop,
    district,
    province,
    trendBars,
    forecasts,
    markets,
    bestMarket,
    aiDecision,
    aiReason,
    aiConfidence: clamp(Math.round((bestMarket?.opportunityScore || 68) * 0.88), 58, 95),
    logisticsTips,
    platforms,
    currentPrice: basePrice,
    demandForecast: clamp(
      Math.round(markets.reduce((sum, market) => sum + market.demandScore, 0) / Math.max(markets.length, 1)),
      40,
      96
    ),
    mapUrl: createMapEmbedUrl(farm, markets),
  };
}

function mapMarketAnalysisRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    farmId: record.farmId,
    crop: record.cropName,
    timeframe: record.timeframe,
    district: record.district,
    province: record.province,
    currentPrice: Number(record.currentPrice || 0),
    demandForecast: Number(record.demandForecast || 0),
    bestMarket: record.bestMarketName
      ? (Array.isArray(record.markets) ? record.markets.find((item) => item.name === record.bestMarketName) : null)
      : null,
    aiDecision: record.aiDecision,
    aiReason: record.aiReason,
    aiConfidence: Number(record.aiConfidence || 0),
    trendBars: Array.isArray(record.trendBars) ? record.trendBars : [],
    forecasts: Array.isArray(record.forecasts) ? record.forecasts : [],
    markets: Array.isArray(record.markets) ? record.markets : [],
    logisticsTips: Array.isArray(record.logisticsTips) ? record.logisticsTips : [],
    platforms: Array.isArray(record.platforms) ? record.platforms : [],
    mapUrl: record.mapUrl || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapMarketAlertRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    crop: record.cropName,
    targetPrice: Number(record.targetPrice || 0),
    currentPrice: Number(record.currentPrice || 0),
    bestMarketName: record.bestMarketName || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
    farmId: record.farmId,
  };
}

async function analyzeMarket(user, farmId, payload) {
  const farm = await ensureFarmAccess(user, farmId);
  const analysis = buildMarketData({
    farm,
    crop: payload.crop,
    timeframe: payload.timeframe || "30D",
  });

  const created = await prisma.marketAnalysis.create({
    data: {
      farmId,
      cropName: analysis.crop,
      timeframe: payload.timeframe || "30D",
      district: analysis.district,
      province: analysis.province,
      currentPrice: analysis.currentPrice,
      demandForecast: analysis.demandForecast,
      bestMarketName: analysis.bestMarket?.name || null,
      aiDecision: analysis.aiDecision,
      aiReason: analysis.aiReason,
      aiConfidence: analysis.aiConfidence,
      trendBars: analysis.trendBars,
      forecasts: analysis.forecasts,
      markets: analysis.markets,
      logisticsTips: analysis.logisticsTips,
      platforms: analysis.platforms,
      mapUrl: analysis.mapUrl,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "MARKET_ANALYSIS_GENERATED",
    entityType: "MarketAnalysis",
    entityId: created.id,
    details: {
      farmName: farm.farmName,
      crop: analysis.crop,
      timeframe: payload.timeframe || "30D",
    },
  });

  return mapMarketAnalysisRecord(created);
}

async function getLatestMarketAnalysis(user, farmId, { crop, timeframe } = {}) {
  await ensureFarmAccess(user, farmId);
  const record = await prisma.marketAnalysis.findFirst({
    where: {
      farmId,
      ...(crop ? { cropName: normalizeCropSelection(crop) } : {}),
      ...(timeframe ? { timeframe } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return mapMarketAnalysisRecord(record);
}

async function listMarketAlerts(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const alerts = await prisma.marketAlert.findMany({
    where: { farmId },
    orderBy: [{ createdAt: "desc" }],
  });
  return alerts.map(mapMarketAlertRecord);
}

async function createMarketAlert(user, farmId, payload) {
  const farm = await ensureFarmAccess(user, farmId);
  const alert = await prisma.marketAlert.create({
    data: {
      farmId,
      cropName: normalizeCropSelection(payload.crop),
      targetPrice: Number(payload.targetPrice || 0),
      currentPrice: Number(payload.currentPrice || 0),
      bestMarketName: payload.bestMarketName || null,
      status: payload.status || (Number(payload.targetPrice || 0) <= Number(payload.currentPrice || 0) ? "Target reached" : "Monitoring"),
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "MARKET_ALERT_CREATED",
    entityType: "MarketAlert",
    entityId: alert.id,
    details: {
      farmName: farm.farmName,
      crop: alert.cropName,
      targetPrice: alert.targetPrice,
    },
  });

  return mapMarketAlertRecord(alert);
}

async function deleteMarketAlert(user, alertId) {
  const alert = await prisma.marketAlert.findUnique({
    where: { id: alertId },
    include: {
      farm: {
        include: {
          farmerProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!alert) {
    throw new ApiError(404, "Market alert not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = alert.farm?.farmerProfile?.userId === user.id;

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to delete this market alert.");
  }

  await prisma.marketAlert.delete({
    where: { id: alertId },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "MARKET_ALERT_DELETED",
    entityType: "MarketAlert",
    entityId: alertId,
    details: {
      crop: alert.cropName,
      targetPrice: alert.targetPrice,
    },
  });

  return { deleted: true, id: alertId };
}

module.exports = {
  analyzeMarket,
  getLatestMarketAnalysis,
  listMarketAlerts,
  createMarketAlert,
  deleteMarketAlert,
};
