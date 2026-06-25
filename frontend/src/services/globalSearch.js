import { authService } from "./auth";

const FARMER_STORAGE_KEY = "agri-feed-farmer-module-v1";
const MOBILE_SUPPORT_STORAGE_KEY = "agri-feed-mobile-support-v1";
const COMMUNITY_STORAGE_KEY = "agri-feed-community-module-v2";
const ANALYTICS_STORAGE_KEY = "agri-feed-analytics-module-v1";
const ADMIN_REPORTS_STORAGE_KEY = "agri-feed-admin-reports-module-v2";
const IRRIGATION_STORAGE_KEY = "agri-feed-irrigation-module-v1";
const MARKET_STORAGE_KEY = "agri-feed-market-module-v2";
const NOTIFICATION_STORAGE_KEY = "agri-feed-notification-center-v3";
const PEST_STORAGE_KEY = "agri-feed-pest-module-v2";
const RECOMMENDATION_FEEDBACK_STORAGE_KEY = "agri-feed-recommendation-feedback-v2";
const ADMIN_CONTENT_STORAGE_KEY = "agri-feed-admin-content-v1";
const REGIONAL_STORAGE_KEY = "agri-feed-regional-intelligence-v2";
const ADMIN_WORKFLOW_KEY = "agri-feed-admin-workflow-v1";

const SHARED_ROUTE_RESULTS = [
  {
    id: "route-dashboard",
    title: "Dashboard",
    module: "Navigation",
    description: "Open the main smart agriculture command center.",
    path: "/dashboard",
    source: "Local Demo Data",
    roles: ["farmer", "admin"],
  },
  {
    id: "route-profile",
    title: "Farm Profile",
    module: "Farmer Profile & Farm Registration",
    description: "View farmer profile, registered farms, and verification details.",
    path: "/profile",
    source: "Local Demo Data",
    roles: ["farmer"],
  },
  {
    id: "route-weather",
    title: "Weather & Climate Analysis",
    module: "Weather & Climate Analysis",
    description: "Open current weather, 7-day forecast, alerts, and climate trend insights.",
    path: "/weather",
    source: "Live Weather Data",
    roles: ["farmer"],
  },
  {
    id: "route-soil",
    title: "Soil & Crop Analysis",
    module: "Soil & Crop Analysis",
    description: "Review soil health, crop suitability, and nutrient recommendations.",
    path: "/soil-crop",
    source: "Local Soil Data",
    roles: ["farmer"],
  },
  {
    id: "route-ai",
    title: "AI Recommendations",
    module: "AI Recommendation Engine",
    description: "Open AI action cards, acceptance feedback, and advisory scheduling.",
    path: "/ai-recommendation",
    source: "Local Demo Data",
    roles: ["farmer"],
  },
  {
    id: "route-pests",
    title: "Pest & Disease",
    module: "Pest & Disease Prediction",
    description: "Inspect farm-specific risk, outbreak forecasts, and treatment options.",
    path: "/pests-diseases",
    source: "Demo Pest Data",
    roles: ["farmer"],
  },
  {
    id: "route-irrigation",
    title: "Irrigation & Fertilizer",
    module: "Irrigation & Fertilizer Advisory",
    description: "View irrigation schedule, fertilizer advisory, and reminders.",
    path: "/irrigation-fertilizer",
    source: "Local Demo Data",
    roles: ["farmer"],
  },
  {
    id: "route-market",
    title: "Market Intelligence",
    module: "Market Intelligence",
    description: "Review price trends, nearby markets, and AI selling recommendations.",
    path: "/market-intelligence",
    source: "Demo Market Data",
    roles: ["farmer"],
  },
  {
    id: "route-analytics",
    title: "Analytics & Reports",
    module: "Analytics & Reporting",
    description: "Open performance analytics, report templates, and export tools.",
    path: "/analytics",
    source: "Local Demo Data",
    roles: ["farmer", "admin"],
  },
  {
    id: "route-notifications",
    title: "Notifications",
    module: "Notification & Alert Center",
    description: "Open the platform alert center, priorities, and acknowledgment tracking.",
    path: "/notifications",
    source: "Local Demo Data",
    roles: ["farmer", "admin"],
  },
  {
    id: "route-community",
    title: "Community & Knowledge",
    module: "Community & Knowledge Sharing",
    description: "Explore discussions, expert Q&A, events, and knowledge resources.",
    path: "/community",
    source: "Local Demo Data",
    roles: ["farmer"],
  },
  {
    id: "route-farmer-management",
    title: "Farmer Management",
    module: "Admin & Extension Officer Portal",
    description: "Review farmer verification, onboarding, and local demo registry data.",
    path: "/farms",
    source: "Local Demo Registry Data",
    roles: ["admin"],
  },
  {
    id: "route-regional",
    title: "Regional Monitoring Dashboard",
    module: "Admin & Extension Officer Portal",
    description: "Inspect regional risk, advisories, community reports, and sector monitoring.",
    path: "/regional-monitoring",
    source: "Demo + Local Data",
    roles: ["admin"],
  },
  {
    id: "route-content",
    title: "Content Management",
    module: "Admin & Extension Officer Portal",
    description: "Manage crops, pests, advisory templates, and fertilizer standards.",
    path: "/recommendations",
    source: "Local Demo Data",
    roles: ["admin"],
  },
  {
    id: "route-settings",
    title: "Settings",
    module: "Global Settings",
    description: "Manage profile preferences, language, mobile support, and sync options.",
    path: "/settings",
    source: "Local Demo Data",
    roles: ["farmer", "admin"],
  },
];

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchesQuery(fields, query) {
  const haystack = fields
    .flat()
    .filter(Boolean)
    .map((value) => normalizeText(value))
    .join(" ");
  return haystack.includes(normalizeText(query));
}

function buildResult({ id, title, module, description, path, source = "Local Demo Data", roles = ["farmer", "admin"] }) {
  return {
    id,
    title,
    module,
    description,
    path,
    source,
    roles,
  };
}

function uniqueResults(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.path}::${item.title}::${item.module}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAllFarmers(farmerState) {
  const users = authService.bootstrap().filter((item) => item.role === "farmer");
  const profiles = asObject(farmerState?.profiles);
  const farms = asArray(farmerState?.farms);

  return users.map((user) => {
    const profile = profiles[user.id] || {};
    const userFarms = farms.filter((farm) => farm.ownerId === user.id);
    return {
      id: user.id,
      name: profile.fullName || user.name,
      email: profile.email || user.email,
      contact: profile.contact || user.contact,
      region: profile.region || user.region,
      experienceLevel: profile.experienceLevel || user.experienceLevel,
      farms: userFarms,
    };
  });
}

function getSoilRecords(farmerState) {
  return asArray(farmerState?.farms).map((farm) => ({
    id: farm.id,
    farmName: farm.name,
    crop: farm.primaryCrop || farm.cropHistory?.[0]?.crop || farm.cropHistory?.[0]?.name,
    landType: farm.landType,
    region: farm.region || farm.location?.label,
    text: [farm.landType, farm.region, farm.primaryCrop].filter(Boolean).join(" · "),
  }));
}

function getWeatherRecords(farms, mobileState) {
  const lastSync = mobileState?.lastSyncAt;
  return farms.map((farm) => ({
    id: `weather-${farm.id}`,
    title: `${farm.name} weather outlook`,
    description: `Live weather context for ${farm.location?.label || farm.region || "selected farm"}${lastSync ? ` · synced ${new Date(lastSync).toLocaleString()}` : ""}.`,
    path: "/weather",
    source: "Live Weather Data",
    roles: ["farmer"],
    module: "Weather & Climate Analysis",
  }));
}

export function searchGlobalRecords({ query, user, farmerData }) {
  const trimmedQuery = String(query || "").trim();
  if (trimmedQuery.length < 2) return [];

  const currentRole = user?.role || "farmer";
  const farmerState = farmerData?.data || readJson(FARMER_STORAGE_KEY, {});
  const mobileState = readJson(MOBILE_SUPPORT_STORAGE_KEY, {});
  const notificationState = readJson(NOTIFICATION_STORAGE_KEY, {});
  const pestState = readJson(PEST_STORAGE_KEY, {});
  const marketState = readJson(MARKET_STORAGE_KEY, {});
  const irrigationState = readJson(IRRIGATION_STORAGE_KEY, {});
  const analyticsState = readJson(ANALYTICS_STORAGE_KEY, {});
  const adminReportsState = readJson(ADMIN_REPORTS_STORAGE_KEY, {});
  const recommendationFeedbackState = readJson(RECOMMENDATION_FEEDBACK_STORAGE_KEY, {});
  const adminContentState = readJson(ADMIN_CONTENT_STORAGE_KEY, {});
  const regionalState = readJson(REGIONAL_STORAGE_KEY, {});
  const communityState = readJson(COMMUNITY_STORAGE_KEY, {});
  const adminWorkflowState = readJson(ADMIN_WORKFLOW_KEY, {});

  const allFarmers = getAllFarmers(farmerState);
  const allFarms = asArray(farmerState?.farms);
  const soilRecords = getSoilRecords(farmerState);
  const results = [];

  SHARED_ROUTE_RESULTS.forEach((item) => {
    if (item.roles.includes(currentRole) && matchesQuery([item.title, item.module, item.description], trimmedQuery)) {
      results.push(item);
    }
  });

  allFarmers.forEach((farmer) => {
    if (
      matchesQuery(
        [
          farmer.name,
          farmer.email,
          farmer.contact,
          farmer.region,
          farmer.experienceLevel,
          farmer.farms.map((farm) => farm.name),
        ],
        trimmedQuery
      )
    ) {
      results.push(
        buildResult({
          id: `farmer-${farmer.id}`,
          title: farmer.name,
          module: currentRole === "admin" ? "Farmer Management" : "Farmer Profile & Farm Registration",
          description: `${farmer.region || "Rwanda"} · ${farmer.experienceLevel || "Farmer"} · ${farmer.farms.length} farm(s)`,
          path: currentRole === "admin" ? "/farms" : "/profile",
          source: "Local Demo Registry Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  allFarms.forEach((farm) => {
    if (
      matchesQuery(
        [
          farm.name,
          farm.region,
          farm.district,
          farm.sector,
          farm.primaryCrop,
          farm.landType,
          farm.location?.label,
        ],
        trimmedQuery
      )
    ) {
      results.push(
        buildResult({
          id: `farm-${farm.id}`,
          title: farm.name,
          module: "Farm Profile & Farm Registration",
          description: `${farm.primaryCrop || "Mixed crop"} · ${farm.region || farm.location?.label || "Rwanda"} · ${farm.sizeHectares || farm.farmSize || "—"} ha`,
          path: "/farms",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  soilRecords.forEach((record) => {
    if (matchesQuery([record.farmName, record.crop, record.landType, record.region], trimmedQuery)) {
      results.push(
        buildResult({
          id: `soil-${record.id}`,
          title: `${record.farmName} soil profile`,
          module: "Soil & Crop Analysis",
          description: record.text || "Local soil data available for this farm.",
          path: "/soil-crop",
          source: "Local Soil Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  getWeatherRecords(allFarms, mobileState).forEach((record) => {
    if (record.roles.includes(currentRole) && matchesQuery([record.title, record.description], trimmedQuery)) {
      results.push(record);
    }
  });

  asArray(notificationState.alerts).forEach((alert) => {
    if (matchesQuery([alert.title, alert.message, alert.category, alert.source, alert.crop, alert.district], trimmedQuery)) {
      results.push(
        buildResult({
          id: `alert-${alert.id}`,
          title: alert.title,
          module: "Notification & Alert Center",
          description: `${alert.category || "Alert"} · ${alert.sourceLabel || alert.source || "Local Demo Data"} · ${alert.district || "Rwanda"}`,
          path: alert.relatedModule || "/notifications",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(pestState.outbreakHistory || pestState.history || pestState.actionTracking).forEach((item) => {
    if (matchesQuery([item.pathogen, item.title, item.action, item.district, item.severity], trimmedQuery)) {
      results.push(
        buildResult({
          id: `pest-${item.id || item.pathogen}`,
          title: item.pathogen || item.title || "Pest advisory",
          module: "Pest & Disease Prediction",
          description: `${item.severity || item.status || "Risk tracked"} · ${item.district || "Regional outbreak data"} · ${item.action || "Open pest intelligence"}`,
          path: "/pests-diseases",
          source: "Demo Pest Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(marketState.nearbyMarkets || marketState.marketComparison || marketState.priceAlerts || marketState.forecastWindows).forEach((item) => {
    if (matchesQuery([item.name, item.market, item.recommendation, item.trend, item.currentPrice, item.targetPrice], trimmedQuery)) {
      results.push(
        buildResult({
          id: `market-${item.id || item.name || item.market}`,
          title: item.name || item.market || "Market insight",
          module: "Market Intelligence",
          description: `${item.recommendation || item.trend || "Market opportunity"} · ${item.distanceKm ? `${item.distanceKm} km` : ""} ${item.currentPrice ? `· ${item.currentPrice}` : ""}`.trim(),
          path: "/market-intelligence",
          source: "Demo Market Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(irrigationState.reminders || irrigationState.schedule || irrigationState.irrigationSchedule || irrigationState.fertilizerRecommendations).forEach((item) => {
    if (matchesQuery([item.task, item.date, item.crop, item.stage, item.priority, item.type, item.status], trimmedQuery)) {
      results.push(
        buildResult({
          id: `irrigation-${item.id || item.date || item.task}`,
          title: item.task || item.recommendation || `${item.crop || "Farm"} advisory`,
          module: "Irrigation & Fertilizer Advisory",
          description: `${item.stage || item.type || "Irrigation"} · ${item.date || item.window || "Scheduled locally"} · ${item.status || "Pending"}`,
          path: "/irrigation-fertilizer",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(recommendationFeedbackState.feedback || recommendationFeedbackState.history || recommendationFeedbackState.records).forEach((item) => {
    if (matchesQuery([item.actionType, item.feedbackStatus, item.rejectionReason, item.crop, item.priority], trimmedQuery)) {
      results.push(
        buildResult({
          id: `recommendation-feedback-${item.recommendationId || item.id}`,
          title: `${item.actionType || "AI recommendation"} feedback`,
          module: "AI Recommendation Engine",
          description: `${item.feedbackStatus || "Tracked"}${item.rejectionReason ? ` · ${item.rejectionReason}` : ""}`,
          path: "/ai-recommendation",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(analyticsState.savedReports || analyticsState.reportRows || analyticsState.reports).forEach((item) => {
    if (matchesQuery([item.period, item.reportName, item.status, item.template, item.title], trimmedQuery)) {
      results.push(
        buildResult({
          id: `analytics-${item.id || item.period || item.title}`,
          title: item.title || item.reportName || item.period || "Analytics report",
          module: "Analytics & Reporting",
          description: `${item.status || "Demo Analytics"}${item.template ? ` · ${item.template}` : ""}`,
          path: "/analytics",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(adminReportsState.exportHistory || adminReportsState.savedReports || adminReportsState.complianceReports).forEach((item) => {
    if (matchesQuery([item.title, item.template, item.standard, item.status], trimmedQuery)) {
      results.push(
        buildResult({
          id: `admin-report-${item.id || item.title}`,
          title: item.title || item.template || "Admin report",
          module: "Reports & Data Export",
          description: `${item.standard || item.status || "Export ready"} · ${item.template || "Admin reporting"}`,
          path: "/analytics",
          source: "Local Demo Data",
          roles: ["admin"],
        })
      );
    }
  });

  const adminContentArrays = [
    ...asArray(adminContentState.Crops),
    ...asArray(adminContentState.Pests),
    ...asArray(adminContentState["Advisory Logic"]),
    ...asArray(adminContentState["Fertilizer Standards"]),
    ...asArray(adminContentState["Advisory Templates"]),
    ...asArray(adminContentState.auditTrail),
  ];

  adminContentArrays.forEach((item) => {
    if (
      matchesQuery(
        [
          item.crop,
          item.name,
          item.title,
          item.category,
          item.status,
          item.zone,
          item.summary,
          item.module,
        ],
        trimmedQuery
      )
    ) {
      results.push(
        buildResult({
          id: `content-${item.id || item.crop || item.name || item.title}`,
          title: item.crop || item.name || item.title || "Content item",
          module: "Content Management",
          description: `${item.category || item.module || "Knowledge base"} · ${item.status || item.zone || "Local content"}`,
          path: "/recommendations",
          source: "Local Demo Data",
          roles: ["admin"],
        })
      );
    }
  });

  asArray(regionalState.advisories).forEach((item) => {
    if (matchesQuery([item.title, item.district, item.sector, item.status, item.channel, item.message], trimmedQuery)) {
      results.push(
        buildResult({
          id: `regional-advisory-${item.id || item.title}`,
          title: item.title,
          module: "Regional Monitoring Dashboard",
          description: `${item.district || "Rwanda"} · ${item.status || "Draft"} · ${item.channel || "In-App"}`,
          path: "/regional-monitoring",
          source: "Demo + Local Data",
          roles: ["admin"],
        })
      );
    }
  });

  asArray(regionalState.communityReports).forEach((item) => {
    if (matchesQuery([item.title, item.farmer, item.district, item.sector, item.category, item.status], trimmedQuery)) {
      results.push(
        buildResult({
          id: `community-report-${item.id || item.title}`,
          title: item.title,
          module: currentRole === "admin" ? "Regional Monitoring Dashboard" : "Community & Regional Alerts",
          description: `${item.district || "Rwanda"} · ${item.category || "Report"} · ${item.status || "Pending"}`,
          path: currentRole === "admin" ? "/regional-monitoring" : "/community",
          source: "Demo + Local Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(communityState.discussions).forEach((item) => {
    if (matchesQuery([item.title, item.summary, item.category, item.crop, item.region, item.topic], trimmedQuery)) {
      results.push(
        buildResult({
          id: `discussion-${item.id}`,
          title: item.title,
          module: "Community & Knowledge Sharing",
          description: `${item.category} · ${item.region} · ${item.validationStatus || "Open discussion"}`,
          path: "/community",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(communityState.events).forEach((item) => {
    if (matchesQuery([item.title, item.type, item.region, item.venue, item.date], trimmedQuery)) {
      results.push(
        buildResult({
          id: `event-${item.id}`,
          title: item.title,
          module: "Community & Knowledge Sharing",
          description: `${item.type} · ${item.date} · ${item.region}`,
          path: "/community",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(communityState.resources).forEach((item) => {
    if (matchesQuery([item.title, item.type], trimmedQuery)) {
      results.push(
        buildResult({
          id: `resource-${item.id}`,
          title: item.title,
          module: "Community & Knowledge Sharing",
          description: item.type,
          path: "/community",
          source: "Local Demo Data",
          roles: ["farmer", "admin"],
        })
      );
    }
  });

  asArray(adminWorkflowState.pendingApprovals || adminWorkflowState.reports || adminWorkflowState.advisories).forEach((item) => {
    if (matchesQuery([item.title, item.name, item.location, item.status, item.type], trimmedQuery)) {
      results.push(
        buildResult({
          id: `admin-workflow-${item.id || item.title || item.name}`,
          title: item.title || item.name || "Admin workflow item",
          module: "Admin Dashboard",
          description: `${item.location || item.type || "Workflow"} · ${item.status || "Pending review"}`,
          path: "/dashboard",
          source: "Local Demo Data",
          roles: ["admin"],
        })
      );
    }
  });

  return uniqueResults(results)
    .filter((item) => item.roles.includes(currentRole))
    .sort((left, right) => left.module.localeCompare(right.module) || left.title.localeCompare(right.title));
}

export function groupSearchResults(results) {
  return results.reduce((groups, item) => {
    if (!groups[item.module]) {
      groups[item.module] = [];
    }
    groups[item.module].push(item);
    return groups;
  }, {});
}
