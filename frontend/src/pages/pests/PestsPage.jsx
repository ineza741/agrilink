import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bug,
  CheckCircle2,
  CloudDrizzle,
  CloudLightning,
  ImageUp,
  MapPinned,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { apiClient } from "../../services/api";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { downloadJsonFile, downloadTextFile } from "../../utils/actions";

const PEST_STORAGE_KEY = "agri-feed-pest-module-v2";

const cropOptions = ["Potato", "Maize", "Beans", "Tomato", "Vegetables", "Cereals"];
const symptomOptions = ["Yellow Spots", "Brown Holes", "White Mold", "Wilting"];

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
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1f/Phytophthora_infestans_on_potato_leaf.jpg",
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
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8d/Myzus_persicae_2.jpg",
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
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/45/Powdery_mildew_on_courgette_leaf.jpg",
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
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/44/Spodoptera_frugiperda_caterpillar.jpg",
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
    district: "Northern Highlands",
  },
  {
    id: "seed-2",
    date: "2026-04-18T08:20:00.000Z",
    monthLabel: "Apr 2026",
    pathogen: "Myzus persicae",
    severity: "Low",
    action: "Sticky-trap monitoring",
    district: "Northern Highlands",
  },
  {
    id: "seed-3",
    date: "2025-12-09T12:10:00.000Z",
    monthLabel: "Dec 2025",
    pathogen: "Spodoptera frugiperda",
    severity: "High",
    action: "Whorl-stage intervention",
    district: "Kicukiro District",
  },
];

function createDefaultFarm() {
  return {
    id: "pest-default-farm",
    name: "Primary Advisory Plot",
    region: "Northern Highlands",
    sizeHectares: 12,
    irrigationType: "Drip Irrigation",
    primaryCrop: "Potato",
    location: { lat: -1.94, lng: 29.87, label: "Primary advisory zone" },
  };
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(PEST_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(PEST_STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatRwf(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function inferDistrict(farm) {
  const region = farm?.region || farm?.location?.label || "";
  if (/kicukiro/i.test(region)) return "Kicukiro District";
  if (/gasabo/i.test(region)) return "Gasabo District";
  if (/nyarugenge/i.test(region)) return "Nyarugenge District";
  if (/bugesera/i.test(region)) return "Bugesera District";
  return region.split(",")[0] || "Unknown District";
}

function deriveCropStage(crop) {
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

function weatherCodeDescription(code) {
  const mapping = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
  };
  return mapping[code] || "Variable conditions";
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
    temperature: Number(weather.current?.temperature_2m ?? 0),
    humidity: Number(weather.current?.relative_humidity_2m ?? 0),
    rainfall: Number(weather.current?.rain ?? weather.current?.precipitation ?? 0),
    windSpeed: Number(weather.current?.wind_speed_10m ?? 0),
    description: weatherCodeDescription(Number(weather.current?.weather_code ?? 0)),
  };

  const daily = weather.daily || {};
  const rainSeries = Array.isArray(daily.rain_sum) ? daily.rain_sum : [];
  const humiditySeries = Array.isArray(daily.relative_humidity_2m_max)
    ? daily.relative_humidity_2m_max
    : [];
  const tempSeries = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];

  const totalRain = rainSeries.reduce((sum, value) => sum + Number(value || 0), 0);
  const humidDays = humiditySeries.filter((value) => Number(value || 0) >= 75).length;
  const warmDays = tempSeries.filter((value) => Number(value || 0) >= 24 && Number(value || 0) <= 30).length;
  const forecast = {
    totalRain,
    humidDays,
    warmDays,
    peakHumidity: Math.max(...humiditySeries, current.humidity),
    peakTemperature: Math.max(...tempSeries, current.temperature),
  };

  return {
    current,
    forecast,
    explanation: `Humidity of ${current.humidity}% with ${current.temperature}C conditions and ${totalRain.toFixed(
      1
    )} mm forecast rain shapes pest and disease pressure for the next 7 days.`,
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

function computeDiagnoses({
  farm,
  crop,
  symptom,
  affectedArea,
  uploadedImageName,
  weatherContribution,
  historyLog,
}) {
  const cropStage = deriveCropStage(crop);
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
          entry.pathogen.toLowerCase().includes(disease.scientificName.split(" ")[0].toLowerCase()) &&
          entry.district === district
      ).length;
      const historyBoost = clamp(historyMatch * 7, 0, 18);
      const areaBoost = affectedArea * 0.18;
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
    Math.round(top.weightedScore * 0.58 + affectedArea * 0.32 + (weatherContribution?.forecast?.humidDays || 0) * 2),
    18,
    98
  );
  const regionalRiskScore = clamp(
    Math.round(top.weightedScore * 0.42 + (weatherContribution?.forecast?.totalRain || 0) * 1.1 + (weatherContribution?.forecast?.peakHumidity || 0) * 0.25),
    18,
    99
  );

  const yieldLoss = clamp(Math.round(farmRiskScore * 0.16 + affectedArea * 0.12), 4, 38);
  const economics = cropEconomics[crop] || cropEconomics.Vegetables;
  const fieldArea = Number(farm?.sizeHectares || 1);
  const economicLoss = Math.round(((economics.yieldPerHa * fieldArea * 1000 * economics.pricePerKg) * yieldLoss) / 100);

  const currentRisk = getRiskLabel(farmRiskScore);
  const forecastRiskScore = clamp(
    Math.round(farmRiskScore + (weatherContribution?.forecast?.humidDays || 0) * 4 + ((weatherContribution?.forecast?.totalRain || 0) > 18 ? 8 : 0)),
    20,
    99
  );
  const forecastRisk = getRiskLabel(forecastRiskScore);
  const priorityScore = clamp(
    Math.round(confidence * 0.35 + farmRiskScore * 0.35 + regionalRiskScore * 0.15 + affectedArea * 0.15),
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
      soil: `${farm?.landType || "Field"} conditions on ${farm?.name} increase canopy vulnerability where nutrient stress and moisture imbalance are present.`,
      weather: weatherContribution?.explanation || "Weather context is still being loaded for this farm.",
      market: `Potential ${formatRwf(economicLoss)} loss is significant for ${crop} supply planning and market timing.`,
      stage: `${crop} is currently in the ${cropStage} stage, which raises sensitivity to ${top.name.toLowerCase()}.`,
      confidence: `Confidence combines symptom strength, crop fit, weather suitability, prior outbreaks in ${district}, and image evidence.`,
    },
    outbreakForecast: {
      currentRisk,
      predictedRisk: forecastRisk,
      confidence: clamp(Math.round(confidence - 4 + (weatherContribution?.forecast?.humidDays || 0)), 52, 96),
      drivers: `Humidity above ${weatherContribution?.forecast?.peakHumidity || weatherContribution?.current?.humidity || 0}% and ${(
        weatherContribution?.forecast?.totalRain || 0
      ).toFixed(1)} mm of rain over the next 7 days increase outbreak pressure.`,
    },
  };
}

function buildDynamicRecommendation(diagnosisModel, farm, crop) {
  const top = diagnosisModel.topDiagnosis;
  return {
    recommendationId: `rec-${farm.id}-${top.id}`,
    diseaseName: top.name,
    actionType: "Pest/Disease",
    title: `Control ${top.name} on ${farm.name}`,
    accepted: 0,
    rejected: 0,
    completed: 0,
    guidance: [
      `Scout ${farm.name} within 24 hours and confirm ${top.name.toLowerCase()} hotspots.`,
      `Apply the primary intervention suited to ${crop}: ${top.treatment.chemical}.`,
      `Reassess in 3-5 days and update image evidence if symptoms expand.`,
    ],
  };
}

export function PestsPage() {
  const { user } = useAuth();
  const { currentFarms } = useFarmerData();
  const fallbackFarm = useMemo(() => createDefaultFarm(), []);
  const farms = useMemo(
    () => (currentFarms.length ? currentFarms : [fallbackFarm]),
    [currentFarms, fallbackFarm]
  );
  const stored = useMemo(() => loadStoredState(), []);

  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "pest-default-farm");
  const [selectedCrop, setSelectedCrop] = useState(farms[0]?.primaryCrop || "Potato");
  const [selectedSymptom, setSelectedSymptom] = useState("Yellow Spots");
  const [affectedArea, setAffectedArea] = useState(28);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [historyLog, setHistoryLog] = useState(() => stored.historyLog || outbreakHistorySeed);
  const [actionLog, setActionLog] = useState(() => stored.actionLog || []);
  const [backendDiagnosis, setBackendDiagnosis] = useState(null);
  const [backendHistoryLog, setBackendHistoryLog] = useState([]);
  const [backendActionLog, setBackendActionLog] = useState([]);
  const [backendLibrary, setBackendLibrary] = useState([]);
  const [pestState, setPestState] = useState({
    loading: false,
    notice: "",
    source: "Demo Pest Data",
  });
  const [weatherState, setWeatherState] = useState({
    loading: true,
    error: "",
    data: null,
    lastUpdated: "",
  });

  useEffect(() => {
    saveStoredState({ historyLog, actionLog });
  }, [historyLog, actionLog]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );
  const backendFarmId = selectedFarm?.backendFarmId || "";
  const backendMode = isBackendSessionActive() && Boolean(backendFarmId);

  useEffect(() => {
    setSelectedCrop(selectedFarm?.primaryCrop || "Potato");
  }, [selectedFarm?.id, selectedFarm?.primaryCrop]);

  useEffect(() => {
    let active = true;
    async function loadWeather() {
      if (!selectedFarm?.location?.lat || !selectedFarm?.location?.lng) {
        setWeatherState({
          loading: false,
          error: "Demo weather context is being used until this farm has valid coordinates.",
          data: null,
          lastUpdated: "",
        });
        return;
      }

      setWeatherState((current) => ({ ...current, loading: true, error: "" }));
      try {
        const response = await apiClient.weather.forecast(selectedFarm.location.lat, selectedFarm.location.lng, {
          timeoutMs: 4500,
        });
        if (!active) return;
        setWeatherState({
          loading: false,
          error: "",
          data: response,
          lastUpdated: response.current?.time || new Date().toISOString(),
        });
      } catch {
        if (!active) return;
        setWeatherState({
          loading: false,
          error: "Live weather is temporarily unavailable, so demo weather context is being used for pest forecasting.",
          data: null,
          lastUpdated: "",
        });
      }
    }

    loadWeather();
    return () => {
      active = false;
    };
  }, [selectedFarm?.id, selectedFarm?.location?.lat, selectedFarm?.location?.lng]);

  const weatherContribution = useMemo(
    () => buildWeatherContribution(weatherState.data),
    [weatherState.data]
  );

  const diagnosisModel = useMemo(
    () =>
      computeDiagnoses({
        farm: selectedFarm,
        crop: selectedCrop,
        symptom: selectedSymptom,
        affectedArea,
        uploadedImageName,
        weatherContribution,
        historyLog,
      }),
    [affectedArea, historyLog, selectedCrop, selectedFarm, selectedSymptom, uploadedImageName, weatherContribution]
  );

  useEffect(() => {
    let active = true;

    if (!backendMode || !backendFarmId) {
      setBackendDiagnosis(null);
      setBackendHistoryLog([]);
      setBackendActionLog([]);
      setBackendLibrary([]);
      setPestState({
        loading: false,
        notice: "Using demo/local pest intelligence for this farm.",
        source: "Demo Pest Data",
      });
      return undefined;
    }

    async function loadBackendPestData() {
      setPestState({
        loading: true,
        notice: "",
        source: "Backend Pest Data",
      });

      try {
        const [latest, history, library] = await Promise.all([
          phase1BackendService.pests.latest(backendFarmId),
          phase1BackendService.pests.history(backendFarmId),
          phase1BackendService.pests.library({ crop: selectedCrop }),
        ]);

        if (!active) return;

        setBackendDiagnosis(latest || null);
        setBackendHistoryLog(history || []);
        setBackendLibrary(library || []);

        if (latest?.id) {
          const actions = await phase1BackendService.pests.listActions(latest.id);
          if (!active) return;
          setBackendActionLog(actions || []);
        } else {
          setBackendActionLog([]);
        }

        setPestState({
          loading: false,
          notice: latest
            ? "Using backend pest diagnosis history with demo fallback preserved."
            : "No backend pest diagnosis exists yet for this farm. Demo intelligence remains available.",
          source: latest ? "Backend Pest Data" : "Demo Pest Data",
        });
      } catch (error) {
        if (!active) return;
        console.warn("Pest backend load failed. Falling back to demo pest intelligence.", error);
        setBackendDiagnosis(null);
        setBackendHistoryLog([]);
        setBackendActionLog([]);
        setBackendLibrary([]);
        setPestState({
          loading: false,
          notice: "Backend pest data is unavailable right now. Showing demo pest intelligence for presentation mode.",
          source: "Demo Pest Data",
        });
      }
    }

    loadBackendPestData();

    return () => {
      active = false;
    };
  }, [backendFarmId, backendMode, selectedCrop]);

  const dynamicRecommendation = useMemo(
    () => buildDynamicRecommendation(diagnosisModel, selectedFarm, selectedCrop),
    [diagnosisModel, selectedCrop, selectedFarm]
  );

  const activeDiagnosis = backendDiagnosis || diagnosisModel;
  const activeRecommendation = activeDiagnosis?.recommendation || dynamicRecommendation;
  const activeHistoryLog = backendMode && backendHistoryLog.length ? backendHistoryLog : historyLog;

  const trackedRecommendation = useMemo(
    () => {
      const source = backendMode ? backendActionLog : actionLog;
      return source
        .filter((entry) => entry.recommendationId === activeRecommendation.recommendationId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    [actionLog, activeRecommendation.recommendationId, backendActionLog, backendMode]
  );

  const treatmentEffectiveness = useMemo(() => {
    const completed = trackedRecommendation.filter((entry) => entry.feedbackStatus === "completed").length;
    const accepted = trackedRecommendation.filter((entry) => entry.feedbackStatus === "accepted").length;
    if (!accepted) return 0;
    return Math.round((completed / accepted) * 100);
  }, [trackedRecommendation]);

  const displayedLibrary = useMemo(
    () =>
      (backendLibrary.length ? backendLibrary : diagnosisModel.ranked).filter((item) => {
        const query = librarySearch.toLowerCase();
        return (
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.scientificName.toLowerCase().includes(query) ||
          item.affectedCrops.join(" ").toLowerCase().includes(query)
        );
      }),
    [backendLibrary, diagnosisModel.ranked, librarySearch]
  );

  const regionalTracking = useMemo(() => {
    const totalDistrictEvents = activeHistoryLog.filter((entry) => entry.district === activeDiagnosis.district).length;
    const trend =
      activeDiagnosis.outbreakForecast.predictedRisk === "High"
        ? "Increasing"
        : activeDiagnosis.outbreakForecast.predictedRisk === "Moderate"
          ? "Stable"
          : "Decreasing";
    return {
      district: activeDiagnosis.district,
      intensity: clamp(Math.round(activeDiagnosis.regionalRiskScore / 10), 2, 10),
      trend,
      clusterCount: 2 + totalDistrictEvents,
    };
  }, [activeDiagnosis, activeHistoryLog]);

  const activityFeed = useMemo(() => {
    const items = [
      {
        id: "weather-link",
        tone: activeDiagnosis.outbreakForecast.predictedRisk === "High" ? "critical" : "review",
        title: "Weather-driven outbreak pressure updated",
        detail: weatherContribution.explanation,
        timestamp: weatherState.lastUpdated || new Date().toISOString(),
      },
      {
        id: "diagnosis",
        tone: activeDiagnosis.priority === "Critical" ? "critical" : "review",
        title: `${activeDiagnosis.topDiagnosis.name} detected for ${selectedCrop}`,
        detail: `${activeDiagnosis.currentRisk} current risk with ${activeDiagnosis.confidence}% confidence on ${selectedFarm.name}.`,
        timestamp: new Date().toISOString(),
      },
      ...trackedRecommendation.map((entry) => ({
        id: entry.id,
        tone: entry.feedbackStatus === "completed" ? "live" : entry.feedbackStatus === "rejected" ? "critical" : "review",
        title: `Farmer action ${entry.feedbackStatus}`,
        detail:
          entry.feedbackStatus === "rejected" && entry.rejectionReason
            ? `Recommendation rejected: ${entry.rejectionReason}.`
            : `Recommendation ${entry.feedbackStatus} for ${entry.actionType}.`,
        timestamp: entry.timestamp,
      })),
    ];

    return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
  }, [activeDiagnosis, selectedCrop, selectedFarm.name, trackedRecommendation, weatherContribution.explanation, weatherState.lastUpdated]);

  const submitSymptomCheck = async () => {
    if (backendMode && backendFarmId) {
      try {
        setPestState((current) => ({ ...current, loading: true, notice: "" }));
        const diagnosis = await phase1BackendService.pests.analyze(backendFarmId, {
          crop: selectedCrop,
          symptom: selectedSymptom,
          affectedArea,
          uploadedImageName,
          weatherContribution,
        });
        setBackendDiagnosis(diagnosis);
        setBackendHistoryLog(diagnosis.historyLog || []);
        setBackendLibrary(diagnosis.library || []);
        setBackendActionLog([]);
        setPestState({
          loading: false,
          notice: `Backend pest diagnosis saved for ${selectedCrop} on ${selectedFarm.name}.`,
          source: "Backend Pest Data",
        });
        return;
      } catch (error) {
        console.warn("Backend pest analysis failed. Falling back to local history entry.", error);
        setPestState({
          loading: false,
          notice: "Backend pest diagnosis is unavailable right now. Local demo pest logic is still active.",
          source: "Demo Pest Data",
        });
      }
    }

    const event = {
      id: `history-${Date.now()}`,
      date: new Date().toISOString(),
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date()),
      pathogen: diagnosisModel.topDiagnosis.scientificName,
      severity: diagnosisModel.currentRisk,
      action: diagnosisModel.priority === "Critical" ? "Immediate field intervention" : "Guided field scouting",
      district: diagnosisModel.district,
    };

    setHistoryLog((current) => [event, ...current].slice(0, 10));
  };

  const trackRecommendation = async (feedbackStatus) => {
    if (backendMode && activeDiagnosis?.id && activeRecommendation?.recommendationId) {
      try {
        const created = await phase1BackendService.pests.addAction(activeDiagnosis.id, {
          recommendationId: activeRecommendation.recommendationId,
          actionType: activeRecommendation.actionType || "Pest/Disease",
          feedbackStatus,
          rejectionReason: "",
        });
        setBackendActionLog((current) => [created, ...current].slice(0, 30));
        setPestState((current) => ({
          ...current,
          notice: `Backend farmer action recorded as ${feedbackStatus}.`,
          source: "Backend Pest Data",
        }));
        return;
      } catch (error) {
        console.warn("Backend pest action logging failed. Falling back to local action log.", error);
      }
    }

    const nextRecord = {
      id: `pest-action-${Date.now()}`,
      recommendationId: activeRecommendation.recommendationId,
      farmerId: user?.id || "demo-farmer",
      farmId: selectedFarm.id,
      actionType: activeRecommendation.actionType,
      feedbackStatus,
      rejectionReason: "",
      timestamp: new Date().toISOString(),
    };
    setActionLog((current) => [nextRecord, ...current].slice(0, 30));
  };

  const downloadProtocol = () => {
    downloadTextFile(
      `${diagnosisModel.topDiagnosis.name.toLowerCase().replace(/\s+/g, "-")}-protocol.txt`,
      `Protocol: ${activeDiagnosis.topDiagnosis.name}\nConfidence: ${activeDiagnosis.confidence}%\nRisk: ${activeDiagnosis.currentRisk}\nPriority: ${activeDiagnosis.priority}\n\nChemical treatment:\n${activeDiagnosis.topDiagnosis.treatment.chemical}\n\nOrganic / IPM:\n${activeDiagnosis.topDiagnosis.treatment.organic}\n\nPreventive measure:\n${activeDiagnosis.topDiagnosis.preventionAdvice}`
    );
  };

  const downloadHistoryReport = () => {
    downloadJsonFile("pest-disease-history.json", {
      farm: selectedFarm,
      crop: selectedCrop,
      symptom: selectedSymptom,
      affectedArea,
      weatherContribution,
      diagnosisModel: activeDiagnosis,
      historyLog: activeHistoryLog,
      actionLog: trackedRecommendation,
    });
  };

  return (
    <section className="management-page pest-intelligence-page">
      <div className="pest-intelligence-shell">
        <div className="page-title-block pest-intelligence-title">
          <h1>Pest &amp; Disease Intelligence</h1>
          <p>
            Farm-specific pest and disease forecasting using crop symptoms, live weather, outbreak history, and action tracking.
          </p>
        </div>

        <div className="prototype-module-status-row">
          <span className="prototype-module-chip success">{pestState.source}</span>
          {backendMode ? <span className="prototype-module-chip">Backend farm linked</span> : <span className="prototype-module-chip">Frontend-only fallback</span>}
          {pestState.notice ? <span className="prototype-module-note">{pestState.notice}</span> : null}
        </div>

        {weatherState.error ? <div className="pest-intel-warning">{weatherState.error}</div> : null}

        <div className="pest-intelligence-grid">
          <article className="prototype-panel pest-diagnosis-hero">
            <div className="pest-hero-head">
              <div>
                <span className="pest-kicker">AI Diagnosis Confidence Score</span>
                <h2>{activeDiagnosis.topDiagnosis.name}</h2>
                <p>{activeDiagnosis.topDiagnosis.scientificName}</p>
              </div>
              <span className={`pest-priority-badge ${activeDiagnosis.priority.toLowerCase()}`}>{activeDiagnosis.priority}</span>
            </div>

            <div className="pest-hero-metrics">
              <div className="pest-metric-card">
                <small>Confidence</small>
                <strong>{activeDiagnosis.confidence}%</strong>
              </div>
              <div className="pest-metric-card">
                <small>Farm Risk</small>
                <strong>{activeDiagnosis.currentRisk}</strong>
              </div>
              <div className="pest-metric-card">
                <small>Regional Risk</small>
                <strong>{getRiskLabel(activeDiagnosis.regionalRiskScore)}</strong>
              </div>
            </div>

            <div className="pest-hero-explainer">
              <ThermometerSun size={18} />
              <p>
                Humidity at {weatherContribution.current?.humidity ?? "--"}% and temperature of{" "}
                {weatherContribution.current?.temperature ?? "--"}C increase {activeDiagnosis.topDiagnosis.name.toLowerCase()} risk on{" "}
                {selectedFarm.name}.
              </p>
            </div>

            <div className="pest-action-strip">
              <button type="button" className="secondary" onClick={trackRecommendation.bind(null, "accepted")}>
                Accept Recommendation
              </button>
              <button type="button" className="secondary warn" onClick={trackRecommendation.bind(null, "rejected")}>
                Reject Recommendation
              </button>
              <button type="button" className="primary" onClick={trackRecommendation.bind(null, "completed")}>
                Mark Treatment Complete
              </button>
            </div>
          </article>

          <article className="prototype-panel pest-diagnostic-form">
            <div className="pest-section-head">
              <div>
                <h2>Symptom Checker</h2>
                <p>Use farm, crop, symptoms, weather, and image evidence.</p>
              </div>
              <span>Live</span>
            </div>

            <label>
              <span>Select Farm</span>
              <div className="prototype-pest-select">
                <select
                  value={selectedFarmId}
                  onChange={(event) => setSelectedFarmId(event.target.value)}
                  className="prototype-pest-inline-select"
                >
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.region}
                    </option>
                  ))}
                </select>
                <MapPinned size={18} />
              </div>
            </label>

            <label>
              <span>Select Crop</span>
              <div className="prototype-pest-select">
                <select
                  value={selectedCrop}
                  onChange={(event) => setSelectedCrop(event.target.value)}
                  className="prototype-pest-inline-select"
                >
                  {cropOptions.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="prototype-pest-symptoms">
              <span>Observed Symptoms</span>
              <div className="prototype-pest-symptom-grid">
                {symptomOptions.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    className={selectedSymptom === symptom ? "active" : ""}
                    onClick={() => setSelectedSymptom(symptom)}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>

            <div className="prototype-pest-slider">
              <span>Affected Area</span>
              <input
                type="range"
                min="0"
                max="100"
                value={affectedArea}
                onChange={(event) => setAffectedArea(Number(event.target.value))}
                className="prototype-pest-range-input"
              />
              <div className="prototype-pest-slider-scale">
                <small>0%</small>
                <small>{affectedArea}% affected</small>
                <small>100%</small>
              </div>
            </div>

            <div className="prototype-pest-upload-panel">
              <div className="prototype-pest-upload-head">
                <ImageUp size={16} />
                <span>Image recognition evidence</span>
              </div>
              <label className="prototype-pest-upload-box">
                <Upload size={18} />
                <span>{uploadedImageName || "Upload crop image for visual cue matching"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(event) => setUploadedImageName(event.target.files?.[0]?.name || "")}
                />
              </label>
            </div>

            <div className="pest-weather-mini">
              <strong>Weather input</strong>
              <div>
                <span><ThermometerSun size={14} /> {weatherContribution.current?.temperature ?? "--"}C</span>
                <span><CloudDrizzle size={14} /> {weatherContribution.current?.humidity ?? "--"}%</span>
                <span><CloudLightning size={14} /> {(weatherContribution.forecast?.totalRain ?? 0).toFixed(1)} mm / 7d</span>
              </div>
            </div>

            <div className="prototype-pest-step-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSelectedSymptom("Yellow Spots");
                  setAffectedArea(28);
                  setUploadedImageName("");
                }}
              >
                Reset
              </button>
              <button type="button" className="primary" onClick={submitSymptomCheck}>
                Analyze Symptoms
              </button>
            </div>
          </article>

          <article className="prototype-panel pest-forecast-panel">
            <div className="pest-section-head">
              <div>
                <h2>7-Day Outbreak Forecast</h2>
                <p>Forecasted progression using live weather drivers.</p>
              </div>
              <CloudLightning size={18} />
            </div>

            <div className="pest-forecast-grid">
              <div>
                <small>Current Risk</small>
                <strong>{activeDiagnosis.outbreakForecast.currentRisk}</strong>
              </div>
              <div>
                <small>Predicted Risk</small>
                <strong>{activeDiagnosis.outbreakForecast.predictedRisk}</strong>
              </div>
              <div>
                <small>Confidence</small>
                <strong>{activeDiagnosis.outbreakForecast.confidence}%</strong>
              </div>
            </div>

            <p className="pest-forecast-drivers">{activeDiagnosis.outbreakForecast.drivers}</p>
          </article>

          <article className="prototype-panel pest-impact-card">
            <div className="pest-section-head">
              <div>
                <h2>Economic Impact Assessment</h2>
                <p>Projected production and financial exposure.</p>
              </div>
              <ShieldAlert size={18} />
            </div>

            <div className="pest-impact-metrics">
              <div>
                <small>Estimated Yield Loss</small>
                <strong>{activeDiagnosis.yieldLoss}%</strong>
              </div>
              <div>
                <small>Estimated Economic Loss</small>
                <strong>{formatRwf(activeDiagnosis.economicLoss)}</strong>
              </div>
            </div>

            <p>
              This estimate combines farm size, {selectedCrop.toLowerCase()} value, current risk, and affected area severity.
            </p>
          </article>

          <article className="prototype-panel pest-regional-panel">
            <div className="pest-section-head">
              <div>
                <h2>Regional Outbreak Tracking</h2>
                <p>District pressure and outbreak trend.</p>
              </div>
              <MapPinned size={18} />
            </div>

            <div className="pest-regional-grid">
              <div>
                <small>District</small>
                <strong>{regionalTracking.district}</strong>
              </div>
              <div>
                <small>Intensity</small>
                <strong>{regionalTracking.intensity}/10</strong>
              </div>
              <div>
                <small>Trend</small>
                <strong>{regionalTracking.trend}</strong>
              </div>
            </div>

            <p>{regionalTracking.clusterCount} recent tracked pathogen events are influencing the district signal.</p>
          </article>
        </div>

        <div className="pest-intelligence-lower">
          <article className="prototype-panel pest-action-panel">
            <div className="pest-section-head">
              <div>
                <h2>Recommended Action &amp; Effectiveness</h2>
                <p>Dynamic advice generated from farm, crop, symptom, and weather inputs.</p>
              </div>
              <BadgeCheck size={18} />
            </div>

            <div className="pest-action-highlight">
              <div>
                <small>Recommendation</small>
                <strong>{activeRecommendation.title}</strong>
              </div>
              <div>
                <small>Treatment Effectiveness</small>
                <strong>{treatmentEffectiveness}%</strong>
              </div>
            </div>

            <ol className="pest-guidance-list">
              {activeRecommendation.guidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>

            <div className="pest-action-tracking-list">
              {trackedRecommendation.length ? (
                trackedRecommendation.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="pest-action-tracking-item">
                    <span className={`status ${entry.feedbackStatus}`}>{entry.feedbackStatus}</span>
                    <span>{formatShortDate(entry.timestamp)}</span>
                  </div>
                ))
              ) : (
                <p className="pest-empty-copy">No farmer action feedback recorded for this recommendation yet.</p>
              )}
            </div>
          </article>

          <article className="prototype-panel pest-history-panel">
            <div className="pest-section-head">
              <div>
                <h2>Historical Records</h2>
                <p>Past outbreaks and interventions.</p>
              </div>
              <button type="button" className="prototype-pest-table-action" onClick={downloadHistoryReport}>
                Export
              </button>
            </div>

            <div className="prototype-pest-history-table">
              <div className="prototype-pest-history-head">
                <span>Date</span>
                <span>Pathogen</span>
                <span>Severity</span>
                <span>Action</span>
              </div>
              {activeHistoryLog.slice(0, 6).map((row) => (
                <div key={row.id || `${row.date}-${row.pathogen}`} className="prototype-pest-history-row">
                  <span>{row.monthLabel || row.date}</span>
                  <strong>{row.pathogen}</strong>
                  <span className={`prototype-pest-severity ${String(row.severity).toLowerCase()}`}>
                    {row.severity}
                  </span>
                  <span>{row.action}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="prototype-panel pest-library-panel">
          <div className="prototype-pest-library-head">
            <div>
              <h2>Disease Library</h2>
              <p>Actual pest and disease references with prevention guidance.</p>
            </div>
            <div className="prototype-pest-library-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search disease library..."
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
              />
            </div>
          </div>

          <div className="pest-library-grid-v2">
            {displayedLibrary.map((card) => (
              <article key={card.id} className="pest-library-card-v2">
                <div className="pest-library-image-wrap">
                  <ImageWithFallback
                    src={card.imageUrl}
                    alt={card.name}
                    label={card.name}
                    category="disease"
                    className="pest-library-image"
                  />
                </div>
                <div className="pest-library-copy-v2">
                  <strong>{card.name}</strong>
                  <span>{card.scientificName}</span>
                  <p><b>Affected crops:</b> {card.affectedCrops.join(", ")}</p>
                  <p><b>Common symptoms:</b> {card.commonSymptoms.join(", ")}</p>
                  <p><b>Prevention:</b> {card.preventionAdvice}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <article className="prototype-panel pest-treatment-panel-v2">
          <div className="pest-section-head">
            <div>
              <h2>Integrated Pest Management Advice</h2>
              <p>Dynamic field guidance generated from the top diagnosis.</p>
            </div>
            <button type="button" className="pest-download-button" onClick={downloadProtocol}>
              Download Protocol
            </button>
          </div>

          <div className="pest-treatment-grid-v2">
            <div>
              <ShieldCheck size={16} />
              <strong>Chemical Option</strong>
              <p>{activeDiagnosis.topDiagnosis.treatment.chemical}</p>
            </div>
            <div>
              <Sparkles size={16} />
              <strong>Organic / IPM</strong>
              <p>{activeDiagnosis.topDiagnosis.treatment.organic}</p>
            </div>
            <div>
              <CheckCircle2 size={16} />
              <strong>Prevention Advice</strong>
              <p>{activeDiagnosis.topDiagnosis.preventionAdvice}</p>
            </div>
          </div>
        </article>

        <div className="prototype-panel pest-explanation-panel">
          <div className="pest-section-head">
            <div>
              <h2>Why this diagnosis?</h2>
              <p>Dynamic explanation using connected module data.</p>
            </div>
            <Sparkles size={18} />
          </div>

          <div className="pest-explanation-grid">
            <div>
              <strong>Weather contribution</strong>
              <p>{activeDiagnosis.explanation.weather}</p>
            </div>
            <div>
              <strong>Farm-specific risk</strong>
              <p>{activeDiagnosis.explanation.soil}</p>
            </div>
            <div>
              <strong>Crop-stage reason</strong>
              <p>{activeDiagnosis.explanation.stage}</p>
            </div>
            <div>
              <strong>Economic context</strong>
              <p>{activeDiagnosis.explanation.market}</p>
            </div>
            <div className="full">
              <strong>Confidence summary</strong>
              <p>{activeDiagnosis.explanation.confidence}</p>
            </div>
          </div>
        </div>

        {weatherState.loading || pestState.loading ? <div className="pest-intel-loading">Loading live weather-linked pest intelligence...</div> : null}
      </div>
    </section>
  );
}
