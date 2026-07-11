const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

const PRICE_TYPE_CONFIG = {
  Wholesale: { field: "wholesalePrice", historyOldField: "oldWholesale", historyNewField: "newWholesale" },
  Retail: { field: "retailPrice", historyOldField: "oldRetail", historyNewField: "newRetail" },
  "Farm Gate": { field: "farmGatePrice", historyOldField: "oldFarmGate", historyNewField: "newFarmGate" },
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
  return value || "Wheat";
}

function normalizePriceType(priceType = "Wholesale") {
  if (priceType === "Retail") return "Retail";
  if (priceType === "Farm Gate" || priceType === "FarmGate") return "Farm Gate";
  return "Wholesale";
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

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function inferFarmDistrict(farm) {
  const searchSpace = [farm?.district, farm?.sector, farm?.province, farm?.farmName].filter(Boolean).join(" ").toLowerCase();
  const found = RWANDA_MARKET_DIRECTORY.find((market) => searchSpace.includes(market.district.toLowerCase()) || searchSpace.includes(market.name.toLowerCase()));
  return found?.district || farm?.district || "Kicukiro District";
}

function inferFarmProvince(farm) {
  const district = inferFarmDistrict(farm);
  const found = RWANDA_MARKET_DIRECTORY.find((market) => market.district === district);
  return found?.province || farm?.province || "Kigali City";
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

function buildForecastWindows(basePrice, averageChangePct, demandScore) {
  const growth30 = averageChangePct / 100;
  const predicted7 = Math.round(basePrice * (1 + growth30 * 0.35 + (demandScore - 70) * 0.001));
  const predicted30 = Math.round(basePrice * (1 + growth30));
  const predicted90 = Math.round(basePrice * (1 + growth30 * 1.8));
  const confidence = clamp(Math.round(62 + demandScore * 0.22 - Math.abs(averageChangePct) * 1.2), 58, 95);

  return [
    { label: "7 Days", currentPrice: basePrice, predictedPrice: predicted7, forecastChange: Number((((predicted7 - basePrice) / basePrice) * 100).toFixed(1)), confidence },
    { label: "30 Days", currentPrice: basePrice, predictedPrice: predicted30, forecastChange: Number((((predicted30 - basePrice) / basePrice) * 100).toFixed(1)), confidence: clamp(confidence - 4, 52, 92) },
    { label: "90 Days", currentPrice: basePrice, predictedPrice: predicted90, forecastChange: Number((((predicted90 - basePrice) / basePrice) * 100).toFixed(1)), confidence: clamp(confidence - 8, 48, 88) },
  ];
}

async function getLatestHistoryMap(priceIds) {
  if (!priceIds.length) return new Map();
  const histories = await prisma.cropPriceHistory.findMany({
    where: { cropPriceId: { in: priceIds } },
    orderBy: [{ createdAt: "desc" }],
  });

  const map = new Map();
  for (const history of histories) {
    if (!map.has(history.cropPriceId)) {
      map.set(history.cropPriceId, history);
    }
  }
  return map;
}

function buildOfficialPricePayload(record, history, priceType) {
  const normalizedPriceType = normalizePriceType(priceType);
  const config = PRICE_TYPE_CONFIG[normalizedPriceType];
  const currentPrice = record[config.field] != null ? Number(record[config.field]) : null;
  const previousPrice = history?.[config.historyOldField] != null ? Number(history[config.historyOldField]) : normalizedPriceType === "Wholesale" && record.previousPrice != null ? Number(record.previousPrice) : null;
  const percentageChange = previousPrice && currentPrice != null ? Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1)) : previousPrice === 0 && currentPrice != null ? 0 : null;

  return {
    crop: record.cropName,
    market: record.marketName,
    district: record.district,
    priceType: normalizedPriceType,
    currentPrice,
    previousPrice,
    percentageChange,
    currency: record.currency,
    unit: record.unit,
    effectiveDate: record.effectiveDate,
    updatedBy: record.updatedBy?.fullName || record.createdBy?.fullName || "Unknown",
  };
}

async function getOfficialPriceRecords(cropName) {
  const raw = await prisma.cropPrice.findMany({
    where: { cropName, status: "Active" },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      updatedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ effectiveDate: "desc" }, { updatedAt: "desc" }],
  });

  const latestByMarket = new Map();
  for (const record of raw) {
    const key = `${record.marketName}||${record.district}`;
    if (!latestByMarket.has(key)) {
      latestByMarket.set(key, record);
    }
  }

  return [...latestByMarket.values()];
}

async function buildMarketData({ farm, crop, timeframe, priceType = "Wholesale", marketName = "", district = "" }) {
  const normalizedCrop = normalizeCropSelection(crop);
  const normalizedPriceType = normalizePriceType(priceType);
  const officialRecords = await getOfficialPriceRecords(normalizedCrop);

  if (!officialRecords.length) {
    throw new ApiError(404, `No official market price exists yet for ${normalizedCrop}.`);
  }

  const historyMap = await getLatestHistoryMap(officialRecords.map((record) => record.id));
  const farmDistrict = district || inferFarmDistrict(farm);
  const farmProvince = inferFarmProvince(farm);
  const farmLat = Number(farm?.latitude || -1.9441);
  const farmLng = Number(farm?.longitude || 30.0619);

  const markets = officialRecords
    .map((record) => {
      const marketDirectory = RWANDA_MARKET_DIRECTORY.find((market) => market.name === record.marketName) || RWANDA_MARKET_DIRECTORY.find((market) => market.district === record.district) || null;
      const official = buildOfficialPricePayload(record, historyMap.get(record.id), normalizedPriceType);
      const distanceKm = marketDirectory ? haversineKm(farmLat, farmLng, marketDirectory.lat, marketDirectory.lng) : 0;
      const demandScore = clamp(Math.round(68 + (marketDirectory?.access || 72) * 0.18 - distanceKm * 1.1 + (official.currentPrice || 0) / 150), 42, 97);
      const trendChange = official.percentageChange ?? 0;
      const opportunityScore = clamp(Math.round(demandScore * 0.45 + (marketDirectory?.access || 72) * 0.25 + Math.max(0, 100 - distanceKm * 3) * 0.15 + Math.min(100, (official.currentPrice || 0) / 20) * 0.15), 35, 98);

      return {
        id: `${record.id}-${normalizedPriceType}`,
        crop: record.cropName,
        name: record.marketName,
        district: record.district,
        province: marketDirectory?.province || farmProvince,
        distanceKm: Number(distanceKm.toFixed(1)),
        distanceLabel: `${distanceKm.toFixed(1)} km`,
        currentPrice: official.currentPrice,
        previousPrice: official.previousPrice,
        priceType: normalizedPriceType,
        percentageChange: official.percentageChange,
        currentPriceLabel: official.currentPrice != null ? `RWF ${Math.round(official.currentPrice).toLocaleString()} / ${record.unit}` : "--",
        wholesalePrice: Number(record.wholesalePrice || 0),
        retailPrice: Number(record.retailPrice || 0),
        farmGatePrice: record.farmGatePrice != null ? Number(record.farmGatePrice) : null,
        demandScore,
        demandLabel: getDemandLabel(demandScore),
        trendChange,
        trendLabel: getTrendLabel(trendChange),
        accessibilityScore: marketDirectory?.access || 72,
        accessibilityLabel: (marketDirectory?.access || 72) >= 85 ? "Excellent" : (marketDirectory?.access || 72) >= 72 ? "Good" : "Limited",
        recommendation: getRecommendationLabel(opportunityScore),
        opportunityScore,
        routeNote: marketDirectory?.road || "Market route information unavailable.",
        coordinates: { lat: marketDirectory?.lat || farmLat, lng: marketDirectory?.lng || farmLng },
        updatedAt: record.updatedAt,
        effectiveDate: record.effectiveDate,
        updatedBy: official.updatedBy,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const selectedMarket = markets.find((item) => marketName && item.name === marketName)
    || markets.find((item) => item.district === farmDistrict)
    || markets[0];

  const averageChangePct = markets.length
    ? markets.reduce((sum, item) => sum + Number(item.percentageChange || 0), 0) / markets.length
    : 0;
  const forecasts = buildForecastWindows(selectedMarket.currentPrice, averageChangePct, selectedMarket.demandScore);
  const aiDecision = forecasts[0].forecastChange >= 4
    ? "Wait 7 Days"
    : selectedMarket.opportunityScore >= 82
      ? "Sell Now"
      : markets[0]?.currentPrice > selectedMarket.currentPrice
        ? `Route to ${markets[0].name}`
        : "Hold for Monitoring";
  const aiReason = aiDecision === "Wait 7 Days"
    ? `Official ${normalizedPriceType.toLowerCase()} prices are trending upward with a ${forecasts[0].forecastChange}% 7-day outlook.`
    : aiDecision === "Sell Now"
      ? `${selectedMarket.name} currently offers a strong official price with good access and demand.`
      : aiDecision.startsWith("Route to")
        ? `${markets[0].name} currently leads the ranking using official price and access signals.`
        : "Official prices are stable. Continue monitoring before selling.";

  return {
    crop: normalizedCrop,
    district: farmDistrict,
    province: farmProvince,
    priceType: normalizedPriceType,
    selectedMarket: selectedMarket.name,
    officialPrice: {
      crop: normalizedCrop,
      market: selectedMarket.name,
      district: selectedMarket.district,
      priceType: normalizedPriceType,
      currentPrice: selectedMarket.currentPrice,
      previousPrice: selectedMarket.previousPrice,
      percentageChange: selectedMarket.percentageChange,
      currency: "RWF",
      unit: officialRecords[0]?.unit || "kg",
      effectiveDate: selectedMarket.effectiveDate,
      updatedBy: selectedMarket.updatedBy,
    },
    trendBars: Array.from({ length: timeframe === "6M" ? 6 : timeframe === "90D" ? 8 : 10 }, (_, index) => {
      const baseline = 35 + index * 3;
      return clamp(Math.round(baseline + averageChangePct + (index % 3) * 4), 18, 92);
    }),
    forecasts,
    markets,
    bestMarket: markets[0] || selectedMarket,
    aiDecision,
    aiReason,
    aiConfidence: clamp(Math.round((markets[0]?.opportunityScore || 68) * 0.88), 58, 95),
    logisticsTips: [
      `Official ${normalizedPriceType.toLowerCase()} prices are ranked for markets near ${farm.farmName}.`,
      "Transport planning should prefer markets with strong access and confirmed official pricing.",
      "Forecasts are estimated from official price history and should not be confused with the current official price.",
    ],
    platforms: [
      {
        title: "Local Market Platforms",
        description: "Use district-level buyer coordination and cooperative trading boards.",
        actionLabel: "Open Platform",
        href: `https://www.google.com/search?q=${encodeURIComponent(`${farmDistrict} crop market platform Rwanda`)}`,
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
    ],
    currentPrice: selectedMarket.currentPrice,
    previousPrice: selectedMarket.previousPrice,
    percentageChange: selectedMarket.percentageChange,
    demandForecast: selectedMarket.demandScore,
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
    previousPrice: record.previousPrice != null ? Number(record.previousPrice) : null,
    percentageChange: record.percentageChange != null ? Number(record.percentageChange) : null,
    priceType: record.priceType || "Wholesale",
    selectedMarket: record.selectedMarket || "",
    officialPrice: record.officialPrice || null,
    demandForecast: Number(record.demandForecast || 0),
    bestMarket: record.bestMarketName ? (Array.isArray(record.markets) ? record.markets.find((item) => item.name === record.bestMarketName) : null) : null,
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
  const analysis = await buildMarketData({
    farm,
    crop: payload.crop,
    timeframe: payload.timeframe || "30D",
    priceType: payload.priceType || "Wholesale",
    marketName: payload.marketName || "",
    district: payload.district || "",
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
      priceType: analysis.priceType,
      selectedMarket: analysis.selectedMarket,
    },
  });

  return mapMarketAnalysisRecord(created);
}

async function getLatestMarketAnalysis(user, farmId, params = {}) {
  const farm = await ensureFarmAccess(user, farmId);

  if (params.crop) {
    return buildMarketData({
      farm,
      crop: params.crop,
      timeframe: params.timeframe || "30D",
      priceType: params.priceType || "Wholesale",
      marketName: params.marketName || "",
      district: params.district || "",
    });
  }

  const record = await prisma.marketAnalysis.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
  });

  return mapMarketAnalysisRecord(record);
}

async function listMarketAlerts(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const alerts = await prisma.marketAlert.findMany({ where: { farmId }, orderBy: [{ createdAt: "desc" }] });
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
    details: { farmName: farm.farmName, crop: alert.cropName, targetPrice: alert.targetPrice },
  });

  return mapMarketAlertRecord(alert);
}

async function deleteMarketAlert(user, alertId) {
  const alert = await prisma.marketAlert.findUnique({
    where: { id: alertId },
    include: { farm: { include: { farmerProfile: { include: { user: true } } } } },
  });

  if (!alert) {
    throw new ApiError(404, "Market alert not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = alert.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to delete this market alert.");
  }

  await prisma.marketAlert.delete({ where: { id: alertId } });

  await createAuditLog({
    actorUserId: user.id,
    action: "MARKET_ALERT_DELETED",
    entityType: "MarketAlert",
    entityId: alertId,
    details: { crop: alert.cropName, targetPrice: alert.targetPrice },
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
