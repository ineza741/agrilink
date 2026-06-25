const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const cropProfiles = {
  Maize: {
    kc: {
      Establishment: 0.45,
      Vegetative: 0.85,
      Flowering: 1.15,
      "Grain Fill": 0.95,
      "Harvest Preparation": 0.6,
    },
    nutrientNeed: { n: 155, p: 58, k: 72 },
    baseWaterLPerHa: 4600,
  },
  "Hybrid Corn": {
    kc: {
      Establishment: 0.48,
      Vegetative: 0.88,
      Flowering: 1.2,
      "Grain Fill": 1,
      "Harvest Preparation": 0.62,
    },
    nutrientNeed: { n: 168, p: 62, k: 76 },
    baseWaterLPerHa: 4850,
  },
  Potato: {
    kc: {
      Establishment: 0.5,
      Vegetative: 0.82,
      Flowering: 1.05,
      "Grain Fill": 1.08,
      "Harvest Preparation": 0.72,
    },
    nutrientNeed: { n: 138, p: 68, k: 168 },
    baseWaterLPerHa: 4300,
  },
  Beans: {
    kc: {
      Establishment: 0.4,
      Vegetative: 0.72,
      Flowering: 0.98,
      "Grain Fill": 0.88,
      "Harvest Preparation": 0.55,
    },
    nutrientNeed: { n: 54, p: 42, k: 58 },
    baseWaterLPerHa: 3200,
  },
  Soybeans: {
    kc: {
      Establishment: 0.42,
      Vegetative: 0.74,
      Flowering: 1,
      "Grain Fill": 0.9,
      "Harvest Preparation": 0.58,
    },
    nutrientNeed: { n: 42, p: 40, k: 62 },
    baseWaterLPerHa: 3300,
  },
  Wheat: {
    kc: {
      Establishment: 0.38,
      Vegetative: 0.72,
      Flowering: 1,
      "Grain Fill": 0.88,
      "Harvest Preparation": 0.55,
    },
    nutrientNeed: { n: 118, p: 48, k: 42 },
    baseWaterLPerHa: 3500,
  },
};

const fertilizerTypes = {
  "Precision NPK": { n: 0.17, p: 0.17, k: 0.17, pricePerKg: 780, label: "Balanced NPK" },
  "Urea + DAP": { n: 0.28, p: 0.12, k: 0.0, pricePerKg: 720, label: "Nitrogen-Phosphorus blend" },
  "Organic Blend": { n: 0.08, p: 0.04, k: 0.05, pricePerKg: 360, label: "Compost and organic amendment" },
  "Potassium Booster": { n: 0.05, p: 0.03, k: 0.24, pricePerKg: 690, label: "Potassium-led support" },
};

const stageTiming = {
  Establishment: {
    nitrogen: "Apply a starter split 5-7 days after emergence.",
    phosphorus: "Apply before planting or at planting for root establishment.",
    potassium: "Apply basal dose before planting where potassium is low.",
  },
  Vegetative: {
    nitrogen: "Apply nitrogen during vegetative stage to support canopy expansion.",
    phosphorus: "Use phosphorus only if soil values remain low after planting.",
    potassium: "Support potassium now if crop vigour or stalk strength is weak.",
  },
  Flowering: {
    nitrogen: "Use only a light corrective split if severe nitrogen stress is present.",
    phosphorus: "Phosphorus should already be incorporated before flowering.",
    potassium: "Apply potassium during flowering/tuber formation to protect yield set.",
  },
  "Grain Fill": {
    nitrogen: "Avoid heavy nitrogen during grain fill unless severe deficiency is confirmed.",
    phosphorus: "No further phosphorus is usually needed during grain fill.",
    potassium: "Use potassium support during grain fill where tissue stress remains high.",
  },
  "Harvest Preparation": {
    nitrogen: "Avoid nitrogen near harvest to prevent unnecessary vegetative regrowth.",
    phosphorus: "No further phosphorus application is needed this close to harvest.",
    potassium: "Potassium should only be applied if quality loss risk is confirmed.",
  },
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

function getCropProfile(crop) {
  return cropProfiles[crop] || cropProfiles.Maize;
}

function getFertilizerProfile(type) {
  return fertilizerTypes[type] || fertilizerTypes["Precision NPK"];
}

function getCropCoefficient(crop, stage) {
  const profile = getCropProfile(crop);
  return profile.kc[stage] || profile.kc.Vegetative || 0.8;
}

function getDefaultGrowthStage(crop) {
  const stages = Object.keys(getCropProfile(crop).kc);
  return stages.includes("Vegetative") ? "Vegetative" : stages[0];
}

function buildSoilDeficiency(soil) {
  return {
    phStatus: soil.ph >= 6 && soil.ph <= 7 ? "Balanced" : soil.ph < 6 ? "Acidic" : "Alkaline",
    nitrogenStatus: soil.nitrogen >= 50 ? "Adequate" : soil.nitrogen >= 38 ? "Moderate" : "Low",
    phosphorusStatus: soil.phosphorus >= 26 ? "Adequate" : soil.phosphorus >= 18 ? "Moderate" : "Low",
    potassiumStatus: soil.potassium >= 30 ? "Adequate" : soil.potassium >= 22 ? "Moderate" : "Low",
  };
}

function calculateEffectiveRainfall(rainSum) {
  if (rainSum <= 0) return 0;
  if (rainSum <= 20) return rainSum * 0.82;
  if (rainSum <= 40) return rainSum * 0.7;
  return rainSum * 0.58;
}

function rainProbabilityPeak(values) {
  return Math.max(...(values.length ? values : [0]));
}

function buildFarmInclude() {
  return {
    farmerProfile: {
      include: {
        user: true,
      },
    },
  };
}

async function getFarmForAccess(user, farmId) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: buildFarmInclude(),
  });

  if (!farm) {
    throw new ApiError(404, "Farm not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = farm.farmerProfile?.userId === user.id;

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this irrigation advisory.");
  }

  return farm;
}

async function getReminderForAccess(user, reminderId) {
  const reminder = await prisma.farmReminder.findUnique({
    where: { id: reminderId },
    include: {
      farm: {
        include: buildFarmInclude(),
      },
      advisory: {
        include: {
          scheduleEntries: {
            orderBy: {
              dateKey: "asc",
            },
          },
        },
      },
    },
  });

  if (!reminder) {
    throw new ApiError(404, "Reminder not found.");
  }

  const isPrivileged = user.role === "Admin" || user.role === "ExtensionOfficer";
  const isOwner = reminder.farm?.farmerProfile?.userId === user.id;

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this reminder.");
  }

  return reminder;
}

function buildSoilProfileFromSources(payloadSoil, latestSoilTest, farm) {
  if (latestSoilTest) {
    return {
      ph: Number(latestSoilTest.ph),
      nitrogen: Number(latestSoilTest.nitrogen),
      phosphorus: Number(latestSoilTest.phosphorus),
      potassium: Number(latestSoilTest.potassium),
      organicMatter: Number(latestSoilTest.organicMatter),
      texture: latestSoilTest.texture || payloadSoil.texture || farm.soilType || farm.landType || "Loamy",
      source: "Using uploaded lab data",
    };
  }

  return {
    ph: Number(payloadSoil.ph),
    nitrogen: Number(payloadSoil.nitrogen),
    phosphorus: Number(payloadSoil.phosphorus),
    potassium: Number(payloadSoil.potassium),
    organicMatter: Number(payloadSoil.organicMatter),
    texture: payloadSoil.texture || farm.soilType || farm.landType || "Loamy",
    source: payloadSoil.source || "Using estimated soil data from location",
  };
}

function buildAdvisorySnapshot({ farm, payload, weather, soilProfile, reminders }) {
  const crop = payload.crop || farm.currentCrop || "Maize";
  const cropStage = payload.cropStage || farm.cropStage || getDefaultGrowthStage(crop);
  const irrigationType = payload.irrigationType || "Manual Irrigation";
  const cropProfile = getCropProfile(crop);
  const fertilizerProfile = getFertilizerProfile(payload.fertilizerType);
  const soilStatus = buildSoilDeficiency(soilProfile);
  const current = weather?.current || {};
  const daily = weather?.daily || {};

  const currentTemp = Number(current.temperature_2m ?? 0);
  const currentHumidity = Number(current.relative_humidity_2m ?? 0);
  const currentRain = Number(current.rain ?? current.precipitation ?? 0);
  const currentWind = Number(current.wind_speed_10m ?? 0);
  const dailyRain = (daily.rain_sum || daily.precipitation_sum || []).map((value) => Number(value || 0));
  const dailyRainProbability = (daily.precipitation_probability_max || []).map((value) => Number(value || 0));
  const dailyEt0 = (daily.et0_fao_evapotranspiration || []).map((value) => Number(value || 0));
  const dailyMaxTemp = (daily.temperature_2m_max || []).map((value) => Number(value || 0));

  const kc = getCropCoefficient(crop, cropStage);
  const avgReferenceEt = dailyEt0.length
    ? dailyEt0.reduce((sum, value) => sum + value, 0) / dailyEt0.length
    : clamp(3.4 + currentTemp * 0.08 - currentHumidity * 0.02 + currentWind * 0.04, 2.8, 6.8);
  const cropEt = Number((avgReferenceEt * kc).toFixed(2));
  const totalRain = Number(dailyRain.reduce((sum, value) => sum + value, 0).toFixed(1));
  const effectiveRain = Number(calculateEffectiveRainfall(totalRain).toFixed(1));
  const waterNeedMm = Number(clamp(cropEt * 7 - effectiveRain, 0, 65).toFixed(1));
  const waterRequirementPerHa = Math.round(clamp(waterNeedMm * 10, 0, 650));
  const moisturePenalty = clamp((52 - payload.soilMoisture) * 0.55, -8, 18);
  const adjustedWaterRequirementPerHa = Math.round(clamp(waterRequirementPerHa + moisturePenalty * 10, 0, 720));
  const waterRequirementTotal = Math.round(adjustedWaterRequirementPerHa * Number(farm.farmSize || 1));
  const weatherRisk = dailyMaxTemp.some((value) => value >= 32) || currentTemp >= 31 ? "High" : totalRain < 10 ? "Medium" : "Low";

  const deficiencyN = clamp(cropProfile.nutrientNeed.n - soilProfile.nitrogen, 0, cropProfile.nutrientNeed.n);
  const deficiencyP = clamp(cropProfile.nutrientNeed.p - soilProfile.phosphorus, 0, cropProfile.nutrientNeed.p);
  const deficiencyK = clamp(cropProfile.nutrientNeed.k - soilProfile.potassium, 0, cropProfile.nutrientNeed.k);

  const targetYieldFactor = clamp(Number(payload.targetYield || 0) / Math.max(1, cropProfile.baseWaterLPerHa / 400), 0.6, 1.5);
  const requiredN = Math.round(deficiencyN * targetYieldFactor);
  const requiredP = Math.round(deficiencyP * targetYieldFactor);
  const requiredK = Math.round(deficiencyK * targetYieldFactor);
  const totalNutrientDemand = requiredN + requiredP + requiredK;

  const recommendedFertilizerAmountKgHa =
    fertilizerProfile.n + fertilizerProfile.p + fertilizerProfile.k > 0
      ? Math.round(
          clamp(
            totalNutrientDemand /
              Math.max(0.05, fertilizerProfile.n + fertilizerProfile.p + fertilizerProfile.k),
            0,
            1250,
          ),
        )
      : 0;

  const fertilizerCost = Math.round(recommendedFertilizerAmountKgHa * farm.farmSize * fertilizerProfile.pricePerKg);
  const waterPumpingCost = Math.round((waterRequirementTotal / 1000) * 850);
  const laborCost = Math.round(18000 + Number(farm.farmSize || 1) * 6200);
  const totalCost = waterPumpingCost + fertilizerCost + laborCost;
  const budgetRemaining = Math.round(Number(payload.budget || 0) - totalCost);
  const budgetStatus = budgetRemaining >= 0 ? "Within Budget" : "Budget Pressure";

  const waterConservationAdvice = [];
  if (dailyRainProbability.some((value) => value >= 60)) {
    waterConservationAdvice.push("Reduce irrigation if rainfall probability is high.");
  }
  if (payload.soilMoisture <= 30) {
    waterConservationAdvice.push("Use mulch because soil moisture is low.");
  }
  waterConservationAdvice.push("Irrigate early morning or evening to reduce evaporative losses.");
  if (/drip/i.test(irrigationType || "")) {
    waterConservationAdvice.push("Current field already benefits from drip irrigation efficiency.");
  } else {
    waterConservationAdvice.push("Apply drip irrigation where possible to conserve water.");
  }

  const scheduleDates = (daily.time || []).slice(0, 7).map((date, index) => {
    const rain = dailyRain[index] || 0;
    const rainProbability = dailyRainProbability[index] || 0;
    const etValue = dailyEt0[index] || avgReferenceEt;
    const effectiveDailyRain = calculateEffectiveRainfall(rain);
    const dailyCropEt = etValue * kc;
    const dailyNeedMm = clamp(
      dailyCropEt - effectiveDailyRain + clamp((48 - payload.soilMoisture) * 0.04, -1.2, 2.8),
      0,
      12,
    );
    const recommendedMm = Number(dailyNeedMm.toFixed(1));
    const scheduled = recommendedMm >= 2.4 || rainProbability < 25;
    const reason =
      recommendedMm <= 1.5
        ? "Rainfall is likely to cover most of the crop water need."
        : rainProbability >= 55
          ? "Rain is expected, so irrigation is reduced to avoid overwatering."
          : "Crop evapotranspiration exceeds effective rainfall and soil moisture support.";
    const existingReminder = reminders.find((item) => item.dateKey === date && item.farmId === farm.id);

    return {
      dateKey: date,
      crop,
      growthStage: cropStage,
      waterRequirement: Math.round(recommendedMm * 10 * Number(farm.farmSize || 1)),
      recommendedMm,
      rainfallForecast: Number(rain.toFixed(1)),
      rainfallProbability: rainProbability,
      evapotranspiration: Number(etValue.toFixed(1)),
      soilMoisture: Number(payload.soilMoisture),
      reason,
      scheduled,
      status: existingReminder?.status || (scheduled ? "Pending" : "Skipped"),
      reminderId: existingReminder?.id || "",
      explanation: `Based on crop stage, evapotranspiration, rainfall forecast, and soil moisture, ${recommendedMm.toFixed(
        1,
      )} mm is recommended for ${date}.`,
    };
  });

  const upcomingActivities = reminders
    .filter((item) => item.farmId === farm.id)
    .map((item) => {
      const matched = scheduleDates.find((entry) => entry.dateKey === item.dateKey);
      return {
        id: item.id,
        task: item.type === "fertilizer" ? "Fertilizer reminder" : "Irrigation reminder",
        field: farm.farmName,
        dueDate: item.dateKey,
        priority: item.priority || (matched?.recommendedMm >= 5 ? "High" : "Medium"),
        status: item.status,
      };
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const nitrogenTiming = stageTiming[cropStage]?.nitrogen || stageTiming.Vegetative.nitrogen;
  const phosphorusTiming = stageTiming[cropStage]?.phosphorus || stageTiming.Vegetative.phosphorus;
  const potassiumTiming = stageTiming[cropStage]?.potassium || stageTiming.Vegetative.potassium;

  const cheaperAlternative =
    budgetRemaining < 0
      ? payload.fertilizerType !== "Organic Blend"
        ? "Switch part of the plan to Organic Blend and split nitrogen into smaller applications."
        : "Reduce one irrigation pulse and use targeted band placement for fertilizer to save cost."
      : "";

  return {
    crop,
    cropStage,
    soilProfile,
    soilStatus,
    cropCoefficient: kc,
    referenceEt: Number(avgReferenceEt.toFixed(2)),
    cropEt,
    totalRain,
    effectiveRain,
    waterRequirementPerHa: adjustedWaterRequirementPerHa,
    waterRequirementTotal,
    weatherRisk,
    currentWeather: {
      temperature: currentTemp,
      humidity: currentHumidity,
      rainfall: currentRain,
      wind: currentWind,
      weatherRisk,
    },
    scheduleDates,
    waterConservationAdvice,
    fertilizer: {
      fertilizerType: payload.fertilizerType,
      requiredNutrientAmount: { n: requiredN, p: requiredP, k: requiredK },
      recommendedFertilizerAmountKgHa,
      applicationTiming: {
        nitrogen: nitrogenTiming,
        phosphorus: phosphorusTiming,
        potassium: potassiumTiming,
      },
      availableBudget: Number(payload.budget || 0),
      budgetStatus,
    },
    costs: {
      waterPumpingCost,
      fertilizerCost,
      laborCost,
      totalCost,
      budgetRemaining,
      cheaperAlternative,
    },
    resourceMonitoring: [
      {
        label: "Water Usage",
        percent: clamp(Math.round((waterRequirementTotal / Math.max(1, farm.farmSize * 7200)) * 100), 5, 100),
        detail: `${waterRequirementTotal.toLocaleString()} L scheduled`,
      },
      {
        label: "Fertilizer Usage",
        percent: clamp(Math.round((recommendedFertilizerAmountKgHa / 800) * 100), 5, 100),
        detail: `${recommendedFertilizerAmountKgHa} kg/ha planned`,
      },
      {
        label: "Fuel Consumption",
        percent: clamp(Math.round((waterPumpingCost / Math.max(1, Number(payload.budget || 1))) * 100), 4, 100),
        detail: `${formatRwf(waterPumpingCost)} pumping energy`,
      },
      {
        label: "Irrigation Efficiency",
        percent: clamp(
          Math.round(
            78 +
              (/drip/i.test(irrigationType || "") ? 14 : 4) -
              (rainProbabilityPeak(dailyRainProbability) > 60 ? 6 : 0),
          ),
          45,
          98,
        ),
        detail: /drip/i.test(irrigationType || "")
          ? "Drip system efficiency advantage"
          : "Conventional field distribution",
      },
    ],
    explanationLabel: "Based on crop stage, evapotranspiration, rainfall forecast, and soil moisture.",
    upcomingActivities,
    sensorNotice:
      payload.sensorMode === "sensor"
        ? "Manual tracking enabled. IoT sensor integration is optional."
        : "Manual tracking enabled. Update moisture whenever field observations change.",
    weatherLabel: payload.weatherLabel || "Live Weather Data",
    soilLabel: payload.soilLabel || "Local Data",
    advisoryNotice: payload.notice || "",
  };
}

function mapReminderRecord(record) {
  if (!record) return null;

  return {
    id: record.id,
    farmId: record.farmId,
    advisoryId: record.advisoryId,
    dateKey: record.dateKey,
    type: record.type,
    priority: record.priority,
    status: record.status,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapIrrigationAdvisoryRecord(record) {
  if (!record) return null;

  return {
    id: record.id,
    farmId: record.farmId,
    sourceMode: record.sourceMode,
    crop: record.cropName,
    cropStage: record.cropStage,
    weatherLabel: record.weatherSourceLabel,
    soilLabel: record.soilSourceLabel,
    targetYield: Number(record.targetYield || 0),
    fertilizerType: record.fertilizerType,
    budget: Number(record.availableBudget || 0),
    soilMoisture: Number(record.soilMoisture || 0),
    sensorMode: record.sensorMode,
    referenceEt: Number(record.referenceEt || 0),
    cropCoefficient: Number(record.cropCoefficient || 0),
    cropEt: Number(record.cropEt || 0),
    totalRain: Number(record.totalRain || 0),
    effectiveRain: Number(record.effectiveRain || 0),
    waterRequirementPerHa: Number(record.waterRequirementPerHa || 0),
    waterRequirementTotal: Number(record.waterRequirementTotal || 0),
    weatherRisk: record.weatherRisk,
    soilStatus: record.soilStatus || {},
    currentWeather: record.currentWeather || {},
    fertilizer: record.fertilizerSummary || {},
    costs: record.costSummary || {},
    resourceMonitoring: Array.isArray(record.resourceMonitoring) ? record.resourceMonitoring : [],
    waterConservationAdvice: Array.isArray(record.waterConservationAdvice) ? record.waterConservationAdvice : [],
    explanationLabel: record.explanationLabel || "",
    advisoryNotice: record.advisoryNotice || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scheduleDates: Array.isArray(record.scheduleEntries)
      ? record.scheduleEntries.map((entry) => ({
          id: entry.id,
          advisoryId: entry.advisoryId,
          dateKey: entry.dateKey,
          crop: entry.crop,
          growthStage: entry.growthStage,
          waterRequirement: Number(entry.waterRequirement || 0),
          recommendedMm: Number(entry.recommendedMm || 0),
          rainfallForecast: Number(entry.rainfallForecast || 0),
          rainfallProbability: Number(entry.rainfallProbability || 0),
          evapotranspiration: Number(entry.evapotranspiration || 0),
          soilMoisture: Number(entry.soilMoisture || 0),
          reason: entry.reason,
          scheduled: Boolean(entry.scheduled),
          status: entry.status,
          explanation: entry.explanation || "",
        }))
      : [],
  };
}

async function calculateIrrigationAdvisory(user, farmId, payload) {
  const farm = await getFarmForAccess(user, farmId);
  const [latestSoilTest, reminders] = await Promise.all([
    prisma.soilTest.findFirst({
      where: { farmId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.farmReminder.findMany({
      where: { farmId },
      orderBy: { dateKey: "asc" },
    }),
  ]);

  const soilProfile = buildSoilProfileFromSources(payload.soilProfile, latestSoilTest, farm);
  const advisorySnapshot = buildAdvisorySnapshot({
    farm,
    payload,
    weather: payload.weather,
    soilProfile,
    reminders: reminders.map(mapReminderRecord),
  });

  const created = await prisma.irrigationAdvisory.create({
    data: {
      farmId,
      cropName: advisorySnapshot.crop,
      cropStage: advisorySnapshot.cropStage,
      weatherSourceLabel: advisorySnapshot.weatherLabel,
      soilSourceLabel: soilProfile.source || advisorySnapshot.soilLabel,
      targetYield: Number(payload.targetYield || 0),
      fertilizerType: payload.fertilizerType,
      availableBudget: Number(payload.budget || 0),
      soilMoisture: Number(payload.soilMoisture || 0),
      sensorMode: payload.sensorMode || "manual",
      referenceEt: advisorySnapshot.referenceEt,
      cropCoefficient: advisorySnapshot.cropCoefficient,
      cropEt: advisorySnapshot.cropEt,
      totalRain: advisorySnapshot.totalRain,
      effectiveRain: advisorySnapshot.effectiveRain,
      waterRequirementPerHa: advisorySnapshot.waterRequirementPerHa,
      waterRequirementTotal: advisorySnapshot.waterRequirementTotal,
      weatherRisk: advisorySnapshot.weatherRisk,
      soilStatus: advisorySnapshot.soilStatus,
      currentWeather: advisorySnapshot.currentWeather,
      fertilizerSummary: advisorySnapshot.fertilizer,
      costSummary: advisorySnapshot.costs,
      resourceMonitoring: advisorySnapshot.resourceMonitoring,
      waterConservationAdvice: advisorySnapshot.waterConservationAdvice,
      explanationLabel: advisorySnapshot.explanationLabel,
      advisoryNotice: advisorySnapshot.advisoryNotice,
      scheduleEntries: {
        create: advisorySnapshot.scheduleDates.map((entry) => ({
          dateKey: entry.dateKey,
          crop: entry.crop,
          growthStage: entry.growthStage,
          waterRequirement: entry.waterRequirement,
          recommendedMm: entry.recommendedMm,
          rainfallForecast: entry.rainfallForecast,
          rainfallProbability: entry.rainfallProbability,
          evapotranspiration: entry.evapotranspiration,
          soilMoisture: entry.soilMoisture,
          reason: entry.reason,
          scheduled: entry.scheduled,
          status: entry.status,
          explanation: entry.explanation,
        })),
      },
    },
    include: {
      scheduleEntries: {
        orderBy: {
          dateKey: "asc",
        },
      },
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "IRRIGATION_ADVISORY_CALCULATED",
    entityType: "IrrigationAdvisory",
    entityId: created.id,
    details: {
      farmName: farm.farmName,
      crop: advisorySnapshot.crop,
      cropStage: advisorySnapshot.cropStage,
    },
  });

  return mapIrrigationAdvisoryRecord(created);
}

async function getLatestIrrigationAdvisory(user, farmId) {
  await getFarmForAccess(user, farmId);

  const advisory = await prisma.irrigationAdvisory.findFirst({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    include: {
      scheduleEntries: {
        orderBy: { dateKey: "asc" },
      },
    },
  });

  return mapIrrigationAdvisoryRecord(advisory);
}

async function listFarmReminders(user, farmId) {
  await getFarmForAccess(user, farmId);

  const reminders = await prisma.farmReminder.findMany({
    where: { farmId },
    orderBy: [{ dateKey: "asc" }, { createdAt: "desc" }],
  });

  return reminders.map(mapReminderRecord);
}

async function createFarmReminder(user, farmId, payload) {
  const farm = await getFarmForAccess(user, farmId);

  if (payload.advisoryId) {
    const advisory = await prisma.irrigationAdvisory.findUnique({
      where: { id: payload.advisoryId },
    });

    if (!advisory || advisory.farmId !== farmId) {
      throw new ApiError(400, "Selected advisory does not belong to this farm.");
    }
  }

  const reminder = await prisma.farmReminder.create({
    data: {
      farmId,
      advisoryId: payload.advisoryId || null,
      dateKey: payload.dateKey,
      type: payload.type,
      priority: payload.priority || (payload.type === "fertilizer" ? "High" : "Medium"),
      status: payload.status || "Pending",
      note: payload.note || null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "FARM_REMINDER_CREATED",
    entityType: "FarmReminder",
    entityId: reminder.id,
    details: {
      farmName: farm.farmName,
      type: payload.type,
      dateKey: payload.dateKey,
    },
  });

  return mapReminderRecord(reminder);
}

async function updateFarmReminder(user, reminderId, payload) {
  const reminder = await getReminderForAccess(user, reminderId);

  if (payload.advisoryId) {
    const advisory = await prisma.irrigationAdvisory.findUnique({
      where: { id: payload.advisoryId },
    });

    if (!advisory || advisory.farmId !== reminder.farmId) {
      throw new ApiError(400, "Selected advisory does not belong to the same farm as this reminder.");
    }
  }

  const updated = await prisma.farmReminder.update({
    where: { id: reminderId },
    data: {
      ...(payload.dateKey ? { dateKey: payload.dateKey } : {}),
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.priority ? { priority: payload.priority } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
      ...(payload.advisoryId !== undefined ? { advisoryId: payload.advisoryId || null } : {}),
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "FARM_REMINDER_UPDATED",
    entityType: "FarmReminder",
    entityId: updated.id,
    details: {
      status: updated.status,
      dateKey: updated.dateKey,
    },
  });

  return mapReminderRecord(updated);
}

async function deleteFarmReminder(user, reminderId) {
  const reminder = await getReminderForAccess(user, reminderId);

  await prisma.farmReminder.delete({
    where: { id: reminderId },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "FARM_REMINDER_DELETED",
    entityType: "FarmReminder",
    entityId: reminderId,
    details: {
      type: reminder.type,
      dateKey: reminder.dateKey,
    },
  });

  return { deleted: true, id: reminderId };
}

module.exports = {
  calculateIrrigationAdvisory,
  getLatestIrrigationAdvisory,
  listFarmReminders,
  createFarmReminder,
  updateFarmReminder,
  deleteFarmReminder,
};
