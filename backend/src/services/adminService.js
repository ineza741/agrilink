const prisma = require("../prisma/client");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { listFarmers } = require("./farmerService");
const { createAuditLog } = require("./auditLogService");

const DISTRICT_META = [
  {
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    province: "Kigali City",
    accessibility: "High",
    weatherRiskBase: 74,
    marketActivityBase: 84,
  },
  {
    district: "Bugesera District",
    sector: "Nyamata Sector",
    province: "Eastern Province",
    accessibility: "Medium",
    weatherRiskBase: 66,
    marketActivityBase: 76,
  },
  {
    district: "Musanze District",
    sector: "Muhoza Sector",
    province: "Northern Province",
    accessibility: "Medium",
    weatherRiskBase: 71,
    marketActivityBase: 69,
  },
  {
    district: "Rwamagana District",
    sector: "Kigabiro Sector",
    province: "Eastern Province",
    accessibility: "High",
    weatherRiskBase: 54,
    marketActivityBase: 73,
  },
  {
    district: "Huye District",
    sector: "Ngoma Sector",
    province: "Southern Province",
    accessibility: "Medium",
    weatherRiskBase: 58,
    marketActivityBase: 64,
  },
  {
    district: "Rubavu District",
    sector: "Gisenyi Sector",
    province: "Western Province",
    accessibility: "High",
    weatherRiskBase: 63,
    marketActivityBase: 78,
  },
];

const WORKFLOW_SEED = [
  {
    workflowKey: "wf-approvals",
    title: "Pending farmer approvals",
    description: "Review newly submitted farmer and farm profiles awaiting verification.",
    tone: "amber",
  },
  {
    workflowKey: "wf-advisories",
    title: "Regional advisories to review",
    description: "Validate location-specific advisory text before dispatch to extension officers.",
    tone: "blue",
  },
  {
    workflowKey: "wf-pests",
    title: "Pest outbreak reports",
    description: "Confirm submitted pest escalation records from farmer reports and field scouts.",
    tone: "red",
  },
  {
    workflowKey: "wf-weather",
    title: "Weather alert confirmations",
    description: "Check severe weather notices before releasing district-level warning summaries.",
    tone: "green",
  },
  {
    workflowKey: "wf-market",
    title: "Market data updates",
    description: "Review the latest market intelligence and extension pricing notes.",
    tone: "purple",
  },
];

const ADVISORY_SEED = [
  {
    title: "Prioritize aphid scouting this week",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    category: "Pests & Diseases",
    severity: "High",
    deliveryChannel: "In-App",
    targetFarmers: 42,
    recommendedAction: "Inspect bean fields every 48 hours and escalate if colony density increases.",
    message:
      "Bean fields in Gatenga should be inspected every 2 days because humidity has been favorable for aphid buildup.",
    status: "Published",
  },
  {
    title: "Delay nitrogen top-dressing before rainfall window",
    district: "Bugesera District",
    sector: "Nyamata Sector",
    category: "Irrigation",
    severity: "Medium",
    deliveryChannel: "SMS",
    targetFarmers: 31,
    recommendedAction: "Hold nitrogen application until moderate rainfall is confirmed within 48 hours.",
    message:
      "Nitrogen application should be delayed until moderate rainfall is confirmed to reduce volatilization losses.",
    status: "Sent",
  },
];

const COMMUNITY_REPORT_SEED = [
  {
    title: "Aphids seen on beans near marsh edge",
    body: "Three neighboring plots observed clustering aphids on bean leaves after humid mornings.",
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    category: "Pests & Diseases",
    severity: "High",
    status: "Validated",
    authorName: "Farmer Dative",
  },
  {
    title: "Dry winds affecting newly emerged maize",
    body: "Farmers in Nyamata reported uneven establishment where ridge moisture dropped quickly.",
    district: "Bugesera District",
    sector: "Nyamata Sector",
    category: "Weather",
    severity: "Medium",
    status: "Reviewing",
    authorName: "Cooperative Lead",
  },
  {
    title: "Late blight spots confirmed in potato plots",
    body: "Extension volunteers confirmed leaf lesions after two damp nights in potato fields.",
    district: "Musanze District",
    sector: "Muhoza Sector",
    category: "Pests & Diseases",
    severity: "High",
    status: "Validated",
    authorName: "Extension Scout",
  },
];

const OUTBREAK_FALLBACK = [
  {
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    crop: "Beans",
    pest: "Bean Aphid",
    intensity: "High",
    trend: "Increasing",
    riskScore: 78,
    affectedFarms: 8,
  },
  {
    district: "Bugesera District",
    sector: "Nyamata Sector",
    crop: "Maize",
    pest: "Fall Armyworm",
    intensity: "Moderate",
    trend: "Stable",
    riskScore: 61,
    affectedFarms: 5,
  },
  {
    district: "Musanze District",
    sector: "Muhoza Sector",
    crop: "Irish Potato",
    pest: "Late Blight",
    intensity: "High",
    trend: "Increasing",
    riskScore: 81,
    affectedFarms: 11,
  },
  {
    district: "Rwamagana District",
    sector: "Kigabiro Sector",
    crop: "Maize",
    pest: "Maize Streak Virus",
    intensity: "Low",
    trend: "Decreasing",
    riskScore: 39,
    affectedFarms: 3,
  },
  {
    district: "Huye District",
    sector: "Ngoma Sector",
    crop: "Beans",
    pest: "Angular Leaf Spot",
    intensity: "Moderate",
    trend: "Stable",
    riskScore: 57,
    affectedFarms: 4,
  },
  {
    district: "Rubavu District",
    sector: "Gisenyi Sector",
    crop: "Irish Potato",
    pest: "Potato Tuber Moth",
    intensity: "Moderate",
    trend: "Increasing",
    riskScore: 64,
    affectedFarms: 6,
  },
];

const MARKET_ALERT_FALLBACK = [
  {
    district: "Kicukiro District",
    sector: "Gatenga Sector",
    crop: "Beans",
    market: "Zinia Market",
    trend: "Rising",
    demand: "High",
    priceRwfKg: 1020,
    note: "Urban retail demand has improved for clean beans lots.",
  },
  {
    district: "Kicukiro District",
    sector: "Kicukiro Sector",
    crop: "Beans",
    market: "Kicukiro Modern Market",
    trend: "Rising",
    demand: "High",
    priceRwfKg: 1080,
    note: "Institutional buyers are offering stronger prices for sorted beans.",
  },
  {
    district: "Bugesera District",
    sector: "Nyamata Sector",
    crop: "Maize",
    market: "Nyamata Market",
    trend: "Rising",
    demand: "High",
    priceRwfKg: 720,
    note: "Cross-district grain buyers are active this week.",
  },
  {
    district: "Musanze District",
    sector: "Muhoza Sector",
    crop: "Irish Potato",
    market: "Musanze Main Market",
    trend: "Stable",
    demand: "High",
    priceRwfKg: 560,
    note: "Potato movement remains fast but quality grading matters.",
  },
  {
    district: "Rubavu District",
    sector: "Gisenyi Sector",
    crop: "Irish Potato",
    market: "Rubavu Cross-Border Market",
    trend: "Rising",
    demand: "High",
    priceRwfKg: 610,
    note: "Cross-border demand is strengthening margins for graded potato lots.",
  },
];

function initialsFromName(name = "") {
  return (
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "AG"
  );
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function scoreToSeverity(score) {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function buildStatusCounts(farmers) {
  return farmers.reduce(
    (accumulator, farmer) => {
      if (!farmer.user?.isActive || farmer.verificationStatus === "Deactivated") {
        accumulator.deactivatedFarmers += 1;
      } else if (farmer.verificationStatus === "Rejected") {
        accumulator.rejectedFarmers += 1;
      } else if (farmer.verificationStatus === "Verified") {
        accumulator.verifiedFarmers += 1;
      } else {
        accumulator.pendingFarmers += 1;
      }

      return accumulator;
    },
    {
      pendingFarmers: 0,
      verifiedFarmers: 0,
      rejectedFarmers: 0,
      deactivatedFarmers: 0,
    }
  );
}

function buildRegionBreakdown(farmers) {
  const regionMap = new Map();

  farmers.forEach((farmer) => {
    const regionKey =
      [farmer.sector, farmer.district].filter(Boolean).join(", ") ||
      farmer.region ||
      "Unassigned Region";
    const current = regionMap.get(regionKey) || {
      region: regionKey,
      farmers: 0,
      farms: 0,
      pendingFarmers: 0,
      verifiedFarmers: 0,
      deactivatedFarmers: 0,
    };

    current.farmers += 1;
    current.farms += Array.isArray(farmer.farms) ? farmer.farms.length : 0;

    if (!farmer.user?.isActive || farmer.verificationStatus === "Deactivated") {
      current.deactivatedFarmers += 1;
    } else if (farmer.verificationStatus === "Verified") {
      current.verifiedFarmers += 1;
    } else {
      current.pendingFarmers += 1;
    }

    regionMap.set(regionKey, current);
  });

  return [...regionMap.values()].sort((left, right) => {
    if (right.farmers !== left.farmers) {
      return right.farmers - left.farmers;
    }

    return right.farms - left.farms;
  });
}

async function ensureAdminSeedData() {
  await Promise.all(
    WORKFLOW_SEED.map((item) =>
      prisma.extensionWorkflowItem.upsert({
        where: { workflowKey: item.workflowKey },
        update: {
          title: item.title,
          description: item.description,
          tone: item.tone,
        },
        create: item,
      })
    )
  );

  const [advisoryCount, reportCount] = await Promise.all([
    prisma.regionalAdvisory.count(),
    prisma.communityFieldReport.count(),
  ]);

  if (!advisoryCount) {
    await prisma.regionalAdvisory.createMany({ data: ADVISORY_SEED });
  }

  if (!reportCount) {
    await prisma.communityFieldReport.createMany({ data: COMMUNITY_REPORT_SEED });
  }
}

function mapWorkflowItems(items = [], context = {}) {
  const {
    pendingFarmers = 0,
    advisoriesCount = 0,
    pestReportsCount = 0,
    weatherConfirmations = 0,
    marketUpdates = 0,
  } = context;

  return items.map((item) => {
    let openCount = item.openCount || 0;
    if (item.workflowKey === "wf-approvals") openCount = pendingFarmers;
    if (item.workflowKey === "wf-advisories") openCount = Math.max(advisoriesCount, 1);
    if (item.workflowKey === "wf-pests") openCount = Math.max(pestReportsCount, 1);
    if (item.workflowKey === "wf-weather") openCount = Math.max(weatherConfirmations, 1);
    if (item.workflowKey === "wf-market") openCount = Math.max(marketUpdates, 1);

    return {
      id: item.id,
      workflowKey: item.workflowKey,
      title: item.title,
      description: item.description,
      tone: item.tone,
      status: item.status,
      openCount,
      lastReviewedAt: item.lastReviewedAt,
      actorUserId: item.actorUserId || null,
      actorName: item.actorUser?.fullName || null,
    };
  });
}

function buildMonitoringPanel() {
  return [
    {
      id: "weather",
      title: "Weather API status",
      status: "Live Weather Data",
      detail: "Open-Meteo feed connected for forecast and alert calculations.",
      tone: "green",
    },
    {
      id: "demo",
      title: "Demo data mode status",
      status: env.demoMode ? "DEMO_MODE active" : "Live backend mode",
      detail: "Farmer, soil, market, and alert datasets gracefully fall back to local demo records where needed.",
      tone: env.demoMode ? "blue" : "green",
    },
    {
      id: "sync",
      title: "LocalStorage sync status",
      status: "Healthy",
      detail: "Frontend actions can still persist locally while backend APIs progressively take over admin workflows.",
      tone: "green",
    },
    {
      id: "reports",
      title: "Report export status",
      status: "Ready",
      detail: "PDF, CSV, and analytics export actions are available for academic demonstrations.",
      tone: "amber",
    },
  ];
}

function buildRecentSignups(farmers = []) {
  return [...farmers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((farmer) => ({
      userId: farmer.user?.id || "",
      farmerProfileId: farmer.id,
      name: farmer.user?.fullName || "Unknown Farmer",
      initials: initialsFromName(farmer.user?.fullName || "Agri Support"),
      location:
        [farmer.sector, farmer.district].filter(Boolean).join(", ") ||
        farmer.region ||
        "Gatenga Sector, Kicukiro District",
      experience: farmer.experienceLevel || "Intermediate",
      signupDate: farmer.user?.createdAt || farmer.createdAt,
      verificationStatus:
        !farmer.user?.isActive || farmer.verificationStatus === "Deactivated"
          ? "deactivated"
          : String(farmer.verificationStatus || "Pending").toLowerCase(),
      latestActivityAt: farmer.latestActivityAt || farmer.updatedAt || farmer.createdAt,
      farmCount: farmer.farmCount || 0,
      contact: farmer.user?.phone || "Not provided",
      email: farmer.user?.email || "Not provided",
      completeness: farmer.profileCompleteness || 0,
      totalFarmSize: farmer.totalFarmSize || 0,
      totalFarmSizeUnit: farmer.totalFarmSizeUnit || "hectares",
    }));
}

function mapAdvisory(record) {
  return {
    id: record.id,
    title: record.title,
    district: record.district,
    sector: record.sector,
    category: record.category,
    severity: record.severity,
    channel: record.deliveryChannel,
    targetFarmers: record.targetFarmers,
    recommendedAction: record.recommendedAction,
    message: record.message,
    status: record.status,
    createdAt: record.createdAt,
    createdBy: record.author?.fullName || "Regional Monitoring Dashboard",
  };
}

function mapCommunityReport(record) {
  return {
    id: record.id,
    district: record.district,
    sector: record.sector,
    title: record.title,
    body: record.body,
    author: record.authorName,
    category: record.category,
    severity: record.severity,
    createdAt: record.createdAt,
    status: record.status,
  };
}

async function buildRegionalMonitoringData() {
  await ensureAdminSeedData();

  const [farmers, advisories, fieldReports, workflowItems, pestDiagnoses, marketAnalyses] =
    await Promise.all([
      listFarmers(),
      prisma.regionalAdvisory.findMany({
        include: { author: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.communityFieldReport.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.extensionWorkflowItem.findMany({
        include: { actorUser: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pestDiagnosis.findMany({
        include: { farm: true },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
      prisma.marketAnalysis.findMany({
        include: { farm: true },
        orderBy: { createdAt: "desc" },
        take: 18,
      }),
    ]);

  const advisoriesMapped = advisories.map(mapAdvisory);
  const reportsMapped = fieldReports.map(mapCommunityReport);

  const outbreaks = pestDiagnoses.length
    ? pestDiagnoses.map((item) => ({
        id: item.id,
        district: item.farm?.district || "Kicukiro District",
        sector: item.farm?.sector || "Gatenga Sector",
        crop: item.cropName || item.farm?.currentCrop || "Mixed Crops",
        pest: item.diseaseName,
        intensity: item.riskLevel,
        trend: item.outbreakForecastRisk === item.riskLevel ? "Stable" : "Increasing",
        riskScore: item.farmRiskScore || item.regionalRiskScore || 55,
        affectedFarms: Math.max(1, Math.round((item.affectedAreaPercent || 10) / 10)),
        updatedAt: item.updatedAt,
      }))
    : OUTBREAK_FALLBACK.map((item, index) => ({
        id: `fallback-outbreak-${index + 1}`,
        ...item,
        updatedAt: new Date().toISOString(),
      }));

  const marketAlerts = marketAnalyses.length
    ? marketAnalyses.flatMap((analysis) => {
        const markets = Array.isArray(analysis.nearbyMarkets) ? analysis.nearbyMarkets : [];
        return markets.slice(0, 2).map((market, index) => ({
          id: `${analysis.id}-market-${index}`,
          district: analysis.farm?.district || "Kicukiro District",
          sector: market.sector || analysis.farm?.sector || "Gatenga Sector",
          crop: analysis.cropName,
          market: market.name || market.market || "District Market",
          trend: market.trend || analysis.marketSnapshot?.marketTrend || "Stable",
          demand: market.demandLevel || "Medium",
          priceRwfKg: Number(market.currentPriceRwfKg || analysis.marketSnapshot?.currentPrice || 0),
          note: market.recommendation || analysis.aiAdvisory?.reason || "Monitor market movement.",
          updatedAt: analysis.updatedAt,
        }));
      })
    : MARKET_ALERT_FALLBACK.map((item, index) => ({
        id: `fallback-market-${index + 1}`,
        ...item,
        updatedAt: new Date().toISOString(),
      }));

  const districtProfiles = DISTRICT_META.map((meta) => {
    const districtOutbreaks = outbreaks.filter((item) => item.district === meta.district);
    const districtMarkets = marketAlerts.filter((item) => item.district === meta.district);
    const districtReports = reportsMapped.filter((item) => item.district === meta.district);
    const districtAdvisories = advisoriesMapped.filter((item) => item.district === meta.district);
    const districtFarms = farmers
      .flatMap((farmer) => farmer.farms || [])
      .filter((farm) => farm.district === meta.district);
    const districtFarmers = farmers.filter((farmer) => farmer.district === meta.district);

    const pestRisk = districtOutbreaks.length
      ? Math.round(
          districtOutbreaks.reduce((sum, item) => sum + Number(item.riskScore || 0), 0) /
            districtOutbreaks.length
        )
      : 32;
    const weatherRisk = clamp(
      meta.weatherRiskBase + districtReports.filter((item) => item.category === "Weather").length * 4
    );
    const marketActivity = clamp(
      meta.marketActivityBase +
        districtMarkets.filter((item) => item.trend === "Rising").length * 4 +
        districtMarkets.filter((item) => item.demand === "High").length * 2
    );
    const farmerActivity = clamp(
      districtReports.length * 10 +
        districtAdvisories.length * 8 +
        districtFarms.length * 6 +
        districtFarmers.length * 5,
      0,
      95
    );
    const overallRiskScore = Math.round(
      weatherRisk * 0.28 + pestRisk * 0.34 + marketActivity * 0.16 + farmerActivity * 0.22
    );
    const verificationRate = districtFarmers.length
      ? Math.round(
          (districtFarmers.filter((row) => row.adminStatus === "Verified").length /
            districtFarmers.length) *
            100
        )
      : 72;

    return {
      ...meta,
      outbreaks: districtOutbreaks,
      markets: districtMarkets,
      reports: districtReports,
      advisories: districtAdvisories,
      farmsCount: districtFarms.length,
      farmersCount: districtFarmers.length,
      pestRisk,
      weatherRisk,
      marketActivity,
      farmerActivity,
      overallRiskScore,
      verificationRate,
    };
  });

  const districtMap = Object.fromEntries(
    districtProfiles.map((profile) => {
      const sectorRows = new Map();

      profile.outbreaks.forEach((item) => {
        const current = sectorRows.get(item.sector) || {
          sector: item.sector,
          weatherRiskScore: profile.weatherRisk,
          pestRiskScore: 0,
          marketSignal: "Monitor",
          farmerReports: 0,
          affectedFarms: 0,
          trend: item.trend || "Stable",
        };
        current.pestRiskScore = Math.max(current.pestRiskScore, Number(item.riskScore || 0));
        current.affectedFarms += Number(item.affectedFarms || 0);
        current.trend = item.trend || current.trend;
        sectorRows.set(item.sector, current);
      });

      profile.reports.forEach((item) => {
        const current = sectorRows.get(item.sector) || {
          sector: item.sector,
          weatherRiskScore: profile.weatherRisk,
          pestRiskScore: profile.pestRisk,
          marketSignal: "Monitor",
          farmerReports: 0,
          affectedFarms: 0,
          trend: "Stable",
        };
        current.farmerReports += 1;
        sectorRows.set(item.sector, current);
      });

      profile.markets.forEach((item) => {
        const current = sectorRows.get(item.sector) || {
          sector: item.sector,
          weatherRiskScore: profile.weatherRisk,
          pestRiskScore: profile.pestRisk,
          marketSignal: "Monitor",
          farmerReports: 0,
          affectedFarms: 0,
          trend: "Stable",
        };
        current.marketSignal =
          item.trend === "Rising" ? "Opportunity" : item.demand === "High" ? "Stable Demand" : "Monitor";
        sectorRows.set(item.sector, current);
      });

      const rows = [...sectorRows.values()].map((row) => ({
        ...row,
        weatherRisk: scoreToSeverity(row.weatherRiskScore),
        pestIntensity: scoreToSeverity(row.pestRiskScore),
      }));

      return [
        profile.district,
        rows.length
          ? rows
          : [
              {
                sector: profile.sector,
                weatherRiskScore: profile.weatherRisk,
                weatherRisk: scoreToSeverity(profile.weatherRisk),
                pestRiskScore: profile.pestRisk,
                pestIntensity: scoreToSeverity(profile.pestRisk),
                marketSignal: profile.marketActivity >= 70 ? "Opportunity" : "Monitor",
                farmerReports: profile.reports.length,
                affectedFarms: profile.outbreaks.reduce(
                  (sum, item) => sum + Number(item.affectedFarms || 0),
                  0
                ),
                trend: profile.outbreaks[0]?.trend || "Stable",
              },
            ],
      ];
    })
  );

  const selectedProfile = districtProfiles[0] || null;
  const highestDriver = selectedProfile
    ? [
        { label: "weather risk", value: selectedProfile.weatherRisk },
        { label: "pest outbreak intensity", value: selectedProfile.pestRisk },
        { label: "farmer reports", value: selectedProfile.farmerActivity },
        { label: "market movement", value: selectedProfile.marketActivity },
      ].sort((a, b) => b.value - a.value)[0]
    : null;

  const workflow = mapWorkflowItems(workflowItems, {
    pendingFarmers: farmers.filter((farmer) => farmer.adminStatus === "Pending").length,
    advisoriesCount: advisoriesMapped.length,
    pestReportsCount: reportsMapped.filter((item) => item.category === "Pests & Diseases").length,
    weatherConfirmations: reportsMapped.filter((item) => item.category === "Weather").length,
    marketUpdates: marketAlerts.filter((item) => item.trend === "Rising").length,
  });

  return {
    mode: "backend",
    sourceLabels: {
      weather: "Live Weather Data",
      market: "Demo Market Data",
      soil: "Local Soil Data",
      pest: "Demo Pest Data",
    },
    state: {
      iotDemoEnabled: false,
      advisories: advisoriesMapped,
      outbreaks,
      marketAlerts,
      communityReports: reportsMapped,
    },
    districtProfiles,
    monitoringRowsByDistrict: districtMap,
    workflow,
    monitoring: buildMonitoringPanel(),
    summaryInsight:
      selectedProfile && highestDriver
        ? `${selectedProfile.district} requires close monitoring because ${highestDriver.label} is elevated and extension coordination is needed across ${selectedProfile.farmsCount || 0} farm records.`
        : "",
  };
}

async function getDashboardSummary() {
  await ensureAdminSeedData();

  const [totalUsers, farmers, workflowItems, advisories, reports] = await Promise.all([
    prisma.user.count(),
    prisma.farmerProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            createdAt: true,
          },
        },
        farms: {
          select: {
            id: true,
            farmSize: true,
            farmSizeUnit: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.extensionWorkflowItem.findMany({
      include: { actorUser: { select: { fullName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.regionalAdvisory.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.communityFieldReport.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const totalFarmers = farmers.length;
  const totalFarms = farmers.reduce(
    (sum, farmer) => sum + (Array.isArray(farmer.farms) ? farmer.farms.length : 0),
    0
  );
  const totalFarmArea = farmers.reduce(
    (sum, farmer) =>
      sum +
      (Array.isArray(farmer.farms)
        ? farmer.farms.reduce((farmSum, farm) => farmSum + Number(farm.farmSize || 0), 0)
        : 0),
    0
  );
  const statusCounts = buildStatusCounts(farmers);
  const regionBreakdown = buildRegionBreakdown(farmers);
  const farmersWithoutFarms = farmers.filter((farmer) => !farmer.farms?.length).length;
  const multiFarmFarmers = farmers.filter((farmer) => (farmer.farms?.length || 0) > 1).length;
  const recentlyOnboardedFarmers = farmers.filter((farmer) => {
    const createdAt = farmer.user?.createdAt ? new Date(farmer.user.createdAt).getTime() : 0;
    if (!createdAt) return false;
    const daysSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7;
  }).length;
  const activeUsers = farmers.filter((farmer) => farmer.user?.isActive).length;
  const topRegion = regionBreakdown[0]?.region || null;
  const verificationRate = totalFarmers
    ? Math.round((statusCounts.verifiedFarmers / totalFarmers) * 100)
    : 0;

  const enrichedFarmers = await listFarmers();
  const recentSignups = buildRecentSignups(enrichedFarmers);
  const workflow = mapWorkflowItems(workflowItems, {
    pendingFarmers: statusCounts.pendingFarmers,
    advisoriesCount: advisories.length,
    pestReportsCount: reports.filter((item) => item.category === "Pests & Diseases").length,
    weatherConfirmations: reports.filter((item) => item.category === "Weather").length,
    marketUpdates: Math.max(1, regionBreakdown.length - 1),
  });

  return {
    totalUsers,
    totalFarmers,
    totalFarms,
    pendingFarmers: statusCounts.pendingFarmers,
    verifiedFarmers: statusCounts.verifiedFarmers,
    rejectedFarmers: statusCounts.rejectedFarmers,
    deactivatedFarmers: statusCounts.deactivatedFarmers,
    activeUsers,
    totalFarmArea: Number(totalFarmArea.toFixed(2)),
    totalFarmAreaUnit: "hectares",
    farmersWithoutFarms,
    multiFarmFarmers,
    recentlyOnboardedFarmers,
    verificationRate,
    topRegion,
    regionBreakdown,
    recentSignups,
    workflow,
    monitoring: buildMonitoringPanel(),
    liveRegionalAlerts: advisories.length + reports.length,
  };
}

async function getPendingFarmers() {
  const farmers = await prisma.farmerProfile.findMany({
    where: {
      OR: [{ verificationStatus: "Pending" }, { verificationStatus: "Rejected" }],
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      farms: {
        include: {
          cropHistories: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return farmers.map((farmer) => ({
    ...farmer,
    adminStatus:
      !farmer.user?.isActive || farmer.verificationStatus === "Deactivated"
        ? "Deactivated"
        : farmer.verificationStatus,
    farmCount: Array.isArray(farmer.farms) ? farmer.farms.length : 0,
    totalFarmSize: Array.isArray(farmer.farms)
      ? farmer.farms.reduce((sum, farm) => sum + Number(farm.farmSize || 0), 0)
      : 0,
    latestFarmName: farmer.farms?.[0]?.farmName || null,
  }));
}

async function getFarmerRegistryExport() {
  const [farmers, summary] = await Promise.all([listFarmers(), getDashboardSummary()]);

  const records = farmers.map((farmer) => ({
    farmerProfileId: farmer.id,
    userId: farmer.user?.id || "",
    fullName: farmer.user?.fullName || "",
    email: farmer.user?.email || "",
    phone: farmer.user?.phone || "",
    role: farmer.user?.role || "Farmer",
    isActive: Boolean(farmer.user?.isActive),
    region: farmer.region || "",
    district: farmer.district || "",
    sector: farmer.sector || "",
    experienceLevel: farmer.experienceLevel || "",
    primaryCrop: farmer.primaryCrop || farmer.primaryFarmCrop || "",
    verificationStatus: farmer.verificationStatus || "Pending",
    adminStatus: farmer.adminStatus || "Pending",
    profileCompleteness: farmer.profileCompleteness || 0,
    farmCount: farmer.farmCount || 0,
    verifiedFarmCount: farmer.verifiedFarmCount || 0,
    totalFarmSize: Number(farmer.totalFarmSize || 0),
    totalFarmSizeUnit: farmer.totalFarmSizeUnit || "hectares",
    primaryFarmName: farmer.primaryFarmName || "",
    primaryFarmCrop: farmer.primaryFarmCrop || "",
    hasStarterFarm: Boolean(farmer.hasStarterFarm),
    hasMultipleFarms: Boolean(farmer.hasMultipleFarms),
    latestActivityAt: farmer.latestActivityAt || farmer.updatedAt || farmer.createdAt,
    createdAt: farmer.createdAt,
    updatedAt: farmer.updatedAt,
  }));

  return {
    generatedAt: new Date().toISOString(),
    mode: "backend",
    summary,
    records,
  };
}

async function getRegionalMonitoringDashboard() {
  return buildRegionalMonitoringData();
}

async function createRegionalAdvisory({ actorUser, payload }) {
  await ensureAdminSeedData();

  if (
    !payload?.title ||
    !payload?.district ||
    !payload?.sector ||
    !payload?.category ||
    !payload?.severity ||
    !payload?.message ||
    !payload?.recommendedAction ||
    !payload?.deliveryChannel
  ) {
    throw new ApiError(400, "Regional advisory payload is incomplete.");
  }

  const targetFarmers = Number(payload.targetFarmers || 0) || 0;
  const status =
    payload.status || (payload.deliveryChannel === "In-App" ? "Published" : "Sent");

  const advisory = await prisma.regionalAdvisory.create({
    data: {
      title: payload.title,
      district: payload.district,
      sector: payload.sector,
      category: payload.category,
      severity: payload.severity,
      message: payload.message,
      recommendedAction: payload.recommendedAction,
      deliveryChannel: payload.deliveryChannel,
      targetFarmers,
      status,
      createdByUserId: actorUser?.id || null,
    },
    include: {
      author: { select: { fullName: true } },
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "CREATE_REGIONAL_ADVISORY",
      entityType: "RegionalAdvisory",
      entityId: advisory.id,
      details: payload,
    });
  }

  const dashboard = await buildRegionalMonitoringData();
  return {
    advisory: mapAdvisory(advisory),
    dashboard,
  };
}

async function updateWorkflowItem({ actorUser, workflowId, status }) {
  await ensureAdminSeedData();

  const item = await prisma.extensionWorkflowItem.findUnique({ where: { id: workflowId } });
  if (!item) {
    throw new ApiError(404, "Workflow item not found.");
  }

  const updated = await prisma.extensionWorkflowItem.update({
    where: { id: workflowId },
    data: {
      status: status || item.status,
      actorUserId: actorUser?.id || null,
      lastReviewedAt: new Date(),
    },
    include: {
      actorUser: { select: { fullName: true } },
    },
  });

  if (actorUser?.id) {
    await createAuditLog({
      actorUserId: actorUser.id,
      action: "UPDATE_EXTENSION_WORKFLOW",
      entityType: "ExtensionWorkflowItem",
      entityId: workflowId,
      details: { status: updated.status },
    });
  }

  return {
    workflowItem: {
      id: updated.id,
      workflowKey: updated.workflowKey,
      title: updated.title,
      description: updated.description,
      tone: updated.tone,
      status: updated.status,
      openCount: updated.openCount,
      lastReviewedAt: updated.lastReviewedAt,
      actorName: updated.actorUser?.fullName || null,
    },
    summary: await getDashboardSummary(),
  };
}

module.exports = {
  getDashboardSummary,
  getPendingFarmers,
  getFarmerRegistryExport,
  getRegionalMonitoringDashboard,
  createRegionalAdvisory,
  updateWorkflowItem,
};
