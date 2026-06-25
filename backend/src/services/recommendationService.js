const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

const SOIL_FALLBACKS = {
  Beans: { moisture: 34, ph: 6.4, nitrogen: "Moderate", phosphorus: "Good", potassium: "Low", deficiency: "Potassium deficiency severity is moderate." },
  Almonds: { moisture: 28, ph: 6.9, nitrogen: "Good", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Phosphorus tightening is limiting yield gains." },
  "Hybrid Corn": { moisture: 24, ph: 5.9, nitrogen: "Low", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Nitrogen deficit is the main production constraint." },
  Maize: { moisture: 27, ph: 6.1, nitrogen: "Low", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Nitrogen deficits are constraining canopy expansion." },
  default: { moisture: 29, ph: 6.2, nitrogen: "Moderate", phosphorus: "Moderate", potassium: "Moderate", deficiency: "Balanced inputs are still needed for stronger yield confidence." },
};

const MARKET_FALLBACKS = {
  Beans: { currentPrice: 980, trend: "Increasing", demand: "High", opportunity: "School feeding demand is increasing for beans this month." },
  Almonds: { currentPrice: 2400, trend: "Stable", demand: "Moderate", opportunity: "Premium buyers prefer sorted dry kernels for export-grade contracts." },
  "Hybrid Corn": { currentPrice: 680, trend: "Increasing", demand: "High", opportunity: "Feed processors are expanding intake ahead of dry-season stocking." },
  Maize: { currentPrice: 720, trend: "Increasing", demand: "High", opportunity: "Feed mill demand remains strong ahead of dry-season stock building." },
  default: { currentPrice: 820, trend: "Stable", demand: "Moderate", opportunity: "Market access remains fair with moderate demand." },
};

const PEST_FALLBACKS = {
  Beans: { current: "Medium", threat: "Aphid pressure rising in neighboring vegetable blocks.", districtTrend: "Increasing" },
  Almonds: { current: "Low", threat: "Low orchard pest pressure with isolated leaf miner reports.", districtTrend: "Stable" },
  "Hybrid Corn": { current: "High", threat: "Fall armyworm risk is elevated in warm cereal zones.", districtTrend: "Increasing" },
  Maize: { current: "High", threat: "Fall armyworm pressure remains elevated in maize blocks.", districtTrend: "Increasing" },
  default: { current: "Medium", threat: "Mixed disease watch due to changing humidity patterns.", districtTrend: "Stable" },
};

const COMMUNITY_FALLBACKS = {
  "Gatenga Sector, Kicukiro District, Kigali City": "Extension officers in Gatenga are validating moisture-conservation and fertilizer-split practices.",
  "Nyamata Sector, Bugesera District, Eastern Province": "Bugesera extension groups recommend conservative irrigation and tighter pest scouting this week.",
  "Musanze District, Northern Province": "Musanze agronomists recommend tighter pest scouting around humid blocks this week.",
  "Rwamagana District, Eastern Province": "Rwamagana farmer groups are sharing drought-buffer irrigation practices for maize plots.",
  default: "Validated local best practices are available through the community advisory stream.",
};

const PRIORITY_RANK = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatRwf(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getPriorityLevel(score) {
  if (score >= 88) return "Critical";
  if (score >= 76) return "High";
  if (score >= 62) return "Medium";
  return "Low";
}

function getDemandLabel(score) {
  if (score >= 80) return "High";
  if (score >= 66) return "Moderate";
  return "Low";
}

function toTitleStatus(status = "") {
  const normalized = String(status).trim();
  if (!normalized) return "Generated";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getGrowthStage(farm, weather) {
  const crop = farm?.currentCrop || "";
  if (crop.includes("Corn") || crop.includes("Maize")) return weather.rainProbability < 20 ? "Flowering" : "Vegetative";
  if (crop.includes("Beans")) return weather.rainfall < 3 ? "Pod Fill" : "Vegetative";
  if (crop.includes("Almond")) return "Nut Development";
  return farm?.cropStage || "Field Monitoring";
}

function buildFallbackWeather(farm) {
  const label = [farm?.sector, farm?.district, farm?.province].filter(Boolean).join(", ");
  if (label.includes("Gatenga")) {
    return { temperature: 24, humidity: 76, rainProbability: 18, rainfall: 1.2, wind: 14 };
  }
  if (label.includes("Musanze")) {
    return { temperature: 21, humidity: 83, rainProbability: 52, rainfall: 9.4, wind: 11 };
  }
  if (label.includes("Rwamagana")) {
    return { temperature: 27, humidity: 61, rainProbability: 12, rainfall: 0.4, wind: 16 };
  }
  return { temperature: 25, humidity: 70, rainProbability: 28, rainfall: 2.3, wind: 13 };
}

function mapSoilLevel(value, type) {
  if (type === "ph") {
    return value >= 6 && value <= 7 ? "Balanced" : value < 6 ? "Low" : "Moderate";
  }
  if (type === "nitrogen") {
    return value >= 50 ? "Good" : value >= 35 ? "Moderate" : "Low";
  }
  if (type === "phosphorus") {
    return value >= 26 ? "Good" : value >= 18 ? "Moderate" : "Low";
  }
  if (type === "potassium") {
    return value >= 30 ? "Good" : value >= 22 ? "Moderate" : "Low";
  }
  return "Moderate";
}

function buildSoilSnapshot(farm, latestSoilTest) {
  if (!latestSoilTest) {
    return {
      ...(SOIL_FALLBACKS[farm.currentCrop] || SOIL_FALLBACKS.default),
      sourceLabel: "Local Soil Data",
      sourceMode: "fallback",
    };
  }

  const potassiumLabel = mapSoilLevel(Number(latestSoilTest.potassium || 0), "potassium");
  const nitrogenLabel = mapSoilLevel(Number(latestSoilTest.nitrogen || 0), "nitrogen");

  return {
    moisture: clamp(Math.round(26 + Number(latestSoilTest.organicMatter || 0) * 3), 18, 48),
    ph: Number(latestSoilTest.ph || 6.2),
    nitrogen: nitrogenLabel,
    phosphorus: mapSoilLevel(Number(latestSoilTest.phosphorus || 0), "phosphorus"),
    potassium: potassiumLabel,
    deficiency:
      potassiumLabel === "Low"
        ? "Potassium remains below the preferred production threshold."
        : nitrogenLabel === "Low"
          ? "Nitrogen remains below the preferred production threshold."
          : "Field nutrient balance remains moderate and should still be monitored.",
    sourceLabel: "Local Soil Data",
    sourceMode: "soil-test",
  };
}

function buildMarketSnapshot(farm, latestMarket) {
  if (latestMarket) {
    return {
      currentPrice: Number(latestMarket.currentPrice || 0),
      trend:
        latestMarket.forecasts?.[0]?.forecastChange >= 4
          ? "Increasing"
          : latestMarket.forecasts?.[0]?.forecastChange <= -4
            ? "Declining"
            : "Stable",
      demand: getDemandLabel(Number(latestMarket.demandForecast || 0)),
      opportunity:
        latestMarket.aiReason ||
        `${latestMarket.bestMarketName || "Nearby market"} currently offers the strongest trade signal.`,
      sourceLabel: "Demo Market Data",
      sourceMode: "market-backend",
    };
  }

  return {
    ...(MARKET_FALLBACKS[farm.currentCrop] || MARKET_FALLBACKS.default),
    sourceLabel: "Demo Market Data",
    sourceMode: "fallback",
  };
}

function buildPestSnapshot(farm, latestPest) {
  if (latestPest) {
    return {
      current: latestPest.currentRisk || "Medium",
      threat:
        latestPest.explanation?.weatherReason ||
        latestPest.problemDetected ||
        `Recent diagnosis suggests ${latestPest.diseaseName || "pest pressure"} should be watched closely.`,
      districtTrend:
        latestPest.outbreakForecast?.predictedRisk === "High" || latestPest.forecastRisk === "High"
          ? "Increasing"
          : "Stable",
      sourceLabel: "Demo Pest Data",
      sourceMode: "pest-backend",
    };
  }

  return {
    ...(PEST_FALLBACKS[farm.currentCrop] || PEST_FALLBACKS.default),
    sourceLabel: "Demo Pest Data",
    sourceMode: "fallback",
  };
}

function summarizeFeedback(feedbackEntries = []) {
  return feedbackEntries.reduce(
    (accumulator, entry) => {
      const status = String(entry.feedbackStatus || "").toLowerCase();
      if (status === "approved" || status === "applied" || status === "completed") {
        accumulator.positive += 1;
      } else if (status === "rejected") {
        accumulator.negative += 1;
      } else {
        accumulator.neutral += 1;
      }
      return accumulator;
    },
    { positive: 0, negative: 0, neutral: 0 },
  );
}

function buildRecommendationSet({ farm, farmerName, weather, soil, market, pest, community, feedbackStats }) {
  const crop = farm?.currentCrop || "Mixed Crops";
  const stage = getGrowthStage(farm, weather);
  const region = [farm?.sector, farm?.district, farm?.province].filter(Boolean).join(", ") || "Rwanda Demo Zone";
  const generatedAt = new Date().toISOString();
  const farmSize = Number(farm?.farmSize || 1);
  const rainfallGap = Math.max(0, 22 - Number(weather.rainfall || 0));
  const irrigationDelta = Math.max(8, Math.round(rainfallGap * 1.8 + (Number(weather.temperature || 0) - 20)));
  const fertilizerGap = soil.potassium === "Low" ? 18 : soil.nitrogen === "Low" ? 14 : 8;
  const marketLift = market.trend === "Increasing" ? 6 : market.trend === "Declining" ? -4 : 2;
  const feedbackBias = clamp((feedbackStats.positive - feedbackStats.negative) * 2, -8, 10);

  return [
    {
      id: `${farm?.id || "farm"}-irrigation`,
      title: `Increase irrigation support for ${crop}`,
      category: "irrigation",
      priority: getPriorityLevel(82 + (Number(weather.rainProbability || 0) < 20 ? 8 : 0)),
      confidence: clamp(Math.min(96, 78 + irrigationDelta / 2 + feedbackBias), 52, 98),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      workflowStatus: "Generated",
      problemDetected: `Moisture gap emerging during ${stage.toLowerCase()}.`,
      description: `Rainfall remains below the comfort threshold and evapotranspiration pressure is increasing on ${farm?.farmName || "the active field"}.`,
      expectedImpact: [`Protect up to ${Math.round(farmSize * 110)} kg yield equivalent`, "Lower moisture stress", "Improve irrigation efficiency"],
      reasoning: {
        soil: `Soil moisture is ${soil.moisture}% with ${soil.deficiency}`,
        weather: `Temperature is ${weather.temperature}°C, humidity ${weather.humidity}%, rain probability ${weather.rainProbability}%, and rainfall only ${weather.rainfall} mm.`,
        market: `Maintaining crop quality matters because ${crop} is trading at about ${formatRwf(market.currentPrice)} and demand is ${String(market.demand).toLowerCase()}.`,
        stage: `${crop} is currently in ${stage.toLowerCase()}, when yield response to water stress is high.`,
        confidence: "Confidence combines soil moisture stress, rainfall deficit, crop stage sensitivity, current market value preservation, and prior farmer feedback.",
      },
      scientificReferences: [
        "FAO crop water management guidance",
        "Open-Meteo live weather observations",
        "Local irrigation scheduling heuristics",
      ],
      historicalCases: [
        "Similar irrigation increase reduced flowering stress in Bugesera bean plots last season.",
        "Moisture-timed irrigation improved orchard nut retention in monitored blocks.",
      ],
      recommendedAction: `Increase irrigation volume by ${irrigationDelta}% and shift watering to early morning.`,
      expectedOutcome: "Reduced moisture stress and stronger yield stability over the next 7 days.",
      comparison: "Historical cases show yield protection when irrigation volume increases before stress becomes visible.",
      primaryDriver: "Soil + Weather + Market",
      urgency: Number(weather.rainProbability || 0) < 20 ? "High" : "Medium",
      confidenceBreakdown: {
        soilWeight: 34,
        weatherWeight: 36,
        marketWeight: 20,
        feedbackWeight: 10,
      },
    },
    {
      id: `${farm?.id || "farm"}-soil`,
      title: `Correct nutrient balance before yield loss expands`,
      category: "soil",
      priority: getPriorityLevel(74 + fertilizerGap / 2),
      confidence: clamp(Math.min(94, 72 + fertilizerGap + feedbackBias), 50, 97),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Pending Review",
      workflowStatus: "Generated",
      problemDetected: `Nutrient imbalance detected for ${crop}.`,
      description: `The nutrient profile suggests ${String(soil.deficiency).toLowerCase()} which can reduce crop vigor under current field demand.`,
      expectedImpact: ["Improved nutrient uptake", "Better root strength", "Reduced hidden yield loss"],
      reasoning: {
        soil: `pH is ${soil.ph} with nitrogen ${soil.nitrogen}, phosphorus ${soil.phosphorus}, and potassium ${soil.potassium}.`,
        weather: "Moderate humidity and intermittent rainfall mean nutrient timing should be carefully staged to avoid runoff.",
        market: `A stronger nutrient response supports product quality when market demand is ${String(market.demand).toLowerCase()}.`,
        stage: `${stage} is a decisive stage for nutrient conversion into yield.`,
        confidence: "Confidence is weighted by deficiency severity, crop nutrient demand, weather suitability for application, profitability gain, and prior farmer feedback.",
      },
      scientificReferences: [
        "Soil and crop nutrient interpretation rules",
        "Stored soil test thresholds",
        "RAB fertilizer timing guidance",
      ],
      historicalCases: [
        "Potassium correction improved pod fill performance in Gatenga demo plots.",
        "Split nutrient application reduced leaching losses in monitored highland farms.",
      ],
      recommendedAction: `Apply a staged nutrient correction focused on ${soil.potassium === "Low" ? "potassium" : soil.nitrogen === "Low" ? "nitrogen" : "balanced NPK"} within the next 5 days.`,
      expectedOutcome: "Higher nutrient efficiency and improved crop stability before the next production stage.",
      comparison: "Historical advisory outcomes show stronger success when nutrient correction is applied before visible stress symptoms appear.",
      primaryDriver: "Soil + Weather + Market",
      urgency: soil.potassium === "Low" || soil.nitrogen === "Low" ? "High" : "Medium",
      confidenceBreakdown: {
        soilWeight: 42,
        weatherWeight: 24,
        marketWeight: 22,
        feedbackWeight: 12,
      },
    },
    {
      id: `${farm?.id || "farm"}-pest`,
      title: `Escalate scouting for ${String(pest.current).toLowerCase()} pest pressure`,
      category: "pests",
      priority: pest.current === "High" ? "Critical" : pest.current === "Medium" ? "High" : "Medium",
      confidence: clamp(pest.current === "High" ? 89 + feedbackBias : pest.current === "Medium" ? 82 + feedbackBias : 68 + feedbackBias, 48, 97),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      workflowStatus: "Generated",
      problemDetected: `${pest.threat}`,
      description: `Weather-linked pest intelligence indicates that ${crop.toLowerCase()} blocks in ${region} need closer scouting and faster field response.`,
      expectedImpact: ["Lower pest-related yield loss", "Early detection advantage", "Reduced emergency spray cost"],
      reasoning: {
        soil: "Crop vigor and nutrient balance influence plant resilience and post-attack recovery.",
        weather: `Humidity at ${weather.humidity}% and temperature at ${weather.temperature}°C create favorable windows for rapid pest progression.`,
        market: `Protecting crop quality is important because market opportunity remains ${String(market.trend).toLowerCase()}.`,
        stage: `${stage} increases sensitivity to pest injury on reproductive tissue and canopy health.`,
        confidence: "Confidence blends weather suitability, crop vulnerability, prior outbreak patterns, and current advisory signals.",
      },
      scientificReferences: [
        "Integrated pest management advisory logic",
        "Regional outbreak history",
        "Community validated scouting practices",
      ],
      historicalCases: [
        "Early scouting reduced fall armyworm treatment cost in Rwamagana maize plots.",
        "Aphid control thresholds improved bean quality in Kicukiro demonstration farms.",
      ],
      recommendedAction: "Scout the field within 48 hours, inspect leaf undersides and crop whorls, and prepare targeted intervention if thresholds are reached.",
      expectedOutcome: "Earlier containment and lower economic risk before infestation expands.",
      comparison: "Compared with prior cases, immediate scouting gives better control than waiting for visible field-wide symptoms.",
      primaryDriver: "Soil + Weather + Market",
      urgency: pest.current === "High" ? "Critical" : "High",
      confidenceBreakdown: {
        soilWeight: 16,
        weatherWeight: 38,
        marketWeight: 12,
        feedbackWeight: 34,
      },
    },
    {
      id: `${farm?.id || "farm"}-market`,
      title: `Align harvest and selling strategy with current market movement`,
      category: "market",
      priority: market.trend === "Increasing" ? "High" : "Medium",
      confidence: clamp(market.trend === "Increasing" ? 84 + marketLift + feedbackBias : 70 + feedbackBias, 50, 96),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      workflowStatus: "Generated",
      problemDetected: `Market signal indicates ${String(market.trend).toLowerCase()} pricing momentum for ${crop}.`,
      description: `${market.opportunity} This should influence how you time harvest preparation and post-harvest handling.`,
      expectedImpact: ["Better sales timing", "Higher gross margin", "Reduced distress selling"],
      reasoning: {
        soil: "Field readiness and crop condition determine whether the farm can safely wait for better prices.",
        weather: `Weather risk remains ${Number(weather.rainProbability || 0) > 45 ? "elevated" : "manageable"}, affecting harvest timing confidence.`,
        market: `${crop} is currently around ${formatRwf(market.currentPrice)} with ${String(market.demand).toLowerCase()} demand and a ${String(market.trend).toLowerCase()} trend.`,
        stage: `${stage} signals how close the crop is to harvest-readiness and market entry.`,
        confidence: "Confidence combines current price, demand, local weather harvesting risk, readiness of the active crop stage, and prior farmer response.",
      },
      scientificReferences: [
        "Market intelligence feed",
        "Farm readiness and logistics scoring",
        "Historical price response heuristics",
      ],
      historicalCases: [
        "Waiting one week improved bean selling price during prior school-term demand spikes.",
        "Harvest batching improved bargaining power for cooperative orchard sales.",
      ],
      recommendedAction: market.trend === "Increasing" ? "Hold for 7 days while maintaining crop condition and prepare buyers." : "Sell in phased volumes while monitoring the next market refresh.",
      expectedOutcome: "Better selling decision and improved revenue capture from current demand conditions.",
      comparison: "Compared with similar historical market windows, phased selling or short waiting periods produced better margins than immediate bulk disposal.",
      primaryDriver: "Soil + Weather + Market",
      urgency: market.trend === "Increasing" ? "High" : "Medium",
      confidenceBreakdown: {
        soilWeight: 12,
        weatherWeight: 22,
        marketWeight: 48,
        feedbackWeight: 18,
      },
    },
    {
      id: `${farm?.id || "farm"}-crop`,
      title: `Apply crop-stage management advisory for ${crop}`,
      category: "crop",
      priority: getPriorityLevel(70 + (stage.includes("Flowering") || stage.includes("Pod") ? 10 : 0)),
      confidence: clamp(79 + feedbackBias, 48, 95),
      generatedAt,
      region,
      farmer: farmerName,
      crop,
      status: "Generated",
      workflowStatus: "Generated",
      problemDetected: `${crop} is in ${stage.toLowerCase()}, requiring tighter management synchronization.`,
      description: community,
      expectedImpact: ["Stronger field coordination", "Higher practice adoption", "Reduced missed operations"],
      reasoning: {
        soil: "Nutrient and moisture balance set the baseline for whether growth-stage actions will convert into yield gains.",
        weather: `${Number(weather.rainProbability || 0) >= 50 ? "Rain-linked windows are building." : "Field work weather remains manageable."}`,
        market: "Current market conditions reward better-quality produce and more predictable harvest timing.",
        stage: `${stage} is a transition window when mistimed decisions create avoidable yield and quality penalties.`,
        confidence: "Confidence combines local extension practice validation, crop stage sensitivity, weather window suitability, and farm history.",
      },
      scientificReferences: [
        "Extension officer practice notes",
        "Community validated best-practice stream",
        "Historical performance trends from analytics",
      ],
      historicalCases: [
        "Farmers following synchronized stage-based actions improved task completion rates.",
        "Community-validated timing reduced rework and input waste in comparable plots.",
      ],
      recommendedAction: "Follow a stage-based task schedule this week and confirm completion against the advisory tracker.",
      expectedOutcome: "Improved coordination between soil, irrigation, pest, and market decisions.",
      comparison: "Historical advisory adherence shows better outcomes when actions are grouped by growth-stage windows instead of reacting late.",
      primaryDriver: "Soil + Weather + Market",
      urgency: stage.includes("Flowering") || stage.includes("Pod") ? "High" : "Medium",
      confidenceBreakdown: {
        soilWeight: 20,
        weatherWeight: 24,
        marketWeight: 18,
        feedbackWeight: 38,
      },
    },
  ];
}

function buildScheduler(recommendations, farm) {
  const today = new Date();
  return recommendations.slice(0, 5).map((item, index) => {
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + index * 2 + 1);
    return {
      id: `${item.id}-schedule`,
      crop: item.crop,
      growthStage: farm.cropStage || getGrowthStage(farm, { rainfall: 0, rainProbability: 0 }),
      recommendedAction: item.recommendedAction,
      bestWindow: index === 0 ? "Next 24 hours" : index <= 2 ? "Next 3-5 days" : "Next 7-10 days",
      dateKey: dueDate.toISOString(),
      priority: item.priority,
      status: item.workflowStatus === "Completed" ? "Completed" : "Pending",
    };
  });
}

function buildAnalytics(recommendations, feedbackEntries) {
  const accepted = feedbackEntries.filter((entry) =>
    ["Approved", "Applied", "Completed"].includes(toTitleStatus(entry.feedbackStatus))
  ).length;
  const rejected = feedbackEntries.filter((entry) => toTitleStatus(entry.feedbackStatus) === "Rejected").length;
  const viewed = feedbackEntries.filter((entry) => toTitleStatus(entry.feedbackStatus) === "Viewed").length;
  const avgConfidence = recommendations.length
    ? Math.round(recommendations.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / recommendations.length)
    : 0;

  const categoryCounts = ["irrigation", "soil", "pests", "market", "crop", "weather"].map((category) => ({
    key: category,
    label: category === "soil" ? "Soil" : category.charAt(0).toUpperCase() + category.slice(1),
    count: recommendations.filter((item) => item.category === category).length,
  }));

  return {
    categoryCounts,
    accepted,
    rejected,
    viewed,
    avgConfidence,
    farmerAdoptionRate: recommendations.length ? Math.round((accepted / recommendations.length) * 100) : 0,
    yieldImpact: recommendations.length ? `${Math.round(recommendations.length * 4.2)}% protected potential` : "0%",
  };
}

function mergeRecommendationFeedback(recommendations, feedbackEntries) {
  return recommendations.map((item) => {
    const related = feedbackEntries
      .filter((entry) => entry.recommendationId === item.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = related[0];
    return {
      ...item,
      workflowStatus: latest ? toTitleStatus(latest.feedbackStatus) : item.workflowStatus || "Generated",
      status:
        latest && toTitleStatus(latest.feedbackStatus) === "Rejected"
          ? "Pending Review"
          : item.status || "Generated",
      actionLog: related.map((entry) => ({
        status: toTitleStatus(entry.feedbackStatus),
        timestamp: entry.createdAt,
        reason: entry.rejectionReason || entry.note || "",
        actionType: entry.actionType,
      })),
    };
  });
}

function mapFeedbackRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    runId: record.runId,
    farmId: record.farmId,
    recommendationId: record.recommendationId,
    actionType: record.actionType,
    feedbackStatus: record.feedbackStatus,
    rejectionReason: record.rejectionReason,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapRunRecord(record, feedbackEntries = []) {
  if (!record) return null;
  const recommendations = mergeRecommendationFeedback(
    Array.isArray(record.recommendations) ? record.recommendations : [],
    feedbackEntries,
  );
  return {
    id: record.id,
    farmId: record.farmId,
    crop: record.cropName,
    cropStage: record.cropStage,
    farmerName: record.farmerName,
    region: record.regionLabel,
    weatherSourceLabel: record.weatherSourceLabel,
    soilSourceLabel: record.soilSourceLabel,
    pestSourceLabel: record.pestSourceLabel,
    marketSourceLabel: record.marketSourceLabel,
    sourceMode: record.sourceMode,
    summary: record.summary || {},
    signals: record.signals || {},
    recommendations,
    scheduler: Array.isArray(record.scheduler) ? record.scheduler : [],
    analytics: record.analytics || buildAnalytics(recommendations, feedbackEntries),
    feedback: feedbackEntries.map(mapFeedbackRecord),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapRunSummary(record, feedbackEntries = []) {
  if (!record) return null;
  const recommendations = Array.isArray(record.recommendations) ? record.recommendations : [];
  const merged = mergeRecommendationFeedback(recommendations, feedbackEntries);
  const priorityRecommendation = [...merged].sort((a, b) => {
    const aScore = (PRIORITY_RANK[a.priority] || 1) * 100 + Number(a.confidence || 0);
    const bScore = (PRIORITY_RANK[b.priority] || 1) * 100 + Number(b.confidence || 0);
    return bScore - aScore;
  })[0] || null;

  return {
    id: record.id,
    farmId: record.farmId,
    crop: record.cropName,
    cropStage: record.cropStage,
    region: record.regionLabel,
    recommendationCount: merged.length,
    priorityAction: priorityRecommendation?.title || "No recommendation generated",
    topConfidence: priorityRecommendation?.confidence || 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function loadLatestSnapshots(farmId) {
  const [latestSoilTest, latestMarket, latestPest] = await Promise.all([
    prisma.soilTest.findFirst({
      where: { farmId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketAnalysis.findFirst({
      where: { farmId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pestDiagnosis.findFirst({
      where: { farmId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { latestSoilTest, latestMarket, latestPest };
}

async function generateRecommendationRun(user, farmId, payload = {}) {
  const farm = await ensureFarmAccess(user, farmId);
  const { latestSoilTest, latestMarket, latestPest } = await loadLatestSnapshots(farmId);
  const recentFeedback = await prisma.aiRecommendationFeedback.findMany({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const weather = {
    ...buildFallbackWeather(farm),
    ...(payload.weather || {}),
  };
  const soil = buildSoilSnapshot(farm, latestSoilTest);
  const market = buildMarketSnapshot(farm, latestMarket);
  const pest = buildPestSnapshot(farm, latestPest);
  const farmerName = farm.farmerProfile?.user?.fullName || "Rodrigue Farmer";
  const community =
    COMMUNITY_FALLBACKS[[farm.sector, farm.district, farm.province].filter(Boolean).join(", ")] ||
    COMMUNITY_FALLBACKS.default;
  const feedbackStats = summarizeFeedback(recentFeedback);
  const recommendations = buildRecommendationSet({
    farm,
    farmerName,
    weather,
    soil,
    market,
    pest,
    community,
    feedbackStats,
  });
  const scheduler = buildScheduler(recommendations, farm);
  const analytics = buildAnalytics(recommendations, recentFeedback);
  const priorityRecommendation = [...recommendations].sort((a, b) => {
    const aScore = (PRIORITY_RANK[a.priority] || 1) * 100 + Number(a.confidence || 0);
    const bScore = (PRIORITY_RANK[b.priority] || 1) * 100 + Number(b.confidence || 0);
    return bScore - aScore;
  })[0] || null;

  const created = await prisma.aiRecommendationRun.create({
    data: {
      farmId,
      cropName: farm.currentCrop || "Mixed Crops",
      cropStage: farm.cropStage || getGrowthStage(farm, weather),
      farmerName,
      regionLabel: [farm.sector, farm.district, farm.province].filter(Boolean).join(", "),
      weatherSourceLabel: payload.weatherSourceLabel || payload.weather?.source || "Live Weather Data",
      soilSourceLabel: soil.sourceLabel,
      pestSourceLabel: pest.sourceLabel,
      marketSourceLabel: market.sourceLabel,
      summary: {
        topRecommendation: priorityRecommendation?.title || "",
        confidence: priorityRecommendation?.confidence || 0,
        actionPriority: priorityRecommendation?.priority || "Low",
      },
      signals: {
        weather,
        soil,
        market,
        pest,
        community,
        feedbackStats,
      },
      recommendations,
      scheduler,
      analytics,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "AI_RECOMMENDATION_GENERATED",
    entityType: "AiRecommendationRun",
    entityId: created.id,
    details: {
      farmName: farm.farmName,
      crop: farm.currentCrop,
      topRecommendation: priorityRecommendation?.title || "",
    },
  });

  return mapRunRecord(created, []);
}

async function getLatestRecommendationRun(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const run = await prisma.aiRecommendationRun.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return null;

  const feedback = await prisma.aiRecommendationFeedback.findMany({
    where: { runId: run.id },
    orderBy: { createdAt: "desc" },
  });
  return mapRunRecord(run, feedback);
}

async function listRecommendationRunHistory(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const runs = await prisma.aiRecommendationRun.findMany({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const runIds = runs.map((item) => item.id);
  const feedback = runIds.length
    ? await prisma.aiRecommendationFeedback.findMany({
        where: { runId: { in: runIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const groupedFeedback = feedback.reduce((accumulator, entry) => {
    accumulator[entry.runId] = accumulator[entry.runId] || [];
    accumulator[entry.runId].push(entry);
    return accumulator;
  }, {});

  return runs.map((run) => mapRunSummary(run, groupedFeedback[run.id] || []));
}

async function listRecommendationFeedback(user, runId) {
  const run = await prisma.aiRecommendationRun.findUnique({
    where: { id: runId },
  });
  if (!run) {
    throw new ApiError(404, "Recommendation run not found.");
  }
  await ensureFarmAccess(user, run.farmId);

  const feedback = await prisma.aiRecommendationFeedback.findMany({
    where: { runId },
    orderBy: { createdAt: "desc" },
  });

  return feedback.map(mapFeedbackRecord);
}

async function addRecommendationFeedback(user, runId, payload) {
  const run = await prisma.aiRecommendationRun.findUnique({
    where: { id: runId },
  });
  if (!run) {
    throw new ApiError(404, "Recommendation run not found.");
  }

  const farm = await ensureFarmAccess(user, run.farmId);
  const recommendations = Array.isArray(run.recommendations) ? run.recommendations : [];
  const targetRecommendation = recommendations.find((item) => item.id === payload.recommendationId);

  if (!targetRecommendation) {
    throw new ApiError(404, "Recommendation item not found in this run.");
  }

  const created = await prisma.aiRecommendationFeedback.create({
    data: {
      runId,
      farmId: run.farmId,
      recommendationId: payload.recommendationId,
      actionType: payload.actionType,
      feedbackStatus: payload.feedbackStatus,
      rejectionReason: payload.rejectionReason || null,
      note: payload.note || null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "AI_RECOMMENDATION_FEEDBACK_RECORDED",
    entityType: "AiRecommendationFeedback",
    entityId: created.id,
    details: {
      farmName: farm.farmName,
      recommendationId: payload.recommendationId,
      feedbackStatus: payload.feedbackStatus,
    },
  });

  return mapFeedbackRecord(created);
}

module.exports = {
  generateRecommendationRun,
  getLatestRecommendationRun,
  listRecommendationRunHistory,
  listRecommendationFeedback,
  addRecommendationFeedback,
};
