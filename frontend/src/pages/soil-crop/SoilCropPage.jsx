import {
  AlertTriangle,
  Download,
  FileClock,
  Filter,
  FlaskConical,
  Leaf,
  MapPinned,
  RotateCcw,
  Search,
  Sprout,
  TestTubeDiagonal,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { downloadJsonFile, downloadTextFile } from "../../utils/actions";

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

  const values = analysis.values;
  const concerns = [];
  const actions = [];

  if (values.ph < crop.phRange[0]) {
    concerns.push(`pH is below ${crop.name}'s preferred range of ${crop.phRange[0]}-${crop.phRange[1]}`);
    actions.push("Correct soil acidity before planting so nutrient uptake is not restricted.");
  } else if (values.ph > crop.phRange[1]) {
    concerns.push(`pH is above ${crop.name}'s preferred range of ${crop.phRange[0]}-${crop.phRange[1]}`);
    actions.push("Use soil-acidifying nutrition and added organic matter before establishment.");
  }

  if (values.nitrogen < crop.npk.n) {
    concerns.push("nitrogen is lower than this crop ideally needs");
    actions.push(`Raise nitrogen closer to ${crop.npk.n} using split applications around early growth.`);
  }

  if (values.phosphorus < crop.npk.p) {
    concerns.push("phosphorus is slightly limiting");
    actions.push(`Boost phosphorus toward ${crop.npk.p} for stronger rooting and early vigor.`);
  }

  if (values.potassium < crop.npk.k) {
    concerns.push("potassium is below the preferred level");
    actions.push(`Increase potassium toward ${crop.npk.k} to support water balance and crop strength.`);
  }

  if (values.organicMatter < crop.organicMatterMin) {
    concerns.push("organic matter is under the crop's preferred threshold");
    actions.push("Build organic matter with compost and crop residues before the next planting cycle.");
  }

  if (!crop.soilTypes.includes(selectedFarm.landType || selectedFarm.soilType || "Loamy")) {
    actions.push(`Monitor this plot carefully because ${crop.name} performs best on ${crop.soilTypes.join(" or ")} soils.`);
  }

  const summary =
    crop.match >= 85
      ? `${crop.name} is a strong fit for ${selectedFarm.name} because the current soil profile already supports most of its nutrient and pH requirements during the ${analysis.climateContext?.seasonLabel?.toLowerCase() || "current"} window.`
      : crop.match >= 70
        ? `${crop.name} can perform well on ${selectedFarm.name}, but a few nutrient and soil-balance adjustments should be made before planting in the current ${analysis.climateContext?.seasonLabel?.toLowerCase() || "seasonal"} conditions.`
        : `${crop.name} is still possible on ${selectedFarm.name}, but the soil needs clear correction steps before this crop becomes a safe choice.`;

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

function calculateSoilAnalysis(form, selectedFarm, climateContext, soilSourceMode) {
  const values = {
    ph: Number(form.ph || 0),
    nitrogen: Number(form.nitrogen || 0),
    phosphorus: Number(form.phosphorus || 0),
    potassium: Number(form.potassium || 0),
    organicMatter: Number(form.organicMatter || 0),
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
        ? `Prioritize ${suitableCrops[0].name} on ${selectedFarm.name} and rotate with ${suitableCrops[1]?.name || "legumes"} next season.`
        : `Apply nutrient corrections before planting. ${suitableCrops[0]?.name} is currently the strongest fit after soil balancing.`,
  };

  const cropRotationPlan = [
    `${selectedFarm.primaryCrop || suitableCrops[0].name} -> ${suitableCrops[1]?.name || "Soybean"} -> Cover crop`,
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

export function SoilCropPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "soil-default-farm");
  const [libraryFilters, setLibraryFilters] = useState({
    search: "",
    season: "All",
    region: "All",
    soilType: "All",
  });
  const [labFileName, setLabFileName] = useState("");
  const [soilEstimate, setSoilEstimate] = useState(null);
  const [weatherContext, setWeatherContext] = useState(null);
  const [sourceStatus, setSourceStatus] = useState("Loading location-based soil estimate...");
  const [sourceMode, setSourceMode] = useState("estimated");
  const [formDirty, setFormDirty] = useState(false);
  const [externalWarning, setExternalWarning] = useState("");
  const [form, setForm] = useState({
    ph: "6.5",
    nitrogen: "38",
    phosphorus: "21",
    potassium: "17",
    organicMatter: "2.7",
    texture: "Loamy",
  });
  const [submittedForm, setSubmittedForm] = useState(form);
  const [selectedRecommendationName, setSelectedRecommendationName] = useState("");

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "soil-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  useEffect(() => {
    let active = true;

    async function loadEnvironmentalInputs() {
      const lat = selectedFarm?.location?.lat;
      const lng = selectedFarm?.location?.lng;

      if (!lat || !lng) {
        if (active) {
          setSourceStatus("Using manual soil test data. Location estimate is unavailable for this farm.");
          setExternalWarning("Add precise farm coordinates to unlock SoilGrids fallback and live weather-linked soil guidance.");
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

        if (!labFileName && !formDirty && estimate) {
          const estimatedForm = {
            ph: String(estimate.ph),
            nitrogen: String(estimate.nitrogen),
            phosphorus: String(estimate.phosphorus),
            potassium: String(estimate.potassium),
            organicMatter: String(estimate.organicMatter),
            texture: estimate.texture,
          };

          setForm(estimatedForm);
          setSubmittedForm(estimatedForm);
          setSourceMode("estimated");
        } else if (labFileName) {
          setSourceMode("uploaded");
        } else {
          setSourceMode("manual");
        }

        if (labFileName) {
          setSourceStatus("Using uploaded lab data. Estimated location data is only supporting the map and context.");
        } else if (!formDirty && soilLoaded && weatherLoaded) {
          setSourceStatus("Using estimated soil data from location (SoilGrids fallback) with live weather context.");
        } else if (!formDirty && soilLoaded) {
          setSourceStatus("Using estimated soil data from location. Live weather context is temporarily unavailable.");
        } else if (formDirty && soilLoaded && weatherLoaded) {
          setSourceStatus("Using manual soil test data. SoilGrids fallback and live weather context are both available.");
        } else if (formDirty && weatherLoaded) {
          setSourceStatus("Using manual soil test data with live weather context.");
        } else if (formDirty && soilLoaded) {
          setSourceStatus("Using manual soil test data. SoilGrids fallback is available for reference.");
        } else {
          setSourceStatus("Using manual soil test data.");
        }

        if (!soilLoaded && !weatherLoaded) {
          setExternalWarning("Live SoilGrids and weather data could not be loaded, so the module is using the current entered values only.");
        } else if (!soilLoaded) {
          setExternalWarning("SoilGrids fallback could not be loaded right now, so soil estimation from location is temporarily unavailable.");
        } else if (!weatherLoaded) {
          setExternalWarning("Live weather context could not be loaded right now, so recommendations are using soil and regional logic without weather refinement.");
        } else {
          setExternalWarning("");
        }
      } catch (error) {
        if (!active) return;
        setExternalWarning("Online support data could not be loaded, so the module is using the current entered values only.");
        setSourceStatus(labFileName ? "Using uploaded lab data." : "Using manual soil test data.");
      }
    }

    loadEnvironmentalInputs();

    return () => {
      active = false;
    };
  }, [formDirty, labFileName, selectedFarm]);

  useEffect(() => {
    if (labFileName) {
      setSourceMode("uploaded");
      setSourceStatus("Using uploaded lab data. Estimated location data is only supporting the map and context.");
    } else if (sourceMode === "uploaded") {
      setSourceMode(formDirty ? "manual" : soilEstimate ? "estimated" : "manual");
      setSourceStatus(
        soilEstimate && !formDirty
          ? "Using estimated soil data from location (SoilGrids fallback) with live weather context."
          : "Using manual soil test data."
      );
    }
  }, [formDirty, labFileName, soilEstimate, sourceMode]);

  const analysis = useMemo(
    () => calculateSoilAnalysis(submittedForm, selectedFarm, weatherContext, sourceMode),
    [selectedFarm, submittedForm, weatherContext, sourceMode]
  );

  useEffect(() => {
    setSelectedRecommendationName((current) =>
      analysis.suitableCrops.some((crop) => crop.name === current)
        ? current
        : analysis.suitableCrops[0]?.name || ""
    );
  }, [analysis.suitableCrops]);

  const selectedRecommendation = useMemo(
    () => analysis.suitableCrops.find((crop) => crop.name === selectedRecommendationName) || analysis.suitableCrops[0] || null,
    [analysis.suitableCrops, selectedRecommendationName]
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
        analysis.suitableCrops.find((item) => item.name === crop.name)?.match ||
        calculateSoilAnalysis(submittedForm, selectedFarm).suitableCrops.find((item) => item.name === crop.name)?.match ||
        0,
    }));
  }, [analysis.suitableCrops, cropLibraryView, selectedFarm, submittedForm]);

  const handleAnalyze = () => {
    setSourceMode(labFileName ? "uploaded" : "manual");
    setSourceStatus(
      labFileName
        ? "Using uploaded lab data. Estimated location data is only supporting the map and context."
        : "Using manual soil test data."
    );
    setSubmittedForm(form);
  };

  const exportAnalysis = () => {
    downloadTextFile(
      `${selectedFarm.name.toLowerCase().replace(/\s+/g, "-")}-soil-analysis.txt`,
      `Soil & Crop Analysis\nFarm: ${selectedFarm.name}\nSource: ${sourceStatus}\nHealth Score: ${analysis.healthScore} (${analysis.healthLabel})\nSelected Recommendation: ${selectedRecommendation?.name || "N/A"}\n\nDegradation Alerts:\n- ${analysis.degradationAlerts.join("\n- ") || "None"}`
    );
  };

  const exportHistory = () => {
    downloadJsonFile("soil-analysis-history.json", {
      farm: selectedFarm,
      sourceStatus,
      submittedForm,
      analysis,
      selectedRecommendation,
      selectedRecommendationDetails,
    });
  };

  return (
    <section className="management-page prototype-soil-module">
      <div className="prototype-soil-head">
        <div className="page-title-block prototype-soil-title">
          <h1>Soil &amp; Crop Analysis</h1>
          <p>
            Soil nutrient interpretation, crop suitability analysis, fertilizer planning, and
            field-level crop rotation guidance for each registered farm.
          </p>
        </div>

        <div className="prototype-soil-head-actions">
          <button type="button" className="prototype-soil-action secondary" onClick={exportAnalysis}>
            <Download size={15} />
            <span>Export PDF</span>
          </button>
          <button type="button" className="prototype-soil-action primary" onClick={exportHistory}>
            <FileClock size={15} />
            <span>View History</span>
          </button>
        </div>
      </div>

      <div className="prototype-soil-module-toolbar">
        <label className="prototype-soil-toolbar-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>

        <label className="prototype-soil-toolbar-field">
          <span>Lab report upload</span>
          <div className="prototype-soil-upload-inline">
            <Upload size={15} />
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.jpg,.jpeg,.png"
              onChange={(event) => setLabFileName(event.target.files?.[0]?.name || "")}
            />
            <em>{labFileName || "Upload digital lab result"}</em>
          </div>
        </label>
      </div>

      <div className="prototype-soil-source-note">
        <strong>{sourceStatus}</strong>
        <span>
          Crop recommendation = soil test + weather + region + season. Fertilizer guidance uses soil test
          first, then weather refinement. Advanced crop health imaging will use AgroMonitoring later.
        </span>
        {externalWarning ? <em>{externalWarning}</em> : null}
      </div>

      <div className="prototype-soil-grid functional">
        <div className="prototype-soil-left">
          <article className="prototype-panel soil-input-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <TestTubeDiagonal size={19} />
                <span>Soil Test Input</span>
              </h2>
            </div>

            <div className="prototype-soil-form-grid">
              <label>
                <span>pH Level</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.ph}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, ph: event.target.value }));
                  }}
                />
              </label>
              <label>
                <span>Nitrogen (N)</span>
                <input
                  type="number"
                  value={form.nitrogen}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, nitrogen: event.target.value }));
                  }}
                />
              </label>
              <label>
                <span>Phosphorus (P)</span>
                <input
                  type="number"
                  value={form.phosphorus}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, phosphorus: event.target.value }));
                  }}
                />
              </label>
              <label>
                <span>Potassium (K)</span>
                <input
                  type="number"
                  value={form.potassium}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, potassium: event.target.value }));
                  }}
                />
              </label>
              <label>
                <span>Organic Matter (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.organicMatter}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, organicMatter: event.target.value }));
                  }}
                />
              </label>
              <label>
                <span>Texture</span>
                <select
                  value={form.texture}
                  onChange={(event) => {
                    setFormDirty(true);
                    setForm((current) => ({ ...current, texture: event.target.value }));
                  }}
                >
                  {textureOptions.map((texture) => (
                    <option key={texture} value={texture}>
                      {texture}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="button" className="prototype-soil-submit" onClick={handleAnalyze}>
              Analyze Soil &amp; Generate Report
            </button>
          </article>

          <article className="prototype-panel soil-score-panel">
            <div className="soil-panel-header-row">
              <h3>Soil Health Score</h3>
              <span className={`soil-score-badge ${analysis.healthLabel.toLowerCase()}`}>{analysis.healthLabel}</span>
            </div>
            <div className="soil-score-ring">
              <div className="soil-score-ring-inner">
                <strong>{analysis.healthScore}</strong>
                <span>{analysis.healthLabel}</span>
              </div>
            </div>
            <p>
              This score combines pH balance, N-P-K availability, organic matter, and texture
              quality for {selectedFarm.name}.
            </p>
            <div className="soil-score-feedback">
              <strong>{analysis.scoreInsights.summary}</strong>
              {analysis.scoreInsights.actions.length > 0 ? (
                <ul>
                  {analysis.scoreInsights.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>

          <article className="prototype-panel soil-map-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <MapPinned size={19} />
                <span>Interactive Soil Map Overlay</span>
              </h2>
            </div>
            <div className="soil-map-overlay">
              <div className="soil-map-grid" />
              <div className="soil-map-layer low" />
              <div className="soil-map-layer medium" />
              <div
                className="soil-map-pin"
                style={{
                  left: `${selectedFarm.location?.mapX ?? 52}%`,
                  top: `${selectedFarm.location?.mapY ?? 46}%`,
                }}
              />
              <div className="soil-map-legend">
                <span><i className="low" /> Low fertility pocket</span>
                <span><i className="medium" /> Balanced zone</span>
                <span><i className="high" /> Best response zone</span>
              </div>
            </div>
            <p className="soil-map-source">
              {soilEstimate
                ? "Soil map overlay is using farmer plot coordinates with SoilGrids fallback estimates for baseline spatial context."
                : "Soil map overlay is using farmer plot coordinates. SoilGrids fallback was not available for this farm."}
            </p>
          </article>
        </div>

        <div className="prototype-soil-right">
          <article className="prototype-panel soil-crops-panel">
            <div className="prototype-soil-panel-title with-badge">
              <h2>
                <Leaf size={19} />
                <span>Recommendation Panel</span>
              </h2>
              <span className="prototype-soil-badge">Top Yield Confidence</span>
            </div>

            <div className="prototype-crop-grid">
              {analysis.suitableCrops.slice(0, 3).map((crop, index) => (
                <button
                  key={crop.name}
                  type="button"
                  onClick={() => setSelectedRecommendationName(crop.name)}
                  className={`${index === 2 ? "prototype-crop-card full" : "prototype-crop-card"} ${
                    selectedRecommendation?.name === crop.name ? "selected" : ""
                  }`}
                >
                  <div className={`prototype-crop-thumb ${index === 0 ? "gold" : index === 1 ? "green" : "olive"}`} />
                  <div className="prototype-crop-copy">
                    <div className="prototype-crop-top">
                      <h3>{crop.name}</h3>
                      <strong>{crop.match}% Match</strong>
                    </div>
                    <p>{crop.note}</p>
                    <div className="prototype-crop-tags">
                      <span>{crop.rotationTag}</span>
                      <span>{crop.cycle}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedRecommendationDetails ? (
              <div className="soil-recommendation-detail">
                <div className="soil-recommendation-detail-head">
                  <strong>{selectedRecommendation?.name}</strong>
                  <span>{selectedRecommendation?.match}% suitability confidence</span>
                </div>
                <p>{selectedRecommendationDetails.summary}</p>
                {selectedRecommendationDetails.concerns.length > 0 ? (
                  <div className="soil-recommendation-detail-block">
                    <h4>What is currently limiting this crop?</h4>
                    <ul>
                      {selectedRecommendationDetails.concerns.map((concern) => (
                        <li key={concern}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="soil-recommendation-detail-block">
                  <h4>What should be done before planting?</h4>
                  <ul>
                    {selectedRecommendationDetails.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="soil-recommendation-banner">
              <Sprout size={18} />
              <p>{analysis.recommendationPanel.recommendation}</p>
            </div>
          </article>

          <article className="prototype-panel soil-suitability-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <Filter size={18} />
                <span>Crop Suitability Matrix</span>
              </h2>
            </div>
            <div className="soil-suitability-table">
              <div className="soil-suitability-head">
                <span>Crop</span>
                <span>Compatibility</span>
                <span>Decision</span>
              </div>
              {suitabilityMatrix.map((item) => (
                <div key={item.name} className="soil-suitability-row">
                  <strong>{item.name}</strong>
                  <div className="soil-suitability-meter">
                    <div style={{ width: `${item.compatibility}%` }} />
                  </div>
                  <span className={`soil-suitability-tag ${item.compatibility >= 85 ? "best" : item.compatibility >= 70 ? "good" : "watch"}`}>
                    {item.compatibility >= 85 ? "Best Fit" : item.compatibility >= 70 ? "Good Fit" : "Needs Adjustment"}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="prototype-panel soil-fertilizer-panel">
            <div className="prototype-soil-panel-title">
              <h2>
                <FlaskConical size={19} />
                <span>Fertilizer Requirement Calculation</span>
              </h2>
            </div>

            <div className="soil-fertilizer-table">
              <div className="soil-fertilizer-head">
                <span>Nutrient</span>
                <span>Current State</span>
                <span>Recommended Fertilizer</span>
                <span>Dosage (kg/acre)</span>
              </div>

              {analysis.fertilizerRows.map((row) => (
                <div key={row.nutrient} className="soil-fertilizer-row">
                  <strong>{row.nutrient}</strong>
                  <span className="soil-state">
                    <i className={row.tone} />
                    {row.state}
                  </span>
                  <span>
                    {row.fertilizer}
                    <small>{row.weatherAdjustment}</small>
                  </span>
                  <strong className="soil-dosage">{row.dosage}</strong>
                </div>
              ))}
            </div>

            <div className="soil-tip-banner">
              <Sprout size={18} />
              <p>
                Split nutrient application across early and mid growth stages to reduce runoff
                losses and improve crop nutrient recovery.
              </p>
            </div>
          </article>

          <div className="soil-lower-grid">
            <article className="prototype-panel soil-library-panel">
              <div className="prototype-soil-panel-title">
                <h2>
                  <Search size={18} />
                  <span>Crop Library Browser</span>
                </h2>
              </div>
              <div className="soil-library-filters">
                <input
                  type="text"
                  placeholder="Search crop library..."
                  value={libraryFilters.search}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, search: event.target.value }))
                  }
                />
                <select
                  value={libraryFilters.season}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, season: event.target.value }))
                  }
                >
                  {["All", ...new Set(cropLibrary.map((crop) => crop.season))].map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
                <select
                  value={libraryFilters.region}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, region: event.target.value }))
                  }
                >
                  {["All", ...new Set(cropLibrary.map((crop) => crop.region))].map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <select
                  value={libraryFilters.soilType}
                  onChange={(event) =>
                    setLibraryFilters((current) => ({ ...current, soilType: event.target.value }))
                  }
                >
                  {["All", ...textureOptions].map((soilType) => (
                    <option key={soilType} value={soilType}>
                      {soilType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="soil-library-list">
                {cropLibraryView.map((crop) => (
                  <article key={crop.name} className="soil-library-item">
                    <strong>{crop.name}</strong>
                    <span>{crop.season} | {crop.region}</span>
                    <p>{crop.soilTypes.join(", ")} | pH {crop.phRange[0]}-{crop.phRange[1]}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="prototype-panel soil-risk-panel">
              <div className="prototype-soil-panel-title">
                <h2>
                  <AlertTriangle size={18} />
                  <span>Degradation &amp; Rotation Alerts</span>
                </h2>
              </div>

              <div className="soil-risk-list">
                {analysis.degradationAlerts.length ? (
                  analysis.degradationAlerts.map((alert) => (
                    <div key={alert} className="soil-risk-item">
                      <AlertTriangle size={16} />
                      <span>{alert}</span>
                    </div>
                  ))
                ) : (
                  <div className="soil-risk-item success">
                    <Sprout size={16} />
                    <span>No immediate soil degradation alerts for this farm profile.</span>
                  </div>
                )}
              </div>

              <div className="soil-rotation-plan">
                <div className="soil-rotation-head">
                  <RotateCcw size={16} />
                  <strong>Crop rotation planning tool</strong>
                </div>
                <ul>
                  {analysis.cropRotationPlan.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="soil-future-note">
                <strong>Advanced crop health</strong>
                <span>AgroMonitoring integration will be added later for satellite crop-health and vegetation analysis.</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
