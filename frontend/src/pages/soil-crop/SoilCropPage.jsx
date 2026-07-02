import {
  AlertTriangle, X, Download, FileClock, Filter, FlaskConical, Leaf, MapPinned,
  RotateCcw, Search, Sprout, TestTubeDiagonal, Upload, CircleHelp,
  Activity, ArrowDown, ArrowUp, BarChart3, Check, CheckCircle, ChevronDown,
  Clock, Cloud, CloudSun, Combine, Crosshair, Droplets, Eye, GripVertical,
  Layers, Minimize2, Navigation, Plus, RefreshCw, Shield, Sun, Target,
  Thermometer, TrendingUp, Tractor, Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { downloadJsonFile, downloadTextFile } from "../../utils/actions";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { SectionCard } from "../../components/common/SectionCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { MetricCard } from "../../components/common/MetricCard";
import { getCropImageUrl } from "../../data/cropImages";

const cropLibrary = [
  {
    name: "Winter Wheat",
    season: "Cool Season",
    region: "Northern Highlands",
    soilTypes: ["Loamy", "Clay Loam"],
    phRange: [6.0, 7.2],
    npk: { n: 42, p: 24, k: 20 },
    organicMatterMin: 2.4,
    rotationTag: "Low Water Need",
    cycle: "4-5 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/54/Wheat_close-up.JPG",
  },
  {
    name: "Maize (Corn)",
    season: "Warm Season",
    region: "Northern Highlands",
    soilTypes: ["Loamy", "Sandy Loam"],
    phRange: [5.8, 7.0],
    npk: { n: 55, p: 28, k: 26 },
    organicMatterMin: 2.8,
    rotationTag: "Moderate Water",
    cycle: "3-4 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Maize_by_David_Monniaux.jpg",
  },
  {
    name: "Soybean",
    season: "Warm Season",
    region: "Eastern Delta",
    soilTypes: ["Loamy", "Silty"],
    phRange: [6.0, 7.4],
    npk: { n: 22, p: 18, k: 20 },
    organicMatterMin: 2.2,
    rotationTag: "Nitrogen Fixing",
    cycle: "3 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Soybean.USDA.jpg",
  },
  {
    name: "Sorghum",
    season: "Dry Season",
    region: "Southern Plains",
    soilTypes: ["Sandy Loam", "Loamy"],
    phRange: [5.6, 7.5],
    npk: { n: 30, p: 18, k: 16 },
    organicMatterMin: 1.8,
    rotationTag: "Drought Tolerant",
    cycle: "4 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/82/Sorghum_bicolor03.jpg",
  },
  {
    name: "Irish Potato",
    season: "Cool Season",
    region: "Western Valley",
    soilTypes: ["Sandy Loam", "Loamy"],
    phRange: [5.2, 6.6],
    npk: { n: 38, p: 30, k: 36 },
    organicMatterMin: 3.0,
    rotationTag: "High Potassium",
    cycle: "3-4 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Patates.jpg",
  },
  {
    name: "Beans",
    season: "Rainy Season",
    region: "Eastern Delta",
    soilTypes: ["Silty", "Loamy"],
    phRange: [6.0, 7.2],
    npk: { n: 20, p: 16, k: 18 },
    organicMatterMin: 2.0,
    rotationTag: "Rotation Friendly",
    cycle: "2-3 Mo Cycle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Phaseolus_vulgaris_-_haricots_verts.jpg",
  },
];

const textureOptions = ["Loamy", "Sandy Loam", "Clay Loam", "Silty"];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scoreState(value, healthyThreshold, moderateThreshold) {
  if (value >= healthyThreshold) return "Sufficient";
  if (value >= moderateThreshold) return "Moderate";
  return "Deficient";
}

function average(array) {
  return array.reduce((sum, value) => sum + value, 0) / Math.max(array.length, 1);
}

function inferTextureFromFractions({ clay, sand, silt }) {
  if (clay >= sand && clay >= silt) return "Clay Loam";
  if (silt >= clay && silt >= sand) return "Silty";
  if (sand >= 45) return "Sandy Loam";
  return "Loamy";
}

function normalisePh(rawValue) {
  if (rawValue == null) return 6.3;
  return rawValue > 14 ? rawValue / 10 : rawValue;
}

function convertSoilOrganicMatter(rawSoc) {
  if (rawSoc == null) return 2.4;
  const socBase = rawSoc > 20 ? rawSoc / 10 : rawSoc;
  return clamp(Number((socBase * 0.1724).toFixed(1)), 1.2, 5.2);
}

function convertNitrogenEstimate(rawNitrogen, organicMatter) {
  if (rawNitrogen == null) {
    return clamp(Math.round(18 + organicMatter * 8), 18, 48);
  }

  const scaled =
    rawNitrogen < 5 ? rawNitrogen * 10 + 8 : rawNitrogen > 100 ? rawNitrogen / 10 : rawNitrogen;
  return clamp(Math.round(scaled), 12, 56);
}

function parseSoilGridsValue(payload, propertyName) {
  const layers = Array.isArray(payload?.properties?.layers)
    ? payload.properties.layers
    : Array.isArray(payload?.properties)
      ? payload.properties
      : [];

  const layer =
    layers.find((item) => item.name === propertyName || item.property === propertyName) ||
    payload?.properties?.[propertyName];

  if (!layer) return null;

  const depth =
    (Array.isArray(layer.depths) && layer.depths[0]) ||
    layer.depth ||
    {};
  const values = depth.values || layer.values || {};

  return values.mean ?? values.median ?? values["Q0.5"] ?? null;
}

function parseSoilGridsEstimate(payload) {
  const ph = normalisePh(parseSoilGridsValue(payload, "phh2o"));
  const soc = parseSoilGridsValue(payload, "soc");
  const nitrogenRaw = parseSoilGridsValue(payload, "nitrogen");
  const clay = Number(parseSoilGridsValue(payload, "clay") || 28);
  const sand = Number(parseSoilGridsValue(payload, "sand") || 36);
  const silt = Number(parseSoilGridsValue(payload, "silt") || 36);
  const cec = Number(parseSoilGridsValue(payload, "cec") || 12);

  const organicMatter = convertSoilOrganicMatter(soc);
  const nitrogen = convertNitrogenEstimate(nitrogenRaw, organicMatter);
  const phosphorus = clamp(Math.round(14 + cec * 0.65 + organicMatter * 1.4), 12, 28);
  const potassium = clamp(Math.round(12 + clay * 0.12 + cec * 0.75), 14, 34);
  const texture = inferTextureFromFractions({ clay, sand, silt });

  return {
    ph: Number(ph.toFixed(1)),
    nitrogen,
    phosphorus,
    potassium,
    organicMatter,
    texture,
    meta: {
      clay,
      sand,
      silt,
      cec,
    },
  };
}

function deriveSeasonFromWeather(weatherContext) {
  if (!weatherContext) return "Warm Season";
  if (weatherContext.weeklyRain >= 22 || weatherContext.maxRainProbability >= 55) return "Rainy Season";
  if (weatherContext.averageMaxTemp >= 25.5) return "Warm Season";
  if (weatherContext.averageMinTemp <= 15.5) return "Cool Season";
  return "Dry Season";
}

function deriveCropStage(selectedFarm, seasonLabel) {
  if (selectedFarm?.primaryCrop) {
    if (seasonLabel === "Rainy Season") return "vegetative growth stage";
    if (seasonLabel === "Dry Season") return "water-stress management stage";
    if (seasonLabel === "Cool Season") return "maturity and disease-watch stage";
  }

  return "field monitoring stage";
}

function getSeasonCompatibilityBonus(crop, seasonLabel) {
  if (crop.season === seasonLabel) return 14;
  if (seasonLabel === "Rainy Season" && crop.season === "Warm Season") return 8;
  if (seasonLabel === "Warm Season" && crop.season === "Dry Season") return 6;
  if (seasonLabel === "Cool Season" && crop.season === "Warm Season") return 4;
  return 0;
}

function getWeatherFitScore(crop, climate) {
  if (!climate) return 14;

  let score = 12;

  if (crop.rotationTag.includes("Drought") && climate.weeklyRain <= 12) score += 12;
  if (crop.rotationTag.includes("Low Water") && climate.weeklyRain <= 18) score += 10;
  if (crop.rotationTag.includes("Moderate Water") && climate.weeklyRain >= 10 && climate.weeklyRain <= 35) score += 8;
  if (crop.rotationTag.includes("Nitrogen Fixing") && climate.averageMaxTemp >= 22 && climate.averageMaxTemp <= 29) score += 8;
  if (crop.name.includes("Potato") && climate.averageMaxTemp <= 26) score += 12;
  if (crop.name.includes("Beans") && climate.maxRainProbability >= 25 && climate.maxRainProbability <= 70) score += 8;

  if (climate.et0 >= 5.5 && crop.rotationTag.includes("Moderate Water")) score -= 4;
  if (climate.et0 >= 5.8 && crop.name.includes("Potato")) score -= 6;

  return clamp(Math.round(score), 4, 24);
}

function buildClimateContext(forecast, selectedFarm) {
  const current = forecast?.current || {};
  const daily = forecast?.daily || {};
  const maxTemps = daily.temperature_2m_max || [];
  const minTemps = daily.temperature_2m_min || [];
  const rainSums = daily.precipitation_sum || [];
  const rainProbabilities = daily.precipitation_probability_max || [];
  const et0Values = daily.et0_fao_evapotranspiration || [];

  const weeklyRain = Number(rainSums.reduce((sum, value) => sum + (value || 0), 0).toFixed(1));
  const averageMaxTemp = Number(average(maxTemps.length ? maxTemps : [current.temperature_2m || 24]).toFixed(1));
  const averageMinTemp = Number(average(minTemps.length ? minTemps : [current.temperature_2m || 16]).toFixed(1));
  const averageEt0 = Number(average(et0Values.length ? et0Values : [current.et0_fao_evapotranspiration || 3.4]).toFixed(1));
  const seasonLabel = deriveSeasonFromWeather({
    weeklyRain,
    maxRainProbability: Math.max(...(rainProbabilities.length ? rainProbabilities : [0])),
    averageMaxTemp,
    averageMinTemp,
  });

  return {
    currentTemp: current.temperature_2m || averageMaxTemp,
    humidity: current.relative_humidity_2m || 58,
    pressure: current.pressure_msl || 1014,
    wind: current.wind_speed_10m || 9,
    soilMoisture: current.soil_moisture_0_to_1cm || 0,
    et0: current.et0_fao_evapotranspiration || averageEt0,
    averageEt0,
    averageMaxTemp,
    averageMinTemp,
    weeklyRain,
    maxRainProbability: Math.max(...(rainProbabilities.length ? rainProbabilities : [0])),
    seasonLabel,
    cropStage: deriveCropStage(selectedFarm, seasonLabel),
  };
}

function createSoilImprovementInsights(values, form, healthScore) {
  const lacks = [];
  const actions = [];

  if (values.ph < 6.0) {
    lacks.push("soil pH is slightly acidic");
    actions.push("Apply agricultural lime gradually to move pH closer to the ideal 6.2-6.8 range.");
  } else if (values.ph > 7.2) {
    lacks.push("soil pH is above the best crop range");
    actions.push("Use acid-forming fertilizers and add organic matter to slowly rebalance pH.");
  }

  if (values.nitrogen < 32) {
    lacks.push("nitrogen is below the preferred level");
    actions.push("Increase nitrogen using composted manure, legumes, or a split nitrogen fertilizer program.");
  }

  if (values.phosphorus < 20) {
    lacks.push("phosphorus is limiting root development");
    actions.push("Add phosphorus sources like DAP or TSP and place them near the planting zone.");
  }

  if (values.potassium < 20) {
    lacks.push("potassium is too low for strong stalk and drought resilience");
    actions.push("Apply muriate or sulphate of potash before planting and retain crop residues.");
  }

  if (values.organicMatter < 2.5) {
    lacks.push("organic matter is not high enough");
    actions.push("Add compost, mulch, and a legume cover crop to improve structure and moisture retention.");
  }

  if (form.texture === "Sandy Loam") {
    actions.push("Use mulching and smaller split fertilizer applications because sandy soils lose nutrients faster.");
  }

  if (form.texture === "Clay Loam") {
    actions.push("Improve drainage timing and avoid working the soil when overly wet to reduce compaction.");
  }

  if (healthScore >= 95) {
    return {
      summary: "Excellent soil condition. This field is already well balanced for productive cropping.",
      lacks: [],
      actions: [
        "Maintain the current fertility program, keep crop residues on the field, and rotate with legumes to preserve the score.",
      ],
    };
  }

  return {
    summary:
      lacks.length > 0
        ? `This score is mainly being reduced because ${lacks.join(", ")}.`
        : "The soil is reasonably balanced, but a few targeted adjustments can still improve performance.",
    lacks,
    actions,
  };
}

function buildRecommendationDescription(crop, analysis, selectedFarm) {
  if (!crop) return null;

  const values = analysis?.values || { ph: 6.5, nitrogen: 38, phosphorus: 21, potassium: 17, organicMatter: 2.7 };
  const concerns = [];
  const actions = [];

  const minPh = crop.phRange?.[0] ?? 6.0;
  const maxPh = crop.phRange?.[1] ?? 7.0;
  const reqN = crop.npk?.n ?? 30;
  const reqP = crop.npk?.p ?? 20;
  const reqK = crop.npk?.k ?? 20;
  const reqOm = crop.organicMatterMin ?? 2.0;
  const cropName = crop.name || "Crop";

  if (values.ph < minPh) {
    concerns.push(`pH is below ${cropName}'s preferred range of ${minPh}-${maxPh}`);
    actions.push("Correct soil acidity before planting so nutrient uptake is not restricted.");
  } else if (values.ph > maxPh) {
    concerns.push(`pH is above ${cropName}'s preferred range of ${minPh}-${maxPh}`);
    actions.push("Use soil-acidifying nutrition and added organic matter before establishment.");
  }

  if (values.nitrogen < reqN) {
    concerns.push("nitrogen is lower than this crop ideally needs");
    actions.push(`Raise nitrogen closer to ${reqN} using split applications around early growth.`);
  }

  if (values.phosphorus < reqP) {
    concerns.push("phosphorus is slightly limiting");
    actions.push(`Boost phosphorus toward ${reqP} for stronger rooting and early vigor.`);
  }

  if (values.potassium < reqK) {
    concerns.push("potassium is below the preferred level");
    actions.push(`Increase potassium toward ${reqK} to support water balance and crop strength.`);
  }

  if (values.organicMatter < reqOm) {
    concerns.push("organic matter is under the crop's preferred threshold");
    actions.push("Build organic matter with compost and crop residues before the next planting cycle.");
  }

  const cropSoilTypes = Array.isArray(crop.soilTypes) ? crop.soilTypes : [];
  if (selectedFarm && !cropSoilTypes.includes(selectedFarm.landType || selectedFarm.soilType || "Loamy")) {
    actions.push(`Monitor this plot carefully because ${cropName} performs best on ${cropSoilTypes.join(" or ") || "suitable"} soils.`);
  }

  const farmName = selectedFarm?.name || "the active plot";
  const summary =
    crop.match >= 85
      ? `${cropName} is a strong fit for ${farmName} because the current soil profile already supports most of its nutrient and pH requirements during the ${analysis?.climateContext?.seasonLabel?.toLowerCase() || "current"} window.`
      : crop.match >= 70
        ? `${cropName} can perform well on ${farmName}, but a few nutrient and soil-balance adjustments should be made before planting in the current ${analysis?.climateContext?.seasonLabel?.toLowerCase() || "seasonal"} conditions.`
        : `${cropName} is still possible on ${farmName}, but the soil needs clear correction steps before this crop becomes a safe choice.`;

  return {
    summary,
    concerns,
    actions: actions.length
      ? actions
      : ["Maintain current soil fertility and continue monitoring moisture, pH, and nutrient balance during the season."],
  };
}

function createDefaultFarm() {
  return {
    id: "soil-default-farm",
    name: "Primary Demonstration Farm",
    region: "Northern Highlands",
    primaryCrop: "Maize",
    landType: "Loamy",
    sizeHectares: 12,
    location: { mapX: 52, mapY: 46, label: "Default soil-testing sector" },
    history: [],
  };
}

function mapSoilRecordToForm(soilTest) {
  if (!soilTest) return null;

  return {
    ph: String(soilTest.ph ?? "6.5"),
    nitrogen: String(soilTest.nitrogen ?? "38"),
    phosphorus: String(soilTest.phosphorus ?? "21"),
    potassium: String(soilTest.potassium ?? "17"),
    organicMatter: String(soilTest.organicMatter ?? "2.7"),
    texture: soilTest.texture || "Loamy",
    moisture: String(soilTest.moisture ?? "35"),
    cec: String(soilTest.cec ?? "12"),
  };
}

function buildBackendSoilPayload(form, selectedFarm, labFileName) {
  return {
    farmId: selectedFarm.id,
    sourceType: labFileName ? "uploaded" : "manual",
    ph: Number(form.ph || 0),
    nitrogen: Number(form.nitrogen || 0),
    phosphorus: Number(form.phosphorus || 0),
    potassium: Number(form.potassium || 0),
    organicMatter: Number(form.organicMatter || 0),
    moisture: Number(form.moisture || 0),
    cec: Number(form.cec || 0),
    texture: form.texture,
    notes: `Frontend soil analysis submitted for ${selectedFarm.name}.`,
    ...(labFileName
      ? {
          labReport: {
            fileName: labFileName,
            fileType: "application/octet-stream",
            storageMode: "demo-local",
          },
        }
      : {}),
  };
}

function areSoilFormsEqual(left, right) {
  if (!left || !right) return false;

  return (
    String(left.ph ?? "") === String(right.ph ?? "") &&
    String(left.nitrogen ?? "") === String(right.nitrogen ?? "") &&
    String(left.phosphorus ?? "") === String(right.phosphorus ?? "") &&
    String(left.potassium ?? "") === String(right.potassium ?? "") &&
    String(left.organicMatter ?? "") === String(right.organicMatter ?? "") &&
    String(left.texture ?? "") === String(right.texture ?? "")
  );
}

function formatSoilTimestamp(value) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSoilDate(value) {
  if (!value) return "Not available";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SOIL_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual Entry", icon: "TestTubeDiagonal" },
  { value: "upload", label: "Upload Lab Report", icon: "Upload" },
  { value: "history", label: "Saved Farm Soil History", icon: "FileClock" },
  { value: "district", label: "Local District Estimate", icon: "MapPinned" },
  { value: "online", label: "Online Soil Estimate", icon: "Cloud" },
];

function getSoilSourceLabel(sourceType) {
  const opt = SOIL_SOURCE_OPTIONS.find((o) => o.value === sourceType);
  if (opt) return opt.label;
  switch (sourceType) {
    case "uploaded":
      return "Uploaded Lab Data";
    case "estimated":
      return "Online Soil Estimate";
    case "backend":
      return "Backend Soil Test";
    default:
      return "Local Soil Data";
  }
}

function getHealthLabelFromScore(score) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  return "Low";
}

function mapBackendSuitabilityToCropCard(result) {
  if (!result) return null;

  const cropMeta = cropLibrary.find((crop) => crop.name === result.cropName);

  return {
    ...(cropMeta || {}),
    name: result.cropName,
    match: Number(result.suitabilityScore || 0),
    note: result.recommendationSummary || "Backend suitability result is available for this crop.",
    rotationTag: cropMeta?.rotationTag || result.suitabilityBand || "Backend advisory",
    cycle: cropMeta?.cycle || "Backend analysis",
    limitingFactors: Array.isArray(result.limitingFactors) ? result.limitingFactors : [],
  };
}

function mapBackendFertilizerToRows(recommendation) {
  if (!recommendation) return [];

  const buildState = (value) => (value <= 0 ? "Sufficient" : value <= 24 ? "Moderate" : "Deficient");
  const buildTone = (value) => (value <= 0 ? "green" : value <= 24 ? "amber" : "red");

  return [
    {
      nutrient: "Nitrogen (N)",
      state: buildState(recommendation.nitrogenKgHa),
      fertilizer: recommendation.recommendedBlend || "Backend nutrient blend",
      dosage: recommendation.nitrogenKgHa,
      tone: buildTone(recommendation.nitrogenKgHa),
      weatherAdjustment:
        recommendation.applicationTiming || recommendation.recommendationSummary || "Backend fertilizer guidance available.",
    },
    {
      nutrient: "Phosphorus (P)",
      state: buildState(recommendation.phosphorusKgHa),
      fertilizer: recommendation.recommendedBlend || "Backend nutrient blend",
      dosage: recommendation.phosphorusKgHa,
      tone: buildTone(recommendation.phosphorusKgHa),
      weatherAdjustment:
        recommendation.budgetNote || recommendation.recommendationSummary || "Backend fertilizer guidance available.",
    },
    {
      nutrient: "Potassium (K)",
      state: buildState(recommendation.potassiumKgHa),
      fertilizer: recommendation.recommendedBlend || "Backend nutrient blend",
      dosage: recommendation.potassiumKgHa,
      tone: buildTone(recommendation.potassiumKgHa),
      weatherAdjustment:
        recommendation.recommendationSummary || recommendation.applicationTiming || "Backend fertilizer guidance available.",
    },
  ];
}

function buildLocalSoilHistoryEntry(selectedFarm, analysis, submittedForm, sourceMode, sourceStatus, labFileName) {
  return {
    id: `local-${selectedFarm.id}`,
    farmId: selectedFarm.id,
    sourceType: sourceMode || "manual",
    analysisStatus: "Local Analysis",
    ph: Number(submittedForm.ph || 0),
    nitrogen: Number(submittedForm.nitrogen || 0),
    phosphorus: Number(submittedForm.phosphorus || 0),
    potassium: Number(submittedForm.potassium || 0),
    organicMatter: Number(submittedForm.organicMatter || 0),
    texture: submittedForm.texture,
    notes: sourceStatus,
    healthScore: analysis.healthScore,
    healthLabel: analysis.healthLabel,
    suitabilityResults: analysis.suitableCrops.map((crop) => ({
      cropName: crop.name,
      suitabilityScore: crop.match,
      suitabilityBand: crop.match >= 85 ? "Best Fit" : crop.match >= 70 ? "Good Fit" : "Needs Adjustment",
      recommendationSummary: crop.note,
      limitingFactors: [],
    })),
    fertilizerRecommendation: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    labReport: labFileName
      ? {
          fileName: labFileName,
          fileType: "application/octet-stream",
          storageMode: "local-demo",
        }
      : null,
  };
}

function getHistoryTopCrop(record) {
  if (!record) return "No ranking";

  const first = Array.isArray(record.suitabilityResults) ? record.suitabilityResults[0] : null;
  return first?.cropName || first?.name || "No ranking";
}

function calculateSoilAnalysis(form, selectedFarm, climateContext, soilSourceMode) {
  const values = {
    ph: Number(form.ph || 0),
    nitrogen: Number(form.nitrogen || 0),
    phosphorus: Number(form.phosphorus || 0),
    potassium: Number(form.potassium || 0),
    organicMatter: Number(form.organicMatter || 0),
    moisture: Number(form.moisture || 0),
    cec: Number(form.cec || 0),
  };

  const phScore = 100 - Math.min(Math.abs(values.ph - 6.5) * 18, 42);
  const nScore = clamp((values.nitrogen / 55) * 100, 0, 100);
  const pScore = clamp((values.phosphorus / 30) * 100, 0, 100);
  const kScore = clamp((values.potassium / 35) * 100, 0, 100);
  const omScore = clamp((values.organicMatter / 4.2) * 100, 0, 100);
  const textureBonus =
    form.texture === "Loamy" ? 10 : form.texture === "Sandy Loam" ? 6 : form.texture === "Clay Loam" ? 4 : 3;

  const healthScore = Math.round(clamp(average([phScore, nScore, pScore, kScore, omScore]) + textureBonus, 18, 96));
  const degradationAlerts = [];

  if (values.organicMatter < 2) {
    degradationAlerts.push("Organic matter is low. Soil structure may degrade under repeated tillage.");
  }
  if (values.ph < 5.7 || values.ph > 7.5) {
    degradationAlerts.push("Soil pH is outside the recommended band for most field crops.");
  }
  if (values.potassium < 18) {
    degradationAlerts.push("Low potassium can increase drought sensitivity and poor stem strength.");
  }

  if (climateContext?.maxRainProbability >= 70 && values.nitrogen < 32) {
    degradationAlerts.push(
      `High rain probability during the ${climateContext.cropStage} could increase nitrogen loss. Use split applications and avoid a single heavy dose.`
    );
  }

  if (climateContext?.et0 >= 5.2 && values.potassium < 20) {
    degradationAlerts.push(
      `High evapotranspiration with low potassium may stress ${selectedFarm.primaryCrop || "the current crop"} during the ${climateContext.cropStage}.`
    );
  }

  if (climateContext?.weeklyRain <= 8 && values.organicMatter < 2.5) {
    degradationAlerts.push(
      `Low recent rainfall plus low organic matter increases moisture loss risk. Mulching and residue cover are strongly recommended.`
    );
  }

  const suitableCrops = cropLibrary
    .map((crop) => {
      const soilTypeBonus = crop.soilTypes.includes(form.texture) ? 18 : 0;
      const regionBonus = crop.region === selectedFarm.region ? 14 : 0;
      const seasonBonus = getSeasonCompatibilityBonus(crop, climateContext?.seasonLabel || "Warm Season");
      const weatherBonus = getWeatherFitScore(crop, climateContext);
      const phFit = values.ph >= crop.phRange[0] && values.ph <= crop.phRange[1] ? 24 : 10;
      const npkFit =
        average([
          clamp(100 - Math.abs(values.nitrogen - crop.npk.n) * 1.6, 20, 100),
          clamp(100 - Math.abs(values.phosphorus - crop.npk.p) * 2.1, 20, 100),
          clamp(100 - Math.abs(values.potassium - crop.npk.k) * 1.9, 20, 100),
        ]) * 0.34;
      const organicMatterFit = values.organicMatter >= crop.organicMatterMin ? 18 : 8;
      const totalScore = Math.round(
        clamp(soilTypeBonus + regionBonus + seasonBonus + weatherBonus + phFit + npkFit + organicMatterFit, 35, 98)
      );

      return {
        ...crop,
        match: totalScore,
        note:
          totalScore >= 85
            ? `Strong fit for ${selectedFarm.region} under current soil, season, and weather conditions.`
            : totalScore >= 70
              ? "Usable with moderate nutrient adjustment, weather monitoring, and timing discipline."
              : "Possible crop option, but nutrient balancing and seasonal timing are needed before planting.",
      };
    })
    .sort((a, b) => b.match - a.match);

  const nitrogenWeatherFactor =
    climateContext?.maxRainProbability >= 65 ? 1.08 : climateContext?.weeklyRain <= 8 ? 0.94 : 1;
  const phosphorusWeatherFactor =
    climateContext?.maxRainProbability >= 70 ? 1.05 : 1;
  const potassiumWeatherFactor =
    climateContext?.et0 >= 5.2 ? 1.1 : 1;

  const fertilizerRows = [
    {
      nutrient: "Nitrogen (N)",
      state: scoreState(values.nitrogen, 42, 24),
      fertilizer:
        values.nitrogen >= 42 ? "No additional N needed" : values.nitrogen >= 24 ? "Urea top-dress" : "Urea + compost manure",
      dosage: Math.max(0, Number((clamp((42 - values.nitrogen) * 1.35 * nitrogenWeatherFactor, 0, 68)).toFixed(1))),
      tone: values.nitrogen >= 42 ? "green" : values.nitrogen >= 24 ? "amber" : "red",
      weatherAdjustment:
        climateContext?.maxRainProbability >= 65
          ? "Rainfall risk is high, so split nitrogen into smaller applications."
          : climateContext?.weeklyRain <= 8
            ? "Dry conditions favor precise smaller doses with irrigation support."
            : "Apply on schedule and monitor crop color during early growth.",
    },
    {
      nutrient: "Phosphorus (P)",
      state: scoreState(values.phosphorus, 24, 16),
      fertilizer:
        values.phosphorus >= 24
          ? "Maintenance phosphorus only"
          : values.phosphorus >= 16
            ? "Diammonium Phosphate (DAP)"
            : "Triple Super Phosphate (TSP)",
      dosage: Math.max(0, Number((clamp((24 - values.phosphorus) * 1.25 * phosphorusWeatherFactor, 0, 52)).toFixed(1))),
      tone: values.phosphorus >= 24 ? "green" : values.phosphorus >= 16 ? "amber" : "red",
      weatherAdjustment:
        climateContext?.maxRainProbability >= 70
          ? "Place phosphorus close to the root zone before heavy rain to reduce losses."
          : "Focus phosphorus at planting to improve rooting and crop establishment.",
    },
    {
      nutrient: "Potassium (K)",
      state: scoreState(values.potassium, 22, 16),
      fertilizer:
        values.potassium >= 22
          ? "Balanced K maintenance"
          : values.potassium >= 16
            ? "Muriate of Potash (MOP)"
            : "Sulphate of Potash + organic mulch",
      dosage: Math.max(0, Number((clamp((22 - values.potassium) * 1.9 * potassiumWeatherFactor, 0, 60)).toFixed(1))),
      tone: values.potassium >= 22 ? "green" : values.potassium >= 16 ? "amber" : "red",
      weatherAdjustment:
        climateContext?.et0 >= 5.2
          ? "High evapotranspiration makes potassium more important for stress tolerance."
          : "Maintain potassium before peak demand to support crop water balance.",
    },
    {
      nutrient: "Organic Matter",
      state: values.organicMatter >= 3 ? "Optimal" : values.organicMatter >= 2 ? "Moderate" : "Low",
      fertilizer:
        values.organicMatter >= 3
          ? "Residue retention only"
          : values.organicMatter >= 2
            ? "Compost mulch"
            : "Compost + cover crop residues",
      dosage: Math.max(0, Number((clamp((3 - values.organicMatter) * 70, 0, 180)).toFixed(1))),
      tone: values.organicMatter >= 3 ? "green" : values.organicMatter >= 2 ? "amber" : "red",
      weatherAdjustment:
        climateContext?.weeklyRain <= 10
          ? "Low rainfall makes organic matter especially valuable for moisture retention."
          : "Organic matter will improve structure and nutrient buffering through the season.",
    },
  ];

  const recommendationPanel = {
    primary: suitableCrops[0],
    secondary: suitableCrops[1],
    recommendation:
      suitableCrops[0]?.match >= 85
        ? `Prioritize ${suitableCrops[0]?.name || "crop"} on ${selectedFarm?.name || "farm"} and rotate with ${suitableCrops[1]?.name || "legumes"} next season.`
        : `Apply nutrient corrections before planting. ${suitableCrops[0]?.name || "crop"} is currently the strongest fit after soil balancing.`,
  };

  const cropRotationPlan = [
    `${selectedFarm?.primaryCrop || suitableCrops[0]?.name || "crop"} -> ${suitableCrops[1]?.name || "Soybean"} -> Cover crop`,
    values.organicMatter < 2.5
      ? "Include legumes or cover crops next cycle to rebuild soil organic matter."
      : "Maintain residue return to preserve current soil structure.",
    climateContext
      ? `Current planning window: ${climateContext.seasonLabel}. Stage signal for ${selectedFarm.primaryCrop || "the active field"} is ${climateContext.cropStage}.`
      : "Weather-linked planning will become more precise once live climate data is available.",
  ];

  return {
    values,
    healthScore,
    healthLabel: healthScore >= 80 ? "Excellent" : healthScore >= 65 ? "Good" : healthScore >= 50 ? "Moderate" : "Low",
    scoreInsights: createSoilImprovementInsights(values, form, healthScore),
    suitableCrops,
    fertilizerRows,
    degradationAlerts,
    recommendationPanel,
    cropRotationPlan,
    climateContext,
    soilSourceMode,
  };
}

const DISTRICT_SOIL_ESTIMATES = {
  default: { ph: 6.2, nitrogen: 30, phosphorus: 18, potassium: 15, organicMatter: 2.5, texture: "Loamy", moisture: 30, cec: 10 },
  "Northern Province": { ph: 5.8, nitrogen: 35, phosphorus: 20, potassium: 18, organicMatter: 3.0, texture: "Clay Loam", moisture: 35, cec: 14 },
  "Southern Province": { ph: 6.0, nitrogen: 28, phosphorus: 16, potassium: 14, organicMatter: 2.2, texture: "Sandy Loam", moisture: 28, cec: 8 },
  "Eastern Province": { ph: 6.5, nitrogen: 25, phosphorus: 15, potassium: 12, organicMatter: 1.8, texture: "Sandy Loam", moisture: 25, cec: 7 },
  "Western Province": { ph: 5.5, nitrogen: 32, phosphorus: 22, potassium: 20, organicMatter: 3.5, texture: "Loamy", moisture: 40, cec: 15 },
  "Kigali City": { ph: 6.3, nitrogen: 33, phosphorus: 19, potassium: 16, organicMatter: 2.8, texture: "Loamy", moisture: 32, cec: 11 },
  Kigali: { ph: 6.3, nitrogen: 33, phosphorus: 19, potassium: 16, organicMatter: 2.8, texture: "Loamy", moisture: 32, cec: 11 },
};

function getDistrictEstimate(region) {
  if (!region) return DISTRICT_SOIL_ESTIMATES.default;
  const lower = region.toLowerCase();
  for (const [key, data] of Object.entries(DISTRICT_SOIL_ESTIMATES)) {
    if (lower.includes(key.toLowerCase())) return data;
  }
  return DISTRICT_SOIL_ESTIMATES.default;
}

export function SoilCropPage() {
  const { currentFarms } = useFarmerData();
  const fallbackFarm = useMemo(() => createDefaultFarm(), []);
  const farms = currentFarms?.length ? currentFarms : [fallbackFarm];
  const backendMode = isBackendSessionActive();
  const [selectedFarmId, setSelectedFarmId] = useState(farms?.[0]?.id || "soil-default-farm");
  const [libraryFilters, setLibraryFilters] = useState({
    search: "",
    season: "All",
    region: "All",
    soilType: "All",
  });
  const [labFileName, setLabFileName] = useState("");
  const [labFileData, setLabFileData] = useState(null);
  const [soilEstimate, setSoilEstimate] = useState(null);
  const [weatherContext, setWeatherContext] = useState(null);
  const [sourceStatus, setSourceStatus] = useState("Using manually provided or local soil information. Online soil estimation is optional.");
  const [soilSource, setSoilSource] = useState("manual");
  const [sourceMode, setSourceMode] = useState("manual");
  const [formDirty, setFormDirty] = useState(false);
  const [externalWarning, setExternalWarning] = useState("");
  const [backendSoilHistory, setBackendSoilHistory] = useState([]);
  const [backendLatestSoilTest, setBackendLatestSoilTest] = useState(null);
  const [backendSoilMode, setBackendSoilMode] = useState("local");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [form, setForm] = useState({
    ph: "6.5",
    nitrogen: "38",
    phosphorus: "21",
    potassium: "17",
    organicMatter: "2.7",
    texture: "Loamy",
    moisture: "35",
    cec: "12",
  });
  const [submittedForm, setSubmittedForm] = useState(form);
  const [selectedRecommendationName, setSelectedRecommendationName] = useState("");

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms?.[0]?.id || "soil-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms?.[0] || null,
    [farms, selectedFarmId]
  );
  const selectedFarmCoordinates = `${selectedFarm?.location?.lat || 0}:${selectedFarm?.location?.lng || 0}`;
  const selectedFarmRegion = selectedFarm?.region || "";
  const selectedFarmName = selectedFarm?.name || "";
  const selectedFarmPrimaryCrop = selectedFarm?.primaryCrop || "";

  useEffect(() => {
    let active = true;

    async function loadBackendSoilState() {
      if (!backendMode || !selectedFarm?.id || selectedFarm.id === "soil-default-farm") {
        if (active) {
          setBackendSoilHistory([]);
          setBackendLatestSoilTest(null);
          setBackendSoilMode("local");
        }
        return;
      }

      try {
        const [historyRows, suitabilityPayload] = await Promise.all([
          phase1BackendService.soil.listByFarm(selectedFarm.id),
          phase1BackendService.soil.getSuitabilityByFarm(selectedFarm.id),
        ]);

        if (!active) return;

        const historyRowsSafe = Array.isArray(historyRows) ? historyRows : [];
        const latestSoilTest = suitabilityPayload?.latestSoilTest || historyRowsSafe?.[0] || null;
        setBackendSoilHistory(historyRowsSafe);
        setBackendLatestSoilTest(latestSoilTest);
        setBackendSoilMode(latestSoilTest ? "backend" : "local");

        if (!formDirty && !labFileName && latestSoilTest) {
          const hydratedForm = mapSoilRecordToForm(latestSoilTest);
          if (hydratedForm && !areSoilFormsEqual(form, hydratedForm)) {
            setForm(hydratedForm);
          }
          if (hydratedForm && !areSoilFormsEqual(submittedForm, hydratedForm)) {
            setSubmittedForm(hydratedForm);
            setSourceMode(latestSoilTest.sourceType || "manual");
            setSourceStatus("Using backend soil test data with live weather context.");
          }
        }
      } catch {
        if (!active) return;
        setBackendSoilHistory([]);
        setBackendLatestSoilTest(null);
        setBackendSoilMode("local");
      }
    }

    loadBackendSoilState();

    return () => {
      active = false;
    };
  }, [backendMode, form, formDirty, labFileName, selectedFarm?.id, submittedForm]);

  useEffect(() => {
    if (soilSource === "history" && backendLatestSoilTest) {
      const hydratedForm = mapSoilRecordToForm(backendLatestSoilTest);
      if (hydratedForm && !areSoilFormsEqual(form, hydratedForm)) {
        setForm(hydratedForm);
        setSubmittedForm(hydratedForm);
      }
      setSourceMode("manual");
      setSourceStatus("Using saved farm soil history data.");
      return;
    }

    if (soilSource === "district") {
      const districtEstimate = getDistrictEstimate(selectedFarm?.region || "");
      if (districtEstimate && !formDirty) {
        const estimatedForm = {
          ph: String(districtEstimate.ph),
          nitrogen: String(districtEstimate.nitrogen),
          phosphorus: String(districtEstimate.phosphorus),
          potassium: String(districtEstimate.potassium),
          organicMatter: String(districtEstimate.organicMatter),
          texture: districtEstimate.texture,
          moisture: String(districtEstimate.moisture ?? form.moisture),
          cec: String(districtEstimate.cec ?? form.cec),
        };
        if (!areSoilFormsEqual(form, estimatedForm)) setForm(estimatedForm);
        if (!areSoilFormsEqual(submittedForm, estimatedForm)) setSubmittedForm(estimatedForm);
      }
      setSourceMode("manual");
      setSourceStatus("Using local district estimate for soil parameters.");
      return;
    }

    if (soilSource !== "online") {
      setSourceMode(labFileName ? "uploaded" : "manual");
      setSourceStatus(
        labFileName
          ? "Using uploaded lab data."
          : "Using manually provided or local soil information. Online soil estimation is optional."
      );
      return;
    }

    let active = true;

    async function loadEnvironmentalInputs() {
      const lat = selectedFarm?.location?.lat;
      const lng = selectedFarm?.location?.lng;

      if (!lat || !lng) {
        if (active) {
          setSourceStatus("Manual or uploaded soil data can be used. Online soil estimation requires farm coordinates and is currently unavailable.");
        }
        return;
      }

      try {
        setExternalWarning("");
        const [soilResult, weatherResult] = await Promise.allSettled([
          apiClient.soil.estimate(lat, lng),
          apiClient.weather.forecast(lat, lng),
        ]);

        if (!active) return;

        const soilLoaded = soilResult.status === "fulfilled";
        const weatherLoaded = weatherResult.status === "fulfilled";

        const estimate = soilLoaded ? parseSoilGridsEstimate(soilResult.value) : null;
        const climate = weatherLoaded ? buildClimateContext(weatherResult.value, selectedFarm) : null;

        setSoilEstimate(estimate);
        setWeatherContext(climate);

        if (!formDirty && estimate && backendSoilMode !== "backend") {
          const estimatedForm = {
            ph: String(estimate.ph),
            nitrogen: String(estimate.nitrogen),
            phosphorus: String(estimate.phosphorus),
            potassium: String(estimate.potassium),
            organicMatter: String(estimate.organicMatter),
            texture: estimate.texture,
            moisture: String(estimate.moisture ?? form.moisture),
            cec: String(estimate.cec ?? form.cec),
          };

          if (!areSoilFormsEqual(form, estimatedForm)) setForm(estimatedForm);
          if (!areSoilFormsEqual(submittedForm, estimatedForm)) setSubmittedForm(estimatedForm);
          setSourceMode("estimated");
        }

        if (soilLoaded && weatherLoaded) {
          setSourceStatus("Using online soil estimation with live weather context.");
        } else if (soilLoaded) {
          setSourceStatus("Using online soil estimation. Live weather context is temporarily unavailable.");
        } else if (weatherLoaded) {
          setSourceStatus("Manual or uploaded soil data can be used. Online soil estimation is optional and currently unavailable.");
        } else {
          setSourceStatus("Manual or uploaded soil data can be used. Online soil estimation is optional and currently unavailable.");
        }
      } catch {
        if (!active) return;
        setSourceStatus("Manual or uploaded soil data can be used. Online soil estimation is optional and currently unavailable.");
      }
    }

    loadEnvironmentalInputs();

    return () => {
      active = false;
    };
  }, [
    soilSource,
    backendLatestSoilTest?.id,
    backendSoilMode,
    form,
    formDirty,
    labFileName,
    selectedFarm?.id,
    selectedFarmCoordinates,
    selectedFarmName,
    selectedFarmPrimaryCrop,
    submittedForm,
  ]);

  useEffect(() => {
    if (labFileName) {
      setSourceMode("uploaded");
      setSourceStatus("Using uploaded lab data. Estimated location data is only supporting the map and context.");
    } else if (sourceMode === "uploaded") {
      setSourceMode(formDirty ? "manual" : backendSoilMode === "backend" ? "manual" : soilEstimate ? "estimated" : "manual");
      setSourceStatus(
        backendSoilMode === "backend" && !formDirty
          ? "Using backend soil test data with live weather context."
          : soilEstimate && !formDirty
          ? "Using estimated soil data from location (SoilGrids fallback) with live weather context."
          : "Using manual soil test data."
      );
    }
  }, [backendSoilMode, formDirty, labFileName, soilEstimate, sourceMode]);

  const analysis = useMemo(
    () => calculateSoilAnalysis(submittedForm, selectedFarm, weatherContext, sourceMode),
    [selectedFarm, submittedForm, weatherContext, sourceMode]
  );

  const effectiveSuitableCrops = useMemo(() => {
    if (backendLatestSoilTest?.suitabilityResults?.length) {
      const backendCards = backendLatestSoilTest.suitabilityResults.map(mapBackendSuitabilityToCropCard).filter(Boolean);
      if (backendCards.length) return backendCards;
    }

    return analysis.suitableCrops;
  }, [analysis.suitableCrops, backendLatestSoilTest]);

  const effectiveFertilizerRows = useMemo(() => {
    const backendRows = mapBackendFertilizerToRows(backendLatestSoilTest?.fertilizerRecommendation);
    return backendRows.length ? backendRows : analysis.fertilizerRows;
  }, [analysis.fertilizerRows, backendLatestSoilTest]);

  const effectiveHealthScore =
    backendLatestSoilTest?.healthScore && backendSoilMode === "backend"
      ? backendLatestSoilTest.healthScore
      : analysis.healthScore;
  const effectiveHealthLabel =
    backendLatestSoilTest?.healthLabel && backendSoilMode === "backend"
      ? backendLatestSoilTest.healthLabel
      : analysis.healthLabel;

  useEffect(() => {
    setSelectedRecommendationName((current) =>
      effectiveSuitableCrops?.some((crop) => crop.name === current)
        ? current
        : effectiveSuitableCrops?.[0]?.name || ""
    );
  }, [effectiveSuitableCrops]);

  const selectedRecommendation = useMemo(
    () => effectiveSuitableCrops.find((crop) => crop.name === selectedRecommendationName) || effectiveSuitableCrops?.[0] || null,
    [effectiveSuitableCrops, selectedRecommendationName]
  );

  const selectedRecommendationDetails = useMemo(
    () => buildRecommendationDescription(selectedRecommendation, analysis, selectedFarm),
    [analysis, selectedFarm, selectedRecommendation]
  );

  const cropLibraryView = useMemo(() => {
    return cropLibrary.filter((crop) => {
      const matchesSearch =
        !libraryFilters.search ||
        crop.name.toLowerCase().includes(libraryFilters.search.toLowerCase()) ||
        crop.rotationTag.toLowerCase().includes(libraryFilters.search.toLowerCase());
      const matchesSeason = libraryFilters.season === "All" || crop.season === libraryFilters.season;
      const matchesRegion = libraryFilters.region === "All" || crop.region === libraryFilters.region;
      const matchesSoilType =
        libraryFilters.soilType === "All" || crop.soilTypes.includes(libraryFilters.soilType);

      return matchesSearch && matchesSeason && matchesRegion && matchesSoilType;
    });
  }, [libraryFilters]);

  const suitabilityMatrix = useMemo(() => {
    return cropLibraryView.slice(0, 6).map((crop) => ({
      name: crop.name,
      compatibility:
        effectiveSuitableCrops.find((item) => item.name === crop.name)?.match ||
        0,
    }));
  }, [cropLibraryView, effectiveSuitableCrops]);

  const historyRecords = useMemo(() => {
    if (backendSoilHistory.length > 0) return backendSoilHistory;
    return [buildLocalSoilHistoryEntry(selectedFarm, analysis, submittedForm, sourceMode, sourceStatus, labFileName)];
  }, [analysis, backendSoilHistory, labFileName, selectedFarm, sourceMode, sourceStatus, submittedForm]);

  const currentLabMetadata = useMemo(() => {
    if (backendLatestSoilTest?.labReport) {
      return {
        ...backendLatestSoilTest.labReport,
        sourceLabel: getSoilSourceLabel(backendLatestSoilTest.sourceType || "backend"),
        analysisStatus: backendLatestSoilTest.analysisStatus || "Analyzed",
        capturedAt: backendLatestSoilTest.analyzedAt || backendLatestSoilTest.updatedAt || backendLatestSoilTest.createdAt,
      };
    }

    if (labFileName) {
      return {
        fileName: labFileName,
        fileType: "application/octet-stream",
        storageMode: "local-demo",
        sourceLabel: "Uploaded Lab Data",
        analysisStatus: labFileData?.status === "confirmed" ? "Confirmed" : "Awaiting manual confirmation",
        capturedAt: labFileData?.date || new Date().toISOString(),
      };
    }

    return {
      fileName: "No uploaded file",
      fileType: backendSoilMode === "backend" ? "Database record" : "Local fallback",
      storageMode: backendSoilMode === "backend" ? "backend" : "frontend-demo",
      sourceLabel: getSoilSourceLabel(backendSoilMode === "backend" ? "backend" : soilSource),
      analysisStatus: backendLatestSoilTest?.analysisStatus || "Ready",
      capturedAt: backendLatestSoilTest?.updatedAt || backendLatestSoilTest?.createdAt || null,
    };
  }, [backendLatestSoilTest, backendSoilMode, labFileName, labFileData, sourceMode]);

  const handleHistorySelect = (record) => {
    const hydratedForm = mapSoilRecordToForm(record);
    if (!hydratedForm) return;

    setForm(hydratedForm);
    setSubmittedForm(hydratedForm);
    setFormDirty(false);
    setLabFileName(record?.labReport?.fileName || "");
    setSoilSource(record?.labReport?.fileName ? "upload" : "history");
    setSourceMode(record?.sourceType || "manual");
    setSourceStatus(
      record?.sourceType === "uploaded"
        ? "Using uploaded lab data from record history with live weather context."
        : record?.id?.startsWith?.("local-")
        ? "Using local soil history entry."
        : "Using backend soil test data from record history with live weather context."
    );

    if (!record?.id?.startsWith?.("local-")) {
      setBackendLatestSoilTest(record);
      setBackendSoilMode("backend");
    }

    setIsHistoryOpen(false);
  };

  const handleAnalyze = async () => {
    const src = labFileName ? "uploaded" : soilSource === "online" ? "estimated" : "manual";
    setSourceMode(src);
    setSourceStatus(
      labFileName
        ? "Using uploaded lab data."
        : soilSource === "online"
        ? "Using online soil estimation."
        : "Using manually provided or local soil information."
    );
    setSubmittedForm(form);

    if (!backendMode || !selectedFarm?.id || selectedFarm.id === "soil-default-farm") {
      return;
    }

    try {
      const payload = buildBackendSoilPayload(form, selectedFarm, labFileName);
      const savedRecord = backendLatestSoilTest?.id
        ? await phase1BackendService.soil.update(backendLatestSoilTest.id, payload)
        : await phase1BackendService.soil.create(payload);

      const analyzed = await phase1BackendService.soil.analyze(savedRecord.id);
      const historyRows = await phase1BackendService.soil.listByFarm(selectedFarm.id);

      setBackendSoilHistory(historyRows);
      setBackendLatestSoilTest(analyzed.soilTest || savedRecord);
      setBackendSoilMode("backend");
      setSourceStatus(
        labFileName
          ? "Using uploaded lab data with backend soil persistence and live weather context."
          : "Using backend soil test data with live weather context."
      );
    } catch {
      setBackendSoilMode("local");
    }
  };

  const exportAnalysis = () => {
    downloadTextFile(
      `${selectedFarm.name.toLowerCase().replace(/\s+/g, "-")}-soil-analysis.txt`,
      `Soil & Crop Analysis\nFarm: ${selectedFarm.name}\nSource: ${getSoilSourceLabel(soilSource)}\nData Source: ${sourceStatus}\nHealth Score: ${analysis.healthScore} (${analysis.healthLabel})\nSelected Recommendation: ${selectedRecommendation?.name || "N/A"}\n\nDegradation Alerts:\n- ${analysis.degradationAlerts.join("\n- ") || "None"}`
    );
  };

  const exportHistory = () => {
    downloadJsonFile("soil-analysis-history.json", {
      farm: selectedFarm,
      sourceStatus,
      backendSoilMode,
      backendLatestSoilTest,
      backendSoilHistory,
      submittedForm,
      analysis,
      selectedRecommendation,
      selectedRecommendationDetails,
    });
  };

  return (
    <PageShell>
      <PageHeader
        title="Soil &amp; Crop Analysis"
        subtitle="Soil nutrient interpretation, crop suitability analysis, fertilizer planning, and field-level crop rotation guidance"
        actions={
          <div className="sc-header-actions">
            <ActionButton variant="secondary" size="sm" onClick={exportAnalysis}>
              <Download size={14} /> <span>Export Report</span>
            </ActionButton>
            <ActionButton variant="primary" size="sm" onClick={() => setIsHistoryOpen(true)}>
              <FileClock size={14} /> <span>Soil History</span>
            </ActionButton>
          </div>
        }
      />

      {soilSource !== "online" && !sourceStatus.includes("Online") && !sourceStatus.includes("estimated") ? (
        <div className="sc-warning" style={{ background: "#f0f9f0", borderLeft: "3px solid var(--primary-green)", color: "var(--text-main)" }}>
          <span>Manual or uploaded soil data can be used. Online soil estimation is optional and currently unavailable.</span>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="sc-toolbar">
        <div className="sc-toolbar-left">
          <div className="sc-toolbar-field">
            <span className="sc-toolbar-label">Active Farm</span>
            <select value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)}>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name} — {f.region}</option>
              ))}
            </select>
          </div>
          <div className="sc-toolbar-field">
            <span className="sc-toolbar-label">Soil Source</span>
            <select value={soilSource} onChange={(e) => { const v = e.target.value; setSoilSource(v); if (v === "upload") { setFormDirty(false); } else if (v !== "online") { setFormDirty(false); } }}>
              {SOIL_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {soilSource === "upload" ? (
            <div className="sc-toolbar-field">
              <span className="sc-toolbar-label">Lab Report</span>
              <div className="sc-upload-inline">
                <Upload size={14} />
                <input type="file" accept=".pdf,.csv,.xlsx,.jpg,.jpeg,.png,.txt" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setLabFileName(file.name); setLabFileData({ name: file.name, date: new Date().toISOString(), status: "awaiting" }); setSoilSource("upload"); } }} />
                <span>{labFileName ? labFileName + (labFileData?.status === "confirmed" ? " (Confirmed)" : " (Awaiting confirmation)") : "Upload lab result"}</span>
              </div>
              {labFileName && labFileData?.status === "awaiting" ? (
                <button type="button" className="sc-confirm-btn" onClick={() => setLabFileData((prev) => prev ? { ...prev, status: "confirmed" } : null)} style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11, background: "var(--primary-green)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  Confirm Values
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="sc-toolbar-right">
          <StatusBadge variant={soilSource === "online" ? "info" : soilSource === "upload" && labFileData?.status === "confirmed" ? "success" : "warning"}>
            {getSoilSourceLabel(soilSource)}
          </StatusBadge>
        </div>
      </div>

      {labFileData && soilSource === "upload" ? (
        <div className="sc-lab-upload-status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#f5faf5", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{labFileData.name}</span>
          <span style={{ color: "var(--text-muted)" }}>Uploaded {new Date(labFileData.date).toLocaleDateString()}</span>
          <StatusBadge variant={labFileData.status === "confirmed" ? "success" : "warning"}>
            {labFileData.status === "confirmed" ? "Confirmed" : "Awaiting manual confirmation"}
          </StatusBadge>
        </div>
      ) : null}

      {/* KPI Row */}
      <div className="sc-kpi-grid">
        <AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap green"><Activity size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Overall Soil Health</span>
              <strong className="sc-kpi-value">{effectiveHealthScore}<small>/100</small></strong>
              <span className="sc-kpi-sub">{effectiveHealthLabel}</span>
            </div>
            <div className="sc-kpi-trend up"><ArrowUp size={14} /></div>
          </div>
        </AppCard>
<AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap blue"><Target size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Suitability Score</span>
              <strong className="sc-kpi-value">{effectiveSuitableCrops?.[0]?.match || 0}<small>%</small></strong>
              <span className="sc-kpi-sub">{effectiveSuitableCrops?.[0]?.name || "—"} best match</span>
            </div>
            <div className="sc-kpi-trend up"><ArrowUp size={14} /></div>
          </div>
        </AppCard>
        <AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap amber"><Sprout size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Recommended Crop</span>
              <strong className="sc-kpi-value">{analysis.recommendationPanel.primary?.name || "—"}</strong>
              <span className="sc-kpi-sub">{analysis.recommendationPanel.primary?.cycle || "—"}</span>
            </div>
          </div>
        </AppCard>
        <AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap purple"><FlaskConical size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Fertilizer Need</span>
              <strong className="sc-kpi-value">{effectiveFertilizerRows.reduce((s, r) => s + r.dosage, 0)}<small>kg</small></strong>
              <span className="sc-kpi-sub">{effectiveFertilizerRows.filter((r) => r.tone !== "green").length} deficient</span>
            </div>
            <div className={`sc-kpi-trend ${effectiveFertilizerRows.some((r) => r.tone === "red") ? "down" : "up"}`}>
              {effectiveFertilizerRows.some((r) => r.tone === "red") ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
            </div>
          </div>
        </AppCard>
        <AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap green"><Droplets size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Organic Matter</span>
              <strong className="sc-kpi-value">{analysis.values?.organicMatter || 0}<small>%</small></strong>
              <span className="sc-kpi-sub">{analysis.values?.organicMatter >= 3 ? "Optimal" : analysis.values?.organicMatter >= 2 ? "Moderate" : "Low"}</span>
            </div>
            <div className={`sc-kpi-trend ${(analysis.values?.organicMatter || 0) >= 2.5 ? "up" : "down"}`}>
              {(analysis.values?.organicMatter || 0) >= 2.5 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </div>
          </div>
        </AppCard>
        <AppCard className="sc-kpi-card">
          <div className="sc-kpi-inner">
            <div className="sc-kpi-icon-wrap blue"><Thermometer size={22} /></div>
            <div className="sc-kpi-info">
              <span className="sc-kpi-label">Soil Moisture</span>
              <strong className="sc-kpi-value">{analysis.climateContext?.soilMoisture != null ? (analysis.climateContext.soilMoisture * 100).toFixed(0) : "—"}<small>%</small></strong>
              <span className="sc-kpi-sub">{analysis.climateContext ? `${analysis.climateContext.seasonLabel}` : "No data"}</span>
            </div>
          </div>
        </AppCard>
      </div>

      {/* Main + Sidebar Layout */}
      <div className="sc-dashboard-layout">
        <div className="sc-main-area">

          {/* Soil Health Panel */}
          <AppCard className="sc-health-panel">
            <div className="sc-health-grid">
              <div className="sc-health-gauge">
                <div className="sc-gauge-ring">
                  <svg viewBox="0 0 120 120" className="sc-gauge-svg">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke={effectiveHealthScore >= 80 ? "var(--primary-green)" : effectiveHealthScore >= 65 ? "#F59E0B" : "#EF4444"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(effectiveHealthScore / 100) * 339.292} 339.292`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 1.2s ease" }} />
                  </svg>
                  <div className="sc-gauge-center">
                    <strong className="sc-gauge-number">{effectiveHealthScore}</strong>
                    <span className={`sc-gauge-label ${effectiveHealthLabel.toLowerCase()}`}>{effectiveHealthLabel}</span>
                  </div>
                </div>
                <p className="sc-gauge-farm">Soil assessment for <strong>{selectedFarm.name}</strong></p>
              </div>
              <div className="sc-health-npk">
                <h4>Nutrient Levels</h4>
                {[
                  { label: "Nitrogen (N)", value: analysis.values?.nitrogen || 0, max: 55, color: "#2E7D32" },
                  { label: "Phosphorus (P)", value: analysis.values?.phosphorus || 0, max: 30, color: "#1565C0" },
                  { label: "Potassium (K)", value: analysis.values?.potassium || 0, max: 35, color: "#E65100" },
                  { label: "Organic Matter", value: (analysis.values?.organicMatter || 0) * 10, max: 50, color: "#4CAF50" },
                ].map((n) => (
                  <div key={n.label} className="sc-npk-row">
                    <span className="sc-npk-label">{n.label}</span>
                    <div className="sc-npk-bar-bg">
                      <div className="sc-npk-bar-fill" style={{ width: `${Math.min((n.value / n.max) * 100, 100)}%`, background: n.color }} />
                    </div>
                    <span className="sc-npk-value">{n.value}{n.label.includes("Matter") ? "%" : "ppm"}</span>
                  </div>
                ))}
              </div>
              <div className="sc-health-ai">
                <h4><Sprout size={14} /> AI Insights</h4>
                <p className="sc-health-summary">{analysis.scoreInsights.summary}</p>
                {analysis.scoreInsights.lacks.length > 0 && (
                  <div className="sc-health-block">
                    <span className="sc-health-block-title">Weaknesses</span>
                    <div className="sc-health-chips">
                      {analysis.scoreInsights.lacks.map((l) => <span key={l} className="sc-chip sc-chip-warn">{l}</span>)}
                    </div>
                  </div>
                )}
                <div className="sc-health-block">
                  <span className="sc-health-block-title">Actions</span>
                  <ul className="sc-health-actions">
                    {analysis.scoreInsights.actions.slice(0, 3).map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
                <div className="sc-health-status">
                  <span className={`sc-status-chip ${effectiveHealthLabel.toLowerCase()}`}>
                    <CheckCircle size={12} /> {effectiveHealthLabel}
                  </span>
                </div>
              </div>
            </div>
          </AppCard>

          {/* Soil Test Form + Lab Report */}
          <div className="sc-test-row">
            <AppCard className="sc-test-form">
              <div className="sc-card-head">
                <TestTubeDiagonal size={16} />
                <h3>Soil Test Input</h3>
              </div>
              <div className="sc-test-groups">
                <div className="sc-test-group">
                  <span className="sc-test-group-label">Physical</span>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">pH Level</span>
                    <input type="number" step="0.1" value={form.ph} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, ph: e.target.value })); }} />
                    <span className="sc-test-unit">pH</span>
                  </div>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Texture</span>
                    <select value={form.texture} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, texture: e.target.value })); }}>
                      {textureOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sc-test-group">
                  <span className="sc-test-group-label">Chemical</span>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Nitrogen (N)</span>
                    <input type="number" value={form.nitrogen} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, nitrogen: e.target.value })); }} />
                    <span className="sc-test-unit">ppm</span>
                  </div>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Phosphorus (P)</span>
                    <input type="number" value={form.phosphorus} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, phosphorus: e.target.value })); }} />
                    <span className="sc-test-unit">ppm</span>
                  </div>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Potassium (K)</span>
                    <input type="number" value={form.potassium} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, potassium: e.target.value })); }} />
                    <span className="sc-test-unit">ppm</span>
                  </div>
                </div>
                <div className="sc-test-group">
                  <span className="sc-test-group-label">Organic</span>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Organic Matter</span>
                    <input type="number" step="0.1" value={form.organicMatter} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, organicMatter: e.target.value })); }} />
                    <span className="sc-test-unit">%</span>
                  </div>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">Moisture</span>
                    <input type="number" step="0.1" value={form.moisture} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, moisture: e.target.value })); }} />
                    <span className="sc-test-unit">%</span>
                  </div>
                  <div className="sc-test-field">
                    <span className="sc-test-field-label">CEC</span>
                    <input type="number" step="0.1" value={form.cec} onChange={(e) => { setFormDirty(true); setSoilSource("manual"); setForm((c) => ({ ...c, cec: e.target.value })); }} />
                    <span className="sc-test-unit">meq/100g</span>
                  </div>
                </div>
              </div>
              <button type="button" className="sc-analyze-btn" onClick={handleAnalyze}>
                <FlaskConical size={16} /> Analyze Soil & Generate Report
              </button>
            </AppCard>

            <AppCard className="sc-lab-card">
              <div className="sc-card-head">
                <FileClock size={16} />
                <h3>Lab Report</h3>
                <StatusBadge variant="info">{currentLabMetadata.sourceLabel}</StatusBadge>
              </div>
              <div className="sc-lab-details">
                <div className="sc-lab-row"><span>Report</span><strong>{currentLabMetadata.fileName}</strong></div>
                <div className="sc-lab-row"><span>Status</span><strong>{currentLabMetadata.analysisStatus}</strong></div>
                <div className="sc-lab-row"><span>Date</span><strong>{formatSoilTimestamp(currentLabMetadata.capturedAt)}</strong></div>
                <div className="sc-lab-row"><span>Storage</span><strong>{currentLabMetadata.storageMode || "Local"}</strong></div>
              </div>
              <div className="sc-health-status" style={{ marginTop: 8 }}>
                <span className={`sc-status-chip ${effectiveHealthLabel.toLowerCase()}`}>
                  <Shield size={12} /> AI Verified
                </span>
              </div>
            </AppCard>
          </div>

          {/* Soil History Timeline */}
          <AppCard className="sc-history-card">
            <div className="sc-card-head">
              <Clock size={16} />
              <h3>Soil History</h3>
              <div className="sc-card-actions">
                <StatusBadge variant="info">{historyRecords.length} records</StatusBadge>
                <button type="button" className="sc-history-link" onClick={() => setIsHistoryOpen(true)}>View All</button>
              </div>
            </div>
            <div className="sc-timeline">
              {historyRecords.slice(0, 4).map((record, i) => (
                <div key={record.id} className="sc-timeline-item">
                  <div className={`sc-timeline-dot ${i === 0 ? "current" : ""}`} />
                  <div className="sc-timeline-content">
                    <div className="sc-timeline-head">
                      <span className="sc-timeline-source">{getSoilSourceLabel(record.sourceType)}</span>
                      <span className="sc-timeline-date">{formatSoilDate(record.updatedAt || record.createdAt)}</span>
                    </div>
                    <div className="sc-timeline-stats">
                      <span>Score <strong>{record.healthScore || 0}</strong></span>
                      <span>Top: <strong>{getHistoryTopCrop(record)}</strong></span>
                    </div>
                    <button type="button" className="sc-timeline-use" onClick={() => handleHistorySelect(record)}>Use Record</button>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          {/* Nutrient Cards */}
          <div className="sc-nutrient-grid">
            {[
              { label: "Nitrogen (N)", value: analysis.values?.nitrogen || 0, unit: "ppm", rec: 42, trend: (analysis.values?.nitrogen || 0) >= 32 ? "up" : "down", icon: BarChart3, color: "#2E7D32" },
              { label: "Phosphorus (P)", value: analysis.values?.phosphorus || 0, unit: "ppm", rec: 24, trend: (analysis.values?.phosphorus || 0) >= 20 ? "up" : "down", icon: BarChart3, color: "#1565C0" },
              { label: "Potassium (K)", value: analysis.values?.potassium || 0, unit: "ppm", rec: 22, trend: (analysis.values?.potassium || 0) >= 20 ? "up" : "down", icon: BarChart3, color: "#E65100" },
              { label: "CEC", value: analysis.values?.meta?.cec || 12, unit: "meq/100g", rec: 15, trend: "stable", icon: Layers, color: "#7B1FA2" },
              { label: "Organic Matter", value: analysis.values?.organicMatter || 0, unit: "%", rec: 3, trend: (analysis.values?.organicMatter || 0) >= 2.5 ? "up" : "down", icon: Droplets, color: "#4CAF50" },
              { label: "Moisture", value: analysis.climateContext?.soilMoisture != null ? (analysis.climateContext.soilMoisture * 100).toFixed(0) : "—", unit: "%", rec: 35, trend: "stable", icon: Thermometer, color: "#0288D1" },
              { label: "Texture", value: form.texture || "Loamy", rec: "Loamy", trend: "stable", icon: GripVertical, color: "#6D4C41" },
            ].map((n) => {
              const pct = typeof n.value === "number" && typeof n.rec === "number" ? Math.min(Math.round((n.value / n.rec) * 100), 100) : 50;
              return (
                <AppCard key={n.label} className="sc-nutrient-card">
                  <div className="sc-nutrient-top">
                    <div className="sc-nutrient-icon" style={{ background: `${n.color}15`, color: n.color }}><n.icon size={18} /></div>
                    <div className={`sc-nutrient-trend ${n.trend === "up" ? "up" : "down"}`}>
                      {n.trend === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    </div>
                  </div>
                  <span className="sc-nutrient-label">{n.label}</span>
                  <strong className="sc-nutrient-value">{n.value}<small>{n.unit || ""}</small></strong>
                  <div className="sc-nutrient-bar-bg">
                    <div className="sc-nutrient-bar-fill" style={{ width: `${pct}%`, background: n.color }} />
                  </div>
                  <span className="sc-nutrient-rec">Target: {n.rec}{n.unit || ""}</span>
                </AppCard>
              );
            })}
          </div>

          {/* Soil Map */}
          <AppCard>
            <div className="sc-card-head">
              <MapPinned size={16} />
              <h3>Interactive Soil Map</h3>
            </div>
            <div className="sc-map-body">
              <div className="sc-map-visual">
                <div className="sc-map-terrain" />
                <div className="sc-map-grid-lines" />
                <div className="sc-map-zone high" style={{ left: "20%", top: "15%", width: "25%", height: "30%" }} />
                <div className="sc-map-zone medium" style={{ left: "50%", top: "35%", width: "30%", height: "35%" }} />
                <div className="sc-map-zone low" style={{ left: "25%", top: "55%", width: "20%", height: "25%" }} />
                <div className="sc-map-pin-drop" style={{ left: `${selectedFarm.location?.mapX ?? 52}%`, top: `${selectedFarm.location?.mapY ?? 46}%` }}>
                  <MapPinned size={22} fill="#2E7D32" color="#fff" />
                </div>
                <div className="sc-map-legend">
                  <span><i className="high" /> High fertility</span>
                  <span><i className="medium" /> Medium</span>
                  <span><i className="low" /> Low</span>
                </div>
                <div className="sc-map-label">Click to add soil sampling points</div>
              </div>
            </div>
            <p className="sc-map-source">
              Farmer plot coordinates shown. Soil data source: {getSoilSourceLabel(soilSource)}.
            </p>
          </AppCard>
        </div>

        {/* Sidebar */}
        <aside className="sc-sidebar">
          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><CloudSun size={14} /> Weather</div>
            <div className="sc-sidebar-weather">
              <div className="sc-weather-temp">{analysis.climateContext?.currentTemp ?? "—"}°C</div>
              <div className="sc-weather-details">
                <span><Droplets size={12} /> {analysis.climateContext?.humidity ?? "—"}%</span>
                <span><Wind size={12} /> {analysis.climateContext?.wind ?? "—"} km/h</span>
                <span><Cloud size={12} /> {analysis.climateContext?.weeklyRain ?? "—"}mm rain</span>
              </div>
            </div>
          </AppCard>

          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><Sprout size={14} /> Current Crop</div>
            <div className="sc-sidebar-crop">
              {getCropImageUrl(selectedFarm.primaryCrop) ? (
                <img src={getCropImageUrl(selectedFarm.primaryCrop)} alt={selectedFarm.primaryCrop} className="sc-sidebar-crop-img" />
              ) : <div className="sc-sidebar-crop-placeholder"><Sprout size={24} /></div>}
              <strong>{selectedFarm.primaryCrop || "Not set"}</strong>
              <span>{selectedFarmPrimaryCrop ? `${selectedFarm.sizeHectares || "—"} ha` : "No crop assigned"}</span>
            </div>
          </AppCard>

          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><MapPinned size={14} /> Field Location</div>
            <div className="sc-sidebar-location">
              <span>{selectedFarm.name}</span>
              <span>{selectedFarm.region || "Unspecified region"}</span>
              {selectedFarm.location?.lat && <span className="sc-sidebar-coords">{selectedFarm.location.lat.toFixed(4)}, {selectedFarm.location.lng.toFixed(4)}</span>}
            </div>
          </AppCard>

          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><FileClock size={14} /> Last Analysis</div>
            <div className="sc-sidebar-stat"><span>Score</span><strong>{effectiveHealthScore}/100</strong></div>
            <div className="sc-sidebar-stat"><span>Mode</span><strong>{backendSoilMode === "backend" ? "Backend" : "Local"}</strong></div>
            <div className="sc-sidebar-stat"><span>Source</span><strong>{getSoilSourceLabel(soilSource)}</strong></div>
          </AppCard>

          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><Shield size={14} /> AI Confidence</div>
            <div className="sc-sidebar-conf">
              <div className="sc-conf-bar-bg">
                <div className="sc-conf-bar-fill" style={{ width: `${Math.min(effectiveHealthScore, 95)}%` }} />
              </div>
              <span>Health Score <strong>{effectiveHealthScore}%</strong></span>
              <span>Suitability <strong>{effectiveSuitableCrops?.[0]?.match || 0}%</strong></span>
            </div>
          </AppCard>

          <AppCard className="sc-sidebar-card">
            <div className="sc-sidebar-head"><FlaskConical size={14} /> Nearby Lab</div>
            <p className="sc-sidebar-lab-text">Rwanda Soil Health Laboratory — Kigali</p>
            <p className="sc-sidebar-lab-text">Distance: ~{selectedFarm.location?.lat ? "42" : "—"} km</p>
          </AppCard>
        </aside>
      </div>

      {/* AI Crop Recommendations */}
      <AppCard>
        <div className="sc-card-head">
          <Leaf size={18} />
          <h3>AI Crop Recommendations</h3>
          <StatusBadge variant="success">Top Yield Confidence</StatusBadge>
        </div>
<div className="sc-rec-grid">
          {(Array.isArray(effectiveSuitableCrops) ? effectiveSuitableCrops : []).slice(0, 3).map((crop, index) => (
            <button key={crop.name} type="button" onClick={() => setSelectedRecommendationName(crop.name)} className={`sc-rec-card ${selectedRecommendation?.name === crop.name ? "selected" : ""}`}>
              <div className="sc-rec-img-wrap">
                <img src={getCropImageUrl(crop.name) || crop.imageUrl} alt={crop.name} className="sc-rec-img" loading="lazy" />
                <div className={`sc-rec-rank rank-${index + 1}`}>#{index + 1}</div>
                <div className="sc-rec-suit-badge">{crop.match}%</div>
              </div>
              <div className="sc-rec-body">
                <h4>{crop.name}</h4>
                <div className="sc-rec-meta-grid">
                  <div className="sc-rec-meta"><span>Expected Yield</span><strong>{crop.cycle || "—"}</strong></div>
                  <div className="sc-rec-meta"><span>Water Need</span><strong>{crop.rotationTag || "—"}</strong></div>
                  <div className="sc-rec-meta"><span>Growing Season</span><strong>{crop.season || "—"}</strong></div>
                  <div className="sc-rec-meta"><span>Disease Risk</span><strong>{crop.rotationTag?.includes("Drought") ? "Low" : crop.rotationTag?.includes("Fixing") ? "Low" : "Moderate"}</strong></div>
                  <div className="sc-rec-meta"><span>Profit Potential</span><strong>{crop.match >= 85 ? "High" : crop.match >= 70 ? "Medium" : "Low"}</strong></div>
                  <div className="sc-rec-meta"><span>Recommended Region</span><strong>{crop.region || "—"}</strong></div>
                </div>
                <p className="sc-rec-note">{crop.note}</p>
              </div>
            </button>
          ))}
        </div>
        {selectedRecommendationDetails && (
          <div className="sc-rec-detail-panel">
            <div className="sc-rec-detail-head">
              <strong>{selectedRecommendation?.name}</strong>
              <StatusBadge variant="success">{selectedRecommendation?.match}% Suitability</StatusBadge>
            </div>
            <p>{selectedRecommendationDetails.summary}</p>
            {selectedRecommendationDetails.concerns.length > 0 && (
              <div className="sc-rec-detail-block">
                <h4>Limiting Factors</h4>
                <ul>{selectedRecommendationDetails.concerns.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            <div className="sc-rec-detail-block">
              <h4>Recommended Actions</h4>
              <ul>{selectedRecommendationDetails.actions.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          </div>
        )}
        <div className="sc-rec-banner">
          <Sprout size={16} />
          <p>{analysis.recommendationPanel.recommendation}</p>
        </div>
      </AppCard>

      {/* Crop Suitability Matrix */}
      <AppCard>
        <div className="sc-card-head">
          <BarChart3 size={18} />
          <h3>Crop Suitability Matrix</h3>
        </div>
        <div className="sc-matrix-table">
          <div className="sc-matrix-head">
            <span className="sc-matrix-col-crop">Crop</span>
            <span className="sc-matrix-col-score">Suitability</span>
            <span className="sc-matrix-col-demand">Market Demand</span>
            <span className="sc-matrix-col-water">Water Need</span>
            <span className="sc-matrix-col-profit">Profit</span>
            <span className="sc-matrix-col-overall">Overall</span>
          </div>
          {suitabilityMatrix.map((item) => {
            const cropMeta = cropLibrary.find((c) => c.name === item.name);
            const market = item.compatibility >= 85 ? "High" : item.compatibility >= 70 ? "Medium" : "Low";
            const profit = item.compatibility >= 80 ? "High" : item.compatibility >= 60 ? "Medium" : "Low";
            return (
              <div key={item.name} className="sc-matrix-row">
                <div className="sc-matrix-col-crop">
                  {getCropImageUrl(item.name) && <img src={getCropImageUrl(item.name)} alt="" className="sc-matrix-crop-img" />}
                  <strong>{item.name}</strong>
                </div>
                <div className="sc-matrix-col-score">
                  <div className="sc-matrix-bar-bg"><div className="sc-matrix-bar-fill" style={{ width: `${item.compatibility}%` }} /></div>
                  <span>{item.compatibility}%</span>
                </div>
                <div className="sc-matrix-col-demand"><span className={`sc-matrix-badge ${market === "High" ? "high" : market === "Medium" ? "mid" : "low"}`}>{market}</span></div>
                <div className="sc-matrix-col-water"><span>{cropMeta?.rotationTag || "—"}</span></div>
                <div className="sc-matrix-col-profit"><span className={`sc-matrix-badge ${profit === "High" ? "high" : profit === "Medium" ? "mid" : "low"}`}>{profit}</span></div>
                <div className="sc-matrix-col-overall">
                  <span className={`sc-status-chip ${item.compatibility >= 85 ? "excellent" : item.compatibility >= 70 ? "good" : "moderate"}`}>
                    {item.compatibility >= 85 ? "Best Fit" : item.compatibility >= 70 ? "Good Fit" : "Needs Work"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* Fertilizer Recommendation */}
      <div className="sc-fertilizer-row">
        {effectiveFertilizerRows.map((row) => {
          const maxDosage = { "Nitrogen (N)": 68, "Phosphorus (P)": 52, "Potassium (K)": 60, "Organic Matter": 180 }[row.nutrient] || 100;
          const pct = Math.min((row.dosage / maxDosage) * 100, 100);
          const iconMap = { "Nitrogen (N)": BarChart3, "Phosphorus (P)": BarChart3, "Potassium (K)": BarChart3, "Organic Matter": Droplets };
          const Icon = iconMap[row.nutrient] || BarChart3;
          return (
            <AppCard key={row.nutrient} className="sc-fertilizer-card">
              <div className="sc-card-head">
                <Icon size={16} />
                <h3>{row.nutrient}</h3>
                <span className={`sc-fertilizer-state ${row.tone}`}>{row.state}</span>
              </div>
              <div className="sc-fertilizer-body">
                <div className="sc-fertilizer-row-info">
                  <span>Recommended Dose</span>
                  <strong>{row.dosage} kg/ha</strong>
                </div>
                <div className="sc-fertilizer-bar-bg">
                  <div className="sc-fertilizer-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="sc-fertilizer-row-info">
                  <span>Fertilizer</span>
                  <strong>{row.fertilizer}</strong>
                </div>
                <div className="sc-fertilizer-row-info">
                  <span>Application</span>
                  <strong>{row.weatherAdjustment}</strong>
                </div>
                <div className="sc-fertilizer-row-info">
                  <span>Split Applications</span>
                  <strong>{row.dosage > 30 ? "2-3 splits" : "Single application"}</strong>
                </div>
                <div className="sc-fertilizer-row-info">
                  <span>Est. Cost</span>
                  <strong>RWF {(row.dosage * 850).toLocaleString()}</strong>
                </div>
                <div className="sc-fertilizer-row-info">
                  <span>Env. Impact</span>
                  <strong className={row.tone === "green" ? "green-text" : row.tone === "amber" ? "amber-text" : "red-text"}>
                    {row.tone === "green" ? "Low" : row.tone === "amber" ? "Moderate" : "High"}
                  </strong>
                </div>
              </div>
            </AppCard>
          );
        })}
      </div>

      {/* Degradation & Rotation */}
      <div className="sc-degradation-row">
        <AppCard>
          <div className="sc-card-head">
            <AlertTriangle size={16} />
            <h3>Degradation Alerts</h3>
          </div>
          <div className="sc-degradation-list">
            {analysis.degradationAlerts.length ? (
              analysis.degradationAlerts.map((alert) => (
                <div key={alert} className="sc-degradation-item"><AlertTriangle size={14} /><span>{alert}</span></div>
              ))
            ) : (
              <div className="sc-degradation-item success"><CheckCircle size={14} /><span>No immediate soil degradation alerts.</span></div>
            )}
          </div>
        </AppCard>

        <AppCard>
          <div className="sc-card-head">
            <RotateCcw size={16} />
            <h3>Crop Rotation Plan</h3>
          </div>
          <ul className="sc-rotation-list">
            {analysis.cropRotationPlan.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <div className="sc-rotation-cards">
            <div className="sc-rotation-mini">
              <span className="sc-rotation-mini-label">Erosion Risk</span>
              <span className="sc-rotation-mini-value low">Low</span>
            </div>
            <div className="sc-rotation-mini">
              <span className="sc-rotation-mini-label">Compaction</span>
              <span className="sc-rotation-mini-value mid">Moderate</span>
            </div>
            <div className="sc-rotation-mini">
              <span className="sc-rotation-mini-label">Cover Crop</span>
              <span className="sc-rotation-mini-value green">Recommended</span>
            </div>
            <div className="sc-rotation-mini">
              <span className="sc-rotation-mini-label">Carbon Storage</span>
              <span className="sc-rotation-mini-value green">2.4 t/ha</span>
            </div>
          </div>
        </AppCard>
      </div>

      {/* Crop Library */}
      <AppCard>
        <div className="sc-card-head">
          <Search size={18} />
          <h3>Crop Library Browser</h3>
        </div>
        <div className="sc-library-filters">
          <input type="text" placeholder="Search crop library..." value={libraryFilters.search} onChange={(e) => setLibraryFilters((c) => ({ ...c, search: e.target.value }))} />
          <select value={libraryFilters.season} onChange={(e) => setLibraryFilters((c) => ({ ...c, season: e.target.value }))}>
            {["All", ...new Set(cropLibrary.map((c) => c.season))].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={libraryFilters.region} onChange={(e) => setLibraryFilters((c) => ({ ...c, region: e.target.value }))}>
            {["All", ...new Set(cropLibrary.map((c) => c.region))].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={libraryFilters.soilType} onChange={(e) => setLibraryFilters((c) => ({ ...c, soilType: e.target.value }))}>
            {["All", ...textureOptions].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sc-library-grid">
          {cropLibraryView.map((crop) => (
            <div key={crop.name} className="sc-library-card">
              <div className="sc-library-img-wrap">
                <img src={getCropImageUrl(crop.name) || crop.imageUrl} alt={crop.name} className="sc-library-img" loading="lazy" />
              </div>
              <div className="sc-library-body">
                <strong>{crop.name}</strong>
                <span>{crop.season} | {crop.region}</span>
                <span>{crop.soilTypes.join(", ")} | pH {crop.phRange[0]}-{crop.phRange[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </AppCard>

      {/* History Modal */}
      {isHistoryOpen ? (
        <div className="sc-modal-backdrop" role="presentation" onClick={() => setIsHistoryOpen(false)}>
          <div className="sc-modal" role="dialog" aria-modal="true" aria-label="Soil test history" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-head">
              <div>
                <h2>Soil Test History</h2>
                <p>Backend records are shown first. Local fallback entries remain available when backend data is not yet present.</p>
              </div>
              <div className="sc-modal-actions">
                <ActionButton variant="secondary" size="sm" onClick={exportHistory}>
                  <Download size={14} /> <span>Export JSON</span>
                </ActionButton>
                <button type="button" className="sc-modal-close" onClick={() => setIsHistoryOpen(false)} aria-label="Close"><X size={18} /></button>
              </div>
            </div>
            <div className="sc-history-table">
              <div className="sc-history-table-head">
                <span>Source</span><span>Health</span><span>Status</span><span>Lab Report</span><span>Updated</span><span>Top Crop</span><span>Action</span>
              </div>
              {historyRecords.map((record) => (
                <div key={record.id} className="sc-history-table-row">
                  <span>{getSoilSourceLabel(record.sourceType)}</span>
                  <strong>{record.healthScore || 0} / 100</strong>
                  <span>{record.analysisStatus || "Ready"}</span>
                  <span>{record.labReport?.fileName || "No file"}</span>
                  <span>{formatSoilDate(record.updatedAt || record.createdAt)}</span>
                  <span>{getHistoryTopCrop(record)}</span>
                  <button type="button" className="sc-table-action" onClick={() => handleHistorySelect(record)}>Use Record</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

