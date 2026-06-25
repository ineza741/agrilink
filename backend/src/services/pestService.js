const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { ensureFarmAccess } = require("./farmService");
const { createAuditLog } = require("./auditLogService");

const cropEconomics = {
  Potato: { pricePerKg: 520, yieldPerHa: 18 },
  Maize: { pricePerKg: 680, yieldPerHa: 5.5 },
  Beans: { pricePerKg: 980, yieldPerHa: 1.9 },
  Tomato: { pricePerKg: 850, yieldPerHa: 12 },
  Vegetables: { pricePerKg: 740, yieldPerHa: 10 },
  Cereals: { pricePerKg: 610, yieldPerHa: 4.8 },
};

const diseaseLibrary = [
  {
    id: "late-blight",
    name: "Late Blight",
    scientificName: "Phytophthora infestans",
    affectedCrops: ["Potato", "Tomato"],
    commonSymptoms: ["Yellow Spots", "White Mold"],
    preventionAdvice: "Use resistant varieties, improve field drainage, and avoid prolonged canopy wetness.",
    treatment: {
      chemical: "Apply copper-based fungicide or cymoxanil mix at 5-7 day intervals under disease pressure.",
      organic: "Use Trichoderma and remove infected foliage to reduce spore spread.",
    },
    ipmAdvice: "Combine weekly scouting, drainage control, and sanitation of infected residues.",
    weatherProfile: {
      humidityMin: 75,
      humidityMax: 95,
      temperatureMin: 16,
      temperatureMax: 24,
      rainfallMin: 10,
    },
    symptomWeights: {
      "Yellow Spots": 22,
      "White Mold": 26,
      "Brown Holes": 6,
      Wilting: 10,
    },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Phytophthora_infestans_on_potato_leaf.jpg",
  },
  {
    id: "green-peach-aphid",
    name: "Green Peach Aphid",
    scientificName: "Myzus persicae",
    affectedCrops: ["Vegetables", "Beans", "Potato", "Tomato"],
    commonSymptoms: ["Wilting", "Yellow Spots"],
    preventionAdvice: "Control alternate host weeds, scout leaf undersides, and protect beneficial insects.",
    treatment: {
      chemical: "Apply selective systemic insecticide at economic threshold to reduce vector spread.",
      organic: "Use neem extract plus predator release and sticky-trap monitoring.",
    },
    ipmAdvice: "Start with field scouting and biological control before broad chemical intervention.",
    weatherProfile: {
      humidityMin: 65,
      humidityMax: 88,
      temperatureMin: 20,
      temperatureMax: 28,
      rainfallMin: 2,
    },
    symptomWeights: {
      "Yellow Spots": 20,
      "White Mold": 4,
      "Brown Holes": 5,
      Wilting: 24,
    },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Myzus_persicae_2.jpg",
  },
  {
    id: "powdery-mildew",
    name: "Powdery Mildew",
    scientificName: "Erysiphales spp.",
    affectedCrops: ["Beans", "Vegetables"],
    commonSymptoms: ["White Mold", "Yellow Spots"],
    preventionAdvice: "Reduce excessive nitrogen, space crops for airflow, and irrigate early in the day.",
    treatment: {
      chemical: "Use sulfur-based fungicide when disease is first observed under suitable weather.",
      organic: "Use bicarbonate foliar spray with resistant variety rotation.",
    },
    ipmAdvice: "Prioritize spacing, canopy ventilation, and balanced nitrogen management.",
    weatherProfile: {
      humidityMin: 60,
      humidityMax: 82,
      temperatureMin: 18,
      temperatureMax: 27,
      rainfallMin: 0,
    },
    symptomWeights: {
      "Yellow Spots": 14,
      "White Mold": 28,
      "Brown Holes": 4,
      Wilting: 8,
    },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Powdery_mildew_on_courgette_leaf.jpg",
  },
  {
    id: "fall-armyworm",
    name: "Fall Armyworm",
    scientificName: "Spodoptera frugiperda",
    affectedCrops: ["Maize", "Cereals"],
    commonSymptoms: ["Brown Holes", "Wilting"],
    preventionAdvice: "Scout maize whorls twice weekly and destroy egg masses before larval establishment.",
    treatment: {
      chemical: "Target larvae early with selective caterpillar insecticide in the whorl stage.",
      organic: "Use ash/neem mix in the whorl and conserve parasitoids where possible.",
    },
    ipmAdvice: "Use pheromone traps, early scouting, and targeted control before heavy foliar damage.",
    weatherProfile: {
      humidityMin: 55,
      humidityMax: 85,
      temperatureMin: 22,
      temperatureMax: 31,
      rainfallMin: 5,
    },
    symptomWeights: {
      "Yellow Spots": 6,
      "White Mold": 3,
      "Brown Holes": 28,
      Wilting: 18,
    },
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/Spodoptera_frugiperda_caterpillar.jpg",
  },
];

const outbreakHistorySeed = [
  {
    id: "seed-1",
    date: "2026-05-22T09:10:00.000Z",
    monthLabel: "May 2026",
    pathogen: "Phytophthora infestans",
    severity: "Moderate",
    action: "Drainage correction and preventive fungicide",
    district: "Musanze District",
  },
  {
    id: "seed-2",
    date: "2026-04-18T08:20:00.000Z",
    monthLabel: "Apr 2026",
    pathogen: "Myzus persicae",
    severity: "Low",
    action: "Sticky-trap monitoring",
    district: "Kicukiro District",
  },
  {
    id: "seed-3",
    date: "2025-12-09T12:10:00.000Z",
    monthLabel: "Dec 2025",
    pathogen: "Spodoptera frugiperda",
    severity: "High",
    action: "Whorl-stage intervention",
    district: "Bugesera District",
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function inferDistrict(farm) {
  const region = [farm?.district, farm?.sector, farm?.province, farm?.farmName].filter(Boolean).join(", ");
  if (/kicukiro/i.test(region)) return "Kicukiro District";
  if (/gasabo/i.test(region)) return "Gasabo District";
  if (/nyarugenge/i.test(region)) return "Nyarugenge District";
  if (/bugesera/i.test(region)) return "Bugesera District";
  if (/musanze/i.test(region)) return "Musanze District";
  if (/rwamagana/i.test(region)) return "Rwamagana District";
  if (/huye/i.test(region)) return "Huye District";
  if (/rubavu/i.test(region)) return "Rubavu District";
  return farm?.district || "Kicukiro District";
}

function deriveCropStage(crop, farmStage = "") {
  if (farmStage) return farmStage;
  const month = new Date().getMonth();
  const cropMap = {
    Potato: ["Tuber bulking", "Flowering", "Vegetative", "Harvest preparation"],
    Maize: ["Flowering", "Grain filling", "Vegetative", "Harvest preparation"],
    Beans: ["Flowering", "Pod filling", "Vegetative", "Harvest preparation"],
    Tomato: ["Fruit set", "Flowering", "Vegetative", "Harvesting"],
    Vegetables: ["Vegetative", "Leaf expansion", "Transplant recovery", "Harvesting"],
    Cereals: ["Tillering", "Flowering", "Grain filling", "Harvest preparation"],
  };
  const cycle = cropMap[crop] || cropMap.Vegetables;
  return cycle[month % cycle.length];
}

function getPriorityLabel(score) {
  if (score >= 85) return "Critical";
  if (score >= 72) return "High";
  if (score >= 54) return "Medium";
  return "Low";
}

function getRiskLabel(score) {
  if (score >= 80) return "High";
  if (score >= 55) return "Moderate";
  return "Low";
}

function buildWeatherContribution(weather) {
  if (!weather) {
    return {
      current: null,
      forecast: null,
      explanation: "Live weather signals are still loading for this farm.",
    };
  }

  const current = {
    temperature: Number(weather.current?.temperature ?? weather.current?.temperature_2m ?? 0),
    humidity: Number(weather.current?.humidity ?? weather.current?.relative_humidity_2m ?? 0),
    rainfall: Number(weather.current?.rainfall ?? weather.current?.rain ?? weather.current?.precipitation ?? 0),
    windSpeed: Number(weather.current?.windSpeed ?? weather.current?.wind_speed_10m ?? 0),
    description: weather.current?.description || "Variable conditions",
  };

  const forecastSource = weather.forecast || weather.daily || {};
  const totalRain = Number(
    weather.forecast?.totalRain
      ?? (Array.isArray(forecastSource.rain_sum) ? forecastSource.rain_sum.reduce((sum, value) => sum + Number(value || 0), 0) : 0)
  );
  const humiditySeries = Array.isArray(forecastSource.relative_humidity_2m_max) ? forecastSource.relative_humidity_2m_max : [];
  const tempSeries = Array.isArray(forecastSource.temperature_2m_max) ? forecastSource.temperature_2m_max : [];
  const humidDays = Number(weather.forecast?.humidDays ?? humiditySeries.filter((value) => Number(value || 0) >= 75).length);
  const warmDays = Number(
    weather.forecast?.warmDays
      ?? tempSeries.filter((value) => Number(value || 0) >= 24 && Number(value || 0) <= 30).length
  );
  const forecast = {
    totalRain,
    humidDays,
    warmDays,
    peakHumidity: Number(weather.forecast?.peakHumidity ?? Math.max(...humiditySeries, current.humidity || 0)),
    peakTemperature: Number(weather.forecast?.peakTemperature ?? Math.max(...tempSeries, current.temperature || 0)),
  };

  return {
    current,
    forecast,
    explanation: weather.explanation
      || `Humidity of ${current.humidity}% with ${current.temperature}C conditions and ${totalRain.toFixed(1)} mm forecast rain shapes pest and disease pressure for the next 7 days.`,
  };
}

function diseaseWeatherScore(disease, weatherContribution) {
  if (!weatherContribution?.current || !weatherContribution?.forecast) {
    return 12;
  }

  const profile = disease.weatherProfile;
  const { current, forecast } = weatherContribution;
  let score = 0;

  if (current.humidity >= profile.humidityMin) score += 12;
  if (current.humidity <= profile.humidityMax) score += 8;
  if (current.temperature >= profile.temperatureMin && current.temperature <= profile.temperatureMax) score += 18;
  if (forecast.totalRain >= profile.rainfallMin) score += 10;
  if (forecast.humidDays >= 3) score += 8;
  if (forecast.warmDays >= 3) score += 8;

  return clamp(score, 0, 64);
}

function computeDiagnoses({ farm, crop, symptom, affectedArea, uploadedImageName, weatherContribution, historyLog }) {
  const cropStage = deriveCropStage(crop, farm?.cropStage);
  const district = inferDistrict(farm);
  const imageBoost = uploadedImageName ? 6 : 0;

  const ranked = diseaseLibrary
    .map((disease) => {
      const cropMatch = disease.affectedCrops.includes(crop)
        ? 28
        : disease.affectedCrops.includes("Vegetables") && (crop === "Tomato" || crop === "Vegetables")
          ? 22
          : disease.affectedCrops.includes("Cereals") && (crop === "Maize" || crop === "Cereals")
            ? 20
            : 0;
      const symptomMatch = disease.symptomWeights[symptom] || 4;
      const weatherMatch = diseaseWeatherScore(disease, weatherContribution);
      const historyMatch = historyLog.filter(
        (entry) =>
          String(entry.pathogen || "").toLowerCase().includes(disease.scientificName.split(" ")[0].toLowerCase()) &&
          entry.district === district
      ).length;
      const historyBoost = clamp(historyMatch * 7, 0, 18);
      const areaBoost = Number(affectedArea || 0) * 0.18;
      const score = clamp(
        Math.round(cropMatch + symptomMatch + weatherMatch + historyBoost + areaBoost + imageBoost),
        16,
        98
      );

      return {
        ...disease,
        score,
        stageRelevance:
          cropStage.toLowerCase().includes("flower") || cropStage.toLowerCase().includes("bulking")
            ? 1.12
            : 1,
      };
    })
    .map((item) => ({
      ...item,
      weightedScore: clamp(Math.round(item.score * item.stageRelevance), 18, 99),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const top = ranked[0];
  const second = ranked[1];
  const confidence = clamp(
    Math.round(top.weightedScore - (second ? Math.max(0, second.weightedScore - 8) * 0.25 : 0)),
    54,
    97
  );

  const farmRiskScore = clamp(
    Math.round(top.weightedScore * 0.58 + Number(affectedArea || 0) * 0.32 + (weatherContribution?.forecast?.humidDays || 0) * 2),
    18,
    98
  );
  const regionalRiskScore = clamp(
    Math.round(top.weightedScore * 0.42 + (weatherContribution?.forecast?.totalRain || 0) * 1.1 + (weatherContribution?.forecast?.peakHumidity || 0) * 0.25),
    18,
    99
  );

  const yieldLoss = clamp(Math.round(farmRiskScore * 0.16 + Number(affectedArea || 0) * 0.12), 4, 38);
  const economics = cropEconomics[crop] || cropEconomics.Vegetables;
  const fieldArea = Number(farm?.farmSize || farm?.sizeHectares || 1);
  const economicLoss = Math.round(((economics.yieldPerHa * fieldArea * 1000 * economics.pricePerKg) * yieldLoss) / 100);

  const currentRisk = getRiskLabel(farmRiskScore);
  const forecastRiskScore = clamp(
    Math.round(farmRiskScore + (weatherContribution?.forecast?.humidDays || 0) * 4 + ((weatherContribution?.forecast?.totalRain || 0) > 18 ? 8 : 0)),
    20,
    99
  );
  const forecastRisk = getRiskLabel(forecastRiskScore);
  const priorityScore = clamp(
    Math.round(confidence * 0.35 + farmRiskScore * 0.35 + regionalRiskScore * 0.15 + Number(affectedArea || 0) * 0.15),
    20,
    100
  );
  const priority = getPriorityLabel(priorityScore);

  return {
    ranked,
    topDiagnosis: top,
    confidence,
    cropStage,
    currentRisk,
    forecastRisk,
    farmRiskScore,
    regionalRiskScore,
    yieldLoss,
    economicLoss,
    priority,
    district,
    explanation: {
      soil: `${farm?.landType || "Field"} conditions on ${farm?.farmName} increase canopy vulnerability where nutrient stress and moisture imbalance are present.`,
      weather: weatherContribution?.explanation || "Weather context is still being loaded for this farm.",
      market: `Potential economic loss is significant for ${crop} supply planning and market timing.`,
      stage: `${crop} is currently in the ${cropStage} stage, which raises sensitivity to ${top.name.toLowerCase()}.`,
      confidence: `Confidence combines symptom strength, crop fit, weather suitability, prior outbreaks in ${district}, and image evidence.`,
    },
    outbreakForecast: {
      currentRisk,
      predictedRisk: forecastRisk,
      confidence: clamp(Math.round(confidence - 4 + (weatherContribution?.forecast?.humidDays || 0)), 52, 96),
      drivers: `Humidity above ${weatherContribution?.forecast?.peakHumidity || weatherContribution?.current?.humidity || 0}% and ${(weatherContribution?.forecast?.totalRain || 0).toFixed(1)} mm of rain over the next 7 days increase outbreak pressure.`,
    },
  };
}

function buildDynamicRecommendation(diagnosisModel, farm, crop) {
  const top = diagnosisModel.topDiagnosis;
  return {
    recommendationId: `rec-${farm.id}-${top.id}`,
    diseaseName: top.name,
    actionType: "Pest/Disease",
    title: `Control ${top.name} on ${farm.farmName || farm.name}`,
    accepted: 0,
    rejected: 0,
    completed: 0,
    guidance: [
      `Scout ${farm.farmName || farm.name} within 24 hours and confirm ${top.name.toLowerCase()} hotspots.`,
      `Apply the primary intervention suited to ${crop}: ${top.treatment.chemical}.`,
      "Reassess in 3-5 days and update image evidence if symptoms expand.",
    ],
  };
}

function mapDiagnosisRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    farmId: record.farmId,
    crop: record.cropName,
    symptom: record.symptom,
    affectedArea: record.affectedArea,
    uploadedImageName: record.uploadedImageName || "",
    topDiagnosis: record.topDiagnosis || null,
    ranked: Array.isArray(record.rankedDiagnoses) ? record.rankedDiagnoses : [],
    confidence: record.confidence,
    cropStage: record.cropStage,
    currentRisk: record.currentRisk,
    forecastRisk: record.forecastRisk,
    farmRiskScore: record.farmRiskScore,
    regionalRiskScore: record.regionalRiskScore,
    yieldLoss: record.yieldLoss,
    economicLoss: Number(record.economicLoss || 0),
    priority: record.priority,
    district: record.district,
    explanation: record.explanation || {},
    outbreakForecast: record.outbreakForecast || {},
    recommendation: record.recommendation || {},
    weatherContribution: record.weatherContribution || {},
    diseaseName: record.diseaseName,
    scientificName: record.scientificName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapActionLogRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    diagnosisId: record.diagnosisId,
    farmId: record.farmId,
    recommendationId: record.recommendationId,
    actionType: record.actionType,
    feedbackStatus: record.feedbackStatus,
    rejectionReason: record.rejectionReason || "",
    timestamp: record.createdAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildHistoryRowFromDiagnosis(diagnosis) {
  const dateValue = diagnosis.createdAt || new Date().toISOString();
  return {
    id: diagnosis.id,
    date: dateValue,
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(dateValue)),
    pathogen: diagnosis.scientificName || diagnosis.topDiagnosis?.scientificName || diagnosis.diseaseName,
    severity: diagnosis.currentRisk,
    action: diagnosis.priority === "Critical" ? "Immediate field intervention" : "Guided field scouting",
    district: diagnosis.district,
  };
}

async function listDiseaseLibrary({ crop, search } = {}) {
  const query = String(search || "").toLowerCase().trim();
  return diseaseLibrary.filter((item) => {
    const cropMatch = crop ? item.affectedCrops.includes(crop) : true;
    const searchMatch = !query
      || item.name.toLowerCase().includes(query)
      || item.scientificName.toLowerCase().includes(query)
      || item.affectedCrops.join(" ").toLowerCase().includes(query);
    return cropMatch && searchMatch;
  });
}

async function analyzePestRisk(user, farmId, payload) {
  const farm = await ensureFarmAccess(user, farmId);
  const storedHistory = await prisma.pestDiagnosis.findMany({
    where: {
      OR: [
        { farmId },
        { district: inferDistrict(farm) },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  const historyLog = [
    ...storedHistory.map((entry) => buildHistoryRowFromDiagnosis(mapDiagnosisRecord(entry))),
    ...outbreakHistorySeed,
  ].slice(0, 24);

  const weatherContribution = buildWeatherContribution(payload.weatherContribution);
  const diagnosisModel = computeDiagnoses({
    farm,
    crop: payload.crop,
    symptom: payload.symptom,
    affectedArea: payload.affectedArea,
    uploadedImageName: payload.uploadedImageName,
    weatherContribution,
    historyLog,
  });

  const recommendation = buildDynamicRecommendation(diagnosisModel, farm, payload.crop);

  const created = await prisma.pestDiagnosis.create({
    data: {
      farmId,
      cropName: payload.crop,
      symptom: payload.symptom,
      affectedArea: Math.round(Number(payload.affectedArea || 0)),
      uploadedImageName: payload.uploadedImageName || null,
      diseaseName: diagnosisModel.topDiagnosis.name,
      scientificName: diagnosisModel.topDiagnosis.scientificName,
      confidence: diagnosisModel.confidence,
      currentRisk: diagnosisModel.currentRisk,
      forecastRisk: diagnosisModel.forecastRisk,
      farmRiskScore: diagnosisModel.farmRiskScore,
      regionalRiskScore: diagnosisModel.regionalRiskScore,
      yieldLoss: diagnosisModel.yieldLoss,
      economicLoss: diagnosisModel.economicLoss,
      priority: diagnosisModel.priority,
      district: diagnosisModel.district,
      cropStage: diagnosisModel.cropStage,
      weatherContribution,
      topDiagnosis: diagnosisModel.topDiagnosis,
      rankedDiagnoses: diagnosisModel.ranked,
      explanation: diagnosisModel.explanation,
      outbreakForecast: diagnosisModel.outbreakForecast,
      recommendation,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "PEST_DIAGNOSIS_GENERATED",
    entityType: "PestDiagnosis",
    entityId: created.id,
    details: {
      farmName: farm.farmName,
      crop: payload.crop,
      disease: diagnosisModel.topDiagnosis.name,
      priority: diagnosisModel.priority,
    },
  });

  const mapped = mapDiagnosisRecord(created);
  return {
    ...mapped,
    historyLog: historyLog.slice(0, 10),
    library: diseaseLibrary,
  };
}

async function getLatestDiagnosis(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const record = await prisma.pestDiagnosis.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
  });
  return mapDiagnosisRecord(record);
}

async function getFarmDiagnosisHistory(user, farmId) {
  await ensureFarmAccess(user, farmId);
  const records = await prisma.pestDiagnosis.findMany({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const persisted = records.map((record) => buildHistoryRowFromDiagnosis(mapDiagnosisRecord(record)));
  return [...persisted, ...outbreakHistorySeed].slice(0, 20);
}

async function getDiagnosisActions(user, diagnosisId) {
  const diagnosis = await prisma.pestDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: {
      farm: {
        include: {
          farmerProfile: {
            include: { user: true },
          },
        },
      },
      actionLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!diagnosis) {
    throw new ApiError(404, "Pest diagnosis not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = diagnosis.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this pest diagnosis.");
  }

  return diagnosis.actionLogs.map(mapActionLogRecord);
}

async function addDiagnosisAction(user, diagnosisId, payload) {
  const diagnosis = await prisma.pestDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: {
      farm: {
        include: {
          farmerProfile: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!diagnosis) {
    throw new ApiError(404, "Pest diagnosis not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = diagnosis.farm?.farmerProfile?.userId === user.id;
  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to update this pest diagnosis.");
  }

  const created = await prisma.pestActionLog.create({
    data: {
      diagnosisId,
      farmId: diagnosis.farmId,
      recommendationId: payload.recommendationId,
      actionType: payload.actionType || "Pest/Disease",
      feedbackStatus: payload.feedbackStatus,
      rejectionReason: payload.feedbackStatus === "rejected" ? payload.rejectionReason || "" : null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "PEST_ACTION_RECORDED",
    entityType: "PestActionLog",
    entityId: created.id,
    details: {
      diagnosisId,
      feedbackStatus: payload.feedbackStatus,
      recommendationId: payload.recommendationId,
    },
  });

  return mapActionLogRecord(created);
}

module.exports = {
  analyzePestRisk,
  getLatestDiagnosis,
  getFarmDiagnosisHistory,
  addDiagnosisAction,
  getDiagnosisActions,
  listDiseaseLibrary,
};
