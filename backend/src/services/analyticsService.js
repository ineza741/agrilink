const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString("en-RW")}`;
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function dateLabel(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTrendLabel(value) {
  if (value >= 6) return "Increasing";
  if (value <= -4) return "Declining";
  return "Stable";
}

function createChartLabels(chartFilter) {
  if (chartFilter === "Monthly") return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  if (chartFilter === "Quarterly") return ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
  if (chartFilter === "Annual") return ["2019", "2020", "2021", "2022", "2023", "2024"];
  return ["S1", "S2", "S3", "S4", "S5", "S6"];
}

function getCropFactor(cropType) {
  return {
    All: 1,
    Maize: 1.14,
    Wheat: 1.02,
    Soybeans: 0.94,
    Rice: 1.08,
    Beans: 0.88,
    "Irish Potato": 1.11,
    Almonds: 1.06,
    Bananas: 1.09,
    Coffee: 1.04,
  }[cropType] || 1;
}

function getRangeFactor(dateRange) {
  if (dateRange === "12M") return 1.22;
  if (dateRange === "90D") return 0.86;
  if (dateRange === "30D") return 0.72;
  return 1;
}

function computeSeed(farm) {
  return (
    Math.round(Math.abs(Number(farm?.latitude || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.longitude || 0)) * 100) +
    Math.round(Number(farm?.farmSize || 0) * 10)
  );
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function buildFarmerAnalyticsModel({
  farm,
  cropType,
  dateRange,
  reportTemplate,
  chartFilter,
  latestSoil,
  latestIrrigation,
  latestMarket,
  latestPest,
  latestRecommendation,
  latestNotifications,
}) {
  const seed = computeSeed(farm);
  const selectedCrop = cropType === "All" ? farm.currentCrop || "Maize" : cropType;
  const factor = getCropFactor(selectedCrop);
  const rangeFactor = getRangeFactor(dateRange);
  const area = Number(farm?.farmSize || 1);

  const cropHistory = Array.isArray(farm.cropHistories) ? farm.cropHistories : [];
  const historicalYield = cropHistory
    .map((entry) => Number(entry.yieldAmount || 0))
    .filter((value) => value > 0);
  const historyYieldBase = historicalYield.length ? average(historicalYield) * area : 18.8 * area;

  const marketPrice = Number(latestMarket?.currentPrice || 720);
  const irrigationStressFactor = clamp(
    latestIrrigation ? 1 + Number(latestIrrigation.soilMoisture || 28) / 100 : 1.22,
    1,
    1.38,
  );
  const nutrientFactor = clamp(
    latestSoil
      ? 0.88 +
          Math.min(0.14, Number(latestSoil.nitrogen || 0) / 400) +
          Math.min(0.1, Number(latestSoil.phosphorus || 0) / 500)
      : 1,
    0.86,
    1.18,
  );
  const pestPenalty = latestPest?.yieldLoss ? 1 - Number(latestPest.yieldLoss || 0) / 100 : 0.93;

  const yieldTons = Number(
    (
      historyYieldBase *
      factor *
      rangeFactor *
      irrigationStressFactor *
      nutrientFactor *
      pestPenalty
    ).toFixed(1),
  );
  const revenue = Math.round(yieldTons * marketPrice);
  const irrigationCost = Math.round(Number(latestIrrigation?.costSummary?.totalCost || 0) * 0.55);
  const nutrientCost = Math.round(Number(latestIrrigation?.costSummary?.fertilizerCost || 0) * 0.45);
  const operatingCostBase = area * (950 + (seed % 120));
  const costs = Math.max(
    18000,
    Math.round(operatingCostBase * rangeFactor + irrigationCost * 0.2 + nutrientCost * 0.2),
  );
  const profit = revenue - costs;
  const roi = Number(((profit / Math.max(costs, 1)) * 100).toFixed(1));
  const regionalYield = Number((yieldTons * (0.91 + (seed % 7) / 100)).toFixed(1));
  const previousSeasonYield = Number((yieldTons * (0.89 + (seed % 6) / 100)).toFixed(1));

  const waterUseScore = clamp(
    Math.round(74 + (Number(latestIrrigation?.resourceMonitoring?.[0]?.value || 68) - 50) / 2),
    42,
    96,
  );
  const carbonFootprint = Number((2.1 + (seed % 6) * 0.17 + (costs / 1000000) * 0.18).toFixed(1));
  const sustainability = clamp(
    Math.round(
      (waterUseScore +
        (100 - carbonFootprint * 10) +
        clamp(Math.round(62 + roi / 1.8), 24, 100)) /
        3,
    ),
    35,
    96,
  );

  const actualSeries = Array.from({ length: 6 }, (_, index) =>
    Math.round((yieldTons / 6) * (0.84 + index * 0.05 + ((seed + index) % 4) * 0.02)),
  );
  const targetSeries = actualSeries.map((value, index) =>
    Math.round(value * (1.04 + (index % 2) * 0.03)),
  );

  const revenueSeries = ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({
    label,
    revenue: Math.round(revenue * (0.17 + index * 0.08)),
    costs: Math.round(costs * (0.22 + index * 0.05)),
  }));

  const reportRows = [
    {
      period: "June 2026",
      short: "JUN",
      yield: `${(yieldTons / 5.7).toFixed(1)} Tons`,
      revenue: formatRwf(Math.round(revenue / 5.2)),
      score: `${Math.min(94, sustainability + 6)}%`,
      status: "Verified",
    },
    {
      period: "May 2026",
      short: "MAY",
      yield: `${(yieldTons / 6.1).toFixed(1)} Tons`,
      revenue: formatRwf(Math.round(revenue / 5.5)),
      score: `${Math.min(91, sustainability + 1)}%`,
      status: "Verified",
    },
    {
      period: "April 2026",
      short: "APR",
      yield: `${(yieldTons / 6).toFixed(1)} Tons`,
      revenue: formatRwf(Math.round(revenue / 5.3)),
      score: `${Math.max(74, sustainability - 3)}%`,
      status: "Pending Review",
    },
  ];

  const waterEfficiency = clamp(waterUseScore, 40, 96);
  const carbonScore = clamp(Math.round(100 - carbonFootprint * 10), 32, 92);
  const soilSustainability = clamp(
    Math.round(
      58 +
        (latestSoil ? Math.min(18, Number(latestSoil.organicMatter || 0) * 6) : 6) +
        (Number(latestSoil?.ph || 6.2) >= 6 && Number(latestSoil?.ph || 6.2) <= 7 ? 10 : 0),
    ),
    40,
    94,
  );
  const inputEfficiency = clamp(
    Math.round(61 + roi / 2.9 - (latestPest?.yieldLoss ? latestPest.yieldLoss / 2 : 0)),
    28,
    95,
  );

  const candidateCrops = [selectedCrop, farm.currentCrop, "Beans", "Soybeans"]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);
  const weights = [0.48, 0.31, 0.21];
  const revenueBreakdown = candidateCrops.map((crop, index) => {
    const cropRevenue = Math.round(revenue * (weights[index] || 0.2));
    return {
      crop,
      revenue: cropRevenue,
      contribution: Math.round((cropRevenue / Math.max(revenue, 1)) * 100),
    };
  });

  const districtAverage = Number((yieldTons * (0.95 + (seed % 5) / 100)).toFixed(1));
  const marketPressure = clamp(
    Math.round(
      66 +
        Number(latestMarket?.demandForecast || 54) / 3 +
        (latestMarket?.forecasts?.[0]?.forecastChange || 0),
    ),
    48,
    97,
  );
  const costReductionOpportunity = Math.max(4, Math.round((costs / Math.max(revenue, 1)) * 22));
  const riskLevel =
    waterEfficiency < 64 || roi < 18 || Number(latestPest?.yieldLoss || 0) >= 12 ? "Medium" : "Low";
  const confidence = clamp(
    Math.round(
      average(
        [
          latestRecommendation?.summary?.confidence,
          latestMarket?.aiConfidence,
          latestPest?.confidence,
          82 + (seed % 8),
        ].filter(Boolean),
      ) || 82,
    ),
    70,
    97,
  );
  const trendDelta = dateRange === "12M" ? -1.6 : dateRange === "90D" ? 2.1 : dateRange === "30D" ? 4.8 : 3.4;

  const analytics = {
    yieldTons,
    revenue,
    costs,
    profit,
    roi,
    regionalYield,
    sustainability,
    waterUseScore,
    carbonFootprint,
    actualSeries,
    targetSeries,
    revenueSeries,
    reportRows,
    reportTemplateLabel: reportTemplate,
    waterEfficiency,
    carbonScore,
    soilSustainability,
    inputEfficiency,
    revenueBreakdown,
    districtAverage,
    previousSeasonYield,
    marketPressure,
    costReductionOpportunity,
    riskLevel,
    confidence,
    trendDelta,
    chartLabels: createChartLabels(chartFilter),
  };

  const aiInsights = [
    {
      label: "Key Finding",
      body: `${selectedCrop} performance is ${yieldTons >= regionalYield ? "above" : "slightly below"} the regional average for this reporting window.`,
      icon: "Sparkles",
    },
    {
      label: "Yield Improvement",
      body: `${Math.max(3, Math.round((yieldTons / Math.max(previousSeasonYield, 1) - 1) * 100))}% improvement opportunity is possible through tighter irrigation and nutrient timing.`,
      icon: "TrendingUp",
    },
    {
      label: "Cost Reduction",
      body: `Input optimization can reduce operating pressure by about ${costReductionOpportunity}% if labor and fertilizer timing are synchronized.`,
      icon: "Wallet",
    },
    {
      label: "Risk Observation",
      body: `${riskLevel} operational risk is driven mainly by ${waterEfficiency < 64 ? "water efficiency" : "seasonal cost pressure"} in this cycle.`,
      icon: "AlertTriangle",
    },
  ];

  const sustainabilityRows = [
    { label: "Water Efficiency", value: `${waterEfficiency}/100`, percent: waterEfficiency, icon: "Droplets" },
    { label: "Carbon Footprint", value: `${carbonScore}/100`, percent: carbonScore, icon: "Leaf" },
    { label: "Soil Sustainability", value: `${soilSustainability}/100`, percent: soilSustainability, icon: "Sprout" },
    { label: "Input Efficiency", value: `${inputEfficiency}/100`, percent: inputEfficiency, icon: "Wallet" },
  ];

  const benchmarkRows = [
    { label: "Farm vs Regional Average", farm: `${yieldTons.toFixed(1)} t`, baseline: `${regionalYield.toFixed(1)} t`, trend: yieldTons >= regionalYield ? "Increasing" : "Stable" },
    { label: "Farm vs District Average", farm: `${yieldTons.toFixed(1)} t`, baseline: `${districtAverage.toFixed(1)} t`, trend: yieldTons >= districtAverage ? "Increasing" : "Stable" },
    { label: "Farm vs Previous Season", farm: `${yieldTons.toFixed(1)} t`, baseline: `${previousSeasonYield.toFixed(1)} t`, trend: yieldTons >= previousSeasonYield ? "Increasing" : "Declining" },
  ];

  return {
    generatedAt: new Date().toISOString(),
    sourceMode: "backend",
    sourceLabels: ["Demo Analytics", "Local Data"],
    analytics,
    aiInsights,
    sustainabilityRows,
    benchmarkRows,
    activeTemplateDescription:
      {
        "Operations Summary": "Summarizes field productivity, operational efficiency, and recent farm activities for the selected period.",
        "Financial Report": "Focuses on revenue, cost structure, ROI, and cash-efficiency indicators for the active farm.",
        "Crop Production Report": "Highlights yield performance, crop mix contribution, and output benchmarking against local averages.",
        "Weather Impact Report": "Explains how climate variability may have influenced productivity, risk, and timing decisions.",
        "Pest & Disease Report": "Captures crop-health-related operational pressure and likely protection-cost implications.",
        "Irrigation Report": "Reviews water efficiency, irrigation-linked performance, and likely scheduling impact on yields.",
        "Market Intelligence Report": "Connects farm performance with market opportunity, price direction, and selling readiness.",
      }[reportTemplate] || "Template-specific reporting view for the selected farm.",
    notificationsCount: latestNotifications.length,
  };
}

function mapExportRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    actorUserId: record.actorUserId,
    farmId: record.farmId,
    scopeType: record.scopeType,
    reportTemplate: record.reportTemplate,
    exportFormat: record.exportFormat,
    dateRange: record.dateRange,
    cropType: record.cropType,
    activityFilter: record.activityFilter,
    chartFilter: record.chartFilter,
    methodology: record.methodology,
    compliance: record.compliance,
    comparison: record.comparison,
    fileName: record.fileName,
    payload: record.payload || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    timeLabel: formatRelativeTime(record.createdAt),
    dateLabel: dateLabel(record.createdAt),
  };
}

function buildAdminSummaryCards(metrics) {
  return [
    { title: "National Yield Coverage", value: `${metrics.totalYield.toLocaleString()} t`, note: "Backend aggregated output", icon: "Leaf" },
    { title: "Farmer Adoption", value: `${metrics.activeFarmers.toLocaleString()}`, note: "Active farmers with registered farms", icon: "UsersRound" },
    { title: "District Coverage", value: `${metrics.districtCoverage}`, note: "Across Rwanda operational zones", icon: "Map" },
    { title: "AI Advisory Accuracy", value: `${metrics.aiAccuracy}%`, note: "Recommendation acceptance quality", icon: "ShieldCheck" },
  ];
}

function buildAdminDashboardModel({ farmers, farms, soilTests, irrigationRuns, marketRuns, pestRuns, recommendationRuns, recommendationFeedback, notificationAlerts, query = {}, recentExports = [] }) {
  const districtSet = new Set(farms.map((farm) => farm.district).filter(Boolean));
  const totalYield = farms.reduce((sum, farm) => {
    const latestCrop = (farm.cropHistories || [])[0];
    return sum + Number(latestCrop?.yieldAmount || 18 + (computeSeed(farm) % 8));
  }, 0);
  const activeFarmers = farmers.filter((farmer) => farmer.farms?.length).length;
  const positiveFeedback = recommendationFeedback.filter((item) =>
    ["Approved", "Applied", "Completed"].includes(String(item.feedbackStatus || "")),
  ).length;
  const aiAccuracy = recommendationFeedback.length
    ? clamp(Math.round((positiveFeedback / recommendationFeedback.length) * 100), 54, 98)
    : 84;

  const sustainabilityScore = clamp(
    Math.round(average(soilTests.map((item) => Number(item.organicMatter || 2.2) * 18)) + 34),
    48,
    92,
  );
  const waterEfficiency = clamp(
    Math.round(average(irrigationRuns.map((item) => Number(item.waterRequirementPerHa || 320))) / 5),
    42,
    95,
  );
  const carbonFootprintScore = clamp(
    Math.round(74 - average(irrigationRuns.map((item) => Number(item.totalRain || 4))) / 2),
    38,
    90,
  );
  const climateResilience = clamp(
    Math.round(62 + average(notificationAlerts.map((item) => Number(item.confidence || 75))) / 3),
    48,
    94,
  );

  const issued = recommendationRuns.length;
  const accepted = positiveFeedback;
  const rejected = recommendationFeedback.filter((item) =>
    String(item.feedbackStatus || "").toLowerCase() === "rejected",
  ).length;
  const successRate = issued ? Math.round((accepted / issued) * 100) : 0;
  const averageConfidence = recommendationRuns.length
    ? clamp(
        Math.round(
          average(recommendationRuns.map((item) => Number(item.summary?.confidence || 80))),
        ),
        50,
        99,
      )
    : 80;

  const regionVsRegion = Array.from(districtSet)
    .slice(0, 2)
    .map((district) => {
      const districtFarms = farms.filter((farm) => farm.district === district);
      const districtYield = districtFarms.reduce((sum, farm) => sum + Number(farm.cropHistories?.[0]?.yieldAmount || 5), 0);
      return { district, yield: districtYield.toFixed(1) };
    });

  const cropCounts = farms.reduce((acc, farm) => {
    const crop = farm.currentCrop || "Mixed";
    acc[crop] = (acc[crop] || 0) + 1;
    return acc;
  }, {});
  const cropNames = Object.keys(cropCounts);
  const topCrop = cropNames[0] || "Maize";
  const secondaryCrop = cropNames[1] || "Beans";

  const farmerAdoption = [
    { label: "Registered Farmers", value: `${farmers.length}` },
    { label: "Verified Farmers", value: `${farmers.filter((item) => item.verificationStatus === "Verified").length}` },
    { label: "Active Farmers", value: `${activeFarmers}` },
    { label: "Dormant Farmers", value: `${Math.max(0, farmers.length - activeFarmers)}` },
  ];

  const geographicCoverage = [
    { label: "District Coverage", value: `${districtSet.size} districts`, note: "Backend coverage footprint" },
    { label: "Sector Coverage", value: `${new Set(farms.map((farm) => farm.sector).filter(Boolean)).size} sectors`, note: "Extension support available" },
    { label: "Farmer Density", value: `${districtSet.size ? Math.round(farmers.length / districtSet.size) : farmers.length} farmers / district`, note: "Average active farmer density" },
  ];

  const topPestNames = pestRuns
    .map((item) => item.diseaseName)
    .filter(Boolean)
    .slice(0, 3);

  const weatherImpact = [
    { label: "Rainfall vs Yield", value: "Backend rainfall-linked yield correlation available", note: `${irrigationRuns.length} irrigation runs are informing moisture impact.` },
    { label: "Temperature vs Yield", value: "Temperature pressure is visible in advisory timing", note: `${recommendationRuns.length} AI runs provide growth-stage context.` },
    { label: "Drought Impact", value: `${notificationAlerts.filter((item) => item.category === "weather").length} weather alerts triggered`, note: "Alert volume is being used as a drought-pressure proxy." },
  ];

  const comparativeAnalytics = [
    {
      label: "Region vs Region",
      left: `${regionVsRegion[0]?.district || "Kicukiro District"}: ${regionVsRegion[0]?.yield || "0.0"} t`,
      right: `${regionVsRegion[1]?.district || "Bugesera District"}: ${regionVsRegion[1]?.yield || "0.0"} t`,
      trend: "Increasing",
    },
    {
      label: "Crop vs Crop",
      left: `${topCrop}: ${cropCounts[topCrop] || 0} farms`,
      right: `${secondaryCrop}: ${cropCounts[secondaryCrop] || 0} farms`,
      trend: "Stable",
    },
    {
      label: "Yield Comparison",
      left: `District avg: ${(totalYield / Math.max(districtSet.size, 1)).toFixed(1)} t`,
      right: `Platform avg: ${(totalYield / Math.max(farms.length, 1)).toFixed(1)} t`,
      trend: "Increasing",
    },
    {
      label: "ROI Comparison",
      left: "Smallholder: 18%",
      right: "Cooperative: 27%",
      trend: "Increasing",
    },
  ];

  const executiveSummary = `AI Executive Summary: ${query.reportTemplate || "Government Report"} currently covers ${activeFarmers} active farmers across ${districtSet.size} districts. Sustainability score is ${sustainabilityScore}/100, AI recommendation success rate is ${successRate}%, and the dominant pest pressure remains ${topPestNames.join(", ") || "mixed pest watch"}. Recommended action: strengthen drought-response irrigation planning in Bugesera and scale verified advisory adoption in Musanze and Kicukiro.`;

  return {
    generatedAt: new Date().toISOString(),
    sourceMode: "backend",
    sourceLabels: [
      "Backend Analytics",
      "Integrated Module Data",
      recentExports.length ? "Persisted Export History" : "Export Ready",
    ],
    summaryCards: buildAdminSummaryCards({
      totalYield: Math.round(totalYield),
      activeFarmers,
      districtCoverage: districtSet.size,
      aiAccuracy: averageConfidence,
    }),
    sustainabilityDashboard: [
      { label: "Sustainability Score", value: sustainabilityScore, note: "Backend aggregated sustainability index" },
      { label: "Water Use Efficiency", value: waterEfficiency, note: "Calculated from irrigation advisory workload" },
      { label: "Carbon Footprint", value: carbonFootprintScore, note: "Converted to score for dashboard comparison" },
      { label: "Climate Resilience Index", value: climateResilience, note: "Derived from alerts, soil, and irrigation signal coverage" },
    ],
    aiRecommendationAnalytics: [
      { label: "Recommendations Issued", value: `${issued}` },
      { label: "Accepted", value: `${accepted}` },
      { label: "Rejected", value: `${rejected}` },
      { label: "Success Rate", value: `${successRate}%` },
      { label: "Average Confidence", value: `${averageConfidence}%` },
    ],
    comparativeAnalytics,
    farmerAdoption,
    geographicCoverage,
    pestDiseaseAnalytics: [
      { label: "Top Pest Risks", value: topPestNames.join(", ") || "No pest runs yet" },
      { label: "Outbreak Frequency", value: `${pestRuns.length} backend diagnoses logged` },
      { label: "Treatment Success Rate", value: `${recommendationFeedback.length ? successRate : 0}%` },
    ],
    weatherImpactAnalytics: weatherImpact,
    executiveSummary,
    recentExports: recentExports.map((entry) => ({
      name: entry.fileName || `${entry.reportTemplate}.${entry.exportFormat}`,
      type: String(entry.exportFormat || "").toUpperCase(),
      time: formatRelativeTime(entry.createdAt),
    })),
  };
}

async function getFarmAnalyticsDashboard(user, farmId, query = {}) {
  const farm = await ensureFarmAccess(user, farmId);

  const [latestSoil, latestIrrigation, latestMarket, latestPest, latestRecommendation, latestNotifications] =
    await Promise.all([
      prisma.soilTest.findFirst({ where: { farmId }, orderBy: { createdAt: "desc" } }),
      prisma.irrigationAdvisory.findFirst({ where: { farmId }, orderBy: { createdAt: "desc" } }),
      prisma.marketAnalysis.findFirst({ where: { farmId }, orderBy: { createdAt: "desc" } }),
      prisma.pestDiagnosis.findFirst({ where: { farmId }, orderBy: { createdAt: "desc" } }),
      prisma.aiRecommendationRun.findFirst({ where: { farmId }, orderBy: { createdAt: "desc" } }),
      prisma.notificationAlert.findMany({ where: { farmId }, orderBy: { createdAt: "desc" }, take: 6 }),
    ]);

  return buildFarmerAnalyticsModel({
    farm,
    cropType: query.cropType || "All",
    dateRange: query.dateRange || "6M",
    reportTemplate: query.reportTemplate || "Operations Summary",
    chartFilter: query.chartFilter || "Seasonal",
    latestSoil,
    latestIrrigation,
    latestMarket,
    latestPest,
    latestRecommendation,
    latestNotifications,
  });
}

async function listFarmAnalyticsHistory(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const exports = await prisma.analyticsExport.findMany({
    where: {
      farmId,
      scopeType: "farm",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return exports.map(mapExportRecord);
}

async function createFarmAnalyticsExport(user, farmId, payload) {
  const dashboard = await getFarmAnalyticsDashboard(user, farmId, payload);
  const farm = await ensureFarmAccess(user, farmId);
  const fileName = `${(payload.reportTemplate || "farm-report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${payload.format === "excel" ? "csv" : payload.format === "json" ? "json" : "txt"}`;

  const record = await prisma.analyticsExport.create({
    data: {
      actorUserId: user.id,
      farmId,
      scopeType: "farm",
      reportTemplate: payload.reportTemplate || "Operations Summary",
      exportFormat: payload.format,
      dateRange: payload.dateRange || null,
      cropType: payload.cropType || null,
      activityFilter: payload.activityFilter || null,
      chartFilter: payload.chartFilter || null,
      fileName,
      payload: dashboard,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "EXPORT_FARM_ANALYTICS",
    entityType: "AnalyticsExport",
    entityId: record.id,
    details: {
      farmName: farm.farmName,
      format: payload.format,
      reportTemplate: payload.reportTemplate || "Operations Summary",
    },
  });

  return mapExportRecord(record);
}

async function getAdminAnalyticsDashboard(user, query = {}) {
  if (!["Admin", "ExtensionOfficer"].includes(user.role)) {
    throw new ApiError(403, "Only administrators and extension officers can access admin analytics.");
  }

  const [farmers, farms, soilTests, irrigationRuns, marketRuns, pestRuns, recommendationRuns, recommendationFeedback, notificationAlerts, recentExports] =
    await Promise.all([
      prisma.farmerProfile.findMany({
        include: {
          user: true,
          farms: true,
        },
      }),
      prisma.farm.findMany({
        include: {
          cropHistories: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.soilTest.findMany(),
      prisma.irrigationAdvisory.findMany(),
      prisma.marketAnalysis.findMany(),
      prisma.pestDiagnosis.findMany(),
      prisma.aiRecommendationRun.findMany(),
      prisma.aiRecommendationFeedback.findMany(),
      prisma.notificationAlert.findMany(),
      prisma.analyticsExport.findMany({
        where: { scopeType: "admin" },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  return buildAdminDashboardModel({
    farmers,
    farms,
    soilTests,
    irrigationRuns,
    marketRuns,
    pestRuns,
    recommendationRuns,
    recommendationFeedback,
    notificationAlerts,
    query,
    recentExports,
  });
}

async function listAdminAnalyticsHistory(user) {
  if (!["Admin", "ExtensionOfficer"].includes(user.role)) {
    throw new ApiError(403, "Only administrators and extension officers can access admin analytics history.");
  }

  const exports = await prisma.analyticsExport.findMany({
    where: { scopeType: "admin" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return exports.map(mapExportRecord);
}

async function createAdminAnalyticsExport(user, payload) {
  if (!["Admin", "ExtensionOfficer"].includes(user.role)) {
    throw new ApiError(403, "Only administrators and extension officers can export admin analytics.");
  }

  const dashboard = await getAdminAnalyticsDashboard(user, payload);
  const fileName = `${(payload.reportTemplate || "system-report").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${payload.format === "excel" ? "csv" : payload.format === "json" || payload.format === "dataset" || payload.format === "gis" ? "json" : "txt"}`;

  const record = await prisma.analyticsExport.create({
    data: {
      actorUserId: user.id,
      scopeType: "admin",
      reportTemplate: payload.reportTemplate || "Government Report",
      exportFormat: payload.format,
      methodology: payload.methodology || null,
      compliance: payload.selectedCompliance || null,
      comparison: payload.selectedComparison || null,
      fileName,
      payload: dashboard,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "EXPORT_ADMIN_ANALYTICS",
    entityType: "AnalyticsExport",
    entityId: record.id,
    details: {
      format: payload.format,
      reportTemplate: payload.reportTemplate || "Government Report",
    },
  });

  return mapExportRecord(record);
}

module.exports = {
  getFarmAnalyticsDashboard,
  listFarmAnalyticsHistory,
  createFarmAnalyticsExport,
  getAdminAnalyticsDashboard,
  listAdminAnalyticsHistory,
  createAdminAnalyticsExport,
};
