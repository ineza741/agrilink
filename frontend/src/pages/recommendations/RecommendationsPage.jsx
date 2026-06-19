import {
  BookOpen,
  BrainCircuit,
  Bug,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Coins,
  Database,
  Download,
  Droplets,
  FileDown,
  FlaskConical,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Sprout,
  TestTube2,
  ThermometerSun,
  Trash2,
  TrendingUp,
  Wheat,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { downloadCsvFile, downloadJsonFile, downloadTextFile } from "../../utils/actions";

const FEEDBACK_STORAGE_KEY = "agri-feed-recommendation-feedback-v2";
const ADMIN_CONTENT_STORAGE_KEY = "agri-feed-admin-content-v1";

const REJECTION_OPTIONS = [
  "Not relevant",
  "Too risky",
  "Too expensive",
  "Wrong timing",
  "Other reason",
];

const recommendationTypeMeta = {
  plant: {
    icon: Sprout,
    tone: "green",
    actionLabel: "Plant",
    category: "Planting",
  },
  irrigate: {
    icon: Droplets,
    tone: "sky",
    actionLabel: "Irrigate",
    category: "Irrigation",
  },
  fertilize: {
    icon: FlaskConical,
    tone: "blue",
    actionLabel: "Fertilize",
    category: "Fertilizer",
  },
  harvest: {
    icon: Wheat,
    tone: "amber",
    actionLabel: "Harvest",
    category: "Harvest",
  },
  pest: {
    icon: Bug,
    tone: "rose",
    actionLabel: "Protect Crop",
    category: "Pest/Disease",
  },
  market: {
    icon: Coins,
    tone: "violet",
    actionLabel: "Sell / Store",
    category: "Market",
  },
};

const cropRows = [
  { crop: "Hard Winter Wheat", cycle: "240 Days", zone: "Temperate", status: "Verified" },
  { crop: "Sweet Corn (Yellow)", cycle: "90 Days", zone: "Tropical/Sub", status: "Verified" },
  { crop: "High-Yield Soybean", cycle: "120 Days", zone: "Varied", status: "Draft" },
  { crop: "Basmati Rice", cycle: "150 Days", zone: "Tropical", status: "Verified" },
];

const fertilizerCards = [
  { title: "Nitrogen Optimization", state: "Active" },
  { title: "Phosphorus Protocol", state: "Pending" },
];

const recentModifications = [
  { title: "Basmati Rice Guidelines Updated", meta: "By Admin Smith · 2 hours ago" },
  { title: "Pest Entry: 'Locust V2' Deleted", meta: "By Admin Doe · 5 hours ago" },
  { title: "Fertilizer Logic: NPK Ratios Adjusted", meta: "System Auto-Update · Yesterday" },
];

const DEMO_MODE = true;
const CONTENT_WORKFLOW = ["Draft", "Pending Review", "Approved", "Published", "Archived"];
const CONTENT_LANGUAGE_OPTIONS = ["English", "Kinyarwanda", "French"];

const advisoryTemplatesSeed = [
  {
    id: "template-drought",
    name: "Drought Alert",
    category: "Weather",
    summary: "Send moisture-conservation guidance when 7-day rainfall stays below planting thresholds.",
    language: "English",
    status: "Published",
    cycle: "7-day trigger",
    zone: "Semi-arid focus",
  },
  {
    id: "template-pest",
    name: "Pest Outbreak Alert",
    category: "Pests & Diseases",
    summary: "Escalate scouting and treatment actions when outbreak intensity rises above district threshold.",
    language: "English",
    status: "Approved",
    cycle: "Event-based",
    zone: "All districts",
  },
  {
    id: "template-market",
    name: "Market Opportunity",
    category: "Market",
    summary: "Notify farmers when local demand and profitability improve for a target crop.",
    language: "Kinyarwanda",
    status: "Pending Review",
    cycle: "Weekly review",
    zone: "Market clusters",
  },
  {
    id: "template-fertilizer",
    name: "Fertilizer Reminder",
    category: "Soil & Crop",
    summary: "Remind growers about stage-based NPK application timing before nutrient losses increase.",
    language: "French",
    status: "Draft",
    cycle: "Crop-stage",
    zone: "All farm profiles",
  },
  {
    id: "template-harvest",
    name: "Harvest Advisory",
    category: "Harvest",
    summary: "Recommend harvest windows using crop maturity, rainfall outlook, and market demand.",
    language: "English",
    status: "Published",
    cycle: "Seasonal",
    zone: "Priority districts",
  },
];

const auditTrailSeed = [
  { id: "audit-1", user: "AgriFeed Admin", action: "Published crop guideline", module: "Crops", timestamp: "2026-06-19T07:35:00.000Z" },
  { id: "audit-2", user: "Dr. Aris Thorne", action: "Reviewed pest knowledge entry", module: "Pests", timestamp: "2026-06-19T06:50:00.000Z" },
  { id: "audit-3", user: "System Sync", action: "Updated fertilizer benchmarks", module: "Fertilizer Standards", timestamp: "2026-06-18T15:25:00.000Z" },
  { id: "audit-4", user: "Extension Editor", action: "Saved advisory rule sandbox result", module: "Advisory Logic", timestamp: "2026-06-18T12:10:00.000Z" },
];

const contentGraphNodes = [
  { id: "crop-maize", label: "Maize", type: "Crop" },
  { id: "pest-faw", label: "Fall Armyworm", type: "Pest" },
  { id: "soil-loam", label: "Loamy Soil", type: "Soil" },
  { id: "rule-moisture", label: "Moisture Stress Rule", type: "Rule" },
  { id: "fert-npk", label: "NPK Standard", type: "Fertilizer" },
  { id: "crop-potato", label: "Irish Potato", type: "Crop" },
  { id: "pest-blight", label: "Late Blight", type: "Pest" },
];

const contentGraphLinks = [
  { from: "crop-maize", to: "soil-loam", label: "best on" },
  { from: "crop-maize", to: "pest-faw", label: "risk from" },
  { from: "soil-loam", to: "rule-moisture", label: "triggers" },
  { from: "rule-moisture", to: "fert-npk", label: "refines" },
  { from: "crop-potato", to: "pest-blight", label: "risk from" },
  { from: "crop-potato", to: "fert-npk", label: "guided by" },
];

function formatReadableDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "19 Jun 2026";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getContentStatusTone(status = "") {
  const lower = status.toLowerCase();
  if (lower === "published" || lower === "approved" || lower === "verified") return "verified";
  if (lower === "pending review") return "review";
  if (lower === "archived") return "deactivated";
  return "draft";
}

function createDefaultAdminEntries() {
  return {
    Crops: [
      {
        id: "crop-1",
        crop: "Maize (Hybrid)",
        cycle: "120 Days",
        zone: "Bugesera & Eastern Belt",
        status: "Published",
        recommendedSoil: "Well-drained loam",
        optimalPh: "5.8 - 7.0",
        rainfallRange: "500 - 800 mm",
        yieldPotential: "6.2 t/ha",
        suitabilityScore: "92%",
        language: "English",
      },
      {
        id: "crop-2",
        crop: "Irish Potato",
        cycle: "110 Days",
        zone: "Musanze Highlands",
        status: "Approved",
        recommendedSoil: "Volcanic loam",
        optimalPh: "5.2 - 6.4",
        rainfallRange: "700 - 1,200 mm",
        yieldPotential: "18 t/ha",
        suitabilityScore: "89%",
        language: "English",
      },
      {
        id: "crop-3",
        crop: "Common Beans",
        cycle: "90 Days",
        zone: "Kicukiro & Huye",
        status: "Pending Review",
        recommendedSoil: "Sandy loam",
        optimalPh: "6.0 - 7.2",
        rainfallRange: "350 - 600 mm",
        yieldPotential: "1.8 t/ha",
        suitabilityScore: "84%",
        language: "Kinyarwanda",
      },
      {
        id: "crop-4",
        crop: "Basmati Rice",
        cycle: "150 Days",
        zone: "Marshland blocks",
        status: "Draft",
        recommendedSoil: "Clay loam",
        optimalPh: "5.0 - 6.5",
        rainfallRange: "1,000 - 1,500 mm",
        yieldPotential: "5.1 t/ha",
        suitabilityScore: "79%",
        language: "French",
      },
    ],
    Pests: [
      {
        id: "pest-1",
        crop: "Fall Armyworm",
        cycle: "Larval escalation",
        zone: "Warm lowlands",
        status: "Published",
        affectedCrops: "Maize, sorghum",
        riskLevel: "High",
        treatmentRecommendation: "Scout twice weekly and apply biocontrol before severe leaf damage.",
        detectionConfidence: "91%",
        language: "English",
      },
      {
        id: "pest-2",
        crop: "Late Blight",
        cycle: "Outbreak window",
        zone: "Cool wet highlands",
        status: "Approved",
        affectedCrops: "Irish potato, tomato",
        riskLevel: "High",
        treatmentRecommendation: "Improve canopy airflow and start copper-based fungicide before lesion spread.",
        detectionConfidence: "88%",
        language: "English",
      },
      {
        id: "pest-3",
        crop: "Bean Aphid",
        cycle: "Early stage",
        zone: "Humid bean zones",
        status: "Pending Review",
        affectedCrops: "Beans",
        riskLevel: "Medium",
        treatmentRecommendation: "Target field margins first and preserve beneficial predators.",
        detectionConfidence: "83%",
        language: "Kinyarwanda",
      },
    ],
    "Advisory Logic": [
      {
        id: "logic-1",
        crop: "Moisture Stress Rule",
        cycle: "Triggered",
        zone: "All Regions",
        status: "Published",
        trigger: "7-day rainfall < 10 mm",
        ruleScope: "Soil + weather + crop stage",
        confidence: "87%",
        language: "English",
      },
      {
        id: "logic-2",
        crop: "Heatwave Escalation",
        cycle: "Triggered",
        zone: "Semi-Arid",
        status: "Approved",
        trigger: "Max temp ≥ 32°C",
        ruleScope: "Weather + irrigation plan",
        confidence: "81%",
        language: "French",
      },
      {
        id: "logic-3",
        crop: "Market Hold Recommendation",
        cycle: "Weekly review",
        zone: "District markets",
        status: "Draft",
        trigger: "Demand trend rising",
        ruleScope: "Market + storage readiness",
        confidence: "76%",
        language: "English",
      },
    ],
    "Fertilizer Standards": [
      {
        id: "fert-1",
        crop: "Nitrogen Optimization",
        cycle: "Vegetative stage",
        zone: "Maize Belt",
        status: "Published",
        nutrientFocus: "Nitrogen",
        applicationTiming: "21-28 days after emergence",
        benchmark: "45 kg N/ha",
        language: "English",
      },
      {
        id: "fert-2",
        crop: "Phosphorus Protocol",
        cycle: "Pre-planting",
        zone: "Highland Farms",
        status: "Pending Review",
        nutrientFocus: "Phosphorus",
        applicationTiming: "At planting",
        benchmark: "35 kg P2O5/ha",
        language: "French",
      },
    ],
    "Advisory Templates": advisoryTemplatesSeed,
  };
}

function buildDefaultEntry(activeTab, label, language) {
  const id = `${activeTab.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  if (activeTab === "Crops") {
    return {
      id,
      crop: label,
      cycle: "120 Days",
      zone: "Regional",
      status: "Draft",
      recommendedSoil: "Loamy soil",
      optimalPh: "5.8 - 6.8",
      rainfallRange: "500 - 900 mm",
      yieldPotential: "4.5 t/ha",
      suitabilityScore: "76%",
      language,
    };
  }

  if (activeTab === "Pests") {
    return {
      id,
      crop: label,
      cycle: "Monitored",
      zone: "All districts",
      status: "Draft",
      affectedCrops: "Pending assignment",
      riskLevel: "Medium",
      treatmentRecommendation: "Review scouting protocol before publishing treatment guidance.",
      detectionConfidence: "72%",
      language,
    };
  }

  if (activeTab === "Advisory Templates") {
    return {
      id,
      name: label,
      category: "General",
      summary: "New advisory template awaiting editorial review.",
      language,
      status: "Draft",
      cycle: "Manual review",
      zone: "All regions",
    };
  }

  if (activeTab === "Fertilizer Standards") {
    return {
      id,
      crop: label,
      cycle: "Pending review",
      zone: "System",
      status: "Draft",
      nutrientFocus: "Balanced NPK",
      applicationTiming: "To be defined",
      benchmark: "TBD",
      language,
    };
  }

  return {
    id,
    crop: label,
    cycle: "Draft",
    zone: "System",
    status: "Draft",
    trigger: "Manual input",
    ruleScope: "Crop + weather",
    confidence: "70%",
    language,
  };
}

function normalizeAdminEntries(savedEntries) {
  const defaults = createDefaultAdminEntries();
  if (!savedEntries || typeof savedEntries !== "object") return defaults;

  return Object.fromEntries(
    Object.entries(defaults).map(([tab, fallbackRows]) => {
      const savedRows = Array.isArray(savedEntries[tab]) ? savedEntries[tab] : [];
      const mappedRows = savedRows.map((row, index) => ({
        ...fallbackRows[Math.min(index, fallbackRows.length - 1)],
        ...row,
        id: row.id || `${tab.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
        language: row.language || "English",
      }));

      return [tab, mappedRows.length ? mappedRows : fallbackRows];
    })
  );
}

const marketProfileByCrop = {
  almonds: { price: 88, demand: 74, profitability: 81 },
  maize: { price: 72, demand: 84, profitability: 76 },
  corn: { price: 72, demand: 84, profitability: 76 },
  beans: { price: 77, demand: 79, profitability: 73 },
  wheat: { price: 68, demand: 66, profitability: 64 },
  soybeans: { price: 74, demand: 82, profitability: 79 },
  rice: { price: 80, demand: 77, profitability: 72 },
  default: { price: 66, demand: 70, profitability: 68 },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values?.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCropAlias(crop) {
  const normalized = (crop || "").toLowerCase();
  if (normalized.includes("corn")) return "corn";
  if (normalized.includes("maize")) return "maize";
  if (normalized.includes("bean")) return "beans";
  if (normalized.includes("almond")) return "almonds";
  if (normalized.includes("wheat")) return "wheat";
  if (normalized.includes("soy")) return "soybeans";
  if (normalized.includes("rice")) return "rice";
  return normalized || "default";
}

function getPriorityLabel(score) {
  if (score >= 86) return "Critical";
  if (score >= 72) return "High";
  if (score >= 56) return "Medium";
  return "Low";
}

function loadFeedback() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistFeedback(state) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(state));
}

function loadAdminContentState() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_CONTENT_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAdminContentState(state) {
  localStorage.setItem(ADMIN_CONTENT_STORAGE_KEY, JSON.stringify(state));
}

function createDefaultFarm() {
  return {
    id: "rec-default-farm",
    name: "Primary Advisory Plot",
    region: "Northern Highlands",
    sizeHectares: 14,
    landType: "Loamy",
    irrigationType: "Drip Irrigation",
    primaryCrop: "Maize",
    history: [],
    location: { lat: -1.94, lng: 29.87, mapX: 50, mapY: 50, label: "Primary advisory zone" },
  };
}

function inferGrowthStage(farm) {
  const cropName = (farm.primaryCrop || "").toLowerCase();
  if (cropName.includes("corn") || cropName.includes("maize")) return "Vegetative";
  if (cropName.includes("bean")) return "Flowering";
  if (cropName.includes("almond")) return "Fruit Set";
  if (cropName.includes("rice")) return "Tillering";
  return "Establishment";
}

function inferSeason(weatherSignals) {
  if (weatherSignals.rainfall7d >= 30) return "Rain-active";
  if (weatherSignals.rainfall7d < 10) return "Moisture-constrained";
  return "Stable in-season";
}

function buildSoilSignals(farm, soilData) {
  const landType = (farm.landType || "").toLowerCase();
  const basePh = soilData?.ph ?? (landType.includes("clay") ? 5.7 : landType.includes("loam") ? 6.4 : 6.1);
  const nitrogen = soilData?.nitrogen ?? (landType.includes("sandy") ? 38 : 54);
  const phosphorus = soilData?.phosphorus ?? (landType.includes("clay") ? 22 : 30);
  const potassium = soilData?.potassium ?? (landType.includes("sandy") ? 20 : 34);
  const organicMatter = soilData?.organicMatter ?? (landType.includes("clay") ? 3.1 : 2.4);

  const nitrogenGap = clamp(Math.round(100 - nitrogen), 8, 48);
  const phosphorusGap = clamp(Math.round(72 - phosphorus), 6, 42);
  const potassiumGap = clamp(Math.round(68 - potassium), 6, 46);
  const soilDeficiencySeverity = clamp(
    Math.round((nitrogenGap * 0.42) + (phosphorusGap * 0.26) + (potassiumGap * 0.32)),
    18,
    95
  );

  return {
    ph: Number(basePh.toFixed(1)),
    nitrogen,
    phosphorus,
    potassium,
    organicMatter,
    nitrogenGap,
    phosphorusGap,
    potassiumGap,
    soilDeficiencySeverity,
  };
}

function buildWeatherSignals(forecastData) {
  const daily = forecastData?.daily || {};
  const rain7d = (daily.rain_sum || []).reduce((sum, value) => sum + Number(value || 0), 0);
  const avgRainProbability = average((daily.precipitation_probability_max || []).map((value) => Number(value || 0)));
  const maxWind = Math.max(...(daily.wind_speed_10m_max || [0]).map((value) => Number(value || 0)));
  const maxTemp = Math.max(...(daily.temperature_2m_max || [0]).map((value) => Number(value || 0)));
  const humidityPeak = Math.max(...(daily.relative_humidity_2m_max || [0]).map((value) => Number(value || 0)));

  return {
    rainfall7d: Number(rain7d.toFixed(1)),
    avgRainProbability: Math.round(avgRainProbability),
    maxWind: Number(maxWind.toFixed(1)),
    maxTemp: Number(maxTemp.toFixed(1)),
    humidityPeak: Math.round(humidityPeak),
    weatherRisk: clamp(Math.round((avgRainProbability * 0.35) + (maxWind * 0.7) + (maxTemp > 31 ? 24 : 8)), 18, 92),
  };
}

function buildMarketSignals(farm) {
  const cropAlias = getCropAlias(farm.primaryCrop);
  const base = marketProfileByCrop[cropAlias] || marketProfileByCrop.default;
  const regionBoost = (farm.region || "").toLowerCase().includes("kigali") ? 6 : 0;
  return {
    price: clamp(base.price + regionBoost, 34, 98),
    demand: clamp(base.demand + (regionBoost > 0 ? 4 : 0), 30, 98),
    profitability: clamp(base.profitability + regionBoost, 28, 98),
    opportunity: clamp(Math.round((base.price * 0.34) + (base.demand * 0.38) + (base.profitability * 0.28)), 28, 96),
  };
}

function confidenceSummary(action, factors) {
  return `Confidence ${action.confidence}% combines soil ${factors.soilWeight}%, weather ${factors.weatherWeight}%, market ${factors.marketWeight}% and feedback adjustment ${factors.feedbackWeight}%.`;
}

function buildRecommendationModel({ farm, farmerId, soilSignals, weatherSignals, marketSignals, feedbackEntry }) {
  const stage = inferGrowthStage(farm);
  const season = inferSeason(weatherSignals);
  const accepted = feedbackEntry?.records?.filter((entry) => entry.feedbackStatus === "accepted").length || 0;
  const rejected = feedbackEntry?.records?.filter((entry) => entry.feedbackStatus === "rejected").length || 0;
  const feedbackBias = clamp((accepted - rejected) * 2, -8, 10);
  const irrigationUrgency = clamp(
    Math.round((100 - soilSignals.organicMatter * 18) + (weatherSignals.maxTemp > 30 ? 12 : 0) + (weatherSignals.rainfall7d < 12 ? 18 : 0)),
    26,
    96
  );
  const fertilizerUrgency = clamp(soilSignals.soilDeficiencySeverity + Math.round(soilSignals.nitrogenGap / 3), 28, 96);
  const plantingUrgency = clamp(
    Math.round((weatherSignals.rainfall7d >= 10 && weatherSignals.rainfall7d <= 30 ? 78 : 54) + (stage === "Establishment" ? 10 : 0)),
    24,
    92
  );
  const harvestUrgency = clamp(Math.round((marketSignals.opportunity * 0.65) + (stage === "Fruit Set" ? 18 : 8)), 24, 90);
  const pestUrgency = clamp(Math.round((weatherSignals.humidityPeak * 0.45) + (weatherSignals.avgRainProbability * 0.35)), 18, 92);
  const marketUrgency = clamp(Math.round((marketSignals.opportunity * 0.7) + (weatherSignals.maxWind > 28 ? 10 : 0)), 24, 92);

  const actionBuilders = [
    {
      type: "fertilize",
      title: `Correct nutrient balance on ${farm.name}`,
      subtitle: `${farm.primaryCrop || "Primary crop"} · ${stage} stage`,
      urgency: fertilizerUrgency,
      bestWindow: soilSignals.potassiumGap > 24 ? "Within 3-5 days" : "Within the next 7 days",
      soilReason: `Nitrogen gap is ${soilSignals.nitrogenGap}% and potassium gap is ${soilSignals.potassiumGap}%. ${soilSignals.potassiumGap > 24 ? "Potassium is materially limiting yield potential." : "Nutrient balance needs fine-tuning before the next growth pulse."}`,
      weatherReason: `Rainfall total for the next 7 days is ${weatherSignals.rainfall7d} mm with max wind ${weatherSignals.maxWind} km/h, supporting staged nutrient application rather than one heavy pass.`,
      marketReason: `Market profitability score is ${marketSignals.profitability}%, so preserving yield quality still has direct return value.`,
      cropStageReason: `${stage} crops respond strongly to balanced feeding at this stage; delaying may reduce canopy recovery and grain/fill quality.`,
      guidance: [
        "Apply a split dose focused on the most deficient nutrient first.",
        "Schedule the first pass before the next rainfall spike.",
        "Use the recommended blend for the current crop stage only.",
        "Re-check plant color and vigor after 72 hours.",
        "If ignored, the nutrient gap may reduce final yield and weaken disease resistance.",
      ],
      requiredInputs: ["Nitrogen blend", "Potassium source", "Field sprayer or applicator"],
      expectedBenefit: "Improved nutrient balance, stronger crop vigor, and higher yield stability.",
      riskIfIgnored: "Persistent nutrient deficiency may suppress yield and reduce market grade.",
    },
    {
      type: "irrigate",
      title: `Adjust irrigation pulse for ${farm.name}`,
      subtitle: `${farm.irrigationType || "Irrigation system"} · Moisture preservation`,
      urgency: irrigationUrgency,
      bestWindow: weatherSignals.maxTemp >= 30 ? "Next 24-48 hours" : "Before the next 3 days",
      soilReason: `Organic matter is ${soilSignals.organicMatter}% and pH is ${soilSignals.ph}, meaning moisture retention is ${soilSignals.organicMatter < 2.5 ? "weaker than ideal" : "moderate"} for the current soil profile.`,
      weatherReason: `7-day rainfall is ${weatherSignals.rainfall7d} mm and max temperature is ${weatherSignals.maxTemp}°C, so evapotranspiration risk is elevated.`,
      marketReason: `Market demand score is ${marketSignals.demand}%, so preventing stress losses protects saleable volume.`,
      cropStageReason: `${stage} crops lose momentum quickly under water stress, especially when temperatures exceed 30°C.`,
      guidance: [
        "Run a shorter irrigation cycle in the cooler evening window.",
        "Prioritize drier plots or blocks first.",
        "Pause the next cycle if meaningful rain arrives.",
        "Log the moisture response after irrigation.",
        "If ignored, heat stress may accelerate and reduce biomass or tuber/grain fill.",
      ],
      requiredInputs: ["Water allocation", "Pump or drip line schedule", "Moisture check"],
      expectedBenefit: "Reduced heat stress and more stable crop development.",
      riskIfIgnored: "Crop stress may intensify and create yield or quality losses.",
    },
    {
      type: "plant",
      title: `Plan the next planting window for ${farm.name}`,
      subtitle: `${season} · Rotation guidance`,
      urgency: plantingUrgency,
      bestWindow: weatherSignals.rainfall7d < 10 ? "Delay 10-14 days" : weatherSignals.rainfall7d <= 25 ? "Plant with moisture conservation" : "Suitable planting window",
      soilReason: `Current pH (${soilSignals.ph}) and phosphorus (${soilSignals.phosphorus}) indicate ${soilSignals.phosphorusGap > 20 ? "starter nutrient support is needed before planting." : "the soil can support establishment with moderate corrections."}`,
      weatherReason: `7-day rainfall total is ${weatherSignals.rainfall7d} mm with ${weatherSignals.avgRainProbability}% average rain probability, which shapes establishment success.`,
      marketReason: `Price score ${marketSignals.price}% and demand ${marketSignals.demand}% suggest a ${marketSignals.demand > 78 ? "strong" : "moderate"} commercial window for the next cycle.`,
      cropStageReason: `The plot is moving from ${stage} into planning for the next cycle, so rotation timing matters for soil recovery and moisture capture.`,
      guidance: [
        "Confirm seed availability before opening the window.",
        "Apply mulch or residue cover if rain is below the ideal threshold.",
        "Prefer short-cycle or resilient varieties if rainfall stays limited.",
        "Stage land preparation so planting can start immediately when conditions improve.",
        "If ignored, planting may start outside the optimal moisture window and reduce emergence.",
      ],
      requiredInputs: ["Certified seed", "Land preparation plan", "Starter nutrient package"],
      expectedBenefit: "Better establishment and improved rotation planning.",
      riskIfIgnored: "Delayed or poorly timed planting may reduce emergence and shorten the selling window.",
    },
    {
      type: "harvest",
      title: `Prepare harvest timing for ${farm.name}`,
      subtitle: `Profitability-sensitive harvest timing`,
      urgency: harvestUrgency,
      bestWindow: marketSignals.opportunity > 75 ? "Next 5-7 days" : "Monitor over the next 2 weeks",
      soilReason: `Soil fertility status suggests the field is ${soilSignals.soilDeficiencySeverity < 45 ? "tracking well" : "under some nutrient stress"}, so harvest timing should protect final quality.`,
      weatherReason: `Current weather risk is ${weatherSignals.weatherRisk}% and wind peaks at ${weatherSignals.maxWind} km/h, affecting drying and post-harvest handling.`,
      marketReason: `Market opportunity is ${marketSignals.opportunity}% with profitability ${marketSignals.profitability}%, so careful timing can improve returns.`,
      cropStageReason: `${stage} indicates the crop is approaching a market-sensitive transition where maturity checks should intensify.`,
      guidance: [
        "Inspect maturity and storage readiness before mobilizing labor.",
        "Choose harvest days with lower rain probability.",
        "Line up transport and buyer commitments early.",
        "Segregate higher-quality produce for better prices.",
        "If ignored, the crop may lose quality or face poor market timing.",
      ],
      requiredInputs: ["Labor plan", "Storage space", "Transport confirmation"],
      expectedBenefit: "Improved selling price and reduced post-harvest loss.",
      riskIfIgnored: "Late harvest may reduce quality, storage life, and market value.",
    },
    {
      type: "pest",
      title: `Raise crop protection surveillance on ${farm.name}`,
      subtitle: `${farm.primaryCrop || "Crop"} · preventive IPM action`,
      urgency: pestUrgency,
      bestWindow: weatherSignals.humidityPeak >= 82 ? "Immediate scouting in the next 48 hours" : "Weekly scouting window",
      soilReason: `Stress from nutrient imbalance (${soilSignals.soilDeficiencySeverity}% severity) can weaken crop resilience against pests and disease.`,
      weatherReason: `Humidity peaks at ${weatherSignals.humidityPeak}% and rain probability averages ${weatherSignals.avgRainProbability}%, increasing pressure for field scouting.`,
      marketReason: `Protecting crop quality matters because current demand is ${marketSignals.demand}% and market penalties rise with visible damage.`,
      cropStageReason: `${stage} stage is vulnerable to hidden pest damage, so detection timing matters.`,
      guidance: [
        "Scout field edges and lower canopy first.",
        "Record hotspots and compare them with recent weather changes.",
        "Use preventive IPM measures before damage accelerates.",
        "Only escalate to chemical control if thresholds are confirmed.",
        "If ignored, infestation risk may grow before treatment remains cost-effective.",
      ],
      requiredInputs: ["Scout checklist", "Field notes", "Basic pest control kit"],
      expectedBenefit: "Earlier pest detection and lower treatment cost.",
      riskIfIgnored: "Damage may escalate and reduce both yield and market grade.",
    },
    {
      type: "market",
      title: `Review selling strategy for ${farm.name}`,
      subtitle: `Market timing and profitability advisory`,
      urgency: marketUrgency,
      bestWindow: marketSignals.opportunity > 80 ? "Act within the next market cycle" : "Review after the next weekly update",
      soilReason: `Because soil status influences final quality, current deficiencies should be corrected before aggressive market commitments.`,
      weatherReason: `Weather risk of ${weatherSignals.weatherRisk}% can affect logistics, drying, and marketable quality.`,
      marketReason: `Price ${marketSignals.price}%, demand ${marketSignals.demand}%, and profitability ${marketSignals.profitability}% indicate ${marketSignals.opportunity > 76 ? "a favorable selling window." : "a moderate window that still needs caution."}`,
      cropStageReason: `The ${stage} stage tells us whether the crop should be protected for value or held for the next market move.`,
      guidance: [
        "Compare today's buyer demand with the expected harvest window.",
        "Hold produce only if storage quality can be preserved safely.",
        "Bundle transport with nearby farmers if logistics are costly.",
        "Track price changes after each weather update.",
        "If ignored, the farm may miss a stronger selling opportunity or sell below potential value.",
      ],
      requiredInputs: ["Buyer list", "Transport option", "Storage decision"],
      expectedBenefit: "Better selling timing and more informed market positioning.",
      riskIfIgnored: "The farm may accept weaker prices or face avoidable logistics costs.",
    },
  ];

  const actions = actionBuilders
    .map((action) => {
      const soilWeight = clamp(Math.round((100 - soilSignals.soilDeficiencySeverity) * 0.3), 14, 35);
      const weatherWeight = clamp(Math.round((100 - weatherSignals.weatherRisk) * 0.25), 12, 30);
      const marketWeight = clamp(Math.round(marketSignals.opportunity * 0.25), 12, 30);
      const feedbackWeight = clamp(10 + feedbackBias, 2, 18);
      const confidence = clamp(
        Math.round((action.urgency * 0.36) + (soilWeight * 0.8) + (weatherWeight * 0.7) + (marketWeight * 0.7) + feedbackWeight),
        48,
        98
      );
      const cropStageWeight = stage === "Vegetative" || stage === "Flowering" ? 82 : stage === "Fruit Set" ? 76 : 64;
      const priorityScore = clamp(
        Math.round(
          (confidence * 0.28) +
            (action.urgency * 0.2) +
            (weatherSignals.weatherRisk * 0.14) +
            (soilSignals.soilDeficiencySeverity * 0.14) +
            (cropStageWeight * 0.12) +
            (marketSignals.opportunity * 0.12)
        ),
        28,
        99
      );
      const meta = recommendationTypeMeta[action.type];

      return {
        id: `${farm.id}-${action.type}`,
        ...action,
        confidence,
        priorityScore,
        priority: getPriorityLabel(priorityScore),
        status: feedbackEntry?.decisions?.[`${farm.id}-${action.type}`]?.feedbackStatus || "Pending",
        meta,
        stage,
        season,
        marketDriver: marketSignals.opportunity > 76 ? "Strong price and demand window" : "Moderate profitability signal",
        confidenceCalculationSummary: confidenceSummary(action, {
          soilWeight,
          weatherWeight,
          marketWeight,
          feedbackWeight,
        }),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((action, index) => ({
      ...action,
      rank: index + 1,
    }));

  return {
    farm,
    farmerId,
    stage,
    season,
    metrics: {
      ...soilSignals,
      ...weatherSignals,
      marketOpportunity: marketSignals.opportunity,
      marketDemand: marketSignals.demand,
      profitability: marketSignals.profitability,
    },
    actions,
  };
}

function buildSoilDataFromFarm(farm) {
  const land = (farm.landType || "").toLowerCase();
  const crop = (farm.primaryCrop || "").toLowerCase();
  return {
    ph: land.includes("clay") ? 5.8 : land.includes("loam") ? 6.4 : 6.1,
    nitrogen: land.includes("sandy") ? 41 : crop.includes("bean") ? 55 : 48,
    phosphorus: crop.includes("corn") || crop.includes("maize") ? 26 : 31,
    potassium: crop.includes("almond") ? 24 : crop.includes("bean") ? 22 : 28,
    organicMatter: land.includes("clay") ? 3.1 : 2.5,
  };
}

function buildWeatherFallback(farm) {
  const latSeed = Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 10);
  return {
    daily: {
      rain_sum: [2, 4, 6, 1, 0, 3, 2].map((value, index) => value + ((latSeed + index) % 3)),
      precipitation_probability_max: [35, 46, 62, 28, 18, 40, 36],
      wind_speed_10m_max: [14, 16, 24, 18, 12, 15, 17],
      temperature_2m_max: [25, 26, 27, 26, 24, 25, 26],
      relative_humidity_2m_max: [76, 82, 88, 74, 70, 79, 81],
    },
  };
}

function FarmerRecommendationsView() {
  const { user } = useAuth();
  const { currentFarms, currentProfile } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];

  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "rec-default-farm");
  const [feedback, setFeedback] = useState(() => loadFeedback());
  const [activeTab, setActiveTab] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [advisoryRecommendationId, setAdvisoryRecommendationId] = useState(null);
  const [rejectingRecommendationId, setRejectingRecommendationId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_OPTIONS[0]);
  const [recommendationState, setRecommendationState] = useState({
    loading: true,
    error: "",
    dataset: null,
  });

  useEffect(() => {
    persistFeedback(feedback);
  }, [feedback]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "rec-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  useEffect(() => {
    let cancelled = false;

    async function generateRecommendations() {
      if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
        setRecommendationState({
          loading: false,
          error: "Unable to generate recommendations. Please check soil, weather, and crop data.",
          dataset: null,
        });
        return;
      }

      setRecommendationState((current) => ({
        ...current,
        loading: true,
        error: "",
      }));

      try {
        const feedbackEntry = feedback[selectedFarm.id] || { accepted: 0, rejected: 0, decisions: {}, records: [] };
        const [weatherResult, soilResult] = await Promise.allSettled([
          apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng),
          apiClient.soil.estimate(selectedFarm.location.lat, selectedFarm.location.lng),
        ]);

        const weatherData =
          weatherResult.status === "fulfilled" && weatherResult.value?.daily
            ? weatherResult.value
            : buildWeatherFallback(selectedFarm);

        const soilData = buildSoilDataFromFarm(selectedFarm);
        const dataset = buildRecommendationModel({
          farm: selectedFarm,
          farmerId: user?.id || currentProfile?.email || "farmer-local",
          soilSignals: buildSoilSignals(selectedFarm, soilData),
          weatherSignals: buildWeatherSignals(weatherData),
          marketSignals: buildMarketSignals(selectedFarm),
          feedbackEntry,
        });

        if (!cancelled) {
          setRecommendationState({
            loading: false,
            error: "",
            dataset,
          });
        }
      } catch {
        if (!cancelled) {
          setRecommendationState({
            loading: false,
            error: "Unable to generate recommendations. Please check soil, weather, and crop data.",
            dataset: null,
          });
        }
      }
    }

    generateRecommendations();
    return () => {
      cancelled = true;
    };
  }, [currentProfile?.email, feedback, selectedFarm, user?.id]);

  const dataset = recommendationState.dataset;
  const allRecommendations = dataset?.actions || [];
  const acceptedCount = allRecommendations.filter((item) => item.status === "accepted").length;
  const rejectedCount = allRecommendations.filter((item) => item.status === "rejected").length;

  const visibleRecommendations = useMemo(() => {
    if (activeTab === "critical") {
      return allRecommendations.filter((item) => item.priority === "Critical" || item.priority === "High");
    }
    if (activeTab === "review") {
      return allRecommendations.filter((item) => item.status === "rejected" || item.confidence < 70);
    }
    return allRecommendations;
  }, [activeTab, allRecommendations]);

  const projectedImpact = useMemo(() => {
    if (!allRecommendations.length) return "0.0";
    const impact = acceptedCount * 1.7 + average(allRecommendations.map((item) => item.confidence)) * 0.04;
    return impact.toFixed(1);
  }, [acceptedCount, allRecommendations]);

  const currentAdvisory = allRecommendations.find((item) => item.id === advisoryRecommendationId) || null;
  const tabItems = [
    { id: "all", label: `All Recommendations (${allRecommendations.length})` },
    {
      id: "critical",
      label: `Critical / High (${allRecommendations.filter((item) => item.priority === "Critical" || item.priority === "High").length})`,
    },
    {
      id: "review",
      label: `Needs Review (${allRecommendations.filter((item) => item.status === "rejected" || item.confidence < 70).length})`,
    },
  ];

  const persistDecision = (recommendation, feedbackStatus, rejectionReasonValue = null) => {
    setFeedback((current) => {
      const farmEntry = current[selectedFarm.id] || { accepted: 0, rejected: 0, decisions: {}, records: [] };
      const previous = farmEntry.decisions?.[recommendation.id]?.feedbackStatus;
      let accepted = farmEntry.accepted || 0;
      let rejected = farmEntry.rejected || 0;

      if (previous === "accepted") accepted -= 1;
      if (previous === "rejected") rejected -= 1;
      if (feedbackStatus === "accepted") accepted += 1;
      if (feedbackStatus === "rejected") rejected += 1;

      const record = {
        recommendationId: recommendation.id,
        farmerId: user?.id || currentProfile?.email || "farmer-local",
        farmId: selectedFarm.id,
        actionType: recommendation.type,
        feedbackStatus,
        rejectionReason: feedbackStatus === "rejected" ? rejectionReasonValue || "Other reason" : null,
        timestamp: new Date().toISOString(),
      };

      return {
        ...current,
        [selectedFarm.id]: {
          accepted,
          rejected,
          decisions: {
            ...farmEntry.decisions,
            [recommendation.id]: record,
          },
          records: [...(farmEntry.records || []), record].slice(-60),
        },
      };
    });
  };

  const toggleExpanded = (recommendationId) => {
    setExpanded((current) => ({
      ...current,
      [recommendationId]: !current[recommendationId],
    }));
  };

  const openRejectModal = (recommendationId) => {
    setRejectingRecommendationId(recommendationId);
    setRejectionReason(REJECTION_OPTIONS[0]);
  };

  const confirmReject = () => {
    const recommendation = allRecommendations.find((item) => item.id === rejectingRecommendationId);
    if (!recommendation) return;
    persistDecision(recommendation, "rejected", rejectionReason);
    setRejectingRecommendationId(null);
  };

  return (
    <section className="management-page prototype-recommendations-page">
      <div className="page-title-block prototype-recommendations-title">
        <h1>Academic-Led Recommendations</h1>
        <p>
          Personalized machine-learning style advice built from soil, weather, market, crop-stage,
          and farmer feedback signals.
        </p>
      </div>

      <div className="recommendation-dashboard-strip">
        <article className="prototype-panel recommendation-summary-card">
          <span>Personalized farm</span>
          <strong>{selectedFarm.name}</strong>
          <p>{selectedFarm.region} · {selectedFarm.primaryCrop || "Mixed crop profile"}</p>
        </article>
        <article className="prototype-panel recommendation-summary-card">
          <span>Primary driver</span>
          <strong>Soil + Weather + Market</strong>
          <p>{dataset?.stage || "Stage pending"} stage · {dataset?.season || "Season pending"}</p>
        </article>
        <article className="prototype-panel recommendation-summary-card">
          <span>Adaptive learning</span>
          <strong>{acceptedCount} accepted / {rejectedCount} rejected</strong>
          <p>Farmer feedback is stored and reused to tune later recommendation ranking.</p>
        </article>
      </div>

      <div className="recommendations-toolbar">
        <div className="recommendation-toolbar-left">
          <label className="recommendation-farm-selector">
            <span>Recommendation source farm</span>
            <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} - {farm.region}
                </option>
              ))}
            </select>
          </label>
          <div className="recommendation-tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "recommendation-tab active" : "recommendation-tab"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="recommendation-export-button"
          onClick={() =>
            downloadJsonFile("recommendations-dataset.json", {
              farm: selectedFarm,
              generatedAt: new Date().toISOString(),
              dataset,
            })
          }
        >
          <Download size={15} />
          <span>Export Dataset</span>
        </button>
      </div>

      {recommendationState.loading ? (
        <div className="recommendation-state-card">Loading AI recommendations...</div>
      ) : recommendationState.error ? (
        <div className="recommendation-state-card error">{recommendationState.error}</div>
      ) : !allRecommendations.length ? (
        <div className="recommendation-state-card">No recommendations available for this farm yet.</div>
      ) : (
        <>
          <div className="recommendation-scheduler-grid">
            <article className="prototype-panel recommendation-scheduler-card">
              <div className="recommendation-scheduler-head">
                <CalendarClock size={18} />
                <h2>Seasonal &amp; Stage-Based Advice Scheduler</h2>
              </div>
              <div className="recommendation-scheduler-table">
                <div className="recommendation-scheduler-table-head">
                  <span>Crop</span>
                  <span>Growth stage</span>
                  <span>Recommended action</span>
                  <span>Best date/window</span>
                  <span>Priority</span>
                  <span>Status</span>
                </div>
                {allRecommendations.map((item) => (
                  <div key={`${item.id}-schedule`} className="recommendation-scheduler-table-row">
                    <strong>{selectedFarm.primaryCrop || "Field Crop"}</strong>
                    <span>{item.stage}</span>
                    <span>{item.meta.actionLabel}</span>
                    <span>{item.bestWindow}</span>
                    <span className={`recommendation-priority-label ${item.priority.toLowerCase()}`}>{item.priority}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel recommendation-priority-card">
              <div className="recommendation-scheduler-head">
                <TrendingUp size={18} />
                <h2>Multi-criteria decision support</h2>
              </div>
              <ul className="recommendation-priority-list">
                <li><ThermometerSun size={15} /> Weather risk: {dataset.metrics.weatherRisk}%</li>
                <li><Droplets size={15} /> 7-day rainfall: {dataset.metrics.rainfall7d} mm</li>
                <li><FlaskConical size={15} /> Soil deficiency severity: {dataset.metrics.soilDeficiencySeverity}%</li>
                <li><Coins size={15} /> Market opportunity: {dataset.metrics.marketOpportunity}%</li>
                <li><ShieldAlert size={15} /> Demand / profitability: {dataset.metrics.marketDemand}% / {dataset.metrics.profitability}%</li>
              </ul>
            </article>
          </div>

          <div className="recommendation-card-list">
            {visibleRecommendations.map((item) => {
              const Icon = item.meta.icon;
              const isExpanded = Boolean(expanded[item.id]);
              return (
                <article key={item.id} className="prototype-panel recommendation-card functional">
                  <div className="recommendation-card-head">
                    <div className="recommendation-head-main">
                      <div className={`recommendation-icon tone-${item.meta.tone}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="recommendation-badge-row">
                          <span className="recommendation-category-badge">{item.meta.category}</span>
                          <span className={`recommendation-priority-label ${item.priority.toLowerCase()}`}>{item.priority}</span>
                        </div>
                        <h2>{item.title}</h2>
                        <p>{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="recommendation-confidence">
                      <span>Confidence Score</span>
                      <strong>{item.confidence}%</strong>
                    </div>
                  </div>

                  <div className="recommendation-rank-row">
                    <span className="recommendation-rank-badge">Priority #{item.rank}</span>
                    <span className="recommendation-driver-chip">{item.marketDriver}</span>
                    <span className={`recommendation-status-chip ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="recommendation-explain-toggle"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <span>Why this recommendation?</span>
                    <ChevronDown size={16} className={isExpanded ? "open" : ""} />
                  </button>

                  {isExpanded ? (
                    <div className="recommendation-logic-box">
                      <div className="recommendation-logic-head">
                        <Sparkles size={16} />
                        <strong>Interpretability Logic</strong>
                      </div>

                      <div className="recommendation-explanation-stack">
                        <div className="recommendation-explanation-item">
                          <Database size={15} />
                          <div>
                            <strong>Soil reason</strong>
                            <p>{item.soilReason}</p>
                          </div>
                        </div>
                        <div className="recommendation-explanation-item">
                          <ThermometerSun size={15} />
                          <div>
                            <strong>Weather reason</strong>
                            <p>{item.weatherReason}</p>
                          </div>
                        </div>
                        <div className="recommendation-explanation-item">
                          <Coins size={15} />
                          <div>
                            <strong>Market reason</strong>
                            <p>{item.marketReason}</p>
                          </div>
                        </div>
                        <div className="recommendation-explanation-item">
                          <Sprout size={15} />
                          <div>
                            <strong>Crop-stage reason</strong>
                            <p>{item.cropStageReason}</p>
                          </div>
                        </div>
                        <div className="recommendation-explanation-item">
                          <BrainCircuit size={15} />
                          <div>
                            <strong>Confidence calculation summary</strong>
                            <p>{item.confidenceCalculationSummary}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="recommendation-card-footer">
                    <div className="recommendation-reviewer">
                      <i className={item.status.toLowerCase() === "rejected" ? "muted" : ""} />
                      <span>
                        {currentProfile?.farmerType || "Farmer"} feedback is used to adapt later ranking
                      </span>
                    </div>

                    <div className="recommendation-actions">
                      <button
                        type="button"
                        className="recommendation-secondary-button"
                        onClick={() => openRejectModal(item.id)}
                      >
                        <X size={15} />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        className="recommendation-primary-button"
                        onClick={() => persistDecision(item, "accepted")}
                      >
                        <Check size={15} />
                        <span>Accept Action</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="prototype-panel recommendation-impact-card">
            <div className="recommendation-impact-copy">
              <div className="recommendation-impact-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Projected Yield Impact</strong>
                <p>Applying the currently accepted actions may increase expected output by +{projectedImpact}%</p>
              </div>
            </div>

            <button
              type="button"
              className="recommendation-dark-button"
              onClick={() => setAdvisoryRecommendationId(allRecommendations[0]?.id || null)}
            >
              Generate Full Advisory
            </button>
          </article>
        </>
      )}

      {currentAdvisory ? (
        <article className="prototype-panel recommendation-advisory-panel">
          <div className="recommendation-advisory-head">
            <div>
              <h2>{currentAdvisory.title}</h2>
              <p>{currentAdvisory.meta.category} · {currentAdvisory.bestWindow}</p>
            </div>
            <button type="button" className="recommendation-close-button" onClick={() => setAdvisoryRecommendationId(null)}>
              <X size={16} />
            </button>
          </div>

          <div className="recommendation-advisory-steps">
            <div><strong>Step 1: What to do</strong><p>{currentAdvisory.guidance[0]}</p></div>
            <div><strong>Step 2: When to do it</strong><p>{currentAdvisory.bestWindow}</p></div>
            <div><strong>Step 3: Required inputs</strong><p>{currentAdvisory.requiredInputs.join(", ")}</p></div>
            <div><strong>Step 4: Expected benefit</strong><p>{currentAdvisory.expectedBenefit}</p></div>
            <div><strong>Step 5: Risk if ignored</strong><p>{currentAdvisory.riskIfIgnored}</p></div>
          </div>
        </article>
      ) : null}

      {rejectingRecommendationId ? (
        <div className="recommendation-modal-backdrop" role="presentation">
          <div className="recommendation-feedback-modal" role="dialog" aria-modal="true">
            <h3>Why are you rejecting this recommendation?</h3>
            <div className="recommendation-reason-list">
              {REJECTION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={rejectionReason === option ? "active" : ""}
                  onClick={() => setRejectionReason(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="recommendation-modal-actions">
              <button type="button" className="recommendation-secondary-button" onClick={() => setRejectingRecommendationId(null)}>
                Cancel
              </button>
              <button type="button" className="recommendation-primary-button" onClick={confirmReject}>
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminContentManagementView() {
  const stored = useMemo(() => loadAdminContentState(), []);
  const [activeTab, setActiveTab] = useState(stored.activeTab || "Crops");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState(
    stored.entries || {
      Crops: cropRows,
      Pests: [
        { crop: "Fall Armyworm", cycle: "Larval Stage", zone: "Warm Humid", status: "Verified" },
        { crop: "Late Blight", cycle: "Outbreak Window", zone: "Cool Wet", status: "Verified" },
        { crop: "Aphid Surge", cycle: "Early Stage", zone: "Temperate", status: "Draft" },
      ],
      "Advisory Logic": [
        { crop: "Moisture Stress Rule", cycle: "Triggered", zone: "All Regions", status: "Verified" },
        { crop: "Heatwave Escalation", cycle: "Triggered", zone: "Semi-Arid", status: "Draft" },
      ],
      "Fertilizer Standards": [
        { crop: "Nitrogen Optimization", cycle: "Active", zone: "Maize Belt", status: "Verified" },
        { crop: "Phosphorus Protocol", cycle: "Pending Review", zone: "Highland Farms", status: "Draft" },
      ],
    }
  );
  const [triggerParameter, setTriggerParameter] = useState(
    stored.triggerParameter || "Soil Moisture Deficiency (%)"
  );
  const [severity, setSeverity] = useState(stored.severity || "Medium");
  const [recommendationContent, setRecommendationContent] = useState(
    stored.recommendationContent || ""
  );
  const [jsonLogic, setJsonLogic] = useState(
    stored.jsonLogic ||
      `{
  "irrigation": "scheduled_increase",
  "volume_m3": 15,
  "duration_min": 45,
  "alert_sms": true
}`
  );
  const [modifications, setModifications] = useState(
    stored.modifications || recentModifications
  );
  const [entryName, setEntryName] = useState("");
  const itemsPerPage = 4;

  useEffect(() => {
    saveAdminContentState({
      activeTab,
      entries,
      triggerParameter,
      severity,
      recommendationContent,
      jsonLogic,
      modifications,
    });
  }, [
    activeTab,
    entries,
    triggerParameter,
    severity,
    recommendationContent,
    jsonLogic,
    modifications,
  ]);

  const tabIcons = {
    Crops: Sprout,
    Pests: Bug,
    "Advisory Logic": BrainCircuit,
    "Fertilizer Standards": TestTube2,
  };

  const addModification = (title, meta) => {
    setModifications((current) => [{ title, meta }, ...current].slice(0, 6));
  };

  const addEntry = () => {
    const trimmed = entryName.trim();
    if (!trimmed) return;

    const newEntry = {
      crop: trimmed,
      cycle: activeTab === "Crops" ? "120 Days" : activeTab === "Pests" ? "Monitored" : "Draft",
      zone: activeTab === "Crops" ? "Regional" : activeTab === "Pests" ? "All Regions" : "System",
      status: "Draft",
    };

    setEntries((current) => ({
      ...current,
      [activeTab]: [newEntry, ...(current[activeTab] || [])],
    }));
    addModification(
      `${activeTab.slice(0, -1) || activeTab} entry '${trimmed}' created`,
      "By AgriFeed Admin · just now"
    );
    setEntryName("");
  };

  const toggleStatus = (cropName) => {
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).map((row) =>
        row.crop === cropName
          ? { ...row, status: row.status === "Verified" ? "Draft" : "Verified" }
          : row
      ),
    }));
    addModification(
      `${cropName} status updated`,
      "By AgriFeed Admin · just now"
    );
  };

  const removeEntry = (cropName) => {
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).filter((row) => row.crop !== cropName),
    }));
    addModification(
      `${cropName} removed from ${activeTab}`,
      "By AgriFeed Admin · just now"
    );
  };

  const saveLogic = () => {
    addModification(
      `Advisory logic saved for ${triggerParameter}`,
      "System Save · just now"
    );
  };

  const visibleEntries = entries[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / itemsPerPage));
  const pagedEntries = visibleEntries.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const exportCurrentTab = () => {
    downloadCsvFile(`admin-content-${activeTab.toLowerCase().replace(/\s+/g, "-")}.csv`, [
      ["Entry Name", "Growth Cycle", "Climate/Coverage Zone", "Status"],
      ...visibleEntries.map((row) => [row.crop, row.cycle, row.zone, row.status]),
    ]);
  };

  const testLogic = () => {
    addModification(`Logic test run for ${triggerParameter}`, "System Validation · just now");
  };

  const syncGuidelines = () => {
    addModification("Fertilizer standards synchronized", "System Sync · just now");
  };

  const exportAuditTrail = () => {
    downloadJsonFile("admin-audit-trail.json", modifications);
  };

  const exportDocumentation = () => {
    downloadTextFile(
      "content-management-documentation.txt",
      `AgriSupport Content Management\n\nCurrent tab: ${activeTab}\nTrigger parameter: ${triggerParameter}\nSeverity: ${severity}\n\nRecommendation Content:\n${recommendationContent || "No recommendation content entered yet."}\n\nJSON Logic:\n${jsonLogic}`
    );
  };

  return (
    <section className="management-page prototype-admin-content-page">
      <div className="prototype-admin-content-main">
        <div className="page-title-block prototype-admin-content-title">
          <h1>Content Management</h1>
          <p>Centralized database for crop intelligence and AI advisory logic standards.</p>
        </div>

        <div className="prototype-admin-content-actions">
          <button type="button" className="prototype-admin-secondary-button" onClick={exportCurrentTab}>
            <FileDown size={15} />
            <span>Export Data</span>
          </button>
          <div className="prototype-admin-entry-inline">
            <input
              type="text"
              value={entryName}
              onChange={(event) => setEntryName(event.target.value)}
              placeholder={`Add new ${activeTab.toLowerCase()} entry`}
            />
            <button type="button" className="prototype-admin-primary-button" onClick={addEntry}>
              <Plus size={16} />
              <span>Add New Entry</span>
            </button>
          </div>
        </div>

        <div className="prototype-admin-content-tabs">
          {Object.entries(tabIcons).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              className={activeTab === label ? "active" : ""}
              onClick={() => setActiveTab(label)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="prototype-admin-content-grid">
          <div className="prototype-admin-content-left">
            <article className="prototype-panel prototype-admin-content-table-card">
              <div className="prototype-admin-content-card-head">
                <h2>{activeTab} Database</h2>
                <span>{visibleEntries.length} Total Entries</span>
              </div>

              <div className="prototype-admin-content-table">
                <div className="prototype-admin-content-table-head">
                  <span>{activeTab === "Pests" ? "Pest / Disease" : "Entry Name"}</span>
                  <span>{activeTab === "Advisory Logic" ? "Execution State" : "Growth Cycle"}</span>
                  <span>{activeTab === "Fertilizer Standards" ? "Coverage Zone" : "Climate Zone"}</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {pagedEntries.map((row) => (
                  <div key={row.crop} className="prototype-admin-content-row">
                    <strong>{row.crop}</strong>
                    <span>{row.cycle}</span>
                    <span>{row.zone}</span>
                    <span className={row.status === "Verified" ? "prototype-admin-content-status verified" : "prototype-admin-content-status draft"}>
                      {row.status}
                    </span>
                    <div className="prototype-admin-content-row-actions">
                      <button type="button" onClick={() => toggleStatus(row.crop)}><Check size={16} /></button>
                      <button type="button" onClick={() => removeEntry(row.crop)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="prototype-admin-content-pagination">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  Previous
                </button>
                <div>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={`content-page-${index + 1}`}
                      type="button"
                      className={page === index + 1 ? "active" : ""}
                      onClick={() => setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </article>

            <article className="prototype-panel prototype-admin-logic-card">
              <div className="prototype-admin-content-card-head align-start">
                <div>
                  <h2>Edit Advisory Recommendation Logic</h2>
                  <p>Configure how the AI generates advice based on environmental triggers.</p>
                </div>
              </div>

              <div className="prototype-admin-logic-grid">
                <label>
                  <span>Trigger Parameter</span>
                  <select value={triggerParameter} onChange={(event) => setTriggerParameter(event.target.value)}>
                    <option>Soil Moisture Deficiency (%)</option>
                    <option>Leaf Temperature Spike</option>
                    <option>Nitrogen Deficit</option>
                  </select>
                </label>

                <div className="prototype-admin-severity-block">
                  <span>Severity Level</span>
                  <div className="prototype-admin-radio-row">
                    {["Low", "Medium", "Critical"].map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name="severity"
                          checked={severity === option}
                          onChange={() => setSeverity(option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label className="prototype-admin-content-field">
                <span>Recommendation Content (Output for Farmer)</span>
                <textarea
                  rows="4"
                  placeholder="Enter the advice text that will be shown to users..."
                  value={recommendationContent}
                  onChange={(event) => setRecommendationContent(event.target.value)}
                />
              </label>

              <label className="prototype-admin-content-field">
                <span>Actionable Steps (.JSON Logic)</span>
                <textarea
                  rows="6"
                  className="code"
                  value={jsonLogic}
                  onChange={(event) => setJsonLogic(event.target.value)}
                />
              </label>

              <div className="prototype-admin-logic-actions">
                <button type="button" className="prototype-admin-secondary-button" onClick={testLogic}>Test Logic</button>
                <button type="button" className="prototype-admin-primary-button" onClick={saveLogic}>Save Recommendation</button>
              </div>
            </article>
          </div>

          <aside className="prototype-admin-content-right">
            <article className="prototype-panel prototype-admin-sync-card">
              <div className="prototype-admin-side-head">
                <TestTube2 size={18} />
                <h3>Update Fertilizer Standards</h3>
              </div>
              <p>Periodically sync local standards with global academic fertilizer benchmarks (FAO/USDA). Last synced: 14 Oct 2023.</p>
              <div className="prototype-admin-sync-list">
                {fertilizerCards.map((item) => (
                  <div key={item.title} className="prototype-admin-sync-item">
                    <strong>{item.title}</strong>
                    <span className={item.state === "Active" ? "active" : "pending"}>{item.state}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-primary-button full" onClick={syncGuidelines}>
                <Sparkles size={15} />
                <span>Sync Guidelines Now</span>
              </button>
            </article>

            <article className="prototype-panel prototype-admin-recent-card">
              <div className="prototype-admin-side-head">
                <Clock3 size={18} />
                <h3>Recent Modifications</h3>
              </div>
              <div className="prototype-admin-recent-list">
                {modifications.map((item) => (
                  <div key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-text-link" onClick={exportAuditTrail}>View Full Audit Trail</button>
            </article>

            <article className="prototype-admin-help-card">
              <h3>Need Help?</h3>
              <p>Access the documentation for managing the AI-decision engine and knowledge graphs.</p>
              <button type="button" onClick={exportDocumentation}>Documentation</button>
              <BookOpen size={58} />
            </article>
          </aside>
        </div>

        <footer className="prototype-admin-content-footer">
          <span>© 2023 AgriSupport Academic Research Project. All rights reserved.</span>
          <div>
            <span>System Status</span>
            <span>Terms of Access</span>
            <span>Privacy Policy</span>
          </div>
        </footer>
      </div>
    </section>
  );
}

function AdminContentManagementViewV2() {
  const stored = useMemo(() => loadAdminContentState(), []);
  const [activeTab, setActiveTab] = useState(stored.activeTab || "Crops");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState(normalizeAdminEntries(stored.entries));
  const [triggerParameter, setTriggerParameter] = useState(stored.triggerParameter || "Soil Moisture Deficiency (%)");
  const [severity, setSeverity] = useState(stored.severity || "Medium");
  const [recommendationContent, setRecommendationContent] = useState(stored.recommendationContent || "");
  const [jsonLogic, setJsonLogic] = useState(
    stored.jsonLogic ||
      `{
  "irrigation": "scheduled_increase",
  "volume_m3": 15,
  "duration_min": 45,
  "alert_sms": true
}`
  );
  const [contentLanguage, setContentLanguage] = useState(stored.contentLanguage || "English");
  const [entryName, setEntryName] = useState("");
  const [modifications, setModifications] = useState(stored.modifications || recentModifications);
  const [auditTrail, setAuditTrail] = useState(stored.auditTrail || auditTrailSeed);
  const [sandboxInput, setSandboxInput] = useState(
    stored.sandboxInput || {
      crop: "Maize (Hybrid)",
      soilPh: "6.2",
      nitrogen: "54",
      phosphorus: "28",
      potassium: "31",
      rainfall: "18",
      temperature: "26",
      growthStage: "Vegetative",
    }
  );
  const [sandboxOutput, setSandboxOutput] = useState(stored.sandboxOutput || null);
  const itemsPerPage = 4;

  useEffect(() => {
    saveAdminContentState({
      activeTab,
      entries,
      triggerParameter,
      severity,
      recommendationContent,
      jsonLogic,
      modifications,
      contentLanguage,
      auditTrail,
      sandboxInput,
      sandboxOutput,
    });
  }, [
    activeTab,
    entries,
    triggerParameter,
    severity,
    recommendationContent,
    jsonLogic,
    modifications,
    contentLanguage,
    auditTrail,
    sandboxInput,
    sandboxOutput,
  ]);

  const tabIcons = {
    Crops: Sprout,
    Pests: Bug,
    "Advisory Logic": BrainCircuit,
    "Fertilizer Standards": TestTube2,
    "Advisory Templates": BookOpen,
  };

  const addAudit = (action, module, user = "AgriFeed Admin") => {
    setAuditTrail((current) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user,
        action,
        module,
        timestamp: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 20));
  };

  const addModification = (title, meta, module = activeTab) => {
    setModifications((current) => [{ title, meta }, ...current].slice(0, 6));
    addAudit(title, module);
  };

  const addEntry = () => {
    const trimmed = entryName.trim();
    if (!trimmed) return;
    const newEntry = buildDefaultEntry(activeTab, trimmed, contentLanguage);
    setEntries((current) => ({
      ...current,
      [activeTab]: [newEntry, ...(current[activeTab] || [])],
    }));
    addModification(`${trimmed} created`, "By AgriFeed Admin · just now", activeTab);
    setEntryName("");
  };

  const cycleStatus = (entryId) => {
    const currentEntry = (entries[activeTab] || []).find((row) => row.id === entryId);
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).map((row) => {
        if (row.id !== entryId) return row;
        const currentIndex = CONTENT_WORKFLOW.indexOf(row.status);
        const nextStatus = CONTENT_WORKFLOW[(currentIndex + 1) % CONTENT_WORKFLOW.length];
        return { ...row, status: nextStatus };
      }),
    }));
    if (currentEntry) {
      addModification(`${currentEntry.name || currentEntry.crop} workflow advanced`, "Workflow updated · just now", activeTab);
    }
  };

  const removeEntry = (entryId) => {
    const currentEntry = (entries[activeTab] || []).find((row) => row.id === entryId);
    setEntries((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).filter((row) => row.id !== entryId),
    }));
    if (currentEntry) {
      addModification(`${currentEntry.name || currentEntry.crop} archived from ${activeTab}`, "By AgriFeed Admin · just now", activeTab);
    }
  };

  const visibleEntries = entries[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / itemsPerPage));
  const pagedEntries = visibleEntries.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const contentStats = useMemo(() => {
    const allEntries = Object.values(entries).flat();
    return [
      { label: "Total Crops", value: entries.Crops?.length || 0, icon: Sprout, tone: "green" },
      { label: "Total Pests", value: entries.Pests?.length || 0, icon: Bug, tone: "amber" },
      { label: "Advisory Rules", value: entries["Advisory Logic"]?.length || 0, icon: BrainCircuit, tone: "blue" },
      { label: "Fertilizer Standards", value: entries["Fertilizer Standards"]?.length || 0, icon: TestTube2, tone: "violet" },
      { label: "Published Content", value: allEntries.filter((item) => item.status === "Published").length, icon: Check, tone: "green" },
      { label: "Pending Reviews", value: allEntries.filter((item) => item.status === "Pending Review").length, icon: ShieldAlert, tone: "amber" },
    ];
  }, [entries]);

  const languageSummary = useMemo(() => {
    const allEntries = Object.values(entries).flat();
    return CONTENT_LANGUAGE_OPTIONS.map((language) => ({
      language,
      total: allEntries.filter((item) => item.language === language).length,
    }));
  }, [entries]);

  const knowledgeGraphSummary = useMemo(
    () =>
      contentGraphNodes.map((node) => ({
        ...node,
        links: contentGraphLinks.filter((link) => link.from === node.id || link.to === node.id).length,
      })),
    []
  );

  const sandboxComputedOutput = useMemo(() => {
    const ph = Number(sandboxInput.soilPh || 0);
    const nitrogen = Number(sandboxInput.nitrogen || 0);
    const rainfall = Number(sandboxInput.rainfall || 0);
    const temperature = Number(sandboxInput.temperature || 0);
    const potassium = Number(sandboxInput.potassium || 0);
    const phosphorus = Number(sandboxInput.phosphorus || 0);
    const nutrientBalance = Math.round((nitrogen + phosphorus + potassium) / 3);
    const phScore = ph >= 5.5 && ph <= 6.8 ? 88 : 62;
    const rainfallScore = rainfall >= 12 && rainfall <= 35 ? 84 : rainfall < 12 ? 58 : 70;
    const temperatureScore = temperature >= 20 && temperature <= 28 ? 85 : 64;
    const confidence = clamp(
      Math.round((nutrientBalance * 0.36) + (phScore * 0.24) + (rainfallScore * 0.2) + (temperatureScore * 0.2)),
      54,
      96
    );
    const recommendation =
      nutrientBalance < 35
        ? "Delay planting and correct nutrient deficiencies before the next rainfall window."
        : rainfall < 12
          ? "Use moisture conservation and stage irrigation support before pushing high-yield recommendations."
          : temperature > 30
            ? "Prioritize heat-risk management and avoid nitrogen-heavy applications this week."
            : "Conditions support the advisory rule. Proceed with crop-stage recommendation and monitor weather shifts.";

    return {
      recommendation,
      confidence,
      explanation: `Generated from ${sandboxInput.crop}, ${sandboxInput.growthStage} stage, pH ${ph}, NPK ${nitrogen}/${phosphorus}/${potassium}, rainfall ${rainfall} mm, and temperature ${temperature}°C.`,
    };
  }, [sandboxInput]);

  const testLogic = () => {
    setSandboxOutput(sandboxComputedOutput);
    addModification(`Logic test run for ${triggerParameter}`, "System Validation · just now", "Advisory Logic");
  };

  const saveLogic = () => {
    addModification(`Advisory logic saved for ${triggerParameter}`, "System Save · just now", "Advisory Logic");
  };

  const syncGuidelines = () => {
    addModification("Fertilizer standards synchronized", "System Sync · just now", "Fertilizer Standards");
  };

  const exportCurrentTab = () => {
    const rows =
      activeTab === "Crops"
        ? [["Crop", "Recommended Soil", "Optimal pH", "Rainfall Range", "Yield Potential", "Suitability Score", "Status"], ...visibleEntries.map((row) => [row.crop, row.recommendedSoil, row.optimalPh, row.rainfallRange, row.yieldPotential, row.suitabilityScore, row.status])]
        : activeTab === "Pests"
          ? [["Pest", "Affected Crops", "Risk Level", "Treatment Recommendation", "Detection Confidence", "Status"], ...visibleEntries.map((row) => [row.crop, row.affectedCrops, row.riskLevel, row.treatmentRecommendation, row.detectionConfidence, row.status])]
          : activeTab === "Advisory Templates"
            ? [["Template", "Category", "Summary", "Language", "Status"], ...visibleEntries.map((row) => [row.name, row.category, row.summary, row.language, row.status])]
            : activeTab === "Advisory Logic"
              ? [["Rule", "Trigger", "Scope", "Confidence", "Status"], ...visibleEntries.map((row) => [row.crop, row.trigger, row.ruleScope, row.confidence, row.status])]
              : [["Standard", "Coverage Zone", "Nutrient Focus", "Application Timing", "Benchmark", "Status"], ...visibleEntries.map((row) => [row.crop, row.zone, row.nutrientFocus, row.applicationTiming, row.benchmark, row.status])];
    downloadCsvFile(`admin-content-${activeTab.toLowerCase().replace(/\s+/g, "-")}.csv`, rows);
  };

  const exportAuditTrail = () => {
    downloadJsonFile("admin-audit-trail.json", auditTrail);
  };

  const exportDocumentation = () => {
    downloadTextFile(
      "content-management-documentation.txt",
      `AgriSupport Content Management\n\nDEMO_MODE: ${DEMO_MODE}\nCurrent tab: ${activeTab}\nLanguage: ${contentLanguage}\nTrigger parameter: ${triggerParameter}\nSeverity: ${severity}`
    );
  };

  const renderRowActions = (row) => (
    <div className="prototype-admin-content-row-actions">
      <button type="button" onClick={() => cycleStatus(row.id)}><Check size={16} /></button>
      <button type="button" onClick={() => removeEntry(row.id)}><Trash2 size={16} /></button>
    </div>
  );

  const renderTable = () => {
    if (activeTab === "Crops") {
      return (
        <div className="prototype-admin-content-table prototype-admin-content-table-wide">
          <div className="prototype-admin-content-table-head content-table-head-crops">
            <span>Crop</span><span>Recommended Soil</span><span>Optimal pH</span><span>Rainfall Range</span><span>Yield Potential</span><span>Suitability Score</span><span>Status</span><span>Actions</span>
          </div>
          {pagedEntries.map((row) => (
            <div key={row.id} className="prototype-admin-content-row content-table-row-crops">
              <strong>{row.crop}</strong><span>{row.recommendedSoil}</span><span>{row.optimalPh}</span><span>{row.rainfallRange}</span><span>{row.yieldPotential}</span><span>{row.suitabilityScore}</span><span className={`prototype-admin-content-status ${getContentStatusTone(row.status)}`}>{row.status}</span>{renderRowActions(row)}
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "Pests") {
      return (
        <div className="prototype-admin-content-table prototype-admin-content-table-wide">
          <div className="prototype-admin-content-table-head content-table-head-pests">
            <span>Pest / Disease</span><span>Affected Crops</span><span>Risk Level</span><span>Treatment Recommendation</span><span>Detection Confidence</span><span>Status</span><span>Actions</span>
          </div>
          {pagedEntries.map((row) => (
            <div key={row.id} className="prototype-admin-content-row content-table-row-pests">
              <strong>{row.crop}</strong><span>{row.affectedCrops}</span><span>{row.riskLevel}</span><span>{row.treatmentRecommendation}</span><span>{row.detectionConfidence}</span><span className={`prototype-admin-content-status ${getContentStatusTone(row.status)}`}>{row.status}</span>{renderRowActions(row)}
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "Advisory Templates") {
      return (
        <div className="prototype-admin-content-table prototype-admin-content-table-wide">
          <div className="prototype-admin-content-table-head content-table-head-templates">
            <span>Template</span><span>Category</span><span>Summary</span><span>Language</span><span>Status</span><span>Actions</span>
          </div>
          {pagedEntries.map((row) => (
            <div key={row.id} className="prototype-admin-content-row content-table-row-templates">
              <strong>{row.name}</strong><span>{row.category}</span><span>{row.summary}</span><span>{row.language}</span><span className={`prototype-admin-content-status ${getContentStatusTone(row.status)}`}>{row.status}</span>{renderRowActions(row)}
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "Advisory Logic") {
      return (
        <div className="prototype-admin-content-table prototype-admin-content-table-wide">
          <div className="prototype-admin-content-table-head content-table-head-logic">
            <span>Rule</span><span>Trigger</span><span>Scope</span><span>Confidence</span><span>Status</span><span>Actions</span>
          </div>
          {pagedEntries.map((row) => (
            <div key={row.id} className="prototype-admin-content-row content-table-row-logic">
              <strong>{row.crop}</strong><span>{row.trigger}</span><span>{row.ruleScope}</span><span>{row.confidence}</span><span className={`prototype-admin-content-status ${getContentStatusTone(row.status)}`}>{row.status}</span>{renderRowActions(row)}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="prototype-admin-content-table prototype-admin-content-table-wide">
        <div className="prototype-admin-content-table-head content-table-head-fertilizer">
          <span>Standard</span><span>Coverage Zone</span><span>Nutrient Focus</span><span>Application Timing</span><span>Benchmark</span><span>Status</span><span>Actions</span>
        </div>
        {pagedEntries.map((row) => (
          <div key={row.id} className="prototype-admin-content-row content-table-row-fertilizer">
            <strong>{row.crop}</strong><span>{row.zone}</span><span>{row.nutrientFocus}</span><span>{row.applicationTiming}</span><span>{row.benchmark}</span><span className={`prototype-admin-content-status ${getContentStatusTone(row.status)}`}>{row.status}</span>{renderRowActions(row)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="management-page prototype-admin-content-page">
      <div className="prototype-admin-content-main">
        <div className="page-title-block prototype-admin-content-title">
          <div>
            <h1>Content Management</h1>
            <p>Complete agricultural knowledge base and AI advisory management center for demo-mode administration.</p>
          </div>
          <div className="prototype-admin-demo-tag">
            <span>{DEMO_MODE ? "DEMO_MODE" : "Live Mode"}</span>
            <small>localStorage + mock content records</small>
          </div>
        </div>

        <div className="prototype-stats-grid prototype-admin-content-stats-grid">
          {contentStats.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="prototype-stat-card prototype-admin-content-stat-card">
                <div className="stat-card-top">
                  <div className={`stat-icon tone-${item.tone}`}>
                    <Icon size={16} />
                  </div>
                </div>
                <p>{item.label}</p>
                <h3>{item.value}</h3>
              </article>
            );
          })}
        </div>

        <div className="prototype-admin-content-actions">
          <button type="button" className="prototype-admin-secondary-button" onClick={exportCurrentTab}>
            <FileDown size={15} />
            <span>Export Data</span>
          </button>
          <div className="prototype-admin-entry-inline">
            <input type="text" value={entryName} onChange={(event) => setEntryName(event.target.value)} placeholder={`Add new ${activeTab.toLowerCase()} entry`} />
            <button type="button" className="prototype-admin-primary-button" onClick={addEntry}>
              <Plus size={16} />
              <span>Add New Entry</span>
            </button>
          </div>
        </div>

        <div className="prototype-admin-content-tabs">
          {Object.entries(tabIcons).map(([label, Icon]) => (
            <button key={label} type="button" className={activeTab === label ? "active" : ""} onClick={() => setActiveTab(label)}>
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="prototype-admin-content-grid">
          <div className="prototype-admin-content-left">
            <article className="prototype-panel prototype-admin-content-table-card">
              <div className="prototype-admin-content-card-head">
                <div>
                  <h2>{activeTab} Database</h2>
                  <span>Knowledge center records with workflow and language support</span>
                </div>
                <div className="prototype-admin-language-select">
                  <span>Content Language</span>
                  <select value={contentLanguage} onChange={(event) => setContentLanguage(event.target.value)}>
                    {CONTENT_LANGUAGE_OPTIONS.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>
              </div>
              {renderTable()}
              <div className="prototype-admin-content-pagination">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
                <div>
                  <button type="button" className="active">Page {page} of {totalPages}</button>
                </div>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
              </div>
            </article>

            <div className="prototype-admin-content-subgrid">
              <article className="prototype-panel prototype-admin-logic-card">
                <div className="prototype-admin-content-card-head align-start">
                  <div>
                    <h2>Recommendation Testing Sandbox</h2>
                    <p>Test advisory outputs using crop, soil, weather, and growth-stage inputs before publishing.</p>
                  </div>
                </div>

                <div className="prototype-admin-sandbox-grid">
                  <label className="prototype-admin-content-field">
                    <span>Crop</span>
                    <select value={sandboxInput.crop} onChange={(event) => setSandboxInput((current) => ({ ...current, crop: event.target.value }))}>
                      {(entries.Crops || []).map((item) => <option key={item.id} value={item.crop}>{item.crop}</option>)}
                    </select>
                  </label>
                  <label className="prototype-admin-content-field"><span>Soil pH</span><input type="number" value={sandboxInput.soilPh} onChange={(event) => setSandboxInput((current) => ({ ...current, soilPh: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field"><span>Nitrogen (N)</span><input type="number" value={sandboxInput.nitrogen} onChange={(event) => setSandboxInput((current) => ({ ...current, nitrogen: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field"><span>Phosphorus (P)</span><input type="number" value={sandboxInput.phosphorus} onChange={(event) => setSandboxInput((current) => ({ ...current, phosphorus: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field"><span>Potassium (K)</span><input type="number" value={sandboxInput.potassium} onChange={(event) => setSandboxInput((current) => ({ ...current, potassium: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field"><span>Rainfall (mm)</span><input type="number" value={sandboxInput.rainfall} onChange={(event) => setSandboxInput((current) => ({ ...current, rainfall: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field"><span>Temperature (°C)</span><input type="number" value={sandboxInput.temperature} onChange={(event) => setSandboxInput((current) => ({ ...current, temperature: event.target.value }))} /></label>
                  <label className="prototype-admin-content-field">
                    <span>Growth Stage</span>
                    <select value={sandboxInput.growthStage} onChange={(event) => setSandboxInput((current) => ({ ...current, growthStage: event.target.value }))}>
                      <option>Establishment</option><option>Vegetative</option><option>Flowering</option><option>Grain Fill</option><option>Harvest Ready</option>
                    </select>
                  </label>
                </div>

                <div className="prototype-admin-logic-grid">
                  <label>
                    <span>Trigger Parameter</span>
                    <select value={triggerParameter} onChange={(event) => setTriggerParameter(event.target.value)}>
                      <option>Soil Moisture Deficiency (%)</option>
                      <option>Leaf Temperature Spike</option>
                      <option>Nitrogen Deficit</option>
                    </select>
                  </label>
                  <div className="prototype-admin-severity-block">
                    <span>Severity Level</span>
                    <div className="prototype-admin-radio-row">
                      {["Low", "Medium", "Critical"].map((option) => (
                        <label key={option}>
                          <input type="radio" name="severity-v2" checked={severity === option} onChange={() => setSeverity(option)} />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="prototype-admin-content-field">
                  <span>Recommendation Content (Output for Farmer)</span>
                  <textarea rows="4" placeholder="Enter the advice text that will be shown to users..." value={recommendationContent} onChange={(event) => setRecommendationContent(event.target.value)} />
                </label>
                <label className="prototype-admin-content-field">
                  <span>Actionable Steps (.JSON Logic)</span>
                  <textarea rows="6" className="code" value={jsonLogic} onChange={(event) => setJsonLogic(event.target.value)} />
                </label>

                {sandboxOutput ? (
                  <div className="prototype-admin-sandbox-output">
                    <div className="prototype-admin-content-card-head">
                      <h3>Sandbox Output</h3>
                      <span>{sandboxOutput.confidence}% confidence</span>
                    </div>
                    <strong>{sandboxOutput.recommendation}</strong>
                    <p>{sandboxOutput.explanation}</p>
                  </div>
                ) : null}

                <div className="prototype-admin-logic-actions">
                  <button type="button" className="prototype-admin-secondary-button" onClick={testLogic}>Run Sandbox</button>
                  <button type="button" className="prototype-admin-primary-button" onClick={saveLogic}>Save Recommendation</button>
                </div>
              </article>

              <article className="prototype-panel prototype-admin-logic-card">
                <div className="prototype-admin-content-card-head align-start">
                  <div>
                    <h2>Agricultural Knowledge Graph View</h2>
                    <p>Visualize relationships between crops, pests, soil conditions, advisory rules, and fertilizer standards.</p>
                  </div>
                </div>
                <div className="prototype-admin-graph-layout">
                  <div className="prototype-admin-graph-nodes">
                    {knowledgeGraphSummary.map((node) => (
                      <div key={node.id} className="prototype-admin-graph-node">
                        <strong>{node.label}</strong>
                        <span>{node.type}</span>
                        <small>{node.links} connection(s)</small>
                      </div>
                    ))}
                  </div>
                  <div className="prototype-admin-graph-links">
                    {contentGraphLinks.map((link) => (
                      <div key={`${link.from}-${link.to}`} className="prototype-admin-graph-link">
                        <span>{contentGraphNodes.find((node) => node.id === link.from)?.label}</span>
                        <ChevronDown size={14} />
                        <strong>{link.label}</strong>
                        <ChevronDown size={14} />
                        <span>{contentGraphNodes.find((node) => node.id === link.to)?.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside className="prototype-admin-content-right">
            <article className="prototype-panel prototype-admin-sync-card">
              <div className="prototype-admin-side-head"><Database size={18} /><h3>Local Language Management</h3></div>
              <p>Maintain aligned advisory content across English, Kinyarwanda, and French for extension delivery.</p>
              <div className="prototype-admin-sync-list">
                {languageSummary.map((item) => (
                  <div key={item.language} className="prototype-admin-sync-item">
                    <strong>{item.language}</strong>
                    <span className={item.total >= 3 ? "active" : "pending"}>{item.total} entries</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel prototype-admin-sync-card">
              <div className="prototype-admin-side-head"><TestTube2 size={18} /><h3>Update Fertilizer Standards</h3></div>
              <p>Periodically sync local standards with global academic fertilizer benchmarks (FAO/USDA). Last synced: 14 Oct 2023.</p>
              <div className="prototype-admin-sync-list">
                {fertilizerCards.map((item) => (
                  <div key={item.title} className="prototype-admin-sync-item">
                    <strong>{item.title}</strong>
                    <span className={item.state === "Active" ? "active" : "pending"}>{item.state}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-primary-button full" onClick={syncGuidelines}><Sparkles size={15} /><span>Sync Guidelines Now</span></button>
            </article>

            <article className="prototype-panel prototype-admin-recent-card">
              <div className="prototype-admin-side-head"><Clock3 size={18} /><h3>Recent Modifications</h3></div>
              <div className="prototype-admin-recent-list">
                {modifications.map((item) => (
                  <div key={`${item.title}-${item.meta}`}>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="prototype-admin-text-link" onClick={exportAuditTrail}>View Full Audit Trail</button>
            </article>

            <article className="prototype-admin-help-card">
              <h3>Need Help?</h3>
              <p>Access documentation for crop rules, pest knowledge, local language packs, and advisory graph structure.</p>
              <button type="button" onClick={exportDocumentation}>Documentation</button>
              <BookOpen size={58} />
            </article>
          </aside>
        </div>

        <div className="prototype-admin-content-grid prototype-admin-content-bottom-grid">
          <article className="prototype-panel prototype-admin-content-table-card">
            <div className="prototype-admin-content-card-head">
              <div>
                <h2>Content Approval Workflow</h2>
                <span>Statuses supported: Draft, Pending Review, Approved, Published, Archived</span>
              </div>
            </div>
            <div className="prototype-admin-workflow-chip-row">
              {CONTENT_WORKFLOW.map((status) => (
                <span key={status} className={`prototype-admin-content-status ${getContentStatusTone(status)}`}>{status}</span>
              ))}
            </div>
          </article>

          <article className="prototype-panel prototype-admin-content-table-card">
            <div className="prototype-admin-content-card-head">
              <div>
                <h2>Full Audit Trail Dashboard</h2>
                <span>User, action, module, and timestamp for editorial accountability</span>
              </div>
              <button type="button" className="prototype-admin-secondary-button" onClick={exportAuditTrail}><Download size={15} /><span>Export Audit</span></button>
            </div>
            <div className="prototype-admin-audit-list">
              {auditTrail.slice(0, 8).map((item) => (
                <div key={item.id} className="prototype-admin-audit-row">
                  <strong>{item.user}</strong>
                  <span>{item.action}</span>
                  <span>{item.module}</span>
                  <small>{formatReadableDate(item.timestamp)}</small>
                </div>
              ))}
            </div>
          </article>
        </div>

        <footer className="prototype-admin-content-footer">
          <span>© 2026 AgriSupport Academic Research Project. All rights reserved.</span>
          <div><span>System Status</span><span>Terms of Access</span><span>Privacy Policy</span></div>
        </footer>
      </div>
    </section>
  );
}

export function RecommendationsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminContentManagementViewV2 /> : <FarmerRecommendationsView />;
}
