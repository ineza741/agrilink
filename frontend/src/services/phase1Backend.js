const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(
  /\/$/,
  ""
);

const REQUEST_TIMEOUT_MS = 9000;
const TOKEN_KEY = "agri-feed-access-token";
const AUTH_SOURCE_KEY = "agri-feed-auth-source";

const DISTRICT_PROVINCE_MAP = {
  "Kicukiro District": "Kigali City",
  "Gasabo District": "Kigali City",
  "Nyarugenge District": "Kigali City",
  "Bugesera District": "Eastern Province",
  "Rwamagana District": "Eastern Province",
  "Kayonza District": "Eastern Province",
  "Musanze District": "Northern Province",
  "Burera District": "Northern Province",
  "Gicumbi District": "Northern Province",
  "Huye District": "Southern Province",
  "Nyanza District": "Southern Province",
  "Rubavu District": "Western Province",
  "Karongi District": "Western Province",
};

function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function getStoredAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function setAuthSource(source) {
  if (source) {
    localStorage.setItem(AUTH_SOURCE_KEY, source);
  } else {
    localStorage.removeItem(AUTH_SOURCE_KEY);
  }
}

export function clearBackendSession() {
  setStoredAccessToken("");
  setAuthSource("");
}

export function isBackendSessionActive() {
  return localStorage.getItem(AUTH_SOURCE_KEY) === "backend" && Boolean(getStoredAccessToken());
}

function normalizeRole(role = "") {
  return String(role).trim().toLowerCase();
}

function normalizeVerificationStatus(status = "") {
  return String(status).trim().toLowerCase() || "pending";
}

function splitRegionInput(region = "") {
  const parts = String(region)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const sector = parts.find((part) => /sector/i.test(part)) || parts[0] || "Gatenga Sector";
  const district = parts.find((part) => /district/i.test(part)) || parts[1] || "Kicukiro District";
  const province =
    parts.find((part) => /province|city/i.test(part)) ||
    DISTRICT_PROVINCE_MAP[district] ||
    "Kigali City";

  return {
    sector,
    district,
    province,
    regionLabel: [sector, district, province].filter(Boolean).join(", "),
  };
}

function buildMapCoordinates(latitude = 0, longitude = 0) {
  const clampedLng = Math.max(29.3, Math.min(30.9, Number(longitude) || 0));
  const clampedLat = Math.max(-2.9, Math.min(-1.0, Number(latitude) || 0));
  const mapX = ((clampedLng - 29.3) / (30.9 - 29.3)) * 100;
  const mapY = ((clampedLat - -2.9) / (-1.0 - -2.9)) * 100;

  return {
    mapX: Number(mapX.toFixed(1)),
    mapY: Number(100 - mapY.toFixed(1)),
  };
}

async function requestJson(path, options = {}) {
  const {
    method = "GET",
    body,
    token = getStoredAccessToken(),
    timeoutMs = REQUEST_TIMEOUT_MS,
    headers = {},
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.message || `Request failed with status ${response.status}`);
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Phase 1 backend request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function mapBackendUserToFrontendUser(user) {
  if (!user) return null;

  const profile = user.farmerProfile || null;

  return {
    id: user.id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    contact: user.phone,
    phone: user.phone,
    role: normalizeRole(user.role),
    isActive: Boolean(user.isActive),
    region: profile?.region || "",
    district: profile?.district || "",
    sector: profile?.sector || "",
    experienceLevel: profile?.experienceLevel || "Intermediate",
    primaryCrop: profile?.primaryCrop || "Maize",
    verificationStatus: normalizeVerificationStatus(profile?.verificationStatus),
    profileCompleteness: profile?.profileCompleteness || 0,
    farmerProfileId: profile?.id || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    authSource: "backend",
  };
}

export function mapBackendProfileToFrontendProfile(profile) {
  if (!profile) return null;

  return {
    userId: profile.user?.id || "",
    fullName: profile.user?.fullName || "",
    email: profile.user?.email || "",
    contact: profile.user?.phone || "",
    region: [profile.sector, profile.district].filter(Boolean).join(", ") || profile.region || "",
    district: profile.district || "",
    sector: profile.sector || "",
    experienceLevel: profile.experienceLevel || "",
    primaryCrop: profile.primaryCrop || "",
    farmerType: "Individual Farmer",
    cooperativeName: "",
    notes: profile.reviewNotes || "",
    verificationStatus: normalizeVerificationStatus(profile.verificationStatus),
    verifiedBy: "",
    profileCompleteness: profile.profileCompleteness || 0,
    submittedAt: profile.createdAt,
    approvedAt: profile.updatedAt,
    backendProfileId: profile.id,
  };
}

export function mapBackendCropHistoryToFrontendHistory(entry) {
  if (!entry) return null;

  return {
    id: entry.id,
    crop: entry.cropName,
    season: `${entry.season} ${entry.year}`,
    yield:
      entry.yieldAmount !== null && entry.yieldAmount !== undefined
        ? `${entry.yieldAmount} ${entry.yieldUnit || ""}`.trim()
        : entry.notes || "",
    challenges: entry.challenges || entry.notes || "",
    year: entry.year,
    yieldAmount: entry.yieldAmount ?? null,
    yieldUnit: entry.yieldUnit || "",
    notes: entry.notes || "",
    createdAt: entry.createdAt,
  };
}

function normalizeLimitingFactors(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

export function mapBackendSuitabilityResult(result) {
  if (!result) return null;

  return {
    ...result,
    limitingFactors: normalizeLimitingFactors(result.limitingFactors),
  };
}

export function mapBackendFertilizerRecommendation(recommendation) {
  if (!recommendation) return null;

  return {
    ...recommendation,
    nitrogenKgHa: Number(recommendation.nitrogenKgHa || 0),
    phosphorusKgHa: Number(recommendation.phosphorusKgHa || 0),
    potassiumKgHa: Number(recommendation.potassiumKgHa || 0),
  };
}

export function mapBackendSoilTest(record) {
  if (!record) return null;

  return {
    ...record,
    ph: Number(record.ph || 0),
    nitrogen: Number(record.nitrogen || 0),
    phosphorus: Number(record.phosphorus || 0),
    potassium: Number(record.potassium || 0),
    organicMatter: Number(record.organicMatter || 0),
    healthScore: Number(record.healthScore || 0),
    suitabilityResults: Array.isArray(record.suitabilityResults)
      ? record.suitabilityResults.map(mapBackendSuitabilityResult)
      : [],
    fertilizerRecommendation: mapBackendFertilizerRecommendation(record.fertilizerRecommendation),
  };
}

export function mapBackendIrrigationReminder(record) {
  if (!record) return null;

  return {
    id: record.id,
    farmId: record.farmId,
    advisoryId: record.advisoryId || "",
    dateKey: record.dateKey,
    type: record.type,
    priority: record.priority,
    status: record.status,
    note: record.note || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapBackendIrrigationAdvisory(record) {
  if (!record) return null;

  return {
    ...record,
    referenceEt: Number(record.referenceEt || 0),
    cropCoefficient: Number(record.cropCoefficient || 0),
    cropEt: Number(record.cropEt || 0),
    totalRain: Number(record.totalRain || 0),
    effectiveRain: Number(record.effectiveRain || 0),
    waterRequirementPerHa: Number(record.waterRequirementPerHa || 0),
    waterRequirementTotal: Number(record.waterRequirementTotal || 0),
    targetYield: Number(record.targetYield || 0),
    budget: Number(record.budget || 0),
    soilMoisture: Number(record.soilMoisture || 0),
    scheduleDates: Array.isArray(record.scheduleDates)
      ? record.scheduleDates.map((entry) => ({
          ...entry,
          waterRequirement: Number(entry.waterRequirement || 0),
          recommendedMm: Number(entry.recommendedMm || 0),
          rainfallForecast: Number(entry.rainfallForecast || 0),
          rainfallProbability: Number(entry.rainfallProbability || 0),
          evapotranspiration: Number(entry.evapotranspiration || 0),
          soilMoisture: Number(entry.soilMoisture || 0),
        }))
      : [],
    resourceMonitoring: Array.isArray(record.resourceMonitoring) ? record.resourceMonitoring : [],
    waterConservationAdvice: Array.isArray(record.waterConservationAdvice)
      ? record.waterConservationAdvice
      : [],
  };
}

export function mapBackendWeatherDashboard(record) {
  if (!record) return null;

  return {
    sourceMode: record.sourceMode || "backend",
    sourceLabel: record.sourceLabel || "Live Weather Data",
    farm: record.farm || null,
    current: record.current || null,
    daily: record.daily || null,
    forecastDays: Array.isArray(record.forecastDays) ? record.forecastDays : [],
    alerts: Array.isArray(record.alerts) ? record.alerts : [],
    plantingGuidance: record.plantingGuidance || null,
    historicalSeries: Array.isArray(record.historicalSeries) ? record.historicalSeries : [],
    chartSeries: record.chartSeries || {
      points: [],
      tempValues: [],
      rainValues: [],
      areaPath: "",
      tempPath: "",
      rainPath: "",
      labels: [],
    },
    metrics: record.metrics || {},
    forecastUrl: record.forecastUrl || "",
    historicalUrl: record.historicalUrl || "",
    selectedRange: record.selectedRange || "1M",
    warning: record.warning || "",
    lastUpdated: record.lastUpdated || "",
    snapshotId: record.snapshotId || "",
  };
}

export function mapBackendWeatherHistory(record) {
  if (!record) return null;

  return {
    snapshots: Array.isArray(record.snapshots) ? record.snapshots : [],
    archives: Array.isArray(record.archives) ? record.archives : [],
  };
}

export function mapBackendMarketAnalysis(record) {
  if (!record) return null;

  const markets = Array.isArray(record.markets)
    ? record.markets.map((market) => ({
        ...market,
        distanceKm: Number(market.distanceKm || 0),
        currentPrice: Number(market.currentPrice || 0),
        demandScore: Number(market.demandScore || 0),
        trendChange: Number(market.trendChange || 0),
        accessibilityScore: Number(market.accessibilityScore || 0),
        opportunityScore: Number(market.opportunityScore || 0),
        wholesalePrice: Number(market.wholesalePrice || 0),
        exportPrice: Number(market.exportPrice || 0),
      }))
    : [];

  const bestMarket =
    record.bestMarket ||
    (record.bestMarketName ? markets.find((item) => item.name === record.bestMarketName) : null) ||
    markets[0] ||
    null;

  return {
    ...record,
    currentPrice: Number(record.currentPrice || 0),
    demandForecast: Number(record.demandForecast || 0),
    aiConfidence: Number(record.aiConfidence || 0),
    trendBars: Array.isArray(record.trendBars) ? record.trendBars : [],
    forecasts: Array.isArray(record.forecasts)
      ? record.forecasts.map((forecast) => ({
          ...forecast,
          currentPrice: Number(forecast.currentPrice || 0),
          predictedPrice: Number(forecast.predictedPrice || 0),
          forecastChange: Number(forecast.forecastChange || 0),
          confidence: Number(forecast.confidence || 0),
        }))
      : [],
    logisticsTips: Array.isArray(record.logisticsTips) ? record.logisticsTips : [],
    platforms: Array.isArray(record.platforms) ? record.platforms : [],
    markets,
    bestMarket,
  };
}

export function mapBackendMarketAlert(record) {
  if (!record) return null;

  return {
    id: record.id,
    crop: record.crop || record.cropName || "",
    targetPrice: Number(record.targetPrice || 0),
    currentPrice: Number(record.currentPrice || 0),
    bestMarketName: record.bestMarketName || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status || "Monitoring",
    farmId: record.farmId || "",
  };
}

export function mapBackendPestHistory(record) {
  if (!record) return null;

  return {
    id: record.id,
    date: record.date || record.createdAt || new Date().toISOString(),
    monthLabel: record.monthLabel || "",
    pathogen: record.pathogen || record.scientificName || "",
    severity: record.severity || record.currentRisk || "Moderate",
    action: record.action || "",
    district: record.district || "",
  };
}

export function mapBackendPestAction(record) {
  if (!record) return null;

  return {
    id: record.id,
    diagnosisId: record.diagnosisId || "",
    farmId: record.farmId || "",
    recommendationId: record.recommendationId || "",
    actionType: record.actionType || "Pest/Disease",
    feedbackStatus: record.feedbackStatus || "",
    rejectionReason: record.rejectionReason || "",
    timestamp: record.timestamp || record.createdAt || new Date().toISOString(),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapBackendPestDiagnosis(record) {
  if (!record) return null;

  return {
    ...record,
    crop: record.crop || record.cropName || "",
    affectedArea: Number(record.affectedArea || 0),
    confidence: Number(record.confidence || 0),
    farmRiskScore: Number(record.farmRiskScore || 0),
    regionalRiskScore: Number(record.regionalRiskScore || 0),
    yieldLoss: Number(record.yieldLoss || 0),
    economicLoss: Number(record.economicLoss || 0),
    ranked: Array.isArray(record.ranked) ? record.ranked : [],
    historyLog: Array.isArray(record.historyLog) ? record.historyLog.map(mapBackendPestHistory) : [],
    library: Array.isArray(record.library) ? record.library : [],
    topDiagnosis: record.topDiagnosis || null,
    explanation: record.explanation || {},
    outbreakForecast: record.outbreakForecast || {},
    recommendation: record.recommendation || {},
    weatherContribution: record.weatherContribution || {},
  };
}

export function mapBackendRecommendationFeedback(record) {
  if (!record) return null;

  return {
    id: record.id,
    runId: record.runId || "",
    farmId: record.farmId || "",
    recommendationId: record.recommendationId || "",
    actionType: record.actionType || "",
    feedbackStatus: record.feedbackStatus || "",
    rejectionReason: record.rejectionReason || "",
    note: record.note || "",
    timestamp: record.createdAt || record.timestamp || new Date().toISOString(),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapBackendRecommendationRun(record) {
  if (!record) return null;

  return {
    ...record,
    recommendations: Array.isArray(record.recommendations)
      ? record.recommendations.map((item) => ({
          ...item,
          confidence: Number(item.confidence || 0),
          actionLog: Array.isArray(item.actionLog) ? item.actionLog : [],
        }))
      : [],
    scheduler: Array.isArray(record.scheduler) ? record.scheduler : [],
    analytics: record.analytics || {},
    feedback: Array.isArray(record.feedback)
      ? record.feedback.map(mapBackendRecommendationFeedback)
      : [],
  };
}

export function mapBackendNotificationPreference(record) {
  if (!record) return null;

  return {
    id: record.id,
    userId: record.userId || "",
    delivery: record.delivery || {},
    categories: record.categories || {},
    summaries: record.summaries || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapBackendNotificationAlert(record) {
  if (!record) return null;

  return {
    ...record,
    confidence: Number(record.confidence || 0),
    channels: Array.isArray(record.channels) ? record.channels : [],
    escalationPath: Array.isArray(record.escalationPath) ? record.escalationPath : [],
    escalationLevel: Number(record.escalationLevel || 0),
  };
}

export function mapBackendNotificationTemplate(record) {
  if (!record) return null;

  return {
    ...record,
    lastUpdated: record.lastUpdated
      ? new Date(record.lastUpdated).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
  };
}

export function mapBackendAnalyticsExport(record) {
  if (!record) return null;

  return {
    ...record,
    payload: record.payload || {},
    timeLabel: record.timeLabel || "",
    dateLabel: record.dateLabel || "",
  };
}

export function mapBackendFarmToFrontendFarm(farm, ownerId, existingFarm = null) {
  if (!farm) return null;

  const locationLabel = [farm.sector, farm.district, farm.province].filter(Boolean).join(", ");
  const mapCoordinates = buildMapCoordinates(farm.latitude, farm.longitude);

  return {
    id: farm.id,
    ownerId,
    name: farm.farmName,
    plotLabel: existingFarm?.plotLabel || capitalize(farm.ownershipType || "Main Plot"),
    region: [farm.sector, farm.district, farm.province].filter(Boolean).join(", "),
    sizeHectares: Number(farm.farmSize || 0),
    landType: farm.landType || existingFarm?.landType || "",
    irrigationType: existingFarm?.irrigationType || "Manual Irrigation",
    primaryCrop: farm.currentCrop || existingFarm?.primaryCrop || "",
    cooperativeName: existingFarm?.cooperativeName || "",
    location: {
      lat: Number(farm.latitude || 0),
      lng: Number(farm.longitude || 0),
      mapX: existingFarm?.location?.mapX ?? mapCoordinates.mapX,
      mapY: existingFarm?.location?.mapY ?? mapCoordinates.mapY,
      label: existingFarm?.location?.label || locationLabel,
      boundary: existingFarm?.location?.boundary || farm.farmBoundary || null,
    },
    photoName: existingFarm?.photoName || "",
    status: existingFarm?.status || "active",
    verificationStatus: existingFarm?.verificationStatus || "verified",
    cropStage: farm.cropStage || existingFarm?.cropStage || "Vegetative",
    soilType: farm.soilType || existingFarm?.soilType || farm.landType || "",
    ownershipType: farm.ownershipType || existingFarm?.ownershipType || "Farmer managed",
    history:
      farm.cropHistories?.map(mapBackendCropHistoryToFrontendHistory) || existingFarm?.history || [],
    createdAt: farm.createdAt || existingFarm?.createdAt || new Date().toISOString(),
    updatedAt: farm.updatedAt || new Date().toISOString(),
    backendFarmId: farm.id,
  };
}

export function mapBackendFarmerProfileRecord(record) {
  if (!record) return null;

  const profile = mapBackendProfileToFrontendProfile(record);
  const farms = Array.isArray(record.farms)
    ? record.farms.map((farm) => mapBackendFarmToFrontendFarm(farm, record.user.id))
    : [];

  return {
    userId: record.user.id,
    profile,
    farms,
    row: {
      userId: record.user.id,
      initials: (record.user.fullName || "UF")
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      name: record.user.fullName,
      id: `#FRM-${record.user.id.slice(-5).toUpperCase()}`,
      region: [record.sector, record.district].filter(Boolean).join(", ") || record.region,
      status: normalizeVerificationStatus(record.verificationStatus),
      joined: record.user.createdAt,
      farmCount: farms.length,
      completeness: record.profileCompleteness || 0,
      profile,
      contact: record.user.phone,
      email: record.user.email,
      experienceLevel: record.experienceLevel || "Intermediate",
      primaryCrop: record.primaryCrop || farms[0]?.primaryCrop || "Mixed farming",
    },
  };
}

export function buildBackendRegisterPayload(payload) {
  const { sector, district } = splitRegionInput(payload.region);

  return {
    fullName: payload.name || payload.fullName || "",
    email: payload.email || "",
    phone: payload.contact || payload.phone || "",
    password: payload.password || "",
    region: payload.region || [sector, district].join(", "),
    district,
    sector,
    experienceLevel: payload.experienceLevel || "Intermediate",
    primaryCrop: payload.primaryCrop || "Maize",
  };
}

export function buildBackendProfilePayload(updates, fallbackProfile = null) {
  const regionInput = updates.region || fallbackProfile?.region || "";
  const { sector, district } = splitRegionInput(regionInput);

  return {
    ...(updates.fullName ? { fullName: updates.fullName } : {}),
    ...(updates.contact || updates.phone
      ? { phone: updates.contact || updates.phone }
      : {}),
    ...(regionInput ? { region: regionInput, district, sector } : {}),
    ...(updates.experienceLevel ? { experienceLevel: updates.experienceLevel } : {}),
    ...(updates.primaryCrop || fallbackProfile?.primaryCrop
      ? { primaryCrop: updates.primaryCrop || fallbackProfile?.primaryCrop || "Maize" }
      : {}),
  };
}

export function buildBackendFarmPayload(farmInput) {
  const { sector, district, province } = splitRegionInput(farmInput.region);

  return {
    farmName: farmInput.name,
    province,
    district,
    sector,
    latitude: Number(farmInput.location?.lat ?? farmInput.lat ?? 0),
    longitude: Number(farmInput.location?.lng ?? farmInput.lng ?? 0),
    farmSize: Number(farmInput.sizeHectares || 0),
    farmSizeUnit: "hectares",
    landType: farmInput.landType || "Loamy",
    soilType: farmInput.soilType || farmInput.landType || "Loamy",
    currentCrop: farmInput.primaryCrop || "Maize",
    cropStage: farmInput.cropStage || "Vegetative",
    ownershipType: farmInput.ownershipType || farmInput.plotLabel || "Farmer managed",
    farmBoundary: farmInput.location?.boundary || null,
  };
}

function persistBackendAuth(result) {
  if (result?.token) {
    setStoredAccessToken(result.token);
    setAuthSource("backend");
  }

  return mapBackendUserToFrontendUser(result?.user);
}

export const phase1BackendService = {
  enabled: true,
  apiBaseUrl: API_BASE_URL,
  isBackendSessionActive,
  clearBackendSession,
  auth: {
    async login(credentials) {
      const response = await requestJson("/auth/login", {
        method: "POST",
        body: credentials,
      });

      return persistBackendAuth(response?.data);
    },
    async register(payload) {
      const response = await requestJson("/auth/register", {
        method: "POST",
        body: buildBackendRegisterPayload(payload),
      });

      return persistBackendAuth(response?.data);
    },
    async registerFarmerForAdmin(payload) {
      const response = await requestJson("/auth/register", {
        method: "POST",
        body: buildBackendRegisterPayload(payload),
        token: null,
      });

      return {
        token: response?.data?.token || "",
        user: mapBackendUserToFrontendUser(response?.data?.user),
      };
    },
    async me() {
      const response = await requestJson("/auth/me");
      return mapBackendUserToFrontendUser(response?.data);
    },
  },
  farmers: {
    async me() {
      const response = await requestJson("/farmers/me");
      return mapBackendProfileToFrontendProfile(response?.data);
    },
    async updateMe(updates, fallbackProfile = null) {
      const response = await requestJson("/farmers/me", {
        method: "PUT",
        body: buildBackendProfilePayload(updates, fallbackProfile),
      });

      return mapBackendProfileToFrontendProfile(response?.data);
    },
    async list() {
      const response = await requestJson("/farmers");
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendFarmerProfileRecord);
    },
    async getById(id) {
      const response = await requestJson(`/farmers/${id}`);
      return mapBackendFarmerProfileRecord(response?.data);
    },
    async approve(id, reason = "") {
      const response = await requestJson(`/farmers/${id}/approve`, {
        method: "PUT",
        body: reason ? { reason } : {},
      });
      return mapBackendFarmerProfileRecord(response?.data);
    },
    async reject(id, reason = "") {
      const response = await requestJson(`/farmers/${id}/reject`, {
        method: "PUT",
        body: reason ? { reason } : {},
      });
      return mapBackendFarmerProfileRecord(response?.data);
    },
    async deactivate(id, reason = "") {
      const response = await requestJson(`/farmers/${id}/deactivate`, {
        method: "PUT",
        body: reason ? { reason } : {},
      });
      return mapBackendFarmerProfileRecord(response?.data);
    },
    async reactivate(id, reason = "") {
      const response = await requestJson(`/farmers/${id}/reactivate`, {
        method: "PUT",
        body: reason ? { reason } : {},
      });
      return mapBackendFarmerProfileRecord(response?.data);
    },
  },
  farms: {
    async my(ownerId, localFarms = []) {
      const response = await requestJson("/farms/my");
      const farms = Array.isArray(response?.data) ? response.data : [];
      const localById = new Map(localFarms.map((farm) => [farm.id, farm]));
      return farms.map((farm) => mapBackendFarmToFrontendFarm(farm, ownerId, localById.get(farm.id)));
    },
    async create(ownerId, farmInput, existingFarm = null) {
      const response = await requestJson("/farms", {
        method: "POST",
        body: buildBackendFarmPayload(farmInput),
      });

      return mapBackendFarmToFrontendFarm(response?.data, ownerId, existingFarm || farmInput);
    },
    async update(ownerId, farmId, farmInput, existingFarm = null) {
      const response = await requestJson(`/farms/${farmId}`, {
        method: "PUT",
        body: buildBackendFarmPayload(farmInput),
      });

      return mapBackendFarmToFrontendFarm(response?.data, ownerId, existingFarm || farmInput);
    },
    async remove(farmId) {
      const response = await requestJson(`/farms/${farmId}`, {
        method: "DELETE",
      });

      return response?.data || { deleted: true };
    },
    async createWithToken(ownerId, farmInput, token, existingFarm = null) {
      const response = await requestJson("/farms", {
        method: "POST",
        body: buildBackendFarmPayload(farmInput),
        token,
      });

      return mapBackendFarmToFrontendFarm(response?.data, ownerId, existingFarm || farmInput);
    },
  },
  cropHistory: {
    async listByFarm(farmId) {
      const response = await requestJson(`/farms/${farmId}/crop-history`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendCropHistoryToFrontendHistory);
    },
    async create(farmId, entry) {
      const response = await requestJson(`/farms/${farmId}/crop-history`, {
        method: "POST",
        body: {
          cropName: entry.crop || entry.cropName || "",
          season: String(entry.season || "").split(" ")[0] || "",
          year: Number(entry.year || String(entry.season || "").split(" ").pop() || new Date().getFullYear()),
          yieldAmount:
            entry.yieldAmount !== undefined && entry.yieldAmount !== null
              ? Number(entry.yieldAmount)
              : null,
          yieldUnit: entry.yieldUnit || null,
          challenges: entry.challenges || null,
          notes: entry.notes || null,
        },
      });
      return mapBackendCropHistoryToFrontendHistory(response?.data);
    },
    async update(id, entry) {
      const response = await requestJson(`/crop-history/${id}`, {
        method: "PUT",
        body: {
          ...(entry.crop || entry.cropName ? { cropName: entry.crop || entry.cropName } : {}),
          ...(entry.season ? { season: String(entry.season).split(" ")[0] } : {}),
          ...(entry.year ? { year: Number(entry.year) } : {}),
          ...(entry.yieldAmount !== undefined ? { yieldAmount: Number(entry.yieldAmount) } : {}),
          ...(entry.yieldUnit !== undefined ? { yieldUnit: entry.yieldUnit || null } : {}),
          ...(entry.challenges !== undefined ? { challenges: entry.challenges || null } : {}),
          ...(entry.notes !== undefined ? { notes: entry.notes || null } : {}),
        },
      });
      return mapBackendCropHistoryToFrontendHistory(response?.data);
    },
    async remove(id) {
      const response = await requestJson(`/crop-history/${id}`, {
        method: "DELETE",
      });
      return response?.data || { deleted: true };
    },
  },
  soil: {
    async create(payload) {
      const response = await requestJson("/soil-tests", {
        method: "POST",
        body: payload,
      });
      return mapBackendSoilTest(response?.data);
    },
    async listByFarm(farmId) {
      const response = await requestJson(`/soil-tests/farm/${farmId}`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendSoilTest);
    },
    async update(id, payload) {
      const response = await requestJson(`/soil-tests/${id}`, {
        method: "PUT",
        body: payload,
      });
      return mapBackendSoilTest(response?.data);
    },
    async remove(id) {
      const response = await requestJson(`/soil-tests/${id}`, {
        method: "DELETE",
      });
      return response?.data || { deleted: true };
    },
    async analyze(id) {
      const response = await requestJson(`/soil-tests/${id}/analyze`, {
        method: "POST",
      });
      const data = response?.data || {};
      return {
        ...data,
        soilTest: mapBackendSoilTest(data.soilTest),
        suitabilityResults: Array.isArray(data.suitabilityResults)
          ? data.suitabilityResults.map(mapBackendSuitabilityResult)
          : [],
        fertilizerRecommendation: mapBackendFertilizerRecommendation(data.fertilizerRecommendation),
      };
    },
    async getSuitabilityByFarm(farmId) {
      const response = await requestJson(`/crop-suitability/farm/${farmId}`);
      const data = response?.data || {};
      return {
        latestSoilTest: mapBackendSoilTest(data.latestSoilTest),
        suitabilityResults: Array.isArray(data.suitabilityResults)
          ? data.suitabilityResults.map(mapBackendSuitabilityResult)
          : [],
        fertilizerRecommendation: mapBackendFertilizerRecommendation(data.fertilizerRecommendation),
      };
    },
  },
  irrigation: {
    async calculate(farmId, payload) {
      const response = await requestJson(`/irrigation/farms/${farmId}/calculate`, {
        method: "POST",
        body: payload,
      });
      return mapBackendIrrigationAdvisory(response?.data);
    },
    async latest(farmId) {
      const response = await requestJson(`/irrigation/farms/${farmId}/latest`);
      return mapBackendIrrigationAdvisory(response?.data);
    },
    async listReminders(farmId) {
      const response = await requestJson(`/irrigation/farms/${farmId}/reminders`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendIrrigationReminder);
    },
    async createReminder(farmId, payload) {
      const response = await requestJson(`/irrigation/farms/${farmId}/reminders`, {
        method: "POST",
        body: payload,
      });
      return mapBackendIrrigationReminder(response?.data);
    },
    async updateReminder(id, payload) {
      const response = await requestJson(`/irrigation/reminders/${id}`, {
        method: "PUT",
        body: payload,
      });
      return mapBackendIrrigationReminder(response?.data);
    },
    async removeReminder(id) {
      const response = await requestJson(`/irrigation/reminders/${id}`, {
        method: "DELETE",
      });
      return response?.data || { deleted: true };
    },
  },
  market: {
    async analyze(farmId, payload) {
      const response = await requestJson(`/market/farms/${farmId}/analyze`, {
        method: "POST",
        body: payload,
      });
      return mapBackendMarketAnalysis(response?.data);
    },
    async latest(farmId, params = {}) {
      const query = new URLSearchParams();
      if (params.crop) query.set("crop", params.crop);
      if (params.timeframe) query.set("timeframe", params.timeframe);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/market/farms/${farmId}/latest${suffix}`);
      return mapBackendMarketAnalysis(response?.data);
    },
    async listAlerts(farmId) {
      const response = await requestJson(`/market/farms/${farmId}/alerts`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendMarketAlert);
    },
    async createAlert(farmId, payload) {
      const response = await requestJson(`/market/farms/${farmId}/alerts`, {
        method: "POST",
        body: payload,
      });
      return mapBackendMarketAlert(response?.data);
    },
    async removeAlert(id) {
      const response = await requestJson(`/market/alerts/${id}`, {
        method: "DELETE",
      });
      return response?.data || { deleted: true };
    },
  },
  pests: {
    async library(params = {}) {
      const query = new URLSearchParams();
      if (params.crop) query.set("crop", params.crop);
      if (params.search) query.set("search", params.search);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/pests/library${suffix}`);
      return Array.isArray(response?.data) ? response.data : [];
    },
    async analyze(farmId, payload) {
      const response = await requestJson(`/pests/farms/${farmId}/analyze`, {
        method: "POST",
        body: payload,
      });
      return mapBackendPestDiagnosis(response?.data);
    },
    async latest(farmId) {
      const response = await requestJson(`/pests/farms/${farmId}/latest`);
      return mapBackendPestDiagnosis(response?.data);
    },
    async history(farmId) {
      const response = await requestJson(`/pests/farms/${farmId}/history`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendPestHistory);
    },
    async listActions(diagnosisId) {
      const response = await requestJson(`/pests/diagnoses/${diagnosisId}/actions`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendPestAction);
    },
    async addAction(diagnosisId, payload) {
      const response = await requestJson(`/pests/diagnoses/${diagnosisId}/actions`, {
        method: "POST",
        body: payload,
      });
      return mapBackendPestAction(response?.data);
    },
  },
  recommendations: {
    async generate(farmId, payload = {}) {
      const response = await requestJson(`/recommendations/farms/${farmId}/generate`, {
        method: "POST",
        body: payload,
      });
      return mapBackendRecommendationRun(response?.data);
    },
    async latest(farmId) {
      const response = await requestJson(`/recommendations/farms/${farmId}/latest`);
      return mapBackendRecommendationRun(response?.data);
    },
    async history(farmId) {
      const response = await requestJson(`/recommendations/farms/${farmId}/history`);
      return Array.isArray(response?.data) ? response.data : [];
    },
    async listFeedback(runId) {
      const response = await requestJson(`/recommendations/runs/${runId}/feedback`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendRecommendationFeedback);
    },
    async addFeedback(runId, payload) {
      const response = await requestJson(`/recommendations/runs/${runId}/feedback`, {
        method: "POST",
        body: payload,
      });
      return mapBackendRecommendationFeedback(response?.data);
    },
  },
  notifications: {
    async center(farmId) {
      const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : "";
      const response = await requestJson(`/notifications/center${query}`);
      return {
        activeFarmId: response?.data?.activeFarmId || null,
        sourceMode: response?.data?.sourceMode || "backend",
        preferences: mapBackendNotificationPreference(response?.data?.preferences),
        templates: (Array.isArray(response?.data?.templates) ? response.data.templates : []).map(
          mapBackendNotificationTemplate,
        ),
        notifications: (Array.isArray(response?.data?.notifications) ? response.data.notifications : []).map(
          mapBackendNotificationAlert,
        ),
      };
    },
    async updatePreferences(payload) {
      const response = await requestJson("/notifications/preferences", {
        method: "PUT",
        body: payload,
      });
      return mapBackendNotificationPreference(response?.data);
    },
    async markAllRead(farmId) {
      const response = await requestJson("/notifications/mark-all-read", {
        method: "PUT",
        body: farmId ? { farmId } : {},
      });
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendNotificationAlert);
    },
    async markRead(id) {
      const response = await requestJson(`/notifications/${id}/read`, {
        method: "PUT",
        body: {},
      });
      return mapBackendNotificationAlert(response?.data);
    },
    async confirm(id) {
      const response = await requestJson(`/notifications/${id}/confirm`, {
        method: "PUT",
        body: {},
      });
      return mapBackendNotificationAlert(response?.data);
    },
    async archive(id) {
      const response = await requestJson(`/notifications/${id}/archive`, {
        method: "PUT",
        body: {},
      });
      return mapBackendNotificationAlert(response?.data);
    },
    async snooze(id, payload = {}) {
      const response = await requestJson(`/notifications/${id}/snooze`, {
        method: "PUT",
        body: payload,
      });
      return mapBackendNotificationAlert(response?.data);
    },
    async updateTemplateStatus(id, payload = {}) {
      const response = await requestJson(`/notifications/templates/${id}/status`, {
        method: "PUT",
        body: payload,
      });
      return mapBackendNotificationTemplate(response?.data);
    },
  },
  community: {
    async dashboard() {
      const response = await requestJson("/community/dashboard");
      return response?.data || null;
    },
    async submitQuestion(payload) {
      const response = await requestJson("/community/questions", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
    async acceptQuestion(id) {
      const response = await requestJson(`/community/questions/${id}/accept`, {
        method: "PUT",
        body: {},
      });
      return response?.data || null;
    },
    async registerEvent(id) {
      const response = await requestJson(`/community/events/${id}/register`, {
        method: "POST",
        body: {},
      });
      return response?.data || null;
    },
    async submitPractice(payload) {
      const response = await requestJson("/community/practices/submissions", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
  },  weather: {
    async dashboard(farmId, params = {}) {
      const query = new URLSearchParams();
      if (params.range) query.set("range", params.range);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/weather/farms/${farmId}/dashboard${suffix}`);
      return mapBackendWeatherDashboard(response?.data);
    },
    async history(farmId, params = {}) {
      const query = new URLSearchParams();
      if (params.limit) query.set("limit", String(params.limit));
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/weather/farms/${farmId}/history${suffix}`);
      return mapBackendWeatherHistory(response?.data);
    },
  },
  analytics: {
    async farmDashboard(farmId, params = {}) {
      const query = new URLSearchParams();
      if (params.dateRange) query.set("dateRange", params.dateRange);
      if (params.cropType) query.set("cropType", params.cropType);
      if (params.activityFilter) query.set("activityFilter", params.activityFilter);
      if (params.reportTemplate) query.set("reportTemplate", params.reportTemplate);
      if (params.chartFilter) query.set("chartFilter", params.chartFilter);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/analytics/farms/${farmId}/dashboard${suffix}`);
      return response?.data || null;
    },
    async farmHistory(farmId) {
      const response = await requestJson(`/analytics/farms/${farmId}/history`);
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendAnalyticsExport);
    },
    async exportFarm(farmId, payload) {
      const response = await requestJson(`/analytics/farms/${farmId}/export`, {
        method: "POST",
        body: payload,
      });
      return mapBackendAnalyticsExport(response?.data);
    },
    async adminDashboard(params = {}) {
      const query = new URLSearchParams();
      if (params.reportTemplate) query.set("reportTemplate", params.reportTemplate);
      if (params.methodology) query.set("methodology", params.methodology);
      if (params.selectedComparison) query.set("selectedComparison", params.selectedComparison);
      if (params.selectedCompliance) query.set("selectedCompliance", params.selectedCompliance);
      if (params.selectedExportFormat) query.set("selectedExportFormat", params.selectedExportFormat);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const response = await requestJson(`/analytics/admin/dashboard${suffix}`);
      return response?.data || null;
    },
    async adminHistory() {
      const response = await requestJson("/analytics/admin/history");
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendAnalyticsExport);
    },
    async exportAdmin(payload) {
      const response = await requestJson("/analytics/admin/export", {
        method: "POST",
        body: payload,
      });
      return mapBackendAnalyticsExport(response?.data);
    },
  },
  admin: {
    async dashboardSummary() {
      const response = await requestJson("/admin/dashboard-summary");
      return response?.data || null;
    },
    async pendingFarmers() {
      const response = await requestJson("/admin/pending-farmers");
      return (Array.isArray(response?.data) ? response.data : []).map(mapBackendFarmerProfileRecord);
    },
    async farmerRegistryExport() {
      const response = await requestJson("/admin/farmer-registry-export");
      return response?.data || null;
    },
    async regionalMonitoring() {
      const response = await requestJson("/admin/regional-monitoring");
      return response?.data || null;
    },
    async issueRegionalAdvisory(payload) {
      const response = await requestJson("/admin/regional-advisories", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
    async updateWorkflow(id, payload) {
      const response = await requestJson("/admin/workflow/" + id, {
        method: "PUT",
        body: payload,
      });
      return response?.data || null;
    },
    async contentManagementDashboard() {
      const response = await requestJson("/admin/content-management/dashboard");
      return response?.data || null;
    },
    async createContentEntry(payload) {
      const response = await requestJson("/admin/content-management/entries", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
    async advanceContentEntryStatus(id) {
      const response = await requestJson(`/admin/content-management/entries/${id}/status`, {
        method: "PUT",
        body: {},
      });
      return response?.data || null;
    },
    async archiveContentEntry(id) {
      const response = await requestJson(`/admin/content-management/entries/${id}`, {
        method: "DELETE",
      });
      return response?.data || null;
    },
    async syncContentFertilizerStandards() {
      const response = await requestJson("/admin/content-management/fertilizer-sync", {
        method: "POST",
        body: {},
      });
      return response?.data || null;
    },
    async testContentSandbox(payload) {
      const response = await requestJson("/admin/content-management/sandbox/test", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
    async saveContentSandbox(payload) {
      const response = await requestJson("/admin/content-management/sandbox/save", {
        method: "POST",
        body: payload,
      });
      return response?.data || null;
    },
  },
};

