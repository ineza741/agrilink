import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplets,
  FlaskConical,
  Info,
  Leaf,
  RadioTower,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";

const IRRIGATION_STORAGE_KEY = "agri-feed-irrigation-module-v1";

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

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(IRRIGATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(IRRIGATION_STORAGE_KEY, JSON.stringify(state));
}

function createDefaultFarm() {
  return {
    id: "irrigation-default-farm",
    name: "Primary Irrigation Plot",
    region: "Northern Highlands",
    sizeHectares: 12,
    landType: "Loamy",
    irrigationType: "Drip Irrigation",
    primaryCrop: "Maize",
    location: { lat: -1.94, lng: 29.87, label: "Primary irrigation block" },
  };
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
  const depth = (Array.isArray(layer.depths) && layer.depths[0]) || layer.depth || {};
  const values = depth.values || layer.values || {};
  return values.mean ?? values.median ?? values["Q0.5"] ?? null;
}

function normalizePh(rawValue) {
  if (rawValue == null) return 6.3;
  return rawValue > 14 ? rawValue / 10 : rawValue;
}

function convertOrganicMatter(rawSoc) {
  if (rawSoc == null) return 2.4;
  const socBase = rawSoc > 20 ? rawSoc / 10 : rawSoc;
  return clamp(Number((socBase * 0.1724).toFixed(1)), 1.2, 5.4);
}

function convertNitrogen(rawNitrogen, organicMatter) {
  if (rawNitrogen == null) {
    return clamp(Math.round(18 + organicMatter * 8), 18, 48);
  }
  const scaled =
    rawNitrogen < 5 ? rawNitrogen * 10 + 8 : rawNitrogen > 100 ? rawNitrogen / 10 : rawNitrogen;
  return clamp(Math.round(scaled), 12, 58);
}

function parseSoilEstimate(payload, selectedFarm) {
  const ph = normalizePh(parseSoilGridsValue(payload, "phh2o"));
  const soc = parseSoilGridsValue(payload, "soc");
  const nitrogenRaw = parseSoilGridsValue(payload, "nitrogen");
  const clay = Number(parseSoilGridsValue(payload, "clay") || 28);
  const cec = Number(parseSoilGridsValue(payload, "cec") || 12);
  const organicMatter = convertOrganicMatter(soc);
  const nitrogen = convertNitrogen(nitrogenRaw, organicMatter);
  const phosphorus = clamp(Math.round(14 + cec * 0.65 + organicMatter * 1.4), 12, 32);
  const potassium = clamp(Math.round(12 + clay * 0.12 + cec * 0.75), 14, 38);

  return {
    ph: Number(ph.toFixed(1)),
    nitrogen,
    phosphorus,
    potassium,
    organicMatter,
    texture: selectedFarm?.landType || "Loamy",
    source: "SoilGrids fallback from farm coordinates",
  };
}

function getCropProfile(crop) {
  return cropProfiles[crop] || cropProfiles.Maize;
}

function getFertilizerProfile(type) {
  return fertilizerTypes[type] || fertilizerTypes["Precision NPK"];
}

function getCropStageOptions(crop) {
  return Object.keys(getCropProfile(crop).kc);
}

function getCropCoefficient(crop, stage) {
  const profile = getCropProfile(crop);
  return profile.kc[stage] || profile.kc.Vegetative || 0.8;
}

function buildDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildCalendarGrid(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    const date = new Date(year, month - 1, daysInPreviousMonth - index);
    cells.push({ day: date.getDate(), currentMonth: false, dateKey: buildDateKey(date) });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ day, currentMonth: true, dateKey: buildDateKey(date) });
  }

  while (cells.length < 35) {
    const overflowDay = cells.length - (firstDay + daysInMonth) + 1;
    const date = new Date(year, month + 1, overflowDay);
    cells.push({ day: overflowDay, currentMonth: false, dateKey: buildDateKey(date) });
  }

  return cells;
}

function getDefaultGrowthStage(crop) {
  const options = getCropStageOptions(crop);
  return options.includes("Vegetative") ? "Vegetative" : options[0];
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

function calculateAdvisory({
  farm,
  crop,
  cropStage,
  weather,
  soilProfile,
  soilMoisture,
  sensorMode,
  targetYield,
  fertilizerType,
  budget,
  reminders,
}) {
  const cropProfile = getCropProfile(crop);
  const fertilizerProfile = getFertilizerProfile(fertilizerType);
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
  const moisturePenalty = clamp((52 - soilMoisture) * 0.55, -8, 18);
  const adjustedWaterRequirementPerHa = Math.round(clamp(waterRequirementPerHa + moisturePenalty * 10, 0, 720));
  const waterRequirementTotal = Math.round(adjustedWaterRequirementPerHa * Number(farm.sizeHectares || 1));
  const weatherRisk = dailyMaxTemp.some((value) => value >= 32) || currentTemp >= 31 ? "High" : totalRain < 10 ? "Medium" : "Low";

  const deficiencyN = clamp(cropProfile.nutrientNeed.n - soilProfile.nitrogen, 0, cropProfile.nutrientNeed.n);
  const deficiencyP = clamp(cropProfile.nutrientNeed.p - soilProfile.phosphorus, 0, cropProfile.nutrientNeed.p);
  const deficiencyK = clamp(cropProfile.nutrientNeed.k - soilProfile.potassium, 0, cropProfile.nutrientNeed.k);

  const targetYieldFactor = clamp(Number(targetYield || 0) / Math.max(1, cropProfile.baseWaterLPerHa / 400), 0.6, 1.5);
  const requiredN = Math.round(deficiencyN * targetYieldFactor);
  const requiredP = Math.round(deficiencyP * targetYieldFactor);
  const requiredK = Math.round(deficiencyK * targetYieldFactor);
  const totalNutrientDemand = requiredN + requiredP + requiredK;

  const recommendedFertilizerAmountKgHa = fertilizerProfile.n + fertilizerProfile.p + fertilizerProfile.k > 0
    ? Math.round(
        clamp(
          totalNutrientDemand /
            Math.max(0.05, fertilizerProfile.n + fertilizerProfile.p + fertilizerProfile.k),
          0,
          1250
        )
      )
    : 0;
  const fertilizerCost = Math.round(recommendedFertilizerAmountKgHa * farm.sizeHectares * fertilizerProfile.pricePerKg);
  const waterPumpingCost = Math.round((waterRequirementTotal / 1000) * 850);
  const laborCost = Math.round(18000 + Number(farm.sizeHectares || 1) * 6200);
  const totalCost = waterPumpingCost + fertilizerCost + laborCost;
  const budgetRemaining = Math.round(Number(budget || 0) - totalCost);
  const budgetStatus = budgetRemaining >= 0 ? "Within Budget" : "Budget Pressure";

  const statusAdvice = [];
  if (dailyRainProbability.some((value) => value >= 60)) {
    statusAdvice.push("Reduce irrigation if rainfall probability is high.");
  }
  if (soilMoisture <= 30) {
    statusAdvice.push("Use mulch because soil moisture is low.");
  }
  statusAdvice.push("Irrigate early morning or evening to reduce evaporative losses.");
  if (/drip/i.test(farm.irrigationType || "")) {
    statusAdvice.push("Current field already benefits from drip irrigation efficiency.");
  } else {
    statusAdvice.push("Apply drip irrigation where possible to conserve water.");
  }

  const scheduleDates = (daily.time || []).slice(0, 7).map((date, index) => {
    const rain = dailyRain[index] || 0;
    const rainProbability = dailyRainProbability[index] || 0;
    const etValue = dailyEt0[index] || avgReferenceEt;
    const effectiveDailyRain = calculateEffectiveRainfall(rain);
    const dailyCropEt = etValue * kc;
    const dailyNeedMm = clamp(dailyCropEt - effectiveDailyRain + clamp((48 - soilMoisture) * 0.04, -1.2, 2.8), 0, 12);
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
      waterRequirement: Math.round(recommendedMm * 10 * Number(farm.sizeHectares || 1)),
      recommendedMm,
      rainfallForecast: Number(rain.toFixed(1)),
      rainfallProbability: rainProbability,
      evapotranspiration: Number(etValue.toFixed(1)),
      soilMoisture: Number(soilMoisture),
      reason,
      scheduled,
      status: existingReminder?.status || (scheduled ? "Pending" : "Skipped"),
      reminderId: existingReminder?.id || "",
      explanation: `Based on crop stage, evapotranspiration, rainfall forecast, and soil moisture, ${recommendedMm.toFixed(
        1
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
        field: farm.name,
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
      ? fertilizerType !== "Organic Blend"
        ? "Switch part of the plan to Organic Blend and split nitrogen into smaller applications."
        : "Reduce one irrigation pulse and use targeted band placement for fertilizer to save cost."
      : "";

  return {
    currentWeather: {
      temperature: currentTemp,
      humidity: currentHumidity,
      rainfall: currentRain,
      wind: currentWind,
      weatherRisk,
    },
    soilProfile,
    soilStatus,
    cropStage,
    cropCoefficient: kc,
    referenceEt: Number(avgReferenceEt.toFixed(2)),
    cropEt,
    totalRain,
    effectiveRain,
    waterRequirementPerHa: adjustedWaterRequirementPerHa,
    waterRequirementTotal,
    scheduleDates,
    waterConservationAdvice: statusAdvice,
    fertilizer: {
      fertilizerType,
      requiredNutrientAmount: { n: requiredN, p: requiredP, k: requiredK },
      recommendedFertilizerAmountKgHa,
      applicationTiming: {
        nitrogen: nitrogenTiming,
        phosphorus: phosphorusTiming,
        potassium: potassiumTiming,
      },
      availableBudget: Number(budget || 0),
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
        percent: clamp(Math.round((waterRequirementTotal / Math.max(1, farm.sizeHectares * 7200)) * 100), 5, 100),
        detail: `${waterRequirementTotal.toLocaleString()} L scheduled`,
      },
      {
        label: "Fertilizer Usage",
        percent: clamp(Math.round((recommendedFertilizerAmountKgHa / 800) * 100), 5, 100),
        detail: `${recommendedFertilizerAmountKgHa} kg/ha planned`,
      },
      {
        label: "Fuel Consumption",
        percent: clamp(Math.round((waterPumpingCost / Math.max(1, Number(budget || 1))) * 100), 4, 100),
        detail: `${formatRwf(waterPumpingCost)} pumping energy`,
      },
      {
        label: "Irrigation Efficiency",
        percent: clamp(Math.round(78 + (/drip/i.test(farm.irrigationType || "") ? 14 : 4) - (rainProbabilityPeak(dailyRainProbability) > 60 ? 6 : 0)), 45, 98),
        detail: /drip/i.test(farm.irrigationType || "") ? "Drip system efficiency advantage" : "Conventional field distribution",
      },
    ],
    explanationLabel: "Based on crop stage, evapotranspiration, rainfall forecast, and soil moisture.",
    upcomingActivities,
    sensorNotice:
      sensorMode === "sensor"
        ? "Manual tracking enabled. IoT sensor integration is optional."
        : "Manual tracking enabled. Update moisture whenever field observations change.",
  };
}

function rainProbabilityPeak(values) {
  return Math.max(...(values.length ? values : [0]));
}

function createFallbackSoilProfile(selectedFarm) {
  return {
    ph: 6.2,
    nitrogen: 34,
    phosphorus: 20,
    potassium: 22,
    organicMatter: 2.4,
    texture: selectedFarm?.landType || "Loamy",
    source: "Baseline farm soil profile",
  };
}

function createMockWeatherData(selectedFarm) {
  const latitude = Number(selectedFarm?.location?.lat || -1.95);
  const longitude = Number(selectedFarm?.location?.lng || 30.1);
  const baseTemp = clamp(22 + (Math.abs(latitude) % 1) * 6, 20, 28);
  const baseHumidity = clamp(58 + (Math.abs(longitude) % 1) * 20, 52, 84);
  const today = new Date();

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const phase = (index + 1) / 7;
    const rain = Number(clamp((Math.sin(phase * Math.PI * 2) + 1.1) * 3.4, 0, 11).toFixed(1));
    const probability = clamp(Math.round(28 + Math.cos(phase * Math.PI * 2) * 24), 10, 78);
    const et0 = Number(clamp(3.4 + index * 0.12, 3.1, 5.2).toFixed(1));

    return {
      time: buildDateKey(date),
      weatherCode: rain >= 6 ? 63 : rain >= 2.5 ? 61 : 2,
      maxTemp: Number((baseTemp + 1.2 + Math.sin(index * 0.8) * 1.6).toFixed(1)),
      minTemp: Number((baseTemp - 7 + Math.cos(index * 0.7) * 1.1).toFixed(1)),
      rainSum: rain,
      precipitationProbabilityMax: probability,
      humidityMax: clamp(Math.round(baseHumidity + Math.sin(index * 0.9) * 8), 48, 92),
      windMax: clamp(Math.round(12 + index * 2.2), 10, 28),
      et0,
    };
  });

  return {
    current: {
      temperature_2m: Number(baseTemp.toFixed(1)),
      relative_humidity_2m: Math.round(baseHumidity),
      precipitation: daily[0].rainSum,
      rain: daily[0].rainSum,
      weather_code: daily[0].weatherCode,
      wind_speed_10m: daily[0].windMax,
      wind_direction_10m: 120,
      pressure_msl: 1014,
      visibility: 16000,
      time: new Date().toISOString(),
    },
    daily: {
      time: daily.map((entry) => entry.time),
      weather_code: daily.map((entry) => entry.weatherCode),
      temperature_2m_max: daily.map((entry) => entry.maxTemp),
      temperature_2m_min: daily.map((entry) => entry.minTemp),
      precipitation_sum: daily.map((entry) => entry.rainSum),
      rain_sum: daily.map((entry) => entry.rainSum),
      precipitation_probability_max: daily.map((entry) => entry.precipitationProbabilityMax),
      relative_humidity_2m_max: daily.map((entry) => entry.humidityMax),
      wind_speed_10m_max: daily.map((entry) => entry.windMax),
      et0_fao_evapotranspiration: daily.map((entry) => entry.et0),
    },
  };
}

function logIrrigationDebug(label, payload) {
  if (!import.meta.env.DEV) return;
  console.log(`[IrrigationDebug] ${label}`, payload);
}

export function IrrigationPage() {
  const { currentFarms } = useFarmerData();
  const fallbackFarm = useMemo(() => createDefaultFarm(), []);
  const farms = useMemo(
    () => (currentFarms.length ? currentFarms : [fallbackFarm]),
    [currentFarms, fallbackFarm]
  );
  const stored = useMemo(() => loadStoredState(), []);

  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "irrigation-default-farm");
  const [sensorMode, setSensorMode] = useState(stored.sensorMode || "manual");
  const [soilMoisture, setSoilMoisture] = useState(stored.soilMoisture || "34");
  const [targetYield, setTargetYield] = useState(stored.targetYield || "10");
  const [fertilizerType, setFertilizerType] = useState(stored.fertilizerType || "Precision NPK");
  const [budget, setBudget] = useState(stored.budget || "180000");
  const [cropStage, setCropStage] = useState(stored.cropStage || "");
  const [selectedScheduleDate, setSelectedScheduleDate] = useState("");
  const [reminderType, setReminderType] = useState("irrigation");
  const [reminderDate, setReminderDate] = useState(stored.reminderDate || "");
  const [reminders, setReminders] = useState(stored.reminders || []);
  const [backendAdvisory, setBackendAdvisory] = useState(null);
  const [remoteState, setRemoteState] = useState({
    loading: true,
    notice: "",
    weather: null,
    soil: null,
    lastUpdated: "",
    weatherLabel: "Live Weather Data",
    soilLabel: "Local Data",
  });

  useEffect(() => {
    if (!cropStage) {
      const nextFarm = farms.find((farm) => farm.id === selectedFarmId) || farms[0];
      setCropStage(getDefaultGrowthStage(nextFarm?.primaryCrop || "Maize"));
    }
  }, [cropStage, farms, selectedFarmId]);

  useEffect(() => {
    saveStoredState({
      sensorMode,
      soilMoisture,
      targetYield,
      fertilizerType,
      budget,
      cropStage,
      reminderDate,
      reminders,
    });
  }, [sensorMode, soilMoisture, targetYield, fertilizerType, budget, cropStage, reminderDate, reminders]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "irrigation-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );
  const backendFarmId = selectedFarm?.backendFarmId || (selectedFarm?.id !== "irrigation-default-farm" ? selectedFarm?.id : "");
  const backendMode = isBackendSessionActive() && Boolean(backendFarmId);

  useEffect(() => {
    if (!selectedFarm) return;
    const options = getCropStageOptions(selectedFarm.primaryCrop || "Maize");
    if (!options.includes(cropStage)) {
      setCropStage(getDefaultGrowthStage(selectedFarm.primaryCrop || "Maize"));
    }
  }, [cropStage, selectedFarm?.id, selectedFarm?.primaryCrop]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdvisoryInputs() {
      const latitude = selectedFarm?.location?.lat;
      const longitude = selectedFarm?.location?.lng;

      if (!latitude || !longitude) {
        setBackendAdvisory(null);
        setRemoteState({
          loading: false,
          notice: "Demo Data is being used because this farm does not yet have valid coordinates.",
          weather: createMockWeatherData(selectedFarm),
          soil: createFallbackSoilProfile(selectedFarm),
          lastUpdated: new Date().toISOString(),
          weatherLabel: "Demo Data",
          soilLabel: "Local Data",
        });
        return;
      }

      setRemoteState((current) => ({ ...current, loading: true, notice: "" }));
      logIrrigationDebug("selected farm", {
        farmId: selectedFarm?.id,
        farmName: selectedFarm?.name,
        lat: latitude,
        lng: longitude,
        crop: selectedFarm?.primaryCrop,
        sizeHectares: selectedFarm?.sizeHectares,
        cropStage,
        soilMoisture,
      });

      let nextState = {
        loading: false,
        notice: "",
        weather: createMockWeatherData(selectedFarm),
        soil: createFallbackSoilProfile(selectedFarm),
        lastUpdated: new Date().toISOString(),
        weatherLabel: "Demo Data",
        soilLabel: "Local Data",
      };
      let resolvedWeather = nextState.weather;
      let resolvedSoil = nextState.soil;

      try {
        const [weatherResult, soilResult] = await Promise.allSettled([
          apiClient.weather.forecast(latitude, longitude, { timeoutMs: 4500 }),
          apiClient.soil.estimate(latitude, longitude, { timeoutMs: 2200 }),
        ]);

        if (cancelled) return;

        if (weatherResult.status === "fulfilled") {
          nextState.weather = weatherResult.value;
          resolvedWeather = weatherResult.value;
          nextState.lastUpdated = weatherResult.value?.current?.time || new Date().toISOString();
          nextState.weatherLabel = "Live Weather Data";
          logIrrigationDebug("weather API response", weatherResult.value);
        } else {
          console.error("[IrrigationPage] weather request failed", weatherResult.reason);
          nextState.notice = "Live weather could not be reached, so demo weather data is being used for this advisory.";
        }

        if (soilResult.status === "fulfilled") {
          nextState.soil = parseSoilEstimate(soilResult.value, selectedFarm);
          resolvedSoil = nextState.soil;
          nextState.soilLabel = "Local Data";
          logIrrigationDebug("soil data response", soilResult.value);
        } else {
          console.error("[IrrigationPage] soil request failed", soilResult.reason);
          nextState.notice = nextState.notice
            ? `${nextState.notice} Baseline local soil values are also being used.`
            : "Baseline local soil values are being used for this advisory.";
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[IrrigationPage] advisory load failed", error);
        nextState.weather = createMockWeatherData(selectedFarm);
        resolvedWeather = nextState.weather;
        nextState.notice = "Demo Data is being used because live advisory services were unavailable.";
        nextState.weatherLabel = "Demo Data";
      }

      if (backendMode) {
        try {
          const backendReminders = await phase1BackendService.irrigation.listReminders(backendFarmId);
          if (!cancelled) {
            setReminders((current) => [
              ...current.filter((entry) => entry.farmId !== selectedFarm.id),
              ...backendReminders,
            ]);
          }
        } catch (error) {
          console.error("[IrrigationPage] backend reminder load failed", error);
        }

        try {
          const backendCalculated = await phase1BackendService.irrigation.calculate(backendFarmId, {
            crop: selectedFarm?.primaryCrop || "Maize",
            cropStage: cropStage || getDefaultGrowthStage(selectedFarm?.primaryCrop || "Maize"),
            irrigationType: selectedFarm?.irrigationType || "Manual Irrigation",
            weather: resolvedWeather,
            soilProfile: resolvedSoil,
            soilMoisture: Number(soilMoisture || 0),
            sensorMode,
            targetYield: Number(targetYield || 0),
            fertilizerType,
            budget: Number(budget || 0),
            weatherLabel: nextState.weatherLabel,
            soilLabel: nextState.soilLabel,
            notice: nextState.notice || undefined,
          });

          if (!cancelled) {
            setBackendAdvisory(backendCalculated);
            nextState.soilLabel = backendCalculated?.soilLabel || nextState.soilLabel;
          }
        } catch (error) {
          console.error("[IrrigationPage] backend advisory calculation failed", error);
          if (!cancelled) {
            setBackendAdvisory(null);
          }
          nextState.notice = nextState.notice
            ? `${nextState.notice} Backend advisory persistence is unavailable, so the local advisory engine is being used.`
            : "Local advisory engine is being used because backend irrigation persistence is unavailable.";
        }
      } else if (!cancelled) {
        setBackendAdvisory(null);
      }

      if (!cancelled) {
        setRemoteState(nextState);
      }
    }

    loadAdvisoryInputs();
    return () => {
      cancelled = true;
    };
  }, [backendFarmId, backendMode, budget, cropStage, fertilizerType, selectedFarm?.id, selectedFarm?.irrigationType, selectedFarm?.landType, selectedFarm?.location?.lat, selectedFarm?.location?.lng, selectedFarm?.name, selectedFarm?.primaryCrop, selectedFarm?.sizeHectares, sensorMode, soilMoisture, targetYield]);

  const soilProfile = useMemo(
    () => remoteState.soil || createFallbackSoilProfile(selectedFarm),
    [remoteState.soil, selectedFarm]
  );

  const advisory = useMemo(
    () => {
      if (backendAdvisory) {
        logIrrigationDebug("backend advisory result", backendAdvisory);
        return backendAdvisory;
      }
      if (!remoteState.weather || !selectedFarm) return null;
      const result = calculateAdvisory({
        farm: selectedFarm,
        crop: selectedFarm?.primaryCrop || "Maize",
        cropStage: cropStage || getDefaultGrowthStage(selectedFarm?.primaryCrop || "Maize"),
        weather: remoteState.weather,
        soilProfile,
        soilMoisture: Number(soilMoisture || 0),
        sensorMode,
        targetYield: Number(targetYield || 0),
        fertilizerType,
        budget: Number(budget || 0),
        reminders,
      });
      logIrrigationDebug("irrigation calculation result", {
        waterRequirementTotal: result.waterRequirementTotal,
        totalRain: result.totalRain,
        effectiveRain: result.effectiveRain,
        cropEt: result.cropEt,
        scheduleDates: result.scheduleDates,
      });
      logIrrigationDebug("fertilizer calculation result", result.fertilizer);
      return result;
    },
    [backendAdvisory, budget, cropStage, fertilizerType, reminders, remoteState.weather, selectedFarm, sensorMode, soilMoisture, soilProfile, targetYield]
  );

  const calendarLabel = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const calendarCells = useMemo(() => buildCalendarGrid(calendarDate), [calendarDate]);
  const scheduleByDate = useMemo(() => {
    const map = new Map();
    (advisory?.scheduleDates || []).forEach((entry) => {
      map.set(entry.dateKey, entry);
    });
    reminders
      .filter((entry) => entry.farmId === selectedFarm?.id)
      .forEach((entry) => {
        if (!map.has(entry.dateKey)) {
          map.set(entry.dateKey, {
            dateKey: entry.dateKey,
            crop: selectedFarm?.primaryCrop || "Maize",
            growthStage: cropStage,
            waterRequirement: 0,
            recommendedMm: 0,
            rainfallForecast: 0,
            rainfallProbability: 0,
            evapotranspiration: advisory?.referenceEt || 0,
            soilMoisture: Number(soilMoisture || 0),
            reason: entry.type === "fertilizer" ? "Farmer reminder for fertilizer timing." : "Farmer reminder for irrigation follow-up.",
            scheduled: false,
            status: entry.status,
            reminderId: entry.id,
            explanation: "Reminder added by farmer action.",
            reminderType: entry.type,
          });
        }
      });
    return map;
  }, [advisory, cropStage, reminders, selectedFarm, soilMoisture]);

  const selectedSchedule = selectedScheduleDate ? scheduleByDate.get(selectedScheduleDate) : null;

  const addReminder = async () => {
    if (!reminderDate || !selectedFarm) return;
    const dateKey = reminderDate;
    const localFallbackRecord = {
      id: `rem-${Date.now()}`,
      farmId: selectedFarm.id,
      dateKey,
      type: reminderType,
      priority: reminderType === "fertilizer" ? "High" : "Medium",
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    const existing = reminders.find(
      (entry) => entry.dateKey === dateKey && entry.farmId === selectedFarm.id && entry.type === reminderType
    );

    if (existing) {
      setSelectedScheduleDate(dateKey);
      return;
    }

    if (backendMode) {
      try {
        const created = await phase1BackendService.irrigation.createReminder(backendFarmId, {
          dateKey,
          type: reminderType,
          priority: localFallbackRecord.priority,
          status: "Pending",
          advisoryId: advisory?.id || null,
        });
        setReminders((current) => [...current, created]);
        setSelectedScheduleDate(dateKey);
        return;
      } catch (error) {
        console.error("[IrrigationPage] backend reminder create failed", error);
      }
    }

    setReminders((current) => [...current, localFallbackRecord]);
    setSelectedScheduleDate(dateKey);
  };

  const updateReminderStatus = async (dateKey, nextStatus) => {
    if (!selectedFarm) return;
    const existing = reminders.find((entry) => entry.farmId === selectedFarm.id && entry.dateKey === dateKey);
    const matchedSchedule = scheduleByDate.get(dateKey);

    if (backendMode && existing?.id && !String(existing.id).startsWith("rem-") && !String(existing.id).startsWith("auto-rem-")) {
      try {
        const updated = await phase1BackendService.irrigation.updateReminder(existing.id, {
          status: nextStatus,
        });
        setReminders((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry))
        );
        return;
      } catch (error) {
        console.error("[IrrigationPage] backend reminder update failed", error);
      }
    }

    if (backendMode && !existing && matchedSchedule) {
      try {
        const created = await phase1BackendService.irrigation.createReminder(backendFarmId, {
          dateKey,
          type: matchedSchedule.reminderType || "irrigation",
          priority: matchedSchedule.recommendedMm >= 5 ? "High" : "Medium",
          status: nextStatus,
          advisoryId: advisory?.id || null,
        });
        setReminders((current) => [...current, created]);
        return;
      } catch (error) {
        console.error("[IrrigationPage] backend reminder create-on-status failed", error);
      }
    }

    if (!existing && matchedSchedule) {
      setReminders((current) => [
        ...current,
        {
          id: `rem-${Date.now()}`,
          farmId: selectedFarm.id,
          dateKey,
          type: matchedSchedule.reminderType || "irrigation",
          priority: matchedSchedule.recommendedMm >= 5 ? "High" : "Medium",
          status: nextStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setReminders((current) =>
      current.map((entry) =>
        entry.farmId === selectedFarm.id && entry.dateKey === dateKey
          ? { ...entry, status: nextStatus, updatedAt: new Date().toISOString() }
          : entry
      )
    );
  };

  const handleCalendarClick = async (cell) => {
    if (!cell.currentMonth) return;
    setSelectedScheduleDate(cell.dateKey);
    const hasExisting = reminders.some((entry) => entry.farmId === selectedFarm.id && entry.dateKey === cell.dateKey);
    if (!hasExisting && advisory?.scheduleDates.find((entry) => entry.dateKey === cell.dateKey)?.scheduled) {
      if (backendMode) {
        try {
          const created = await phase1BackendService.irrigation.createReminder(backendFarmId, {
            dateKey: cell.dateKey,
            type: "irrigation",
            priority: "High",
            status: "Pending",
            advisoryId: advisory?.id || null,
          });
          setReminders((current) => [...current, created]);
          return;
        } catch (error) {
          console.error("[IrrigationPage] backend auto reminder create failed", error);
        }
      }

      setReminders((current) => [
        ...current,
        {
          id: `auto-rem-${Date.now()}`,
          farmId: selectedFarm.id,
          dateKey: cell.dateKey,
          type: "irrigation",
          priority: "High",
          status: "Pending",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const calendarBadges = useMemo(() => {
    const byDate = new Map();
    reminders
      .filter((entry) => entry.farmId === selectedFarm?.id)
      .forEach((entry) => byDate.set(entry.dateKey, entry.status));
    return byDate;
  }, [reminders, selectedFarm]);

  const emptyState = !remoteState.loading && !advisory;
  const dataSourceBadges = [
    { label: remoteState.weatherLabel, tone: remoteState.weatherLabel === "Live Weather Data" ? "live" : "demo" },
    { label: remoteState.soilLabel, tone: "local" },
    { label: "Local Data", tone: "local" },
  ];

  return (
    <section className="management-page prototype-irrigation-page upgraded-irrigation-page">
      <div className="page-title-block prototype-irrigation-title">
        <h1>Irrigation &amp; Fertilizer Planning</h1>
        <p>
          Smart irrigation scheduling, fertilizer optimization, budget-aware planning, and reminder tracking for each farm.
        </p>
      </div>

      <div className="prototype-irrigation-toolbar">
        <label className="prototype-irrigation-toolbar-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>

        <label className="prototype-irrigation-toolbar-field">
          <span>Reminder date</span>
          <div className="prototype-irrigation-reminder-inline">
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
            <select value={reminderType} onChange={(event) => setReminderType(event.target.value)}>
              <option value="irrigation">Irrigation</option>
              <option value="fertilizer">Fertilizer</option>
            </select>
            <button type="button" onClick={addReminder}>
              <Clock3 size={15} />
              <span>Add Reminder</span>
            </button>
          </div>
        </label>
      </div>

      <div className="irrigation-data-source-row">
        {dataSourceBadges.map((badge, index) => (
          <span key={`${badge.label}-${index}`} className={`irrigation-data-badge ${badge.tone}`}>
            {badge.label}
          </span>
        ))}
      </div>

      {remoteState.loading ? <div className="irrigation-state-banner">Loading irrigation and fertilizer advisory...</div> : null}
      {!remoteState.loading && remoteState.notice ? (
        <div className="irrigation-state-banner">{remoteState.notice}</div>
      ) : null}
      {emptyState ? <div className="irrigation-state-banner">No advisory available yet. Add farm, crop, or local soil details to generate a plan.</div> : null}

      {advisory ? (
        <div className="prototype-irrigation-grid upgraded">
          <div className="prototype-irrigation-main">
            <article className="prototype-panel irrigation-calendar-panel">
              <div className="prototype-irrigation-panel-head">
                <h2>
                  <CalendarDays size={20} />
                  <span>Irrigation Scheduler</span>
                </h2>

                <div className="irrigation-calendar-nav">
                  <button
                    type="button"
                    className="calendar-nav-button"
                    aria-label="Previous month"
                    onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>{calendarLabel}</strong>
                  <button
                    type="button"
                    className="calendar-nav-button"
                    aria-label="Next month"
                    onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="irrigation-calculation-caption">{advisory.explanationLabel}</div>

              <div className="irrigation-calendar">
                <div className="irrigation-calendar-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="irrigation-calendar-grid">
                  {calendarCells.map((cell, index) => {
                    const schedule = scheduleByDate.get(cell.dateKey);
                    const badge = calendarBadges.get(cell.dateKey);
                    const isActive = selectedScheduleDate === cell.dateKey;
                    return (
                      <button
                        type="button"
                        key={`${calendarLabel}-${cell.day}-${index}`}
                        onClick={() => handleCalendarClick(cell)}
                        className={[
                          "irrigation-day",
                          !cell.currentMonth ? "muted" : "",
                          schedule?.scheduled ? "scheduled" : "",
                          isActive ? "active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span>{cell.day}</span>
                        {badge ? <i className={`status-dot ${badge.toLowerCase()}`} /> : schedule?.scheduled ? <i /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="irrigation-calendar-legend">
                <span><i className="tone-blue" /> Scheduled irrigation</span>
                <span><i className="status-dot pending" /> Pending reminder</span>
                <span><i className="status-dot completed" /> Completed</span>
                <span><i className="status-dot missed" /> Missed</span>
              </div>

              {selectedSchedule ? (
                <div className="irrigation-detail-panel">
                  <div className="irrigation-detail-head">
                    <h3>Schedule detail</h3>
                    <span>{selectedSchedule.dateKey}</span>
                  </div>
                  <div className="irrigation-detail-grid">
                    <div><strong>Crop</strong><span>{selectedSchedule.crop}</span></div>
                    <div><strong>Growth stage</strong><span>{selectedSchedule.growthStage}</span></div>
                    <div><strong>Water requirement</strong><span>{selectedSchedule.waterRequirement.toLocaleString()} L</span></div>
                    <div><strong>Rainfall forecast</strong><span>{selectedSchedule.rainfallForecast} mm</span></div>
                    <div><strong>ET value</strong><span>{selectedSchedule.evapotranspiration} mm/day</span></div>
                    <div><strong>Soil moisture</strong><span>{selectedSchedule.soilMoisture}%</span></div>
                    <div><strong>Status</strong><span>{selectedSchedule.status}</span></div>
                  </div>
                  <p>{selectedSchedule.reason}</p>
                  <small>{selectedSchedule.explanation}</small>
                  <div className="irrigation-detail-actions">
                    <button type="button" onClick={() => updateReminderStatus(selectedSchedule.dateKey, "Completed")}>Completed</button>
                    <button type="button" onClick={() => updateReminderStatus(selectedSchedule.dateKey, "Pending")}>Pending</button>
                    <button type="button" onClick={() => updateReminderStatus(selectedSchedule.dateKey, "Missed")}>Missed</button>
                    <button type="button" onClick={() => updateReminderStatus(selectedSchedule.dateKey, "Skipped")}>Skipped</button>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="prototype-panel irrigation-calculator-panel">
              <div className="prototype-irrigation-panel-head">
                <h2>
                  <FlaskConical size={20} />
                  <span>Fertilizer Calculator</span>
                </h2>
              </div>

              <div className="irrigation-calculation-caption">
                Based on target yield, crop stage, soil test results, fertilizer type, and available budget.
              </div>

              <div className="irrigation-calculator-grid functional">
                <div className="irrigation-form-stack">
                  <label>
                    <span>Target Yield (t/ha)</span>
                    <input type="number" step="0.1" value={targetYield} onChange={(event) => setTargetYield(event.target.value)} />
                  </label>

                  <label>
                    <span>Crop Stage</span>
                    <select value={cropStage} onChange={(event) => setCropStage(event.target.value)}>
                      {getCropStageOptions(selectedFarm.primaryCrop || "Maize").map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Fertilizer Type</span>
                    <select value={fertilizerType} onChange={(event) => setFertilizerType(event.target.value)}>
                      {Object.keys(fertilizerTypes).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Available Budget (RWF)</span>
                    <input type="number" value={budget} onChange={(event) => setBudget(event.target.value)} />
                  </label>
                </div>

                <div className="irrigation-nutrient-card">
                  <h3>Recommended Nutrients</h3>
                  <div className="irrigation-nutrient-list">
                    {[
                      { label: "Nitrogen (N)", required: advisory.fertilizer.requiredNutrientAmount.n, status: advisory.soilStatus.nitrogenStatus, timing: advisory.fertilizer.applicationTiming.nitrogen },
                      { label: "Phosphorus (P)", required: advisory.fertilizer.requiredNutrientAmount.p, status: advisory.soilStatus.phosphorusStatus, timing: advisory.fertilizer.applicationTiming.phosphorus },
                      { label: "Potassium (K)", required: advisory.fertilizer.requiredNutrientAmount.k, status: advisory.soilStatus.potassiumStatus, timing: advisory.fertilizer.applicationTiming.potassium },
                    ].map((row) => (
                      <div key={row.label} className="irrigation-nutrient-row enhanced">
                        <div className="irrigation-nutrient-label">
                          <span>{row.label}</span>
                          <strong>{row.required} kg/ha</strong>
                        </div>
                        <div className="irrigation-nutrient-track">
                          <div className="irrigation-nutrient-fill" style={{ width: `${clamp(Math.round((row.required / 160) * 100), 8, 100)}%` }} />
                        </div>
                        <small>{row.status} soil status · {row.timing}</small>
                      </div>
                    ))}
                  </div>
                  <div className="irrigation-fertilizer-summary">
                    <strong>Recommended fertilizer amount</strong>
                    <span>{advisory.fertilizer.recommendedFertilizerAmountKgHa} kg/ha of {fertilizerType}</span>
                    <small>Available budget: {formatRwf(advisory.fertilizer.availableBudget)} · {advisory.fertilizer.budgetStatus}</small>
                  </div>
                </div>
              </div>
            </article>

            <article className="prototype-panel irrigation-sensor-panel">
              <div className="prototype-irrigation-panel-head">
                <h2>
                  <RadioTower size={20} />
                  <span>Soil Moisture Tracker</span>
                </h2>
              </div>

              <div className="irrigation-sensor-controls">
                <div className="irrigation-sensor-mode">
                  <button type="button" className={sensorMode === "manual" ? "active" : ""} onClick={() => setSensorMode("manual")}>
                    Manual Input
                  </button>
                  <button type="button" className={sensorMode === "sensor" ? "active" : ""} onClick={() => setSensorMode("sensor")}>
                    IoT Sensor Mode
                  </button>
                </div>

                <label className="irrigation-sensor-input">
                  <span>Soil moisture (%)</span>
                  <input
                    type="range"
                    min="8"
                    max="90"
                    value={soilMoisture}
                    onChange={(event) => setSoilMoisture(event.target.value)}
                  />
                  <strong>{soilMoisture}% · {advisory.soilStatus.nitrogenStatus === "Low" ? "Dry nutrient stress risk" : "Tracked field moisture"}</strong>
                </label>
              </div>

              <div className="irrigation-sensor-note">{advisory.sensorNotice}</div>

              <div className="irrigation-guidance-grid compact">
                {advisory.waterConservationAdvice.map((item) => (
                  <div key={item} className="irrigation-guidance-card">
                    <Leaf size={18} />
                    <div>
                      <strong>Water conservation recommendation</strong>
                      <p>{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="prototype-irrigation-side">
            <article className="irrigation-water-card">
              <span>Water Requirement Estimate</span>
              <strong>{advisory.waterRequirementPerHa.toLocaleString()} <small>L/ha/day equivalent</small></strong>
              <p>
                Water Need = Crop ET - Effective Rainfall. Crop ET uses ET₀ {advisory.referenceEt} × Kc {advisory.cropCoefficient}.
              </p>
              <div className="irrigation-water-note">
                <Info size={18} />
                <span>{advisory.explanationLabel}</span>
              </div>
            </article>

            <article className="prototype-panel irrigation-cost-card">
              <div className="prototype-irrigation-panel-head compact">
                <h2>
                  <Wallet size={20} />
                  <span>Cost Analysis</span>
                </h2>
              </div>

              <div className="irrigation-cost-list">
                <div className="irrigation-cost-row">
                  <span>Water pumping cost</span>
                  <strong>{formatRwf(advisory.costs.waterPumpingCost)}</strong>
                </div>
                <div className="irrigation-cost-row">
                  <span>Fertilizer cost</span>
                  <strong>{formatRwf(advisory.costs.fertilizerCost)}</strong>
                </div>
                <div className="irrigation-cost-row">
                  <span>Labor cost</span>
                  <strong>{formatRwf(advisory.costs.laborCost)}</strong>
                </div>
              </div>

              <div className="irrigation-total-row">
                <span>Total cost</span>
                <strong>{formatRwf(advisory.costs.totalCost)}</strong>
              </div>

              <div className={`irrigation-budget-chip ${advisory.fertilizer.budgetStatus === "Within Budget" ? "good" : "warning"}`}>
                {advisory.fertilizer.budgetStatus}
              </div>

              <div className="irrigation-budget-detail">
                {advisory.costs.budgetRemaining >= 0 ? (
                  <span>Budget remaining: {formatRwf(advisory.costs.budgetRemaining)}</span>
                ) : (
                  <span>Budget pressure: {formatRwf(Math.abs(advisory.costs.budgetRemaining))} above planned budget.</span>
                )}
              </div>

              {advisory.costs.cheaperAlternative ? (
                <div className="irrigation-cheaper-option">{advisory.costs.cheaperAlternative}</div>
              ) : null}
            </article>

            <article className="prototype-panel irrigation-summary-card">
              <div className="prototype-irrigation-panel-head compact">
                <h2>
                  <Droplets size={20} />
                  <span>Resource Summary</span>
                </h2>
              </div>
              <div className="irrigation-resource-list">
                {advisory.resourceMonitoring.map((item) => (
                  <div key={item.label} className="irrigation-resource-row">
                    <div className="irrigation-resource-head">
                      <strong>{item.label}</strong>
                      <span>{item.percent}%</span>
                    </div>
                    <div className="irrigation-resource-track">
                      <div className="irrigation-resource-fill" style={{ width: `${item.percent}%` }} />
                    </div>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="prototype-panel irrigation-upcoming-panel">
              <div className="prototype-irrigation-panel-head compact">
                <h2>
                  <Clock3 size={18} />
                  <span>Upcoming Activities</span>
                </h2>
              </div>

              {advisory.upcomingActivities.length ? (
                <div className="irrigation-upcoming-list">
                  {advisory.upcomingActivities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="irrigation-upcoming-row">
                      <div>
                        <strong>{activity.task}</strong>
                        <span>{activity.field}</span>
                      </div>
                      <div>
                        <small>{activity.dueDate}</small>
                        <span className={`status ${activity.status.toLowerCase()}`}>{activity.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="irrigation-empty-copy">No upcoming reminder entries yet for this farm.</div>
              )}
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
